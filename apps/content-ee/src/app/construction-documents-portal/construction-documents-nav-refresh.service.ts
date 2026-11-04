import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { tap } from 'rxjs/operators';
import { syncConstructionDocumentsMemberFromProfile } from './construction-documents-access';

const CONSTRUCTION_DOCUMENTS_BODY_CLASS = 'aca-construction-documents-user';

@Injectable({ providedIn: 'root' })
export class ConstructionDocumentsNavRefreshService {
    private readonly destroyRef = inject(DestroyRef);
    private syncInFlight = false;
    private authEpoch = 0;

    constructor(
        private readonly authService: AuthenticationService,
        private readonly http: HttpClient
    ) {
        const setConstructionClass = (allowed: boolean): void => {
            if (typeof document !== 'undefined') {
                document.body.classList.toggle(CONSTRUCTION_DOCUMENTS_BODY_CLASS, allowed);
            }
        };

        const syncConstructionNav = (): void => {
            if (this.syncInFlight || !this.authService.isLoggedIn()) {
                return;
            }
            this.syncInFlight = true;
            const epochAtStart = this.authEpoch;

            void syncConstructionDocumentsMemberFromProfile(this.authService, this.http)
                .then((allowed) => {
                    if (epochAtStart !== this.authEpoch) {
                        return;
                    }
                    setConstructionClass(allowed);
                })
                .finally(() => {
                    this.syncInFlight = false;
                });
        };

        this.authService.onLogout.subscribe(() => {
            this.authEpoch++;
            this.syncInFlight = false;
            setConstructionClass(false);
        });

        this.authService.onLogin
            .pipe(
                tap(() => {
                    this.authEpoch++;
                    this.syncInFlight = false;
                    setConstructionClass(false);
                    syncConstructionNav();
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();

        this.authService.onTokenReceived.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncConstructionNav());

        if (this.authService.isLoggedIn()) {
            syncConstructionNav();
        } else {
            setConstructionClass(false);
        }
    }
}
