import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { ProfileState } from '@alfresco/adf-extensions';
import { Store } from '@ngrx/store';
import { tap } from 'rxjs/operators';
import { SetUserProfileAction } from '@alfresco/aca-shared/store';
import { UserProfileService } from '@alfresco/aca-shared';
import { syncVendorPortalMemberFromProfile } from './vendor-portal-access';

const VENDOR_PORTAL_BODY_CLASS = 'aca-vendor-portal-user';
const EMPTY_PROFILE: ProfileState = {
    id: '',
    userName: '',
    firstName: '',
    lastName: '',
    initials: '',
    isAdmin: false,
    groups: []
};

@Injectable({ providedIn: 'root' })
export class VendorPortalNavRefreshService {
    private readonly destroyRef = inject(DestroyRef);
    private syncInFlight = false;
    /** Incremented on auth boundary changes so old async responses are ignored. */
    private authEpoch = 0;

    constructor(
        private readonly store: Store,
        private readonly authService: AuthenticationService,
        private readonly http: HttpClient,
        private readonly userProfileService: UserProfileService
    ) {
        const setVendorClass = (isVendor: boolean): void => {
            if (typeof document !== 'undefined') {
                document.body.classList.toggle(VENDOR_PORTAL_BODY_CLASS, isVendor);
            }
        };
        const clearDisplayedProfile = (): void => {
            this.store.dispatch(new SetUserProfileAction(EMPTY_PROFILE));
            const profileSubject = (this.userProfileService as any)?.userProfile;
            if (profileSubject?.next) {
                profileSubject.next(EMPTY_PROFILE);
            }
        };

        const syncVendorAndRefresh = (): void => {
            if (this.syncInFlight || !this.authService.isLoggedIn()) {
                return;
            }
            this.syncInFlight = true;
            const epochAtStart = this.authEpoch;

            void syncVendorPortalMemberFromProfile(this.authService, this.http)
                .then((current) => {
                    if (epochAtStart !== this.authEpoch) {
                        return;
                    }
                    setVendorClass(current);
                    void this.userProfileService.loadUserProfile();
                })
                .finally(() => {
                    this.syncInFlight = false;
                });
        };

        this.authService.onLogout.subscribe(() => {
            this.authEpoch++;
            this.syncInFlight = false;
            clearDisplayedProfile();
            setVendorClass(false);
        });

        // Call immediately at login; no placeholder writes and no retry delays.
        this.authService.onLogin
            .pipe(
                tap(() => {
                    this.authEpoch++;
                    this.syncInFlight = false;
                    clearDisplayedProfile();
                    setVendorClass(false);
                    syncVendorAndRefresh();
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();

        this.authService.onTokenReceived
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => syncVendorAndRefresh());

        // One immediate check on startup for already-authenticated sessions.
        if (this.authService.isLoggedIn()) {
            syncVendorAndRefresh();
        } else {
            clearDisplayedProfile();
            setVendorClass(false);
        }
    }
}
