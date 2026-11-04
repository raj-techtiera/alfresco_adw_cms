import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { VendorDocumentCreationComponent } from '../vendor-document-creation/vendor-document-creation.component';

/** Optional `MatDialog` config: hide tips sidebar + vendor documents table (form only). */
export interface VendorDocumentRegistryDialogData {
    minimalFormOnly?: boolean;
}

/**
 * Modal shell for {@link VendorDocumentCreationComponent} (e.g. Vendor Document Registry “Create VDR” flow).
 */
@Component({
    standalone: true,
    selector: 'adw-vendor-document-registry-dialog',
    imports: [CommonModule, MatDialogModule, MatButtonModule, VendorDocumentCreationComponent],
    templateUrl: './vendor-document-registry-dialog.component.html',
    styleUrl: './vendor-document-registry-dialog.component.scss'
})
export class VendorDocumentRegistryDialogComponent {
    /** Default true: dialog shows only the registration form (matches product ask). */
    readonly minimalFormOnly: boolean;

    constructor(@Optional() @Inject(MAT_DIALOG_DATA) data: VendorDocumentRegistryDialogData | null) {
        this.minimalFormOnly = data?.minimalFormOnly !== false;
    }
}
