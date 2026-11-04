/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChartOptions } from 'chart.js';

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    datasets: {
        bar: {
            minBarThickness: 10,
            maxBarThickness: 10,
            barPercentage: 0.5,
            categoryPercentage: 0.5,
            borderRadius: {
                topLeft: 5,
                topRight: 5,
                bottomLeft: 0,
                bottomRight: 0
            }
        }
    },
    scales: {
        x: {
            beginAtZero: true,
            offset: true,
            display: true,
            ticks: {
                color: 'rgba(0, 0, 0, 0.5)',
                font: {
                    size: 12,
                    weight: 'lighter',
                    family: 'Open Sans'
                }
            },
            grid: {
                display: false
            },
            border: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            position: 'right',
            ticks: {
                color: 'rgba(0, 0, 0, 0.5)',
                stepSize: 10,
                padding: 10,
                font: {
                    size: 12,
                    weight: 'lighter',
                    family: 'Open Sans'
                }
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.1)',
                tickLength: 0
            },
            border: {
                display: false
            }
        }
    }
} as ChartOptions<'bar'>;

export const getBarChartOptions = (): ChartOptions<'bar'> => {
    return structuredClone(barChartOptions);
};
