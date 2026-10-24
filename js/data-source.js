/**
 * Data layer (Hito C piloto).
 *
 * All GeoJSON / programación fetches go through here so the same UI can point at:
 * - same-origin static files (default, VITE_DATA_BASE='')
 * - a mock / future API base (e.g. VITE_DATA_BASE=/api/data)
 *
 * See data/README.md for pointing at a real backend later.
 */

const RAW = import.meta.env.VITE_DATA_BASE ?? '';
/** Base URL without trailing slash. Empty = same-origin relative paths. */
export const DATA_BASE = String(RAW).replace(/\/$/, '');

/**
 * Resolve a project-relative data path to a fetchable URL.
 * @param {string} relativePath e.g. 'geojson/Bloques_Solares.geojson' or './programacion-semanal.json'
 */
export function dataUrl(relativePath) {
  const clean = String(relativePath).replace(/^\.\//, '');
  if (!DATA_BASE) return `./${clean}`;
  return `${DATA_BASE}/${clean}`;
}

/**
 * Fetch JSON/GeoJSON from the configured data base.
 * @param {string} relativePath
 * @param {string} [label] human label for errors
 */
export async function fetchDataJson(relativePath, label) {
  const url = dataUrl(relativePath);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${label || relativePath}: HTTP ${res.status}`);
  }
  return res.json();
}

export const DATA_PATHS = {
  bloques: 'geojson/Bloques_Solares.geojson',
  area: 'geojson/Area_Parque_Solar.geojson',
  inversores: 'geojson/Inversores_Transformadores.geojson',
  subestacion: 'geojson/Subestacion_Solar.geojson',
  linea: 'geojson/Linea_Transmision.geojson',
  meteo: 'geojson/Estacion_Meteorologica.geojson',
  ambientales: 'geojson/Obras_Drenaje_Ambientales.geojson',
  comunidades: 'geojson/Comunidades.geojson',
  municipios: 'geojson/Municipios.geojson',
  schedule: 'programacion-semanal.json'
};
