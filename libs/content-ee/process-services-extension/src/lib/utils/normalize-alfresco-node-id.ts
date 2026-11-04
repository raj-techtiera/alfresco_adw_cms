/*
 * Alfresco Content Services REST APIs expect node ids as UUIDs.
 * Task forms / integrations sometimes pass composite ids like:
 *   "uuid@tenant-or-site"
 *   "uuid;1.0"
 *   "uuid;1.0@tenant-or-site"
 * Strip site/tenant and version suffixes so GET /nodes/{id} / ARender nodeRef
 * use a plain UUID only.
 */
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
