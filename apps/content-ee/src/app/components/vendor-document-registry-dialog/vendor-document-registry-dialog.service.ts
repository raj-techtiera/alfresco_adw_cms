import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { VendorDocumentRegistryDialogData } from './vendor-document-registry-dialog.component';

const VDR_DIALOG_PANEL = [
    'adw-vendor-document-registry-dialog-panel',
    'adw-vendor-document-registry-dialog-panel--form-only'
];

/** Opens the minimal VDR registration form (lazy-loads dialog component to avoid circular imports). */
@Injectable({ providedIn: 'root' })
export class VendorDocumentRegistryDialogService {
    private readonly dialog = inject(MatDialog);

    /**
     * Form-only dialog (PO / VDR line / upload / submit). Optional callback after close (e.g. refresh parent table).
     */
    openMinimal(afterClosed?: () => void): void {
        void import('./vendor-document-registry-dialog.component').then((m) => {
            const data: VendorDocumentRegistryDialogData = { minimalFormOnly: true };
            const ref = this.dialog.open(
                m.VendorDocumentRegistryDialogComponent,
                {
                    width: 'min(1180px, calc(100vw - 20px))',
                    maxWidth: '98vw',
                    height: 'min(980px, calc(100vh - 20px))',
                    maxHeight: '98vh',
                    autoFocus: false,
                    panelClass: VDR_DIALOG_PANEL,
                    data
                }
            );
            if (afterClosed) {
                ref.afterClosed().subscribe(() => afterClosed());
            }
        });
    }
}
