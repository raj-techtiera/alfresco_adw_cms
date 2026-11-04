/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { of } from 'rxjs';
import { BulkAssignHoldResponseEntry, Hold, HoldBulkStatusEntry, HoldEntry, PermissionsInfo } from '@alfresco/js-api';
import { Provider } from '@angular/core';
import { ManageHoldsService } from '../core/components/manage-holds/services/manage-holds.service';

export const manageHoldsServiceMock: Provider = {
    provide: ManageHoldsService,
    useValue: {
        getHoldsPermissions: () => of({} as PermissionsInfo),
        getBulkOperationStatus: () => of({} as HoldBulkStatusEntry),
        getHolds: () => of([] as Hold[]),
        bulkAssignHold: () => of({} as BulkAssignHoldResponseEntry),
        unassignHold: () => of(undefined),
        saveExistingHolds: () => of(''),
        bulkAssignHoldToFolder: () => of({} as BulkAssignHoldResponseEntry),
        bulkSaveNewHoldToFiles: () => of({} as BulkAssignHoldResponseEntry),
        saveNewHoldAndAssign: () => of({} as HoldEntry),
        saveNewHold: () => of({} as HoldEntry),
        bulkSaveNewHoldToFolder: () => of({} as BulkAssignHoldResponseEntry),
    }
};
