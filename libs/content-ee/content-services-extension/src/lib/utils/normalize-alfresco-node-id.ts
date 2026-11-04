/** ACS REST expects UUID node ids; some UIs pass `uuid@tenant` or `uuid;1.0` — strip those suffixes. */
export function normalizeAlfrescoNodeId(id: string | null | undefined): string {
  if (id === null || id === undefined) {
    return '';
  }
  let s = String(id).trim();
  if (!s) {
    return '';
  }
  const at = s.indexOf('@');
  if (at > 0) {
    s = s.slice(0, at);
  }
  const semi = s.indexOf(';');
  if (semi > 0) {
    s = s.slice(0, semi);
  }
  return s;
}
