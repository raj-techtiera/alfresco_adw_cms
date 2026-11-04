const CAD_EXTENSIONS = new Set(['dwg', 'dxf']);

const CAD_MIME_TYPES = new Set([
    'application/acad',
    'application/x-acad',
    'application/autocad_dwg',
    'application/dwg',
    'application/x-dwg',
    'application/x-autocad',
    'application/dxf',
    'application/x-dxf',
    'image/vnd.dwg',
    'image/x-dwg',
    'image/vnd.dxf',
    'image/x-dxf',
    'drawing/x-dwg'
]);

export type CadExtension = 'dwg' | 'dxf';

export function getCadExtension(fileName: string | null | undefined): CadExtension | null {
    const ext = String(fileName ?? '')
        .split('.')
        .pop()
        ?.toLowerCase();
    if (ext && CAD_EXTENSIONS.has(ext)) {
        return ext as CadExtension;
    }
    return null;
}

export function isCadFile(fileName?: string | null, mimeType?: string | null): boolean {
    if (getCadExtension(fileName)) {
        return true;
    }
    const mime = String(mimeType ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    return CAD_MIME_TYPES.has(mime);
}

export function resolveCadFileName(fileName: string, mimeType?: string | null): string {
    if (getCadExtension(fileName)) {
        return fileName;
    }
    const mime = String(mimeType ?? '').toLowerCase();
    const fallback = mime.includes('dxf') ? 'dxf' : 'dwg';
    const base = (fileName || 'drawing').trim() || 'drawing';
    return base.toLowerCase().endsWith(`.${fallback}`) ? base : `${base}.${fallback}`;
}
