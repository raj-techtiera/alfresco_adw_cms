import { Injectable } from '@angular/core';

const CREDENTIALS_STORAGE_KEY = 'ALF_LOGIN_CREDENTIALS';

export interface AlfrescoLoginCredentials {
    userId: string;
    password: string;
}

@Injectable({ providedIn: 'root' })
export class AlfrescoLoginCredentialsService {
    save(userId: string, password: string): void {
        const id = userId?.trim();
        if (!id || !password) {
            return;
        }
        try {
            localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify({ userId: id, password }));
        } catch {
            /* ignore quota / private mode */
        }
    }

    clear(): void {
        try {
            localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    }
}
