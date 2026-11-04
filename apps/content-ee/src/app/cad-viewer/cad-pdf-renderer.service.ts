import { Injectable } from '@angular/core';
import { PDFDocument } from 'pdf-lib';
import { CadPdfRenderer } from '../../../../../libs/content-ee/process-services-extension/src/lib/services/cad-pdf-renderer';
import { resolveCadFileName } from './is-cad-file';
import { MlightCadViewerService } from './mlightcad-viewer.service';

@Injectable({ providedIn: 'root' })
export class CadPdfRendererService implements CadPdfRenderer {
    constructor(private readonly cadViewer: MlightCadViewerService) {}

    async renderPdf(file: Blob, fileName: string): Promise<Blob> {
        const host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText =
            'position:fixed;left:-12000px;top:0;width:1600px;height:1200px;opacity:0;pointer-events:none;';
        document.body.appendChild(host);
        try {
            if (this.cadViewer.isReady) {
                await this.cadViewer.dispose();
            }
            await this.cadViewer.initialize(host, 'print');
            await this.cadViewer.loadFile(file, resolveCadFileName(fileName));
            const png = await this.cadViewer.capturePngBlob(2400);
            return await this.pngToPdf(png);
        } finally {
            await this.cadViewer.dispose();
            host.remove();
        }
    }

    private async pngToPdf(png: Blob): Promise<Blob> {
        const pdf = await PDFDocument.create();
        const image = await pdf.embedPng(await png.arrayBuffer());
        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height
        });
        const bytes = await pdf.save();
        const copy = Uint8Array.from(bytes);
        return new Blob([copy], { type: 'application/pdf' });
    }
}
