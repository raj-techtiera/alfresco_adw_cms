import * as L from 'leaflet';
import { environment } from '../environments/environment';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

/**
 * CARTO Voyager raster tiles now require an API key (unauthenticated
 * requests are watermarked "API KEY REQUIRED"). When NG_APP_CARTO_API_KEY
 * is set, keep Voyager; otherwise fall back to OpenStreetMap.
 */
export function addLeafletBasemap(map: L.Map): L.TileLayer {
  const cartoKey = (environment.cartoApiKey || '').trim();

  if (cartoKey) {
    return L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      {
        attribution: CARTO_ATTRIBUTION,
        subdomains: 'abcd',
        maxZoom: 20
      }
    ).addTo(map);
  }

  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: OSM_ATTRIBUTION,
    subdomains: 'abc',
    maxZoom: 19
  }).addTo(map);
}
