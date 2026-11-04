/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/*
 * Public API Surface of adf-governance
 */

export * from './lib/record/record.module';

export * from './lib/record/effects/declare-record.effect';
export * from './lib/record/effects/delete-record.effect';
export * from './lib/record/effects/reject-record.effect';

export * from './lib/record/actions/record.action';

export * from './lib/record/services/record.service';

export * from './lib/record/models/record-capability';

export * from './lib/core/governance-core.module';

export * from './lib/core/services/reload-document-list.service';
export * from './lib/core/services/action.service';
export * from './lib/core/services/bulk-operation.service';
export * from './lib/core/services/bulk-operation-dialog.service';
export * from './lib/core/services/file-plan.service';

export * from './lib/core/rules/site.evaluator';
export * from './lib/core/rules/node.evaluator';

export * from './lib/core/rules/mock/mock-site-data';

export * from './lib/core/model/bulk-operation.model';

export * from './lib/core/components/icon/icon.component';
export * from './lib/core/components/bulk-operation-dialog/bulk-operation-dialog.component';
export * from './lib/record/components/record-icon/record-icon.component';

export * from './lib/core/components/manage-holds/model/legal-hold-capability';

export { isRecordsManagerLegacy } from './lib/core/components/manage-holds/rules/manage-hold.rules';
