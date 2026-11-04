/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { Chart, ChartDataset, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { IconComponent, LocalizedDatePipe, TranslationService } from '@alfresco/adf-core';
import { WidgetBaseComponent } from '../widget-base/widget-base.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ProcessService } from '@alfresco/adf-process-services';
import { ProcessInstanceQueryRepresentation, ProcessInstanceRepresentation } from '@alfresco/js-api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MonthlyProcessData } from '../../../models/monthly-process-data.interface';
import { ProcessState } from '../../../models/process-state';
import { PeriodEndMonth } from '../../../models/period-end-month';
import { getBarChartOptions } from '../../../chart/bar-chart-options';

@Component({
    selector: 'acs-widget-process-summary',
    standalone: true,
    imports: [CommonModule, BaseChartDirective, IconComponent, TranslatePipe, WidgetBaseComponent, ReactiveFormsModule, MatChipsModule],
    templateUrl: './widget-process-summary.component.html',
    styleUrl: './widget-process-summary.component.scss',
    host: {
        class: 'acs-widget-process-summary'
    },
    encapsulation: ViewEncapsulation.None
})
export class WidgetProcessSummaryComponent implements OnInit {
    private loadingSubject$ = new BehaviorSubject<boolean>(true);
    isLoading$ = this.loadingSubject$.asObservable();
    hasAnyProcess = false;
    emptyStateMessage = 'WIDGETS.PROCESS_SUMMARY.NO_PROCESSES';
    completedProcessesPercentage = 0;
    selectedPeriod: FormControl<{ year: number; lastPeriodMonth: PeriodEndMonth }>;
    periodStartMonth = '';
    periodEndMonth = '';
    isNextButtonDisabled = false;
    periodHasProcesses = false;

    datasetTotals = [0, 0];
    chartLegend = false;
    chartLabels: string[] = [];
    chartDatasets: ChartDataset<'bar'>[] = [
        {
            label: 'WIDGETS.PROCESS_SUMMARY.COMPLETED',
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: '#00754A'
        },
        {
            label: 'WIDGETS.PROCESS_SUMMARY.RUNNING',
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: '#4496F4'
        }
    ];
    chartOptions: ChartOptions<'bar'> = getBarChartOptions();

    private readonly destroyRef = inject(DestroyRef);
    private readonly SCALE_STEP_SIZES = [5, 10, 25, 50, 100, 250, 500, 1000, 5000];
    private readonly NUMBER_OF_MONTHS = 6;
    private readonly initialDatasetLabels = [
        'WIDGETS.PROCESS_SUMMARY.COMPLETED',
        'WIDGETS.PROCESS_SUMMARY.RUNNING'
    ];

    constructor(
        private processService: ProcessService,
        private localizedDatePipe: LocalizedDatePipe,
        private translationService: TranslationService
    ) {}

    ngOnInit(): void {
        Chart.register(...registerables);

        this.updateTranslations();

        this.translationService.translate.onLangChange
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.updateTranslations();
                this.updatePeriodLabels();
                this.populateChartLabels();
            });

        const year = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const lastPeriodMonth: PeriodEndMonth = currentMonth <= 5 ? 5 : 11;
        this.selectedPeriod = new FormControl<{ year: number; lastPeriodMonth: PeriodEndMonth }>({ year, lastPeriodMonth });

        this.selectedPeriod.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.selectedPeriod.value) {
                this.updatePeriodLabels();
                this.populateChartLabels();
                this.resetChartData();
                this.loadProcesses();
            }
        });

        this.updatePeriodLabels();
        this.populateChartLabels();
        this.loadProcesses();
    }

    loadProcesses(): void {
        this.emptyStateMessage = 'WIDGETS.PROCESS_SUMMARY.NO_PROCESSES';
        this.loadingSubject$.next(true);
        const processQuery: ProcessInstanceQueryRepresentation = {
            appDefinitionId: null,
            size: 2147483647, // max integer value in Java,
            state: 'all'
        };
        this.processService
            .getProcessInstances(processQuery)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                catchError(() => {
                    this.emptyStateMessage = 'WIDGETS.PROCESS_SUMMARY.NO_PROCESSES_ERROR';
                    return of({ data: [] });
                })
            )
            .subscribe((processes) => {
                if (processes.data.length === 0) {
                    this.hasAnyProcess = false;
                } else {
                    this.hasAnyProcess = true;
                    this.periodHasProcesses = true;
                    const filteredProcesses = processes.data.filter((process) => this.isProcessInSelectedPeriod(process));
                    if (filteredProcesses.length > 0) {
                        const monthlyProcesses: MonthlyProcessData[] = Array.from({ length: this.NUMBER_OF_MONTHS }, () => ({
                            running: 0,
                            completed: 0
                        }));
                        filteredProcesses.forEach((process) => {
                            const processStates: ProcessState[] = this.getProcessStateForEachMonth(process);
                            for (let i = 0; i < this.NUMBER_OF_MONTHS; i++) {
                                if (processStates[i] === 'running') {
                                    monthlyProcesses[i].running++;
                                } else if (processStates[i] === 'completed') {
                                    monthlyProcesses[i].completed++;
                                }
                            }
                        });
                        this.updateChartData(monthlyProcesses);
                    } else {
                        this.periodHasProcesses = false;
                    }
                }
                this.loadingSubject$.next(false);
            });
    }

    private updateChartData(monthlyData: MonthlyProcessData[]): void {
        this.chartDatasets[0].data = monthlyData.map((m) => m.completed);
        this.chartDatasets[1].data = monthlyData.map((m) => m.running);
        this.updateChartScale();

        const totalCompletedProcesses = monthlyData.reduce((sum, m) => sum + m.completed, 0);
        let totalRunningProcesses = 0;

        const lastPeriodMonth = this.selectedPeriod.value.lastPeriodMonth;
        for (let i = lastPeriodMonth; i >= lastPeriodMonth - 6; i--) {
            if (this.hasMonthStarted(i)) {
                totalRunningProcesses = monthlyData[i > 5 ? i - 6 : i].running;
                break;
            }
        }

        this.datasetTotals = [totalCompletedProcesses, totalRunningProcesses];
        this.completedProcessesPercentage = Math.round((totalCompletedProcesses / (totalRunningProcesses + totalCompletedProcesses)) * 100) || 0;
    }

    onPrevious(): void {
        const { year, lastPeriodMonth } = this.selectedPeriod.value;
        if (lastPeriodMonth === 5) {
            this.selectedPeriod.setValue({
                year: year - 1,
                lastPeriodMonth: 11
            });
        } else {
            this.selectedPeriod.setValue({
                year: year,
                lastPeriodMonth: 5
            });
        }
    }

    onNext(): void {
        const { year, lastPeriodMonth } = this.selectedPeriod.value;
        if (lastPeriodMonth === 5) {
            this.selectedPeriod.setValue({
                year: year,
                lastPeriodMonth: 11
            });
        } else {
            this.selectedPeriod.setValue({
                year: year + 1,
                lastPeriodMonth: 5
            });
        }
    }

    private updateTranslations(): void {
        this.chartDatasets.forEach((dataset, index) => {
            dataset.label = this.translationService.instant(this.initialDatasetLabels[index]);
        });
    }


    private populateChartLabels(): void {
        this.chartLabels = [];
        const { year, lastPeriodMonth } = this.selectedPeriod.value;
        for (let i = lastPeriodMonth - this.NUMBER_OF_MONTHS + 1; i <= lastPeriodMonth; i++) {
            const localizedMonth = this.localizedDatePipe.transform(new Date(year, i, 1), 'MMM');
            this.chartLabels.push(localizedMonth);
        }
    }

    private updatePeriodLabels(): void {
        const { year, lastPeriodMonth } = this.selectedPeriod.value;
        this.periodStartMonth = this.localizedDatePipe.transform(new Date(year, lastPeriodMonth - 5, 1), 'MMM');
        this.periodEndMonth = this.localizedDatePipe.transform(new Date(year, lastPeriodMonth, 1), 'MMM');
        this.updateNextButtonState();
    }

    private updateNextButtonState(): void {
        const currentDate = new Date();
        const { year, lastPeriodMonth } = this.selectedPeriod.value;
        const periodEnd = new Date(year, lastPeriodMonth + 1, 0);
        this.isNextButtonDisabled = currentDate <= periodEnd;
    }

    private resetChartData(): void {
        for (let i = 0; i < this.NUMBER_OF_MONTHS; i++) {
            this.chartDatasets[0].data[i] = 0;
            this.chartDatasets[1].data[i] = 0;
        }
        this.datasetTotals = [0, 0];
        this.completedProcessesPercentage = 0;
    }

    private hasMonthStarted(month: number): boolean {
        return new Date() >= new Date(this.selectedPeriod.value.year, month, 1);
    }

    private updateChartScale(): void {
        const maxValue = Math.max(...(this.chartDatasets[0].data as number[]), ...(this.chartDatasets[1].data as number[]));
        const stepNumber = 3;
        let stepSize: number;
        if (maxValue > 0) {
            stepSize = this.SCALE_STEP_SIZES.find((size) => size * stepNumber >= maxValue) || this.SCALE_STEP_SIZES[this.SCALE_STEP_SIZES.length - 1];
        }
        this.chartOptions.scales['y'].max = stepSize * stepNumber;
        this.chartOptions.scales['y'].ticks = {
            ...this.chartOptions.scales['y'].ticks,
            stepSize: stepSize
        };
    }

    private isProcessInSelectedPeriod(process: ProcessInstanceRepresentation): boolean {
        const createdDate = process.started;
        const endDate: Date | null = process.ended ? process.ended : null;
        const { year, lastPeriodMonth } = this.selectedPeriod.value;
        const periodEnd = new Date(year, lastPeriodMonth + 1, 0);
        const periodStart = new Date(year, lastPeriodMonth - this.NUMBER_OF_MONTHS + 1, 1);

        if (endDate && endDate < periodStart) {
            return false;
        }
        if (createdDate > periodEnd) {
            return false;
        }
        return true;
    }

    private getProcessStateForEachMonth(process: ProcessInstanceRepresentation): ProcessState[] {
        const monthRanges = this.getMonthRanges();
        const processStates: ProcessState[] = Array(this.NUMBER_OF_MONTHS).fill(null);
        const createdDate = process.started;
        const endDate: Date | null = process.ended ? process.ended : null;

        for (let i = 0; i < this.NUMBER_OF_MONTHS; i++) {
            const monthRange = monthRanges[i];

            if (!this.hasMonthStarted(monthRange.start.getMonth())) {
                continue;
            }
            if (createdDate > monthRange.end) {
                continue;
            }
            if (endDate && endDate < monthRange.start) {
                continue;
            }

            if (endDate && endDate >= monthRange.start && endDate <= monthRange.end) {
                processStates[i] = 'completed';
            } else if (createdDate <= monthRange.end) {
                processStates[i] = 'running';
            }
        }

        return processStates;
    }

    private getMonthRanges(): { start: Date; end: Date }[] {
        const { year, lastPeriodMonth } = this.selectedPeriod.value;
        const monthRanges: { start: Date; end: Date }[] = [];

        for (let i = 0; i < this.NUMBER_OF_MONTHS; i++) {
            const monthIndex = lastPeriodMonth - this.NUMBER_OF_MONTHS + 1 + i;
            const start = new Date(year, monthIndex, 1);
            const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
            monthRanges.push({ start, end });
        }

        return monthRanges;
    }
}
