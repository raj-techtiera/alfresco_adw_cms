/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TaskRepresentation } from '@alfresco/js-api';

export const mockedTasks: TaskRepresentation[] = [
    {id: '11', name: 'test 11', endDate: new Date(), duration: 11} as TaskRepresentation,
    {id: '22', name: 'test 22', duration: 100} as TaskRepresentation,
    {id: '33', name: 'test 33', duration: 200} as TaskRepresentation,
    {id: '44', name: 'test 44', endDate: new Date(), duration: 400} as TaskRepresentation
];

export const mockedHistoryTasks: TaskRepresentation[] = [
    {id: '1', name: 'created in May, completed in June', endDate: new Date('2025-06-01'), created: new Date('2025-05-01')} as TaskRepresentation,
    {id: '2', name: 'created in June, completed in June', endDate: new Date('2025-06-02'), created: new Date('2025-06-01')} as TaskRepresentation,
    {id: '3', name: 'created in May', endDate: null, dueDate: null, created: new Date('2025-05-05')} as TaskRepresentation,
    {id: '4', name: 'created in June', endDate: null, dueDate: null, created: new Date('2025-06-01')} as TaskRepresentation,
    {id: '5', name: 'created in May, due in May', endDate: null, dueDate: new Date('2025-05-02'), created: new Date('2025-05-01')} as TaskRepresentation,
    {id: '6', name: 'created in May, due in June', endDate: null, dueDate: new Date('2025-06-01'), created: new Date('2025-05-01')} as TaskRepresentation,
    {id: '7', name: 'created in June, due in June', endDate: null, dueDate: new Date('2025-06-02'), created: new Date('2025-06-01')} as TaskRepresentation,
    {id: '8', name: 'created in May, completed in May', endDate: new Date('2025-05-02'), created: new Date('2025-05-01')} as TaskRepresentation,
    {
        id: '9',
        name: 'created in May, due in May, completed in May',
        endDate: new Date('2025-05-03'),
        dueDate: new Date('2025-05-02'),
        created: new Date('2025-05-01')
    } as TaskRepresentation,
    {
        id: '10',
        name: 'created in June, due in June, completed in June',
        endDate: new Date('2025-06-03'),
        dueDate: new Date('2025-06-02'),
        created: new Date('2025-06-01')
    } as TaskRepresentation,
    {
        id: '11',
        name: 'created in May week 1, completed in May week 2',
        endDate: new Date('2025-05-09'),
        dueDate: new Date('2025-05-08'),
        created: new Date('2025-05-01')
    } as TaskRepresentation,
    {
        id: '12',
        name: 'created in May week 2, completed in May week 4',
        endDate: new Date('2025-05-23'),
        dueDate: new Date('2025-05-22'),
        created: new Date('2025-05-08')
    } as TaskRepresentation,
    {
        id: '13',
        name: 'created in May week 1, due in May week 3, completed in May week 4',
        endDate: new Date('2025-05-22'),
        dueDate: new Date('2025-05-15'),
        created: new Date('2025-05-01')
    } as TaskRepresentation
];
