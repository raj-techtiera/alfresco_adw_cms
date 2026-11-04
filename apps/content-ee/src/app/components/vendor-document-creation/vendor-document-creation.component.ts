import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppService, PageLayoutComponent, PageLayoutContentComponent } from '@alfresco/aca-shared';
import { AuthenticationService, NotificationService, UserPreferenceValues, UserPreferencesService } from '@alfresco/adf-core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { VendorDocumentRegistryDialogService } from '../vendor-document-registry-dialog/vendor-document-registry-dialog.service';
import { VendorDocumentDetailsDialogComponent } from '../vendor-document-details-dialog/vendor-document-details-dialog.component';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { encodeAlfrescoRelativePathParam } from '../../utils/encode-alfresco-relative-path-param';

export interface VendorNodeSelectOption {
    id: string;
    label: string;
    /** From `edms:po_business_unit` — first segment under the business-units root. */
    businessUnit?: string;
}

/** Resolved metadata for a single vendor document upload (multipart create). */
interface VendorDocumentUploadMeta {
    relativePath: string;
    projectRef: string;
    vendorName: string;
    poNumberValue: string;
    equipmentTag: string;
    vdrLineItemValue: string;
}

/** Row for vendor VDR document search (Alfresco public search API). */
export interface VendorVdrDocumentRow {
    /** Alfresco node id — used for details dialog. */
    nodeId: string;
    title: string;
    project: string;
    poNumber: string;
    vdrLineItemId: string;
    documentStatus: string;
    mimeType: string;
}

/** Summary card for the status dashboard (counts from unfiltered search for current vendor). */
export interface VendorStatusDashboardCard {
    id: string;
    label: string;
    count: number;
    /** Matches `vendorVdrStatusFilter`; empty = all documents. */
    filterValue: string;
    icon: string;
    variant: 'total' | 'approved' | 'review' | 'draft' | 'pending' | 'rejected' | 'other' | 'unset';
    /** If false, card is display-only (e.g. “Other”). */
    selectable: boolean;
}

@Component({
    standalone: true,
    selector: 'adw-vendor-document-creation',
    imports: [
        CommonModule,
        FormsModule,
        PageLayoutComponent,
        PageLayoutContentComponent,
        MatCardModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatPaginatorModule,
        MatDialogModule
    ],
    templateUrl: './vendor-document-creation.component.html',
    styleUrl: './vendor-document-creation.component.scss'
})
export class VendorDocumentCreationComponent implements OnInit {
    /**
     * When true, render without full page layout (for use inside a MatDialog).
     */
    @Input() embedded = false;

    /**
     * When true, show only header + request card (no tips aside, no vendor documents table). Used in dialogs.
     */
    @Input() minimalFormOnly = false;

    private readonly notification = inject(NotificationService);
    private readonly authService = inject(AuthenticationService);
    private readonly http = inject(HttpClient);
    private readonly vendorDocumentRegistryDialog = inject(VendorDocumentRegistryDialogService);
    private readonly dialog = inject(MatDialog);
    private readonly appService = inject(AppService);
    private readonly userPreferences = inject(UserPreferencesService);
    private readonly destroyRef = inject(DestroyRef);

    /** Match Projects portfolio: expand-nav control when sidenav is collapsed. */
    isSidenavExpanded = true;

    /** Client-side filter for the documents table (title, project, PO, line id, status). */
    vendorTableSearch = '';

    /** Parent folder for VDR paths — business units root (`NG_APP_BUSINESS_UNITS_NODE_ID`). */
    readonly uploadParentId = environment.businessUnitsParentNodeId;
    private readonly searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    private readonly nodesUrl = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
    private readonly childrenUploadUrl = `/alfresco/api/-default-/public/alfresco/versions/1/nodes/${environment.businessUnitsParentNodeId}/children`;

    /** Unique project names derived from the vendor's purchase orders. */
    projectOptions: VendorNodeSelectOption[] = [];
    poNumberOptions: VendorNodeSelectOption[] = [];
    vprLiftOptions: VendorNodeSelectOption[] = [];
    projectLoading = false;
    poLoading = false;
    vdrLoading = false;
    poNodeLoading = false;
    vprNodeLoading = false;
    /** Filters the Project mat-select options while the panel is open. */
    projectSelectSearch = '';

    /** Filters project options inside the Project mat-select panel. */

    /** Selected project name (drives the PO folder lookup). */
    selectedProject = '';
    /** Selected purchase order Alfresco node id */
    poNumber = '';
    /** Selected VDR line item Alfresco node id */
    vprLift = '';

    /** Latest GET /nodes/{id} response for selected PO (for submit / future use) */
    selectedPoNode: any = null;
    /** Latest GET /nodes/{id} response for selected VDR line item */
    selectedVprNode: any = null;

    /** Files chosen for submit (multipart `filedata`). */
    selectedFiles: File[] = [];

    submitting = false;

    /** Vendor VDR documents from search API (`edms:vdr_vendor_name` = logged-in user id). */
    vendorVdrRows: VendorVdrDocumentRow[] = [];
    vendorVdrLoading = false;
    vendorVdrLoadError: string | null = null;

    /** Filter by `edms:vdr_document_status` in the search API (empty = all statuses). */
    vendorVdrStatusFilter = '';

    /** Values must match how status is stored in the repository (see document “Document status” column). */
    readonly vendorVdrStatusFilterOptions: { value: string; label: string }[] = [
        { value: 'approved', label: 'Approved' },
        { value: 'under review', label: 'Under review' },
        { value: 'Draft', label: 'Draft' }
    ];

    /** Built from an unfiltered search (same vendor); independent of table status filter. */
    vendorDashboardCards: VendorStatusDashboardCard[] = [];
    vendorDashboardLoading = false;

    /** Client-side pagination for the vendor documents table (same pattern as Projects portfolio). */
    readonly vendorPageSizeOptions = [5, 10, 20];
    vendorPageSize = 10;
    vendorPageIndex = 0;

    /** Rows after client-side search (API results in `vendorVdrRows`). */
    get filteredVendorVdrRows(): VendorVdrDocumentRow[] {
        const q = (this.vendorTableSearch ?? '').trim().toLowerCase();
        if (!q) {
            return this.vendorVdrRows;
        }
        return this.vendorVdrRows.filter((row) => {
            const hay = [row.title, row.project, row.poNumber, row.vdrLineItemId, row.documentStatus, row.nodeId]
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }

    /** Labels for hero stat placeholders before dashboard counts load. */
    readonly heroStatPlaceholderLabels = ['All documents', 'Approved', 'Under review', 'Draft'];

    /** Rows visible for the current page. */
    get paginatedVendorVdrRows(): VendorVdrDocumentRow[] {
        const start = this.vendorPageIndex * this.vendorPageSize;
        const rows = this.filteredVendorVdrRows;
        return rows.slice(start, start + this.vendorPageSize);
    }

    onVendorVdrPageChange(event: PageEvent): void {
        this.vendorPageSize = event.pageSize;
        this.vendorPageIndex = event.pageIndex;
    }

    onVendorTableSearchChange(): void {
        this.vendorPageIndex = 0;
    }

    onVendorVdrStatusFilterChange(): void {
        void this.loadVendorVdrDocuments();
    }

    openSidenav(): void {
        this.appService.setAppNavbarMode('expanded');
        this.appService.appNavNarMode$.next('expanded');
        this.appService.toggleAppNavBar$.next();
        this.userPreferences.set(UserPreferenceValues.ExpandedSideNavStatus, true);
    }

    /**
     * Primary status strip (reference UI): All documents, Approved, Under review, Draft — fixed order, one row on wide screens.
     */
    private readonly vendorDashboardPrimaryStripIds = ['total', 'st-approved', 'st-under-review', 'st-draft'] as const;

    get vendorDashboardStripPrimary(): VendorStatusDashboardCard[] {
        const map = new Map(this.vendorDashboardCards.map((c) => [c.id, c]));
        return this.vendorDashboardPrimaryStripIds.map((id) => map.get(id)).filter((c): c is VendorStatusDashboardCard => c != null);
    }

    vendorDashboardTrendDirection(card: VendorStatusDashboardCard): 'up' | 'down' | 'neutral' {
        if (card.id === 'st-under-review') {
            return 'down';
        }
        if (card.id === 'st-draft') {
            return 'neutral';
        }
        return 'up';
    }

    vendorDashboardTrendIcon(card: VendorStatusDashboardCard): string {
        const d = this.vendorDashboardTrendDirection(card);
        if (d === 'down') {
            return 'arrow_downward';
        }
        if (d === 'neutral') {
            return 'remove';
        }
        return 'arrow_upward';
    }

    ngOnInit(): void {
        const allowedStatusFilters = new Set(['', ...this.vendorVdrStatusFilterOptions.map((o) => o.value)]);
        if (!allowedStatusFilters.has(this.vendorVdrStatusFilter)) {
            this.vendorVdrStatusFilter = '';
        }

        this.userPreferences
            .select<boolean>(UserPreferenceValues.ExpandedSideNavStatus)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((expanded) => {
                this.isSidenavExpanded = expanded ?? true;
            });

        if (this.embedded) {
            void this.loadVendorPurchaseOrdersForCurrentUser();
            if (!this.minimalFormOnly) {
                void this.loadVendorVdrDocuments();
                void this.loadVendorVdrDashboardCounts();
            }
        } else {
            void this.loadVendorVdrDocuments();
            void this.loadVendorVdrDashboardCounts();
        }
    }

    /** Tab page: open registration form in dialog; refresh vendor documents table when it closes. */
    openRegistrationDialog(): void {
        this.vendorDocumentRegistryDialog.openMinimal(() => {
            void this.loadVendorVdrDocuments();
            void this.loadVendorVdrDashboardCounts();
        });
    }

    openVendorDocumentDetails(row: VendorVdrDocumentRow): void {
        const id = (row.nodeId ?? '').trim();
        if (!id) {
            this.notification.openSnackMessage('Document id is not available for details.');
            return;
        }
        this.dialog.open(VendorDocumentDetailsDialogComponent, {
            data: { nodeId: id },
            width: 'min(1240px, calc(100vw - 48px))',
            maxWidth: '98vw',
            maxHeight: '92vh',
            autoFocus: 'dialog',
            panelClass: 'adw-vendor-document-details-dialog-panel'
        });
    }

    isDashboardCardActive(card: VendorStatusDashboardCard): boolean {
        if (card.id === 'total') {
            return this.vendorVdrStatusFilter === '';
        }
        if (!card.selectable) {
            return false;
        }
        return this.vendorVdrStatusFilter === card.filterValue;
    }

    onDashboardCardClick(card: VendorStatusDashboardCard): void {
        if (!card.selectable) {
            return;
        }
        this.vendorVdrStatusFilter = card.filterValue;
        void this.loadVendorVdrDocuments();
    }

    private dashboardVariantForFilterValue(value: string): VendorStatusDashboardCard['variant'] {
        const v = value.toLowerCase();
        if (v === 'approved') {
            return 'approved';
        }
        if (v === 'under review') {
            return 'review';
        }
        if (v === 'draft') {
            return 'draft';
        }
        if (v === 'pending') {
            return 'pending';
        }
        if (v === 'rejected') {
            return 'rejected';
        }
        return 'other';
    }

    private dashboardIconForFilterValue(value: string): string {
        const variant = this.dashboardVariantForFilterValue(value);
        const icons: Record<string, string> = {
            approved: 'check_circle',
            review: 'hourglass_top',
            draft: 'edit_note',
            pending: 'schedule',
            rejected: 'cancel',
            other: 'category',
            total: 'folder_open',
            unset: 'help_outline'
        };
        return icons[variant] ?? 'description';
    }

    /**
     * Loads up to 100 documents for the current vendor (no status clause) and aggregates counts for the dashboard.
     */
    private async loadVendorVdrDashboardCounts(): Promise<void> {
        const base = this.buildVdrDocumentsBaseQuery();
        if (!base) {
            this.vendorDashboardCards = [];
            return;
        }
        this.vendorDashboardLoading = true;
        try {
            const body = {
                query: { query: base },
                include: ['properties'],
                paging: { maxItems: 100 }
            };
            const response: any = await firstValueFrom(this.http.post(this.searchUrl, body, await this.buildAuthOptions(this.searchUrl)));
            const entries = response?.list?.entries ?? [];
            const rows = entries.map((row: any) => this.mapSearchEntryToVendorRow(row?.entry));
            const byKey = new Map<string, number>();
            for (const r of rows) {
                const raw = (r.documentStatus || '—').trim();
                const key = raw.toLowerCase();
                byKey.set(key, (byKey.get(key) ?? 0) + 1);
            }
            this.vendorDashboardCards = this.composeVendorDashboardCards(byKey, rows.length);
        } catch {
            this.vendorDashboardCards = [];
        } finally {
            this.vendorDashboardLoading = false;
        }
    }

    private composeVendorDashboardCards(byKey: Map<string, number>, totalRows: number): VendorStatusDashboardCard[] {
        const known = new Set(this.vendorVdrStatusFilterOptions.map((o) => o.value.toLowerCase()));
        const cards: VendorStatusDashboardCard[] = [
            {
                id: 'total',
                label: 'All documents',
                count: totalRows,
                filterValue: '',
                icon: 'folder_open',
                variant: 'total',
                selectable: true
            }
        ];
        for (const opt of this.vendorVdrStatusFilterOptions) {
            const key = opt.value.toLowerCase();
            cards.push({
                id: `st-${key.replace(/\s+/g, '-')}`,
                label: opt.label,
                count: byKey.get(key) ?? 0,
                filterValue: opt.value,
                icon: this.dashboardIconForFilterValue(opt.value),
                variant: this.dashboardVariantForFilterValue(opt.value),
                selectable: true
            });
        }
        let other = 0;
        byKey.forEach((n, key) => {
            if (key === '—' || key === '-') {
                return;
            }
            if (!known.has(key)) {
                other += n;
            }
        });
        if (other > 0) {
            cards.push({
                id: 'other',
                label: 'Other statuses',
                count: other,
                filterValue: '',
                icon: 'category',
                variant: 'other',
                selectable: false
            });
        }
        const unset = (byKey.get('—') ?? 0) + (byKey.get('-') ?? 0);
        if (unset > 0) {
            cards.push({
                id: 'unset',
                label: 'No status',
                count: unset,
                filterValue: '',
                icon: 'help_outline',
                variant: 'unset',
                selectable: false
            });
        }
        return cards;
    }

    onVendorFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const list = input.files;
        this.selectedFiles = list ? Array.from(list) : [];
    }

    clearVendorFiles(): void {
        this.selectedFiles = [];
    }

    /**
     * After a project is selected, list the PO folders under
     * `{businessUnit}/{projectName}/09.Vendor Submission/{vendorName}` and populate the PO dropdown.
     */
    async onProjectChange(selectedProjectName: string): Promise<void> {
        if (selectedProjectName === '__vd_project_search__') {
            return;
        }
        const project = (selectedProjectName ?? '').trim();
        if (project === '__project_search__') {
            return;
        }
        this.selectedProject = project;
        this.projectSelectSearch = '';
        this.poNumber = '';
        this.vprLift = '';
        this.selectedPoNode = null;
        this.selectedVprNode = null;
        this.vprLiftOptions = [];
        this.poNumberOptions = [];
        this.clearVendorFiles();

        if (!project) {
            return;
        }
        await this.loadPoNumbersForProject(project);
    }

    onProjectSelectOpened(opened: boolean): void {
        if (!opened) {
            this.projectSelectSearch = '';
        }
    }

    matchesProjectSearch(project: VendorNodeSelectOption): boolean {
        const q = this.projectSelectSearch.trim().toLowerCase();
        if (!q) {
            return true;
        }
        return (project.label || '').toLowerCase().includes(q) || (project.id || '').toLowerCase().includes(q);
    }

    hasMatchingProjects(): boolean {
        return this.projectOptions.some((project) => this.matchesProjectSearch(project));
    }

    /** GET children under `{businessUnit}/{projectName}/09.Vendor Submission/{vendorName}` — each child folder is a PO. */
    private async loadPoNumbersForProject(projectName: string): Promise<void> {
        const vendorName = this.resolveVendorName();
        if (!vendorName) {
            this.poNumberOptions = [];
            this.notification.openSnackMessage('Unable to resolve vendor name for PO lookup.');
            return;
        }

        const businessUnit = this.resolveBusinessUnitForProject(projectName);
        if (!businessUnit) {
            this.poNumberOptions = [];
            this.notification.openSnackMessage('Selected project is missing edms:po_business_unit for folder path.');
            return;
        }

        const relativePath = `${businessUnit}/${projectName}/09.Vendor Submission/${vendorName}`;
        const encodedPath = encodeAlfrescoRelativePathParam(relativePath);
        const url =
            `${this.nodesUrl}/${this.uploadParentId}/children` +
            `?relativePath=${encodedPath}&include=properties&skipCount=0&maxItems=200`;

        this.poLoading = true;
        try {
            const response: any = await firstValueFrom(this.http.get(url, await this.buildAuthOptions(url)));
            const entries = response?.list?.entries ?? [];
            const seen = new Set<string>();
            const options: VendorNodeSelectOption[] = [];
            for (const row of entries) {
                const entry = row?.entry;
                if (!entry?.id || seen.has(entry.id)) {
                    continue;
                }
                const label = this.extractPoNumber(entry);
                if (!label) {
                    continue;
                }
                seen.add(entry.id);
                options.push({ id: entry.id, label, businessUnit });
            }
            this.poNumberOptions = options;
        } catch {
            this.poNumberOptions = [];
            this.notification.openSnackMessage('Unable to load PO numbers for the selected project.');
        } finally {
            this.poLoading = false;
        }
    }

    async onPoNumberChange(selectedPoNodeId: string): Promise<void> {
        const id = (selectedPoNodeId ?? '').trim();
        this.poNumber = id;
        this.vprLift = '';
        this.selectedPoNode = null;
        this.selectedVprNode = null;
        this.clearVendorFiles();

        if (!id) {
            this.vprLiftOptions = [];
            return;
        }

        this.poNodeLoading = true;
        try {
            const data: any = await firstValueFrom(
                this.http.get(`${this.nodesUrl}/${id}`, await this.buildAuthOptions(`${this.nodesUrl}/${id}`))
            );
            this.selectedPoNode = data;
            await this.loadVdrLineItemsForPo(id);
        } catch {
            this.selectedPoNode = null;
            this.vprLiftOptions = [];
            this.notification.openSnackMessage('Unable to load selected PO details.');
        } finally {
            this.poNodeLoading = false;
        }
    }

    async onVprLiftChange(selectedVprNodeId: string): Promise<void> {
        const id = (selectedVprNodeId ?? '').trim();
        this.vprLift = id;
        this.selectedVprNode = null;
        this.clearVendorFiles();

        if (!id) {
            return;
        }

        this.vprNodeLoading = true;
        try {
            const data: any = await firstValueFrom(
                this.http.get(`${this.nodesUrl}/${id}`, await this.buildAuthOptions(`${this.nodesUrl}/${id}`))
            );
            this.selectedVprNode = data;
        } catch {
            this.selectedVprNode = null;
            this.notification.openSnackMessage('Unable to load selected VDR line item details.');
        } finally {
            this.vprNodeLoading = false;
        }
    }

    async onSubmit(): Promise<void> {
        if (!this.poNumber?.trim()) {
            this.notification.openSnackMessage('Select a PO number.');
            return;
        }
        if (!this.vprLift?.trim()) {
            this.notification.openSnackMessage('Select a VDR line item.');
            return;
        }
        if (this.selectedFiles.length < 1) {
            this.notification.openSnackMessage('Choose at least one file before submitting.');
            return;
        }
        if (!this.selectedPoNode?.entry || !this.selectedVprNode?.entry) {
            this.notification.openSnackMessage('PO and VDR line item details are still loading. Try again.');
            return;
        }

        const poEntry = this.selectedPoNode.entry;
        const vprEntry = this.selectedVprNode.entry;
        const projectRef = this.extractProjectRef(poEntry) ?? this.extractProjectRef(vprEntry);
        const businessUnit =
            this.extractBusinessUnit(poEntry) ??
            this.extractBusinessUnit(vprEntry) ??
            this.resolveBusinessUnitForProject(this.selectedProject);
        const vendorName = this.extractVendorName(poEntry, vprEntry);
        const poNumberValue = this.poNumberOptions.find((o) => o.id === this.poNumber)?.label ?? this.extractPoRefForVdrSearch(poEntry);
        const vdrLineItemValue = this.resolveSelectedVdrLineItemValue(vprEntry);
        const equipmentTag = this.extractEquipmentTag(vprEntry, poEntry);

        if (!businessUnit?.trim()) {
            this.notification.openSnackMessage('Selected PO is missing edms:po_business_unit for upload path.');
            return;
        }
        if (!projectRef?.trim()) {
            this.notification.openSnackMessage('Selected PO is missing edms:project_ref for upload path.');
            return;
        }
        if (!vendorName?.trim()) {
            this.notification.openSnackMessage('Selected records are missing edms:vendor_name.');
            return;
        }
        if (!poNumberValue?.trim() || !vdrLineItemValue?.trim()) {
            this.notification.openSnackMessage('Could not resolve PO number or VDR line item for the upload path.');
            return;
        }

        const relativePath = this.buildVendorRelativePath(
            businessUnit,
            projectRef,
            vendorName,
            poNumberValue,
            vdrLineItemValue
        );

        const meta: VendorDocumentUploadMeta = {
            relativePath,
            projectRef: projectRef.trim(),
            vendorName: vendorName.trim(),
            poNumberValue: poNumberValue.trim(),
            equipmentTag: equipmentTag.trim(),
            vdrLineItemValue: vdrLineItemValue.trim()
        };

        this.submitting = true;
        try {
            let uploaded = 0;
            for (const file of this.selectedFiles) {
                await this.uploadVendorDocumentWithConflictRetry(file, meta);
                uploaded++;
            }

            this.notification.openSnackMessage(`Registered ${uploaded} vendor document(s).`);
            setTimeout(() => window.location.reload(), 500);
        } catch (err: any) {
            const msg = this.formatUploadError(err);
            this.notification.openSnackMessage(msg);
        } finally {
            this.submitting = false;
        }
    }

    /**
     * Uploads one vendor document. On HTTP 409 (a document with the same name/version already exists),
     * it re-submits the same request with `overwrite: true` to replace the existing document.
     */
    private async uploadVendorDocumentWithConflictRetry(file: File, meta: VendorDocumentUploadMeta): Promise<void> {
        try {
            await this.postVendorDocument(file, meta, false);
        } catch (err: any) {
            if (err?.status === 409) {
                const response = await this.postVendorDocument(file, meta, true);
                const documentId = this.extractUploadedNodeId(response);
                if (documentId) {
                    await this.markDocumentAsModification(documentId);
                }
                return;
            }
            throw err;
        }
    }

    private async postVendorDocument(file: File, meta: VendorDocumentUploadMeta, overwrite: boolean): Promise<any> {
        const formData = new FormData();
        formData.append('filedata', file, file.name);
        formData.append('cm:title', file.name);
        formData.append('relativePath', meta.relativePath);
        formData.append('nodeType', 'edms:vdrDocument');
        formData.append('edms:vdr_project', meta.projectRef);
        formData.append('edms:vdr_vendor_name', meta.vendorName);
        formData.append('edms:vdr_po_number', meta.poNumberValue);
        formData.append('edms:vdr_equipment_tag', meta.equipmentTag);
        formData.append('edms:vdr_line_item_id', meta.vdrLineItemValue);
        formData.append('Revision', 'Revision 0');
        if (overwrite) {
            formData.append('overwrite', 'true');
        }

        const auth = await this.buildAuthOptions(this.childrenUploadUrl);
        let headers = auth.headers ?? new HttpHeaders();
        headers = headers.delete('Content-Type');

        return firstValueFrom(this.http.post(this.childrenUploadUrl, formData, { headers }));
    }

    /** After an overwrite, flag the document as a Modification Document via PUT /nodes/{id}. */
    private async markDocumentAsModification(documentId: string): Promise<void> {
        const url = `${this.nodesUrl}/${documentId}`;
        const body = {
            properties: {
                'edms:isModificationDocument': true
            }
        };
        try {
            await firstValueFrom(this.http.put(url, body, await this.buildAuthOptions(url)));
        } catch {
            this.notification.openSnackMessage('Document was overwritten but could not be flagged as a modification document.');
        }
    }

    /** Node id of the document returned by the multipart children upload API. */
    private extractUploadedNodeId(response: any): string {
        const id = response?.entry?.id;
        return id != null && String(id).trim() ? String(id).trim() : '';
    }

    /**
     * Loads every purchase order for the current vendor, then derives the unique project names for the
     * Project dropdown. The PO dropdown is populated only after a project is selected (see `onProjectChange`).
     */
    private async loadVendorPurchaseOrdersForCurrentUser(): Promise<void> {
        const userId = this.resolveVendorName();
        if (!userId) {
            this.projectOptions = [];
            this.poNumberOptions = [];
            return;
        }

        this.projectLoading = true;
        try {
            const body = {
                query: {
                    query: `TYPE:'edms:purchaseOrder' AND =edms:vendor_name:'${userId.replace(/'/g, "\\'")}'`
                },
                include: ['properties']
            };

            const response: any = await firstValueFrom(
                this.http.post(this.searchUrl, body, await this.buildAuthOptions(this.searchUrl))
            );

            const entries = response?.list?.entries ?? [];
            this.projectOptions = this.buildUniqueProjectOptions(entries);
            // Reset downstream selection until a project is chosen.
            this.selectedProject = '';
            this.projectSelectSearch = '';
            this.poNumberOptions = [];
        } catch {
            this.projectOptions = [];
            this.poNumberOptions = [];
            this.projectSelectSearch = '';
            this.notification.openSnackMessage('Unable to load projects for this vendor.');
        } finally {
            this.projectLoading = false;
        }
    }

    /** Vendor name for the PO search — from localStorage `USER_PROFILE`, falling back to the auth username. */
    private resolveVendorName(): string {
        let raw: string | null = null;
        try {
            raw = localStorage.getItem('USER_PROFILE');
        } catch {
            raw = null;
        }
        const value = (raw ?? '').trim();
        if (value) {
            // USER_PROFILE may be a plain id or a JSON object ({ id }/{ username }/{ key }).
            if (value.startsWith('{')) {
                try {
                    const parsed = JSON.parse(value);
                    const fromJson = parsed?.id ?? parsed?.username ?? parsed?.userName ?? parsed?.key ?? '';
                    if (fromJson != null && String(fromJson).trim()) {
                        return String(fromJson).trim();
                    }
                } catch {
                    /* fall through to raw value */
                }
            }
            return value;
        }
        return this.authService.getUsername()?.trim() ?? '';
    }





    /** Unique, sorted project names extracted from the vendor's purchase orders (with business unit). */
    private buildUniqueProjectOptions(entries: any[]): VendorNodeSelectOption[] {
        const seen = new Set<string>();
        const options: VendorNodeSelectOption[] = [];
        for (const row of entries) {
            const entry = row?.entry ?? row;
            const name = this.extractProjectName(entry);
            if (!name || seen.has(name)) {
                continue;
            }
            seen.add(name);
            options.push({
                id: name,
                label: name,
                businessUnit: this.extractBusinessUnit(entry) || undefined
            });
        }
        return options.sort((a, b) => b.label.localeCompare(a.label));
    }

    /** Business unit folder name for the selected project (`edms:po_business_unit`). */
    private resolveBusinessUnitForProject(projectName: string): string {
        const fromOption = this.projectOptions.find((p) => p.id === projectName)?.businessUnit?.trim();
        if (fromOption) {
            return fromOption;
        }
        return '';
    }

    private extractBusinessUnit(entry: any): string | null {
        if (!entry) {
            return null;
        }
        const p = entry.properties ?? {};
        const v =
            p['edms:po_business_unit'] ??
            p['edms:poBusinessUnit'] ??
            p['edms:business_unit'] ??
            p['edms:businessUnit'] ??
            null;
        return v != null && String(v).trim() ? String(v).trim() : null;
    }

    /** Project name shown in the Project dropdown (falls back to project reference identifiers). */
    private extractProjectName(entry: any): string {
        if (!entry) {
            return '';
        }
        const p = entry.properties ?? {};
        const v =
            p['edms:project_name'] ??
            p['edms:projectName'] ??
            p['edms:project_ref'] ??
            p['edms:projectRef'] ??
            p['eng:projectno'] ??
            p['edms:engineeringProject'] ??
            null;
        return v != null && String(v).trim() ? String(v).trim() : '';
    }

    /** Base query: document type + current user as vendor (no status). */
    private buildVdrDocumentsBaseQuery(): string | null {
        const userId = this.authService.getUsername()?.trim();
        if (!userId) {
            return null;
        }
        const esc = (s: string) => s.replace(/"/g, '\\"');
        return `TYPE:"edms:vdrDocument" AND =edms:vdr_vendor_name:"${esc(userId)}"`;
    }

    /**
     * Table search: base query plus optional `edms:vdr_document_status` when the status filter is set.
     */
    private buildVdrDocumentsSearchQuery(): string | null {
        const base = this.buildVdrDocumentsBaseQuery();
        if (!base) {
            return null;
        }
        const status = (this.vendorVdrStatusFilter ?? '').trim();
        if (status) {
            const esc = (s: string) => s.replace(/'/g, "\\'");
            return `${base} AND edms:vdr_document_status:'${esc(status)}'`;
        }
        return base;
    }

    private async loadVendorVdrDocuments(): Promise<void> {
        this.vendorVdrLoading = true;
        this.vendorVdrLoadError = null;
        const queryStr = this.buildVdrDocumentsSearchQuery();
        if (!queryStr) {
            this.vendorVdrRows = [];
            this.vendorPageIndex = 0;
            this.vendorVdrLoading = false;
            this.vendorVdrLoadError = 'Unable to resolve your user id for vendor document search.';
            return;
        }
        try {
            const body = {
                query: {
                    query: queryStr
                },
                include: ['properties'],
                sort: [
                    {
                        type: 'FIELD',
                        field: 'cm:created',
                        ascending: false
                    }
                ]
            };

            const response: any = await firstValueFrom(this.http.post(this.searchUrl, body, await this.buildAuthOptions(this.searchUrl)));
            const entries = response?.list?.entries ?? [];
            this.vendorVdrRows = entries.map((row: any) => this.mapSearchEntryToVendorRow(row?.entry));
            this.vendorPageIndex = 0;
        } catch {
            this.vendorVdrRows = [];
            this.vendorPageIndex = 0;
            this.vendorVdrLoadError = 'Unable to load vendor documents.';
        } finally {
            this.vendorVdrLoading = false;
        }
    }

    private mapSearchEntryToVendorRow(entry: any): VendorVdrDocumentRow {
        const p = entry?.properties ?? {};
        const title =
            p['cm:title'] != null && String(p['cm:title']).trim()
                ? String(p['cm:title']).trim()
                : entry?.name != null
                  ? String(entry.name).trim()
                  : '—';
        const project = this.strProp(p, ['edms:vdr_project', 'edms:vdrProject']);
        const poNumber = this.strProp(p, ['edms:vdr_po_number', 'edms:vdrPoNumber', 'edms:po_number']);
        const vdrLineItemId = this.strProp(p, ['edms:vdr_line_item_id', 'edms:vdrLineItemId']);
        const documentStatus = this.strProp(p, [
            'edms:vdr_document_status',
            'edms:vdrDocumentStatus',
            'edms:document_status',
            'edms:documentStatus',
            'edms:vdr_status'
        ]);
        const mimeType = typeof entry?.content?.mimeType === 'string' ? String(entry.content.mimeType).trim() : '';

        return {
            nodeId: this.extractSearchResultNodeId(entry),
            title,
            project: project || '—',
            poNumber: poNumber || '—',
            vdrLineItemId: vdrLineItemId || '—',
            documentStatus: documentStatus || '—',
            mimeType
        };
    }

    iconForVendorDoc(row: VendorVdrDocumentRow): string {
        const mime = (row?.mimeType || '').toLowerCase();
        const title = (row?.title || '').toLowerCase();
        if (mime.includes('pdf') || title.endsWith('.pdf')) {
            return 'picture_as_pdf';
        }
        if (
            mime.includes('spreadsheet') ||
            mime.includes('excel') ||
            /\.(xlsx?|csv)$/i.test(title)
        ) {
            return 'table_chart';
        }
        if (
            mime.includes('wordprocessingml') ||
            mime.includes('msword') ||
            /\.(docx?)$/i.test(title)
        ) {
            return 'description';
        }
        if (mime.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(title)) {
            return 'image';
        }
        return 'insert_drive_file';
    }

    normalizedVendorStatus(status: string): 'approved' | 'under-review' | 'draft' | 'other' {
        const s = (status || '').trim().toLowerCase();
        if (s === 'approved') {
            return 'approved';
        }
        if (s === 'under review') {
            return 'under-review';
        }
        if (s === 'draft') {
            return 'draft';
        }
        return 'other';
    }

    vendorStatusIcon(status: string): string {
        const key = this.normalizedVendorStatus(status);
        if (key === 'approved') {
            return 'check_circle';
        }
        if (key === 'under-review') {
            return 'hourglass_top';
        }
        if (key === 'draft') {
            return 'edit_note';
        }
        return 'info';
    }

    vendorStatusLabel(status: string): string {
        const key = this.normalizedVendorStatus(status);
        if (key === 'under-review') {
            return 'Under Review';
        }
        if (key === 'approved') {
            return 'Approved';
        }
        if (key === 'draft') {
            return 'Draft';
        }
        return (status || 'Unknown').trim() || 'Unknown';
    }

    /**
     * Public search entries may expose the node id as `id`, `guid`, a `workspace://…/uuid` ref,
     * or only on `edms:document_id`. We normalize to a bare UUID for `/nodes/{id}` calls.
     */
    private extractSearchResultNodeId(entry: any): string {
        if (!entry) {
            return '';
        }
        const p = entry.properties ?? {};
        const candidates = [entry.id, entry.guid, p['edms:document_id'], p['cmis:objectId']];
        for (const c of candidates) {
            const u = this.extractUuidFromAlfrescoRef(c);
            if (u) {
                return u;
            }
        }
        if (entry.id != null && String(entry.id).trim()) {
            return String(entry.id).trim();
        }
        return '';
    }

    private extractUuidFromAlfrescoRef(raw: unknown): string {
        if (raw == null) {
            return '';
        }
        const s = String(raw).trim();
        if (!s) {
            return '';
        }
        const m = s.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return m ? m[1] : '';
    }

    private strProp(properties: Record<string, unknown>, keys: string[]): string {
        for (const key of keys) {
            const v = properties[key];
            if (v != null && String(v).trim()) {
                return String(v).trim();
            }
        }
        return '';
    }

    /** GET children under the selected PO folder — each child folder/document is a VDR line item. */
    private async loadVdrLineItemsForPo(poNodeId: string): Promise<void> {
        const id = (poNodeId ?? '').trim();
        if (!id) {
            this.vprLiftOptions = [];
            return;
        }

        const url =
            `${this.nodesUrl}/${id}/children` +
            `?include=properties&skipCount=0&maxItems=200`;

        this.vdrLoading = true;
        try {
            const response: any = await firstValueFrom(this.http.get(url, await this.buildAuthOptions(url)));
            const entries = response?.list?.entries ?? [];
            const seen = new Set<string>();
            const options: VendorNodeSelectOption[] = [];
            for (const row of entries) {
                const entry = row?.entry;
                if (!entry?.id || seen.has(entry.id)) {
                    continue;
                }
                const label = this.extractVdrLineItem(entry);
                if (!label) {
                    continue;
                }
                seen.add(entry.id);
                options.push({ id: entry.id, label });
            }
            this.vprLiftOptions = options;
        } catch {
            this.vprLiftOptions = [];
            this.notification.openSnackMessage('Unable to load VDR line items for selected PO.');
        } finally {
            this.vdrLoading = false;
        }
    }

    private buildVendorRelativePath(
        businessUnit: string,
        projectRef: string,
        vendorName: string,
        poNumberValue: string,
        vprLiftValue: string
    ): string {
        return [
            this.sanitizePathSegment(businessUnit),
            this.sanitizePathSegment(projectRef),
            '09.Vendor Submission',
            this.sanitizePathSegment(vendorName),
            this.sanitizePathSegment(poNumberValue),
            this.sanitizePathSegment(vprLiftValue)
        ].join('/');
    }

    private sanitizePathSegment(value: string): string {
        return String(value ?? '')
            .trim()
            .replace(/[/\\]+/g, '-');
    }

    private extractProjectRef(entry: any): string | null {
        if (!entry) {
            return null;
        }
        const p = entry.properties ?? {};
        const v =
            p['edms:project_ref'] ??
            p['edms:projectRef'] ??
            p['eng:projectno'] ??
            p['edms:engineeringProject'] ??
            null;
        return v != null && String(v).trim() ? String(v).trim() : null;
    }

    private extractVendorName(poEntry: any, vprEntry: any): string {
        const p = (e: any) => e?.properties ?? {};
        const fromPo = p(poEntry)['edms:vendor_name'] ?? p(poEntry)['edms:vendorName'];
        const fromVpr = p(vprEntry)['edms:vendor_name'] ?? p(vprEntry)['edms:vendorName'];
        const resolved = fromPo ?? fromVpr ?? this.authService.getUsername();
        return resolved != null ? String(resolved).trim() : '';
    }

    private extractEquipmentTag(vprEntry: any, poEntry: any): string {
        const p = (e: any) => e?.properties ?? {};
        const v = p(vprEntry);
        const o = p(poEntry);
        const tag =
            v['edms:vdr_equipment_tag'] ??
            v['edms:equipment_tag'] ??
            v['edms:equipmentTag'] ??
            v['eng:equipmenttag'] ??
            o['edms:vdr_equipment_tag'] ??
            o['edms:equipment_tag'] ??
            o['edms:equipmentTag'] ??
            '';
        return tag != null ? String(tag).trim() : '';
    }

    /**
     * Same string shown for the selected VDR line item: mat-select label, else line-item properties on the loaded node.
     * Used for `relativePath` and `edms:vdr_line_item_id` (not the Alfresco node id).
     */
    private resolveSelectedVdrLineItemValue(vprEntry: any): string {
        const fromLabel = (this.vprLiftOptions.find((o) => o.id === this.vprLift)?.label ?? '').trim();
        if (fromLabel) {
            return fromLabel;
        }
        const fromEntry = this.extractVdrLineItem(vprEntry);
        return fromEntry != null ? String(fromEntry).trim() : '';
    }

    private formatUploadError(err: any): string {
        const body = err?.error;
        if (body?.error?.briefSummary) {
            return String(body.error.briefSummary);
        }
        if (body?.error?.errorKey) {
            return String(body.error.errorKey);
        }
        if (typeof err?.message === 'string') {
            return err.message;
        }
        return 'Vendor document registration failed.';
    }

    private async buildAuthOptions(url: string): Promise<{ headers: HttpHeaders }> {
        const headers = await firstValueFrom(
            this.authService.addTokenToHeader(
                url,
                new HttpHeaders({
                    'Cache-Control': 'no-store',
                    Pragma: 'no-cache'
                })
            )
        );
        return { headers };
    }

    private extractPoNumber(entry: any): string | null {
        if (!entry) {
            return null;
        }

        const properties = entry.properties ?? {};
        return (
            properties['edms:poNumber'] ??
            properties['edms:po_number'] ??
            properties['edms:purchaseOrderNo'] ??
            properties['edms:purchaseOrderNumber'] ??
            properties['cm:name'] ??
            entry.name ??
            null
        );
    }

    private extractVdrLineItem(entry: any): string | null {
        if (!entry) {
            return null;
        }

        const properties = entry.properties ?? {};
        return (
            properties['edms:vdr_line_item'] ??
            properties['edms:vdrLineItem'] ??
            properties['edms:vpr_lift'] ??
            properties['edms:vprLift'] ??
            properties['cm:name'] ??
            entry.name ??
            null
        );
    }

    /** Value used in `edms:vdr_po_ref:'…'` when searching VDR items */
    private extractPoRefForVdrSearch(entry: any): string | null {
        if (!entry) {
            return null;
        }
        const properties = entry.properties ?? {};
        const ref =
            properties['edms:vdr_po_ref'] ??
            properties['edms:poNumber'] ??
            properties['edms:po_number'] ??
            properties['edms:purchaseOrderNo'] ??
            properties['edms:purchaseOrderNumber'] ??
            properties['cm:name'] ??
            entry.name ??
            null;
        return ref != null && String(ref).trim() ? String(ref).trim() : null;
    }
}
