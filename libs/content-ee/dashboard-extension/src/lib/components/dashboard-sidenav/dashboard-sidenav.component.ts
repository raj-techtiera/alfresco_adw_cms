/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewEncapsulation, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'adw-dashboard-sidenav',
    standalone: true,
    imports: [TranslatePipe, RouterModule],
    templateUrl: './dashboard-sidenav.component.html',
    styleUrl: './dashboard-sidenav.component.scss',
    host: { class: 'adw-dashboard-sidenav' },
    encapsulation: ViewEncapsulation.None
})
export class DashboardSidenavComponent {
    private readonly router = inject(Router);

    navigateDashboard(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        const path = this.router.url.split('?')[0].split('#')[0].toLowerCase();
        if (!path.includes('/dms-dashboard')) {
            void this.router.navigateByUrl('/dms-dashboard');
        }
    }
}
