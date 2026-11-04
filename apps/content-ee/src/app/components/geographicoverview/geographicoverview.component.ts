import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { AlfrescoService } from '../../alfresco.service';
import { environment } from '../../../environments/environment';
import { addLeafletBasemap } from '../../leaflet-basemap';

/** Project with parsed map coordinates from Alfresco search. */
export interface GeoProjectMarker {
  id: string;
  name: string;
  projectType: string;
  client: string;
  latitude: number;
  longitude: number;
  latitudeDisplay: string;
  longitudeDisplay: string;
  shutdownStatus: string;
}

type GeoTab = 'map' | 'projects' | 'countries';

interface Kpi {
  id: string;
  label: string;
  value: number;
  hint: string;
  variant: 'map' | 'active';
}

interface TabDef {
  key: GeoTab;
  label: string;
  icon: string;
}

const DEFAULT_MAP_CENTER: L.LatLngExpression = [15, 80];
const DEFAULT_MAP_ZOOM = 4;

/** Pin SVG used for map markers (fill color injected). */
function createPinIcon(fill: string): L.DivIcon {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path fill="${fill}" stroke="#fff" stroke-width="1.5"
        d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
      <circle cx="12.5" cy="12.5" r="4.5" fill="#fff"/>
    </svg>`
  );
  return L.divIcon({
    className: 'geo-map-marker',
    html: `<img class="geo-map-marker__img" src="data:image/svg+xml,${svg}" width="25" height="41" alt="" />`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });
}

const ACTIVE_PROJECT_MARKER_ICON = createPinIcon('#16A34A');
const INACTIVE_PROJECT_MARKER_ICON = createPinIcon('#0056B3');

@Component({
  selector: 'acs-geographicoverview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './geographicoverview.component.html',
  styleUrl: './geographicoverview.component.scss'
})
export class GeographicoverviewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('geoMap', { static: false }) geoMapEl?: ElementRef<HTMLDivElement>;

  private readonly alfrescoService = inject(AlfrescoService);
  private readonly ngZone = inject(NgZone);
  private readonly projectsParentNodeId = environment.projectsParentNodeId;

  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;

  readonly tabs: TabDef[] = [
    { key: 'map', label: 'Map', icon: '🗺️' },
    { key: 'projects', label: 'Projects', icon: '📋' }
    // { key: 'countries', label: 'Countries', icon: '🌍' }
  ];

  /** Projects that have valid latitude/longitude from search. */
  mapProjects: GeoProjectMarker[] = [];
  projectsLoading = false;
  projectsError: string | null = null;
  activeTab: GeoTab = 'map';

  get activeProjects(): number {
    return this.mapProjects.filter((p) => this.isProjectActive(p)).length;
  }

  /** Active = no shutdown status, or explicitly ACTIVE. */
  isProjectActive(project: GeoProjectMarker): boolean {
    const status = (project.shutdownStatus || '').trim().toUpperCase();
    return !status || status === 'ACTIVE';
  }

  get kpis(): Kpi[] {
    return [
      {
        id: 'on-map',
        label: 'Projects on Map',
        value: this.mapProjects.length,
        hint: 'With mapped coordinates',
        variant: 'map'
      },
      {
        id: 'active',
        label: 'Active Projects',
        value: this.activeProjects,
        hint: 'Currently in operation',
        variant: 'active'
      }
    ];
  }

  ngOnInit(): void {
    this.loadProjectsForMap();
  }

  ngAfterViewInit(): void {
    this.ensureMap();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  setActiveTab(tab: GeoTab): void {
    this.activeTab = tab;
    if (tab === 'map') {
      // Map container may have been hidden — refresh size after it becomes visible.
      setTimeout(() => {
        this.ensureMap();
        this.map?.invalidateSize();
        this.renderProjectMarkers();
      }, 0);
    }
  }

  trackByKpi(_index: number, kpi: Kpi): string {
    return kpi.id;
  }

  trackByTab(_index: number, tab: TabDef): string {
    return tab.key;
  }

  trackByProject(_index: number, project: GeoProjectMarker): string {
    return project.id;
  }

  /** Load all engineering projects via Search API and extract geo markers. */
  private loadProjectsForMap(): void {
    this.projectsLoading = true;
    this.projectsError = null;

    this.alfrescoService
      .searchEngineeringProjects({
        parentId: this.projectsParentNodeId,
        maxItems: 1000,
        skipCount: 0
      })
      .subscribe({
        next: ({ items }) => {
          this.mapProjects = items
            .map((entry) => this.mapEntryToGeoProject(entry))
            .filter((p): p is GeoProjectMarker => p != null);
          this.projectsLoading = false;
          this.renderProjectMarkers();
        },
        error: (err) => {
          console.error('Geographic overview project search failed', err);
          this.mapProjects = [];
          this.projectsLoading = false;
          this.projectsError = 'Failed to load project locations.';
          this.renderProjectMarkers();
        }
      });
  }

  private mapEntryToGeoProject(entry: any): GeoProjectMarker | null {
    const props = (entry?.properties || {}) as Record<string, unknown>;
    const rawGeo = this.findProjectGeoLocationRaw(props);
    const parsed = this.parseProjectGeoLocation(rawGeo);
    if (!parsed) {
      return null;
    }

    const name =
      String(entry?.name || props['edms:projectName'] || props['tt:projectName'] || props['cm:title'] || '').trim() ||
      'Untitled project';

    return {
      id: String(entry?.id || ''),
      name,
      projectType: String(
        props['edms:projectType'] || props['tt:projectType'] || props['edms:project_type'] || 'Project'
      ),
      client: String(props['edms:project_client'] || props['tt:project_client'] || props['tt:client'] || ''),
      latitude: parsed.lat,
      longitude: parsed.lon,
      latitudeDisplay: parsed.latDisplay,
      longitudeDisplay: parsed.lonDisplay,
      shutdownStatus: String(props['edms:shutdown_status'] || props['edms:shutdownStatus'] || '')
    };
  }

  private findProjectGeoLocationRaw(source: Record<string, unknown> | null | undefined): unknown {
    if (!source || typeof source !== 'object') {
      return undefined;
    }

    const directKeys = [
      'projectGeoLocation',
      'edms:projectGeoLocation',
      'tt:projectGeoLocation',
      'cm:projectGeoLocation',
      'projectgeolocation',
      'edms:projectgeolocation',
      'tt:projectgeolocation'
    ];
    for (const key of directKeys) {
      const value = source[key];
      if (value != null && value !== '') {
        return value;
      }
    }

    for (const [key, value] of Object.entries(source)) {
      if (value == null || value === '') {
        continue;
      }
      const normalized = key.replace(/^[a-zA-Z0-9]+:/, '').replace(/[_-]+/g, '').toLowerCase();
      if (normalized === 'projectgeolocation') {
        return value;
      }
    }

    return undefined;
  }

  private parseProjectGeoLocation(
    raw: unknown
  ): { lat: number; lon: number; latDisplay: string; lonDisplay: string } | null {
    if (raw == null || raw === '') {
      return null;
    }

    let parsed: unknown = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
      } catch {
        return null;
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const latRaw = obj['latitudeDecimal'] ?? obj['latitude'] ?? obj['lat'];
    const lonRaw = obj['longitudeDecimal'] ?? obj['longitude'] ?? obj['lon'] ?? obj['lng'];
    const lat = this.toCoordinateNumber(latRaw);
    const lon = this.toCoordinateNumber(lonRaw);
    if (lat == null || lon == null || lat < -90 || lat > 90) {
      return null;
    }

    const wrappedLon = this.normalizeLongitude(lon);
    return {
      lat,
      lon: wrappedLon,
      latDisplay: typeof latRaw === 'string' && latRaw.trim() ? latRaw.trim() : lat.toFixed(6),
      lonDisplay: typeof lonRaw === 'string' && lonRaw.trim() ? lonRaw.trim() : wrappedLon.toFixed(6)
    };
  }

  private toCoordinateNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const n = Number(String(value).trim());
    return Number.isFinite(n) ? n : null;
  }

  private normalizeLongitude(lon: number): number {
    let x = lon;
    while (x > 180) {
      x -= 360;
    }
    while (x < -180) {
      x += 360;
    }
    return x;
  }

  private ensureMap(): void {
    const el = this.geoMapEl?.nativeElement;
    if (!el || this.map) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.map = L.map(el, {
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        scrollWheelZoom: true,
        worldCopyJump: true
      });

      addLeafletBasemap(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);

      // Leaflet needs a size pass after the card layout settles.
      setTimeout(() => this.map?.invalidateSize(), 50);
    });

    this.renderProjectMarkers();
  }

  private renderProjectMarkers(): void {
    if (!this.map || !this.markerLayer) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.markerLayer!.clearLayers();

      const latLngs: L.LatLng[] = [];
      for (const project of this.mapProjects) {
        const latlng = L.latLng(project.latitude, project.longitude);
        latLngs.push(latlng);

        const icon = this.isProjectActive(project) ? ACTIVE_PROJECT_MARKER_ICON : INACTIVE_PROJECT_MARKER_ICON;
        const marker = L.marker(latlng, { icon }).addTo(this.markerLayer!);

        marker.bindTooltip(this.buildProjectTooltipHtml(project), {
          direction: 'top',
          offset: L.point(0, -38),
          opacity: 1,
          sticky: false,
          className: 'geo-project-tooltip'
        });
      }

      if (latLngs.length === 1) {
        this.map!.setView(latLngs[0], 12);
      } else if (latLngs.length > 1) {
        this.map!.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 12 });
      } else {
        this.map!.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      }

      this.map!.invalidateSize();
    });
  }

  /** Clean hover card shown when the cursor is over a project marker. */
  private buildProjectTooltipHtml(project: GeoProjectMarker): string {
    const active = this.isProjectActive(project);
    const statusLabel = active ? 'Active' : project.shutdownStatus?.trim() || 'Inactive';
    const statusClass = active ? 'geo-tip__badge--active' : 'geo-tip__badge--inactive';

    const rows: string[] = [];
    if (project.projectType) {
      rows.push(this.tipRow('Type', project.projectType));
    }
    if (project.client) {
      rows.push(this.tipRow('Client', project.client));
    }
    rows.push(this.tipRow('Coordinates', `${project.latitudeDisplay}, ${project.longitudeDisplay}`));

    return `
      <div class="geo-tip">
        <div class="geo-tip__header">
          <span class="geo-tip__badge ${statusClass}">${this.escapeHtml(statusLabel)}</span>
        </div>
        <div class="geo-tip__title">${this.escapeHtml(project.name)}</div>
        <div class="geo-tip__rows">${rows.join('')}</div>
      </div>
    `;
  }

  private tipRow(label: string, value: string): string {
    return `
      <div class="geo-tip__row">
        <span class="geo-tip__label">${this.escapeHtml(label)}</span>
        <span class="geo-tip__value">${this.escapeHtml(value)}</span>
      </div>
    `;
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markerLayer = null;
    }
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
