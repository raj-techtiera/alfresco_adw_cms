import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthenticationService } from '@alfresco/adf-core';
import { Node } from '@alfresco/js-api';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as JSZip from 'jszip';
import { firstValueFrom } from 'rxjs';
import { WatermarkTemplate, WatermarkTemplateKind } from './settings.service';

const NODES_API = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const WATERMARK_TEXT = 'PETRONAS';

export interface WatermarkDownloadOptions {
  kind: WatermarkTemplateKind;
  template: WatermarkTemplate;
}

/**
 * Word-style printed watermark: one diagonal line, silver, scaled to the page.
 */
const PDF_WATERMARK = {
  opacity: 0.45,
  color: rgb(0.75, 0.75, 0.75),
  rotate: 315
};

const IMAGE_WATERMARK_FILL = 'rgba(192, 192, 192, 0.45)';
const IMAGE_STAMP_SIZE_FACTOR = 0.46;
const IMAGE_STAMP_OPACITY = 0.28;
const WASHOUT_FADE = 0.55;

@Injectable({ providedIn: 'root' })
export class WatermarkedDownloadService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthenticationService);

  /**
   * Always downloads with the file's exact original name + extension.
   * Watermark is applied in-place when possible (PDF / image / DOCX).
   */
  async downloadWithPttepWatermark(node: Node): Promise<void> {
    return this.downloadWithWatermark(node, {
      kind: 'text',
      template: {
        id: '',
        name: WATERMARK_TEXT,
        templateValue: WATERMARK_TEXT,
        templateDescription: '',
        mimeType: '',
        isFile: true,
        modifiedAt: '',
        contentUrl: '',
        properties: {}
      }
    });
  }

  async downloadWithWatermark(node: Node, options: WatermarkDownloadOptions): Promise<void> {
    const nodeId = (node?.id ?? '').trim();
    if (!nodeId) {
      throw new Error('Missing document id.');
    }

    const originalName = this.sanitizeFileName(
      String((node as any).name ?? 'document').trim() || 'document'
    );
    const mime = String((node as any).content?.mimeType ?? '').toLowerCase();
    const ext = this.getExtension(originalName);
    const kind = options?.kind === 'image' ? 'image' : 'text';
    const text = this.resolveTextWatermark(options?.template);

    if (mime.startsWith('image/') || this.isImageExt(ext)) {
      const blob = await this.fetchNodeContent(nodeId);
      const watermarked =
        kind === 'image'
          ? await this.watermarkImageBlobWithImage(blob, options.template)
          : await this.watermarkImageBlob(blob, text);
      this.triggerDownload(watermarked, originalName);
      return;
    }

    if (this.isPdfSource(mime, originalName) || ext === 'pdf') {
      const pdfBytes = new Uint8Array(await (await this.fetchNodeContent(nodeId)).arrayBuffer());
      const stamped =
        kind === 'image'
          ? await this.stampPdfWithImage(pdfBytes, options.template)
          : await this.stampPdf(pdfBytes, text);
      this.triggerDownload(
        new File([new Uint8Array(stamped)], originalName, { type: 'application/pdf' }),
        originalName
      );
      return;
    }

    if (ext === 'docx' || mime.includes('wordprocessingml')) {
      const blob = await this.fetchNodeContent(nodeId);
      const watermarked =
        kind === 'image'
          ? await this.watermarkDocxBlobWithImage(blob, options.template)
          : await this.watermarkDocxBlob(blob, text);
      this.triggerDownload(
        new File([watermarked], originalName, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }),
        originalName
      );
      return;
    }

    const blob = await this.fetchNodeContent(nodeId);
    this.triggerDownload(blob, originalName);
  }

  private resolveTextWatermark(template: WatermarkTemplate | undefined): string {
    const fromTemplate = (template?.templateValue || '').trim();
    return fromTemplate || WATERMARK_TEXT;
  }

  private wrapWatermarkLines(text: string, maxCharsPerLine: number): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return [''];
    }
    if (cleaned.length <= maxCharsPerLine) {
      return [cleaned];
    }

    const rawTokens = cleaned.split(/\s+/).filter(Boolean);
    const tokens: string[] = [];
    for (const token of rawTokens) {
      if (token === '-' && tokens.length) {
        tokens[tokens.length - 1] = `${tokens[tokens.length - 1]} -`;
      } else {
        tokens.push(token);
      }
    }

    const lines: string[] = [];
    let current = '';
    const push = () => {
      if (current) {
        lines.push(current);
        current = '';
      }
    };
    for (const token of tokens) {
      const candidate = current ? `${current} ${token}` : token;
      if (current && candidate.length > maxCharsPerLine) {
        push();
        if (token.length > maxCharsPerLine) {
          for (let i = 0; i < token.length; i += maxCharsPerLine) {
            lines.push(token.slice(i, i + maxCharsPerLine));
          }
        } else {
          current = token;
        }
      } else if (!current && token.length > maxCharsPerLine) {
        for (let i = 0; i < token.length; i += maxCharsPerLine) {
          lines.push(token.slice(i, i + maxCharsPerLine));
        }
      } else {
        current = candidate;
      }
    }
    push();
    return lines.length ? lines : [cleaned];
  }

  private fitWatermarkFontSize(
    lines: string[],
    maxWidth: number,
    maxHeight: number,
    measureAt: (value: string, size: number) => number
  ): number {
    let lo = 18;
    let hi = 400;
    let best = 18;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const widest = Math.max(...lines.map((line) => measureAt(line, mid)), 0);
      const blockHeight = lines.length * mid * 1.15;
      if (widest <= maxWidth && blockHeight <= maxHeight) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  private drawCanvasWatermarkText(ctx: CanvasRenderingContext2D, text: string, width: number, height: number): void {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const diagonal = Math.sqrt(width * width + height * height);
    const maxWidth = diagonal * 0.82;
    const maxHeight = Math.min(width, height) * 0.62;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-45 * Math.PI) / 180);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = IMAGE_WATERMARK_FILL;
    const measure = (value: string, size: number) => {
      ctx.font = `${size}px Calibri, Arial, Helvetica, sans-serif`;
      return ctx.measureText(value).width;
    };
    let lines = [cleaned];
    let fontSize = this.fitWatermarkFontSize(lines, maxWidth, maxHeight, measure);
    if (fontSize < 26 && cleaned.includes(' ')) {
      lines = this.wrapWatermarkLines(cleaned, 20);
      fontSize = this.fitWatermarkFontSize(lines, maxWidth, maxHeight, measure);
    }
    ctx.font = `${fontSize}px Calibri, Arial, Helvetica, sans-serif`;
    const lineHeight = fontSize * 1.12;
    const offset = ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, 0, index * lineHeight - offset);
    });
    ctx.restore();
  }

  private isPdfSource(mime: string, fileName: string): boolean {
    if (/\.pdf$/i.test(fileName)) {
      return true;
    }
    return mime === 'application/pdf' || mime.endsWith('/pdf') || mime.endsWith('+pdf');
  }

  private isImageExt(ext: string): boolean {
    return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tif', 'tiff'].includes(ext);
  }

  private getExtension(fileName: string): string {
    const m = /\.([A-Za-z0-9]{1,10})$/.exec(fileName.trim());
    return (m?.[1] ?? '').toLowerCase();
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'document';
  }

  private async fetchNodeContent(nodeId: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${NODES_API}/${encodeURIComponent(nodeId)}/content`, {
        headers: await this.authHeaders(),
        params: this.ticketParams(),
        responseType: 'blob'
      })
    );
  }

  private async stampPdf(pdfBytes: Uint8Array, text: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const radians = (45 * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const cleaned = text.replace(/\s+/g, ' ').trim();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const diagonal = Math.sqrt(width * width + height * height);
      const maxWidth = diagonal * 0.82;
      const maxHeight = Math.min(width, height) * 0.62;
      const measure = (value: string, size: number) => font.widthOfTextAtSize(value, size);
      let lines = [cleaned];
      let fontSize = this.fitWatermarkFontSize(lines, maxWidth, maxHeight, measure);
      if (fontSize < 26 && cleaned.includes(' ')) {
        lines = this.wrapWatermarkLines(cleaned, 20);
        fontSize = this.fitWatermarkFontSize(lines, maxWidth, maxHeight, measure);
      }
      const lineHeight = fontSize * 1.12;
      const cx = width / 2;
      const cy = height / 2;

      lines.forEach((line, index) => {
        const textWidth = font.widthOfTextAtSize(line, fontSize);
        const xLocal = -textWidth / 2;
        const yLocal = ((lines.length - 1) / 2 - index) * lineHeight;
        page.drawText(line, {
          x: cx + xLocal * cos - yLocal * sin,
          y: cy + xLocal * sin + yLocal * cos,
          size: fontSize,
          font,
          color: PDF_WATERMARK.color,
          opacity: PDF_WATERMARK.opacity,
          rotate: degrees(45)
        });
      });
    }

    return pdfDoc.save();
  }

  private async watermarkImageBlob(blob: Blob, text: string): Promise<Blob> {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return blob;
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    this.drawCanvasWatermarkText(ctx, text, canvas.width, canvas.height);

    const type = blob.type || 'image/png';
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    return out ?? blob;
  }

  private async watermarkImageBlobWithImage(blob: Blob, template: WatermarkTemplate): Promise<Blob> {
    const pngBytes = await this.templateToPngBytes(template);
    const stamp = await createImageBitmap(new Blob([new Uint8Array(pngBytes)], { type: 'image/png' }));
    const source = await this.decodeBlobToBitmap(blob);
    if (!source) {
      stamp.close();
      return blob;
    }

    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      stamp.close();
      source.close();
      return blob;
    }

    ctx.drawImage(source, 0, 0);
    source.close();
    this.drawWatermarkImage(ctx, canvas.width, canvas.height, stamp);
    stamp.close();

    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    return out ?? blob;
  }

  private async stampPdfWithImage(pdfBytes: Uint8Array, template: WatermarkTemplate): Promise<Uint8Array> {
    const pngBytes = await this.templateToPngBytes(template);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const image = await pdfDoc.embedPng(pngBytes);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const target = Math.min(width, height) * IMAGE_STAMP_SIZE_FACTOR;
      const scale = Math.min(target / image.width, target / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      page.drawImage(image, {
        x: (width - drawWidth) / 2,
        y: (height - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
      });
    }

    return pdfDoc.save();
  }

  private async watermarkDocxBlobWithImage(blob: Blob, template: WatermarkTemplate): Promise<Blob> {
    const pngBytes = await this.fitPngBytes(await this.templateToPngBytes(template), 720);
    try {
      const zip = await JSZip.loadAsync(blob);
      await this.embedDocxBodyPictureOverlay(zip, pngBytes, false);
      return await zip.generateAsync({ type: 'blob' });
    } catch {
      return blob;
    }
  }

  private drawWatermarkImage(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mark: ImageBitmap
  ): void {
    const target = Math.min(width, height) * IMAGE_STAMP_SIZE_FACTOR;
    const scale = Math.min(target / Math.max(mark.width, 1), target / Math.max(mark.height, 1));
    const drawWidth = mark.width * scale;
    const drawHeight = mark.height * scale;
    ctx.save();
    ctx.drawImage(mark, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  private async loadTemplateBitmap(template: WatermarkTemplate): Promise<ImageBitmap> {
    const nodeId = (template?.id ?? '').trim();
    if (!nodeId) {
      throw new Error('Missing watermark image.');
    }
    const blob = await this.fetchNodeContent(nodeId);
    if (!blob || blob.size < 8) {
      throw new Error('Unable to load image watermark.');
    }
    const type = (blob.type || '').toLowerCase();
    if (type.includes('json') || type.includes('html')) {
      throw new Error('Unable to load image watermark.');
    }
    const bitmap = (await this.decodeBlobToBitmap(blob)) ?? (await this.blobToBitmap(blob));
    if (!bitmap) {
      throw new Error('Unable to read image watermark.');
    }
    return bitmap;
  }

  private async templateToPngBytes(template: WatermarkTemplate): Promise<Uint8Array> {
    const bitmap = await this.loadTemplateBitmap(template);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, bitmap.width);
    canvas.height = Math.max(1, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('Unable to prepare image watermark.');
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    this.applyWashout(ctx, canvas.width, canvas.height, IMAGE_STAMP_OPACITY);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) {
      throw new Error('Unable to prepare image watermark.');
    }
    return new Uint8Array(await pngBlob.arrayBuffer());
  }

  private async decodeBlobToBitmap(blob: Blob): Promise<ImageBitmap | null> {
    try {
      return await createImageBitmap(blob);
    } catch {
      return this.blobToBitmap(blob);
    }
  }

  private blobToBitmap(blob: Blob): Promise<ImageBitmap | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth || image.width || 0;
        const height = image.naturalHeight || image.height || 0;
        if (!width || !height) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.drawImage(image, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((png) => {
          if (!png) {
            resolve(null);
            return;
          }
          void createImageBitmap(png).then(resolve).catch(() => resolve(null));
        }, 'image/png');
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      image.src = url;
    });
  }

  /** Inject Word-style diagonal watermark into DOCX while keeping .docx bytes/extension. */
  private async watermarkDocxBlob(blob: Blob, text: string): Promise<Blob> {
    try {
      const zip = await JSZip.loadAsync(blob);
      const pngBytes = await this.fitPngBytes(await this.rasterizeTextWatermarkPng(text), 900);
      await this.embedDocxBodyPictureOverlay(zip, pngBytes, false, 6583680);
      return await zip.generateAsync({ type: 'blob' });
    } catch {
      return blob;
    }
  }

  /**
   * Floating body pictures, one per page, so text and image stamps match on every
   * page and still sit in front of charts.
   */
  private async embedDocxBodyPictureOverlay(
    zip: Awaited<ReturnType<typeof JSZip.loadAsync>>,
    pngBytes: Uint8Array,
    applyAlpha: boolean,
    maxEmu = 4114800
  ): Promise<void> {
    const contentTypesPath = '[Content_Types].xml';
    const relsPath = 'word/_rels/document.xml.rels';
    const docPath = 'word/document.xml';

    let contentTypes = (await zip.file(contentTypesPath)?.async('string')) || '';
    let rels = (await zip.file(relsPath)?.async('string')) || '';
    let docXml = (await zip.file(docPath)?.async('string')) || '';
    if (!rels || !docXml) {
      return;
    }

    const stripped = await this.stripPreviousDocxWatermarks(zip, docXml, rels, contentTypes);
    docXml = stripped.docXml;
    rels = stripped.rels;
    contentTypes = stripped.contentTypes;

    zip.file('word/media/pttep_wm.png', pngBytes);

    if (contentTypes) {
      if (!/Extension="png"/i.test(contentTypes)) {
        contentTypes = contentTypes.replace(
          '</Types>',
          '<Default Extension="png" ContentType="image/png"/></Types>'
        );
      }
      zip.file(contentTypesPath, contentTypes);
    }

    const imageRelId = this.nextRelationshipId(rels);
    rels = rels.replace(
      '</Relationships>',
      `<Relationship Id="${imageRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/pttep_wm.png"/></Relationships>`
    );
    zip.file(relsPath, rels);

    const { width, height } = this.pngSize(pngBytes);
    zip.file(docPath, this.injectOverlayRuns(docXml, (index) => {
      return `<w:r><w:rPr><w:noProof/></w:rPr>${this.buildDocxBodyImageOverlay(
        imageRelId,
        width,
        height,
        applyAlpha,
        index,
        maxEmu
      )}</w:r>`;
    }));
  }

  private async stripPreviousDocxWatermarks(
    zip: Awaited<ReturnType<typeof JSZip.loadAsync>>,
    docXml: string,
    rels: string,
    contentTypes: string
  ): Promise<{ docXml: string; rels: string; contentTypes: string }> {
    const headerIds: string[] = [];
    const headerRelRe = /<Relationship\b[^>]*header_pttep_wm\.xml"[^>]*\/>/g;
    let headerMatch: RegExpExecArray | null;
    while ((headerMatch = headerRelRe.exec(rels))) {
      const id = /Id="([^"]+)"/.exec(headerMatch[0])?.[1];
      if (id) {
        headerIds.push(id);
      }
    }

    zip.remove('word/header_pttep_wm.xml');
    zip.remove('word/_rels/header_pttep_wm.xml.rels');
    zip.remove('word/media/pttep_wm.png');

    const nextRels = rels
      .replace(/<Relationship\b[^>]*header_pttep_wm\.xml"[^>]*\/>/g, '')
      .replace(/<Relationship\b[^>]*Target="media\/pttep_wm\.png"[^>]*\/>/g, '')
      .replace(/<Relationship\b[^>]*Target="\/word\/media\/pttep_wm\.png"[^>]*\/>/g, '');

    let nextDoc = this.removeXmlElementContaining(docXml, 'w:drawing', 'pttepBodyWatermark');
    nextDoc = this.removeXmlElementContaining(nextDoc, 'v:shape', 'pttepBodyWatermark');
    nextDoc = this.removeXmlElementContaining(nextDoc, 'v:shape', 'PetronasWatermark');
    nextDoc = this.removeXmlElementContaining(nextDoc, 'v:shape', 'WordPictureWatermark');
    for (const id of headerIds) {
      nextDoc = nextDoc.replace(new RegExp(`<w:headerReference\\b[^>]*r:id="${id}"[^>]*/>`, 'g'), '');
    }

    for (const path of Object.keys(zip.files)) {
      if (!/^word\/header[^/]*\.xml$/i.test(path)) {
        continue;
      }
      const headerXml = await zip.file(path)?.async('string');
      if (!headerXml) {
        continue;
      }
      let cleaned = this.removeXmlElementContaining(headerXml, 'v:shape', 'WordPictureWatermark');
      cleaned = this.removeXmlElementContaining(cleaned, 'v:shape', 'PowerPlusWaterMark');
      cleaned = this.removeXmlElementContaining(cleaned, 'v:shape', 'PetronasWatermark');
      cleaned = this.removeXmlElementContaining(cleaned, 'w:drawing', 'pttepBodyWatermark');
      if (cleaned !== headerXml) {
        zip.file(path, cleaned);
      }
    }

    const nextTypes = contentTypes.replace(/<Override\b[^>]*header_pttep_wm\.xml"[^>]*\/>/g, '');
    return { docXml: nextDoc, rels: nextRels, contentTypes: nextTypes };
  }

  private removeXmlElementContaining(xml: string, tag: string, needle: string): string {
    let out = xml;
    const open = `<${tag}`;
    const close = `</${tag}>`;
    while (out.includes(needle)) {
      const idx = out.indexOf(needle);
      const start = out.lastIndexOf(open, idx);
      const end = out.indexOf(close, idx);
      if (start < 0 || end < 0 || start > idx) {
        break;
      }
      out = out.slice(0, start) + out.slice(end + close.length);
    }
    return out;
  }

  private async rasterizeTextWatermarkPng(text: string): Promise<Uint8Array> {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to prepare text watermark.');
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawCanvasWatermarkText(ctx, text, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) {
      throw new Error('Unable to prepare text watermark.');
    }
    return new Uint8Array(await pngBlob.arrayBuffer());
  }

  private applyWashout(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opacity: number
  ): void {
    const image = ctx.getImageData(0, 0, width, height);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) {
        continue;
      }
      pixels[i] = Math.round(pixels[i] + (255 - pixels[i]) * WASHOUT_FADE);
      pixels[i + 1] = Math.round(pixels[i + 1] + (255 - pixels[i + 1]) * WASHOUT_FADE);
      pixels[i + 2] = Math.round(pixels[i + 2] + (255 - pixels[i + 2]) * WASHOUT_FADE);
      pixels[i + 3] = Math.round(pixels[i + 3] * opacity);
    }
    ctx.putImageData(image, 0, 0);
  }

  private async fitPngBytes(pngBytes: Uint8Array, maxPx: number): Promise<Uint8Array> {
    const blob = new Blob([new Uint8Array(pngBytes)], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height, 1);
    if (longest <= maxPx) {
      bitmap.close();
      return pngBytes;
    }
    const scale = maxPx / longest;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return pngBytes;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!out) {
      return pngBytes;
    }
    return new Uint8Array(await out.arrayBuffer());
  }

  private injectOverlayRuns(docXml: string, buildRun: (index: number) => string): string {
    const withNs = this.ensureDocxDrawingNamespaces(docXml);
    const offsets = this.collectWatermarkInsertOffsets(withNs);
    if (!offsets.length) {
      const lastSect = withNs.lastIndexOf('<w:sectPr');
      const run = buildRun(0);
      if (lastSect >= 0) {
        return withNs.slice(0, lastSect) + `<w:p>${run}</w:p>` + withNs.slice(lastSect);
      }
      return withNs;
    }
    let next = withNs;
    for (let i = offsets.length - 1; i >= 0; i--) {
      const at = offsets[i];
      next = next.slice(0, at) + buildRun(i) + next.slice(at);
    }
    return next;
  }

  /**
   * One floating overlay per page: first paragraph, last paragraph, Word page
   * breaks, and each new section. Page-relative positioning keeps the stamp
   * centered on whichever page that paragraph lands on.
   */
  private collectWatermarkInsertOffsets(xml: string): number[] {
    const paraOffsets = this.collectBodyParagraphInsertOffsets(xml);
    const starts = new Set<number>();
    if (paraOffsets.length) {
      starts.add(paraOffsets[0]);
    }
    if (paraOffsets.length > 1) {
      starts.add(paraOffsets[paraOffsets.length - 1]);
    }
    if (paraOffsets.length >= 12) {
      const stride = 12;
      for (let i = stride; i < paraOffsets.length - 1; i += stride) {
        starts.add(paraOffsets[i]);
      }
    }

    const pageBreakRe = /<w:lastRenderedPageBreak\s*\/>/g;
    let match: RegExpExecArray | null;
    while ((match = pageBreakRe.exec(xml))) {
      const offset = this.paragraphInsertOffsetAt(xml, match.index);
      if (offset >= 0) {
        starts.add(offset);
      }
    }

    const explicitBreakRe = /<w:br\b[^>]*w:type="page"[^>]*\/?>/g;
    while ((match = explicitBreakRe.exec(xml))) {
      const after = match.index + match[0].length;
      const nextPara = paraOffsets.find((offset) => offset >= after);
      if (nextPara != null) {
        starts.add(nextPara);
      }
    }

    const sects: number[] = [];
    const sectRe = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/g;
    while ((match = sectRe.exec(xml))) {
      sects.push(match.index + match[0].length);
    }
    for (let i = 0; i < sects.length - 1; i++) {
      const nextPara = paraOffsets.find((offset) => offset >= sects[i]);
      if (nextPara != null) {
        starts.add(nextPara);
      }
    }

    return [...starts].sort((a, b) => a - b);
  }

  private collectBodyParagraphInsertOffsets(xml: string): number[] {
    const bodyOpen = /<w:body\b[^>]*>/.exec(xml);
    const bodyClose = xml.lastIndexOf('</w:body>');
    if (!bodyOpen || bodyOpen.index == null || bodyClose < 0) {
      return [];
    }
    const start = bodyOpen.index + bodyOpen[0].length;
    const body = xml.slice(start, bodyClose);
    const offsets: number[] = [];
    const re = /<w:p(?:\s[^>]*)?>/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(body))) {
      offsets.push(this.insertOffsetAfterParagraphOpen(xml, start + match.index + match[0].length));
    }
    return offsets;
  }

  private paragraphInsertOffsetAt(xml: string, around: number): number {
    const slice = xml.slice(0, around);
    const start = Math.max(slice.lastIndexOf('<w:p '), slice.lastIndexOf('<w:p>'));
    if (start < 0) {
      return -1;
    }
    const openEnd = xml.indexOf('>', start);
    if (openEnd < 0) {
      return -1;
    }
    return this.insertOffsetAfterParagraphOpen(xml, openEnd + 1);
  }

  private insertOffsetAfterParagraphOpen(xml: string, afterOpen: number): number {
    const rest = xml.slice(afterOpen);
    if (rest.startsWith('<w:pPr')) {
      const pPrClose = rest.indexOf('</w:pPr>');
      if (pPrClose >= 0) {
        return afterOpen + pPrClose + '</w:pPr>'.length;
      }
    }
    return afterOpen;
  }

  private ensureDocxDrawingNamespaces(docXml: string): string {
    const additions: Array<[string, string]> = [
      ['xmlns:r=', 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'],
      ['xmlns:wp=', 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'],
      ['xmlns:wp14=', 'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"'],
      ['xmlns:a=', 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'],
      ['xmlns:pic=', 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"']
    ];
    let nextXml = docXml.replace(/<w:document\b([^>]*)>/, (full, attrs: string) => {
      let next = attrs;
      for (const [needle, ns] of additions) {
        if (!full.includes(needle)) {
          next += ` ${ns}`;
        }
      }
      return `<w:document${next}>`;
    });
    if (nextXml.includes('mc:Ignorable="')) {
      nextXml = nextXml.replace(/mc:Ignorable="([^"]*)"/, (full, val: string) =>
        val.includes('wp14') ? full : `mc:Ignorable="${val} wp14"`
      );
    }
    return nextXml;
  }

  private buildDocxBodyImageOverlay(
    rId: string,
    pngWidth: number,
    pngHeight: number,
    applyAlpha: boolean,
    overlayIndex = 0,
    maxEmu = 4114800
  ): string {
    const w = Math.max(1, pngWidth);
    const h = Math.max(1, pngHeight);
    const scale = Math.min(maxEmu / w, maxEmu / h);
    const cx = Math.round(w * scale);
    const cy = Math.round(h * scale);
    const blipInner = applyAlpha ? '<a:alphaModFix amt="42000"/>' : '';
    const docPrId = 991559 + overlayIndex;
    const anchorId = (0x6a1b2c3d + overlayIndex).toString(16).toUpperCase().padStart(8, '0').slice(-8);
    const editId = (0x7e8f9a0b + overlayIndex).toString(16).toUpperCase().padStart(8, '0').slice(-8);
    return `<w:drawing>
      <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" wp14:anchorId="${anchorId}" wp14:editId="${editId}">
        <wp:simplePos x="0" y="0"/>
        <wp:positionH relativeFrom="page">
          <wp:align>center</wp:align>
        </wp:positionH>
        <wp:positionV relativeFrom="page">
          <wp:align>center</wp:align>
        </wp:positionV>
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:wrapNone/>
        <wp:docPr id="${docPrId}" name="pttepBodyWatermark" descr="Watermark"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="${overlayIndex}" name="pttepBodyWatermark"/>
                <pic:cNvPicPr>
                  <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                </pic:cNvPicPr>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${rId}" cstate="print">${blipInner}</a:blip>
                <a:srcRect/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr bwMode="auto">
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${cx}" cy="${cy}"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
                <a:noFill/>
                <a:ln>
                  <a:noFill/>
                </a:ln>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:anchor>
    </w:drawing>`;
  }

  private pngSize(bytes: Uint8Array): { width: number; height: number } {
    if (bytes.length < 24) {
      return { width: 1, height: 1 };
    }
    const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
    const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
    return { width: width || 1, height: height || 1 };
  }

  private nextRelationshipId(relsXml: string): string {
    let max = 0;
    const re = /Id="rId(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(relsXml))) {
      max = Math.max(max, Number(m[1]) || 0);
    }
    return `rId${max + 1}`;
  }

  private triggerDownload(blobOrFile: Blob, fileName: string): void {
    const safeName = this.sanitizeFileName(fileName);
    const nav = window.navigator as Navigator & {
      msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean;
    };
    if (typeof nav.msSaveOrOpenBlob === 'function') {
      nav.msSaveOrOpenBlob(blobOrFile, safeName);
      return;
    }

    const url = URL.createObjectURL(blobOrFile);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    anchor.style.display = 'none';
    anchor.setAttribute('download', safeName);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  private async authHeaders(): Promise<HttpHeaders> {
    return firstValueFrom(this.authService.addTokenToHeader(NODES_API, new HttpHeaders()));
  }

  private ticketParams(): HttpParams {
    const ticket = (localStorage.getItem('ticket-ECM') ?? '').trim();
    return ticket ? new HttpParams().set('alf_ticket', ticket) : new HttpParams();
  }
}
