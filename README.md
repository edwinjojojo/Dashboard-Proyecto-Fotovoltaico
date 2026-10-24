# Visor & Dashboard Proyecto Solar Fotovoltaico vr 1.0

Visor geográfico interactivo de alta precisión para el seguimiento integral de obras de energía solar fotovoltaica utility-scale (200 MWp / 160 MW AC): avance físico de bloques solares, subestación elevadora, línea de transmisión, cumplimiento ambiental y relacionamiento comunitario.

> [!IMPORTANT]
> ### 📢 AVISO DE DATOS DEMO / INFORMACIÓN DUMMY
> **Toda la información presentada en este repositorio y en el dashboard es 100% ficticia (dummy / mock data).**
> Este proyecto ha sido desarrollado exclusivamente como una **prueba de concepto (PoC) y demostración técnica** para evaluar y validar el uso de tableros de control interactivos y visores GIS aplicados al seguimiento, control de obra y monitoreo integral de proyectos de energía solar fotovoltaica.
>
> Las métricas de avance físico, cronogramas, frentes de obra, nombres de comunidades, registros ambientales y especificaciones no corresponden a ninguna obra ni entidad real en operación.
>
> **No hay generadores Python publicados** en este árbol. La actualización de datos se hace **editando a mano** los GeoJSON y `programacion-semanal.json` (ver sección más abajo).

---

## ☀️ Resumen Técnico del Proyecto

- **Nombre:** Parque Solar Fotovoltaico Sol de La Guajira 200 MWp
- **Ubicación:** Departamento de La Guajira, Colombia
- **Potencia Pico (DC):** 196.8 MWp
- **Potencia Nominal (AC):** 160.0 MW AC
- **Superficie Ocupada:** 324.5 hectáreas
- **Tecnología de Módulos:** Módulos bifaciales monocristalinos N-Type TOPCon de 600Wp (328.000 paneles)
- **Estructura de Soporte:** Seguidores solares a un eje monofila (1P Trackers con backtracking anti-sombras)
- **Centros de Transformación:** 10 Skids de 3.5 MVA (Inversor centralizado + transformador 0.69/34.5 kV)
- **Subestación Elevadora:** SE Guajira Solar 34.5 / 110 kV con transformador de potencia de 160 MVA y sistema de baterías BESS (20 MW / 40 MWh)
- **Línea de Evacuación:** LAT 110 kV de 8.75 km con 18 torres metálicas de celosía
- **Generación Limpia Estimada:** 415 GWh / año (Equivalente al consumo de 210.000 hogares)
- **Emisiones Mitigadas:** 186.750 Toneladas de CO₂eq / año

---

## 💻 Ejecución Local

El visor es **100 % estático** (HTML + GeoJSON + JSON). No requiere Node.js, backend ni base de datos.

**No abras `index.html` con doble clic (`file://`)**: el navegador bloquea los `fetch` locales. Usa un servidor HTTP.

```bash
cd docs/dashboard-fotovoltaico-source   # o la carpeta donde esté este README
python3 -m http.server 8000
```

Luego abre: `http://localhost:8000`

Alternativa: `npx --yes serve -l 8000` (si tienes Node).

Leaflet 1.9.4 está vendored en `vendor/leaflet@1.9.4/` (sin CDN). **Leaflet.markercluster 1.5.3** está en `vendor/leaflet.markercluster@1.5.3/` (capa Comunidades). Las tipografías Google Fonts siguen por CDN con fallback a `system-ui`. El basemap satélite usa tiles Esri World Imagery (requiere red; revisar ToS de Esri para uso productivo).

### Estructura de código (Hito B)

```
index.html          # HTML fino (markup + links)
css/app.css         # Estilos
js/app.js           # Lógica Leaflet + paneles
vendor/leaflet@1.9.4/
vendor/leaflet.markercluster@1.5.3/
```

- **Móvil (≤900px):** hamburger abre drawer a pantalla completa del sidebar; chips compactos GHI / Avance / CO₂.
- **Comunidades:** MarkerCluster; marcadores individuales desde zoom ≥ 13.
- **Export:** botón `⬇ CSV día` exporta bloques/torres/ambientales/actividades del día (o resumen semanal) activo.
- **Validación liviana:** al cargar, avisos en consola + banner si faltan campos clave (no bloquea el mapa).

---

## 📂 Capas Geoespaciales (GeoJSON WGS 84)

| Capa | Archivo | Tipo | Notas |
| :--- | :--- | :--- | :--- |
| **Bloques Solares** | `geojson/Bloques_Solares.geojson` | Polygon (10) | Fuente de KPIs de avance (ponderado por `potencia_mwp`) |
| **Área del Parque** | `geojson/Area_Parque_Solar.geojson` | Polygon | Incluye `CO2_EVITADO_ANUAL` para el topbar |
| **Inversores / Skids** | `geojson/Inversores_Transformadores.geojson` | Point (10) | |
| **Subestación Solar** | `geojson/Subestacion_Solar.geojson` | Polygon / Point | |
| **Línea Transmisión** | `geojson/Linea_Transmision.geojson` | LineString / Point | Torres ST-01…ST-18 |
| **Estación Meteo** | `geojson/Estacion_Meteorologica.geojson` | Point | GHI / temp. módulo del topbar |
| **Gestión Ambiental** | `geojson/Obras_Drenaje_Ambientales.geojson` | Point | Códigos FAU-xx / OD-xx |
| **Comunidades** | `geojson/Comunidades.geojson` | Point (~122) | Semáforo social; **cluster** hasta zoom ≥ 13 |
| **Municipios** | `geojson/Municipios.geojson` | Polygon (~2.9 MB) | **Lazy-load** (checkbox); fuera del critical path |

Si una capa falla al cargar, las demás siguen visibles (carga con `Promise.allSettled` + banner de error por capa).

---

## ✏️ Cómo editar datos (manual)

### Programación semanal — `programacion-semanal.json`

- `defaultWeekId`: id de la semana activa al abrir.
- Cada semana en `weeks[]` tiene `id`, `label`, `sheet` y `days[]`.
- Cada día (`key`: `monday`…`friday` / `summary`) incluye:
  - `blocks`: ids de bloques (`FV-01` … `FV-10`) a resaltar
  - `towers`: códigos de torre (`ST-01` …)
  - `ambientales`: códigos ambientales (`FAU-01`, `OD-03`, …)
  - `activities[]`: `{ "front", "title", "location" }` para la lista del panel

Los ids deben coincidir con propiedades en los GeoJSON correspondientes.

### Bloques solares — campos KPI

En cada feature de `Bloques_Solares.geojson`, propiedades usadas por el dashboard:

| Campo | Uso |
| :--- | :--- |
| `id` | `FV-01` … (selector y programación) |
| `potencia_mwp` | Peso del promedio global |
| `avance_ponderado` | Avance del bloque / global |
| `hincado_pct`, `estructura_pct`, `modulos_pct`, `zanjeo_pct`, `cableado_pct`, `comisionamiento_pct` | Semáforos EPC |
| `estado`, `zona`, `inversor_id`, `name` | UI / dossier |

El **Avance Global** del topbar y el panel EPC consolidado se calculan en el cliente como promedio **ponderado por `potencia_mwp`** (ya no hay % hardcodeados).

### Estación meteo / CO₂

- Topbar GHI ← `ghi_actual` en `Estacion_Meteorologica.geojson`
- Temp. módulo ← `temperatura_celula`
- CO₂ ← `CO2_EVITADO_ANUAL` en `Area_Parque_Solar.geojson`

### Comunidades (schema social breve)

Preferir `name` (el UI también acepta `Name` como fallback). Campos usados:

| Campo | Uso |
| :--- | :--- |
| `name` / `Name` | Etiqueta y selector |
| `Semaforo` | `Verde` / `Amarillo` / `Rojo` |
| `Distancia_Parque_km` | Ficha / popup |
| `Tipo_Influencia`, `Empleo_Local_Activo`, `Convenio_Social`, `Estado_Consulta`, `Observaciones_Bitacora`, `Ultima_Visita` | Panel Entorno |

### Schema — programación (resumen)

Raíz: `{ defaultWeekId, weeks[] }`.  
Semana: `{ id, sheet, label, days[] }`.  
Día: `{ key, name, date, label, blocks[], towers[], ambientales[], activities[] }`.  
Actividad: `{ front, title, location }`.

IDs cruzados esperados: `FV-xx` (bloques), `ST-xx` (torres), `FAU-xx` / `OD-xx` (ambientales).

---

## 📌 Módulos del Tablero

1. **Programación Semanal de Obra** — frentes por día; resalta bloques/torres/ambientales.
2. **Avance Bloques Solares (EPC)** — KPIs por bloque o consolidado del parque.
3. **Subestación & LAT 110 kV** — SE + torres ST-01…ST-18.
4. **Gestión Ambiental & Biótica** — PMA/ANLA demo, fauna/flora, drenaje.
5. **Entorno Social & Comunidades** — semáforo + filtro espacial.

---

## ⚠️ Declaración de Datos Demo y Alcance

- Toda la información (GeoJSON, cronograma, métricas, comunidades) es **100 % ficticia**.
- Objetivo: PoC / demostración de dashboard GIS para proyectos fotovoltaicos.
- Sin vinculación a obra, empresa o comunidad real.
