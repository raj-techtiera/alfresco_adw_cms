/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormService, FormValues, LocalizedDatePipe, NotificationService } from '@alfresco/adf-core';
import { filter, switchMap, take, tap } from 'rxjs/operators';
import { ALL_APPS, UploadWidgetType } from '../../../../models/process-service.model';
import { AppDefinitionRepresentation, Node, ProcessDefinitionRepresentation, RelatedContentRepresentation, SharedLink } from '@alfresco/js-api';
import { Store } from '@ngrx/store';
import { combineLatest, from, of } from 'rxjs';
import { ProcessServiceExtensionState } from '../../../../store/reducers/process-services.reducer';
import { ContentApiService, PageLayoutComponent, PageLayoutContentComponent, PageLayoutHeaderComponent } from '@alfresco/aca-shared';
import { showNotificationOnStartProcessAction } from '../../actions/start-process.actions';
import { StartProcessExtService } from '../../services/start-process-ext.service';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { StartProcessInstanceComponent } from '@alfresco/adf-process-services';
import { ViewNodeAction } from '@alfresco/aca-shared/store';
import { normalizeAlfrescoNodeId } from '../../../../utils/normalize-alfresco-node-id';
import { DocumentListService } from '@alfresco/adf-content-services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const PROCESS_DEFINITION_QUERY_PARAM = 'process';

@Component({
    selector: 'aps-start-process-ext',
    standalone: true,
    imports: [
        CommonModule,
        PageLayoutHeaderComponent,
        PageLayoutComponent,
        PageLayoutContentComponent,
        TranslatePipe,
        MatIconModule,
        StartProcessInstanceComponent
    ],
    providers: [LocalizedDatePipe],
    templateUrl: './start-process-ext.component.html',
    styleUrls: ['./start-process-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class StartProcessExtComponent implements OnInit, OnDestroy {
    appId = ALL_APPS;
    defaultProcessName: string;
    defaultProcessDefinition?: string;
    formValues: FormValues;
    selectedNodes: Node[];
    selectedProcessDefinitionId: string;
    private exitedToViewer = false;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private readonly route: ActivatedRoute,
        private readonly location: Location,
        private readonly startProcessExtService: StartProcessExtService,
        private readonly documentListService: DocumentListService,
        private readonly notificationService: NotificationService,
        private readonly store: Store<ProcessServiceExtensionState>,
        private readonly formService: FormService,
        private readonly contentApi: ContentApiService,
        private readonly router: Router
    ) {}

    ngOnInit() {
        this.route.queryParams.subscribe((params: Params) => {
            this.appId = +params['appId'];
            this.getNodesFromParams(params['nodes']);
            this.defaultProcessDefinition = params[PROCESS_DEFINITION_QUERY_PARAM];
            this.defaultProcessName = this.startProcessExtService.getDefaultProcessName();
            this.getSelectedNodes();
        });
        this.observeFormContentClicked();
    }

    ngOnDestroy() {
        if (!this.exitedToViewer) {
            this.startProcessExtService.resetSelectedNodes();
            this.startProcessExtService.goBackUrl.next(null);
        }
    }

    getSelectedNodes() {
        this.startProcessExtService.selectedNodes$
            .pipe(
                switchMap((nodes) => from(this.mapNodesOfSharedFiles(nodes))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((selectedNodes) => {
                this.selectedNodes = selectedNodes;
            });
    }

    getNodesFromParams(query: string): void {
        const nodesIds = query ? query.split(',') : [];
        if (!nodesIds.length) {
            return;
        }
        const source$ = nodesIds.map((node) => this.documentListService.getNode(node));

        combineLatest(source$)
            .pipe(
                take(1),
                switchMap((nodes) => from(this.mapNodesOfSharedFiles(nodes)))
            )
            .subscribe((nodes) => {
                this.selectedNodes = nodes;
            });
    }

    async mapNodesOfSharedFiles(nodes): Promise<Node[]> {
        let selectedNodes = [];
        await Promise.all(
            nodes.map((node: any) => {
                if (node instanceof SharedLink) {
                    return this.contentApi.getNodeInfo(node.nodeId).toPromise();
                } else {
                    return node;
                }
            })
        ).then((mappedNodes) => {
            selectedNodes = mappedNodes;
        });
        return selectedNodes;
    }

    attachSelectedContentOnStartForm(processDefinitionId: string) {
        this.startProcessExtService
            .getContentUploadWidgets(processDefinitionId)
            .pipe(
                tap((contentWidgets: UploadWidgetType[]) => {
                    if (contentWidgets.length && !this.isSingleSelection() && this.startProcessExtService.areAllWidgetsSingleType(contentWidgets)) {
                        this.notificationService.showWarning('PROCESS-EXTENSION.ERROR.CAN_NOT_ATTACH');
                    }
                }),
                filter((contentWidgets: UploadWidgetType[]) => contentWidgets.length > 0),
                switchMap((contentWidgets: UploadWidgetType[]) => of(this.prepareFormValues(contentWidgets, this.selectedNodes)))
            )
            .subscribe((formValues: FormValues) => {
                this.formValues = formValues;
            });
    }

    prepareFormValues(contentWidgets: UploadWidgetType[], selectedNodes: Node[]): FormValues {
        let values: FormValues = {};
        let firstUploadWidget: UploadWidgetType;

        if (this.isSingleSelection()) {
            firstUploadWidget = this.getUploadWidgetByType(contentWidgets, StartProcessExtService.SINGLE);
            if (firstUploadWidget === undefined) {
                firstUploadWidget = this.getUploadWidgetByType(contentWidgets, StartProcessExtService.MULTIPLE);
            }
        } else {
            firstUploadWidget = this.getUploadWidgetByType(contentWidgets, StartProcessExtService.MULTIPLE);
        }

        if (firstUploadWidget) {
            values = { [firstUploadWidget.id]: firstUploadWidget.type === StartProcessExtService.SINGLE ? selectedNodes[0] : selectedNodes };

            selectedNodes.map((node: Node) => {
                node.isLink = firstUploadWidget.link;
            });
        }
        return values;
    }

    private isSingleSelection(): boolean {
        return this.selectedNodes.length === 1;
    }

    private getUploadWidgetByType(contentWidgets: UploadWidgetType[], widgetType: string): UploadWidgetType {
        return contentWidgets.find(({ type }) => type === widgetType);
    }

    private hasContentAttached(): boolean {
        return this.selectedNodes && this.selectedNodes.length > 0;
    }

    onProcessCreation($event): void {
        this.backFromProcessCreation();
        this.showNotification($event);
    }

    onApplicationSelection(selectedApplication: AppDefinitionRepresentation): void {
        this.route.queryParams
            .subscribe((queryParams) => {
                if (!!selectedApplication?.id && selectedApplication.id !== +queryParams['appId']) {
                    void this.router.navigate(['.'], {
                        relativeTo: this.route,
                        queryParams: { appId: selectedApplication.id },
                        replaceUrl: true
                    });
                }
            })
            .unsubscribe();
    }

    private showNotification($event) {
        this.store.dispatch(
            showNotificationOnStartProcessAction({
                appId: ALL_APPS,
                processInstanceName: $event.name,
                processInstance: $event
            })
        );
    }

    backFromProcessCreation(): void {
        this.startProcessExtService.goBackUrl
            .asObservable()
            .pipe(take(1))
            .subscribe((returnUrl) => {
                if (returnUrl) {
                    void this.router.navigateByUrl(returnUrl);
                } else {
                    this.location.back();
                }
            });
    }

    onProcessDefinitionSelection(processDefinition: ProcessDefinitionRepresentation) {
        if (this.hasContentAttached() && processDefinition?.id !== this.selectedProcessDefinitionId) {
            this.selectedProcessDefinitionId = processDefinition.id;
            this.attachSelectedContentOnStartForm(this.selectedProcessDefinitionId);
        }

        this.addProcessNameToQueryParam(processDefinition.name);
    }

    addProcessNameToQueryParam(processName: string) {
        void this.router.navigate(['.'], {
            relativeTo: this.route,
            queryParams: { [PROCESS_DEFINITION_QUERY_PARAM]: processName },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    private observeFormContentClicked(): void {
        this.formService.formContentClicked.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((content: RelatedContentRepresentation) => {
            this.exitedToViewer = true;
            this.store.dispatch(
                new ViewNodeAction(normalizeAlfrescoNodeId(content.sourceId), { path: this.router.url })
            );
        });
    }
}
