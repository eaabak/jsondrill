const OBJECT_URL_LIFETIME_MS = 10_000;
const UNSAFE_FILE_NAME_CHARS = /[^a-z0-9_-]+/gi;

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // DevTools extension panels are frequently denied the async Clipboard API
    // (no clipboard-write permission policy on the panel frame), so fall back below.
  }

  const previousFocus = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
  if (!copied) throw new Error('The clipboard is not available in this panel.');
}

export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoking immediately can cancel the download before Chrome has read the blob.
  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS);
}

export function getExportFileName(requestPath: string): string {
  const pathname = requestPath.split('?')[0] ?? '';
  const lastSegment = pathname.split('/').filter(Boolean).at(-1) ?? '';
  const base = lastSegment.replace(UNSAFE_FILE_NAME_CHARS, '-').replace(/^-+|-+$/g, '');
  return `${base || 'response'}-filtered.json`;
}
