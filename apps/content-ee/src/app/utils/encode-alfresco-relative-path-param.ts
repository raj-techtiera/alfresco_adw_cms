/**
 * Query value for Alfresco `GET .../nodes/{id}?relativePath=...`
 *
 * Encode each path segment with `encodeURIComponent` and join with `/` (never `%2F` for slashes).
 * Then replace `%20` with a literal space so the request matches Postman-style URLs:
 * `...?relativePath=05.Distribution/Distribution Matrices/distribution-matrix.json&...`
 *
 * Other reserved characters in a segment stay percent-encoded.
 */
export function encodeAlfrescoRelativePathParam(relativePath: string): string {
  return relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/%20/g, ' '))
    .join('/');
}
