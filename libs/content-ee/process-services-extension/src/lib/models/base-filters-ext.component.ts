/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Input, Output, EventEmitter, Directive } from '@angular/core';
import { UserProcessInstanceFilterRepresentation, UserTaskFilterRepresentation } from '@alfresco/js-api';

@Directive()
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class BaseFiltersExtComponent {
    @Input()
    currentFilter: UserTaskFilterRepresentation | UserProcessInstanceFilterRepresentation;

    @Output()
    filterSelected = new EventEmitter<UserTaskFilterRepresentation | UserProcessInstanceFilterRepresentation>();

    appId = null;
    showIcons = false;
}
