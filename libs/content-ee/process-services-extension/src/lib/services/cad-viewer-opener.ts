import { InjectionToken } from '@angular/core';

export interface CadViewerOpener {
    openDocument(
        documentId: string | null | undefined,
        hints?: { name?: string; mimeType?: string | null }
    ): Promise<void>;
}

export const CAD_VIEWER_OPENER = new InjectionToken<CadViewerOpener>('CAD_VIEWER_OPENER');
