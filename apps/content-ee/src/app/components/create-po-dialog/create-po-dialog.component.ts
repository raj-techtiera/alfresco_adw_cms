import { Component, Inject, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AuthenticationService, NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { PoNumberEntry, PoType, VdrLineEntry, VendorEntry, VendorService } from '../../services/vendor.service';
import { AssetsService, ProjectHierarchyOption } from '../../services/assets.service';
import { environment } from '../../../environments/environment';

/** `projectId` = Alfresco project folder node id under `Projects` in the repo path (Activiti `projectid`), not the current URL folder. */
export interface CreatePoDialogData {
    projectId: string;
}
/** One row in the embedded distribution matrix (same UI pattern as Distribution Matrix dialog). */
export interface CreatePoMatrixRow {
    title: string;
    equipmentTag: string;
    /** Alfresco node id of selected VDR line (Existing Modification only). */
    vdrLineId?: string;
    /** User-entered scope of change per VDR line (Existing Modification only). */
    modificationScope?: string;
}

export interface CreatePoFormResult {
    name: string;
    poNumber: string;
    vendorName: string;
    region: string;
    asset: string;
    facility: string;
    distributionMatrixRows: CreatePoMatrixRow[];
}

@Component({
    standalone: true,
    selector: 'adw-create-po-dialog',
    imports: [CommonModule, FormsModule, MatButtonModule, MatSelectModule, MatIconModule],
    templateUrl: './create-po-dialog.component.html',
    styleUrl: './create-po-dialog.component.scss'
})
export class CreatePoDialogComponent implements OnInit {
    name = '';
    poNumber = '';
    poType: PoType | '' = '';
    vendorName = '';

    /** Project hierarchy (same cascade APIs as Document Numbering). */
    region = '';
    asset = '';
    facility = '';
    regionOptions: ProjectHierarchyOption[] = [];
    assetOptions: ProjectHierarchyOption[] = [];
    facilityOptions: ProjectHierarchyOption[] = [];
    regionsLoading = false;
    assetsLoading = false;
    facilitiesLoading = false;
    regionsError: string | null = null;
    assetsError: string | null = null;
    facilitiesError: string | null = null;

    /** Title column (replaces Asset in Distribution Matrix). */
    readonly titleOptions = ['GA Drawing', 'IOM Manual', 'Certificate'];

    /** Equipment tag column (replaces Reviewer group). */
    readonly equipmentTagOptions = ['COMP-001', 'PUMP-002'];

    matrixRows: CreatePoMatrixRow[] = [];
    /** Brief busy state for Save (UI parity with Distribution Matrix dialog). */
    matrixSaving = false;

    /** True while POSTing to Activiti to start Create PO process. */
    poCreating = false;

    vendorEntries: VendorEntry[] = [];
    readonly vendorPoTypeEntries: ReadonlyArray<{ id: string; name: PoType }> = [
        { id: '1', name: 'Existing Modification' },
        { id: '2', name: 'New PO' }
    ];
    vendorsLoading = false;
    vendorsError: string | null = null;

    poNumberEntries: PoNumberEntry[] = [];
    poNumbersLoading = false;
    poNumbersError: string | null = null;

    vdrLineEntries: VdrLineEntry[] = [];
    vdrLinesLoading = false;
    vdrLinesError: string | null = null;

    constructor(
        private readonly dialogRef: MatDialogRef<CreatePoDialogComponent, CreatePoFormResult | undefined>,
        private readonly vendorService: VendorService,
        private readonly assetsService: AssetsService,
        private readonly authService: AuthenticationService,
        private readonly notificationService: NotificationService,
        private readonly http: HttpClient,
        @Optional() @Inject(MAT_DIALOG_DATA) private readonly dialogData: CreatePoDialogData | null
    ) {}

    ngOnInit(): void {
        void this.loadRegions();
    }

    get isExistingModification(): boolean {
        return this.poType === 'Existing Modification';
    }

    optionLabel(option: ProjectHierarchyOption): string {
        return (option.label || option.name || option.code || String(option.id || '')).trim();
    }

    onRegionChange(): void {
        this.asset = '';
        this.facility = '';
        this.assetOptions = [];
        this.facilityOptions = [];
        this.assetsError = null;
        this.facilitiesError = null;
        if (this.region) {
            void this.loadAssets(this.region);
        }
    }

    onAssetChange(): void {
        this.facility = '';
        this.facilityOptions = [];
        this.facilitiesError = null;
        if (this.region && this.asset) {
            void this.loadFacilities(this.region, this.asset);
        }
    }

    private async loadRegions(): Promise<void> {
        const projectId = this.dialogData?.projectId?.trim();
        if (!projectId) {
            this.regionOptions = [];
            this.regionsError = 'Project is not available.';
            return;
        }

        this.regionsLoading = true;
        this.regionsError = null;
        try {
            this.regionOptions = await this.assetsService.loadProjectRegions(projectId);
            if (!this.regionOptions.length) {
                this.regionsError = 'No regions found for this project.';
            }
        } catch (err: unknown) {
            this.regionsError =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Failed to load regions';
            this.regionOptions = [];
        } finally {
            this.regionsLoading = false;
        }
    }

    private async loadAssets(regionName: string): Promise<void> {
        const projectId = this.dialogData?.projectId?.trim();
        if (!projectId || !regionName) {
            this.assetOptions = [];
            return;
        }

        this.assetsLoading = true;
        this.assetsError = null;
        try {
            this.assetOptions = await this.assetsService.loadProjectAssets(projectId, regionName);
            if (!this.assetOptions.length) {
                this.assetsError = 'No assets found for this region.';
            }
        } catch (err: unknown) {
            this.assetsError =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Failed to load assets';
            this.assetOptions = [];
        } finally {
            this.assetsLoading = false;
        }
    }

    private async loadFacilities(regionName: string, assetName: string): Promise<void> {
        const projectId = this.dialogData?.projectId?.trim();
        if (!projectId || !regionName || !assetName) {
            this.facilityOptions = [];
            return;
        }

        this.facilitiesLoading = true;
        this.facilitiesError = null;
        try {
            this.facilityOptions = await this.assetsService.loadProjectFacilities(
                projectId,
                regionName,
                assetName
            );
            if (!this.facilityOptions.length) {
                this.facilitiesError = 'No facilities found for this asset.';
            }
        } catch (err: unknown) {
            this.facilitiesError =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Failed to load facilities';
            this.facilityOptions = [];
        } finally {
            this.facilitiesLoading = false;
        }
    }

    onPoTypeChange(): void {
        this.resetPoNumberAndVdrState();
        this.matrixRows = [];
        void this.loadVendorChildren(true);
    }

    onVendorNameChange(): void {
        this.poNumber = '';
        this.resetVdrState();
        this.matrixRows = [];
        if (this.isExistingModification) {
            void this.loadPoNumberChildren(true);
        }
    }

    onPoNumberChange(): void {
        this.resetVdrState();
        this.matrixRows = [];
        if (this.isExistingModification) {
            void this.loadVdrLineChildren(true);
        }
    }

    private resetPoNumberAndVdrState(): void {
        this.poNumber = '';
        this.poNumberEntries = [];
        this.poNumbersError = null;
        this.resetVdrState();
    }

    private resetVdrState(): void {
        this.vdrLineEntries = [];
        this.vdrLinesError = null;
    }

    addMatrixRow(): void {
        this.matrixRows.push({ title: '', equipmentTag: '', vdrLineId: '', modificationScope: '' });
    }

    vdrLineLabel(entry: VdrLineEntry): string {
        if (entry.vdrNumber && entry.title) {
            return `${entry.vdrNumber} - ${entry.title}`;
        }
        return entry.name;
    }

    onVdrLineSelected(row: CreatePoMatrixRow, vdrLineId: string): void {
        const entry = this.vdrLineEntries.find((e) => e.id === vdrLineId);
        row.vdrLineId = vdrLineId;
        row.title = entry?.title ?? '';
        row.equipmentTag = entry?.equipmentTag ?? '';
    }

    removeMatrixRow(index: number): void {
        this.matrixRows.splice(index, 1);
    }

    refreshMatrix(): void {
        void this.refreshExistingModificationLists();
        this.notificationService.openSnackMessage(
            this.isExistingModification ? 'Lists refreshed.' : 'Vendor list refreshed.'
        );
    }

    private async refreshExistingModificationLists(): Promise<void> {
        await this.loadVendorChildren(false);
        if (!this.isExistingModification) {
            return;
        }
        if (this.vendorName?.trim()) {
            await this.loadPoNumberChildren(false);
        }
        if (this.vendorName?.trim() && this.poNumber?.trim()) {
            await this.loadVdrLineChildren(false);
        }
    }

    async saveMatrix(): Promise<void> {
        if (this.matrixRows.length === 0) {
            this.notificationService.openSnackMessage('Add at least one row before saving.');
            return;
        }
        const incomplete = this.isExistingModification
            ? this.matrixRows.some((r) => !r.vdrLineId?.trim() || !r.modificationScope?.trim())
            : this.matrixRows.some((r) => !r.title || !r.equipmentTag);
        if (incomplete) {
            this.notificationService.openSnackMessage(
                this.isExistingModification
                    ? 'Select a VDR line and enter modification scope on every row.'
                    : 'Complete Title and Equipment tag on every row.'
            );
            return;
        }
        this.matrixSaving = true;
        await new Promise((resolve) => setTimeout(resolve, 250));
        this.matrixSaving = false;
        this.notificationService.openSnackMessage('Distribution matrix saved to this PO.');
    }

    private async loadVendorChildren(clearVendorSelection: boolean): Promise<void> {
        if (!this.poType) {
            this.vendorEntries = [];
            this.vendorsError = null;
            if (clearVendorSelection) {
                this.vendorName = '';
            }
            return;
        }

        this.vendorsLoading = true;
        this.vendorsError = null;
        this.vendorEntries = [];
        if (clearVendorSelection) {
            this.vendorName = '';
            this.resetPoNumberAndVdrState();
            this.matrixRows = [];
        }
        try {
            this.vendorEntries = await this.vendorService.loadVendorEntries(
                this.poType,
                this.dialogData?.projectId
            );
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : 'Failed to load vendors';
            this.vendorsError = msg;
        } finally {
            this.vendorsLoading = false;
        }
    }

    private async loadPoNumberChildren(clearPoNumberSelection: boolean): Promise<void> {
        if (!this.isExistingModification) {
            this.poNumberEntries = [];
            this.poNumbersError = null;
            return;
        }

        const vendorName = this.vendorName?.trim();
        if (!vendorName) {
            this.poNumberEntries = [];
            this.poNumbersError = null;
            if (clearPoNumberSelection) {
                this.poNumber = '';
            }
            return;
        }

        this.poNumbersLoading = true;
        this.poNumbersError = null;
        this.poNumberEntries = [];
        if (clearPoNumberSelection) {
            this.poNumber = '';
            this.resetVdrState();
            this.matrixRows = [];
        }
        try {
            this.poNumberEntries = await this.vendorService.loadPoNumberEntries(
                this.dialogData?.projectId,
                vendorName
            );
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Failed to load PO numbers';
            this.poNumbersError = msg;
        } finally {
            this.poNumbersLoading = false;
        }
    }

    private async loadVdrLineChildren(clearMatrixRows: boolean): Promise<void> {
        if (!this.isExistingModification) {
            this.resetVdrState();
            return;
        }

        const vendorName = this.vendorName?.trim();
        const poNumber = this.poNumber?.trim();
        if (!vendorName || !poNumber) {
            this.resetVdrState();
            if (clearMatrixRows) {
                this.matrixRows = [];
            }
            return;
        }

        this.vdrLinesLoading = true;
        this.vdrLinesError = null;
        this.vdrLineEntries = [];
        if (clearMatrixRows) {
            this.matrixRows = [];
        }
        try {
            this.vdrLineEntries = await this.vendorService.loadVdrLineEntries(
                this.dialogData?.projectId,
                vendorName,
                poNumber
            );
            if (this.matrixRows.length === 0 && this.vdrLineEntries.length > 0) {
                this.matrixRows.push({ title: '', equipmentTag: '', vdrLineId: '', modificationScope: '' });
            }
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : 'Failed to load VDR lines';
            this.vdrLinesError = msg;
        } finally {
            this.vdrLinesLoading = false;
        }
    }

    get isValid(): boolean {
        const base = !!(
            this.poType &&
            this.name?.trim() &&
            this.poNumber?.trim() &&
            this.vendorName?.trim() &&
            this.region?.trim() &&
            this.asset?.trim() &&
            this.facility?.trim()
        );
        const matrixOk = this.isExistingModification
            ? this.matrixRows.length > 0 &&
              this.matrixRows.every((r) => !!r.vdrLineId?.trim() && !!r.modificationScope?.trim())
            : this.matrixRows.length > 0 &&
              this.matrixRows.every((r) => !!(r.title && r.equipmentTag));
        return base && matrixOk;
    }

    onClose(): void {
        if (this.poCreating) {
            return;
        }
        this.dialogRef.close(undefined);
    }

    async onSubmit(): Promise<void> {
        if (!this.isValid || this.poCreating) {
            return;
        }
        const projectId = this.dialogData?.projectId?.trim();
        if (!projectId) {
            this.notificationService.openSnackMessage('Missing project folder. Open this screen from a project and try again.');
            return;
        }

        const poNumber = this.poNumber.trim();
        const vdritem = JSON.stringify(
            this.matrixRows.map((r) => {
                if (this.isExistingModification) {
                    const entry = this.vdrLineEntries.find((e) => e.id === r.vdrLineId);
                    return {
                        title: (entry?.title || r.title).trim(),
                        equipment_tag: (entry?.equipmentTag || r.equipmentTag).trim(),
                        modification_scope: (r.modificationScope ?? '').trim()
                    };
                }
                return {
                    title: r.title.trim(),
                    equipment_tag: r.equipmentTag
                };
            })
        );
        const key = environment.createPoProcessDefinitionKey;
        const payload = {
            processDefinitionKey: key,
            name: poNumber,
            businessKey: key,
            variables: [
                { name: 'potype', value: this.poType },
                { name: 'projectid', value: projectId },
                { name: 'ponumber', value: poNumber },
                { name: 'vendorname', value: this.vendorName.trim() },
                { name: 'region', value: this.region.trim() },
                { name: 'asset', value: this.asset.trim() },
                { name: 'facility', value: this.facility.trim() },
                { name: 'vdritem', value: vdritem }
            ]
        };

        this.poCreating = true;
        try {
            /** ADF BPM ticket — avoids browser-cached Basic auth for `/activiti-app` (wrong user / 403). */
            const headers = await firstValueFrom(
                this.authService.addTokenToHeader(
                    environment.processInstancesUrl,
                    new HttpHeaders({
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store',
                        Pragma: 'no-cache'
                    })
                )
            );
            await firstValueFrom(this.http.post(environment.processInstancesUrl, payload, { headers }));
            this.notificationService.openSnackMessage('Purchase order process started.');
            this.dialogRef.close({
                name: this.name.trim(),
                poNumber,
                vendorName: this.vendorName.trim(),
                region: this.region.trim(),
                asset: this.asset.trim(),
                facility: this.facility.trim(),
                distributionMatrixRows: this.matrixRows.map((r) => ({ ...r }))
            });
        } catch (err: unknown) {
            const msg = CreatePoDialogComponent.apiErrorMessage(err) || 'Failed to create purchase order.';
            this.notificationService.openSnackMessage(msg);
        } finally {
            this.poCreating = false;
        }
    }

    /** Same shape as CreateNewProjectComponent.getApiErrorMessage (Activiti / Alfresco error bodies). */
    private static apiErrorMessage(err: unknown): string {
        const hiddenStackTraceMessage =
            'For security reasons the stack trace is no longer displayed, but the property is kept for previous versions.';
        const anyErr = err as any;
        const body = anyErr?.error;
        if (body && typeof body === 'object') {
            const apiError = body.error;
            if (apiError && typeof apiError === 'object') {
                if (typeof apiError.errorKey === 'string' && apiError.errorKey.trim()) {
                    return apiError.errorKey.trim();
                }
                if (typeof apiError.briefSummary === 'string' && apiError.briefSummary.trim()) {
                    return apiError.briefSummary.trim();
                }
                if (typeof apiError.message === 'string' && apiError.message.trim()) {
                    const msg = apiError.message.trim();
                    if (msg !== hiddenStackTraceMessage) {
                        return msg;
                    }
                }
            }
            if (typeof body.message === 'string' && body.message.trim()) {
                const msg = body.message.trim();
                if (msg !== hiddenStackTraceMessage) {
                    return msg;
                }
            }
        }
        if (typeof anyErr?.message === 'string' && anyErr.message.trim()) {
            return anyErr.message.trim();
        }
        return '';
    }
}
