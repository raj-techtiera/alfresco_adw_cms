import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, NgZone, ElementRef, inject, DestroyRef, viewChild, signal } from '@angular/core';
import { CommonModule, DOCUMENT, formatDate } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  DataColumnComponent,
  DataColumnListComponent,
  PaginationComponent,
  ShowHeaderMode,
  CustomEmptyContentTemplateDirective,
  InfoDrawerComponent,
  ToolbarModule,
  ConfirmDialogComponent,
  ConfirmDialogComponentProps,
  NotificationService,
  AuthenticationService,
} from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { encodeAlfrescoRelativePathParam } from '../../utils/encode-alfresco-relative-path-param';
import { environment } from '../../../environments/environment';
import {
  AssetsHierarchySelection,
  readAssetsHierarchySelection,
  writeAssetsHierarchySelection
} from '../../services/assets.service';
import {
  DocumentListComponent,
  ContentActionComponent,
  ContentActionListComponent,
  BreadcrumbComponent,
  FolderDialogComponent,
  RowFilter,
  NodeActionsService,
  NewVersionUploaderService,
  NewVersionUploaderDataAction,
  NodePermissionDialogService,
  ContentNodeDialogService,
  ContentNodeSelectorComponent,
  ContentNodeSelectorComponentData,
  NodeAction,
  ContentMetadataCardComponent,
  NodesApiService,
  CardViewContentUpdateService,
  AlfrescoApiService,
  AllowableOperationsEnum,
  UploadService,
  FileModel
} from '@alfresco/adf-content-services';
import { Node, NodeEntry, FavoritesApi } from '@alfresco/js-api';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { filter, firstValueFrom, fromEvent, map, merge, race, Subject, Subscription, switchMap, take, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MdrDashboardComponent } from './mdr-dashboard/mdr-dashboard.component';
import {
  MdrImportStatusDialogComponent,
  MdrImportStatusDialogData,
  MdrImportStatusKind
} from './mdr-dashboard/mdr-import-status-dialog/mdr-import-status-dialog.component';
import {
  AppExtensionService,
  ContentApiService,
  PageLayoutComponent,
  PageLayoutHeaderComponent,
  PageLayoutContentComponent,
  ToolbarComponent as AcaToolbarComponent,
  LockedByComponent,
  isLocked
} from '@alfresco/aca-shared';
import {
  AddFavoriteAction,
  FileFromTemplate,
  FolderFromTemplate,
  RemoveFavoriteAction,
  SetCurrentFolderAction,
  ShareNodeAction
} from '@alfresco/aca-shared/store';
import { CreateOfficeDocumentAction } from '../../../../../../libs/content-ee/microsoft-office-online-integration-extension/src/lib/store/extension.actions';
import { ContentActionRef } from '@alfresco/adf-extensions';
import { ToolbarComponent } from '../../../../../../libs/content-ee/content-services-extension/src/lib/components/shared/toolbar.component';
import { Store } from '@ngrx/store';
import { PreviewTabComponent } from '../../../../../../libs/content-ee/content-services-extension/src/lib/components/preview-tab/preview-tab.component';
import { ArenderRedirectService } from '../../../../../../libs/content-ee/process-services-extension/src/lib/services/arender-redirect.service';
import { CadCommentsMetadataService } from '../../cad-viewer/cad-comments-metadata.service';
import { CadViewerOpenService } from '../../cad-viewer/cad-viewer-open.service';
import { isCadFile } from '../../cad-viewer/is-cad-file';
import { WatermarkedDownloadService } from '../../services/watermarked-download.service';
import { AlfrescoService } from '../../alfresco.service';
import { DistributionMatrixComponent } from '../distribution-matrix/distribution-matrix.component';
import { CreatePoDialogComponent, CreatePoDialogData } from '../create-po-dialog/create-po-dialog.component';
import {
  ReportsDialogComponent,
  ReportsDialogData,
  ReportsDialogResult
} from '../reports-dialog/reports-dialog.component';
import {
  ShutdownRequestDialogComponent,
  ShutdownRequestDialogData
} from '../shutdown-request-dialog/shutdown-request-dialog.component';
import { ForceReopenDialogComponent, ForceReopenDialogData } from '../force-reopen-dialog/force-reopen-dialog.component';
import {
  RequestForReviewDialogComponent,
  RequestForReviewDialogData
} from '../request-for-review-dialog/request-for-review-dialog.component';
import { DocumentNamingComponent } from '../document-naming/document-naming.component';
import {
  AuditTrailDialogComponent,
  AuditTrailDialogData
} from '../audit-trail-dialog/audit-trail-dialog.component';
import {
  IncomingTransmittalUploadDialogComponent,
  IncomingTransmittalUploadDialogData
} from '../incoming-transmittal-upload-dialog/incoming-transmittal-upload-dialog.component';
import {
  BulkUploadDialogComponent,
  BulkUploadDialogData
} from '../bulk-upload-dialog/bulk-upload-dialog.component';
import {
  DocNumberChangeRequestDialogComponent,
  DocNumberChangeRequestDialogData
} from '../doc-number-change-request-dialog/doc-number-change-request-dialog.component';
import {
  SelectWatermarkDialogComponent,
  SelectWatermarkDialogData,
  SelectWatermarkDialogResult
} from '../select-watermark-dialog/select-watermark-dialog.component';
import { WatermarkTemplateKind } from '../../services/settings.service';
import { HrJrRequestDialogComponent } from '../hr-management/hr-jr-request-dialog/hr-jr-request-dialog.component';

const ACS_NODES_API_BASE_URL = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';

@Component({
  selector: 'adw-project-explorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    DocumentListComponent,
    DataColumnComponent,
    DataColumnListComponent,
    ContentActionComponent,
    ContentActionListComponent,
    BreadcrumbComponent,
    PaginationComponent,
    PageLayoutComponent,
    PageLayoutHeaderComponent,
    PageLayoutContentComponent,
    AcaToolbarComponent,
    CustomEmptyContentTemplateDirective,
    ConfirmDialogComponent,
    FolderDialogComponent,
    InfoDrawerComponent,
    ToolbarModule,
    PreviewTabComponent,
    ContentMetadataCardComponent,
    MdrDashboardComponent,
    LockedByComponent
    // NodeCommentsComponent
  ],
  templateUrl: './project-explorer.component.html',
  styleUrls: ['./project-explorer.component.scss']
})
export class ProjectExplorerComponent extends ToolbarComponent  implements OnInit, AfterViewInit, OnDestroy {
  /** Main toolbar Start Process action from process-services-extension (rendered in template with icon). */
  private static readonly startProcessToolbarActionId = 'alfresco.app.main-action.start.process';

  /** Report folders are resolved under this project-relative location. */
  private static readonly reportsBaseRelativePath = '07.Reports';
  /** Loading folder relative path under project root. */
  private static readonly loadingFolderRelativePath = '06.Loading';
  /** Map selected report label to target folder under `07.Reports`. */
  private static readonly reportFolderByType: Record<string, string> = {
    'Handover Gap Report': 'Handover Gap Report',
    'Compile Handover Report': 'Compile Handover Report'
  };
  /** Activiti profile API used to gate Reports button by group name. */
  private static readonly activitiProfileUrl = '/activiti-app/api/enterprise/profile';
  /** Only users having this name in profile/group can see Reports button. */
  private static readonly reportsAllowedProfileName = 'PTTEP_DCM';
  /** Only users having this name in profile/group can see Create PO button. */
  private static readonly createPoAllowedProfileName = 'EPC_PROCUREMENT_ENGINEER';
  /** Only users having this name in profile/group can see Upload file button. */
  private static readonly uploadAllowedProfileName = 'EPC_LEAD_PIPE_ENGINEER';
  /** Only users having this name in profile/group can see Start Process button. */
  private static readonly startProcessAllowedProfileName = 'EPC_DCM';
  private static readonly pendingToastStorageKey = 'adw.projectExplorer.pendingToast';
  private static readonly handoverProcessDisplayName = 'EDMS Handover Package';
  /** ACS search endpoint used to check approved docs before handover trigger. */
  private static readonly searchApiUrl = '/alfresco/api/-default-/public/search/versions/1/search';
  nodeId: string | null = null;
  search = '';
  /** Project Management / Projects root — same env node used by Projects Portfolio. */
  rootParentId = environment.projectsParentNodeId || '5632efcf-e9b3-41aa-b2ef-cfe9b341aa4a';
  /** Business Units parent — projects live under `<root>/<business-unit>/<project>`. */
  private readonly businessUnitsRootParentId = environment.businessUnitsParentNodeId;
  /** Asset Management root folder â€” Open from Asset Hierarchy lands under this node. */
  readonly assetsRootParentId = environment.assetsParentNodeId;
  folderNode: Node | null = null;
  pageSize = 25;
  viewModeGrid = false; // false = list, true = grid (thumbnails)
  private folderNodeSub?: Subscription;
  private nodeUpdatedSub?: Subscription;
  private metadataSavedSub?: Subscription;
  showHeaderMode = ShowHeaderMode.Always;
  /** Ensure list payloads include lock flags (cm:lock* lives under properties by default). */
  readonly documentListIncludeFields = ['isLocked', 'isLink', 'properties'];

  /**
   * Grid/thumbnail column: show lock glyph for write-locked files (ACA standard).
   */
  dmsListImageResolver = (row: any): string | null => {
    if (row?.node && isLocked(row.node)) {
      return 'material-icons://lock';
    }
    return null;
  };

  /** Main content tabs below the project header. */
  activeMainTab: 'mdr' | 'details' = 'details';
  /** `localStorage bU-route=false` means this explorer was opened from the business-unit menu. */
  hideMdrFromBuRoute = false;
  /** Business-unit folder id we landed on from the BU menu; MDR stays hidden until we leave it. */
  private buListNodeId: string | null = null;
  /** Set when opened from Asset Hierarchy so MDR stays hidden before folder path loads. */
  private explorerContextHint: 'assets' | null = null;

  /** True when browsing folders under Asset Management (opened from Asset Hierarchy). */
  get isAssetExplorerContext(): boolean {
    if (this.explorerContextHint === 'assets') {
      return true;
    }
    return this.isUnderAssetManagementPath(this.folderNode);
  }

  /** MDR Dashboard is hidden for Document Management, Asset Hierarchy, and business-unit list (`bU-route=false`). */
  get showMdrDashboardTab(): boolean {
    return !this.isAssetExplorerContext && !this.hideMdrFromBuRoute && !this.router.url.startsWith('/document-management');
  }

  private isUnderAssetManagementPath(node: Node | null | undefined): boolean {
    if (!node) {
      return false;
    }
    if (node.id === this.assetsRootParentId) {
      return true;
    }
    const elements = node.path?.elements ?? [];
    const elId = (e: { id?: string; nodeId?: string }) => e?.id ?? e?.nodeId;
    const getName = (e: { name?: string }) => (e?.name || '').trim().toLowerCase();
    if (elements.some((e) => elId(e) === this.assetsRootParentId)) {
      return true;
    }
    if (elements.some((e) => getName(e) === 'asset management')) {
      return true;
    }
    return getName(node) === 'asset management';
  }

  /**
   * Rail toggles: each button independently shows/hides that panel.
   * Comments UI is commented out in the template â€” `comments` stays false (see toggleDetailPanel guard).
   */
  detailPanels: Record<'preview' | 'properties' | 'comments', boolean> = {
    preview: true,
    properties: true,
    comments: false
  };

  /* Comments section ids kept for uncommenting template + NodeCommentsComponent later */
  private readonly detailSectionIds: Record<'preview' | 'properties' | 'comments', string> = {
    preview: 'adw-project-explorer-section-preview',
    properties: 'adw-project-explorer-section-properties',
    comments: 'adw-project-explorer-section-comments'
  };

  /** Width (px) of the Metadata + Preview column when split view is open. List fills remaining space. */
  sidebarWidth = 980;
  readonly minSidebarWidth = 280;
  readonly maxSidebarWidth = 1200;
  private sidebarResizeStartX = 0;
  private sidebarResizeStartWidth = 0;
  private readonly sidebarResizeMoveListener = (e: MouseEvent) => this.onSidebarResizeMove(e);
  private readonly sidebarResizeUpListener = () => this.endSidebarResize();

  @ViewChild(DocumentListComponent) documentList?: DocumentListComponent;
  csvImporting = false;
  csvImportBlocked = false;
  readonly wmTrigger = viewChild('wmTrigger', { read: MatMenuTrigger });
  readonly wmOrigin = viewChild<ElementRef<HTMLElement>>('wmOrigin');
  readonly actionsMenuTrigger = viewChild<MatMenuTrigger>('actionsMenuTrigger');
  readonly hasWatermarkSubmenu = signal(true);
  readonly watermarkMenuOpen = signal(false);
  readonly watermarkMenuPosition = signal({ left: 0, top: 0, height: 0 });
  readonly pendingWatermarkDownloadNode = signal<Node | null>(null);
  private wmCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly document = inject(DOCUMENT);
  private readonly wmDestroyRef = inject(DestroyRef);
  private readonly uploadService = inject(UploadService);
  private readonly cadComments = inject(CadCommentsMetadataService);
  /** Node passed to the metadata card, refreshed after CAD comments are applied. */
  metadataNode: Node | null = null;
  readonly watermarkMenuItems = [
    { kind: 'text', icon: 'title', label: 'Text watermark' },
    { kind: 'image', icon: 'image', label: 'Image watermark' }
  ] as const;

  /** Reports button visibility based on `/activiti-app/api/enterprise/profile` membership. */
  private reportsAllowed = false;
  /** Create PO button visibility based on `/activiti-app/api/enterprise/profile` membership. */
  private createPoAllowed = false;
  /** Project node `isPoRequired` (from create-project defaults). */
  private projectIsPoRequired = false;
  private projectPoRequiredSyncedForId: string | null = null;
  /** Upload button visibility based on `/activiti-app/api/enterprise/profile` membership. */
  private uploadAllowed = false;
  /** Start Process button visibility based on `/activiti-app/api/enterprise/profile` membership. */
  private startProcessAllowed = false;
  /** Busy state while Shutdown Request validation/search runs. */
  shutdownRequestStarting = false;

  /** True while starting the Handover Package process. */
  handoverStarting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthenticationService,
    private http: HttpClient,
    private nodeActions: NodeActionsService,
    private newVersionUploader: NewVersionUploaderService,
    private nodePermissionDialog: NodePermissionDialogService,
    private contentNodeDialog: ContentNodeDialogService,
    private contentApiService: ContentApiService,
    private notificationService: NotificationService,
    private nodesApiService: NodesApiService,
    private alfrescoApiService: AlfrescoApiService,
    private cardViewContentUpdateService: CardViewContentUpdateService,
    private ngZone: NgZone,
    private adfHttpClient: AdfHttpClient,
    private arenderRedirect: ArenderRedirectService,
    private cadViewerOpen: CadViewerOpenService,
    private watermarkedDownload: WatermarkedDownloadService,
    private alfrescoService: AlfrescoService,
    protected store: Store<any>,
    protected appExtensionService: AppExtensionService
  ) {
    super(store, appExtensionService);
  }

  /** True when profile allows Create PO and the project has `isPoRequired` = true. */
  get showCreatePoButton(): boolean {
    return this.createPoAllowed && this.projectIsPoRequired;
  }

  /** True when profile API contains `PTTEP_DCM` in `name` / `primaryGroup.name` / `groups[].name`. */
  get showReportsButton(): boolean {
    return this.reportsAllowed;
  }

  /** Handover: same gating as Reports (`PTTEP_DCM`). */
  get showHandoverButton(): boolean {
    return this.reportsAllowed;
  }

  /** Header dropdown: Distribution Matrix, Reports, Handover, Force Stop. */
  get showProjectActionsMenu(): boolean {
    return !!this.nodeId;
  }

  /** Upload file button visibility for `EPC_LEAD_PIPE_ENGINEER`. */
  get showUploadButton(): boolean {
    return this.uploadAllowed;
  }

  /** Request for Review: same group as Upload (`EPC_LEAD_PIPE_ENGINEER`), only in `06.Loading`. */
  get showRequestForReviewButton(): boolean {
    return this.uploadAllowed && this.isLoadingFolder();
  }

  /** Toolbar items excluding Start Process â€” we render that button in the template with an icon. */
  get toolbarItemsWithoutStartProcess(): ContentActionRef[] {
    return (this.actions ?? []).filter(
      (a) => a.id !== ProjectExplorerComponent.startProcessToolbarActionId
    );
  }

  /** Same visibility as extension-defined Start Process (show custom pill when extension would show it). */
  get showHeaderStartProcess(): boolean {
    return this.startProcessAllowed && (this.actions ?? []).some((a) => a.id === ProjectExplorerComponent.startProcessToolbarActionId);
  }

  get isProjectDetailsTab(): boolean {
    return this.activeMainTab === 'details';
  }

  setMainTab(tab: 'mdr' | 'details'): void {
    if (tab === 'mdr' && !this.showMdrDashboardTab) {
      this.activeMainTab = 'details';
      return;
    }
    this.activeMainTab = tab;
  }

  triggerCsvImport(fileInput: HTMLInputElement): void {
    if (!this.projectFolderId || this.csvImporting || this.csvImportBlocked) {
      return;
    }
    fileInput.value = '';
    fileInput.click();
  }

  async onCsvFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const projectId = this.projectFolderId?.trim();
    if (!file || !projectId) {
      return;
    }
    const name = file.name.toLowerCase();
    const type = (file.type || '').toLowerCase();
    if (!name.endsWith('.csv') && type !== 'text/csv' && type !== 'application/vnd.ms-excel') {
      this.notificationService.openSnackMessage('Please select a valid CSV file.');
      return;
    }

    this.csvImporting = true;
    this.csvImportBlocked = false;
    const progressRef = this.openImportStatusDialog('importing');
    try {
      await firstValueFrom(this.alfrescoService.uploadDocumentFiles(file, projectId));
      const count = await firstValueFrom(
        race(
          timer(0, 3000).pipe(
            switchMap(() => this.alfrescoService.getComponentRegisterCount(projectId)),
            filter((value) => value > 0),
            take(1)
          ),
          timer(20_000).pipe(map(() => 0))
        )
      );
      progressRef.close();
      this.csvImporting = false;
      if (count > 0) {
        this.csvImportBlocked = false;
        this.openImportStatusDialog('success', file.name);
        return;
      }
      this.csvImportBlocked = true;
      this.openImportStatusDialog('timeout');
    } catch {
      progressRef.close();
      this.csvImporting = false;
      this.csvImportBlocked = false;
      this.openImportStatusDialog('failed');
    }
  }

  private openImportStatusDialog(kind: MdrImportStatusKind, fileName?: string) {
    const data: MdrImportStatusDialogData = { kind, fileName };
    return this.dialog.open(MdrImportStatusDialogComponent, {
      width: 'min(460px, calc(100vw - 32px))',
      maxWidth: '100vw',
      disableClose: kind === 'importing',
      autoFocus: kind === 'importing' ? false : 'dialog',
      panelClass: 'adw-mdr-import-status-dialog-panel',
      data
    });
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.bindDownloadWatermarkMenu();

    const navState = this.router.getCurrentNavigation()?.extras?.state
      ?? (typeof history !== 'undefined' ? history.state : null);
    if (navState?.['explorerContext'] === 'assets') {
      this.explorerContextHint = 'assets';
      this.activeMainTab = 'details';
    }
    void this.syncReportsVisibilityFromProfile();
    this.showPendingToastIfAny();
    this.hideMdrFromBuRoute = localStorage.getItem('bU-route') === 'false';
    this.buListNodeId = this.hideMdrFromBuRoute
      ? (localStorage.getItem('bU-node-id') || this.route.snapshot.paramMap.get('nodeId'))
      : null;
    this.route.paramMap.subscribe((params) => {
      this.nodeId = params.get('nodeId');
      if (history.state?.['explorerTab'] === 'details') {
        this.activeMainTab = 'details';
      }
      this.syncMdrTabForBusinessUnitRoute(this.nodeId);
      void this.syncProjectIsPoRequired();
    });
    // When Properties tab saves (tick), refresh whole window. adf-content-metadata-card has no
    // (updated) / (metadataChange) output, so we use these service subscriptions instead.
    this.nodeUpdatedSub = this.nodesApiService.nodeUpdated.subscribe(() => {
      setTimeout(() => window.location.reload(), 300);
    });
    this.metadataSavedSub = this.cardViewContentUpdateService.updatedAspect$.subscribe(() => {
      setTimeout(() => window.location.reload(), 300);
    });
    this.cadComments.applied$.pipe(takeUntilDestroyed(this.wmDestroyRef)).subscribe((node) => {
      this.metadataNode = { ...node, properties: { ...(node.properties ?? {}) } };
    });
    this.uploadService.fileUploadComplete.pipe(takeUntilDestroyed(this.wmDestroyRef)).subscribe(() => {
      this.documentList?.reload();
    });
  }

  /** Hide MDR only while still on the BU folder opened from the Business Unit menu. */
  private syncMdrTabForBusinessUnitRoute(currentNodeId: string | null): void {
    if (localStorage.getItem('bU-route') !== 'false') {
      this.hideMdrFromBuRoute = false;
      this.buListNodeId = null;
      return;
    }
    const currentId = (currentNodeId || '').trim();
    const buId = (this.buListNodeId || localStorage.getItem('bU-node-id') || '').trim();
    this.buListNodeId = buId || currentId || null;
    const stillOnBuFolder = !!this.buListNodeId && (!currentId || currentId === this.buListNodeId);
    if (stillOnBuFolder) {
      this.hideMdrFromBuRoute = true;
      this.activeMainTab = 'details';
      return;
    }
    this.hideMdrFromBuRoute = false;
    this.buListNodeId = null;
    localStorage.setItem('bU-route', 'true');
    localStorage.removeItem('bU-node-id');
  }

  ngAfterViewInit(): void {
    if (this.documentList?.$folderNode) {
      this.folderNodeSub = this.documentList.$folderNode.subscribe((node) => {
        this.folderNode = node ?? null;

        // Keep the route `nodeId` in sync when user navigates via breadcrumb
        const newId = node?.id;
        if (newId && newId === this.rootParentId) {
          void this.goToProjectPortfolio();
          return;
        }
        if (newId && newId === this.assetsRootParentId) {
          void this.goToAssetHierarchy();
          return;
        }
        if (this.isUnderAssetManagementPath(node)) {
          this.explorerContextHint = 'assets';
          this.activeMainTab = 'details';
          this.persistAssetsHierarchySelection(node);
        } else if (node?.path?.elements?.length) {
          this.explorerContextHint = null;
        }
        this.syncMdrTabForBusinessUnitRoute(newId ?? this.nodeId);
        if (!this.showMdrDashboardTab) {
          this.activeMainTab = 'details';
        }
        if (newId && newId !== this.nodeId) {
          this.nodeId = newId;
          void this.navigateToExplorerNode(newId, { replaceUrl: true });
        }
        void this.syncProjectIsPoRequired();
      });
    }
  }

  ngOnDestroy(): void {
    this.endSidebarResize();
    super.ngOnDestroy();
    this.folderNodeSub?.unsubscribe();
    this.nodeUpdatedSub?.unsubscribe();
    this.metadataSavedSub?.unsubscribe();
  }

  startSidebarResize(event: MouseEvent): void {
    event.preventDefault();
    this.sidebarResizeStartX = event.clientX;
    this.sidebarResizeStartWidth = this.sidebarWidth;
    document.addEventListener('mousemove', this.sidebarResizeMoveListener);
    document.addEventListener('mouseup', this.sidebarResizeUpListener);
    (document.body as HTMLElement).style.cursor = 'col-resize';
    (document.body as HTMLElement).style.userSelect = 'none';
  }

  private onSidebarResizeMove(event: MouseEvent): void {
    const delta = event.clientX - this.sidebarResizeStartX;
    /* Drag right â†’ splitter moves right â†’ list grows, detail (sidebar) shrinks */
    this.ngZone.run(() => {
      this.sidebarWidth = Math.max(
        this.minSidebarWidth,
        Math.min(this.maxSidebarWidth, this.sidebarResizeStartWidth - delta)
      );
    });
  }
  private endSidebarResize(): void {
    document.removeEventListener('mousemove', this.sidebarResizeMoveListener);
    document.removeEventListener('mouseup', this.sidebarResizeUpListener);
    (document.body as HTMLElement).style.cursor = '';
    (document.body as HTMLElement).style.userSelect = '';
  }

  /** New node selection: show panels again (comments panel disabled in template). Folders have no preview. */
  onDocumentNodeSelected(entries: NodeEntry[]): void {
    const entry = entries?.[0]?.entry;
    this.detailPanels = {
      preview: !!entry && !this.isFolderSelection(entry),
      properties: true,
      comments: false
    };
    const node = this.selectedNode;
    this.cadComments.watch(node);
    this.metadataNode = node;
  }

  /** Preview rail is for files only. Folders and folder shortcuts have nothing to preview. */
  get showPreviewButton(): boolean {
    const node = this.selectedNode;
    return !!node && !this.isFolderSelection(node);
  }

  private isFolderSelection(node: { isFolder?: boolean; nodeType?: string } | null | undefined): boolean {
    return (node as { isFolder?: boolean })?.isFolder === true || this.isFolderLink(node);
  }

  /** Whether a panel is visible (rail toggle on). */
  isDetailSectionVisible(part: 'preview' | 'properties' | 'comments'): boolean {
    if (part === 'preview' && !this.showPreviewButton) {
      return false;
    }
    return this.detailPanels[part];
  }

  /** Meta column (stack) is shown when Properties and/or Comments blocks are visible. */
  isDetailMetaColumnVisible(): boolean {
    return this.detailPanels.properties || this.detailPanels.comments;
  }

  /** Rail button pressed when that panel is shown. */
  isDetailRailActive(tab: 'preview' | 'properties' | 'comments'): boolean {
    return this.detailPanels[tab];
  }

  /** True when Preview and Properties are both on (comments rail disabled in template). */
  isAllDetailPanelsVisible(): boolean {
    return this.isDetailSectionVisible('preview') && this.detailPanels.properties;
  }

  /**
   * Toggle a panel on/off. Any subset (1â€“3) is allowed; the last remaining panel cannot be turned off.
   */
  toggleDetailPanel(tab: 'preview' | 'properties' | 'comments'): void {
    if (tab === 'comments' || (tab === 'preview' && !this.showPreviewButton)) {
      return;
    }
    const countOn =
      (this.detailPanels.preview ? 1 : 0) +
      (this.detailPanels.properties ? 1 : 0) +
      (this.detailPanels.comments ? 1 : 0);

    if (this.detailPanels[tab] && countOn <= 1) {
      return;
    }

    const nextOn = !this.detailPanels[tab];
    this.detailPanels = { ...this.detailPanels, [tab]: nextOn };

    if (nextOn) {
      const id = this.detailSectionIds[tab];
      const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  get currentFolderId(): string {
    return this.nodeId || this.rootParentId;
  }

  private navigateToExplorerNode(folderId: string, extras?: { replaceUrl?: boolean }): Promise<boolean> {
    const base = this.router.url.startsWith('/document-management') ? '/document-management' : '/projects';
    return this.router.navigate([base, folderId], extras);
  }

  /**
   * Resolves project folder context from the current folder path.
   * Supports:
   * - `Project Management / <business-unit> / <project> / …`
   * - legacy `Projects / <project> / …`
   * Works at project root and inside nested subfolders.
   */
  private resolveProjectFolderContext(): { id: string; name: string } {
    const fallbackId = this.currentFolderId;
    const fallbackName = (this.folderNode?.name ?? '').trim();
    const elements = this.folderNode?.path?.elements ?? [];
    const elId = (e: { id?: string; nodeId?: string }) => e?.id ?? e?.nodeId;
    const getNameLower = (e: { name?: string }) => (e?.name || '').trim().toLowerCase();
    const getName = (e: { name?: string }) => (e?.name || '').trim();
    const isEngineeringProject = (node: { nodeType?: string } | null | undefined): boolean =>
      String(node?.nodeType || '').includes('edms:engineeringProject');

    // Prefer the current folder when it is the engineering project itself.
    if (this.folderNode && isEngineeringProject(this.folderNode)) {
      return {
        id: (this.folderNode.id as string) ?? fallbackId,
        name: fallbackName
      };
    }

    if (!elements.length) {
      return { id: fallbackId, name: fallbackName };
    }

    let projectsIndex = elements.findIndex((e) => elId(e) === this.rootParentId);
    if (projectsIndex < 0 && this.businessUnitsRootParentId) {
      projectsIndex = elements.findIndex((e) => elId(e) === this.businessUnitsRootParentId);
    }
    if (projectsIndex < 0) {
      projectsIndex = elements.findIndex((e) => {
        const name = getNameLower(e);
        return name === 'projects' || name === 'project management';
      });
    }
    if (projectsIndex < 0) {
      projectsIndex = elements.findIndex((e) => getNameLower(e).includes('project'));
    }
    if (projectsIndex < 0) {
      return { id: fallbackId, name: fallbackName };
    }

    const rootEl = elements[projectsIndex];
    const rootName = getNameLower(rootEl);
    const isBuHierarchy =
      elId(rootEl) === this.businessUnitsRootParentId ||
      elId(rootEl) === this.rootParentId ||
      rootName === 'project management';
    const afterRoot = elements.slice(projectsIndex + 1);

    // BU hierarchy nested: …/<BU>/<project>/…
    if (afterRoot.length >= 2) {
      const projectFromPath = afterRoot[1];
      return {
        id: (elId(projectFromPath) as string) ?? fallbackId,
        name: getName(projectFromPath)
      };
    }

    // At project root under BU: path ends at …/<BU>, current folder is the project.
    if (afterRoot.length === 1 && isBuHierarchy) {
      return {
        id: (this.folderNode?.id as string) ?? fallbackId,
        name: fallbackName
      };
    }

    // Legacy nested: …/Projects/<project>/…
    if (afterRoot.length === 1) {
      const projectFromPath = afterRoot[0];
      return {
        id: (elId(projectFromPath) as string) ?? fallbackId,
        name: getName(projectFromPath)
      };
    }

    // Project root case: current folder itself is `<project>` and parent path ends at Projects.
    return {
      id: (this.folderNode?.id as string) ?? fallbackId,
      name: fallbackName
    };
  }
  /**
   * Alfresco node id of the project folder (the segment after `Projects` in the path),
   * e.g. `PTTEP PROJECT GURUJI 034` â€” not the current browsed subfolder id in the URL.
   */
  get projectFolderId(): string {
    return this.resolveProjectFolderContext().id;
  }

  /** Human-readable project folder name (segment after Projects), e.g. `PTTEP-BHARATH-053`. */
  get projectFolderName(): string {
    return this.resolveProjectFolderContext().name;
  }

  /** Replace "Company Home" with "Home" in path elements. */
  private mapCompanyHomeToHome(elements: any[]): any[] {
    return elements.map((e: any) =>
      (e?.name || '').trim() === 'Company Home' ? { ...e, name: 'Home' } : e
    );
  }

  /** Breadcrumb: start at Projects or Asset Management (hide Home/Sites/site/documentLibrary). */
  breadcrumbStartFromProjectName = (node: Node | null): Node | null => {
    if (!node?.path?.elements?.length) return node;
    const elements = node.path.elements;
    const elId = (e: any) => e?.id ?? e?.nodeId;
    const getName = (e: any) => (e?.name || '').trim().toLowerCase();

    let assetIdx = elements.findIndex((e) => elId(e) === this.assetsRootParentId);
    if (assetIdx < 0) {
      assetIdx = elements.findIndex((e) => getName(e) === 'asset management');
    }
    if (assetIdx >= 0) {
      const visible = elements.slice(assetIdx);
      const withHomeLabel = this.mapCompanyHomeToHome(visible);
      return { ...node, path: { ...node.path, elements: withHomeLabel } } as Node;
    }

    let idx = elements.findIndex((e) => elId(e) === this.rootParentId);
    if (idx < 0) idx = elements.findIndex((e) => getName(e) === 'projects');
    if (idx < 0) idx = elements.findIndex((e) => getName(e).includes('project'));

    const visible = idx >= 0 ? elements.slice(idx) : elements;
    const withHomeLabel = this.mapCompanyHomeToHome(visible);
    return { ...node, path: { ...node.path, elements: withHomeLabel } } as Node;
  };

  /** Clicking "Projects" / "Asset Management" in the breadcrumb returns to the list pages. */
  onBreadcrumbNavigate(route: { id?: string; name?: string } | null): void {
    if (!route) {
      return;
    }
    const id = route.id?.trim() ?? '';
    const name = (route.name || '').trim().toLowerCase();
    if (id === this.assetsRootParentId || name === 'asset management') {
      void this.goToAssetHierarchy();
      return;
    }
    if (id === this.rootParentId || name === 'projects' || name === 'project management') {
      void this.goToProjectPortfolio();
    }
  }

  private goToProjectPortfolio(): void {
    void this.router.navigate(['/listOf-Projects']);
  }

  private goToAssetHierarchy(): void {
    const selection =
      this.resolveAssetsHierarchySelection(this.folderNode) ?? readAssetsHierarchySelection();
    if (selection) {
      writeAssetsHierarchySelection(selection);
    }
    void this.router.navigate(['/assets-dashboard'], {
      state: { assetsHierarchySelection: selection ?? undefined }
    });
  }

  /** Region â†’ Field â†’ Facility ids from the current Asset Management folder path. */
  private resolveAssetsHierarchySelection(node: Node | null | undefined): AssetsHierarchySelection | null {
    if (!node) {
      return null;
    }
    const elId = (e: { id?: string; nodeId?: string } | null | undefined) => e?.id ?? e?.nodeId ?? '';
    const getName = (e: { name?: string } | null | undefined) => (e?.name || '').trim().toLowerCase();
    const elements = node.path?.elements ?? [];

    let assetIdx = elements.findIndex((e) => elId(e) === this.assetsRootParentId);
    if (assetIdx < 0) {
      assetIdx = elements.findIndex((e) => getName(e) === 'asset management');
    }

    if (assetIdx < 0) {
      if (node.id === this.assetsRootParentId || getName(node) === 'asset management') {
        return null;
      }
      return null;
    }

    // Ancestors after Asset Management, then the current folder (if not the root itself).
    const afterRoot = elements.slice(assetIdx + 1).map((e) => elId(e)).filter(Boolean);
    if (node.id && node.id !== this.assetsRootParentId) {
      afterRoot.push(node.id);
    }

    if (!afterRoot.length) {
      return null;
    }

    return {
      regionId: afterRoot[0],
      blockId: afterRoot[1],
      facilityId: afterRoot[2],
      nodeId: afterRoot[Math.min(afterRoot.length, 3) - 1]
    };
  }

  private persistAssetsHierarchySelection(node: Node | null | undefined): void {
    const selection = this.resolveAssetsHierarchySelection(node);
    if (selection) {
      writeAssetsHierarchySelection(selection);
    }
  }


  /**
   * Validates VDR document counts for the current project, then opens Shutdown Request dialog
   * when every document is approved for IFC.
   */
  async openShutdownRequest(): Promise<void> {
    if (!this.nodeId) {
      return;
    }
    const projectName = this.projectFolderName?.trim();
    if (!projectName) {
      this.notificationService.openSnackMessage('Project name is not available.');
      return;
    }

    this.shutdownRequestStarting = true;
    try {
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          ProjectExplorerComponent.searchApiUrl,
          new HttpHeaders({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );

      const totalVdrCount = await this.countProjectVdrDocuments(projectName, false, headers);
      if (totalVdrCount === 0) {
        this.notificationService.openSnackMessage(
          'No VDR Documents are registered. Contact the Procurement Team to create VDR Line Items.'
        );
        return;
      }

      const ifcApprovedCount = await this.countProjectVdrDocuments(projectName, true, headers);
      if (totalVdrCount !== ifcApprovedCount) {
        this.notificationService.openSnackMessage('Some VDR Documents are not yet approved for IFC.');
        return;
      }

      const projectId = this.projectFolderId?.trim();
      if (!projectId) {
        this.notificationService.openSnackMessage('Project id is not available.');
        return;
      }

      const data: ShutdownRequestDialogData = { projectId, projectName };
      this.dialog.open(ShutdownRequestDialogComponent, {
        width: 'min(560px, calc(100vw - 32px))',
        maxHeight: '92vh',
        data,
        autoFocus: 'first-tabbable',
        panelClass: 'adw-shutdown-request-dialog-panel'
      });
    } catch {
      this.notificationService.openSnackMessage('Unable to validate VDR documents for shutdown request.');
    } finally {
      this.shutdownRequestStarting = false;
    }
  }

  openJobRequisitionRequest(): void {
    const programId = this.projectFolderId?.trim();
    const programname = this.projectFolderName?.trim();
    if (!programId || !programname) {
      this.notificationService.openSnackMessage(`${!programId ? 'Project id' : 'Program name'} is not available.`);
      return;
    }
    this.dialog.open(HrJrRequestDialogComponent, {
      width: 'min(560px, calc(100vw - 32px))',
      maxHeight: '92vh',
      autoFocus: 'first-tabbable',
      data: { programId, programname }
    });
  }

  /**
   * Split project name on spaces â€” each token becomes `edms:vdr_project:'â€¦'` joined with AND.
   * e.g. `PTTEP-MALAYSIA SK410B PROJECT-101` â†’ `edms:vdr_project:'PTTEP-MALAYSIA' AND edms:vdr_project:'SK410B' AND â€¦`
   */
  private buildVdrProjectSearchClause(projectName: string): string {
    const tokens = projectName
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .map((token) => token.replace(/'/g, "\\'"));

    if (tokens.length === 0) {
      return '';
    }

    return tokens.map((token) => `edms:vdr_project:'${token}'`).join(' AND ');
  }

  /** Search API 1 (all VDR docs) or 2 (IFC-approved only) â€” returns `list.pagination.count`. */
  private async countProjectVdrDocuments(
    projectName: string,
    ifcApprovedOnly: boolean,
    headers: HttpHeaders
  ): Promise<number> {
    const projectClause = this.buildVdrProjectSearchClause(projectName);
    if (!projectClause) {
      return 0;
    }
    const ifcClause = ifcApprovedOnly ? ' AND edms:issuedForConstruction:true' : '';
    const query = `(TYPE:'edms:vdrDocument' AND ${projectClause}${ifcClause})`;
    const body = {
      query: {
        query,
        language: 'afts'
      },
      include: ['properties'],
      paging: {
        maxItems: 1,
        skipCount: 0
      }
    };

    const result = (await firstValueFrom(
      this.http.post(ProjectExplorerComponent.searchApiUrl, body, { headers })
    )) as {
      list?: {
        pagination?: { count?: number; totalItems?: number };
        entries?: Array<unknown>;
      };
    };

    const count = result?.list?.pagination?.count;
    if (typeof count === 'number' && count >= 0) {
      return count;
    }
    const totalItems = result?.list?.pagination?.totalItems;
    if (typeof totalItems === 'number' && totalItems >= 0) {
      return totalItems;
    }
    return Array.isArray(result?.list?.entries) ? result.list.entries.length : 0;
  }

  openDistributionMatrix(): void {
    if (!this.nodeId) {
      return;
    }

    const projectId = this.projectFolderId?.trim();
    if (!projectId) {
      return;
    }

    const dialogRef = this.dialog.open(DistributionMatrixComponent, {
      width: '960px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: '90vh'
    });

    dialogRef.afterOpened().subscribe(() => {
      dialogRef.componentInstance?.initForProject(projectId);
    });
  }

  /**
   * Starts EDMS Final Handover Package process. `projectId` = Alfresco project folder id
   * (`projectFolderId`); all other body fields are fixed.
   * After start, reads `validationPassed` / `validationError` process variables for UI feedback.
   */
  async startHandoverPackageProcess(): Promise<void> {
    if (!this.nodeId || !this.reportsAllowed) {
      return;
    }
    const projectId = this.projectFolderId?.trim();
    if (!projectId) {
      this.notificationService.openSnackMessage('Project id is not available.');
      return;
    }
    const projectName = this.projectFolderName?.trim();
    if (!projectName) {
      this.notificationService.openSnackMessage('Project name is not available.');
      return;
    }
    this.handoverStarting = true;
    const url = environment.processInstancesUrl;
    const key = environment.handoverProcessDefinitionKey;
    const payload = {
      processDefinitionKey: key,
      name: ProjectExplorerComponent.handoverProcessDisplayName,
      businessKey: key,
      variables: [{ name: 'projectId', value: projectId }]
    };
    try {
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          url,
          new HttpHeaders({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      const response = await firstValueFrom(this.http.post<unknown>(url, payload, { headers }));
      const validation = await this.resolveHandoverValidationResult(response, headers);
      if (validation.passed === false) {
        this.notificationService.showError(
          validation.errorMessage ||
            `MDR, Engineering Document, and Vendor Document validation have not been completed for project '${projectName}'. Please ensure all outstanding items are approved before proceeding with handover.`
        );
        return;
      }
      this.notificationService.openSnackMessage(
        'The handover package is ready. A sign document request has been sent to your email â€” please review and sign it.'
      );
    } catch (err: unknown) {
      const msg = ProjectExplorerComponent.activitiApiErrorMessage(err) || 'Failed to start handover process.';
      this.notificationService.showError(msg);
    } finally {
      this.handoverStarting = false;
    }
  }

  /**
   * Reads Activiti process variables `validationPassed` / `validationError` from the start
   * response, falling back to GET `/process-instances/{id}` when needed.
   */
  private async resolveHandoverValidationResult(
    startResponse: unknown,
    headers: HttpHeaders
  ): Promise<{ passed: boolean | null; errorMessage: string }> {
    const fromStart = this.readHandoverValidationVariables(startResponse);
    if (fromStart.passed !== null) {
      return fromStart;
    }

    const processInstanceId = this.readProcessInstanceId(startResponse);
    if (!processInstanceId) {
      return fromStart;
    }

    try {
      const detailUrl = `${environment.processInstancesUrl}/${encodeURIComponent(processInstanceId)}`;
      const detail = await firstValueFrom(this.http.get<unknown>(detailUrl, { headers }));
      const fromDetail = this.readHandoverValidationVariables(detail);
      if (fromDetail.passed !== null) {
        return fromDetail;
      }
    } catch {
      // ignore â€” fall through
    }

    try {
      const varsUrl = `${environment.processInstancesUrl}/${encodeURIComponent(processInstanceId)}/variables`;
      const vars = await firstValueFrom(this.http.get<unknown>(varsUrl, { headers }));
      return this.readHandoverValidationVariables({ variables: vars });
    } catch {
      return fromStart;
    }
  }

  private readProcessInstanceId(source: unknown): string {
    if (!source || typeof source !== 'object') {
      return '';
    }
    const record = source as Record<string, unknown>;
    const id = record['id'] ?? record['processInstanceId'];
    return id != null ? String(id).trim() : '';
  }

  private readHandoverValidationVariables(source: unknown): { passed: boolean | null; errorMessage: string } {
    const variables = this.extractActivitiVariables(source);
    let passed: boolean | null = null;
    let errorMessage = '';

    for (const variable of variables) {
      const name = String(variable['name'] ?? '').trim();
      if (name === 'validationPassed') {
        passed = this.toBooleanFlag(variable['value']);
      } else if (name === 'validationError') {
        const value = variable['value'];
        errorMessage = value != null ? String(value).trim() : '';
      }
    }

    return { passed, errorMessage };
  }

  private extractActivitiVariables(source: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(source)) {
      return source.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
    if (!source || typeof source !== 'object') {
      return [];
    }
    const record = source as Record<string, unknown>;
    const candidates = [record['variables'], record['data'], record['entries']];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .map((item) => {
            if (item && typeof item === 'object' && 'entry' in (item as object)) {
              const entry = (item as { entry?: unknown }).entry;
              return entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
            }
            return item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
          })
          .filter((item): item is Record<string, unknown> => !!item);
      }
    }
    return [];
  }

  private toBooleanFlag(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
      }
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
    }
    return null;
  }

  /** Force Stop: validate shutdown status, then open Force Reopen form when project is SHUTDOWN. */
  async openForceStop(): Promise<void> {
    if (!this.nodeId) {
      return;
    }
    const projectId = this.projectFolderId?.trim();
    const projectName = this.projectFolderName?.trim();
    if (!projectId) {
      this.notificationService.openSnackMessage('Project id is not available.');
      return;
    }

    try {
      const url = `${ACS_NODES_API_BASE_URL}/${projectId}`;
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          url,
          new HttpHeaders({
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      const response = (await firstValueFrom(this.http.get<{ entry?: { properties?: Record<string, unknown> } }>(url, { headers })))
        ?.entry;
      const shutdownStatus = String(response?.properties?.['edms:shutdown_status'] ?? '')
        .trim()
        .toUpperCase();

      if (shutdownStatus !== 'SHUTDOWN') {
        this.notificationService.openSnackMessage('Project is not in Shutdown state.');
        return;
      }

      const data: ForceReopenDialogData = {
        projectId,
        projectName: projectName || ''
      };
      this.dialog.open(ForceReopenDialogComponent, {
        width: 'min(560px, calc(100vw - 32px))',
        maxHeight: '92vh',
        data,
        autoFocus: 'first-tabbable',
        panelClass: 'adw-force-reopen-dialog-panel'
      });
    } catch {
      this.notificationService.openSnackMessage('Unable to verify project shutdown status.');
    }
  }

  /** Opens Reports dialog with report-type dropdown (Handover Gap / Compile Handover). */
  openReports(): void {
    if (!this.nodeId) {
      return;
    }
    const data: ReportsDialogData = { projectId: this.projectFolderId };
    this.dialog
      .open<ReportsDialogComponent, ReportsDialogData, ReportsDialogResult | undefined>(ReportsDialogComponent, {
        width: 'min(440px, calc(100vw - 32px))',
        data,
        autoFocus: 'first-tabbable'
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.reportType) {
          void this.navigateToReportFolder(this.projectFolderId, result.reportType);
        }
      });
  }

  /**
   * Resolves selected report folder under `07.Reports` and navigates the explorer to that node.
   */
  private async navigateToReportFolder(projectFolderId: string, reportType: ReportsDialogResult['reportType']): Promise<void> {
    const reportFolderId = await this.resolveReportFolderNodeId(projectFolderId, reportType);
    this.ngZone.run(() => {
      if (reportFolderId) {
        void this.navigateToExplorerNode(reportFolderId);
      } else {
        this.notificationService.openSnackMessage(
          'Could not open the selected report folder. Check that it exists under "07.Reports".'
        );
      }
    });
  }

  private async resolveReportFolderNodeId(
    projectFolderId: string,
    reportType: ReportsDialogResult['reportType']
  ): Promise<string | null> {
    const reportFolderName = ProjectExplorerComponent.reportFolderByType[reportType];
    if (!reportFolderName) {
      return null;
    }
    const relativePath = `${ProjectExplorerComponent.reportsBaseRelativePath}/${reportFolderName}`;
    const base = `/alfresco/api/-default-/public/alfresco/versions/1/nodes/${projectFolderId}`;
    const url = `${base}?relativePath=${encodeAlfrescoRelativePathParam(relativePath)}&include=properties`;
    try {
      const response = (await this.adfHttpClient.request(url, {
        httpMethod: 'GET',
        accepts: ['application/json'],
        contentTypes: ['application/json']
      })) as { entry?: { id?: string } };
      return response?.entry?.id ?? null;
    } catch {
      return null;
    }
  }

  /** True when the browsed folder is Incoming Transmittal under Distribution. */
  private isIncomingTransmittalFolder(): boolean {
    const name = (this.folderNode?.name ?? '').trim().toLowerCase();
    if (name !== 'incoming transmittal') {
      return false;
    }
    const elements = this.folderNode?.path?.elements ?? [];
    return elements.some((element) => {
      const segment = (element?.name ?? '').trim().toLowerCase();
      return segment === '05.distribution' || segment.includes('distribution');
    });
  }

  /** True when the browsed folder is the project Loading folder (`06.Loading`). */
  private isLoadingFolder(): boolean {
    return (this.folderNode?.name ?? '').trim() === '06.Loading';
  }

  /** Opens file-selection dialog to submit documents for bulk review workflow. */
  openRequestForReviewDialog(): void {
    if (!this.showRequestForReviewButton || !this.nodeId) {
      return;
    }
    const projectId = this.projectFolderId?.trim();
    if (!projectId) {
      this.notificationService.openSnackMessage('Project id is not available.');
      return;
    }
    const data: RequestForReviewDialogData = {
      projectId,
      projectName: this.projectFolderName?.trim() || undefined,
      folderId: this.currentFolderId,
      folderName: (this.folderNode?.name ?? '').trim() || undefined
    };
    this.dialog.open(RequestForReviewDialogComponent, {
      width: 'min(520px, calc(100vw - 32px))',
      maxHeight: '92vh',
      data,
      autoFocus: 'first-tabbable',
      panelClass: 'adw-request-for-review-dialog-panel'
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.notificationService.openSnackMessage('Documents have been submitted for the review process.');
        setTimeout(() => window.location.reload(), 300);
      }
    });
  }

  openCreatePoDialog(): void {
    if (!this.showCreatePoButton) {
      return;
    }
    if (!this.nodeId) {
      this.notificationService.openSnackMessage('Open a project folder first.');
      return;
    }
    /* APS `projectid` = project folder node (under Projects), not the current browsed folder in the URL */
    const data: CreatePoDialogData = { projectId: this.projectFolderId };
    this.dialog.open(CreatePoDialogComponent, {
      width: 'min(920px, calc(100vw - 32px))',
      maxWidth: '100vw',
      /* Laptop: fixed dialog frame; mobile override remains in global styles */
      height: 'min(90dvh, 900px)',
      maxHeight: 'min(90dvh, 900px)',
      panelClass: 'adw-create-po-dialog-panel',
      autoFocus: true,
      data
    });
  }

  get selectedNode(): Node | null {
    const selection: any[] | undefined = this.documentList?.selection as any;
    if (!selection || !selection.length) {
      return null;
    }
    const first = selection[0];
    const entry: Node | undefined = first?.entry ?? first?.node?.entry ?? first?.value?.entry ?? first;
    return entry ?? null;
  }

  /** Preview the linked file when the selection is an Alfresco shortcut (app:filelink). */
  get previewNode(): Node | null {
    const node = this.selectedNode;
    if (!node) {
      return null;
    }
    if (this.isFolderLink(node)) {
      return node;
    }
    const destId = this.getLinkDestinationId(node);
    if (!destId) {
      return node;
    }
    return { ...node, id: destId };
  }

  /**
   * Metadata pencil icons: when the file is locked, only the lock owner can edit.
   * Unlocked nodes stay editable (same as before).
   */
  get isSelectedNodeMetadataEditable(): boolean {
    const node = this.selectedNode;
    if (!node) {
      return false;
    }
    if ((node as any).isFolder === true || !isLocked({ entry: node })) {
      return true;
    }
    const lockOwner = (node as any).properties?.['cm:lockOwner'];
    const ownerId =
      typeof lockOwner === 'string'
        ? lockOwner.trim()
        : typeof lockOwner?.id === 'string'
          ? lockOwner.id.trim()
          : '';
    if (!ownerId) {
      return false;
    }
    const current = this.authService.getUsername()?.trim() ?? '';
    return !!current && current.toLowerCase() === ownerId.toLowerCase();
  }

  /** MOC Request rail action: visible only for documents flagged as MOC in metadata. */
  get showMocRequestButton(): boolean {
    const node = this.selectedNode;
    if (!node?.id || (node as any).isFolder === true) {
      return false;
    }
    return ProjectExplorerComponent.isTruthyNodeProperty((node as any).properties?.['edms:isMocDocument']);
  }

  openMocRequestDialog(): void {
    const node = this.selectedNode;
    if (!node?.id || !this.showMocRequestButton) {
      return;
    }
    const requestedBy = this.authService.getUsername()?.trim() ?? '';
    this.dialog.open(MocRequestDialogComponent, {
      width: 'min(520px, calc(100vw - 32px))',
      maxWidth: '100vw',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      data: {
        nodeId: node.id,
        requestedBy,
        requestedDate: formatDate(new Date(), 'dd-MM-yyyy', 'en-GB')
      } satisfies MocRequestDialogData
    });
  }

  /** Overflow menu: request a document number change for the selected file. */
  documentNumberChangeRequest(payload: any): void {
    const entry = this.getEntryFromPayload(payload);
    if (!entry?.id || (entry as any).isFolder === true) {
      return;
    }
    const props = ((entry as any).properties ?? {}) as Record<string, unknown>;
    const readProp = (...keys: string[]): string => {
      for (const key of keys) {
        const value = props[key];
        if (value != null && String(value).trim()) {
          return String(value).trim();
        }
      }
      return '';
    };
    const documentNumber = readProp(
      'edms:document_number',
      'edms:linkedDocumentNumber',
      'edms:documentNumber',
      'document_number'
    );
    const documentName =
      readProp('cm:title', 'title') || String((entry as any).name ?? '').trim();
    this.dialog.open(DocNumberChangeRequestDialogComponent, {
      width: 'min(720px, calc(100vw - 32px))',
      maxWidth: '100vw',
      maxHeight: '92vh',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'adw-doc-number-change-request-dialog-panel',
      data: {
        nodeId: entry.id,
        documentNumber,
        documentName,
        projectName: this.projectFolderName?.trim() || '',
        region: readProp('edms:document_region', 'document_region', 'region'),
        fieldAsset: readProp('edms:asset_code', 'edms:assetCode', 'edms:asset', 'asset_code', 'asset'),
        facility: readProp(
          'edms:document_facility',
          'edms:facility',
          'document_facility',
          'facility'
        )
      } satisfies DocNumberChangeRequestDialogData
    });
  }

  /** Extract node entry from content-action execute payload (document list may pass different shapes). */
  private getEntryFromPayload(payload: any): Node | undefined {
    return (
      payload?.entry ??
      payload?.value?.entry ??
      payload?.detail?.value?.entry ??
      payload?.node?.entry ??
      payload?.row?.obj?.entry ??
      payload?.obj?.entry
    );
  }

  private actionsMenuAnchor(): HTMLElement | null {
    return this.document.querySelector<HTMLElement>(
      '[id^="action_menu_right_"][aria-expanded="true"], [id^="action_menu_left_"][aria-expanded="true"]'
    );
  }

  private nodeFromOpenActionsMenu(): Node | null {
    const trigger = this.actionsMenuAnchor();
    return trigger ? this.nodeFromMenuAnchor(trigger) : null;
  }

  private nodeFromMenuAnchor(anchor: HTMLElement): Node | null {
    const trigger =
      anchor.closest<HTMLElement>('[id^="action_menu_right_"], [id^="action_menu_left_"]') ??
      (anchor.id?.startsWith('action_menu_') ? anchor : null);
    if (trigger?.id) {
      const fromId = /action_menu_(?:right|left)_(\d+)/.exec(trigger.id);
      if (fromId) {
        const fromIndex = this.nodeFromRowIndex(Number(fromId[1]));
        if (fromIndex) {
          return fromIndex;
        }
      }
    }

    const autoId = anchor.getAttribute('data-automation-id') ?? '';
    const fromAuto = /action_menu_(\d+)/.exec(autoId);
    if (fromAuto) {
      const fromIndex = this.nodeFromRowIndex(Number(fromAuto[1]));
      if (fromIndex) {
        return fromIndex;
      }
    }

    const row = anchor.closest<HTMLElement>('.adf-datatable-row, adf-datatable-row');
    if (row?.parentElement) {
      const rows = Array.from(row.parentElement.querySelectorAll(':scope > .adf-datatable-row, :scope > adf-datatable-row'));
      const idx = rows.indexOf(row);
      if (idx >= 0) {
        const fromIndex = this.nodeFromRowIndex(idx);
        if (fromIndex) {
          return fromIndex;
        }
      }
    }

    return this.asFileNode(this.selectedNode);
  }

  private nodeFromRowIndex(index: number): Node | null {
    if (!Number.isFinite(index) || index < 0) {
      return null;
    }
    const rows = (this.documentList?.data as { getRows?: () => unknown[] } | undefined)?.getRows?.() ?? [];
    return this.asFileNode(rows[index]);
  }

  private asFileNode(raw: unknown): Node | null {
    const entry = this.getEntryFromPayload(raw) ?? (raw as Node | undefined);
    if (!entry?.id || (entry as { isFolder?: boolean }).isFolder === true) {
      return null;
    }
    return entry as Node;
  }

  private isAlfrescoLink(entry: Node | any): boolean {
    if (!entry) {
      return false;
    }
    const nodeType = String(entry.nodeType ?? '');
    return (
      entry.isLink === true ||
      nodeType === 'app:filelink' ||
      nodeType === 'app:folderlink' ||
      nodeType === 'cm:link'
    );
  }

  private isFolderLink(entry: Node | any): boolean {
    return String(entry?.nodeType ?? '') === 'app:folderlink';
  }

  /** UUID of the original file/folder a shortcut points at (`cm:destination`). */
  private getLinkDestinationId(entry: Node | any): string | null {
    if (!this.isAlfrescoLink(entry)) {
      return null;
    }
    const dest =
      entry?.properties?.['cm:destination'] ??
      entry?.properties?.['cm:destination-ref'] ??
      entry?.properties?.cm_destination;
    if (dest == null || dest === '') {
      return null;
    }
    if (typeof dest === 'object') {
      const id = dest.id ?? dest.nodeId ?? dest.guid;
      return id ? String(id).trim() : null;
    }
    const raw = String(dest).trim();
    const slash = raw.lastIndexOf('/');
    return slash >= 0 ? raw.slice(slash + 1) : raw;
  }

  private openLinkedNode(entry: Node | any): void {
    const destId = this.getLinkDestinationId(entry);
    if (destId) {
      this.navigateToLinkTarget(entry, destId);
      return;
    }
    if (!entry?.id) {
      this.notificationService.openSnackMessage('Unable to open this link. The destination is missing.');
      return;
    }
    this.nodesApiService.getNode(entry.id, { include: ['properties', 'isLink'] }).subscribe({
      next: (full) => {
        const merged = { ...entry, ...(full || {}), properties: { ...(entry.properties || {}), ...(full?.properties || {}) } };
        const id = this.getLinkDestinationId(merged);
        if (!id) {
          this.notificationService.openSnackMessage('Unable to open this link. The destination is missing.');
          return;
        }
        this.navigateToLinkTarget(merged, id);
      },
      error: () => {
        this.notificationService.openSnackMessage('Unable to open this link. The destination is missing.');
      }
    });
  }

  private lastOpenedLinkAt = 0;

  private navigateToLinkTarget(entry: Node | any, destId: string): void {
    const now = Date.now();
    if (now - this.lastOpenedLinkAt < 400) {
      return;
    }
    this.lastOpenedLinkAt = now;
    if (this.isFolderLink(entry)) {
      void this.navigateToExplorerNode(destId);
      return;
    }
    void this.arenderRedirect.openDocument(destId).catch(() => {
      this.notificationService.openSnackMessage('Unable to open the linked document.');
    });
  }

  /** Row filter for search (filters by name) - same as My Libraries filter in table */
  get searchRowFilter(): RowFilter | null {
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return null;
    return (row: any) => {
      const name = row.getValue?.('name') ?? row?.obj?.entry?.name ?? row?.obj?.name ?? '';
      return String(name).toLowerCase().includes(q);
    };
  }

  onFolderChange(): void {
    this.folderNode = this.documentList?.folderNode ?? null;
    this.rememberCurrentFolder();
  }

  /** Keep ACA's current folder in sync so Create actions land in this explorer folder. */
  private rememberCurrentFolder(): void {
    const node = this.folderNode?.id ? this.folderNode : ({ id: this.currentFolderId } as Node);
    if (node?.id) {
      this.store.dispatch(new SetCurrentFolderAction(node));
    }
  }

  createFileFromTemplate(): void {
    this.rememberCurrentFolder();
    this.store.dispatch(new FileFromTemplate());
  }

  createFolderFromTemplate(): void {
    this.rememberCurrentFolder();
    this.store.dispatch(new FolderFromTemplate());
  }

  createOfficeDocument(kind: 'WORD' | 'EXCEL' | 'POWERPOINT'): void {
    this.rememberCurrentFolder();
    this.store.dispatch(new CreateOfficeDocumentAction(kind));
  }


  /** Create dropdown: New folder - opens ADF folder dialog (same as My Libraries Create > New folder) */
  openCreateFolderDialog(): void {
    const dialogRef = this.dialog.open(FolderDialogComponent, {
      data: { parentNodeId: this.currentFolderId },
      width: '400px',
      restoreFocus: true
    });
    dialogRef.afterClosed().subscribe((node: Node) => {
      if (node) {
        window.location.reload();
      }
    });
  }

  createProject(): void {
    this.openCreateFolderDialog();
  }

  startProcess(): void {
    void this.router.navigate(['/start-process']);
  }

  toggleViewMode(): void {
    this.viewModeGrid = !this.viewModeGrid;
  }

  onProjectNodeClick(event: { value?: { entry?: any } }): void {
    const entry = this.getEntryFromPayload(event) ?? event?.value?.entry;
    if (!entry) {
      return;
    }
    if (this.isAlfrescoLink(entry)) {
      this.openLinkedNode(entry);
    }
  }

  /** Double-click: folders navigate; file/folder links open the destination. */
  onProjectRowDblClick(event: any): void {
    const entry = this.getEntryFromPayload(event) ?? event?.value?.entry;
    if (!entry) {
      return;
    }
    if (this.isAlfrescoLink(entry)) {
      this.openLinkedNode(entry);
      return;
    }
    if ((entry as any).isFolder === true) {
      void this.navigateToExplorerNode((entry as any).id);
    }
  }

  onDmsNameClick(event: MouseEvent, node: { entry?: Node } | Node | null): void {
    const entry = (node as { entry?: Node })?.entry ?? (node as Node);
    if (!this.isAlfrescoLink(entry)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.openLinkedNode(entry);
  }

  onUploadSuccessProjects(): void {
    window.location.reload();
  }

  /** Personal Files style upload into the folder currently open in the explorer. */
  onHeaderUploadSelected(event: Event, asFolder: boolean): void {
    const input = event.target as HTMLInputElement;
    const parentId = this.currentFolderId;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    if (!parentId || !selected.length) {
      return;
    }
    const models = selected
      .filter((file) => !!file.name && file.name !== '.DS_Store')
      .map(
        (file) =>
          new FileModel(file, {
            parentId,
            path: asFolder ? (file.webkitRelativePath || '').replace(/\/[^/]*$/, '') : '',
            nodeType: 'cm:content'
          })
      );
    if (!models.length) {
      return;
    }
    this.uploadService.addToQueue(...models);
    this.uploadService.uploadFilesInTheQueue();
  }

  /** Opens the upload dialog (document numbering or incoming transmittal, based on folder). */
  triggerUpload(): void {
    this.openDialog('0ms', '0ms');
  }

  startProcessFromMenu(node: any): void {
    // For now reuse global Start Process navigation; node is available for future enhancements
    this.startProcess();
  }

  /** Overflow menu: open the document in ARender (same redirect used by process attachments). */
  openInArenderView(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id) {
      return;
    }
    if (this.isFolderLink(entry)) {
      this.openLinkedNode(entry);
      return;
    }
    if ((entry as any).isFolder === true && !this.isAlfrescoLink(entry)) {
      return;
    }
    const documentId = this.getLinkDestinationId(entry) || entry.id;
    const isCad = isCadFile(entry.name, entry.content?.mimeType);
    if (isCad) {
      this.notificationService.openSnackMessage('Preparing a PDF for ARender annotation…');
    }
    void this.arenderRedirect
      .openDocument(documentId, {
        fileName: entry.name,
        usePdfRendition: isCad
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error && err.message.trim()
            ? err.message.trim()
            : 'Unable to open the document in ARender. Please sign in again and try once more.';
        this.notificationService.openSnackMessage(message);
      });
  }

  readonly isCadDocumentAction = (node: any): boolean => {
    const entry = node?.entry ?? this.getEntryFromPayload(node);
    if (!entry || (entry as any).isFolder === true) {
      return false;
    }
    return isCadFile(entry.name, entry.content?.mimeType);
  };

  openInCadView(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id) {
      return;
    }
    if ((entry as any).isFolder === true && !this.isAlfrescoLink(entry)) {
      return;
    }
    const documentId = this.getLinkDestinationId(entry) || entry.id;
    void this.cadViewerOpen
      .openDocument(documentId, {
        name: entry.name,
        mimeType: entry.content?.mimeType
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error && err.message.trim()
            ? err.message.trim()
            : 'Unable to open this CAD file in MLightCAD.';
        this.notificationService.openSnackMessage(message);
      });
  }

  async editOffline(node: any): Promise<void> {
    const entry = this.getEntryFromPayload(node);
    if (!entry || !entry.id) return;

    // Use ADF dialog that wraps lock/unlock logic
    try {
      this.contentNodeDialog.openLockNodeDialog(entry).subscribe({
        next: () => window.location.reload(),
        error: () => window.location.reload()
      });
    } catch {
      // Fallback: just reload
      window.location.reload();
    }
  }

  copyNode(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry) return;
    const isFolder = (entry as any).isFolder === true;

    // ADF openCopyMoveDialog only opens when permission is AllowableOperationsEnum.COPY
    // ('copy'); values like 'CreateChildren' fail the check and never show the dialog.
    const op$ = isFolder
      ? this.nodeActions.copyFolder(entry, AllowableOperationsEnum.COPY)
      : this.nodeActions.copyContent(entry, AllowableOperationsEnum.COPY);

    op$?.subscribe({
      next: () => window.location.reload(),
      error: () => {
        this.notificationService.openSnackMessage('Unable to copy this item.');
      }
    });
  }

  /** Same share dialog as the Personal Files toolbar link button. Files only. */
  shareNode(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id || (entry as { isFolder?: boolean }).isFolder === true) {
      return;
    }
    this.store.dispatch(new ShareNodeAction({ entry }));
  }

  createLink(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id) {
      return;
    }

    const select = new Subject<Node[]>();
    const data: ContentNodeSelectorComponentData = {
      title: `Create link to '${entry.name}'`,
      actionName: NodeAction.CHOOSE,
      selectionMode: 'single',
      currentFolderId: entry.parentId || this.currentFolderId,
      where: '(isFolder=true)',
      isSelectionValid: (folder: Node) => folder?.isFolder === true,
      select
    };

    const dialogRef = this.dialog.open(ContentNodeSelectorComponent, {
      data,
      panelClass: 'adf-content-node-selector-dialog',
      width: '630px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe({ next: () => select.complete() });

    select.subscribe({
      next: (selections: Node[]) => {
        const destination = selections?.[0];
        if (!destination?.id) {
          return;
        }
        this.createLinkInFolder(entry, destination.id);
      }
    });
  }

  private createLinkInFolder(entry: Node, destinationFolderId: string): void {
    const isFolder = (entry as { isFolder?: boolean }).isFolder === true;
    const baseName = `Link to ${entry.name}`;
    const linkName = baseName.toLowerCase().endsWith('.url') ? baseName : `${baseName}.url`;

    this.nodesApiService
      .createNode(
        destinationFolderId,
        {
          name: linkName,
          nodeType: isFolder ? 'app:folderlink' : 'app:filelink',
          properties: {
            'cm:destination': entry.id,
            'cm:title': linkName,
            'cm:description': linkName
          }
        },
        { autoRename: true }
      )
      .subscribe({
        next: () => {
          this.notificationService.openSnackMessage(`Link created: ${linkName}`);
          if (destinationFolderId === this.currentFolderId) {
            this.documentList?.reload();
          }
        },
        error: (err) => {
          const status = err?.status ?? err?.statusCode ?? err?.error?.error?.statusCode;
          if (status === 409) {
            this.notificationService.openSnackMessage(
              'A link with this name already exists in the destination folder.'
            );
            return;
          }
          this.notificationService.openSnackMessage('Unable to create the link.');
        }
      });
  }

  moveNode(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry) return;
    const isFolder = (entry as any).isFolder === true;

    const op$ = isFolder
      ? this.nodeActions.moveFolder(entry, AllowableOperationsEnum.DELETE)
      : this.nodeActions.moveContent(entry, AllowableOperationsEnum.DELETE);

    op$?.subscribe({
      next: () => window.location.reload(),
      error: () => {
        this.notificationService.openSnackMessage('Unable to move this item.');
      }
    });
  }

  uploadNewVersion(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry) return;

    this.newVersionUploader
      .openUploadNewVersionDialog({ node: entry })
      .subscribe({
        next: (result) => {
          if (result && (result.action === NewVersionUploaderDataAction.upload || result.action === NewVersionUploaderDataAction.refresh)) {
            window.location.reload();
          }
        },
        error: () => window.location.reload()
      });
  }

  manageVersions(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry) return;

    this.newVersionUploader
      .openUploadNewVersionDialog({
        node: entry,
        showVersionsOnly: true,
        allowDownload: true,
        allowViewVersions: true,
        allowVersionDelete: true,
        showActions: true
      })
      .subscribe({
        next: (result) => {
          if (result && result.action === NewVersionUploaderDataAction.refresh) {
            window.location.reload();
          }
        },
        error: () => window.location.reload()
      });
  }

  openAuditTrail(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id) {
      return;
    }

    this.dialog.open(AuditTrailDialogComponent, {
      width: 'min(920px, calc(100vw - 32px))',
      maxWidth: '100vw',
      maxHeight: 'min(72vh, 640px)',
      autoFocus: 'dialog',
      panelClass: 'adw-audit-trail-dialog-panel',
      data: { node: entry } satisfies AuditTrailDialogData
    });
  }

  toggleFavorite(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id) {
      return;
    }

    const nodes: NodeEntry[] = [{ entry: entry as any }];
    void this.toggleFavoriteNodes(nodes, entry);
  }

  private async toggleFavoriteNodes(nodes: NodeEntry[], entry: Node): Promise<void> {
    let isFavorite = (entry as { isFavorite?: boolean }).isFavorite;
    if (typeof isFavorite !== 'boolean') {
      isFavorite = await this.isNodeFavorite(entry.id);
    }

    if (isFavorite) {
      this.store.dispatch(new RemoveFavoriteAction(nodes));
      (entry as { isFavorite?: boolean }).isFavorite = false;
      return;
    }

    this.store.dispatch(new AddFavoriteAction(nodes));
    (entry as { isFavorite?: boolean }).isFavorite = true;
  }

  private async isNodeFavorite(nodeId: string): Promise<boolean> {
    try {
      const favoritesApi = new FavoritesApi(this.alfrescoApiService.getInstance());
      await favoritesApi.getFavorite('-me-', nodeId);
      return true;
    } catch {
      return false;
    }
  }

  declareRecord(node: any): void {
    this.notificationService.openSnackMessage('Declare Record is not yet available in this view.');
  }

  editAspects(node: any): void {
    this.notificationService.openSnackMessage('Edit Aspects is not yet available in this view.');
  }

  managePermissions(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id) return;

    this.nodePermissionDialog
      .updateNodePermissionByDialog(entry.id)
      .subscribe({
        next: () => window.location.reload(),
        error: () => window.location.reload()
      });
  }

  manageHolds(node: any): void {
    this.notificationService.openSnackMessage('Manage Holds is not yet available in this view.');
  }

  onDelete(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id) {
      return;
    }
    const name = (entry as any).name ?? 'this item';

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogComponentProps, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Delete',
          message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
          yesLabel: 'Delete',
          noLabel: 'Cancel'
        },
        maxWidth: '500px',
        restoreFocus: true
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.contentApiService.deleteNode(entry.id).subscribe({
            next: () => {
              this.notificationService.openSnackMessage(`"${name}" has been deleted.`);
              window.location.reload();
            },
            error: () => {
              this.notificationService.showError(`Failed to delete "${name}".`);
            }
          });
        }
      });
  }

  formatTitle(title?: string): string {
    if (!title) return '';
    return title.replace(/^\s*\d+[.\-_]?\s*/, '');
  }

  getDisplayName(context: any): string {
    if (!context) return '';
    if (context.value != null && context.value !== '') return String(context.value);
    const entry = context?.row?.obj?.entry ?? context?.row?.obj;
    if (entry?.name != null) return String(entry.name);
    if (typeof context?.row?.getValue === 'function') {
      const v = context.row.getValue('name');
      return v != null ? String(v) : '';
    }
    return '';
  }

  /**
   * Node entry for custom list cells (name / date / owner).
   * Mirrors {@link getDisplayName} object resolution.
   */
  getNodeEntryFromContext(context: any): any {
    if (!context) {
      return null;
    }
    return context?.row?.obj?.entry ?? context?.row?.obj ?? null;
  }

  /**
   * List-only DMS name cell: icon tile, optional tree badge, lock icon + Locked by for locked files.
   */
  dmsNameCellModel(context: any): {
    name: string;
    icon: string;
    tone: 'amber' | 'primary' | 'success' | 'neutral';
    tree: boolean;
    isFolder: boolean;
    isLink: boolean;
    locked: boolean;
    node: any;
  } | null {
    const entry = this.getNodeEntryFromContext(context);
    if (!entry) {
      return null;
    }
    const name = this.getDisplayName(context);
    const node = context?.row?.node ?? { entry };
    const isLink = this.isAlfrescoLink(entry);
    const locked = entry.isFolder !== true && !isLink && isLocked(node);
    if (locked) {
      return {
        name,
        icon: 'lock',
        tone: 'neutral',
        tree: false,
        isFolder: false,
        isLink: false,
        locked: true,
        node
      };
    }
    const { icon, tone } = isLink
      ? { icon: 'link' as const, tone: 'primary' as const }
      : this.dmsListIconState(entry, name);
    return {
      name,
      icon,
      tone,
      tree: !isLink && this.dmsListShowTreeBadge(icon, entry),
      isFolder: entry.isFolder === true,
      isLink,
      locked: false,
      node
    };
  }

  dmsModifiedParts(entry: any): { d: string; t: string } | null {
    const raw = entry?.modifiedAt;
    if (raw == null) {
      return null;
    }
    const d = new Date(raw as string | number | Date);
    if (isNaN(d.getTime())) {
      return null;
    }
    return {
      d: formatDate(d, 'MMM d, y', 'en-US'),
      t: formatDate(d, 'h:mm a', 'en-US')
    };
  }

  dmsOwnerName(entry: any): string {
    const u = entry?.modifiedByUser?.displayName || entry?.createdByUser?.displayName;
    return typeof u === 'string' && u.trim() ? u.trim() : 'â€”';
  }

  dmsOwnerSubtitle(entry: any): string {
    const e = (entry?.modifiedByUser?.email || entry?.createdByUser?.email) as string | undefined;
    return typeof e === 'string' && e.trim() ? e.trim() : '';
  }

  dmsOwnerInitials(entry: any): string {
    const name = this.dmsOwnerName(entry);
    if (name === 'â€”') {
      return 'â€”';
    }
    return ProjectExplorerComponent.initialsFromDisplayName(name);
  }

  dmsDocumentStatus(entry: any): string | null {
    if (!entry || entry.isFolder === true) {
      return null;
    }
    const properties = (entry?.properties as Record<string, unknown> | undefined) ?? {};
    const nodeType = String(entry?.nodeType ?? '');
    const isVdr = nodeType.includes('vdrDocument');
    const raw = this.dmsFirstNonEmpty(
      properties['dms:document_status'],
      properties['dms:documentStatus'],
      isVdr ? properties['edms:vdr_document_status'] : properties['edms:status'],
      isVdr ? properties['edms:vdrDocumentStatus'] : properties['edms:document_status']
    );
    if (!raw) {
      return null;
    }
    return this.dmsNormalizeDocumentStatus(raw);
  }

  dmsStatusClass(status: string): string {
    switch (status) {
      case 'Approved':
        return 'adw-dms-status-badge--approved';
      case 'Under Review':
        return 'adw-dms-status-badge--review';
      case 'Need Correction':
        return 'adw-dms-status-badge--correction';
      default:
        return 'adw-dms-status-badge--draft';
    }
  }

  private dmsFirstNonEmpty(...values: unknown[]): string {
    for (const value of values) {
      if (value != null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return '';
  }

  private dmsNormalizeDocumentStatus(raw: string): string {
    const value = raw.trim().toLowerCase();
    if (value.includes('correction')) {
      return 'Need Correction';
    }
    if (value.includes('approved')) {
      return 'Approved';
    }
    if (value.includes('review')) {
      return 'Under Review';
    }
    if (value.includes('draft')) {
      return 'Draft';
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private dmsListIconState(
    entry: any,
    displayName: string
  ): { icon: string; tone: 'amber' | 'primary' | 'success' } {
    const n = (displayName || '').toLowerCase();
    const isFolder = entry?.isFolder === true;
    if (isFolder) {
      if (n.includes('master') && n.includes('document')) {
        return { icon: 'description', tone: 'primary' };
      }
      if (n.includes('loading')) {
        return { icon: 'cloud_upload', tone: 'success' };
      }
      if (n.includes('vendor')) {
        return { icon: 'verified_user', tone: 'success' };
      }
      return { icon: 'folder', tone: 'amber' };
    }
    return { icon: 'insert_drive_file', tone: 'primary' };
  }

  private dmsListShowTreeBadge(icon: string, entry: any): boolean {
    if (entry?.isFolder !== true) {
      return false;
    }
    return icon === 'description' || icon === 'cloud_upload' || icon === 'verified_user';
  }

  private static initialsFromDisplayName(name: string): string {
    const parts = name
      .split(/\s+/)
      .map((p) => p.replace(/[^A-Za-z0-9]/g, ''))
      .filter(Boolean);
    if (parts.length === 0) {
      return 'â€”';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  onDownload(node: any): void {
    const entry = this.getEntryFromPayload(node);
    if (!entry?.id || (entry as any).isFolder === true) {
      return;
    }
    this.pendingWatermarkDownloadNode.set(entry as Node);
  }

  pickWatermarkKind(kind: WatermarkTemplateKind, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.wmTrigger()?.closeMenu();
    this.actionsMenuTrigger()?.closeMenu();
    this.actionsMenuAnchor()?.click();
    const node =
      this.pendingWatermarkDownloadNode() ??
      this.nodeFromOpenActionsMenu() ??
      this.asFileNode(this.selectedNode);
    if (!node?.id) {
      this.notificationService.openSnackMessage('Unable to download this file.');
      return;
    }
    void this.openWatermarkPickerAndDownload(node, kind);
  }

  private bindDownloadWatermarkMenu(): void {
    merge(
      fromEvent(this.document, 'mouseover', { capture: true }),
      fromEvent(this.document, 'click', { capture: true })
    )
      .pipe(takeUntilDestroyed(this.wmDestroyRef))
      .subscribe((event) => this.onDownloadMenuEvent(event as Event));
  }

  private onDownloadMenuEvent(event: Event): void {
    const target = event.target as HTMLElement | null;
    const item = target?.closest<HTMLElement>('.mat-mdc-menu-panel [data-automation-id="Download"]');
    if (item) {
      if (event.type === 'click') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
      const { right, top, height } = item.getBoundingClientRect();
      this.pendingWatermarkDownloadNode.set(this.nodeFromOpenActionsMenu() ?? this.pendingWatermarkDownloadNode());
      this.watermarkMenuPosition.set({ left: right - 2, top, height });
      this.ngZone.run(() => {
        this.clearWmTimer();
        this.wmTrigger()?.openMenu();
      });
      return;
    }
    if (target?.closest('.adw-download-watermark-submenu, .adw-download-has-submenu')) {
      this.clearWmTimer();
      return;
    }
    if (event.type === 'mouseover' && this.watermarkMenuOpen()) {
      this.ngZone.run(() => {
        this.clearWmTimer();
        this.wmCloseTimer = setTimeout(() => this.wmTrigger()?.closeMenu(), 180);
      });
    }
  }

  private clearWmTimer(): void {
    clearTimeout(this.wmCloseTimer ?? undefined);
    this.wmCloseTimer = null;
  }

  private async openWatermarkPickerAndDownload(
    node: Node,
    kind: WatermarkTemplateKind
  ): Promise<void> {

    const result = await firstValueFrom(
      this.dialog
        .open<SelectWatermarkDialogComponent, SelectWatermarkDialogData, SelectWatermarkDialogResult | undefined>(
          SelectWatermarkDialogComponent,
          {
            width: 'min(520px, calc(100vw - 32px))',
            maxWidth: '100vw',
            maxHeight: '92vh',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            panelClass: 'adw-select-watermark-dialog-panel',
            data: {
              kind,
              fileName: String((node as any).name ?? '').trim()
            }
          }
        )
        .afterClosed()
    );

    if (!result?.template) {
      return;
    }

    this.notificationService.openSnackMessage('Preparing download with watermark…');
    try {
      await this.watermarkedDownload.downloadWithWatermark(node, {
        kind,
        template: result.template
      });
    } catch {
      this.notificationService.openSnackMessage(
        'Unable to prepare the watermarked download. Please try again in a moment.'
      );
    }
  }

  /**
   * Live profile check (no caching): Reports is visible only for users with `PTTEP_DCM`.
   */
  private async syncReportsVisibilityFromProfile(): Promise<void> {
    try {
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          ProjectExplorerComponent.activitiProfileUrl,
          new HttpHeaders({
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      const profile = (await firstValueFrom(
        this.http.get<unknown>(ProjectExplorerComponent.activitiProfileUrl, { headers })
      )) as {
        name?: string;
        primaryGroup?: { name?: string; externalId?: string | null } | null;
        groups?: Array<{ name?: string; externalId?: string | null }> | null;
      };
      const sameName = (value: unknown, target: string): boolean =>
        typeof value === 'string' && value.trim().toUpperCase() === target;
      const hasProfileName = (target: string): boolean =>
        sameName(profile?.name, target) ||
        sameName(profile?.primaryGroup?.name, target) ||
        sameName(profile?.primaryGroup?.externalId, target) ||
        (Array.isArray(profile?.groups) &&
          profile.groups.some((g) => sameName(g?.name, target) || sameName(g?.externalId, target))) ||
        false;

      this.reportsAllowed = hasProfileName(ProjectExplorerComponent.reportsAllowedProfileName);
      this.createPoAllowed = hasProfileName(ProjectExplorerComponent.createPoAllowedProfileName);
      this.uploadAllowed = hasProfileName(ProjectExplorerComponent.uploadAllowedProfileName);
      this.startProcessAllowed = hasProfileName(ProjectExplorerComponent.startProcessAllowedProfileName);
    } catch {
      this.reportsAllowed = false;
      this.createPoAllowed = false;
      this.uploadAllowed = false;
      this.startProcessAllowed = false;
    }
  }

  private static isTruthyNodeProperty(value: unknown): boolean {
    if (value === true || value === 1) {
      return true;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  }

  /**
   * Load project-folder property `isPoRequired` so Create PO shows only when true.
   */
  private async syncProjectIsPoRequired(): Promise<void> {
    if (this.isAssetExplorerContext) {
      this.projectIsPoRequired = false;
      this.projectPoRequiredSyncedForId = null;
      return;
    }

    const projectId = this.projectFolderId?.trim();
    if (!projectId) {
      this.projectIsPoRequired = false;
      this.projectPoRequiredSyncedForId = null;
      return;
    }

    if (this.projectPoRequiredSyncedForId === projectId) {
      return;
    }

    // Hide until the project property is confirmed true.
    this.projectIsPoRequired = false;
    this.projectPoRequiredSyncedForId = projectId;

    try {
      const isRequired = await firstValueFrom(this.alfrescoService.isProjectPoRequired(projectId));
      // Ignore stale responses if the user navigated to another project.
      if (this.projectPoRequiredSyncedForId !== projectId) {
        return;
      }
      this.projectIsPoRequired = isRequired;
    } catch {
      if (this.projectPoRequiredSyncedForId === projectId) {
        this.projectIsPoRequired = false;
        this.projectPoRequiredSyncedForId = null;
      }
    }
  }

  /** Same as Create PO dialog: Activiti/Alfresco error body shape. */
  private static activitiApiErrorMessage(err: unknown): string {
    return alfrescoApiErrorMessage(err);
  }

  openDialog(enterAnimationDuration: string, exitAnimationDuration: string): void {
    if (this.isIncomingTransmittalFolder()) {
      this.openIncomingTransmittalUploadDialog(enterAnimationDuration, exitAnimationDuration);
      return;
    }

    const path = this.folderNode?.path?.elements ?? [];
    const parent = path[path.length - 1];
    const projectNode = parent?.name === '06.Loading' ? path[path.length - 2] : parent;
    const projectId = (
      (this.folderNode?.name ?? '').trim() === '06.Loading'
        ? projectNode?.id
        : this.projectFolderId
    )?.trim();
    this.dialog
      .open(DocumentNamingComponent, {
        width: 'min(860px, calc(100vw - 32px))',
        maxWidth: 'min(860px, calc(100vw - 32px))',
        autoFocus: false,
        enterAnimationDuration,
        exitAnimationDuration,
        panelClass: 'adw-document-naming-dialog-panel',
        data: {
          projectId,
          projectName: this.projectFolderName
        }
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.success && projectId) {
          void this.navigateToLoadingFolder(projectId);
        }
      });
  }

  openBulkUploadDialog(): void {
    const projectFolderId = this.projectFolderId?.trim();
    if (!projectFolderId) {
      this.notificationService.showError('Project folder is not available for bulk upload.');
      return;
    }

    const data: BulkUploadDialogData = {
      projectFolderId,
      projectName: this.projectFolderName?.trim() || undefined
    };

    this.dialog
      .open(BulkUploadDialogComponent, {
        width: 'min(520px, calc(100vw - 32px))',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: false,
        panelClass: 'adw-bulk-upload-dialog-panel',
        data
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.success) {
          void this.navigateToLoadingFolder(
            projectFolderId,
            'Documents uploaded successfully. Check your email for the upload report.'
          );
        }
      });
  }

  openIncomingTransmittalUploadDialog(enterAnimationDuration: string, exitAnimationDuration: string): void {
    const folderId = this.currentFolderId?.trim();
    if (!folderId) {
      this.notificationService.showError('Open Incoming Transmittal folder before uploading.');
      return;
    }

    const data: IncomingTransmittalUploadDialogData = {
      folderId,
      projectId: this.projectFolderId?.trim() || undefined,
      projectName: this.projectFolderName?.trim() || undefined,
      folderName: (this.folderNode?.name ?? '').trim() || undefined
    };

    this.dialog
      .open(IncomingTransmittalUploadDialogComponent, {
        width: 'min(560px, calc(100vw - 32px))',
        maxHeight: '92vh',
        autoFocus: 'first-tabbable',
        enterAnimationDuration,
        exitAnimationDuration,
        panelClass: 'adw-incoming-transmittal-upload-dialog-panel',
        data
      })
      .afterClosed()
      .subscribe((success) => {
        if (success) {
          this.notificationService.openSnackMessage('File(s) uploaded to Incoming Transmittal.');
          setTimeout(() => window.location.reload(), 300);
        }
      });
  }

  /** Resolves `06.Loading`, shows optional toast, then refreshes (toast shown again after reload). */
  private async navigateToLoadingFolder(projectFolderId: string, successToast?: string): Promise<void> {
    const loadingFolderId = await this.resolveLoadingFolderNodeId(projectFolderId);
    this.ngZone.run(() => {
      if (!loadingFolderId) {
        if (successToast) {
          this.notificationService.openSnackMessage(successToast);
        }
        this.notificationService.openSnackMessage(
          'Upload completed, but could not open the Loading folder. Check that "06.Loading" exists under the project.'
        );
        return;
      }

      const showNotificationThenRefresh = (): void => {
        if (successToast) {
          this.notificationService.openSnackMessage(successToast);
          // Keep toast after refresh of the Loading folder.
          this.queuePendingToast(successToast);
          setTimeout(() => window.location.reload(), 2500);
          return;
        }
        setTimeout(() => window.location.reload(), 300);
      };

      if (this.nodeId === loadingFolderId) {
        showNotificationThenRefresh();
        return;
      }

      void this.navigateToExplorerNode(loadingFolderId).then(() => {
        showNotificationThenRefresh();
      });
    });
  }

  private queuePendingToast(message: string): void {
    try {
      sessionStorage.setItem(ProjectExplorerComponent.pendingToastStorageKey, message);
    } catch {
      // Ignore storage failures; toast will simply not survive reload.
    }
  }

  private showPendingToastIfAny(): void {
    try {
      const message = sessionStorage.getItem(ProjectExplorerComponent.pendingToastStorageKey);
      if (!message) {
        return;
      }
      sessionStorage.removeItem(ProjectExplorerComponent.pendingToastStorageKey);
      // Show after Loading folder refresh has settled.
      setTimeout(() => this.notificationService.openSnackMessage(message), 600);
    } catch {
      // Ignore storage failures.
    }
  }

  private async resolveLoadingFolderNodeId(projectFolderId: string): Promise<string | null> {
    const base = `/alfresco/api/-default-/public/alfresco/versions/1/nodes/${projectFolderId}`;
    const url = `${base}?relativePath=${encodeAlfrescoRelativePathParam(ProjectExplorerComponent.loadingFolderRelativePath)}&include=properties`;
    try {
      const response = (await this.adfHttpClient.request(url, {
        httpMethod: 'GET',
        accepts: ['application/json'],
        contentTypes: ['application/json']
      })) as { entry?: { id?: string } };
      return response?.entry?.id ?? null;
    } catch {
      return null;
    }
  }
}

function alfrescoApiErrorMessage(err: unknown): string {
    const hiddenStackTraceMessage =
      'For security reasons the stack trace is no longer displayed, but the property is kept for previous versions.';
    const anyErr = err as { error?: { message?: string; error?: { errorKey?: string; briefSummary?: string; message?: string } } };
    const body = anyErr?.error;
    if (body && typeof body === 'object') {
      const apiError = (body as { error?: { errorKey?: string; briefSummary?: string; message?: string } }).error;
      if (apiError && typeof apiError === 'object') {
        if (typeof apiError.errorKey === 'string' && apiError.errorKey.trim()) {
          return apiError.errorKey.trim();
        }
        if (typeof apiError.briefSummary === 'string' && apiError.briefSummary.trim()) {
          return apiError.briefSummary.trim();
        }
        if (typeof apiError.message === 'string' && apiError.message.trim()) {
          const m = apiError.message.trim();
          if (m !== hiddenStackTraceMessage) {
            return m;
          }
        }
      }
      if (typeof (body as { message?: string }).message === 'string' && (body as { message: string }).message.trim()) {
        const m = (body as { message: string }).message.trim();
        if (m !== hiddenStackTraceMessage) {
          return m;
        }
      }
    }
    if (typeof (anyErr as { message?: string })?.message === 'string' && (anyErr as { message: string }).message.trim()) {
      return (anyErr as { message: string }).message.trim();
    }
    return '';
}

interface MocRequestDialogData {
  nodeId: string;
  requestedBy: string;
  requestedDate: string;
}

@Component({
  selector: 'adw-moc-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title class="adw-moc-request-dialog__title">MOC Request</h2>

    <mat-dialog-content class="adw-moc-request-dialog__content">
      <mat-form-field appearance="outline" class="adw-moc-request-dialog__field" subscriptSizing="dynamic">
        <mat-label>Requested by</mat-label>
        <input matInput [value]="data?.requestedBy ?? ''" readonly />
      </mat-form-field>

      <mat-form-field appearance="outline" class="adw-moc-request-dialog__field" subscriptSizing="dynamic">
        <mat-label>Requested date</mat-label>
        <input matInput [value]="data?.requestedDate ?? ''" readonly />
      </mat-form-field>

      <mat-form-field appearance="outline" class="adw-moc-request-dialog__field" subscriptSizing="dynamic">
        <mat-label>Change reason</mat-label>
        <textarea
          matInput
          rows="4"
          [formControl]="changeReasonControl"
          placeholder="Describe why this document change is required"></textarea>
        <mat-error *ngIf="changeReasonControl.touched && changeReasonControl.hasError('required')">
          Change reason is required
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="adw-moc-request-dialog__actions">
      <button type="button" mat-stroked-button (click)="cancel()" [disabled]="submitting">Cancel</button>
      <button type="button" mat-flat-button color="primary" (click)="submit()" [disabled]="submitting">Submit</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .adw-moc-request-dialog__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .adw-moc-request-dialog__content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: min(480px, calc(100vw - 48px));
        padding-top: 4px !important;
      }

      .adw-moc-request-dialog__field {
        width: 100%;
      }

      .adw-moc-request-dialog__actions {
        padding-top: 8px;
      }
    `
  ]
})
class MocRequestDialogComponent {
  readonly data = inject<MocRequestDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  readonly changeReasonControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)]
  });
  submitting = false;

  constructor(
    private readonly dialogRef: MatDialogRef<MocRequestDialogComponent, boolean | undefined>,
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService,
    private readonly notificationService: NotificationService
  ) {}

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  async submit(): Promise<void> {
    const changeReason = this.changeReasonControl.value.trim();
    if (!changeReason || this.changeReasonControl.invalid) {
      this.changeReasonControl.markAsTouched();
      return;
    }
    const nodeId = this.data?.nodeId?.trim();
    const requestedBy = this.data?.requestedBy?.trim();
    const requestedDate = this.data?.requestedDate?.trim();
    if (!nodeId || !requestedBy || !requestedDate) {
      this.notificationService.openSnackMessage('Document context is missing. Close the dialog and try again.');
      return;
    }

    const url = `${ACS_NODES_API_BASE_URL}/${nodeId}`;
    const payload = {
      properties: {
        'edms:moc_status': 'Change Requested',
        'edms:requested_by': requestedBy,
        'edms:requested_date': requestedDate,
        'edms:change_reason': changeReason
      }
    };

    this.submitting = true;
    try {
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          url,
          new HttpHeaders({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      await firstValueFrom(this.http.put<unknown>(url, payload, { headers }));
      this.notificationService.openSnackMessage('MOC Approval Request has been raised successfully.');
      this.dialogRef.close(true);
      setTimeout(() => window.location.reload(), 300);
    } catch (err: unknown) {
      const msg = alfrescoApiErrorMessage(err) || 'Failed to submit MOC request.';
      this.notificationService.showError(msg);
    } finally {
      this.submitting = false;
    }
  }
}
