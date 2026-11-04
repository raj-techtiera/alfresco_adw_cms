/*
 * Copyright Â© 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DOCUMENT } from '@angular/common';
import {
    afterNextRender,
    ApplicationRef,
    Component,
    ComponentRef,
    createComponent,
    DestroyRef,
    ElementRef,
    EnvironmentInjector,
    inject,
    Injector,
    Input,
    OnInit,
    Renderer2,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthenticationService, StorageService } from '@alfresco/adf-core';
import { ProfileState } from '@alfresco/adf-extensions';
import { AppService, UserProfileService } from '@alfresco/aca-shared';
import { MatIconRegistry } from '@angular/material/icon';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { animationFrameScheduler, fromEvent, Subscription, timer } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FooterComponent } from '../../../../libs/content-ee/dashboard-extension/src/lib/components/Footer/Footer.component';

const NAV_SECTION_ANIMATION_MS = 300;

@Component({
    selector: 'adw-nav-collapsible-section',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'adw-nav-collapsible-section',
        '[class.adw-nav-collapsible-section--expanded]': 'expanded',
        '[class.adw-nav-collapsible-section--collapsed]': '!expanded',
        '[class.adw-nav-collapsible-section--animating]': 'animating',
        '[class.adw-nav-collapsible-section--active]': 'active',
        '[attr.data-adw-nav-section]': 'sectionId',
        '[attr.data-adw-user-collapsed]': 'userCollapsed ? "true" : null'
    },
    template: `
        <button type="button" class="adw-nav-collapsible-section__header" [attr.aria-expanded]="expanded" (click)="toggle($event)">
            <span class="adw-nav-collapsible-section__leading">
                <span [class]="iconClass" aria-hidden="true"></span>
                <span class="adw-nav-collapsible-section__title">{{ title }}</span>
            </span>
            <span class="adw-nav-collapsible-section__chevron" aria-hidden="true"></span>
        </button>
        <div class="adw-nav-collapsible-section__body">
            <div #bodyInner class="adw-nav-collapsible-section__body-inner"></div>
        </div>
    `
})
export class NavCollapsibleSectionComponent implements OnInit {
    @Input({ required: true }) sectionId = '';
    @Input({ required: true }) title = '';

    @ViewChild('bodyInner', { static: true })
    readonly bodyInner!: ElementRef<HTMLElement>;

    private readonly storage = inject(StorageService);

    expanded = true;
    animating = false;
    active = false;
    userCollapsed = false;

    get iconClass(): string {
        return `adw-nav-section-icon adw-nav-section-icon--${this.sectionId}`;
    }

    private get storageKey(): string {
        return `adw-nav-section-${this.sectionId}-expanded`;
    }

    ngOnInit(): void {
        const stored = this.storage.getItem(this.storageKey);
        this.expanded = stored === null ? true : stored === 'true';
    }

    toggle(event: Event): void {
        event.stopPropagation();
        this.expanded = !this.expanded;
        this.animating = true;
        this.userCollapsed = !this.expanded;
        this.storage.setItem(this.storageKey, String(this.expanded));
        timer(NAV_SECTION_ANIMATION_MS).subscribe(() => {
            this.animating = false;
        });
    }

    syncActive(hasActiveChild: boolean): void {
        const wasActive = this.active;
        this.active = hasActiveChild;
        if (hasActiveChild && !wasActive && !this.userCollapsed) {
            this.expanded = true;
        }
        if (!hasActiveChild) {
            this.userCollapsed = false;
        }
    }
}

const queryElement = <T extends Element = HTMLElement>(root: ParentNode, selector: string): T | null =>
    root.querySelector<T>(selector);

const queryElements = <T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] =>
    Array.from(root.querySelectorAll<T>(selector));

const closestElement = <T extends Element = HTMLElement>(el: Element, selector: string): T | null =>
    el.closest<T>(selector);

let appRenderer: Renderer2;
let appRef: ApplicationRef;
let appEnvironmentInjector: EnvironmentInjector;
const navSectionRefs = new Map<string, ComponentRef<NavCollapsibleSectionComponent>>();

const createHtmlElement = <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] =>
    appRenderer.createElement(tagName) as HTMLElementTagNameMap[K];

const addCssClass = (el: Element | null | undefined, ...classNames: string[]): void => {
    if (!el) {
        return;
    }
    for (const className of classNames) {
        appRenderer.addClass(el, className);
    }
};

const removeCssClass = (el: Element | null | undefined, ...classNames: string[]): void => {
    if (!el) {
        return;
    }
    for (const className of classNames) {
        appRenderer.removeClass(el, className);
    }
};

const toggleCssClass = (el: Element | null | undefined, className: string, enabled: boolean): void => {
    if (!el) {
        return;
    }
    if (enabled) {
        appRenderer.addClass(el, className);
    } else {
        appRenderer.removeClass(el, className);
    }
};

const toggleBodyClass = (doc: Document, className: string, enabled: boolean): void => {
    toggleCssClass(doc.body, className, enabled);
};

const setAttr = (el: Element, name: string, value: string): void => {
    appRenderer.setAttribute(el, name, value);
};

const removeAttr = (el: Element, name: string): void => {
    appRenderer.removeAttribute(el, name);
};

const setText = (el: Element, value: string): void => {
    appRenderer.setProperty(el, 'textContent', value);
};

const appendNode = (parent: Element, child: Node): void => {
    appRenderer.appendChild(parent, child);
};

const insertBeforeElement = (anchor: Element, node: Node): void => {
    const parent = anchor.parentElement;
    if (parent) {
        appRenderer.insertBefore(parent, node, anchor);
    }
};

const insertAfterElement = (anchor: Element, node: Node): void => {
    const parent = anchor.parentElement;
    if (parent) {
        appRenderer.insertBefore(parent, node, anchor.nextSibling);
    }
};

const removeNode = (el: Element): void => {
    const parent = el.parentNode;
    if (parent) {
        appRenderer.removeChild(parent, el);
    }
};

const setCssStyle = (el: Element, property: string, value: string): void => {
    if (value === '') {
        appRenderer.removeStyle(el, property);
        return;
    }
    appRenderer.setStyle(el, property, value);
};

const listen = (el: Element, eventName: string, handler: (event: Event) => void): void => {
    appRenderer.listen(el, eventName, handler);
};

const setClassName = (el: Element, className: string): void => {
    appRenderer.setProperty(el, 'className', className);
};

const computedStyleOf = (node: Element): CSSStyleDeclaration =>
    (node.ownerDocument.defaultView ?? globalThis).getComputedStyle(node);

const hasCssClass = (el: Element, className: string): boolean => el.classList.contains(className);

const hasAttr = (el: Element, name: string): boolean => el.hasAttribute(name);

const matchesSelector = (el: Element, selector: string): boolean => el.matches(selector);

const isHtmlElement = (node: EventTarget | Node | null | undefined): node is HTMLElement =>
    node instanceof HTMLElement;

const childrenOf = (el: Element): Element[] => Array.from(el.children);

const classNamesOf = (el: Element): string[] => Array.from(el.classList);

/** Capture-phase listener (Renderer2.listen is bubble-only). */
const listenCapture = (el: Element, eventName: string, handler: (event: Event) => void): Subscription =>
    fromEvent(el, eventName, { capture: true }).subscribe(handler);

const scheduleTimeout = (handler: () => void, delayMs: number): Subscription => timer(delayMs).subscribe(handler);

const scheduleFrame = (handler: () => void): Subscription => animationFrameScheduler.schedule(handler);

const cancelScheduled = (handle: Subscription | null): void => {
    handle?.unsubscribe();
};

const canObserveMutations = (): boolean => typeof MutationObserver !== 'undefined';

const observeMutations = (
    target: Node,
    options: MutationObserverInit,
    callback: MutationCallback
): MutationObserver => {
    const observer = new MutationObserver(callback);
    observer.observe(target, options);
    return observer;
};

const resolveSidenavProfile = (
    doc: Document,
    profile: ProfileState | null
): { name: string; email: string } => {
    const menuName = queryElement(doc, '#identity-full-name')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const menuEmail = queryElement(doc, '#identity-email')?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const name =
        profile?.userName?.trim() ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
        menuName;
    const email = profile?.email?.trim() || menuEmail;

    return { name, email };
};

const syncSidenavProfileMeta = (doc: Document, profile: ProfileState | null): void => {
    const { name } = resolveSidenavProfile(doc, profile);

    for (const userMenu of queryElements<HTMLElement>(doc, '.aca-sidenav-header aca-user-menu')) {
        const button = queryElement<HTMLButtonElement>(userMenu, '.aca-user-menu-button');
        if (!button) {
            continue;
        }

        addCssClass(userMenu, 'adw-sidenav-profile');

        let meta = queryElement<HTMLElement>(userMenu, '.adw-sidenav-profile-meta');
        if (!meta) {
            meta = createHtmlElement('div');
            setClassName(meta, 'adw-sidenav-profile-meta');
            const nameEl = createHtmlElement('span');
            setClassName(nameEl, 'adw-sidenav-profile-meta__name');
            appendNode(meta, nameEl);
            insertAfterElement(button, meta);

            if (!queryElement(userMenu, '.adw-sidenav-profile-chevron')) {
                const chevron = createHtmlElement('span');
                setClassName(chevron, 'adw-sidenav-profile-chevron');
                setAttr(chevron, 'aria-hidden', 'true');
                insertAfterElement(meta, chevron);
            }

            if (!hasAttr(meta, 'data-adw-bound')) {
                setAttr(meta, 'data-adw-bound', 'true');
                listen(meta, 'click', () => button.click());
            }
        }

        queryElements(meta, '.adw-sidenav-profile-meta__email').forEach((el) => removeNode(el));

        const nameEl = queryElement(meta, '.adw-sidenav-profile-meta__name');
        if (nameEl) {
            setText(nameEl, name);
        }

        toggleCssClass(meta, 'adw-sidenav-profile-meta--empty', !name);
    }
};

const isDashboardRoute = (url: string): boolean => {
    const path = url.split('?')[0].split('#')[0].toLowerCase();
    const trimmed = path.replace(/\/+$/, '') || '/';
    return trimmed === '/dms-dashboard' || trimmed.endsWith('/dms-dashboard');
};

const isWorkflowProcessOrTaskRoute = (url: string): boolean => {
    const path = url.split('?')[0].split('#')[0].toLowerCase();
    return /\/apps\/[^/]+\/(processes|tasks)\//.test(path);
};

const isTrashcanRoute = (url: string): boolean => {
    const path = url.split('?')[0].split('#')[0].toLowerCase();
    const trimmed = path.replace(/\/+$/, '') || '/';
    return trimmed.endsWith('/trashcan') || trimmed.includes('/trashcan/');
};

const isWorkflowFileNavRoute = (url: string): boolean => {
    const path = url.split('?')[0].split('#')[0].toLowerCase();
    const trimmed = path.replace(/\/+$/, '') || '/';
    return (
        trimmed.endsWith('/recent-files') ||
        trimmed.includes('/recent-files/') ||
        trimmed.endsWith('/favorites') ||
        trimmed.includes('/favorites/') ||
        trimmed.endsWith('/shared') ||
        trimmed.includes('/shared-files') ||
        isTrashcanRoute(url)
    );
};

/** Keep a single workflow highlight: files routes vs APS task/process filters. */
const syncWorkflowNavSelectionVisual = (doc: Document, router: Router): void => {
    const workflowSection = queryElement<HTMLElement>(doc, '[data-adw-nav-section="workflow-management"]');
    if (!workflowSection) {
        return;
    }

    const processOrTask = isWorkflowProcessOrTaskRoute(router.url);
    const fileNav = isWorkflowFileNavRoute(router.url);

    for (const el of queryElements<HTMLElement>(workflowSection, '.adw-nav-active-suppressed')) {
        removeCssClass(el, 'adw-nav-active-suppressed');
    }

    for (const btn of queryElements<HTMLElement>(workflowSection, '.aca-action-button--active')) {
        if (processOrTask || !fileNav) {
            addCssClass(btn, 'adw-nav-active-suppressed');
        }
    }

    for (const entry of queryElements<HTMLElement>(workflowSection, '.adf-filters__entry.adf-active')) {
        if (fileNav || !processOrTask) {
            addCssClass(entry, 'adw-nav-active-suppressed');
        }
    }
};

const NAV_SUB_ICON_BY_LABEL: Readonly<Record<string, string>> = {
    'my tasks': 'adw-nav-sub-icon--my-tasks',
    'overdue tasks': 'adw-nav-sub-icon--overdue-tasks',
    'unassigned tasks': 'adw-nav-sub-icon--unassigned-tasks',
    'completed tasks': 'adw-nav-sub-icon--completed-tasks',
    running: 'adw-nav-sub-icon--running',
    completed: 'adw-nav-sub-icon--completed',
    all: 'adw-nav-sub-icon--all',
    'manage searches': 'adw-nav-sub-icon--manage-searches'
};

const NAV_SUB_ICON_CLASSES = ['adw-nav-sub-icon', ...Object.values(NAV_SUB_ICON_BY_LABEL)];

const resolveNavSubIconClass = (label: string): string | undefined => {
    const exact = NAV_SUB_ICON_BY_LABEL[label];
    if (exact) {
        return exact;
    }

    for (const [key, className] of Object.entries(NAV_SUB_ICON_BY_LABEL)) {
        if (label.startsWith(`${key} `)) {
            return className;
        }
    }

    return undefined;
};

interface NavCollapsibleSection {
    id: string;
    title: string;
    automationIds: readonly string[];
}

const destroyNavSectionRef = (sectionId: string): void => {
    const ref = navSectionRefs.get(sectionId);
    if (!ref) {
        return;
    }
    appRef.detachView(ref.hostView);
    ref.destroy();
    navSectionRefs.delete(sectionId);
};

const NAV_COLLAPSIBLE_SECTIONS: readonly NavCollapsibleSection[] = [
    {
        id: 'portfolio-management',
        title: 'Portfolio Management',
        automationIds: ['app.navbar.create-project', 'app.navbar.document-management', 'app.navbar.business-units', 'app.navbar.geographic-overview']
    },
    {
        id: 'performance',
        title: 'Performance',
        automationIds: ['app.navbar.kpi-dashboard', 'app.navbar.dms-dashboard', 'app.navbar.reports', 'app.navbar.intelligence-center']
    },
    {
        id: 'governance',
        title: 'Governance',
        automationIds: [
            // 'app.navbar.compliance',
            // 'app.navbar.master-data',
            'app.navbar.tags-workspace',
            // 'app.navbar.audit-log',
            'app.navbar.notifications'
        ]
    },
    {
        id: 'administration',
        title: 'Administration',
        automationIds: [
            // 'app.navbar.team-resources',
            // 'app.navbar.project-team',
            'app.navbar.settings',
            'app.navbar.doc-numbering-settings',
            // 'app.navbar.onboarding',
            // 'app.navbar.billing',
            // 'app.navbar.branding',
            // 'app.navbar.data-migration',
            // 'app.navbar.administration-hub',
            // 'app.navbar.ai-usage-intelligence',
            'app.navbar.user-management'
            // 'app.navbar.hr-management'
        ]
    },
    {
        id: 'vendor-management',
        title: 'Vendor Management',
        automationIds: ['app.navbar.vendor-document-creation']
    },
    {
        id: 'construction-documents',
        title: 'Construction Documents',
        automationIds: ['app.navbar.construction-documents']
    },
    {
        id: 'workflow-management',
        title: 'Workflow Management',
        automationIds: []
    },
    // {
    //     id: 'asset-management',
    //     title: 'Asset Management',
    //     automationIds: ['app.navbar.assets-dashboard']
    // }
];

const WORKFLOW_NAV_AUTOMATION_IDS: readonly string[] = [
    'app.navbar.recentFiles',
    'app.navbar.favorites',
    'app.navbar.shared',
    'app.navbar.trashcan'
];

const NAV_ROW_SELECTOR = '.aca-expansion-panel-item, .aca-sidenav__section__actions__item';

/** Built-in Files entries hidden by product policy â€” row must not appear in the icon rail. */
const POLICY_HIDDEN_NAV_AUTOMATION_IDS: readonly string[] = [
    'app.navbar.personalFiles',
    'app.navbar.libraries.files',
    'app.navbar.libraries.favorite',
    'app.navbar.libraries.all'
];

const isPolicyHiddenNavRow = (el: HTMLElement): boolean =>
    POLICY_HIDDEN_NAV_AUTOMATION_IDS.some((automationId) => !!queryElement(el, `[data-automation-id="${automationId}"]`));

/** Nav rows hidden via body class until Activiti profile resolves (vendor-portal / reports refresh services). */
const PERMISSION_GATED_NAV_AUTOMATION_IDS: readonly string[] = [
    'app.navbar.vendor-document-creation',
    'app.navbar.construction-documents',
    'app.navbar.reports'
];

const isPermissionGatedNavRow = (el: HTMLElement): boolean =>
    PERMISSION_GATED_NAV_AUTOMATION_IDS.some(
        (automationId) =>
            matchesSelector(el, `[data-automation-id="${automationId}"]`) ||
            !!queryElement(el, `[data-automation-id="${automationId}"]`)
    );

/** Material outlined set may not include newer ligatures â€” render a custom SVG in the rail instead. */
const NAV_RAIL_FALLBACK_ICON_BY_AUTOMATION_ID: Readonly<Record<string, string>> = {
    'app.navbar.administration-hub': 'adw-nav-rail-fallback-icon--admin-hub'
};

const NAV_RAIL_FALLBACK_ICON_CLASSES = [
    'adw-nav-rail-fallback-icon',
    ...Object.values(NAV_RAIL_FALLBACK_ICON_BY_AUTOMATION_ID)
];

const isCollapsedNavSectionBody = (el: HTMLElement): boolean =>
    hasCssClass(el, 'adw-nav-collapsible-section__body') ||
    hasCssClass(el, 'adw-nav-collapsible-section__body-inner');

const getNavSectionBody = (wrapper: HTMLElement): HTMLElement | null =>
    queryElement<HTMLElement>(wrapper, '.adw-nav-collapsible-section__body');

const ensureNavSectionBodyInner = (wrapper: HTMLElement): HTMLElement => {
    const body = getNavSectionBody(wrapper);
    if (!body) {
        throw new Error('Nav section body is missing');
    }

    let inner = queryElement<HTMLElement>(body, '.adw-nav-collapsible-section__body-inner');
    if (!inner) {
        inner = createHtmlElement('div');
        setClassName(inner, 'adw-nav-collapsible-section__body-inner');
        while (body.firstChild) {
            appendNode(inner, body.firstChild);
        }
        appendNode(body, inner);
    }

    return inner;
};

const isRowInNavSectionBody = (body: HTMLElement, row: HTMLElement): boolean => {
    const inner = queryElement<HTMLElement>(body, '.adw-nav-collapsible-section__body-inner');
    return inner?.contains(row) || body.contains(row);
};

/** Hidden for access control / CSS hide rules â€” not when only inside a collapsed group body. */
const isNavHiddenForGrouping = (node: HTMLElement): boolean => {
    const style = computedStyleOf(node);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
        return false;
    }
    return !isCollapsedNavSectionBody(node);
};

const isNavElementVisible = (el: HTMLElement): boolean => {
    if (!el.isConnected) {
        return false;
    }

    let node: HTMLElement | null = el;
    while (node) {
        if (isNavHiddenForGrouping(node)) {
            return false;
        }
        node = node.parentElement;
    }

    return true;
};

const isNavRowIntrinsicallyHidden = (el: HTMLElement): boolean => {
    if (!el.isConnected) {
        return true;
    }

    if (isNavHiddenForGrouping(el)) {
        return true;
    }

    let node = el.parentElement;
    while (node) {
        if (isCollapsedNavSectionBody(node)) {
            break;
        }
        if (isNavHiddenForGrouping(node)) {
            return true;
        }
        node = node.parentElement;
    }

    return false;
};

const hasVisibleNavContent = (el: HTMLElement): boolean => {
    if (matchesSelector(el, NAV_ROW_SELECTOR) && isPolicyHiddenNavRow(el)) {
        return false;
    }

    if (isNavElementVisible(el)) {
        return true;
    }

    for (const row of queryElements<HTMLElement>(el, NAV_ROW_SELECTOR)) {
        if (isPolicyHiddenNavRow(row)) {
            continue;
        }
        if (isNavElementVisible(row)) {
            return true;
        }
    }

    for (const entry of queryElements<HTMLElement>(el, '.adf-filters__entry, .adf-filter-action-button')) {
        if (isNavElementVisible(entry)) {
            return true;
        }
    }

    return false;
};

const shouldIncludeNavRowInSection = (row: HTMLElement): boolean => {
    if (isPolicyHiddenNavRow(row)) {
        return false;
    }
    return hasVisibleNavContent(row) || isPermissionGatedNavRow(row);
};

const resolveNavRowFromAnchor = (anchor: Element): HTMLElement | null => {
    if (isHtmlElement(anchor) && matchesSelector(anchor, NAV_ROW_SELECTOR)) {
        return anchor;
    }

    const fromSelector = closestElement<HTMLElement>(anchor, NAV_ROW_SELECTOR);
    if (fromSelector) {
        return fromSelector;
    }

    const panel = closestElement<HTMLElement>(anchor, '.aca-expansion-panel, mat-expansion-panel');
    if (panel) {
        return panel;
    }

    if (isHtmlElement(anchor) && matchesSelector(anchor, '.aca-action-button')) {
        const parent = anchor.parentElement;
        if (isHtmlElement(parent)) {
            return matchesSelector(parent, NAV_ROW_SELECTOR) ? parent : parent;
        }
    }

    return isHtmlElement(anchor) ? anchor : null;
};

const findNavRow = (sidenav: ParentNode, automationId: string): HTMLElement | null => {
    const anchor =
        queryElement(sidenav, `[data-automation-id="${automationId}"]`) ??
        queryElement(sidenav, `[id="${automationId}"]`);
    return anchor ? resolveNavRowFromAnchor(anchor) : null;
};

const normalizeNavLabel = (value: string | null | undefined): string =>
    (value || '')
        .replace(/\s+/g, ' ')
        .replace(/\u00a0/g, ' ')
        .trim()
        .toLowerCase();

const isDashboardNavRow = (el: HTMLElement): boolean =>
    hasCssClass(el, 'adw-top-dashboard-row') ||
    hasCssClass(el, 'adw-dashboard-sidenav') ||
    matchesSelector(el, '.adw-dashboard-sidenav-link') ||
    !!queryElement(el, '.adw-top-dashboard-label, .adw-dashboard-sidenav-link');

const applyDashboardNavMarkers = (doc: Document, router: Router): void => {
    const labelSelectors = 'span, a, button, .aca-action-button__label, .mdc-button__label';
    const isInnermostDashboardLabel = (el: HTMLElement): boolean => {
        const label = normalizeNavLabel(el.textContent);
        if (label !== 'dashboard' && label !== 'dms dashboard') {
            return false;
        }

        return !queryElements<HTMLElement>(el, labelSelectors).some(
            (child) => child !== el && (normalizeNavLabel(child.textContent) === 'dashboard' || normalizeNavLabel(child.textContent) === 'dms dashboard')
        );
    };

    for (const sidenav of queryElements(doc, '.aca-sidenav')) {
        for (const link of queryElements<HTMLElement>(sidenav, '.adw-dashboard-sidenav-link')) {
            removeCssClass(link, 'adw-top-dashboard-label');

            for (const el of queryElements<HTMLElement>(link, labelSelectors)) {
                if (isInnermostDashboardLabel(el)) {
                    addCssClass(el, 'adw-top-dashboard-label');
                    break;
                }
            }

            removeCssClass(link, 'adw-top-dashboard-row', 'adw-top-dashboard-row--active');
            toggleCssClass(link, 'adw-dashboard-sidenav-selected', isDashboardRoute(router.url));
            const host = closestElement<HTMLElement>(link, '.adw-dashboard-sidenav');
            removeCssClass(host, 'adw-top-dashboard-row--active');
            const row = closestElement<HTMLElement>(link, '.aca-sidenav__section__actions__item');
            removeCssClass(row, 'adw-top-dashboard-row--active');
        }

        for (const el of queryElements<HTMLElement>(sidenav, `.aca-sidenav ${labelSelectors}`)) {
            if (closestElement(el, '.adw-dashboard-sidenav-link')) {
                continue;
            }
            if (!isInnermostDashboardLabel(el)) {
                continue;
            }
            if (queryElement(el, 'mat-icon, adf-icon, svg')) {
                continue;
            }

            addCssClass(el, 'adw-top-dashboard-label');
            const row = closestElement<HTMLElement>(el, '.aca-sidenav__section__actions__item, .adw-dashboard-sidenav');
            if (row) {
                addCssClass(row, 'adw-top-dashboard-row');
                const hasCustomLink = !!queryElement(row, '.adw-dashboard-sidenav-link');
                toggleCssClass(row, 'adw-top-dashboard-row--active', !hasCustomLink && isDashboardRoute(router.url));
            }
            const dashboardLink = closestElement<HTMLElement>(el, '.adw-dashboard-sidenav-link');
            toggleCssClass(dashboardLink, 'adw-dashboard-sidenav-selected', isDashboardRoute(router.url));
        }
    }
};

const isManageSearchesNavRow = (el: HTMLElement): boolean => {
    if (hasCssClass(el, 'adw-nav-sub-icon--manage-searches') || queryElement(el, '.adw-nav-sub-icon--manage-searches')) {
        return true;
    }

    const labelCandidates = [
        el.getAttribute('data-automation-id'),
        queryElement(el, '.aca-action-button__label')?.textContent,
        queryElement(el, '.action-button__label')?.textContent,
        queryElement(el, '.mdc-button__label')?.textContent,
        queryElement(el, '[data-automation-id="adf-filter-label"]')?.textContent
    ];

    return labelCandidates.some((value) => normalizeNavLabel(value).startsWith('manage searches'));
};

const isSavedSearchesNavRow = (el: HTMLElement): boolean => {
    if (isManageSearchesNavRow(el)) {
        return true;
    }
    if (hasCssClass(el, 'adw-saved-searches-label') || queryElement(el, '.adw-saved-searches-label')) {
        return true;
    }
    const panel = closestElement(el, '.aca-expansion-panel, mat-expansion-panel');
    if (!panel) {
        return false;
    }
    const headerLabel = queryElement(panel, '.aca-expansion-panel-header .aca-action-button__label')?.textContent;
    return normalizeNavLabel(headerLabel).startsWith('saved searches');
};

const resolveSavedSearchesContainer = (panel: HTMLElement): HTMLElement => {
    const accordion = closestElement(panel, 'mat-accordion');
    if (isHtmlElement(accordion)) {
        const panels = queryElements(accordion, '.aca-expansion-panel, mat-expansion-panel');
        if (panels.length === 1) {
            return accordion;
        }
    }

    return panel;
};

const collectManageSearchesContainers = (sidenav: Element): HTMLElement[] => {
    const candidates: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    const add = (el: HTMLElement | null | undefined): void => {
        if (!el || seen.has(el)) {
            return;
        }
        seen.add(el);
        candidates.push(el);
    };

    for (const panel of queryElements<HTMLElement>(sidenav, '.aca-expansion-panel, mat-expansion-panel')) {
        if (isSavedSearchesPanel(panel)) {
            add(resolveSavedSearchesContainer(panel));
        }
    }

    for (const marker of queryElements<HTMLElement>(sidenav, '.adw-nav-sub-icon--manage-searches')) {
        const panel = closestElement<HTMLElement>(marker, '.aca-expansion-panel, mat-expansion-panel');
        if (panel) {
            add(resolveSavedSearchesContainer(panel));
            continue;
        }

        const row =
            closestElement<HTMLElement>(marker, NAV_ROW_SELECTOR) ??
            closestElement<HTMLElement>(marker, '.aca-expansion-panel-item, .adf-filters__entry, .adf-filter-action-button');
        add(row);
    }

    for (const label of queryElements<HTMLElement>(sidenav, '.aca-action-button__label, .mdc-button__label, [data-automation-id="adf-filter-label"]')) {
        if (!normalizeNavLabel(label.textContent).startsWith('manage searches')) {
            continue;
        }

        const panel = closestElement<HTMLElement>(label, '.aca-expansion-panel, mat-expansion-panel');
        if (panel) {
            add(resolveSavedSearchesContainer(panel));
            continue;
        }

        const row =
            closestElement<HTMLElement>(label, NAV_ROW_SELECTOR) ??
            closestElement<HTMLElement>(label, '.aca-expansion-panel-item, .adf-filters__entry, .adf-filter-action-button');
        add(row);
    }

    for (const actions of queryElements<HTMLElement>(sidenav, '.aca-sidenav__section__actions')) {
        const visibleItems = queryElements<HTMLElement>(actions, NAV_ROW_SELECTOR).filter(isNavElementVisible);
        if (visibleItems.length > 0 && visibleItems.every(isManageSearchesNavRow)) {
            add(actions);
        }
    }

    return candidates.filter(
        (candidate, index, all) =>
            !all.some((other, otherIndex) => otherIndex !== index && other.contains(candidate) && other !== candidate)
    );
};

const repositionStandaloneNavItems = (sidenav: Element): void => {
    const section = queryElement(sidenav, '.aca-sidenav__section');
    if (!section) {
        return;
    }

    queryElements(sidenav, '.adw-manage-searches-nav-footer').forEach((el) => {
        removeCssClass(el, 'adw-manage-searches-nav-footer');
    });

    queryElements(sidenav, '.adw-dashboard-sidenav--pinned-top, .adw-top-dashboard-row--pinned-top').forEach((el) => {
        removeCssClass(el, 'adw-dashboard-sidenav--pinned-top', 'adw-top-dashboard-row--pinned-top');
    });

    const dashboardContainer = queryElement<HTMLElement>(sidenav, '.adw-dashboard-sidenav');
    if (dashboardContainer && isNavElementVisible(dashboardContainer)) {
        addCssClass(dashboardContainer, 'adw-dashboard-sidenav--pinned-top');
    } else {
        const dashboardRow = queryElements<HTMLElement>(sidenav, NAV_ROW_SELECTOR).find(isDashboardNavRow);
        if (dashboardRow && isNavElementVisible(dashboardRow)) {
            addCssClass(dashboardRow, 'adw-top-dashboard-row--pinned-top');
        }
    }

    const pinManageSearchesFooter = (footer: HTMLElement): void => {
        addCssClass(footer, 'adw-manage-searches-nav-footer');
        // Reparent the Angular host (not its inner panel) so it stays at the bottom
        // without breaking component bindings on the Manage searches action.
        appendNode(section, footer);
    };

    const saveSearchHost = queryElement<HTMLElement>(sidenav, 'aca-save-search-sidenav');
    if (saveSearchHost && (isNavElementVisible(saveSearchHost) || hasVisibleNavContent(saveSearchHost))) {
        pinManageSearchesFooter(saveSearchHost);
        return;
    }

    const containers = collectManageSearchesContainers(sidenav).filter(
        (container) => isNavElementVisible(container) || hasVisibleNavContent(container)
    );

    for (const container of containers) {
        const host = closestElement<HTMLElement>(container, 'aca-save-search-sidenav');
        if (host) {
            pinManageSearchesFooter(host);
            return;
        }

        if (container.parentElement === section) {
            pinManageSearchesFooter(container);
        }
    }
};

const DASHBOARD_ROUTE_URL = '/dms-dashboard';
const MANAGE_SEARCHES_ROUTE_URL = '/saved-searches';
const MANAGE_SEARCHES_AUTOMATION_ID = 'manage-saved-searches';

const isManageSearchesRoute = (doc: Document, url: string): boolean => {
    const path = url.split('?')[0].split('#')[0].toLowerCase();
    const trimmed = path.replace(/\/+$/, '') || '/';
    if (trimmed.endsWith('/saved-searches') || trimmed.includes('/saved-searches/')) {
        return true;
    }

    const hash = (doc.location?.hash ?? '').toLowerCase();
    return hash.includes('/saved-searches');
};

const isManageSearchesNavButton = (el: HTMLElement): boolean =>
    matchesSelector(el, `[data-automation-id="${MANAGE_SEARCHES_AUTOMATION_ID}"]`) ||
    !!closestElement(el, `[data-automation-id="${MANAGE_SEARCHES_AUTOMATION_ID}"]`);

const bindDashboardNavClickHandlers = (doc: Document, router: Router): void => {
    for (const link of queryElements<HTMLElement>(doc, '.adw-dashboard-sidenav-link')) {
        if (hasAttr(link, 'data-adw-dashboard-click-bound')) {
            continue;
        }

        setAttr(link, 'data-adw-dashboard-click-bound', 'true');
        listenCapture(link, 'click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!isDashboardRoute(router.url)) {
                void router.navigateByUrl(DASHBOARD_ROUTE_URL);
            }
        });
    }
};

const syncManageSearchesNavSelectionVisual = (doc: Document, router: Router): void => {
    const active = isManageSearchesRoute(doc, router.url);

    if (active) {
        for (const section of queryElements<HTMLElement>(doc, '[data-adw-nav-section]')) {
            removeCssClass(section, 'adw-nav-collapsible-section--active');
        }

        for (const el of queryElements<HTMLElement>(doc, '.aca-sidenav .aca-action-button--active, .aca-sidenav .adf-filters__entry.adf-active')) {
            if (!isManageSearchesNavButton(el)) {
                addCssClass(el, 'adw-nav-active-suppressed');
            }
        }
    }

    const applyActiveState = (button: HTMLElement | null | undefined, row: HTMLElement | null | undefined): void => {
        toggleCssClass(button, 'aca-action-button--active', active);
        toggleCssClass(button, 'adw-manage-searches-selected', active);
        removeCssClass(button, 'adw-nav-active-suppressed');
        toggleCssClass(row, 'adw-manage-searches-row--active', active);
    };

    for (const button of queryElements<HTMLElement>(doc, `[data-automation-id="${MANAGE_SEARCHES_AUTOMATION_ID}"]`)) {
        applyActiveState(
            button,
            closestElement<HTMLElement>(button, '.aca-expansion-panel-item, .aca-sidenav__section__actions__item')
        );
    }

    for (const row of queryElements<HTMLElement>(doc, NAV_ROW_SELECTOR).filter(isManageSearchesNavRow)) {
        applyActiveState(queryElement<HTMLElement>(row, '.aca-action-button, .adf-filter-action-button'), row);
    }

    for (const footer of queryElements<HTMLElement>(doc, '.adw-manage-searches-nav-footer')) {
        toggleCssClass(footer, 'adw-manage-searches-footer--active', active);
    }
};

const ensureManageSearchesNavDelegation = (doc: Document, router: Router): void => {
    for (const sidenav of queryElements<HTMLElement>(doc, '.aca-sidenav')) {
        if (hasAttr(sidenav, 'data-adw-manage-searches-delegated')) {
            continue;
        }

        setAttr(sidenav, 'data-adw-manage-searches-delegated', 'true');
        listenCapture(sidenav, 'click', (event) => {
            const target = event.target;
            if (!isHtmlElement(target)) {
                return;
            }

            const manageButton = closestElement<HTMLElement>(target, `[data-automation-id="${MANAGE_SEARCHES_AUTOMATION_ID}"]`);
            const manageRow = closestElement<HTMLElement>(target, NAV_ROW_SELECTOR);
            if (!manageButton && !(manageRow && isManageSearchesNavRow(manageRow))) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            if (!isManageSearchesRoute(doc, router.url)) {
                void router.navigateByUrl(MANAGE_SEARCHES_ROUTE_URL).then(() => {
                    syncManageSearchesNavSelectionVisual(doc, router);
                });
            } else {
                syncManageSearchesNavSelectionVisual(doc, router);
            }
        });
    }
};

const isVendorDocumentNavRow = (el: HTMLElement): boolean =>
    !!queryElement(el, '[data-automation-id="app.navbar.vendor-document-creation"]');

const isAssignedToOtherNavSection = (el: HTMLElement): boolean =>
    !!closestElement(el, '[data-adw-nav-section]:not([data-adw-nav-section="workflow-management"])');

const isSavedSearchesPanel = (panel: HTMLElement): boolean => {
    const headerLabel = queryElement(panel, '.aca-expansion-panel-header .aca-action-button__label')?.textContent;
    return normalizeNavLabel(headerLabel).startsWith('saved searches');
};

const addWorkflowRow = (rows: HTMLElement[], seen: Set<HTMLElement>, el: HTMLElement | null | undefined): void => {
    if (
        !el ||
        seen.has(el) ||
        !hasVisibleNavContent(el) ||
        isAssignedToOtherNavSection(el) ||
        isVendorDocumentNavRow(el) ||
        isDashboardNavRow(el) ||
        isSavedSearchesNavRow(el)
    ) {
        return;
    }

    if (matchesSelector(el, '.aca-expansion-panel, mat-expansion-panel') && isSavedSearchesPanel(el)) {
        return;
    }

    for (const existing of seen) {
        if (existing !== el && existing.contains(el)) {
            return;
        }
    }

    for (const existing of [...seen]) {
        if (el.contains(existing)) {
            seen.delete(existing);
            const index = rows.indexOf(existing);
            if (index >= 0) {
                rows.splice(index, 1);
            }
        }
    }

    seen.add(el);
    rows.push(el);
};

const collectWorkflowManagementRows = (sidenav: Element): HTMLElement[] => {
    const rows: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    const add = (el: HTMLElement | null | undefined): void => addWorkflowRow(rows, seen, el);

    for (const automationId of WORKFLOW_NAV_AUTOMATION_IDS) {
        add(findNavRow(sidenav, automationId));
    }

    const processManagement = queryElement<HTMLElement>(sidenav, '#processmanagement');
    if (processManagement && hasVisibleNavContent(processManagement)) {
        add(processManagement);
    } else {
        const processHost = queryElement<HTMLElement>(sidenav, 'aps-sidenav-ext');
        if (processHost && hasVisibleNavContent(processHost)) {
            add(processHost);
        }
    }

    return rows;
};

const releaseHiddenNavSectionChildren = (sectionRoot: Element, body: HTMLElement): void => {
    const bodyHost = queryElement<HTMLElement>(body, '.adw-nav-collapsible-section__body-inner') ?? body;

    for (const child of childrenOf(bodyHost)) {
        if (!isHtmlElement(child) || hasVisibleNavContent(child)) {
            continue;
        }

        if (matchesSelector(child, NAV_ROW_SELECTOR) && isPolicyHiddenNavRow(child)) {
            addCssClass(child, 'adw-nav-rail-skip');
            continue;
        }

        appendNode(sectionRoot, child);
    }
};

const finalizeNavSectionWrapper = (sidenav: Element, wrapper: HTMLElement): void => {
    const sectionRoot = queryElement(sidenav, '.aca-sidenav__section');
    const body = getNavSectionBody(wrapper);
    if (!sectionRoot || !body) {
        return;
    }

    releaseHiddenNavSectionChildren(sectionRoot, body);

    const bodyHost = queryElement<HTMLElement>(body, '.adw-nav-collapsible-section__body-inner') ?? body;
    const hasGroupedChildren = childrenOf(bodyHost).some(
        (child) =>
            isHtmlElement(child) &&
            (!isNavRowIntrinsicallyHidden(child) || isPermissionGatedNavRow(child))
    );

    if (!hasGroupedChildren) {
        const sectionId = wrapper.getAttribute('data-adw-nav-section');
        if (sectionId) {
            destroyNavSectionRef(sectionId);
        }
        if (wrapper.isConnected) {
            removeNode(wrapper);
        }
        return;
    }

    setCssStyle(wrapper, 'display', '');
};

const collectRowsForNavSection = (
    sidenav: Element,
    section: NavCollapsibleSection,
    extraRows: HTMLElement[] = []
): HTMLElement[] => {
    const rows: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    const add = (row: HTMLElement | null | undefined): void => {
        if (!row || seen.has(row) || !row.isConnected) {
            return;
        }
        if (isPolicyHiddenNavRow(row)) {
            return;
        }
        if (!isNavElementVisible(row) && !isPermissionGatedNavRow(row)) {
            return;
        }
        seen.add(row);
        rows.push(row);
    };

    for (const automationId of section.automationIds) {
        add(findNavRow(sidenav, automationId));
    }

    for (const row of extraRows) {
        if (!isDashboardNavRow(row) && !isSavedSearchesNavRow(row)) {
            add(row);
        }
    }

    const existing = queryElement(sidenav, `[data-adw-nav-section="${section.id}"]`);
    if (existing) {
        for (const row of queryElements<HTMLElement>(existing, NAV_ROW_SELECTOR)) {
            add(row);
        }
        for (const panel of queryElements<HTMLElement>(existing, '.aca-expansion-panel, mat-expansion-panel, #processmanagement, aps-sidenav-ext')) {
            add(panel);
        }
    }

    return rows;
};

const appendToSidenavSection = (sidenav: Element, child: Node): void => {
    const section = queryElement(sidenav, '.aca-sidenav__section');
    if (section) {
        appendNode(section, child);
    }
};

const insertVendorManagementWrapper = (sidenav: Element, wrapper: HTMLElement, anchor: HTMLElement | null): void => {
    const administrationSection = queryElement(sidenav, '[data-adw-nav-section="administration"]');
    if (administrationSection?.parentElement) {
        insertAfterElement(administrationSection, wrapper);
        return;
    }

    if (anchor?.parentElement) {
        insertBeforeElement(anchor, wrapper);
        return;
    }

    appendToSidenavSection(sidenav, wrapper);
};

const insertConstructionDocumentsWrapper = (sidenav: Element, wrapper: HTMLElement, anchor: HTMLElement | null): void => {
    const vendorSection = queryElement(sidenav, '[data-adw-nav-section="vendor-management"]');
    if (vendorSection?.parentElement) {
        insertAfterElement(vendorSection, wrapper);
        return;
    }

    const administrationSection = queryElement(sidenav, '[data-adw-nav-section="administration"]');
    if (administrationSection?.parentElement) {
        insertAfterElement(administrationSection, wrapper);
        return;
    }

    if (anchor?.parentElement) {
        insertBeforeElement(anchor, wrapper);
        return;
    }

    appendToSidenavSection(sidenav, wrapper);
};

const insertWorkflowManagementWrapper = (sidenav: Element, wrapper: HTMLElement): void => {
    const after =
        queryElement(sidenav, '[data-adw-nav-section="portfolio-management"]') ??
        findNavRow(sidenav, 'app.navbar.create-project');
    if (after) {
        if (after.nextElementSibling !== wrapper) {
            insertAfterElement(after, wrapper);
        }
        return;
    }
    const dashboard = findNavRow(sidenav, 'app.navbar.dashboard');
    if (dashboard && dashboard.nextElementSibling !== wrapper) {
        insertAfterElement(dashboard, wrapper);
    }
};

const insertAssetManagementWrapper = (sidenav: Element, wrapper: HTMLElement, anchor: HTMLElement | null): void => {
    const constructionSection = queryElement(sidenav, '[data-adw-nav-section="construction-documents"]');
    if (constructionSection?.parentElement) {
        insertAfterElement(constructionSection, wrapper);
        return;
    }

    if (anchor?.parentElement) {
        insertBeforeElement(anchor, wrapper);
        return;
    }

    appendToSidenavSection(sidenav, wrapper);
};

const createNavSectionWrapper = (section: NavCollapsibleSection): HTMLElement => {
    const existingRef = navSectionRefs.get(section.id);
    if (existingRef) {
        return existingRef.location.nativeElement;
    }

    const ref = createComponent(NavCollapsibleSectionComponent, {
        environmentInjector: appEnvironmentInjector
    });
    ref.setInput('sectionId', section.id);
    ref.setInput('title', section.title);
    appRef.attachView(ref.hostView);
    ref.changeDetectorRef.detectChanges();
    navSectionRefs.set(section.id, ref);
    return ref.location.nativeElement;
};

const syncNavCollapsibleSection = (doc: Document, sidenav: Element, section: NavCollapsibleSection, extraRows: HTMLElement[] = []): void => {
    const rows = collectRowsForNavSection(sidenav, section, extraRows);

    const existing = queryElement<HTMLElement>(sidenav, `[data-adw-nav-section="${section.id}"]`);

    if (rows.length === 0) {
        if (existing) {
            finalizeNavSectionWrapper(sidenav, existing);
        }
        return;
    }

    let wrapper = existing;
    if (wrapper && !navSectionRefs.has(section.id)) {
        removeNode(wrapper);
        wrapper = null;
    }
    if (!wrapper) {
        // The sidenav was re-rendered by ACA: drop the stale component (and the
        // old rows it still holds) instead of re-inserting it next to new rows.
        const staleRef = navSectionRefs.get(section.id);
        if (staleRef) {
            const staleHost: HTMLElement = staleRef.location.nativeElement;
            destroyNavSectionRef(section.id);
            if (staleHost.isConnected) {
                removeNode(staleHost);
            }
        }
        wrapper = createNavSectionWrapper(section);
        if (section.id === 'vendor-management') {
            insertVendorManagementWrapper(sidenav, wrapper, rows[0] ?? null);
        } else if (section.id === 'construction-documents') {
            insertConstructionDocumentsWrapper(sidenav, wrapper, rows[0] ?? null);
        } else if (section.id === 'asset-management') {
            insertAssetManagementWrapper(sidenav, wrapper, rows[0] ?? null);
        } else if (section.id !== 'workflow-management') {
            insertBeforeElement(rows[0], wrapper);
        }
    }
    if (section.id === 'workflow-management') {
        insertWorkflowManagementWrapper(sidenav, wrapper);
    }

    const body = getNavSectionBody(wrapper);
    if (!body) {
        return;
    }

    const bodyHost = ensureNavSectionBodyInner(wrapper);
    const isAnimating = hasCssClass(wrapper, 'adw-nav-collapsible-section--animating');

    for (const row of rows) {
        if (!shouldIncludeNavRowInSection(row) || isRowInNavSectionBody(body, row)) {
            continue;
        }
        if (isAnimating) {
            continue;
        }
        appendNode(bodyHost, row);
    }

    finalizeNavSectionWrapper(sidenav, wrapper);
};

let navSectionSyncFrame: Subscription | null = null;
let sidenavMutationObserver: MutationObserver | null = null;
let sidenavMutationTarget: Element | null = null;
let sidenavSyncInProgress = false;
let sidenavSyncPausedUntil = 0;
let sidenavDeferredEnhancementTimer: Subscription | null = null;
let sidenavRefreshDebounceTimer: Subscription | null = null;
let afterRenderSidenavCoalesceFrame: Subscription | null = null;

const SIDENAV_HOVER_TRANSITION_MS = 200;

const isSidenavHoverTransitionActive = (): boolean => Date.now() < sidenavSyncPausedUntil;

const pauseSidenavEnhancementsForTransition = (): void => {
    sidenavSyncPausedUntil = Date.now() + SIDENAV_HOVER_TRANSITION_MS + 32;
};

const queueDeferredSidenavEnhancement = (
    doc: Document,
    router: Router,
    profile: ProfileState | null
): void => {
    if (sidenavDeferredEnhancementTimer !== null) {
        cancelScheduled(sidenavDeferredEnhancementTimer);
    }

    sidenavDeferredEnhancementTimer = scheduleTimeout(() => {
        sidenavDeferredEnhancementTimer = null;
        sidenavSyncPausedUntil = 0;
        // Re-run full enhancements (icons / flatten / manage-searches) â€” not only
        // collapsible wrappers. First hover after load often lands during APS DOM
        // paint; skipping this left Manage searches / Tasks misaligned until the
        // next NavigationEnd.
        scheduleAppShellDomEnhancements(doc, router, profile);
        scheduleNavCollapsibleSectionsSync(doc, router, profile, { force: true });
    }, SIDENAV_HOVER_TRANSITION_MS + 32);
};

const ensureSidenavTransitionGuards = (
    doc: Document,
    router: Router,
    getProfile: () => ProfileState | null
): void => {
    const drawer = queryElement(doc, '.adf-layout-container-sidenav');
    if (!drawer || hasAttr(drawer, 'data-adw-transition-bound')) {
        return;
    }

    setAttr(drawer, 'data-adw-transition-bound', 'true');

    const onTransitionBoundary = (): void => {
        pauseSidenavEnhancementsForTransition();
        queueDeferredSidenavEnhancement(doc, router, getProfile());
    };

    listen(drawer, 'mouseenter', onTransitionBoundary);
    listen(drawer, 'mouseleave', onTransitionBoundary);

    listen(drawer, 'transitionend', (event) => {
        const transitionEvent = event as TransitionEvent;
        if (event.target !== drawer || transitionEvent.propertyName !== 'width') {
            return;
        }
        sidenavSyncPausedUntil = 0;
        scheduleAppShellDomEnhancements(doc, router, getProfile());
        scheduleNavCollapsibleSectionsSync(doc, router, getProfile(), { force: true });
    });
};

const hasStructuralSidenavMutation = (records: MutationRecord[]): boolean =>
    records.some(
        (record) => record.type === 'childList' && (record.addedNodes.length > 0 || record.removedNodes.length > 0)
    );

const scheduleCoalescedSidenavEnhancement = (
    doc: Document,
    router: Router,
    profile: ProfileState | null,
    enhance: () => void
): void => {
    if (isSidenavHoverTransitionActive()) {
        queueDeferredSidenavEnhancement(doc, router, profile);
        return;
    }

    if (afterRenderSidenavCoalesceFrame !== null) {
        return;
    }

    afterRenderSidenavCoalesceFrame = scheduleFrame(() => {
        afterRenderSidenavCoalesceFrame = null;
        if (isSidenavHoverTransitionActive()) {
            queueDeferredSidenavEnhancement(doc, router, profile);
            return;
        }
        enhance();
        scheduleNavCollapsibleSectionsSync(doc, router, profile);
    });
};

const scheduleNavCollapsibleSectionsSync = (
    doc: Document,
    router: Router,
    profile: ProfileState | null = null,
    options: { force?: boolean } = {}
): void => {
    if (!options.force && isSidenavHoverTransitionActive()) {
        queueDeferredSidenavEnhancement(doc, router, profile);
        return;
    }

    if (navSectionSyncFrame !== null) {
        cancelScheduled(navSectionSyncFrame);
    }

    navSectionSyncFrame = scheduleFrame(() => {
        navSectionSyncFrame = null;
        if (!options.force && isSidenavHoverTransitionActive()) {
            queueDeferredSidenavEnhancement(doc, router, profile);
            return;
        }

        sidenavSyncInProgress = true;
        try {
            syncNavCollapsibleSections(doc, router);
            applyDashboardNavMarkers(doc, router);
            syncManageSearchesNavSelectionVisual(doc, router);
            syncSidenavProfileMeta(doc, profile);
        } finally {
            sidenavSyncInProgress = false;
        }
    });
};

const PERMISSION_GATED_BODY_CLASSES: readonly string[] = [
    'aca-vendor-portal-user',
    'aca-reports-user',
    'aca-construction-documents-user'
];

const setupSidenavRefreshTriggers = (
    doc: Document,
    router: Router,
    destroyRef: DestroyRef,
    authService: AuthenticationService,
    getProfile: () => ProfileState | null
): void => {
    let refreshFrame: Subscription | null = null;

    const scheduleRefresh = (): void => {
        if (sidenavSyncInProgress) {
            return;
        }

        // Don't drop structural updates that arrive while the hover width
        // transition is running â€” queue a full enhancement after it settles.
        if (isSidenavHoverTransitionActive()) {
            queueDeferredSidenavEnhancement(doc, router, getProfile());
            return;
        }

        if (sidenavRefreshDebounceTimer !== null) {
            cancelScheduled(sidenavRefreshDebounceTimer);
        }

        sidenavRefreshDebounceTimer = scheduleTimeout(() => {
            sidenavRefreshDebounceTimer = null;
            if (sidenavSyncInProgress) {
                return;
            }
            if (isSidenavHoverTransitionActive()) {
                queueDeferredSidenavEnhancement(doc, router, getProfile());
                return;
            }

            if (refreshFrame !== null) {
                cancelScheduled(refreshFrame);
            }

            refreshFrame = scheduleFrame(() => {
                refreshFrame = null;
                const sidenav = queryElement(doc, '.aca-sidenav');
                if (sidenav && sidenavMutationTarget !== sidenav) {
                    sidenavMutationObserver?.disconnect();
                    sidenavMutationObserver = observeMutations(sidenav, { childList: true, subtree: true }, (records) => {
                        if (sidenavSyncInProgress) {
                            return;
                        }
                        if (isSidenavHoverTransitionActive()) {
                            queueDeferredSidenavEnhancement(doc, router, getProfile());
                            return;
                        }
                        if (!hasStructuralSidenavMutation(records)) {
                            return;
                        }
                        scheduleRefresh();
                    });
                    sidenavMutationTarget = sidenav;
                }
                ensureSidenavTransitionGuards(doc, router, getProfile);
                scheduleAppShellDomEnhancements(doc, router, getProfile());
                scheduleNavCollapsibleSectionsSync(doc, router, getProfile());
            });
        }, 100);
    };

    if (canObserveMutations()) {
        const bodyObserver = observeMutations(
            doc.body,
            { attributes: true, attributeFilter: ['class'], attributeOldValue: true },
            (records) => {
                const permissionClassChanged = records.some((record) => {
                    if (record.type !== 'attributes' || record.attributeName !== 'class') {
                        return false;
                    }
                    const previous = (record.oldValue ?? '').split(/\s+/).filter(Boolean);
                    const current = classNamesOf(doc.body);
                    return PERMISSION_GATED_BODY_CLASSES.some(
                        (className) => previous.includes(className) !== current.includes(className)
                    );
                });
                if (permissionClassChanged) {
                    scheduleRefresh();
                }
            }
        );
        destroyRef.onDestroy(() => bodyObserver.disconnect());
    }

    destroyRef.onDestroy(() => {
        sidenavMutationObserver?.disconnect();
        sidenavMutationObserver = null;
        sidenavMutationTarget = null;
        cancelScheduled(sidenavDeferredEnhancementTimer);
        sidenavDeferredEnhancementTimer = null;
        cancelScheduled(sidenavRefreshDebounceTimer);
        sidenavRefreshDebounceTimer = null;
        cancelScheduled(afterRenderSidenavCoalesceFrame);
        afterRenderSidenavCoalesceFrame = null;
    });

    authService.onLogin.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => scheduleRefresh());
    authService.onTokenReceived.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => scheduleRefresh());

    router.events
        .pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(destroyRef)
        )
        .subscribe(() => scheduleRefresh());

    scheduleRefresh();
};

const applyNavRailFallbackIcons = (sidenav: Element): void => {
    queryElements(sidenav, NAV_RAIL_FALLBACK_ICON_CLASSES.map((c) => `.${c}`).join(', ')).forEach((el) => {
        for (const className of NAV_RAIL_FALLBACK_ICON_CLASSES) {
            removeCssClass(el, className);
        }
    });

    for (const [automationId, iconClass] of Object.entries(NAV_RAIL_FALLBACK_ICON_BY_AUTOMATION_ID)) {
        for (const anchor of queryElements(sidenav, `[data-automation-id="${automationId}"]`)) {
            const row = closestElement<HTMLElement>(anchor, NAV_ROW_SELECTOR);
            const host = (row ? queryElement<HTMLElement>(row, '.aca-action-button') : null) ?? row;
            addCssClass(host, 'adw-nav-rail-fallback-icon', iconClass);
        }
    }
};

const syncCollapsedNavRailMarkers = (sidenav: Element): void => {
    queryElements(sidenav, '.adw-nav-rail-skip').forEach((el) => removeCssClass(el, 'adw-nav-rail-skip'));

    for (const row of queryElements<HTMLElement>(sidenav, NAV_ROW_SELECTOR)) {
        if (isDashboardNavRow(row) || hasCssClass(row, 'adw-manage-searches-nav-footer') || isManageSearchesNavRow(row)) {
            continue;
        }

        if (isPolicyHiddenNavRow(row)) {
            addCssClass(row, 'adw-nav-rail-skip');
            continue;
        }

        if (isNavRowIntrinsicallyHidden(row)) {
            addCssClass(row, 'adw-nav-rail-skip');
            continue;
        }

        const hasPseudoIcon = !!queryElement(row, '.adw-top-dashboard-label, .adw-nav-sub-icon, .adw-nav-rail-fallback-icon');
        const hasMatIcon = !!queryElement(row, '.mat-icon, adf-icon, svg');

        if (!hasPseudoIcon && !hasMatIcon) {
            addCssClass(row, 'adw-nav-rail-skip');
        }
    }

    for (const title of queryElements<HTMLElement>(sidenav, '.aps-filters-title')) {
        if (!queryElement(title, '.mat-icon, .adw-nav-sub-icon, .adw-nav-rail-fallback-icon')) {
            addCssClass(title, 'adw-nav-rail-skip');
        }
    }

    for (const panel of queryElements<HTMLElement>(sidenav, '.aca-expansion-panel, mat-expansion-panel')) {
        const hasVisibleRow = queryElements<HTMLElement>(panel, NAV_ROW_SELECTOR).some(
            (row) => !hasCssClass(row, 'adw-nav-rail-skip')
        );
        const hasVisibleFilter = queryElements<HTMLElement>(panel, '.adf-filters__entry, .adf-filter-action-button').some((entry) => !hasCssClass(entry, 'adw-nav-rail-skip') && isNavElementVisible(entry));

        if (!hasVisibleRow && !hasVisibleFilter) {
            addCssClass(panel, 'adw-nav-rail-skip');
        }
    }
};

const syncNavSectionActiveState = (doc: Document): void => {
    const activeChildSelector =
        '.aca-action-button--active:not(.adw-nav-active-suppressed), .adf-filters__entry.adf-active:not(.adw-nav-active-suppressed)';

    for (const section of NAV_COLLAPSIBLE_SECTIONS) {
        const ref = navSectionRefs.get(section.id);
        const host = ref?.location.nativeElement ?? queryElement(doc, `[data-adw-nav-section="${section.id}"]`);
        if (!host) {
            continue;
        }
        const hasActiveChild = !!queryElement(host, activeChildSelector);
        if (ref) {
            ref.instance.syncActive(hasActiveChild);
            ref.changeDetectorRef.detectChanges();
            continue;
        }
        toggleCssClass(host, 'adw-nav-collapsible-section--active', hasActiveChild);
    }
};

const forceExpandAsyncSidenavPanels = (sidenav: Element): void => {
    const panels = queryElements<HTMLElement>(sidenav, [
            '#processmanagement',
            '#processmanagement.mat-expansion-panel',
            'aca-save-search-sidenav .mat-expansion-panel',
            'aca-save-search-sidenav .aca-expansion-panel',
            'aca-save-search-sidenav mat-expansion-panel'
        ].join(', '));

    for (const panel of panels) {
        addCssClass(panel, 'mat-expanded');
        removeCssClass(panel, 'mat-collapsed');
        setAttr(panel, 'aria-expanded', 'true');

        for (const header of queryElements<HTMLElement>(panel, '.mat-expansion-panel-header, .aca-expansion-panel-header')) {
            setAttr(header, 'aria-expanded', 'true');
            addCssClass(header, 'mat-expanded');
        }

        for (const content of queryElements<HTMLElement>(panel, '.mat-expansion-panel-content, .aca-expansion-panel-content, .mat-expansion-panel-body, .aca-expansion-panel-body')) {
            setCssStyle(content, 'height', 'auto');
            setCssStyle(content, 'max-height', 'none');
            setCssStyle(content, 'visibility', 'visible');
            setCssStyle(content, 'overflow', 'visible');
            setCssStyle(content, 'opacity', '1');
            setCssStyle(content, 'display', 'block');
        }
    }
};

const syncNavCollapsibleSections = (doc: Document, router: Router): void => {
    const sidenav = queryElement(doc, '.aca-sidenav');
    if (!sidenav) {
        return;
    }

    for (const section of NAV_COLLAPSIBLE_SECTIONS) {
        if (section.id === 'workflow-management') {
            const workflowRows = collectWorkflowManagementRows(sidenav);
            syncNavCollapsibleSection(doc, sidenav, section, workflowRows);
            continue;
        }

        if (section.id === 'vendor-management') {
            const workflowBody = queryElement(sidenav, '[data-adw-nav-section="workflow-management"] .adw-nav-collapsible-section__body');
            const vendorRow = findNavRow(sidenav, 'app.navbar.vendor-document-creation');
            const sectionRoot = queryElement(sidenav, '.aca-sidenav__section');
            if (workflowBody && vendorRow && workflowBody.contains(vendorRow) && sectionRoot) {
                appendNode(sectionRoot, vendorRow);
            }
        }

        if (section.id === 'construction-documents') {
            const workflowBody = queryElement(sidenav, '[data-adw-nav-section="workflow-management"] .adw-nav-collapsible-section__body');
            const constructionRow = findNavRow(sidenav, 'app.navbar.construction-documents');
            const sectionRoot = queryElement(sidenav, '.aca-sidenav__section');
            if (workflowBody && constructionRow && workflowBody.contains(constructionRow) && sectionRoot) {
                appendNode(sectionRoot, constructionRow);
            }
        }

        syncNavCollapsibleSection(doc, sidenav, section);
    }

    forceExpandAsyncSidenavPanels(sidenav);
    repositionStandaloneNavItems(sidenav);
    bindDashboardNavClickHandlers(doc, router);
    ensureManageSearchesNavDelegation(doc, router);
    applyNavRailFallbackIcons(sidenav);
    syncCollapsedNavRailMarkers(sidenav);
    syncWorkflowNavSelectionVisual(doc, router);
    syncNavSectionActiveState(doc);
    syncManageSearchesNavSelectionVisual(doc, router);
};

// Sidenav group headers (rendered as always-expanded panels) whose children should
// be flattened into top-level links like "Dashboard" instead of sitting under a header.
const FLATTEN_GROUP_LABELS: readonly string[] = ['files', 'workflow', 'saved searches'];

// A header label matches a flatten target when it equals the label or starts with it
// followed by a separator (e.g. "Saved Searches (3)").
const shouldFlattenGroupLabel = (label: string): boolean =>
    FLATTEN_GROUP_LABELS.some((target) => label === target || label.startsWith(`${target} `));

let appShellEnhancementFrame: Subscription | null = null;

const runAppShellDomEnhancements = (
    doc: Document,
    router: Router,
    profile: ProfileState | null
): void => {
    let fourColumnLayout = false;
    for (const page of queryElements(doc, 'aca-page-layout')) {
        const content = queryElement(page, ':scope > aca-page-layout-content');
        if (!content) {
            continue;
        }
        if (hasCssClass(page, 'adw-project-explorer-layout')) {
            if (queryElement(content, '.adw-folder-view > .aca-sidebar')) {
                fourColumnLayout = true;
            }
            continue;
        }
        const directSidebar = queryElement(content, ':scope > div.aca-sidebar, :scope > aca-info-drawer.aca-sidebar');
        if (directSidebar && queryElement(directSidebar, 'mat-tab-group.adf-info-drawer-tabs')) {
            fourColumnLayout = true;
        }
    }
    toggleBodyClass(doc, 'adw-node-info-four-columns', fourColumnLayout);
    // Trashcan host is selector "ng-component" â€” body class enables Shared/Recent card layout CSS.
    toggleBodyClass(doc, 'adw-trashcan-page', isTrashcanRoute(router.url));

    queryElements(
        doc,
        'adf-info-drawer mat-tab-group.adf-info-drawer-tabs, adf-info-drawer mat-tab-group.mat-mdc-tab-group.adf-info-drawer-tabs'
    ).forEach((group: Element) => {
            // Process Services task/process drawers must keep normal single-tab behavior
            // (Details OR Comments). Content library sidebars keep the multi-panel layout.
            const isProcessServicesDrawer = !!closestElement(group, '.aps-sidebar, aps-task-info-drawer, aps-process-info-drawer');
            if (isProcessServicesDrawer) {
                removeCssClass(group, 'adw-info-drawer-show-all-panels');
                return;
            }
            addCssClass(group, 'adw-info-drawer-show-all-panels');
        });
    queryElements(
        doc,
        'adf-info-drawer mat-tab-group.adw-info-drawer-show-all-panels mat-tab-body[inert], adf-info-drawer .adf-info-drawer-tabs.adw-info-drawer-show-all-panels mat-tab-body[inert]'
    ).forEach((inertBody) => removeAttr(inertBody, 'inert'));

    scheduleCoalescedSidenavEnhancement(doc, router, profile, () => {
        queryElements(doc, '.adw-flattened-group, .adw-flattened-group-header').forEach((el) =>
            removeCssClass(el, 'adw-flattened-group', 'adw-flattened-group-header')
        );
        for (const header of queryElements<HTMLElement>(doc, '.aca-sidenav .aca-expansion-panel-header')) {
            const label = normalizeNavLabel(queryElement(header, '.aca-action-button__label')?.textContent);
            if (shouldFlattenGroupLabel(label)) {
                addCssClass(header, 'adw-flattened-group-header');
                addCssClass(closestElement(header, '.aca-expansion-panel'), 'adw-flattened-group');
            }
        }

        queryElements(doc, '.adw-top-dashboard-label').forEach((el) => removeCssClass(el, 'adw-top-dashboard-label'));
        queryElements(doc, '.adw-top-dashboard-row').forEach((el) =>
            removeCssClass(el, 'adw-top-dashboard-row', 'adw-top-dashboard-row--active')
        );
        queryElements(doc, '.adw-tasks-label, .adw-processes-label, .adw-saved-searches-label').forEach((el) =>
            removeCssClass(el, 'adw-tasks-label', 'adw-processes-label', 'adw-saved-searches-label')
        );
        queryElements(doc, NAV_SUB_ICON_CLASSES.map((c) => `.${c}`).join(', ')).forEach((el) => {
            for (const className of NAV_SUB_ICON_CLASSES) {
                removeCssClass(el, className);
            }
        });

        applyDashboardNavMarkers(doc, router);

        const labelSelectors =
            'span, a, button, .aca-action-button__label, .mdc-button__label, [data-automation-id="adf-filter-label"]';
        const isPlainLabelElement = (el: HTMLElement): boolean => !queryElement(el, 'mat-icon, adf-icon, svg');
        const hasAncestorWithClass = (el: HTMLElement, className: string): boolean => Boolean(closestElement(el, `.${className}`));
        const isInnermostMatchingLabel = (el: HTMLElement, label: string): boolean =>
            !queryElements<HTMLElement>(el, labelSelectors).some(
                (child) =>
                    child !== el &&
                    isPlainLabelElement(child) &&
                    normalizeNavLabel(child.textContent) === label
            );

        for (const el of queryElements<HTMLElement>(doc, `.aca-sidenav ${labelSelectors}`)) {
            const label = normalizeNavLabel(el.textContent);
            if (!label || !isPlainLabelElement(el) || !isInnermostMatchingLabel(el, label)) {
                continue;
            }

            if (label === 'tasks' && !hasAncestorWithClass(el, 'adw-tasks-label')) {
                addCssClass(el, 'adw-tasks-label');
                continue;
            }

            if (label === 'processes' && !hasAncestorWithClass(el, 'adw-processes-label')) {
                addCssClass(el, 'adw-processes-label');
                continue;
            }

            const subIconClass = resolveNavSubIconClass(label);
            if (subIconClass === 'adw-nav-sub-icon--manage-searches') {
                if (!hasAncestorWithClass(el, 'adw-nav-sub-icon--manage-searches')) {
                    addCssClass(el, 'adw-nav-sub-icon', subIconClass);
                }
                continue;
            }

            if (
                label.startsWith('saved searches') &&
                !hasAncestorWithClass(el, 'adw-saved-searches-label') &&
                !closestElement(el, '.aca-expansion-panel-header, .mat-expansion-panel-header')
            ) {
                addCssClass(el, 'adw-saved-searches-label');
                continue;
            }

            if (subIconClass) {
                addCssClass(el, 'adw-nav-sub-icon', subIconClass);
            }
        }
    });
};

const scheduleAppShellDomEnhancements = (
    doc: Document,
    router: Router,
    profile: ProfileState | null
): void => {
    if (appShellEnhancementFrame !== null) {
        return;
    }

    appShellEnhancementFrame = scheduleFrame(() => {
        appShellEnhancementFrame = null;
        runAppShellDomEnhancements(doc, router, profile);
    });
};

/** APS / save-search rows often arrive after the first paint â€” retry briefly. */
const SIDENAV_BOOTSTRAP_RETRY_MS = [250, 750, 1500, 3000] as const;
let sidenavBootstrapRetryTimers: Subscription[] = [];

const clearSidenavBootstrapRetries = (): void => {
    for (const retry of sidenavBootstrapRetryTimers) {
        cancelScheduled(retry);
    }
    sidenavBootstrapRetryTimers = [];
};

const scheduleSidenavBootstrapRetries = (
    doc: Document,
    router: Router,
    getProfile: () => ProfileState | null
): void => {
    clearSidenavBootstrapRetries();
    for (const delayMs of SIDENAV_BOOTSTRAP_RETRY_MS) {
        sidenavBootstrapRetryTimers.push(
            scheduleTimeout(() => {
                scheduleAppShellDomEnhancements(doc, router, getProfile());
            }, delayMs)
        );
    }
};

@Component({
    selector: 'app-root',
    template: `
        <div class="adw-app-shell" [class.adw-app-shell--with-footer]="showAppFooter">
            <div class="adw-app-shell__main">
                <router-outlet />
            </div>
            @if (showAppFooter) {
                <acs-footer />
            }
        </div>
    `,
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [RouterOutlet, FooterComponent]
})
export class AppComponent implements OnInit {
    private readonly appService = inject(AppService);
    private readonly userProfileService = inject(UserProfileService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly doc = inject(DOCUMENT);
    private readonly renderer = inject(Renderer2);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthenticationService);
    private readonly injector = inject(Injector);
    private readonly applicationRef = inject(ApplicationRef);
    private readonly environmentInjector = inject(EnvironmentInjector);
    private sidenavProfile: ProfileState | null = null;
    showAppFooter = false;

    constructor(matIconRegistry: MatIconRegistry) {
        appRenderer = this.renderer;
        appRef = this.applicationRef;
        appEnvironmentInjector = this.environmentInjector;
        this.appService.init();
        matIconRegistry.setDefaultFontSetClass('material-icons-outlined');
    }

    ngOnInit(): void {
        const doc = this.doc;
        const router = this.router;

        this.userProfileService.userProfile$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((profile) => {
                if (profile?.id) {
                    this.sidenavProfile = profile;
                    scheduleNavCollapsibleSectionsSync(doc, router, this.sidenavProfile);
                }
                this.syncFooterVisibility();
            });

        setupSidenavRefreshTriggers(doc, router, this.destroyRef, this.authService, () => this.sidenavProfile);

        afterNextRender(
            () => {
                this.syncFooterVisibility();
                scheduleAppShellDomEnhancements(doc, router, this.sidenavProfile);
                scheduleSidenavBootstrapRetries(doc, router, () => this.sidenavProfile);
            },
            { injector: this.injector }
        );

        this.authService.onLogin.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncFooterVisibility());

        router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.syncFooterVisibility();
                scheduleAppShellDomEnhancements(doc, router, this.sidenavProfile);
            });

        this.syncFooterVisibility();

        this.destroyRef.onDestroy(() => {
            toggleBodyClass(doc, 'adw-has-app-footer', false);
            clearSidenavBootstrapRetries();
            cancelScheduled(appShellEnhancementFrame);
            appShellEnhancementFrame = null;
            for (const sectionId of [...navSectionRefs.keys()]) {
                destroyNavSectionRef(sectionId);
            }
        });
    }

    private syncFooterVisibility(): void {
        const url = this.router.url || '';
        const onLoginRoute = url === '/login' || url.startsWith('/login?') || url.startsWith('/login/');
        this.showAppFooter = this.authService.isLoggedIn() && !onLoginRoute;
        toggleBodyClass(this.doc, 'adw-has-app-footer', this.showAppFooter);
    }
}
