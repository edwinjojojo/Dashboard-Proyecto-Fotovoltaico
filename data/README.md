# Data layer — how to point at a real API later

This piloto still serves **demo GeoJSON + `programacion-semanal.json`** from the repo. The client does not hardcode a SCADA or ERP; it loads JSON through `js/data-source.js`.

## Current modes

| Mode | `VITE_DATA_BASE` | Behavior |
| :--- | :--- | :--- |
| Same-origin static (default) | `''` (empty) | `fetch('./geojson/…')` and `./programacion-semanal.json` |
| Mock API path | `/api/data` | Vite plugin maps `/api/data/geojson/…` → files on disk (dev + preview) |

Copy `.env.example` → `.env` (gitignored) and set:

```bash
VITE_DATA_BASE=/api/data
```

Then `npm run dev` and open the app; Network tab should show requests under `/api/data/…`.

## Paths the UI expects

Relative to the data base:

- `geojson/Bloques_Solares.geojson`
- `geojson/Area_Parque_Solar.geojson`
- `geojson/Inversores_Transformadores.geojson`
- `geojson/Subestacion_Solar.geojson`
- `geojson/Linea_Transmision.geojson`
- `geojson/Estacion_Meteorologica.geojson`
- `geojson/Obras_Drenaje_Ambientales.geojson`
- `geojson/Comunidades.geojson`
- `geojson/Municipios.geojson` (lazy)
- `programacion-semanal.json`

CORS: if the API is on another origin, the server must allow the dashboard origin, or you put a reverse proxy in front.

## Moving to a real API (checklist)

1. Keep response bodies **GeoJSON FeatureCollection** (or the same programación schema). No need to change renderers if shapes match.
2. Set `VITE_DATA_BASE=https://api.example.com/v1/parque-demo` (no trailing slash).
3. Optionally add auth headers in `fetchDataJson` (Bearer / cookie) — **do not** put secrets in `VITE_*` vars that ship to the browser; use a BFF or cookie session.
4. Replace the Vite `/api/data` mock with your gateway; remove the plugin when unused.
5. Keep the UI banner “Datos de demostración” until production data is certified.

## Out of scope here

Real SCADA telemetry, multi-tenant auth product, ERP sync. This folder documents the **URL seam** only.
