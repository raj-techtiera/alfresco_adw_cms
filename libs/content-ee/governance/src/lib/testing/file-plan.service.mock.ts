/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FilePlanService } from '../core/services/file-plan.service';
import { of } from 'rxjs';
import { FilePlanRolePaging } from '@alfresco/js-api';
import { Provider } from '@angular/core';

export const filePlanServiceMock: Provider = {
    provide: FilePlanService,
    useValue: {
        getFilePlanRoles: () => of({} as FilePlanRolePaging)
    }
};
