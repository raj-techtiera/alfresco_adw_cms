import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { tap } from 'rxjs/operators';
import { syncReportsMemberFromProfile } from './reports-access';

const REPORTS_BODY_CLASS = 'aca-reports-user';

@Injectable({ providedIn: 'root' })
export class ReportsNavRefreshService {
    private readonly destroyRef = inject(DestroyRef);
    private syncInFlight = false;
    private authEpoch = 0;

    constructor(
        private readonly authService: AuthenticationService,
        private readonly http: HttpClient
    ) {
        const setReportsClass = (allowed: boolean): void => {
            if (typeof document !== 'undefined') {
                document.body.classList.toggle(REPORTS_BODY_CLASS, allowed);
            }
        };

        const syncReportsNav = (): void => {
            if (this.syncInFlight || !this.authService.isLoggedIn()) {
                return;
            }
            this.syncInFlight = true;
            const epochAtStart = this.authEpoch;

            void syncReportsMemberFromProfile(this.authService, this.http)
                .then((allowed) => {
                    if (epochAtStart !== this.authEpoch) {
                        return;
                    }
                    setReportsClass(allowed);
                })
                .finally(() => {
                    this.syncInFlight = false;
                });
        };

        this.authService.onLogout.subscribe(() => {
            this.authEpoch++;
            this.syncInFlight = false;
            setReportsClass(false);
        });

        this.authService.onLogin
            .pipe(
                tap(() => {
                    this.authEpoch++;
                    this.syncInFlight = false;
                    setReportsClass(false);
                    syncReportsNav();
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();

        this.authService.onTokenReceived.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncReportsNav());

        if (this.authService.isLoggedIn()) {
            syncReportsNav();
        } else {
            setReportsClass(false);
        }
    }
}
