/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartDataset, ChartOptions, registerables } from 'chart.js';
import { IconComponent, LocalizedDatePipe, TranslationService } from '@alfresco/adf-core';
import { TaskListService } from '@alfresco/adf-process-services';
import { TranslatePipe } from '@ngx-translate/core';
import { TaskQueryRepresentation, TaskRepresentation } from '@alfresco/js-api';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { WidgetBaseComponent } from '../widget-base/widget-base.component';
import { BaseChartDirective } from 'ng2-charts';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { TaskState } from '../../../models/task-state';
import { WeeklyTaskData } from '../../../models/weekly-task-data.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getBarChartOptions } from '../../../chart/bar-chart-options';

@Component({
    selector: 'acs-widget-task-history',
    standalone: true,
    imports: [
        CommonModule,
        BaseChartDirective,
        IconComponent,
        TranslatePipe,
        WidgetBaseComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatInputModule,
        MatChipsModule,
        LocalizedDatePipe
    ],
    templateUrl: './widget-task-history.component.html',
    styleUrl: './widget-task-history.component.scss',
    host: {
        class: 'acs-widget-task-history'
    },
    encapsulation: ViewEncapsulation.None
})
export class WidgetTaskHistoryComponent implements OnInit {
    @ViewChild('datepicker') datepicker!: MatDatepicker<Date>;

    private loadingSubject$ = new BehaviorSubject<boolean>(true);
    isLoading$ = this.loadingSubject$.asObservable();
    hasAnyTask = false;
    emptyStateMessage = 'WIDGETS.TASK_SUMMARY.NO_TASKS_ASSIGNED';
    completedTasksPercentage = 0;
    maxDate = new Date();
    monthHasTasks = false;

    datasetTotals = [0, 0, 0];
    chartOptions: ChartOptions<'bar'> = getBarChartOptions();
    chartLabels: string[] = [];
    chartDatasets: ChartDataset<'bar'>[] = [
        {
            label: 'WIDGETS.TASK_SUMMARY.COMPLETED',
            data: [0, 0, 0, 0],
            backgroundColor: '#00754A'
        },
        {
            label: 'WIDGETS.TASK_SUMMARY.INCOMPLETE',
            data: [0, 0, 0, 0],
            backgroundColor: '#4496F4'
        },
        {
            label: 'WIDGETS.TASK_SUMMARY.OVERDUE',
            data: [0, 0, 0, 0],
            backgroundColor: '#FF7B31'
        }
    ];
    chartLegend = false;
    selectedDate = new FormControl(new Date());

    private readonly destroyRef = inject(DestroyRef);
    private readonly SCALE_STEP_SIZES = [5, 10, 25, 50, 100, 250, 500, 1000, 5000];
    private readonly NUMBER_OF_WEEKS = 4;
    private readonly initialChartLabels = [
        'WIDGETS.TASK_HISTORY.WEEK_LABEL',
        'WIDGETS.TASK_HISTORY.WEEK_LABEL',
        'WIDGETS.TASK_HISTORY.WEEK_LABEL',
        'WIDGETS.TASK_HISTORY.WEEK_LABEL'
    ];
    private readonly initialDatasetLabels = [
        'WIDGETS.TASK_SUMMARY.COMPLETED',
        'WIDGETS.TASK_SUMMARY.INCOMPLETE',
        'WIDGETS.TASK_SUMMARY.OVERDUE'
    ];

    constructor(private readonly taskListService: TaskListService,
                private readonly translationService: TranslationService,
                private readonly dateAdapter: DateAdapter<Date, string>) {}

    ngOnInit(): void {
        Chart.register(...registerables);

        this.updateTranslations();

        this.translationService.translate.onLangChange
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.updateTranslations();
            });


        this.selectedDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.selectedDate.value) {
                this.resetChartData();
                this.loadTasks();
            }
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
            size: 2147483647,
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
                } else {
                    this.hasAnyTask = true;
                    const filteredTasks = tasks.data.filter((task) => this.isTaskInSelectedMonth(task));
                    if (filteredTasks.length > 0) {
                        this.monthHasTasks = true;
                        const weeklyTasks: WeeklyTaskData[] = Array.from({ length: this.NUMBER_OF_WEEKS }, () => ({
                            completed: 0,
                            incomplete: 0,
                            overdue: 0
                        }));
                        filteredTasks.forEach((task) => {
                            const taskStates: TaskState[] = this.getTaskStateForEachWeek(task);
                            for (let i = 0; i < this.NUMBER_OF_WEEKS; i++) {
                                if (taskStates[i] === 'completed') {
                                    weeklyTasks[i].completed++;
                                } else if (taskStates[i] === 'overdue') {
                                    weeklyTasks[i].overdue++;
                                } else if (taskStates[i] === 'incomplete') {
                                    weeklyTasks[i].incomplete++;
                                }
                            }
                        });
                        this.updateChartData(weeklyTasks);
                    } else {
                        this.monthHasTasks = false;
                    }
                }
                this.loadingSubject$.next(false);
            });
    }

    setMonthAndYear(date: Date, datepicker: MatDatepicker<Date>): void {
        this.selectedDate.setValue(date);
        datepicker.close();
    }

    openDatePicker(): void {
        this.datepicker.open();
    }

    private updateTranslations(): void {
        this.chartDatasets.forEach((dataset, index) => {
            dataset.label = this.translationService.instant(this.initialDatasetLabels[index]);
        });

        this.chartLabels = this.initialChartLabels.map((label, index) =>
            this.translationService.instant(label) + ' ' + (index + 1)
        );

        this.updateDatePickerLocale();
    }

    private updateChartData(weeklyTasks: WeeklyTaskData[]): void {
        this.chartDatasets[0].data = weeklyTasks.map((week) => week.completed);
        this.chartDatasets[1].data = weeklyTasks.map((week) => week.incomplete);
        this.chartDatasets[2].data = weeklyTasks.map((week) => week.overdue);
        this.updateChartScale();

        const totalCompletedTasks = weeklyTasks.reduce((sum, week) => sum + week.completed, 0);
        let totalIncompleteTasks = 0;
        let totalOverdueTasks = 0;

        for (let i = this.NUMBER_OF_WEEKS - 1; i >= 0; i--) {
            if (this.hasWeekStarted(i)) {
                totalIncompleteTasks = weeklyTasks[i].incomplete;
                totalOverdueTasks = weeklyTasks[i].overdue;
                break;
            }
        }

        this.datasetTotals = [totalCompletedTasks, totalIncompleteTasks, totalOverdueTasks];
        this.completedTasksPercentage = Math.round((totalCompletedTasks / this.datasetTotals.reduce((a, b) => a + b, 0)) * 100) || 0;
    }

    private resetChartData(): void {
        for (let i = 0; i < this.NUMBER_OF_WEEKS; i++) {
            this.chartDatasets[0].data[i] = 0;
            this.chartDatasets[1].data[i] = 0;
            this.chartDatasets[2].data[i] = 0;
        }
        this.datasetTotals = [0, 0, 0];
        this.completedTasksPercentage = 0;
    }

    private hasWeekStarted(weekIndex: number): boolean {
        const now = new Date();
        const selectedYear = this.selectedDate.value.getFullYear();
        const selectedMonth = this.selectedDate.value.getMonth();
        const weekStart = new Date(selectedYear, selectedMonth, weekIndex * 7 + 1);
        return now >= weekStart;
    }

    private getWeekRanges(): Array<{ start: Date; end: Date }> {
        const year = this.selectedDate.value.getFullYear();
        const month = this.selectedDate.value.getMonth();

        return [
            {
                start: new Date(year, month, 1),
                end: new Date(year, month, 7, 23, 59, 59)
            },
            {
                start: new Date(year, month, 8),
                end: new Date(year, month, 14, 23, 59, 59)
            },
            {
                start: new Date(year, month, 15),
                end: new Date(year, month, 21, 23, 59, 59)
            },
            {
                start: new Date(year, month, 22),
                end: new Date(year, month + 1, 0, 23, 59, 59)
            }
        ];
    }

    private isTaskInSelectedMonth(task: any): boolean {
        const selectedDate = this.selectedDate.value;
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const createDate: Date = task.created;
        const endDate: Date | null = task.endDate ? task.endDate : null;
        const monthStart = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

        if (endDate && endDate < monthStart) {
            return false;
        }
        if (createDate > monthEnd) {
            return false;
        }
        return true;
    }

    private updateChartScale(): void {
        const maxValue = Math.max(
            ...(this.chartDatasets[0].data as number[]),
            ...(this.chartDatasets[1].data as number[]),
            ...(this.chartDatasets[2].data as number[])
        );
        const stepNumber = 3;
        let stepSize: number;
        if (maxValue > 0) {
            stepSize = this.SCALE_STEP_SIZES.find((size) => size * stepNumber >= maxValue) ?? this.SCALE_STEP_SIZES[this.SCALE_STEP_SIZES.length - 1];
        }
        this.chartOptions.scales['y'].max = stepSize * stepNumber;
        this.chartOptions.scales['y'].ticks = {
            ...this.chartOptions.scales['y'].ticks,
            stepSize: stepSize
        };
    }

    private getTaskStateForEachWeek(task: TaskRepresentation): TaskState[] {
        const weekRanges = this.getWeekRanges();
        const createdDate: Date = task.created;
        const dueDate: Date | null = task.dueDate ?? null;
        const endDate: Date | null = task.endDate ?? null;
        const taskStates: TaskState[] = Array(this.NUMBER_OF_WEEKS).fill(null);

        for (let i = 0; i < this.NUMBER_OF_WEEKS; i++) {
            if (!this.hasWeekStarted(i)) {
                continue;
            }
            if (createdDate > weekRanges[i].end) {
                continue;
            }
            if (endDate && weekRanges[i].start > endDate) {
                continue;
            }

            if (endDate && endDate >= weekRanges[i].start && endDate <= weekRanges[i].end) {
                taskStates[i] = 'completed';
            } else if (dueDate && dueDate <= weekRanges[i].end) {
                taskStates[i] = 'overdue';
            } else if (createdDate <= weekRanges[i].end) {
                taskStates[i] = 'incomplete';
            }
        }

        return taskStates;
    }

    private updateDatePickerLocale(): void {
        const currentLang = this.translationService.translate.currentLang || this.translationService.translate.defaultLang;
        this.dateAdapter.setLocale(currentLang);
    }
}
