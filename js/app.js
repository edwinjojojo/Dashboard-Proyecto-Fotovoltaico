import { dataUrl, fetchDataJson, DATA_PATHS } from './data-source.js';

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
const appState = {
  activeTab: "schedule",
  selectedWeekId: null,
  selectedDayKey: "monday",
  selectedBlockId: "ALL",
  selectedTowerId: "ALL",
  selectedAmbientId: "ALL",
  selectedCommunityId: null,
  activeSocialFilter: "ALL",
  scheduleData: null,
  geoLayers: {},
  markers: {
    blocks: {},
    inversores: {},
    subestacion: null,
    towers: {},
    line: null,
    meteo: null,
    ambientales: {},
    comunidades: {}
  }
};

// --- INICIALIZACIÓN DEL MAPA LEAFLET ---
const map = L.map('map', {
  center: [11.610, -72.019],
  zoom: 14,
  zoomControl: true
});

// Capas Base: Esri World Imagery (Satélite) y OpenStreetMap
const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Esri, Maxar, Earthstar Geographics',
  maxZoom: 19
}).addTo(map);

const osmStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
});

L.control.layers({
  "🛰️ Satélite Alta Resolución": esriSatellite,
  "🗺️ Callejero OpenStreetMap": osmStreet
}, null, { position: 'topleft' }).addTo(map);

L.control.scale({ imperial: false, metric: true, position: 'bottomright' }).addTo(map);

// Zoom at which community clusters expand to individual markers
const COMUNIDADES_UNCLUSTER_ZOOM = 13;

// Grupos de capas Leaflet para encender/apagar
// Municipios: NO se añade al mapa hasta activar el checkbox (lazy-load ~2.9 MB)
// Comunidades: MarkerClusterGroup (individuos desde zoom ≥ COMUNIDADES_UNCLUSTER_ZOOM)
const layerGroups = {
  area: L.layerGroup().addTo(map),
  bloques: L.layerGroup().addTo(map),
  inversores: L.layerGroup().addTo(map),
  subestacion: L.layerGroup().addTo(map),
  linea: L.layerGroup().addTo(map),
  meteo: L.layerGroup().addTo(map),
  ambientales: L.layerGroup().addTo(map),
  comunidades: L.markerClusterGroup({
    disableClusteringAtZoom: COMUNIDADES_UNCLUSTER_ZOOM,
    showCoverageOnHover: false,
    maxClusterRadius: 55,
    spiderfyOnMaxZoom: true,
    chunkedLoading: true
  }).addTo(map),
  municipios: L.layerGroup()
};

let municipiosLoadState = 'idle'; // idle | loading | ready | error

function communityDisplayName(props) {
  if (!props) return '';
  return props.name || props.Name || '';
}

// --- ICONOS VECTORIALES PERSONALIZADOS ---
function makeCustomIcon(iconUrl, size = [26, 26]) {
  return L.icon({
    iconUrl: iconUrl,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2]
  });
}

const icons = {
  inverter: makeCustomIcon('svg/inverter.svg', [24, 24]),
  substation: makeCustomIcon('svg/substation.svg', [28, 28]),
  tower: makeCustomIcon('svg/transmission-tower.svg', [22, 22]),
  meteo: makeCustomIcon('svg/meteo.svg', [26, 26]),
  environmental: makeCustomIcon('svg/environmental.svg', [24, 24]),
  drainage: makeCustomIcon('svg/drainage.svg', [22, 22]),
  communityGreen: L.divIcon({
    className: 'custom-com-icon',
    html: '<div style="background:#10b981; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 5px rgba(0,0,0,0.4);"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  }),
  communityYellow: L.divIcon({
    className: 'custom-com-icon',
    html: '<div style="background:#f59e0b; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 5px rgba(0,0,0,0.4);"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  }),
  communityRed: L.divIcon({
    className: 'custom-com-icon',
    html: '<div style="background:#ef4444; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 5px rgba(0,0,0,0.4);"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  })
};

// --- CARGA DE DATOS ASÍNCRONOS (allSettled: un fallo no vacía el mapa) ---
async function fetchJsonLabeled(urlOrPath, label) {
  // Absolute/relative URL already resolved → fetch directly; else treat as data path.
  if (/^(https?:|\/|\.\/)/.test(urlOrPath) || urlOrPath.includes('://')) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    return res.json();
  }
  return fetchDataJson(urlOrPath, label);
}

function showLayerErrors(failures) {
  const banner = document.getElementById('layer-errors-banner');
  const list = document.getElementById('layer-errors-list');
  if (!banner || !list) return;
  if (!failures.length) {
    banner.classList.remove('is-visible');
    list.innerHTML = '';
    return;
  }
  list.innerHTML = failures.map(f =>
    `<li><strong>${f.label}</strong>: ${f.message}</li>`
  ).join('');
  banner.classList.add('is-visible');
}

function shortMetric(raw, fallback) {
  if (raw == null || raw === '') return fallback || '—';
  const s = String(raw);
  const beforeParen = s.split('(')[0].trim();
  return beforeParen || s;
}

/** Promedios ponderados por potencia_mwp desde Bloques_Solares.geojson */
function computeParkAverages(bloquesFc) {
  const feats = (bloquesFc && bloquesFc.features) || [];
  if (!feats.length) return null;
  const totalMw = feats.reduce((s, f) => s + (Number(f.properties.potencia_mwp) || 0), 0) || feats.length;
  const wavg = (key) => {
    const sum = feats.reduce((s, f) => {
      const w = Number(f.properties.potencia_mwp) || (totalMw / feats.length);
      return s + (Number(f.properties[key]) || 0) * w;
    }, 0);
    return Math.round((sum / totalMw) * 10) / 10;
  };
  const totalMwp = Math.round(feats.reduce((s, f) => s + (Number(f.properties.potencia_mwp) || 0), 0) * 10) / 10;
  return {
    avance: wavg('avance_ponderado'),
    hincado: wavg('hincado_pct'),
    estructura: wavg('estructura_pct'),
    modulos: wavg('modulos_pct'),
    zanjeo: wavg('zanjeo_pct'),
    cableado: wavg('cableado_pct'),
    comision: wavg('comisionamiento_pct'),
    totalMwp,
    nBlocks: feats.length
  };
}

function updateTopbarKpis() {
  const avg = computeParkAverages(appState.geoLayers.bloques);
  const avanceEl = document.getElementById('kpi-top-avance');
  const chipAvance = document.getElementById('kpi-chip-avance');
  if (avg) {
    const avanceTxt = `${avg.avance} %`;
    if (avanceEl) avanceEl.textContent = avanceTxt;
    if (chipAvance) chipAvance.textContent = avanceTxt;
  }

  const meteoFeat = appState.geoLayers.meteo && appState.geoLayers.meteo.features && appState.geoLayers.meteo.features[0];
  if (meteoFeat) {
    const p = meteoFeat.properties;
    const ghiTxt = shortMetric(p.ghi_actual, '—');
    const tempTxt = shortMetric(p.temperatura_celula, '—');
    const ghiEl = document.getElementById('kpi-top-ghi');
    const tempEl = document.getElementById('kpi-top-temp');
    const chipGhi = document.getElementById('kpi-chip-ghi');
    if (ghiEl) ghiEl.textContent = ghiTxt;
    if (tempEl) tempEl.textContent = tempTxt;
    if (chipGhi) chipGhi.textContent = ghiTxt;
  }

  const areaFeat = appState.geoLayers.area && appState.geoLayers.area.features && appState.geoLayers.area.features[0];
  if (areaFeat) {
    const co2Raw = areaFeat.properties.CO2_EVITADO_ANUAL || '';
    const m = String(co2Raw).match(/([\d.]+)/);
    const co2Txt = m ? `${m[1]} t/año` : shortMetric(co2Raw, '—');
    const co2El = document.getElementById('kpi-top-co2');
    const chipCo2 = document.getElementById('kpi-chip-co2');
    if (co2El) co2El.textContent = co2Txt;
    if (chipCo2) chipCo2.textContent = m ? m[1] : co2Txt;
  }
}

function applyParkKpisToPanel(avg) {
  if (!avg) return;
  document.getElementById('kpi-block-ponderado').textContent = `${avg.avance} %`;
  document.getElementById('bar-block-ponderado').style.width = `${avg.avance}%`;
  document.getElementById('kpi-block-caption').textContent =
    `${avg.nBlocks} Bloques FV · ${avg.totalMwp} MWp en Construcción`;
  document.getElementById('kpi-val-hincado').textContent = `${avg.hincado} %`;
  document.getElementById('bar-val-hincado').style.width = `${avg.hincado}%`;
  document.getElementById('kpi-val-estructura').textContent = `${avg.estructura} %`;
  document.getElementById('bar-val-estructura').style.width = `${avg.estructura}%`;
  document.getElementById('kpi-val-modulos').textContent = `${avg.modulos} %`;
  document.getElementById('bar-val-modulos').style.width = `${avg.modulos}%`;
  document.getElementById('kpi-val-zanjeo').textContent = `${avg.zanjeo} %`;
  document.getElementById('bar-val-zanjeo').style.width = `${avg.zanjeo}%`;
  document.getElementById('kpi-val-cableado').textContent = `${avg.cableado} %`;
  document.getElementById('bar-val-cableado').style.width = `${avg.cableado}%`;
  document.getElementById('kpi-val-comision').textContent = `${avg.comision} %`;
  document.getElementById('bar-val-comision').style.width = `${avg.comision}%`;
  const dossierMw = document.getElementById('dossier-mwp');
  if (dossierMw) dossierMw.textContent = `${avg.totalMwp} MWp Total`;
}

async function loadData() {
  const layerSpecs = [
    { key: 'bloques', url: dataUrl(DATA_PATHS.bloques), label: 'Bloques Solares', render: renderBloquesSolares },
    { key: 'area', url: dataUrl(DATA_PATHS.area), label: 'Área del Parque', render: renderAreaParque },
    { key: 'inversores', url: dataUrl(DATA_PATHS.inversores), label: 'Inversores / Skids', render: renderInversores },
    { key: 'subestacion', url: dataUrl(DATA_PATHS.subestacion), label: 'Subestación', render: renderSubestacion },
    { key: 'linea', url: dataUrl(DATA_PATHS.linea), label: 'Línea de Transmisión', render: renderLineaTransmision },
    { key: 'meteo', url: dataUrl(DATA_PATHS.meteo), label: 'Estación Meteorológica', render: renderEstacionMeteo },
    { key: 'ambientales', url: dataUrl(DATA_PATHS.ambientales), label: 'Gestión Ambiental', render: renderAmbientales },
    { key: 'comunidades', url: dataUrl(DATA_PATHS.comunidades), label: 'Comunidades', render: renderComunidades },
    { key: 'schedule', url: dataUrl(DATA_PATHS.schedule), label: 'Programación semanal', render: null }
  ];

  const settled = await Promise.allSettled(
    layerSpecs.map(spec =>
      fetchJsonLabeled(spec.url, spec.label).then(data => ({ spec, data }))
    )
  );

  const failures = [];
  let okCount = 0;

  settled.forEach((result, i) => {
    const spec = layerSpecs[i];
    if (result.status === 'rejected') {
      const message = (result.reason && result.reason.message) || String(result.reason);
      console.error(`Capa fallida [${spec.label}]:`, result.reason);
      failures.push({ label: spec.label, message });
      return;
    }
    const { data } = result.value;
    okCount += 1;
    if (spec.key === 'schedule') {
      appState.scheduleData = data;
    } else {
      appState.geoLayers[spec.key] = data;
      try {
        if (spec.render) spec.render(data);
      } catch (renderErr) {
        console.error(`Error renderizando [${spec.label}]:`, renderErr);
        failures.push({ label: spec.label, message: `Render: ${renderErr.message || renderErr}` });
      }
    }
  });

  showLayerErrors(failures);
  updateTopbarKpis();

  const avg = computeParkAverages(appState.geoLayers.bloques);
  if (avg && appState.selectedBlockId === 'ALL') applyParkKpisToPanel(avg);

  if (appState.scheduleData) {
    try { initScheduleControls(appState.scheduleData); } catch (e) { console.error(e); }
  }
  try { initSelectControls(); } catch (e) { console.error(e); }
  initNavigationTabs();
  initLayerToggles();
  initQuickMapButtons();
  initSocialFilter();
  initMobileDrawer();
  initCsvExport();
  runLightSchemaValidation();

  const fb = document.getElementById('day-feedback');
  if (failures.length && okCount === 0) {
    fb.textContent = 'Error al cargar capas locales. Use un servidor HTTP (no file://).';
  } else if (failures.length) {
    fb.textContent = `Carga parcial · ${okCount}/${layerSpecs.length} OK · ver avisos arriba`;
  } else {
    const n = (appState.geoLayers.bloques && appState.geoLayers.bloques.features)
      ? appState.geoLayers.bloques.features.length : 0;
    fb.textContent = `Sistema sincronizado · ${n} Bloques FV cargados`;
  }
}

function renderMunicipios(data) {
  layerGroups.municipios.clearLayers();
  L.geoJSON(data, {
    style: {
      color: '#64748b',
      weight: 1.25,
      dashArray: '4, 4',
      fillColor: '#94a3b8',
      fillOpacity: 0.06
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};
      const title = p['Nombre Municipio'] || p.name || 'Municipio';
      layer.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">LÍMITE MUNICIPAL</div>
          <div class="solar-popup-title">${title}</div>
        </div>
        <div class="solar-popup-body">
          <div style="font-size:11px; color:#475569;">
            <strong>Departamento:</strong> ${p.Departamento || '—'}<br>
            <strong>Categoría:</strong> ${p['Categoría'] || '—'}
          </div>
        </div>
      `);
    }
  }).addTo(layerGroups.municipios);
}

async function ensureMunicipiosLoaded() {
  if (municipiosLoadState === 'ready') return true;
  if (municipiosLoadState === 'loading') return false;
  municipiosLoadState = 'loading';
  const chk = document.getElementById('layer-chk-municipios');
  const labelHint = chk && chk.closest('label');
  try {
    const data = await fetchJsonLabeled(dataUrl(DATA_PATHS.municipios), 'Municipios');
    appState.geoLayers.municipios = data;
    renderMunicipios(data);
    municipiosLoadState = 'ready';
    return true;
  } catch (err) {
    municipiosLoadState = 'error';
    console.error(err);
    showLayerErrors([{ label: 'Municipios', message: err.message || String(err) }]);
    if (chk) chk.checked = false;
    return false;
  } finally {
    if (labelHint && municipiosLoadState === 'ready') {
      const span = labelHint.querySelector('span:last-child');
      if (span) span.textContent = 'Municipios (4)';
    }
  }
}

// --- RENDERIZADORES DE CAPAS EN LEAFLET ---

// 1. Área del Parque
function renderAreaParque(data) {
  L.geoJSON(data, {
    style: {
      color: '#38bdf8',
      weight: 2.5,
      dashArray: '6, 6',
      fillColor: '#0284c7',
      fillOpacity: 0.04
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">POLÍGONO DEL PROYECTO</div>
          <div class="solar-popup-title">${p.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Capacidad DC</span>
              <span class="solar-popup-m-val">${p.CAPACIDAD_MWP} MWp</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Área Predial</span>
              <span class="solar-popup-m-val">${p.AREA_HA} ha</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Módulos Bifaciales</span>
              <span class="solar-popup-m-val">${p.MODULOS_TOTAL.toLocaleString()}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Generación Anual</span>
              <span class="solar-popup-m-val">${p.GENERACION_ESTIMADA}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Operador:</strong> ${p.OPERADOR}<br>
            <strong>Licencia ANLA:</strong> ${p.ESTADO_LICENCIA}
          </div>
        </div>
      `);
    }
  }).addTo(layerGroups.area);
}

// 2. Bloques Solares
function renderBloquesSolares(data) {
  L.geoJSON(data, {
    style: (feature) => {
      const pct = feature.properties.avance_ponderado;
      const color = pct >= 80 ? '#10b981' : (pct >= 40 ? '#f59e0b' : '#3b82f6');
      return {
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.25
      };
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      appState.markers.blocks[p.id] = layer;

      layer.bindTooltip(`<b>${p.id}</b> · ${p.avance_ponderado}%`, {
        permanent: false,
        direction: 'center',
        className: 'block-tooltip'
      });

      layer.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${p.zona}</div>
          <div class="solar-popup-title">${p.name} (${p.potencia_mwp} MWp)</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Avance Global</span>
              <span class="solar-popup-m-val" style="color:var(--solar-orange); font-size:14px;">${p.avance_ponderado} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Hincado</span>
              <span class="solar-popup-m-val">${p.hincado_pct} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Estructuras</span>
              <span class="solar-popup-m-val">${p.estructura_pct} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Módulos</span>
              <span class="solar-popup-m-val">${p.modulos_pct} %</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Seguidores:</strong> ${p.num_trackers} trackers 1P<br>
            <strong>Módulos:</strong> ${p.num_modulos.toLocaleString()} paneles TOPCon<br>
            <strong>Inversor Asignado:</strong> ${p.inversor_id}
          </div>
          <button class="solar-popup-action-btn" onclick="selectBlock('${p.id}', true)">
            📊 Ver Métricas en Panel Bloques
          </button>
        </div>
      `);

      layer.on('click', () => {
        selectBlock(p.id, false);
      });
    }
  }).addTo(layerGroups.bloques);
}

// 3. Inversores y Skids de Transformación
function renderInversores(data) {
  L.geoJSON(data, {
    pointToLayer: (feature, latlng) => {
      const marker = L.marker(latlng, { icon: icons.inverter });
      appState.markers.inversores[feature.properties.codigo] = marker;
      return marker;
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${p.tipo}</div>
          <div class="solar-popup-title">${p.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Potencia</span>
              <span class="solar-popup-m-val">${p.potencia_mva} MVA</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Tensión</span>
              <span class="solar-popup-m-val">${p.tension_bt_mt}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Strings DC</span>
              <span class="solar-popup-m-val">${p.strings_conectados}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Estado</span>
              <span class="solar-popup-m-val" style="color:var(--solar-blue);">${p.estado}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Bloque Asociado:</strong> ${p.bloque_id}<br>
            <strong>Aparamenta MT:</strong> ${p.celda_mt}
          </div>
        </div>
      `);
    }
  }).addTo(layerGroups.inversores);
}

// 4. Subestación Solar
function renderSubestacion(data) {
  L.geoJSON(data, {
    style: {
      color: '#eab308',
      weight: 2.5,
      fillColor: '#fef08a',
      fillOpacity: 0.35
    },
    pointToLayer: (feature, latlng) => {
      return L.marker(latlng, { icon: icons.substation });
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      if (p.codigo) {
        layer.bindPopup(`
          <div class="solar-popup-head">
            <div class="solar-popup-category">${p.tipo}</div>
            <div class="solar-popup-title">${p.name}</div>
          </div>
          <div class="solar-popup-body">
            <div class="solar-popup-metrics">
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Transformación</span>
                <span class="solar-popup-m-val">${p.potencia_transformacion}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Avance Global</span>
                <span class="solar-popup-m-val" style="color:var(--solar-orange);">${p.avance_general}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Celdas MT</span>
                <span class="solar-popup-m-val">${p.celdas_mt}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Baterías BESS</span>
                <span class="solar-popup-m-val">${p.bess_capacidad}</span>
              </div>
            </div>
            <div style="font-size:10.5px; color:#475569;">
              <strong>Estado:</strong> ${p.estado}<br>
              <strong>Bahías:</strong> ${p.bahias}
            </div>
            <button class="solar-popup-action-btn" onclick="switchToTab('substation')">
              ⚡ Ver en Panel Subestación
            </button>
          </div>
        `);
      }
    }
  }).addTo(layerGroups.subestacion);
}

// 5. Línea de Transmisión LAT 110 kV
function renderLineaTransmision(data) {
  L.geoJSON(data, {
    style: (feature) => {
      if (feature.geometry.type === 'LineString') {
        return {
          color: '#475569',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '4, 4'
        };
      }
    },
    pointToLayer: (feature, latlng) => {
      const marker = L.marker(latlng, { icon: icons.tower });
      appState.markers.towers[feature.properties.codigo] = marker;
      return marker;
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      if (feature.geometry.type === 'LineString') {
        layer.bindPopup(`
          <div class="solar-popup-head">
            <div class="solar-popup-category">LÍNEA DE ALTA TENSIÓN</div>
            <div class="solar-popup-title">${p.name}</div>
          </div>
          <div class="solar-popup-body">
            <div class="solar-popup-metrics">
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Tensión</span>
                <span class="solar-popup-m-val">${p.tension_kv} kV</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Longitud</span>
                <span class="solar-popup-m-val">${p.longitud_km} km</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Torres Total</span>
                <span class="solar-popup-m-val">${p.torres_total}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Tendido</span>
                <span class="solar-popup-m-val">${p.avance_tendido}</span>
              </div>
            </div>
          </div>
        `);
      } else {
        layer.bindTooltip(p.codigo, { permanent: true, direction: 'right', className: 'tower-label' });
        layer.bindPopup(`
          <div class="solar-popup-head">
            <div class="solar-popup-category">ESTRUCTURA LAT 110 KV</div>
            <div class="solar-popup-title">${p.name}</div>
          </div>
          <div class="solar-popup-body">
            <div class="solar-popup-metrics">
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Avance Torre</span>
                <span class="solar-popup-m-val" style="color:var(--solar-orange);">${p.avance_global} %</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Cimentación</span>
                <span class="solar-popup-m-val">${p.cimentacion_pct} %</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Izaje</span>
                <span class="solar-popup-m-val">${p.izaje_pct} %</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Tendido</span>
                <span class="solar-popup-m-val">${p.tendido_pct} %</span>
              </div>
            </div>
            <div style="font-size:10.5px; color:#475569;">
              <strong>Tipo:</strong> ${p.tipo_estructura} (${p.altura_m} m)<br>
              <strong>Conductor:</strong> ${p.conductor}
            </div>
          </div>
        `);
      }
    }
  }).addTo(layerGroups.linea);
}

// 6. Estación Meteorológica
function renderEstacionMeteo(data) {
  L.geoJSON(data, {
    pointToLayer: (feature, latlng) => {
      const marker = L.marker(latlng, { icon: icons.meteo });
      appState.markers.meteo = marker;
      return marker;
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">SOLARIMETRÍA CLASE A (ISO 9060)</div>
          <div class="solar-popup-title">${p.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">GHI Global</span>
              <span class="solar-popup-m-val" style="color:var(--solar-gold);">${p.ghi_actual}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">DNI Directa</span>
              <span class="solar-popup-m-val">${p.dni_actual}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">GTI en Módulo</span>
              <span class="solar-popup-m-val">${p.gti_plano_modulo}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Temp. Célula</span>
              <span class="solar-popup-m-val">${p.temperatura_celula}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Viento:</strong> ${p.velocidad_viento}<br>
            <strong>Soiling:</strong> ${p.factor_soiling}<br>
            <strong>Calibración:</strong> ${p.cumplimiento_iec}
          </div>
        </div>
      `);
    }
  }).addTo(layerGroups.meteo);
}

// 7. Obras Ambientales y Drenaje
function renderAmbientales(data) {
  L.geoJSON(data, {
    pointToLayer: (feature, latlng) => {
      const p = feature.properties;
      const icon = p.codigo.startsWith('OD') ? icons.drainage : icons.environmental;
      const marker = L.marker(latlng, { icon: icon });
      appState.markers.ambientales[p.codigo] = marker;
      return marker;
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${p.tipo_intervencion}</div>
          <div class="solar-popup-title">${p.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Avance Físico</span>
              <span class="solar-popup-m-val" style="color:var(--eco-green);">${p.avance_fisico_pct} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Ficha PMA</span>
              <span class="solar-popup-m-val" style="font-size:10px;">${p.ficha_pma}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Especificación:</strong> ${p.especificacion}<br>
            <strong>Ubicación/Cauce:</strong> ${p.cauce_zona}<br>
            <strong>Estado:</strong> ${p.estado}
          </div>
          <button class="solar-popup-action-btn" onclick="switchToTab('ambient')">
            🌿 Ver en Panel Ambiental
          </button>
        </div>
      `);
    }
  }).addTo(layerGroups.ambientales);
}

// 8. Comunidades (clustered until zoom ≥ COMUNIDADES_UNCLUSTER_ZOOM)
function renderComunidades(data) {
  layerGroups.comunidades.clearLayers();
  appState.markers.comunidades = {};

  L.geoJSON(data, {
    pointToLayer: (feature, latlng) => {
      const p = feature.properties || {};
      const sem = p.Semaforo;
      const icon = sem === 'Verde' ? icons.communityGreen : (sem === 'Amarillo' ? icons.communityYellow : icons.communityRed);
      const marker = L.marker(latlng, { icon: icon });
      const key = feature.id || communityDisplayName(p);
      appState.markers.comunidades[key] = marker;
      return marker;
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};
      const cname = communityDisplayName(p);
      const safeName = String(cname).replace(/'/g, "\\'");
      layer.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${p.Tipo_Influencia || ''}</div>
          <div class="solar-popup-title">Comunidad ${cname}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Relacionamiento</span>
              <span class="solar-popup-m-val" style="color:${p.Semaforo === 'Verde' ? '#10b981' : (p.Semaforo === 'Amarillo' ? '#f59e0b' : '#ef4444')};">
                ${p.Semaforo || '—'}
              </span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Distancia Parque</span>
              <span class="solar-popup-m-val">${p.Distancia_Parque_km} km</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Empleo Local</span>
              <span class="solar-popup-m-val" style="color:var(--solar-orange);">${p.Empleo_Local_Activo} personas</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Última Visita</span>
              <span class="solar-popup-m-val" style="font-size:10px;">${p.Ultima_Visita}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Convenio Social:</strong> ${p.Convenio_Social}
          </div>
          <button class="solar-popup-action-btn" onclick="selectCommunity('${safeName}')">
            👥 Abrir Ficha en Panel Entorno
          </button>
        </div>
      `);

      layer.on('click', () => {
        selectCommunity(cname);
      });
    }
  }).addTo(layerGroups.comunidades);
}

// --- PROGRAMACIÓN SEMANAL & REACTIVIDAD ---
function initScheduleControls(sched) {
  const weekSelect = document.getElementById('week-select');
  weekSelect.innerHTML = '';

  sched.weeks.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = `${w.label} (${w.sheet})`;
    if (w.id === sched.defaultWeekId) opt.selected = true;
    weekSelect.appendChild(opt);
  });

  appState.selectedWeekId = sched.defaultWeekId;

  weekSelect.addEventListener('change', (e) => {
    appState.selectedWeekId = e.target.value;
    renderWeekDays();
  });

  renderWeekDays();
}

function renderWeekDays() {
  const week = appState.scheduleData.weeks.find(w => w.id === appState.selectedWeekId);
  if (!week) return;

  const dayBtns = document.querySelectorAll('.day-button');
  dayBtns.forEach(btn => {
    const dayKey = btn.dataset.day;
    if (dayKey === 'week-summary') {
      btn.onclick = () => selectDay('week-summary');
      return;
    }

    const dayData = week.days.find(d => d.key === dayKey);
    if (dayData) {
      const dateSpan = btn.querySelector('.day-date');
      if (dateSpan) dateSpan.textContent = `${dayData.date}`;
      btn.onclick = () => selectDay(dayKey);
    }
  });

  selectDay(appState.selectedDayKey || 'monday');
}

function selectDay(dayKey) {
  appState.selectedDayKey = dayKey;

  document.querySelectorAll('.day-button').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.day === dayKey);
  });

  const week = appState.scheduleData.weeks.find(w => w.id === appState.selectedWeekId);
  if (!week) return;

  const container = document.getElementById('activity-items-list');
  container.innerHTML = '';

  let activities = [];
  let dayTitle = "";
  let activeBlocks = [];
  let activeTowers = [];
  let activeAmbientales = [];

  if (dayKey === 'week-summary') {
    dayTitle = `Resumen Semanal · ${week.label}`;
    week.days.forEach(d => {
      activities.push(...d.activities);
      activeBlocks.push(...(d.blocks || []));
      activeTowers.push(...(d.towers || []));
      activeAmbientales.push(...(d.ambientales || []));
    });
  } else {
    const day = week.days.find(d => d.key === dayKey);
    if (day) {
      dayTitle = `${day.name} ${day.date} de Octubre 2026`;
      activities = day.activities || [];
      activeBlocks = day.blocks || [];
      activeTowers = day.towers || [];
      activeAmbientales = day.ambientales || [];
    }
  }

  document.getElementById('activity-day-title').textContent = dayTitle;
  document.getElementById('activity-day-meta').textContent = `${activities.length} actividades programadas en frentes de obra`;
  document.getElementById('day-feedback').textContent = `Jornada sincronizada: ${activities.length} frentes activos`;

  // Renderizar items de actividades
  activities.forEach(act => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <span class="activity-badge">${act.front}</span>
      <div class="activity-title">${act.title}</div>
      <div class="activity-location">📍 ${act.location}</div>
    `;
    item.onclick = () => {
      highlightLocation(act.location);
    };
    container.appendChild(item);
  });

  // Resaltar en el mapa los bloques activos para el día
  highlightScheduledEntities(activeBlocks, activeTowers, activeAmbientales);
}

function highlightScheduledEntities(blockIds, towerIds, ambIds) {
  // Restablecer estilos
  Object.entries(appState.markers.blocks).forEach(([id, layer]) => {
    const isActive = blockIds.includes(id);
    layer.setStyle({
      fillOpacity: isActive ? 0.6 : 0.2,
      weight: isActive ? 3.5 : 2,
      color: isActive ? '#f59e0b' : '#3b82f6'
    });
  });
}

function highlightLocation(locStr) {
  // Buscar si menciona algún bloque FV
  const blockMatch = locStr.match(/FV-\d+/i);
  if (blockMatch) {
    const bId = blockMatch[0].toUpperCase();
    if (appState.markers.blocks[bId]) {
      map.fitBounds(appState.markers.blocks[bId].getBounds(), { padding: [40, 40], maxZoom: 16 });
      appState.markers.blocks[bId].openPopup();
      return;
    }
  }
  // Buscar si menciona torre ST
  const towerMatch = locStr.match(/ST-\d+/i);
  if (towerMatch) {
    const tId = towerMatch[0].toUpperCase();
    if (appState.markers.towers[tId]) {
      map.setView(appState.markers.towers[tId].getLatLng(), 16);
      appState.markers.towers[tId].openPopup();
      return;
    }
  }
  // Subestación
  if (locStr.toLowerCase().includes('subestación') || locStr.toLowerCase().includes('se guajira')) {
    map.setView([11.610, -72.004], 16);
    return;
  }
  // Campamento / Vivero
  if (locStr.toLowerCase().includes('vivero') || locStr.toLowerCase().includes('viv-01')) {
    map.setView([11.615, -72.006], 16);
    return;
  }
}

// --- PANELES SELECTORES Y NAVEGACIÓN ---
function initSelectControls() {
  // 1. Selector de Bloque
  const blockSel = document.getElementById('block-quick-select');
  if (blockSel && appState.geoLayers.bloques && appState.geoLayers.bloques.features) {
    appState.geoLayers.bloques.features.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.properties.id;
      opt.textContent = `${f.properties.id} · ${f.properties.name} (${f.properties.avance_ponderado}%)`;
      blockSel.appendChild(opt);
    });
    blockSel.onchange = (e) => {
      selectBlock(e.target.value, true);
    };
  }

  const resetBtn = document.getElementById('blocks-reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      selectBlock('ALL', true);
    };
  }

  // 2. Selector de Torres LAT
  const towerSel = document.getElementById('tower-select');
  if (towerSel && appState.geoLayers.linea && appState.geoLayers.linea.features) {
    const towerFeatures = appState.geoLayers.linea.features.filter(f => f.geometry.type === 'Point');
    towerFeatures.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.properties.codigo;
      opt.textContent = `${f.properties.codigo} · ${f.properties.name} (${f.properties.avance_global}%)`;
      towerSel.appendChild(opt);
    });
    towerSel.onchange = (e) => {
      selectTower(e.target.value);
    };
  }

  // 3. Selector de Puntos Ambientales
  const ambSel = document.getElementById('ambient-select');
  if (ambSel && appState.geoLayers.ambientales && appState.geoLayers.ambientales.features) {
    appState.geoLayers.ambientales.features.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.properties.codigo;
      opt.textContent = `${f.properties.codigo} · ${f.properties.name}`;
      ambSel.appendChild(opt);
    });
    ambSel.onchange = (e) => {
      selectAmbient(e.target.value);
    };
  }

  // 4. Selector de Comunidades
  const comSel = document.getElementById('community-select');
  if (comSel && appState.geoLayers.comunidades && appState.geoLayers.comunidades.features) {
    const comFeatures = [...appState.geoLayers.comunidades.features].sort((a, b) =>
      communityDisplayName(a.properties).localeCompare(communityDisplayName(b.properties))
    );
    comFeatures.forEach(f => {
      const cname = communityDisplayName(f.properties);
      const opt = document.createElement('option');
      opt.value = cname;
      opt.textContent = `${cname} (${f.properties.Semaforo}) · ${f.properties.Distancia_Parque_km} km`;
      comSel.appendChild(opt);
    });
    comSel.onchange = (e) => {
      selectCommunity(e.target.value);
    };
  }
}

// Lógica al seleccionar un Bloque
function selectBlock(blockId, zoomTo) {
  appState.selectedBlockId = blockId;
  document.getElementById('block-quick-select').value = blockId;

  const resetBtn = document.getElementById('blocks-reset-btn');
  const scopeBadge = document.getElementById('blocks-scope-badge');
  const scopeTitle = document.getElementById('blocks-scope-title');
  const scopeSubtitle = document.getElementById('blocks-scope-subtitle');

  if (blockId === 'ALL') {
    resetBtn.style.display = 'none';
    scopeBadge.textContent = 'Consolidado 200 MWp';
    scopeTitle.textContent = 'Todo el Parque Solar';
    scopeSubtitle.textContent = '10 Bloques Fotovoltaicos · 328.000 Módulos Bifaciales';

    const avg = computeParkAverages(appState.geoLayers.bloques);
    applyParkKpisToPanel(avg);
    document.getElementById('dossier-inversor').textContent = '10 Centros CT-01 a CT-10';

    if (zoomTo) {
      map.setView([11.610, -72.019], 14);
    }
  } else {
    if (!appState.geoLayers.bloques) return;
    const feat = appState.geoLayers.bloques.features.find(f => f.properties.id === blockId);
    if (!feat) return;
    const p = feat.properties;

    resetBtn.style.display = 'inline-flex';
    scopeBadge.textContent = p.zona;
    scopeTitle.textContent = `${p.id} · ${p.name}`;
    scopeSubtitle.textContent = `Capacidad: ${p.potencia_mwp} MWp · Inversor: ${p.inversor_id}`;

    document.getElementById('kpi-block-ponderado').textContent = `${p.avance_ponderado} %`;
    document.getElementById('bar-block-ponderado').style.width = `${p.avance_ponderado}%`;
    document.getElementById('kpi-block-caption').textContent = `Estado: ${p.estado}`;

    document.getElementById('kpi-val-hincado').textContent = `${p.hincado_pct} %`;
    document.getElementById('bar-val-hincado').style.width = `${p.hincado_pct}%`;
    document.getElementById('kpi-val-estructura').textContent = `${p.estructura_pct} %`;
    document.getElementById('bar-val-estructura').style.width = `${p.estructura_pct}%`;
    document.getElementById('kpi-val-modulos').textContent = `${p.modulos_pct} %`;
    document.getElementById('bar-val-modulos').style.width = `${p.modulos_pct}%`;
    document.getElementById('kpi-val-zanjeo').textContent = `${p.zanjeo_pct} %`;
    document.getElementById('bar-val-zanjeo').style.width = `${p.zanjeo_pct}%`;
    document.getElementById('kpi-val-cableado').textContent = `${p.cableado_pct} %`;
    document.getElementById('bar-val-cableado').style.width = `${p.cableado_pct}%`;
    document.getElementById('kpi-val-comision').textContent = `${p.comisionamiento_pct} %`;
    document.getElementById('bar-val-comision').style.width = `${p.comisionamiento_pct}%`;

    document.getElementById('dossier-mwp').textContent = `${p.potencia_mwp} MWp (${p.num_modulos.toLocaleString()} paneles)`;
    document.getElementById('dossier-inversor').textContent = `Centro de Transformación ${p.inversor_id}`;

    if (zoomTo && appState.markers.blocks[blockId]) {
      map.fitBounds(appState.markers.blocks[blockId].getBounds(), { padding: [50, 50], maxZoom: 16 });
      appState.markers.blocks[blockId].openPopup();
    }
  }

  switchToTab('blocks');
}

// Lógica al seleccionar una Torre
function selectTower(towerCode) {
  if (towerCode === 'ALL') {
    document.getElementById('kpi-lat-ciment').textContent = '68.0 %';
    document.getElementById('bar-lat-ciment').style.width = '68%';
    document.getElementById('kpi-lat-izaje').textContent = '55.0 %';
    document.getElementById('bar-lat-izaje').style.width = '55%';
    document.getElementById('kpi-lat-tendido').textContent = '42.0 %';
    document.getElementById('bar-lat-tendido').style.width = '42%';
    map.setView([11.580, -71.995], 13);
  } else {
    const feat = appState.geoLayers.linea.features.find(f => f.properties && f.properties.codigo === towerCode);
    if (!feat) return;
    const p = feat.properties;

    document.getElementById('kpi-lat-ciment').textContent = `${p.cimentacion_pct} %`;
    document.getElementById('bar-lat-ciment').style.width = `${p.cimentacion_pct}%`;
    document.getElementById('kpi-lat-izaje').textContent = `${p.izaje_pct} %`;
    document.getElementById('bar-lat-izaje').style.width = `${p.izaje_pct}%`;
    document.getElementById('kpi-lat-tendido').textContent = `${p.tendido_pct} %`;
    document.getElementById('bar-lat-tendido').style.width = `${p.tendido_pct}%`;

    if (appState.markers.towers[towerCode]) {
      map.setView(appState.markers.towers[towerCode].getLatLng(), 16);
      appState.markers.towers[towerCode].openPopup();
    }
  }
}

// Lógica al seleccionar Punto Ambiental
function selectAmbient(ambCode) {
  if (ambCode === 'ALL') {
    map.setView([11.610, -72.019], 14);
  } else {
    const marker = appState.markers.ambientales[ambCode];
    if (marker) {
      map.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  }
}

// Lógica al seleccionar Comunidad
function selectCommunity(name) {
      if (!name) return;
      const comSel = document.getElementById('community-select');
      if (comSel) comSel.value = name;

      if (!appState.geoLayers.comunidades) return;
      const feat = appState.geoLayers.comunidades.features.find(f => communityDisplayName(f.properties) === name);
  if (!feat) return;
  const p = feat.properties;

  const cname = communityDisplayName(p);
  document.getElementById('dossier-com-title').textContent = `Comunidad ${cname}`;
  document.getElementById('dossier-com-sem').innerHTML = `<span style="color:${p.Semaforo === 'Verde' ? '#10b981' : (p.Semaforo === 'Amarillo' ? '#f59e0b' : '#ef4444')}; font-weight:800;">${p.Semaforo}</span>`;
  document.getElementById('dossier-com-infl').textContent = p.Tipo_Influencia;
  document.getElementById('dossier-com-dist').textContent = `${p.Distancia_Parque_km} km`;
  document.getElementById('dossier-com-empleo').textContent = `${p.Empleo_Local_Activo} personas vinculadas`;
  document.getElementById('dossier-com-consulta').textContent = p.Estado_Consulta;
  document.getElementById('dossier-com-convenio').textContent = p.Convenio_Social;
  document.getElementById('dossier-com-bitacora').textContent = p.Observaciones_Bitacora;

  switchToTab('entorno');
  openMobileDrawer();

  const marker = appState.markers.comunidades[feat.id || cname];
  if (marker && layerGroups.comunidades.zoomToShowLayer) {
    layerGroups.comunidades.zoomToShowLayer(marker, () => marker.openPopup());
  } else if (marker) {
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), COMUNIDADES_UNCLUSTER_ZOOM));
    marker.openPopup();
  }
}

// Semáforo social y filtro espacial
function initSocialFilter() {
  const cards = document.querySelectorAll('.social-kpi-card');
  cards.forEach(card => {
    card.onclick = () => {
      cards.forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');

      const sem = card.dataset.semaforo;
      appState.activeSocialFilter = sem;

      const bounds = [];
      Object.entries(appState.markers.comunidades).forEach(([id, marker]) => {
        const feat = appState.geoLayers.comunidades.features.find(f => (f.id || communityDisplayName(f.properties)) === id);
        if (!feat) return;

        const matches = sem === 'ALL' || feat.properties.Semaforo === sem;
        if (matches) {
          marker.setOpacity(1.0);
          bounds.push(marker.getLatLng());
        } else {
          marker.setOpacity(0.15);
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
      }
    };
  });
}

// Control de pestañas del panel lateral
function initNavigationTabs() {
  const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      switchToTab(btn.dataset.tab);
    };
  });
}

function switchToTab(tabName) {
  appState.activeTab = tabName;

  document.querySelectorAll('.sidebar-tab-btn').forEach(b => {
    b.classList.toggle('is-active', b.dataset.tab === tabName);
  });

  document.querySelectorAll('.panel-view').forEach(p => {
    p.style.display = p.id === `panel-${tabName}` ? 'flex' : 'none';
  });
}

// Toggle de capas del mapa
function initLayerToggles() {
  const toggleMap = {
    'layer-chk-bloques': layerGroups.bloques,
    'layer-chk-area': layerGroups.area,
    'layer-chk-inversores': layerGroups.inversores,
    'layer-chk-subestacion': layerGroups.subestacion,
    'layer-chk-linea': layerGroups.linea,
    'layer-chk-meteo': layerGroups.meteo,
    'layer-chk-ambientales': layerGroups.ambientales,
    'layer-chk-comunidades': layerGroups.comunidades
  };

  Object.entries(toggleMap).forEach(([chkId, layerGroup]) => {
    const chk = document.getElementById(chkId);
    if (chk) {
      chk.onchange = (e) => {
        if (e.target.checked) {
          map.addLayer(layerGroup);
        } else {
          map.removeLayer(layerGroup);
        }
      };
    }
  });

  // Municipios: lazy-load (~2.9 MB) solo al marcar el checkbox
  const munChk = document.getElementById('layer-chk-municipios');
  if (munChk) {
    munChk.onchange = async (e) => {
      if (e.target.checked) {
        const ok = await ensureMunicipiosLoaded();
        if (ok) map.addLayer(layerGroups.municipios);
      } else {
        map.removeLayer(layerGroups.municipios);
      }
    };
  }

  const dismissErr = document.getElementById('layer-errors-dismiss');
  if (dismissErr) {
    dismissErr.onclick = () => {
      document.getElementById('layer-errors-banner').classList.remove('is-visible');
    };
  }
}

// Botones rápidos del mapa
function initQuickMapButtons() {
  document.getElementById('btn-focus-park').onclick = () => {
    map.setView([11.610, -72.019], 14);
  };
  document.getElementById('qbtn-park').onclick = () => {
    map.setView([11.610, -72.019], 14);
  };
  document.getElementById('qbtn-sub').onclick = () => {
    map.setView([11.610, -72.004], 16);
  };
  document.getElementById('qbtn-line').onclick = () => {
    map.setView([11.580, -71.995], 13);
  };
  document.getElementById('qbtn-env').onclick = () => {
    map.setView([11.615, -72.015], 15);
  };
  document.getElementById('btn-focus-all').onclick = () => {
    map.setView([11.580, -72.010], 12);
  };
  document.getElementById('qbtn-all').onclick = () => {
    map.setView([11.580, -72.010], 12);
  };
}

function openMobileDrawer() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  if (window.matchMedia('(max-width: 900px)').matches) {
    sidebar.classList.add('is-drawer-open');
    if (backdrop) backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileDrawer() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('is-drawer-open');
  if (backdrop) backdrop.hidden = true;
  document.body.style.overflow = '';
}

function initMobileDrawer() {
  const openBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (openBtn) openBtn.onclick = () => openMobileDrawer();
  if (closeBtn) closeBtn.onclick = () => closeMobileDrawer();
  if (backdrop) backdrop.onclick = () => closeMobileDrawer();
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileDrawer();
  });
}

function csvEscape(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportActiveDayCsv() {
  if (!appState.scheduleData) {
    alert('Programación aún no cargada.');
    return;
  }
  const week = appState.scheduleData.weeks.find(w => w.id === appState.selectedWeekId);
  if (!week) return;

  let dayLabel = 'resumen';
  let rows = [['tipo', 'id_o_frente', 'detalle', 'ubicacion']];

  if (appState.selectedDayKey === 'week-summary') {
    dayLabel = 'semana-' + week.id;
    week.days.forEach(day => {
      (day.blocks || []).forEach(id => rows.push(['block', id, day.key, '']));
      (day.towers || []).forEach(id => rows.push(['tower', id, day.key, '']));
      (day.ambientales || []).forEach(id => rows.push(['ambiental', id, day.key, '']));
      (day.activities || []).forEach(act => rows.push(['activity', act.front || '', act.title || '', act.location || '']));
    });
  } else {
    const day = week.days.find(d => d.key === appState.selectedDayKey);
    if (!day) {
      alert('Día no encontrado en la semana activa.');
      return;
    }
    dayLabel = (day.label || day.key || 'dia').replace(/\s+/g, '-');
    (day.blocks || []).forEach(id => rows.push(['block', id, '', '']));
    (day.towers || []).forEach(id => rows.push(['tower', id, '', '']));
    (day.ambientales || []).forEach(id => rows.push(['ambiental', id, '', '']));
    (day.activities || []).forEach(act => rows.push(['activity', act.front || '', act.title || '', act.location || '']));
  }

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `programacion-${week.id}-${dayLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  const fb = document.getElementById('day-feedback');
  if (fb) fb.textContent = `CSV exportado · ${a.download}`;
}

function initCsvExport() {
  const btn = document.getElementById('btn-export-day-csv');
  if (btn) btn.onclick = () => exportActiveDayCsv();
}

function showSchemaWarnings(warnings) {
  const banner = document.getElementById('schema-warnings-banner');
  const list = document.getElementById('schema-warnings-list');
  if (!banner || !list) return;
  if (!warnings.length) {
    banner.classList.remove('is-visible');
    list.innerHTML = '';
    return;
  }
  list.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
  banner.classList.add('is-visible');
  warnings.forEach(w => console.warn('[schema]', w));
}

function runLightSchemaValidation() {
  const warnings = [];
  const sched = appState.scheduleData;
  if (sched) {
    if (!sched.defaultWeekId) warnings.push('programacion-semanal.json: falta defaultWeekId');
    if (!Array.isArray(sched.weeks) || !sched.weeks.length) {
      warnings.push('programacion-semanal.json: weeks[] vacío o ausente');
    } else {
      const week = sched.weeks.find(w => w.id === sched.defaultWeekId) || sched.weeks[0];
      (week.days || []).forEach(day => {
        ['blocks', 'towers', 'ambientales', 'activities'].forEach(k => {
          if (day[k] == null) warnings.push(`Día ${day.key || '?'}: falta campo ${k}`);
        });
        (day.activities || []).forEach((act, i) => {
          if (!act.title) warnings.push(`Día ${day.key}: activities[${i}] sin title`);
        });
      });
    }
  }

  const bloques = appState.geoLayers.bloques;
  if (bloques && bloques.features) {
    const need = ['id', 'potencia_mwp', 'avance_ponderado', 'hincado_pct'];
    bloques.features.forEach(f => {
      need.forEach(k => {
        if (f.properties[k] == null) warnings.push(`Bloque ${f.properties.id || '?'}: falta ${k}`);
      });
    });
  }

  const com = appState.geoLayers.comunidades;
  if (com && com.features) {
    let missingName = 0;
    let missingSem = 0;
    com.features.forEach(f => {
      if (!communityDisplayName(f.properties)) missingName += 1;
      if (!f.properties.Semaforo) missingSem += 1;
    });
    if (missingName) warnings.push(`Comunidades: ${missingName} sin name/Name`);
    if (missingSem) warnings.push(`Comunidades: ${missingSem} sin Semaforo`);
  }

  // Cap UI list
  showSchemaWarnings(warnings.slice(0, 8));
  const dismiss = document.getElementById('schema-warnings-dismiss');
  if (dismiss) {
    dismiss.onclick = () => document.getElementById('schema-warnings-banner').classList.remove('is-visible');
  }
}

function detectFileProtocol() {
  if (window.location.protocol === 'file:') {
    const ban = document.getElementById('file-protocol-banner');
    if (ban) ban.classList.add('is-visible');
  }
}

// Iniciar carga al cargar la ventana
window.addEventListener('DOMContentLoaded', () => {
  detectFileProtocol();
  loadData();
});
  
