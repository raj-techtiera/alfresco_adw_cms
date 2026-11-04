/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartDataset, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import annotationPlugin from 'chartjs-plugin-annotation';
import { IconComponent, TranslationService } from '@alfresco/adf-core';
import { TaskListService } from '@alfresco/adf-process-services';
import { TranslatePipe } from '@ngx-translate/core';
import { TaskQueryRepresentation } from '@alfresco/js-api';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { WidgetBaseComponent } from '../widget-base/widget-base.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'acs-task-summary',
    standalone: true,
    imports: [CommonModule, BaseChartDirective, IconComponent, TranslatePipe, WidgetBaseComponent],
    templateUrl: './task-summary.component.html',
    styleUrl: './task-summary.component.scss',
    host: {
        class: 'acs-task-summary'
    },
    encapsulation: ViewEncapsulation.None
})
export class TaskSummaryComponent implements OnInit {
    @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

    private loadingSubject$ = new BehaviorSubject<boolean>(true);

    isLoading$ = this.loadingSubject$.asObservable();
    hasAnyTask = false;
    emptyStateMessage = 'WIDGETS.TASK_SUMMARY.NO_TASKS_ASSIGNED';
    completedTasksPercentage = 0;
    chartOptions: ChartOptions<'doughnut'> = {
        cutout: '85%',
        responsive: false,
        plugins: {
            annotation: {
                annotations: {
                    taskSummary: {
                        type: 'label',
                        content: [],
                        position: {
                            x: 'center',
                            y: 'center'
                        },
                        font: [
                            { size: 30, weight: 'bold', family: 'Open Sans' },
                            { size: 15, weight: 'lighter', family: 'Open Sans' }
                        ],
                        xValue: ''
                    }
                }
            }
        }
    };

    chartLabels: string[] = [];
    chartDatasets: ChartDataset<'doughnut'>[] = [
        {
            data: [],
            backgroundColor: ['#00754A', '#4496F4', '#FF7B31']
        }
    ];
    chartLegend = false;


    private currentTaskCount = 0;

    private readonly destroyRef = inject(DestroyRef);
    private readonly initialChartLabels = [
        'WIDGETS.TASK_SUMMARY.COMPLETED',
        'WIDGETS.TASK_SUMMARY.INCOMPLETE',
        'WIDGETS.TASK_SUMMARY.OVERDUE'
    ];

    constructor(private taskListService: TaskListService, private translationService: TranslationService) {}

    ngOnInit(): void {
        Chart.register(annotationPlugin);

        this.updateTranslations();

        this.translationService.translate.onLangChange
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.updateTranslations();
            });

        this.loadTasks();
    }

    loadTasks(): void {
        this.emptyStateMessage = 'WIDGETS.TASK_SUMMARY.NO_TASKS_ASSIGNED';
        this.loadingSubject$.next(true);
        const taskQuery = new TaskQueryRepresentation({
            appDefinitionId: null,
            assignment: 'assignee',
            text: '',
            size: 2147483647, // max integer value in Java,
            includeProcessInstance: false,
            state: 'all'
        });
        this.taskListService
            .findTasksByState(taskQuery)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                catchError(() => {
                    this.emptyStateMessage = 'WIDGETS.TASK_SUMMARY.NO_TASKS_ERROR';
                    return of({ data: [] });
                })
            )
            .subscribe((tasks) => {
                if (tasks.data.length === 0) {
                    this.hasAnyTask = false;
                    this.currentTaskCount = 0;
                } else {
                    let completed = 0;
                    let incomplete = 0;
                    let overdue = 0;
                    this.currentTaskCount = tasks.data.length;

                    this.chartOptions.plugins.annotation.annotations['taskSummary'].content = [
                        tasks.data.length,
                        this.translationService.instant('WIDGETS.TASK_SUMMARY.TASKS')
                    ];
                    tasks.data.forEach((task) => {
                        if (task.endDate) {
                            completed++;
                        } else if (task.dueDate && task.dueDate < new Date()) {
                            overdue++;
                        } else {
                            incomplete++;
                        }
                    });
                    this.completedTasksPercentage = Math.round((completed / tasks.data.length) * 100);
                    this.chartDatasets[0].data = [completed, incomplete, overdue];
                    this.hasAnyTask = true;
                    this.updateTranslations();
                }
                this.loadingSubject$.next(false);
            });
    }

    private updateTranslations(): void {
        this.chartLabels = this.initialChartLabels.map(label =>
            this.translationService.instant(label)
        );

        if (this.hasAnyTask && this.currentTaskCount > 0) {
            this.chartOptions.plugins.annotation.annotations['taskSummary'].content = [
                this.currentTaskCount,
                this.translationService.instant('WIDGETS.TASK_SUMMARY.TASKS')
            ];
        }
    }
}
