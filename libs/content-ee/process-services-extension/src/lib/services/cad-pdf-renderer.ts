import { InjectionToken } from '@angular/core';

export interface CadPdfRenderer {
    renderPdf(file: Blob, fileName: string): Promise<Blob>;
}

export const CAD_PDF_RENDERER = new InjectionToken<CadPdfRenderer>('CAD_PDF_RENDERER');
