import { useMemo, useState } from 'react';
import { formatBytes } from '../../core';
import { readPayload, type PayloadContent } from '../../network/payload';
import type { CapturedRequest } from '../../network/requests';
import { getExportFileName } from '../exporting';
import { JsonExplorer } from './JsonExplorer';
import { NameValueTable } from './NameValueTable';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';
import { StatusMessage } from './StatusMessage';

type PayloadPart = 'body' | 'query';

const MAX_TEXT_CHARS = 200_000;

export function PayloadPanel({ request }: { request: CapturedRequest }) {
  const { payload, queryParams } = request;
  const content = useMemo(() => (payload ? readPayload(payload) : null), [payload]);
  const [part, setPart] = useState<PayloadPart>(content ? 'body' : 'query');

  if (!content && queryParams.length === 0) {
    return <StatusMessage>This request has no payload or query parameters.</StatusMessage>;
  }

  const queryTable = (
    <NameValueTable sections={[{ title: 'Query parameters', rows: queryParams, mask: true }]} />
  );
  if (!content) return queryTable;

  const body = (
    <PayloadBody content={content} exportName={getExportFileName(request.path, 'payload')} />
  );
  if (queryParams.length === 0) return body;

  const options: readonly SegmentOption<PayloadPart>[] = [
    { value: 'body', label: 'Body' },
    { value: 'query', label: `Query (${queryParams.length})` },
  ];
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-1">
        <SegmentedControl label="Payload part" value={part} options={options} onChange={setPart} />
        {payload && (
          <span className="min-w-0 truncate text-muted">
            {payload.mimeType || 'unknown type'} · {formatBytes(payload.text.length)}
          </span>
        )}
      </div>
      <div hidden={part !== 'body'} className="flex min-h-0 flex-1 flex-col">
        {body}
      </div>
      <div hidden={part !== 'query'} className="flex min-h-0 flex-1 flex-col">
        {queryTable}
      </div>
    </>
  );
}

function PayloadBody({ content, exportName }: { content: PayloadContent; exportName: string }) {
  switch (content.kind) {
    case 'json':
      return (
        <JsonExplorer
          data={content.data}
          precisionLoss={content.precisionLoss}
          exportName={exportName}
        />
      );
    case 'form':
      return (
        <NameValueTable
          sections={[
            {
              title: 'Form data',
              rows: content.params.map((param) =>
                param.fileName === undefined
                  ? param
                  : { name: param.name, value: param.fileName, note: '(file)' },
              ),
              mask: true,
            },
          ]}
        />
      );
    case 'text':
      return <TextBody text={content.text} note={content.note} />;
  }
}

function TextBody({ text, note }: { text: string; note: string | undefined }) {
  const isTruncated = text.length > MAX_TEXT_CHARS;
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {note && (
        <p role="note" className="m-0 border-b border-line px-2 py-1 text-warning">
          {note}
        </p>
      )}
      <pre className="m-0 p-2 font-mono text-[11px] break-all whitespace-pre-wrap">
        {isTruncated ? `${text.slice(0, MAX_TEXT_CHARS)}…` : text}
      </pre>
      {isTruncated && (
        <p className="m-0 px-2 pb-2 text-muted">
          Showing the first {MAX_TEXT_CHARS.toLocaleString('en-US')} of{' '}
          {text.length.toLocaleString('en-US')} characters.
        </p>
      )}
    </div>
  );
}
