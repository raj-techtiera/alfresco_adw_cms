/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';

function _window(): any {
    return window;
}

@Injectable()
export class WindowRef {
    get nativeWindow(): any {
        return _window();
    }
}
