import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { AlfrescoService } from '../alfresco.service';
import { getCadExtension, resolveCadFileName } from './is-cad-file';
import { CadCommentsMetadataService } from './cad-comments-metadata.service';
import { MlightCadViewerService } from './mlightcad-viewer.service';
import { CadViewerDialogData } from './cad-viewer-dialog.data';

@Component({
    standalone: true,
    selector: 'adw-cad-viewer-dialog',
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    templateUrl: './cad-viewer-dialog.component.html',
    styleUrl: './cad-viewer-dialog.component.scss'
})
export class CadViewerDialogComponent implements AfterViewInit, OnDestroy {
    @ViewChild('viewerContainer', { static: true })
    private viewerContainer!: ElementRef<HTMLDivElement>;

    private readonly dialogRef = inject(MatDialogRef<CadViewerDialogComponent>);
    private readonly cadViewer = inject(MlightCadViewerService);
    private readonly cadComments = inject(CadCommentsMetadataService);
    private readonly alfresco = inject(AlfrescoService);
    readonly data = inject<CadViewerDialogData>(MAT_DIALOG_DATA);

    status: 'loading' | 'ready' | 'error' = 'loading';
    errorMessage: string | null = null;
    fileName = this.data.fileName;
    saving = false;
    saveMessage: string | null = null;

    get commandLabel(): string | null {
        return this.cadViewer.commandLabel;
    }

    ngAfterViewInit(): void {
        void this.openDrawing();
    }

    ngOnDestroy(): void {
        this.cadViewer.logSavedTextAttributions();
        if (this.cadViewer.hasDrawingSaved()) {
            this.cadComments.saveAndRefresh(this.data.nodeId);
        }
        void this.cadViewer.release('editor');
    }

    close(): void {
        this.dialogRef.close();
    }

    async save(): Promise<void> {
        if (this.status !== 'ready' || this.saving) {
            return;
        }

        this.saving = true;
        this.saveMessage = null;
        try {
            const drawing = this.cadViewer.exportDrawingContent();
            await firstValueFrom(this.alfresco.updateNodeContent(this.data.nodeId, drawing));
            this.cadViewer.markDrawingSaved();
            this.saveMessage = `Saved ${this.fileName}.`;
        } catch (error) {
            this.saveMessage = this.describeError(error, 'Could not save this drawing.', 'save');
        } finally {
            this.saving = false;
        }
    }

    private async openDrawing(): Promise<void> {
        this.status = 'loading';
        this.errorMessage = null;
        try {
            await this.waitForLayout();
            await this.cadComments.loadExistingIntoStorage(this.data.nodeId);
            await this.cadViewer.initialize(this.viewerContainer.nativeElement, 'viewer', 'write', 'editor');
            const fileName = resolveCadFileName(this.data.fileName, this.data.mimeType);
            this.fileName = fileName;
            if (!getCadExtension(fileName)) {
                throw new Error(`Unsupported CAD file: ${fileName}. Use DWG or DXF.`);
            }
            const blob = await firstValueFrom(this.alfresco.getNodeContent(this.data.nodeId));
            await this.cadViewer.loadFile(blob, fileName);
            this.status = 'ready';
        } catch (error) {
            this.status = 'error';
            this.errorMessage = this.describeError(error);
        }
    }

    private waitForLayout(): Promise<void> {
        return new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
    }

    private describeError(
        error: unknown,
        fallback = `Could not open ${this.data.fileName || 'this CAD file'} in MLightCAD.`,
        action: 'open' | 'save' = 'open'
    ): string {
        if (typeof error === 'string' && error.trim()) {
            return error.trim();
        }
        const anyErr = error as { message?: string; status?: number; error?: { message?: string; briefSummary?: string } };
        const serverMessage = anyErr?.error?.message?.trim() || anyErr?.error?.briefSummary?.trim();
        if (serverMessage) {
            return serverMessage;
        }
        if (typeof anyErr?.message === 'string' && anyErr.message.trim() && anyErr.status !== 0) {
            if (anyErr.status === 401 || anyErr.status === 403) {
                return action === 'save'
                    ? 'This document is marked as a record and cannot be edited or commented on.'
                    : 'You do not have permission to download this CAD file.';
            }
            if (anyErr.status === 404) {
                return 'The CAD file could not be found.';
            }
            return anyErr.message.trim();
        }
        return fallback;
    }
}
