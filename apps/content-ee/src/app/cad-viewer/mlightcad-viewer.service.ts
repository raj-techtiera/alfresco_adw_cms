import { Injectable, NgZone } from '@angular/core';
import type { AcGePoint3d } from '@mlightcad/geometry-engine';
import type { AcDbDatabase, AcDbEntity, AcDbEntityEventArgs, AcDbMText, AcDbText } from '@mlightcad/data-model';
import type { AcApDocManager, AcApOpenDatabaseOptions, AcEdCommandEventArgs } from '@mlightcad/cad-simple-viewer';
import { getCadExtension } from './is-cad-file';

const CAD_KEY_EVENTS = ['keydown', 'keyup', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend'] as const;
const CAD_MTEXT_STORAGE_PREFIX = 'CAD_MTEXT_ATTRIBUTIONS:';
/** Unscoped key from before comments were stored per drawing. Never read it back. */
const LEGACY_CAD_MTEXT_STORAGE_KEY = 'CAD_MTEXT_ATTRIBUTIONS';
const DRAWING_DIMENSION = /^\d+'\s*-\s*\d+(\s+\d+\/\d+)?\s*"?$|^\d+\s*-\s*"?$/;

interface CadTextAttribution {
    objectId: string;
    username: string;
    text: string;
}

@Injectable({ providedIn: 'root' })
export class MlightCadViewerService {
    private manager: AcApDocManager | null = null;
    private dwgRegistered = false;
    private watermarkGeneration = 0;
    private defaultOpenOptions: AcApOpenDatabaseOptions = {};
    private openAccess: 'read' | 'write' = 'write';
    private sessionOwner: 'editor' | 'preview' | 'print' | null = null;
    /** Command line and shortcut toolbar values to put back after a view-only preview. */
    private chromeRestore: { commandLine: boolean; shortcutToolbar: boolean } | null = null;
    private viewerContainer: HTMLElement | null = null;
    private cadInputIsolated = false;
    private editorAttributionBound = false;
    private attributionDatabase: AcDbDatabase | null = null;
    private activeCommandName: string | null = null;
    private stampingUsername = false;
    private readonly stampedEntityIds = new Set<string>();
    private readonly sessionAttributions: CadTextAttribution[] = [];
    private drawingSaved = false;
    private attributionsLogged = false;
    /** Alfresco node whose comments are being collected. Storage is keyed by this id. */
    private commentNodeId: string | null = null;
    private textConstructors: {
        mtext: new () => AcDbMText;
        text: new () => AcDbText;
        point: new (x: number, y: number, z: number) => AcGePoint3d;
    } | null = null;
    /** Latest command plus the `ACS_USERNAME` value, shown in the viewer. */
    commandLabel: string | null = null;

    constructor(private readonly ngZone: NgZone) {
        try {
            localStorage.removeItem(LEGACY_CAD_MTEXT_STORAGE_KEY);
        } catch {
            /* private mode */
        }
    }

    /** Start a drawing session so comments stay on this node and do not mix with another file. */
    beginDocument(nodeId: string): void {
        this.commentNodeId = nodeId.trim() || null;
        this.sessionAttributions.length = 0;
        this.drawingSaved = false;
        this.attributionsLogged = false;
        try {
            localStorage.removeItem(LEGACY_CAD_MTEXT_STORAGE_KEY);
        } catch {
            /* private mode */
        }
    }

    /** Replace this drawing's stored comments with the value already saved on the node. */
    replaceStoredComments(nodeId: string, raw: string): void {
        const id = nodeId.trim();
        if (!id || !raw.trim()) {
            return;
        }
        this.commentNodeId = id;
        try {
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return;
            }
            localStorage.setItem(this.storageKey(id), JSON.stringify(parsed));
        } catch {
            /* keep the comments already stored for this drawing */
        }
    }

    get isReady(): boolean {
        return this.manager != null;
    }

    async initialize(
        container: HTMLElement,
        appearance: 'viewer' | 'print' = 'viewer',
        access: 'read' | 'write' = 'write',
        owner: 'editor' | 'preview' | 'print' = 'editor'
    ): Promise<void> {
        if (this.manager && this.sessionOwner === 'editor' && owner === 'preview') {
            throw new Error('This drawing is open in the CAD editor. Close that viewer to preview it here.');
        }
        if (this.manager && (this.viewerContainer !== container || this.openAccess !== access || this.sessionOwner !== owner)) {
            await this.dispose();
        }
        if (this.manager) {
            return;
        }
        this.openAccess = access;
        this.sessionOwner = owner;

        const {
            AcApDocManager,
            AcApOpenViewMode,
            AcEdOpenMode,
            acedApplyUiTheme,
            layoutBackgroundColorFromRgb
        } = await import('@mlightcad/cad-simple-viewer');

        if (access === 'read') {
            await this.hideReadOnlyChrome();
        } else {
            await this.restoreViewerChrome();
        }

        await this.registerDwgConverter(true);

        acedApplyUiTheme(appearance === 'print' ? 'light' : 'dark', container);

        const workerUrls = {
            mtextRender: this.workerUrl('mtext-renderer-worker.js'),
            dwgParser: this.workerUrl('libredwg-parser-worker.js')
        };

        this.viewerContainer = container;
        this.ngZone.runOutsideAngular(() => {
            AcApDocManager.createInstance({
                container,
                autoResize: true,
                busyIndicatorHost: container,
                useMainThreadDraw: false,
                preloadDefaultFonts: false,
                webworkerFileUrls: workerUrls,
                checkWorkersOnInit: false
            });
            this.isolateCadTypingFromAngular();
        });

        this.manager = AcApDocManager.instance;
        if (!this.manager) {
            throw new Error('MLightCAD failed to start.');
        }

        const background = appearance === 'print' ? 0xffffff : 0x000000;
        this.defaultOpenOptions = {
            mode: access === 'read' ? AcEdOpenMode.Read : AcEdOpenMode.Write,
            progressiveRendering: true,
            waitForTextGeometry: false,
            openViewMode: AcApOpenViewMode.Extents,
            sysVars: {
                paperbkcolor: layoutBackgroundColorFromRgb(background),
                modelbkcolor: layoutBackgroundColorFromRgb(background)
            }
        };
    }

    async capturePngBlob(longSide = 2400): Promise<Blob> {
        if (!this.manager) {
            throw new Error('CAD viewer is not initialized.');
        }
        const { AcApRasterImageConvertor } = await import('@mlightcad/cad-simple-viewer');
        const convertor = new AcApRasterImageConvertor('png');
        let dataUrl = '';
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
            const href = this.getAttribute('href') || this.href || '';
            if (href.startsWith('data:image/')) {
                dataUrl = href;
                return;
            }
            return originalClick.call(this);
        };
        try {
            await convertor.convert(undefined, longSide);
        } finally {
            HTMLAnchorElement.prototype.click = originalClick;
        }
        if (!dataUrl) {
            throw new Error('Could not capture a PDF preview of this CAD file.');
        }
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        if (!blob?.size) {
            throw new Error('Could not capture a PDF preview of this CAD file.');
        }
        return blob;
    }

    async loadFile(file: Blob, fileName: string): Promise<void> {
        if (!this.manager) {
            throw new Error('CAD viewer is not initialized.');
        }
        if (!file || file.size < 16) {
            throw new Error('The CAD file is empty or could not be downloaded.');
        }
        if (await this.looksLikeHtml(file)) {
            throw new Error('The CAD file could not be downloaded. Please sign in again and try once more.');
        }

        const content = await file.arrayBuffer();
        let extension = getCadExtension(fileName) ?? 'dwg';
        if (extension === 'dwg' && this.contentLooksLikeDxf(content)) {
            extension = 'dxf';
        }
        const parserName = `drawing.${extension}`;
        const opened = await this.runOutsideAngular(() => this.manager!.openDocument(parserName, content, this.defaultOpenOptions));
        if (opened) {
            await this.finishOpen();
            return;
        }

        if (extension === 'dwg') {
            await this.registerDwgConverter(false);
            const retried = await this.runOutsideAngular(() =>
                this.manager!.openDocument(parserName, content, this.defaultOpenOptions)
            );
            if (retried) {
                await this.finishOpen();
                return;
            }
        }

        throw new Error(`Could not parse ${fileName}. The drawing may be unsupported or corrupt.`);
    }

    exportDrawingContent(): Blob {
        const document = this.manager?.curDocument;
        if (!document) {
            throw new Error('No drawing is open.');
        }

        const dxfContent = document.database.dxfOut(undefined, 6);
        const bytes = typeof dxfContent === 'string' ? dxfContent : new Uint8Array(dxfContent);
        return new Blob([bytes], { type: 'application/acad' });
    }

    markDrawingSaved(): void {
        this.drawingSaved = true;
    }

    hasDrawingSaved(): boolean {
        return this.drawingSaved;
    }

    /**
     * After Save, closing the viewer prints each MTEXT/TEXT note with the
     * username that was stamped under it, and keeps that list in localStorage.
     */
    logSavedTextAttributions(): void {
        if (!this.drawingSaved || this.attributionsLogged) {
            return;
        }
        this.attributionsLogged = true;
        const entries = this.collectTextAttributions();
        this.storeTextAttributions(entries);
        console.log('[CAD MTEXT] usernames and text', entries);
        for (const entry of entries) {
            console.log('[CAD MTEXT]', { username: entry.username, text: entry.text });
        }
    }

    private storeTextAttributions(entries: Array<{ username: string; text: string }>): void {
        const nodeId = this.commentNodeId;
        if (!nodeId) {
            return;
        }
        try {
            const stored = this.readStoredAttributions(nodeId);
            const seen = new Set(stored.map((item) => `${item.username}\n${item.text}`));
            for (const entry of entries) {
                const key = `${entry.username}\n${entry.text}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                stored.push({ username: entry.username, text: entry.text });
            }
            localStorage.setItem(this.storageKey(nodeId), JSON.stringify(stored));
        } catch {
            /* private mode or storage quota */
        }
    }

    /** Username and text pairs saved for this drawing's CAD Comments field. */
    storedCadCommentsText(nodeId: string): string {
        const id = nodeId.trim();
        if (!id) {
            return '';
        }
        const entries = this.readStoredAttributions(id).map((entry) => ({
            username: entry.username,
            text: entry.text
        }));
        if (entries.length === 0) {
            return '';
        }
        return JSON.stringify(entries);
    }

    private storageKey(nodeId: string): string {
        return `${CAD_MTEXT_STORAGE_PREFIX}${nodeId}`;
    }

    private readStoredAttributions(nodeId: string): Array<{ username: string; text: string }> {
        try {
            const raw = localStorage.getItem(this.storageKey(nodeId));
            if (!raw) {
                return [];
            }
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            const stored: Array<{ username: string; text: string }> = [];
            for (const item of parsed) {
                if (!item || typeof item !== 'object') {
                    continue;
                }
                const record = item as { username?: unknown; text?: unknown };
                if (typeof record.username !== 'string' || typeof record.text !== 'string') {
                    continue;
                }
                const username = record.username.trim();
                const text = record.text.trim();
                if (!username || !text || this.isDrawingNoise(username, text)) {
                    continue;
                }
                stored.push({ username, text });
            }
            return stored;
        } catch {
            return [];
        }
    }

    private runOutsideAngular<T>(work: () => T): Promise<Awaited<T>> {
        return new Promise((resolve, reject) => {
            this.ngZone.runOutsideAngular(() => {
                Promise.resolve()
                    .then(work)
                    .then((result) => resolve(result as Awaited<T>), reject);
            });
        });
    }

    private contentLooksLikeDxf(content: ArrayBuffer): boolean {
        const sample = new TextDecoder('latin1').decode(content.slice(0, 512)).replace(/^\uFEFF/, '').trimStart();
        return sample.startsWith('0') || sample.startsWith('999') || sample.startsWith('SECTION');
    }

    async dispose(): Promise<void> {
        this.releaseCommandAttribution();
        this.releaseCadTypingIsolation();
        const manager = this.manager;
        this.manager = null;
        this.viewerContainer = null;
        this.watermarkGeneration++;
        this.commandLabel = null;
        this.activeCommandName = null;
        this.stampedEntityIds.clear();
        this.sessionAttributions.length = 0;
        this.drawingSaved = false;
        this.attributionsLogged = false;
        this.commentNodeId = null;
        this.textConstructors = null;
        this.openAccess = 'write';
        this.sessionOwner = null;
        await manager?.destroy();
        await this.restoreViewerChrome();
    }

    /** Drop the viewer only when this caller still owns the session. */
    async release(owner: 'editor' | 'preview' | 'print'): Promise<void> {
        if (this.sessionOwner !== owner) {
            return;
        }
        await this.dispose();
    }

    private async finishOpen(): Promise<void> {
        if (this.openAccess === 'read') {
            await this.hideReadOnlyChrome();
        } else {
            this.bindCommandAttribution();
        }
        this.scheduleWatermarkSuppression();
    }

    /** Hide the command line and undo/redo/erase toolbar without changing saved preferences. */
    private async hideReadOnlyChrome(): Promise<void> {
        const { AcApSettingManager } = await import('@mlightcad/cad-simple-viewer');
        const settings = AcApSettingManager.instance;
        if (!this.chromeRestore) {
            this.chromeRestore = {
                commandLine: settings.isShowCommandLine,
                shortcutToolbar: settings.isShowShortCutToolbar
            };
        }
        settings.set('isShowCommandLine', false, { persist: false });
        settings.set('isShowShortCutToolbar', false, { persist: false });
    }

    private async restoreViewerChrome(): Promise<void> {
        const restore = this.chromeRestore;
        if (!restore) {
            return;
        }
        this.chromeRestore = null;
        const { AcApSettingManager } = await import('@mlightcad/cad-simple-viewer');
        const settings = AcApSettingManager.instance;
        settings.set('isShowCommandLine', restore.commandLine, { persist: false });
        settings.set('isShowShortCutToolbar', restore.shortcutToolbar, { persist: false });
    }

    private bindCommandAttribution(): void {
        const editor = this.manager?.editor;
        if (editor && !this.editorAttributionBound) {
            editor.events.commandWillStart.addEventListener(this.onCommandWillStart);
            editor.events.commandEnded.addEventListener(this.onCommandEnded);
            this.editorAttributionBound = true;
        }

        const database = this.manager?.curDocument?.database ?? null;
        if (database && database !== this.attributionDatabase) {
            this.attributionDatabase?.events.entityAppended.removeEventListener(this.onEntityAppended);
            database.events.entityAppended.addEventListener(this.onEntityAppended);
            this.attributionDatabase = database;
        }

        this.stampedEntityIds.clear();
        this.sessionAttributions.length = 0;
        this.drawingSaved = false;
        this.attributionsLogged = false;
        void this.ensureTextConstructors();
        this.publishCommandUser(null);
    }

    private releaseCommandAttribution(): void {
        const editor = this.manager?.editor;
        if (editor && this.editorAttributionBound) {
            editor.events.commandWillStart.removeEventListener(this.onCommandWillStart);
            editor.events.commandEnded.removeEventListener(this.onCommandEnded);
        }
        this.editorAttributionBound = false;
        this.attributionDatabase?.events.entityAppended.removeEventListener(this.onEntityAppended);
        this.attributionDatabase = null;
    }

    private readonly onCommandWillStart = (args: AcEdCommandEventArgs): void => {
        this.activeCommandName = this.commandName(args);
        this.publishCommandUser(this.activeCommandName);
    };

    private readonly onCommandEnded = (args: AcEdCommandEventArgs): void => {
        this.activeCommandName = this.commandName(args);
        this.publishCommandUser(this.activeCommandName);
    };

    private readonly onEntityAppended = (args: AcDbEntityEventArgs): void => {
        if (!this.activeCommandName || this.stampingUsername) {
            return;
        }
        const username = this.readAcsUsername();
        if (!username) {
            return;
        }
        const entities = Array.isArray(args.entity) ? args.entity : [args.entity];
        for (const entity of entities) {
            this.placeUsernameBelow(entity, username);
        }
    };

    private commandName(args: AcEdCommandEventArgs): string {
        return String(args?.command?.globalName ?? '').trim().toUpperCase() || 'COMMAND';
    }

    private publishCommandUser(commandName: string | null): void {
        const username = this.readAcsUsername();
        const label = commandName
            ? username
                ? `${commandName} · ${username}`
                : commandName
            : username || null;
        this.ngZone.run(() => {
            this.commandLabel = label;
        });
        if (!commandName) {
            return;
        }
        const message = username ? `${commandName} by ${username}` : commandName;
        try {
            this.manager?.editor?.inputManager?.showMessage(message);
        } catch {
            /* command line is not ready yet */
        }
    }

    private async ensureTextConstructors(): Promise<void> {
        if (this.textConstructors) {
            return;
        }
        const [model, geometry] = await Promise.all([
            import('@mlightcad/data-model'),
            import('@mlightcad/geometry-engine')
        ]);
        this.textConstructors = {
            mtext: model.AcDbMText,
            text: model.AcDbText,
            point: geometry.AcGePoint3d
        };
    }

    /**
     * Draws the username as its own text under the user's text.
     * Putting it in the same MTEXT box stacks the glyphs on one insertion point.
     */
    private placeUsernameBelow(entity: AcDbEntity, username: string): void {
        const objectId = String(entity.objectId ?? '');
        if (objectId && this.stampedEntityIds.has(objectId)) {
            return;
        }
        const mark = `[${username}]`;
        const typeName = `${entity.dxfTypeName ?? ''} ${entity.type ?? ''}`.toUpperCase();
        const modelSpace = this.attributionDatabase?.tables.blockTable.modelSpace;
        const constructors = this.textConstructors;
        if (!modelSpace || !constructors) {
            return;
        }

        if (/\bMTEXT\b/.test(typeName)) {
            const source = entity as AcDbMText;
            const current = String(source.contents ?? '').trim();
            if (!current || current === mark) {
                return;
            }
            const height = Number(source.height) > 0 ? Number(source.height) : 1;
            const lines = current.split(/\r\n|\n|\\P/g).filter((line) => line.length > 0).length || 1;
            const drop = height * (lines + 0.6);
            const location = source.location;
            const label = new constructors.mtext();
            label.contents = mark;
            label.height = height;
            label.width = Math.max(Number(source.width) || 0, height * mark.length * 0.8);
            label.location = new constructors.point(location.x, location.y - drop, location.z ?? 0);
            label.attachmentPoint = source.attachmentPoint;
            label.rotation = source.rotation;
            if (source.styleName) {
                label.styleName = source.styleName;
            }
            if (source.layer) {
                label.layer = source.layer;
            }
            this.rememberAttribution(objectId, username, current);
            this.appendUsernameLabel(label, objectId);
            return;
        }

        if (/\bTEXT\b/.test(typeName)) {
            const source = entity as AcDbText;
            const current = String(source.textString ?? '').trim();
            if (!current || current === mark) {
                return;
            }
            const height = Number(source.height) > 0 ? Number(source.height) : 1;
            const position = source.position;
            const label = new constructors.text();
            label.textString = mark;
            label.height = height;
            label.position = new constructors.point(position.x, position.y - height * 1.6, position.z ?? 0);
            label.rotation = source.rotation;
            if (source.layer) {
                label.layer = source.layer;
            }
            this.appendUsernameLabel(label, objectId);
        }
    }

    private rememberAttribution(objectId: string, username: string, rawText: string): void {
        if (this.activeCommandName !== 'MTEXT') {
            return;
        }
        const text = this.readableText(rawText);
        if (!objectId || !text || text === `[${username}]` || this.isDrawingNoise(username, text)) {
            return;
        }
        this.sessionAttributions.push({ objectId, username, text });
    }

    private collectTextAttributions(): Array<{ username: string; text: string }> {
        const results: Array<{ username: string; text: string }> = [];
        const seen = new Set<string>();
        for (const item of this.sessionAttributions) {
            const key = `${item.username}\n${item.text}`;
            if (!item.username || !item.text || seen.has(key) || this.isDrawingNoise(item.username, item.text)) {
                continue;
            }
            seen.add(key);
            results.push({ username: item.username, text: item.text });
        }
        return results;
    }

    /** Dimension strings, plot stamps, and numeric callouts are part of the DWG, not comments. */
    private isDrawingNoise(username: string, text: string): boolean {
        if (/^\d+$/.test(username)) {
            return true;
        }
        const normalized = text.replace(/[″”]/g, '"').replace(/[′]/g, "'").trim();
        if (DRAWING_DIMENSION.test(normalized)) {
            return true;
        }
        return /plotted:|plot device:|^filename:|^elev\./i.test(normalized);
    }

    private readableText(raw: string): string {
        return raw
            .replace(/\\P/gi, '\n')
            .replace(/\\~/g, ' ')
            .replace(/\\[A-Za-z][^;\\]*;/g, '')
            .replace(/[{}]/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    private appendUsernameLabel(label: AcDbEntity, sourceId: string): void {
        const modelSpace = this.attributionDatabase?.tables.blockTable.modelSpace;
        if (!modelSpace) {
            return;
        }
        this.stampingUsername = true;
        try {
            modelSpace.appendEntity(label);
            if (sourceId) {
                this.stampedEntityIds.add(sourceId);
            }
        } finally {
            this.stampingUsername = false;
        }
    }

    private readAcsUsername(): string {
        try {
            return localStorage.getItem('ACS_USERNAME')?.trim() ?? '';
        } catch {
            return '';
        }
    }

    private readonly keepCadTypingOffAngular = (event: Event): void => {
        const target = event.target;
        if (!(target instanceof Node)) {
            return;
        }
        if (this.viewerContainer?.contains(target) || this.isHiddenCadTextInput(target)) {
            event.stopPropagation();
        }
    };

    private isolateCadTypingFromAngular(): void {
        if (this.cadInputIsolated) {
            return;
        }
        this.cadInputIsolated = true;
        for (const type of CAD_KEY_EVENTS) {
            document.body.addEventListener(type, this.keepCadTypingOffAngular);
        }
    }

    private releaseCadTypingIsolation(): void {
        if (!this.cadInputIsolated) {
            return;
        }
        this.cadInputIsolated = false;
        for (const type of CAD_KEY_EVENTS) {
            document.body.removeEventListener(type, this.keepCadTypingOffAngular);
        }
    }

    private isHiddenCadTextInput(target: Node): boolean {
        if (!(target instanceof HTMLTextAreaElement)) {
            return false;
        }
        return target.getAttribute('aria-hidden') === 'true' && target.style.opacity === '0';
    }

    private scheduleWatermarkSuppression(): void {
        const generation = ++this.watermarkGeneration;
        const run = () => {
            if (generation !== this.watermarkGeneration) {
                return;
            }
            void this.suppressQcadTrialWatermarks(generation);
        };
        setTimeout(run, 0);
        setTimeout(run, 1200);
    }

    private async suppressQcadTrialWatermarks(generation: number): Promise<void> {
        const db = this.manager?.curDocument?.database;
        const view = this.manager?.mainView;
        if (!db) {
            return;
        }

        const textEntities: Array<{ objectId: string; text: string; erase: () => boolean }> = [];
        let scanned = 0;
        for (const record of db.tables.blockTable.newIterator()) {
            for (const entity of record.newIterator()) {
                const text = this.entityPlainText(entity);
                if (text) {
                    textEntities.push({
                        objectId: entity.objectId,
                        text,
                        erase: () => entity.erase()
                    });
                }
                if (++scanned % 300 === 0) {
                    await new Promise((resolve) => setTimeout(resolve, 0));
                    if (generation !== this.watermarkGeneration || !this.manager) {
                        return;
                    }
                }
            }
        }
        if (generation !== this.watermarkGeneration) {
            return;
        }

        const watermarkHits = textEntities.filter((item) => this.isQcadTrialWatermark(item.text));
        if (watermarkHits.length === 0) {
            return;
        }

        const hide = new Set(watermarkHits.map((item) => item.objectId));
        for (const item of textEntities) {
            if (hide.has(item.objectId)) {
                continue;
            }
            if (item.text === 'thank you!' || item.text === 'thank you') {
                hide.add(item.objectId);
            }
        }

        for (const item of textEntities) {
            if (!hide.has(item.objectId)) {
                continue;
            }
            try {
                view?.setEntitySceneVisible(item.objectId, false);
            } catch {
                /* ignore */
            }
            try {
                item.erase();
            } catch {
                /* read-only / transaction — scene hide is enough */
            }
        }
    }

    private entityPlainText(entity: {
        type?: string;
        dxfTypeName?: string;
        contents?: string;
        textString?: string;
    }): string {
        const type = `${entity.dxfTypeName ?? ''} ${entity.type ?? ''}`.toUpperCase();
        if (!/\bMTEXT\b/.test(type) && !/\bTEXT\b/.test(type)) {
            return '';
        }
        const raw = String(entity.contents ?? entity.textString ?? '');
        return raw
            .replace(/\\P/gi, ' ')
            .replace(/\\[A-Za-z][^;]*;/g, '')
            .replace(/[{}]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    private isQcadTrialWatermark(text: string): boolean {
        return (
            text.includes('qcad') ||
            text.includes('qcad.org') ||
            text.includes('printed with a trial version') ||
            text.includes('not intended for production use') ||
            text.includes('this trial version allows you') ||
            text.includes('please buy a full version') ||
            text.includes('supporting the future development')
        );
    }

    private async registerDwgConverter(useWorker: boolean): Promise<void> {
        if (this.dwgRegistered && useWorker) {
            return;
        }
        const { AcDbDatabaseConverterManager, AcDbFileType } = await import('@mlightcad/data-model');
        const { AcDbLibreDwgConverter } = await import('@mlightcad/libredwg-converter');
        AcDbDatabaseConverterManager.instance.register(
            AcDbFileType.DWG,
            new AcDbLibreDwgConverter({
                convertByEntityType: false,
                useWorker,
                parserWorkerUrl: this.workerUrl('libredwg-parser-worker.js')
            })
        );
        this.dwgRegistered = useWorker;
    }

    private workerUrl(fileName: string): string {
        return `${window.location.origin}/assets/mlightcad/${fileName}`;
    }

    private async looksLikeHtml(file: Blob): Promise<boolean> {
        const mime = (file.type || '').toLowerCase();
        if (mime.includes('text/html') || mime.includes('application/json')) {
            return true;
        }
        try {
            const head = await file.slice(0, 64).text();
            const trimmed = head.trim().toLowerCase();
            return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('{');
        } catch {
            return false;
        }
    }
}
