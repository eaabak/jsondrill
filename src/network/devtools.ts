import { getRecordingPattern } from '../recording';
import { parseRecordedEntries, READ_RECORDED_EXPRESSION } from './recorded';
import {
  createCapturedRequest,
  type CapturedRequest,
  type NetworkSource,
  type RecordingControl,
  type RecordingState,
} from './requests';

type DevtoolsRequest = chrome.devtools.network.Request;

const BODY_UNAVAILABLE =
  'The response body is not available. Chrome may have discarded it; reload the page with DevTools open to capture it again.';
const BODY_NOT_TEXT = 'The response body is binary data and cannot be read as JSON.';

export function isDevtoolsContext(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.devtools?.network?.getHAR === 'function';
}

export function getDevtoolsTheme(): 'light' | 'dark' {
  return chrome.devtools.panels.themeName === 'dark' ? 'dark' : 'light';
}

export function createDevtoolsNetworkSource(): NetworkSource {
  const { network, inspectedWindow } = chrome.devtools;
  return {
    getRequests: () =>
      new Promise((resolve, reject) => {
        // The callback form works on every supported Chrome; the promise form needs Chrome 151.
        network.getHAR((log: HARFormatLog | undefined) => {
          if (!log) {
            reject(new Error('Chrome did not return the network log.'));
            return;
          }
          resolve(log.entries.map(toCapturedRequest));
        });
      }),
    getRecordedRequests: () => evaluate(READ_RECORDED_EXPRESSION).then(parseRecordedEntries),
    recording: createRecordingControl(),
    onRequest(listener) {
      const handleRequest = (request: DevtoolsRequest) => listener(toCapturedRequest(request));
      network.onRequestFinished.addListener(handleRequest);
      return () => network.onRequestFinished.removeListener(handleRequest);
    },
    onNavigated(listener) {
      const handleNavigation = () => listener();
      network.onNavigated.addListener(handleNavigation);
      return () => network.onNavigated.removeListener(handleNavigation);
    },
    reloadPage: () => inspectedWindow.reload(),
  };
}

function createRecordingControl(): RecordingControl {
  const { permissions } = chrome;
  return {
    async getState(): Promise<RecordingState> {
      // Older Chrome builds may not expose site access to DevTools pages.
      if (typeof permissions?.request !== 'function') return { kind: 'unavailable' };
      const pattern = getRecordingPattern(await getInspectedUrl());
      if (pattern === null) return { kind: 'unavailable' };
      const granted = await permissions.contains({
        permissions: ['scripting'],
        origins: [pattern],
      });
      return { kind: granted ? 'on' : 'off', pattern };
    },
    start: (pattern) => permissions.request({ permissions: ['scripting'], origins: [pattern] }),
    stop: async (pattern) => {
      await permissions.remove({ origins: [pattern] });
    },
  };
}

async function getInspectedUrl(): Promise<string> {
  const url = await evaluate('location.href');
  return typeof url === 'string' ? url : '';
}

/** Runs an expression in the inspected page; resolves to undefined if it throws. */
function evaluate(expression: string): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(expression, (result: unknown, exception: unknown) => {
      resolve(exception ? undefined : result);
    });
  });
}

function toCapturedRequest(entry: HARFormatEntry): CapturedRequest {
  return createCapturedRequest(entry, () => readBody(entry));
}

// getHAR() entries are typed as plain HAR, but Chrome attaches getContent() to them at runtime.
function canReadContent(entry: HARFormatEntry): entry is DevtoolsRequest {
  return typeof Reflect.get(entry, 'getContent') === 'function';
}

function readBody(entry: HARFormatEntry): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!canReadContent(entry)) {
      reject(new Error(BODY_UNAVAILABLE));
      return;
    }
    entry.getContent((content: string | null | undefined, encoding: string) => {
      if (content == null) {
        reject(new Error(BODY_UNAVAILABLE));
        return;
      }
      if (encoding !== 'base64') {
        resolve(content);
        return;
      }
      try {
        resolve(decodeBase64Utf8(content));
      } catch {
        reject(new Error(BODY_NOT_TEXT));
      }
    });
  });
}

function decodeBase64Utf8(data: string): string {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
