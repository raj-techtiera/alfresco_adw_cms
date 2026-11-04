import { Component, DestroyRef, OnInit, getDebugNode, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  NotificationModel,
  NotificationService,
  NOTIFICATION_TYPE,
  StorageService
} from '@alfresco/adf-core';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  datetime: Date;
  read: boolean;
  colorClass: string;
  icon: string;
  avatarLetter: string;
  source: NotificationModel;
}

@Component({
  selector: 'acs-notifications',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatExpansionModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly storageService = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Same storage key used by `adf-notification-history` next to the profile menu. */
  private static readonly HISTORY_STORAGE_KEY = 'notification-history';
  private static readonly MAX_STACK = 100;

  filter: 'all' | 'unread' = 'all';
  refreshingNotifications = false;
  notifications: NotificationItem[] = [];

  ngOnInit(): void {
    this.loadFromHistoryStorage();
    this.notificationService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.prependNotification(notification));
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.filter = filter;
  }

  get filteredNotifications(): NotificationItem[] {
    if (this.filter === 'unread') {
      return this.notifications.filter((item) => !item.read);
    }
    return this.notifications;
  }

  get unreadCount(): number {
    return this.notifications.filter((item) => !item.read).length;
  }

  markAllRead(): void {
    this.notifications = [];
    this.storageService.removeItem(NotificationsComponent.HISTORY_STORAGE_KEY);
    this.syncHeaderMarkAsRead();
  }

  onNotificationClick(item: NotificationItem): void {
    const source = item.source;
    if (source?.clickCallBack) {
      try {
        source.clickCallBack(source.args);
      } catch {
        /* callback may be non-serializable after reload from storage */
      }
    }
    item.read = true;
  }

  refreshNotifications(): void {
    this.refreshingNotifications = true;
    this.loadFromHistoryStorage();
    setTimeout(() => {
      this.refreshingNotifications = false;
    }, 400);
  }

  trackByNotificationId(_index: number, item: NotificationItem): string {
    return item.id;
  }

  private loadFromHistoryStorage(): void {
    try {
      const raw = this.storageService.getItem(NotificationsComponent.HISTORY_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as NotificationModel[]) : [];
      this.notifications = (Array.isArray(parsed) ? parsed : []).map((n, index) =>
        this.toItem(n, index)
      );
    } catch {
      this.notifications = [];
    }
  }

  private prependNotification(notification: NotificationModel): void {
    this.notifications = [
      this.toItem(notification, Date.now()),
      ...this.notifications
    ].slice(0, NotificationsComponent.MAX_STACK);
    // History component already persists non-RECURSIVE items; avoid double-write races.
  }

  private toItem(notification: NotificationModel, index: number): NotificationItem {
    const messages = (notification?.messages ?? []).filter(Boolean);
    const message = messages.join(' ') || 'Notification';
    const datetime = notification?.datetime ? new Date(notification.datetime as Date | string) : new Date();
    const type = notification?.type ?? NOTIFICATION_TYPE.INFO;

    return {
      id: `${datetime.getTime()}-${index}-${message.slice(0, 24)}`,
      title: this.titleFor(notification, message),
      message,
      time: this.formatTime(datetime),
      datetime,
      read: false,
      colorClass: this.colorForType(type),
      icon: notification?.icon || this.iconForType(type),
      avatarLetter: this.initials(notification),
      source: notification
    };
  }

  private titleFor(notification: NotificationModel, fallbackMessage: string): string {
    switch (notification?.type) {
      case NOTIFICATION_TYPE.ERROR:
        return 'Error';
      case NOTIFICATION_TYPE.WARN:
        return 'Warning';
      case NOTIFICATION_TYPE.RECURSIVE: {
        const displayName = notification?.initiator?.displayName?.trim();
        return displayName || 'Membership request';
      }
      case NOTIFICATION_TYPE.INFO:
      default:
        // Header shows the message as the primary line.
        return fallbackMessage;
    }
  }

  private colorForType(type: NOTIFICATION_TYPE | string): string {
    switch (type) {
      case NOTIFICATION_TYPE.ERROR:
        return 'nt-dot--red';
      case NOTIFICATION_TYPE.WARN:
        return 'nt-dot--amber';
      case NOTIFICATION_TYPE.RECURSIVE:
        return 'nt-dot--blue';
      default:
        return 'nt-dot--blue';
    }
  }

  private iconForType(type: NOTIFICATION_TYPE | string): string {
    switch (type) {
      case NOTIFICATION_TYPE.ERROR:
        return 'error';
      case NOTIFICATION_TYPE.WARN:
        return 'warning';
      case NOTIFICATION_TYPE.RECURSIVE:
        return 'group_add';
      default:
        return 'info';
    }
  }

  private initials(notification: NotificationModel): string {
    const initiator = notification?.initiator;
    if (!initiator) {
      return '';
    }
    const first = (initiator.firstName ?? '').trim();
    const last = (initiator.lastName ?? '').trim();
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'S';
    }
    const name = (initiator.displayName ?? '').trim();
    if (!name) {
      return 'S';
    }
    // Numeric displayName (e.g. request count) → single letter fallback.
    if (/^\d+$/.test(name)) {
      return name.slice(0, 2);
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  private formatTime(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  /** Clear the sidenav bell badge the same way ADF's mark-as-read does. */
  private syncHeaderMarkAsRead(): void {
    try {
      const host = document.querySelector('adf-notification-history');
      if (!host) {
        return;
      }
      const debug = getDebugNode(host) as { componentInstance?: { markAsRead?: () => void } } | null;
      debug?.componentInstance?.markAsRead?.();
    } catch {
      /* header may not be mounted */
    }
  }
}
