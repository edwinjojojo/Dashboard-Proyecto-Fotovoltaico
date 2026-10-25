(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))e(l);new MutationObserver(l=>{for(const n of l)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&e(a)}).observe(document,{childList:!0,subtree:!0});function s(l){const n={};return l.integrity&&(n.integrity=l.integrity),l.referrerPolicy&&(n.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?n.credentials="include":l.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function e(l){if(l.ep)return;l.ep=!0;const n=s(l);fetch(l.href,n)}})();const j="",k=String(j).replace(/\/$/,""),_="/Dashboard-Proyecto-Fotovoltaico/";function m(t){const o=String(t).replace(/^\.\//,"");return k?/^(https?:)?\/\//.test(k)||k.startsWith("/")?`${k}/${o}`:`${_}${k}/${o}`:`${_}${o}`}async function D(t,o){const s=m(t),e=await fetch(s);if(!e.ok)throw new Error(`${o||t}: HTTP ${e.status}`);return e.json()}const v={bloques:"geojson/Bloques_Solares.geojson",area:"geojson/Area_Parque_Solar.geojson",inversores:"geojson/Inversores_Transformadores.geojson",subestacion:"geojson/Subestacion_Solar.geojson",linea:"geojson/Linea_Transmision.geojson",meteo:"geojson/Estacion_Meteorologica.geojson",ambientales:"geojson/Obras_Drenaje_Ambientales.geojson",comunidades:"geojson/Comunidades.geojson",municipios:"geojson/Municipios.geojson",schedule:"programacion-semanal.json"},i={activeTab:"schedule",selectedWeekId:null,selectedDayKey:"monday",selectedBlockId:"ALL",selectedTowerId:"ALL",selectedAmbientId:"ALL",selectedCommunityId:null,activeSocialFilter:"ALL",scheduleData:null,geoLayers:{},markers:{blocks:{},inversores:{},subestacion:null,towers:{},line:null,meteo:null,ambientales:{},comunidades:{}}},d=L.map("map",{center:[11.61,-72.019],zoom:14,zoomControl:!0}),q=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:"Esri, Maxar, Earthstar Geographics",maxZoom:19}).addTo(d),z=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors",maxZoom:19});L.control.layers({"🛰️ Satélite Alta Resolución":q,"🗺️ Callejero OpenStreetMap":z},null,{position:"topleft"}).addTo(d);L.control.scale({imperial:!1,metric:!0,position:"bottomright"}).addTo(d);const S=13,u={area:L.layerGroup().addTo(d),bloques:L.layerGroup().addTo(d),inversores:L.layerGroup().addTo(d),subestacion:L.layerGroup().addTo(d),linea:L.layerGroup().addTo(d),meteo:L.layerGroup().addTo(d),ambientales:L.layerGroup().addTo(d),comunidades:L.markerClusterGroup({disableClusteringAtZoom:S,showCoverageOnHover:!1,maxClusterRadius:55,spiderfyOnMaxZoom:!0,chunkedLoading:!0}).addTo(d),municipios:L.layerGroup()};let f="idle";function g(t){return t&&(t.name||t.Name)||""}function h(t,o=[26,26]){return L.icon({iconUrl:t,iconSize:o,iconAnchor:[o[0]/2,o[1]/2],popupAnchor:[0,-o[1]/2]})}const y={inverter:h("svg/inverter.svg",[24,24]),substation:h("svg/substation.svg",[28,28]),tower:h("svg/transmission-tower.svg",[22,22]),meteo:h("svg/meteo.svg",[26,26]),environmental:h("svg/environmental.svg",[24,24]),drainage:h("svg/drainage.svg",[22,22]),communityGreen:L.divIcon({className:"custom-com-icon",html:'<div style="background:#10b981; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 5px rgba(0,0,0,0.4);"></div>',iconSize:[12,12],iconAnchor:[6,6]}),communityYellow:L.divIcon({className:"custom-com-icon",html:'<div style="background:#f59e0b; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 5px rgba(0,0,0,0.4);"></div>',iconSize:[12,12],iconAnchor:[6,6]}),communityRed:L.divIcon({className:"custom-com-icon",html:'<div style="background:#ef4444; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 5px rgba(0,0,0,0.4);"></div>',iconSize:[12,12],iconAnchor:[6,6]})};async function T(t,o){if(/^(https?:|\/|\.\/)/.test(t)||t.includes("://")){const s=await fetch(t);if(!s.ok)throw new Error(`${o}: HTTP ${s.status}`);return s.json()}return D(t,o)}function A(t){const o=document.getElementById("layer-errors-banner"),s=document.getElementById("layer-errors-list");if(!(!o||!s)){if(!t.length){o.classList.remove("is-visible"),s.innerHTML="";return}s.innerHTML=t.map(e=>`<li><strong>${e.label}</strong>: ${e.message}</li>`).join(""),o.classList.add("is-visible")}}function E(t,o){if(t==null||t==="")return o;const s=String(t);return s.split("(")[0].trim()||s}function B(t){const o=t&&t.features||[];if(!o.length)return null;const s=o.reduce((n,a)=>n+(Number(a.properties.potencia_mwp)||0),0)||o.length,e=n=>{const a=o.reduce((c,r)=>{const p=Number(r.properties.potencia_mwp)||s/o.length;return c+(Number(r.properties[n])||0)*p},0);return Math.round(a/s*10)/10},l=Math.round(o.reduce((n,a)=>n+(Number(a.properties.potencia_mwp)||0),0)*10)/10;return{avance:e("avance_ponderado"),hincado:e("hincado_pct"),estructura:e("estructura_pct"),modulos:e("modulos_pct"),zanjeo:e("zanjeo_pct"),cableado:e("cableado_pct"),comision:e("comisionamiento_pct"),totalMwp:l,nBlocks:o.length}}function N(){const t=B(i.geoLayers.bloques),o=document.getElementById("kpi-top-avance"),s=document.getElementById("kpi-chip-avance");if(t){const n=`${t.avance} %`;o&&(o.textContent=n),s&&(s.textContent=n)}const e=i.geoLayers.meteo&&i.geoLayers.meteo.features&&i.geoLayers.meteo.features[0];if(e){const n=e.properties,a=E(n.ghi_actual,"—"),c=E(n.temperatura_celula,"—"),r=document.getElementById("kpi-top-ghi"),p=document.getElementById("kpi-top-temp"),b=document.getElementById("kpi-chip-ghi");r&&(r.textContent=a),p&&(p.textContent=c),b&&(b.textContent=a)}const l=i.geoLayers.area&&i.geoLayers.area.features&&i.geoLayers.area.features[0];if(l){const n=l.properties.CO2_EVITADO_ANUAL||"",a=String(n).match(/([\d.]+)/),c=a?`${a[1]} t/año`:E(n,"—"),r=document.getElementById("kpi-top-co2"),p=document.getElementById("kpi-chip-co2");r&&(r.textContent=c),p&&(p.textContent=a?a[1]:c)}}function M(t){if(!t)return;document.getElementById("kpi-block-ponderado").textContent=`${t.avance} %`,document.getElementById("bar-block-ponderado").style.width=`${t.avance}%`,document.getElementById("kpi-block-caption").textContent=`${t.nBlocks} Bloques FV · ${t.totalMwp} MWp en Construcción`,document.getElementById("kpi-val-hincado").textContent=`${t.hincado} %`,document.getElementById("bar-val-hincado").style.width=`${t.hincado}%`,document.getElementById("kpi-val-estructura").textContent=`${t.estructura} %`,document.getElementById("bar-val-estructura").style.width=`${t.estructura}%`,document.getElementById("kpi-val-modulos").textContent=`${t.modulos} %`,document.getElementById("bar-val-modulos").style.width=`${t.modulos}%`,document.getElementById("kpi-val-zanjeo").textContent=`${t.zanjeo} %`,document.getElementById("bar-val-zanjeo").style.width=`${t.zanjeo}%`,document.getElementById("kpi-val-cableado").textContent=`${t.cableado} %`,document.getElementById("bar-val-cableado").style.width=`${t.cableado}%`,document.getElementById("kpi-val-comision").textContent=`${t.comision} %`,document.getElementById("bar-val-comision").style.width=`${t.comision}%`;const o=document.getElementById("dossier-mwp");o&&(o.textContent=`${t.totalMwp} MWp Total`)}async function V(){const t=[{key:"bloques",url:m(v.bloques),label:"Bloques Solares",render:R},{key:"area",url:m(v.area),label:"Área del Parque",render:G},{key:"inversores",url:m(v.inversores),label:"Inversores / Skids",render:U},{key:"subestacion",url:m(v.subestacion),label:"Subestación",render:H},{key:"linea",url:m(v.linea),label:"Línea de Transmisión",render:J},{key:"meteo",url:m(v.meteo),label:"Estación Meteorológica",render:K},{key:"ambientales",url:m(v.ambientales),label:"Gestión Ambiental",render:Z},{key:"comunidades",url:m(v.comunidades),label:"Comunidades",render:Y},{key:"schedule",url:m(v.schedule),label:"Programación semanal",render:null}],o=await Promise.allSettled(t.map(a=>T(a.url,a.label).then(c=>({spec:a,data:c})))),s=[];let e=0;o.forEach((a,c)=>{const r=t[c];if(a.status==="rejected"){const b=a.reason&&a.reason.message||String(a.reason);console.error(`Capa fallida [${r.label}]:`,a.reason),s.push({label:r.label,message:b});return}const{data:p}=a.value;if(e+=1,r.key==="schedule")i.scheduleData=p;else{i.geoLayers[r.key]=p;try{r.render&&r.render(p)}catch(b){console.error(`Error renderizando [${r.label}]:`,b),s.push({label:r.label,message:`Render: ${b.message||b}`})}}}),A(s),N();const l=B(i.geoLayers.bloques);if(l&&i.selectedBlockId==="ALL"&&M(l),i.scheduleData)try{Q(i.scheduleData)}catch(a){console.error(a)}try{te()}catch(a){console.error(a)}ne(),ie(),re(),ae(),le(),de(),me();const n=document.getElementById("day-feedback");if(s.length&&e===0)n.textContent="Error al cargar capas locales. Use un servidor HTTP (no file://).";else if(s.length)n.textContent=`Carga parcial · ${e}/${t.length} OK · ver avisos arriba`;else{const a=i.geoLayers.bloques&&i.geoLayers.bloques.features?i.geoLayers.bloques.features.length:0;n.textContent=`Sistema sincronizado · ${a} Bloques FV cargados`}}function F(t){u.municipios.clearLayers(),L.geoJSON(t,{style:{color:"#64748b",weight:1.25,dashArray:"4, 4",fillColor:"#94a3b8",fillOpacity:.06},onEachFeature:(o,s)=>{const e=o.properties||{},l=e["Nombre Municipio"]||e.name||"Municipio";s.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">LÍMITE MUNICIPAL</div>
          <div class="solar-popup-title">${l}</div>
        </div>
        <div class="solar-popup-body">
          <div style="font-size:11px; color:#475569;">
            <strong>Departamento:</strong> ${e.Departamento||"—"}<br>
            <strong>Categoría:</strong> ${e.Categoría||"—"}
          </div>
        </div>
      `)}}).addTo(u.municipios)}async function W(){if(f==="ready")return!0;if(f==="loading")return!1;f="loading";const t=document.getElementById("layer-chk-municipios"),o=t&&t.closest("label");try{const s=await T(m(v.municipios),"Municipios");return i.geoLayers.municipios=s,F(s),f="ready",!0}catch(s){return f="error",console.error(s),A([{label:"Municipios",message:s.message||String(s)}]),t&&(t.checked=!1),!1}finally{if(o&&f==="ready"){const s=o.querySelector("span:last-child");s&&(s.textContent="Municipios (4)")}}}function G(t){L.geoJSON(t,{style:{color:"#38bdf8",weight:2.5,dashArray:"6, 6",fillColor:"#0284c7",fillOpacity:.04},onEachFeature:(o,s)=>{const e=o.properties;s.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">POLÍGONO DEL PROYECTO</div>
          <div class="solar-popup-title">${e.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Capacidad DC</span>
              <span class="solar-popup-m-val">${e.CAPACIDAD_MWP} MWp</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Área Predial</span>
              <span class="solar-popup-m-val">${e.AREA_HA} ha</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Módulos Bifaciales</span>
              <span class="solar-popup-m-val">${e.MODULOS_TOTAL.toLocaleString()}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Generación Anual</span>
              <span class="solar-popup-m-val">${e.GENERACION_ESTIMADA}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Operador:</strong> ${e.OPERADOR}<br>
            <strong>Licencia ANLA:</strong> ${e.ESTADO_LICENCIA}
          </div>
        </div>
      `)}}).addTo(u.area)}function R(t){L.geoJSON(t,{style:o=>{const s=o.properties.avance_ponderado,e=s>=80?"#10b981":s>=40?"#f59e0b":"#3b82f6";return{color:e,weight:2,fillColor:e,fillOpacity:.25}},onEachFeature:(o,s)=>{const e=o.properties;i.markers.blocks[e.id]=s,s.bindTooltip(`<b>${e.id}</b> · ${e.avance_ponderado}%`,{permanent:!1,direction:"center",className:"block-tooltip"}),s.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${e.zona}</div>
          <div class="solar-popup-title">${e.name} (${e.potencia_mwp} MWp)</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Avance Global</span>
              <span class="solar-popup-m-val" style="color:var(--solar-orange); font-size:14px;">${e.avance_ponderado} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Hincado</span>
              <span class="solar-popup-m-val">${e.hincado_pct} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Estructuras</span>
              <span class="solar-popup-m-val">${e.estructura_pct} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Módulos</span>
              <span class="solar-popup-m-val">${e.modulos_pct} %</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Seguidores:</strong> ${e.num_trackers} trackers 1P<br>
            <strong>Módulos:</strong> ${e.num_modulos.toLocaleString()} paneles TOPCon<br>
            <strong>Inversor Asignado:</strong> ${e.inversor_id}
          </div>
          <button class="solar-popup-action-btn" onclick="selectBlock('${e.id}', true)">
            📊 Ver Métricas en Panel Bloques
          </button>
        </div>
      `),s.on("click",()=>{I(e.id,!1)})}}).addTo(u.bloques)}function U(t){L.geoJSON(t,{pointToLayer:(o,s)=>{const e=L.marker(s,{icon:y.inverter});return i.markers.inversores[o.properties.codigo]=e,e},onEachFeature:(o,s)=>{const e=o.properties;s.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${e.tipo}</div>
          <div class="solar-popup-title">${e.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Potencia</span>
              <span class="solar-popup-m-val">${e.potencia_mva} MVA</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Tensión</span>
              <span class="solar-popup-m-val">${e.tension_bt_mt}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Strings DC</span>
              <span class="solar-popup-m-val">${e.strings_conectados}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Estado</span>
              <span class="solar-popup-m-val" style="color:var(--solar-blue);">${e.estado}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Bloque Asociado:</strong> ${e.bloque_id}<br>
            <strong>Aparamenta MT:</strong> ${e.celda_mt}
          </div>
        </div>
      `)}}).addTo(u.inversores)}function H(t){L.geoJSON(t,{style:{color:"#eab308",weight:2.5,fillColor:"#fef08a",fillOpacity:.35},pointToLayer:(o,s)=>L.marker(s,{icon:y.substation}),onEachFeature:(o,s)=>{const e=o.properties;e.codigo&&s.bindPopup(`
          <div class="solar-popup-head">
            <div class="solar-popup-category">${e.tipo}</div>
            <div class="solar-popup-title">${e.name}</div>
          </div>
          <div class="solar-popup-body">
            <div class="solar-popup-metrics">
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Transformación</span>
                <span class="solar-popup-m-val">${e.potencia_transformacion}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Avance Global</span>
                <span class="solar-popup-m-val" style="color:var(--solar-orange);">${e.avance_general}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Celdas MT</span>
                <span class="solar-popup-m-val">${e.celdas_mt}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Baterías BESS</span>
                <span class="solar-popup-m-val">${e.bess_capacidad}</span>
              </div>
            </div>
            <div style="font-size:10.5px; color:#475569;">
              <strong>Estado:</strong> ${e.estado}<br>
              <strong>Bahías:</strong> ${e.bahias}
            </div>
            <button class="solar-popup-action-btn" onclick="switchToTab('substation')">
              ⚡ Ver en Panel Subestación
            </button>
          </div>
        `)}}).addTo(u.subestacion)}function J(t){L.geoJSON(t,{style:o=>{if(o.geometry.type==="LineString")return{color:"#475569",weight:3.5,opacity:.85,dashArray:"4, 4"}},pointToLayer:(o,s)=>{const e=L.marker(s,{icon:y.tower});return i.markers.towers[o.properties.codigo]=e,e},onEachFeature:(o,s)=>{const e=o.properties;o.geometry.type==="LineString"?s.bindPopup(`
          <div class="solar-popup-head">
            <div class="solar-popup-category">LÍNEA DE ALTA TENSIÓN</div>
            <div class="solar-popup-title">${e.name}</div>
          </div>
          <div class="solar-popup-body">
            <div class="solar-popup-metrics">
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Tensión</span>
                <span class="solar-popup-m-val">${e.tension_kv} kV</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Longitud</span>
                <span class="solar-popup-m-val">${e.longitud_km} km</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Torres Total</span>
                <span class="solar-popup-m-val">${e.torres_total}</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Tendido</span>
                <span class="solar-popup-m-val">${e.avance_tendido}</span>
              </div>
            </div>
          </div>
        `):(s.bindTooltip(e.codigo,{permanent:!0,direction:"right",className:"tower-label"}),s.bindPopup(`
          <div class="solar-popup-head">
            <div class="solar-popup-category">ESTRUCTURA LAT 110 KV</div>
            <div class="solar-popup-title">${e.name}</div>
          </div>
          <div class="solar-popup-body">
            <div class="solar-popup-metrics">
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Avance Torre</span>
                <span class="solar-popup-m-val" style="color:var(--solar-orange);">${e.avance_global} %</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Cimentación</span>
                <span class="solar-popup-m-val">${e.cimentacion_pct} %</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Izaje</span>
                <span class="solar-popup-m-val">${e.izaje_pct} %</span>
              </div>
              <div class="solar-popup-metric-item">
                <span class="solar-popup-m-lbl">Tendido</span>
                <span class="solar-popup-m-val">${e.tendido_pct} %</span>
              </div>
            </div>
            <div style="font-size:10.5px; color:#475569;">
              <strong>Tipo:</strong> ${e.tipo_estructura} (${e.altura_m} m)<br>
              <strong>Conductor:</strong> ${e.conductor}
            </div>
          </div>
        `))}}).addTo(u.linea)}function K(t){L.geoJSON(t,{pointToLayer:(o,s)=>{const e=L.marker(s,{icon:y.meteo});return i.markers.meteo=e,e},onEachFeature:(o,s)=>{const e=o.properties;s.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">SOLARIMETRÍA CLASE A (ISO 9060)</div>
          <div class="solar-popup-title">${e.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">GHI Global</span>
              <span class="solar-popup-m-val" style="color:var(--solar-gold);">${e.ghi_actual}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">DNI Directa</span>
              <span class="solar-popup-m-val">${e.dni_actual}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">GTI en Módulo</span>
              <span class="solar-popup-m-val">${e.gti_plano_modulo}</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Temp. Célula</span>
              <span class="solar-popup-m-val">${e.temperatura_celula}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Viento:</strong> ${e.velocidad_viento}<br>
            <strong>Soiling:</strong> ${e.factor_soiling}<br>
            <strong>Calibración:</strong> ${e.cumplimiento_iec}
          </div>
        </div>
      `)}}).addTo(u.meteo)}function Z(t){L.geoJSON(t,{pointToLayer:(o,s)=>{const e=o.properties,l=e.codigo.startsWith("OD")?y.drainage:y.environmental,n=L.marker(s,{icon:l});return i.markers.ambientales[e.codigo]=n,n},onEachFeature:(o,s)=>{const e=o.properties;s.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${e.tipo_intervencion}</div>
          <div class="solar-popup-title">${e.name}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Avance Físico</span>
              <span class="solar-popup-m-val" style="color:var(--eco-green);">${e.avance_fisico_pct} %</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Ficha PMA</span>
              <span class="solar-popup-m-val" style="font-size:10px;">${e.ficha_pma}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Especificación:</strong> ${e.especificacion}<br>
            <strong>Ubicación/Cauce:</strong> ${e.cauce_zona}<br>
            <strong>Estado:</strong> ${e.estado}
          </div>
          <button class="solar-popup-action-btn" onclick="switchToTab('ambient')">
            🌿 Ver en Panel Ambiental
          </button>
        </div>
      `)}}).addTo(u.ambientales)}function Y(t){u.comunidades.clearLayers(),i.markers.comunidades={},L.geoJSON(t,{pointToLayer:(o,s)=>{const e=o.properties||{},l=e.Semaforo,n=l==="Verde"?y.communityGreen:l==="Amarillo"?y.communityYellow:y.communityRed,a=L.marker(s,{icon:n}),c=o.id||g(e);return i.markers.comunidades[c]=a,a},onEachFeature:(o,s)=>{const e=o.properties||{},l=g(e),n=String(l).replace(/'/g,"\\'");s.bindPopup(`
        <div class="solar-popup-head">
          <div class="solar-popup-category">${e.Tipo_Influencia||""}</div>
          <div class="solar-popup-title">Comunidad ${l}</div>
        </div>
        <div class="solar-popup-body">
          <div class="solar-popup-metrics">
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Relacionamiento</span>
              <span class="solar-popup-m-val" style="color:${e.Semaforo==="Verde"?"#10b981":e.Semaforo==="Amarillo"?"#f59e0b":"#ef4444"};">
                ${e.Semaforo||"—"}
              </span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Distancia Parque</span>
              <span class="solar-popup-m-val">${e.Distancia_Parque_km} km</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Empleo Local</span>
              <span class="solar-popup-m-val" style="color:var(--solar-orange);">${e.Empleo_Local_Activo} personas</span>
            </div>
            <div class="solar-popup-metric-item">
              <span class="solar-popup-m-lbl">Última Visita</span>
              <span class="solar-popup-m-val" style="font-size:10px;">${e.Ultima_Visita}</span>
            </div>
          </div>
          <div style="font-size:10.5px; color:#475569;">
            <strong>Convenio Social:</strong> ${e.Convenio_Social}
          </div>
          <button class="solar-popup-action-btn" onclick="selectCommunity('${n}')">
            👥 Abrir Ficha en Panel Entorno
          </button>
        </div>
      `),s.on("click",()=>{P(l)})}}).addTo(u.comunidades)}function Q(t){const o=document.getElementById("week-select");o.innerHTML="",t.weeks.forEach(s=>{const e=document.createElement("option");e.value=s.id,e.textContent=`${s.label} (${s.sheet})`,s.id===t.defaultWeekId&&(e.selected=!0),o.appendChild(e)}),i.selectedWeekId=t.defaultWeekId,o.addEventListener("change",s=>{i.selectedWeekId=s.target.value,x()}),x()}function x(){const t=i.scheduleData.weeks.find(s=>s.id===i.selectedWeekId);if(!t)return;document.querySelectorAll(".day-button").forEach(s=>{const e=s.dataset.day;if(e==="week-summary"){s.onclick=()=>$("week-summary");return}const l=t.days.find(n=>n.key===e);if(l){const n=s.querySelector(".day-date");n&&(n.textContent=`${l.date}`),s.onclick=()=>$(e)}}),$(i.selectedDayKey||"monday")}function $(t){i.selectedDayKey=t,document.querySelectorAll(".day-button").forEach(r=>{r.classList.toggle("is-active",r.dataset.day===t)});const o=i.scheduleData.weeks.find(r=>r.id===i.selectedWeekId);if(!o)return;const s=document.getElementById("activity-items-list");s.innerHTML="";let e=[],l="",n=[],a=[],c=[];if(t==="week-summary")l=`Resumen Semanal · ${o.label}`,o.days.forEach(r=>{e.push(...r.activities),n.push(...r.blocks||[]),a.push(...r.towers||[]),c.push(...r.ambientales||[])});else{const r=o.days.find(p=>p.key===t);r&&(l=`${r.name} ${r.date} de Octubre 2026`,e=r.activities||[],n=r.blocks||[],a=r.towers||[],c=r.ambientales||[])}document.getElementById("activity-day-title").textContent=l,document.getElementById("activity-day-meta").textContent=`${e.length} actividades programadas en frentes de obra`,document.getElementById("day-feedback").textContent=`Jornada sincronizada: ${e.length} frentes activos`,e.forEach(r=>{const p=document.createElement("div");p.className="activity-item",p.innerHTML=`
      <span class="activity-badge">${r.front}</span>
      <div class="activity-title">${r.title}</div>
      <div class="activity-location">📍 ${r.location}</div>
    `,p.onclick=()=>{ee(r.location)},s.appendChild(p)}),X(n)}function X(t,o,s){Object.entries(i.markers.blocks).forEach(([e,l])=>{const n=t.includes(e);l.setStyle({fillOpacity:n?.6:.2,weight:n?3.5:2,color:n?"#f59e0b":"#3b82f6"})})}function ee(t){const o=t.match(/FV-\d+/i);if(o){const e=o[0].toUpperCase();if(i.markers.blocks[e]){d.fitBounds(i.markers.blocks[e].getBounds(),{padding:[40,40],maxZoom:16}),i.markers.blocks[e].openPopup();return}}const s=t.match(/ST-\d+/i);if(s){const e=s[0].toUpperCase();if(i.markers.towers[e]){d.setView(i.markers.towers[e].getLatLng(),16),i.markers.towers[e].openPopup();return}}if(t.toLowerCase().includes("subestación")||t.toLowerCase().includes("se guajira")){d.setView([11.61,-72.004],16);return}if(t.toLowerCase().includes("vivero")||t.toLowerCase().includes("viv-01")){d.setView([11.615,-72.006],16);return}}function te(){const t=document.getElementById("block-quick-select");t&&i.geoLayers.bloques&&i.geoLayers.bloques.features&&(i.geoLayers.bloques.features.forEach(n=>{const a=document.createElement("option");a.value=n.properties.id,a.textContent=`${n.properties.id} · ${n.properties.name} (${n.properties.avance_ponderado}%)`,t.appendChild(a)}),t.onchange=n=>{I(n.target.value,!0)});const o=document.getElementById("blocks-reset-btn");o&&(o.onclick=()=>{I("ALL",!0)});const s=document.getElementById("tower-select");s&&i.geoLayers.linea&&i.geoLayers.linea.features&&(i.geoLayers.linea.features.filter(a=>a.geometry.type==="Point").forEach(a=>{const c=document.createElement("option");c.value=a.properties.codigo,c.textContent=`${a.properties.codigo} · ${a.properties.name} (${a.properties.avance_global}%)`,s.appendChild(c)}),s.onchange=a=>{oe(a.target.value)});const e=document.getElementById("ambient-select");e&&i.geoLayers.ambientales&&i.geoLayers.ambientales.features&&(i.geoLayers.ambientales.features.forEach(n=>{const a=document.createElement("option");a.value=n.properties.codigo,a.textContent=`${n.properties.codigo} · ${n.properties.name}`,e.appendChild(a)}),e.onchange=n=>{se(n.target.value)});const l=document.getElementById("community-select");l&&i.geoLayers.comunidades&&i.geoLayers.comunidades.features&&([...i.geoLayers.comunidades.features].sort((a,c)=>g(a.properties).localeCompare(g(c.properties))).forEach(a=>{const c=g(a.properties),r=document.createElement("option");r.value=c,r.textContent=`${c} (${a.properties.Semaforo}) · ${a.properties.Distancia_Parque_km} km`,l.appendChild(r)}),l.onchange=a=>{P(a.target.value)})}function I(t,o){i.selectedBlockId=t,document.getElementById("block-quick-select").value=t;const s=document.getElementById("blocks-reset-btn"),e=document.getElementById("blocks-scope-badge"),l=document.getElementById("blocks-scope-title"),n=document.getElementById("blocks-scope-subtitle");if(t==="ALL"){s.style.display="none",e.textContent="Consolidado 200 MWp",l.textContent="Todo el Parque Solar",n.textContent="10 Bloques Fotovoltaicos · 328.000 Módulos Bifaciales";const a=B(i.geoLayers.bloques);M(a),document.getElementById("dossier-inversor").textContent="10 Centros CT-01 a CT-10",o&&d.setView([11.61,-72.019],14)}else{if(!i.geoLayers.bloques)return;const a=i.geoLayers.bloques.features.find(r=>r.properties.id===t);if(!a)return;const c=a.properties;s.style.display="inline-flex",e.textContent=c.zona,l.textContent=`${c.id} · ${c.name}`,n.textContent=`Capacidad: ${c.potencia_mwp} MWp · Inversor: ${c.inversor_id}`,document.getElementById("kpi-block-ponderado").textContent=`${c.avance_ponderado} %`,document.getElementById("bar-block-ponderado").style.width=`${c.avance_ponderado}%`,document.getElementById("kpi-block-caption").textContent=`Estado: ${c.estado}`,document.getElementById("kpi-val-hincado").textContent=`${c.hincado_pct} %`,document.getElementById("bar-val-hincado").style.width=`${c.hincado_pct}%`,document.getElementById("kpi-val-estructura").textContent=`${c.estructura_pct} %`,document.getElementById("bar-val-estructura").style.width=`${c.estructura_pct}%`,document.getElementById("kpi-val-modulos").textContent=`${c.modulos_pct} %`,document.getElementById("bar-val-modulos").style.width=`${c.modulos_pct}%`,document.getElementById("kpi-val-zanjeo").textContent=`${c.zanjeo_pct} %`,document.getElementById("bar-val-zanjeo").style.width=`${c.zanjeo_pct}%`,document.getElementById("kpi-val-cableado").textContent=`${c.cableado_pct} %`,document.getElementById("bar-val-cableado").style.width=`${c.cableado_pct}%`,document.getElementById("kpi-val-comision").textContent=`${c.comisionamiento_pct} %`,document.getElementById("bar-val-comision").style.width=`${c.comisionamiento_pct}%`,document.getElementById("dossier-mwp").textContent=`${c.potencia_mwp} MWp (${c.num_modulos.toLocaleString()} paneles)`,document.getElementById("dossier-inversor").textContent=`Centro de Transformación ${c.inversor_id}`,o&&i.markers.blocks[t]&&(d.fitBounds(i.markers.blocks[t].getBounds(),{padding:[50,50],maxZoom:16}),i.markers.blocks[t].openPopup())}C("blocks")}function oe(t){if(t==="ALL")document.getElementById("kpi-lat-ciment").textContent="68.0 %",document.getElementById("bar-lat-ciment").style.width="68%",document.getElementById("kpi-lat-izaje").textContent="55.0 %",document.getElementById("bar-lat-izaje").style.width="55%",document.getElementById("kpi-lat-tendido").textContent="42.0 %",document.getElementById("bar-lat-tendido").style.width="42%",d.setView([11.58,-71.995],13);else{const o=i.geoLayers.linea.features.find(e=>e.properties&&e.properties.codigo===t);if(!o)return;const s=o.properties;document.getElementById("kpi-lat-ciment").textContent=`${s.cimentacion_pct} %`,document.getElementById("bar-lat-ciment").style.width=`${s.cimentacion_pct}%`,document.getElementById("kpi-lat-izaje").textContent=`${s.izaje_pct} %`,document.getElementById("bar-lat-izaje").style.width=`${s.izaje_pct}%`,document.getElementById("kpi-lat-tendido").textContent=`${s.tendido_pct} %`,document.getElementById("bar-lat-tendido").style.width=`${s.tendido_pct}%`,i.markers.towers[t]&&(d.setView(i.markers.towers[t].getLatLng(),16),i.markers.towers[t].openPopup())}}function se(t){if(t==="ALL")d.setView([11.61,-72.019],14);else{const o=i.markers.ambientales[t];o&&(d.setView(o.getLatLng(),16),o.openPopup())}}function P(t){if(!t)return;const o=document.getElementById("community-select");if(o&&(o.value=t),!i.geoLayers.comunidades)return;const s=i.geoLayers.comunidades.features.find(a=>g(a.properties)===t);if(!s)return;const e=s.properties,l=g(e);document.getElementById("dossier-com-title").textContent=`Comunidad ${l}`,document.getElementById("dossier-com-sem").innerHTML=`<span style="color:${e.Semaforo==="Verde"?"#10b981":e.Semaforo==="Amarillo"?"#f59e0b":"#ef4444"}; font-weight:800;">${e.Semaforo}</span>`,document.getElementById("dossier-com-infl").textContent=e.Tipo_Influencia,document.getElementById("dossier-com-dist").textContent=`${e.Distancia_Parque_km} km`,document.getElementById("dossier-com-empleo").textContent=`${e.Empleo_Local_Activo} personas vinculadas`,document.getElementById("dossier-com-consulta").textContent=e.Estado_Consulta,document.getElementById("dossier-com-convenio").textContent=e.Convenio_Social,document.getElementById("dossier-com-bitacora").textContent=e.Observaciones_Bitacora,C("entorno"),O();const n=i.markers.comunidades[s.id||l];n&&u.comunidades.zoomToShowLayer?u.comunidades.zoomToShowLayer(n,()=>n.openPopup()):n&&(d.setView(n.getLatLng(),Math.max(d.getZoom(),S)),n.openPopup())}function ae(){const t=document.querySelectorAll(".social-kpi-card");t.forEach(o=>{o.onclick=()=>{t.forEach(l=>l.classList.remove("is-active")),o.classList.add("is-active");const s=o.dataset.semaforo;i.activeSocialFilter=s;const e=[];Object.entries(i.markers.comunidades).forEach(([l,n])=>{const a=i.geoLayers.comunidades.features.find(r=>(r.id||g(r.properties))===l);if(!a)return;s==="ALL"||a.properties.Semaforo===s?(n.setOpacity(1),e.push(n.getLatLng())):n.setOpacity(.15)}),e.length>0&&d.fitBounds(L.latLngBounds(e),{padding:[40,40]})}})}function ne(){document.querySelectorAll(".sidebar-tab-btn").forEach(o=>{o.onclick=()=>{C(o.dataset.tab)}})}function C(t){i.activeTab=t,document.querySelectorAll(".sidebar-tab-btn").forEach(o=>{o.classList.toggle("is-active",o.dataset.tab===t)}),document.querySelectorAll(".panel-view").forEach(o=>{o.style.display=o.id===`panel-${t}`?"flex":"none"})}function ie(){const t={"layer-chk-bloques":u.bloques,"layer-chk-area":u.area,"layer-chk-inversores":u.inversores,"layer-chk-subestacion":u.subestacion,"layer-chk-linea":u.linea,"layer-chk-meteo":u.meteo,"layer-chk-ambientales":u.ambientales,"layer-chk-comunidades":u.comunidades};Object.entries(t).forEach(([e,l])=>{const n=document.getElementById(e);n&&(n.onchange=a=>{a.target.checked?d.addLayer(l):d.removeLayer(l)})});const o=document.getElementById("layer-chk-municipios");o&&(o.onchange=async e=>{e.target.checked?await W()&&d.addLayer(u.municipios):d.removeLayer(u.municipios)});const s=document.getElementById("layer-errors-dismiss");s&&(s.onclick=()=>{document.getElementById("layer-errors-banner").classList.remove("is-visible")})}function re(){document.getElementById("btn-focus-park").onclick=()=>{d.setView([11.61,-72.019],14)},document.getElementById("qbtn-park").onclick=()=>{d.setView([11.61,-72.019],14)},document.getElementById("qbtn-sub").onclick=()=>{d.setView([11.61,-72.004],16)},document.getElementById("qbtn-line").onclick=()=>{d.setView([11.58,-71.995],13)},document.getElementById("qbtn-env").onclick=()=>{d.setView([11.615,-72.015],15)},document.getElementById("btn-focus-all").onclick=()=>{d.setView([11.58,-72.01],12)},document.getElementById("qbtn-all").onclick=()=>{d.setView([11.58,-72.01],12)}}function O(){const t=document.getElementById("app-sidebar"),o=document.getElementById("sidebar-backdrop");t&&window.matchMedia("(max-width: 900px)").matches&&(t.classList.add("is-drawer-open"),o&&(o.hidden=!1),document.body.style.overflow="hidden")}function w(){const t=document.getElementById("app-sidebar"),o=document.getElementById("sidebar-backdrop");t&&t.classList.remove("is-drawer-open"),o&&(o.hidden=!0),document.body.style.overflow=""}function le(){const t=document.getElementById("mobile-menu-btn"),o=document.getElementById("sidebar-close-btn"),s=document.getElementById("sidebar-backdrop");t&&(t.onclick=()=>O()),o&&(o.onclick=()=>w()),s&&(s.onclick=()=>w()),window.addEventListener("keydown",e=>{e.key==="Escape"&&w()})}function ce(t){const o=t==null?"":String(t);return/[",\n]/.test(o)?'"'+o.replace(/"/g,'""')+'"':o}function pe(){if(!i.scheduleData){alert("Programación aún no cargada.");return}const t=i.scheduleData.weeks.find(r=>r.id===i.selectedWeekId);if(!t)return;let o="resumen",s=[["tipo","id_o_frente","detalle","ubicacion"]];if(i.selectedDayKey==="week-summary")o="semana-"+t.id,t.days.forEach(r=>{(r.blocks||[]).forEach(p=>s.push(["block",p,r.key,""])),(r.towers||[]).forEach(p=>s.push(["tower",p,r.key,""])),(r.ambientales||[]).forEach(p=>s.push(["ambiental",p,r.key,""])),(r.activities||[]).forEach(p=>s.push(["activity",p.front||"",p.title||"",p.location||""]))});else{const r=t.days.find(p=>p.key===i.selectedDayKey);if(!r){alert("Día no encontrado en la semana activa.");return}o=(r.label||r.key||"dia").replace(/\s+/g,"-"),(r.blocks||[]).forEach(p=>s.push(["block",p,"",""])),(r.towers||[]).forEach(p=>s.push(["tower",p,"",""])),(r.ambientales||[]).forEach(p=>s.push(["ambiental",p,"",""])),(r.activities||[]).forEach(p=>s.push(["activity",p.front||"",p.title||"",p.location||""]))}const e=s.map(r=>r.map(ce).join(",")).join(`
`),l=new Blob([e],{type:"text/csv;charset=utf-8"}),n=URL.createObjectURL(l),a=document.createElement("a");a.href=n,a.download=`programacion-${t.id}-${o}.csv`,document.body.appendChild(a),a.click(),a.remove(),URL.revokeObjectURL(n);const c=document.getElementById("day-feedback");c&&(c.textContent=`CSV exportado · ${a.download}`)}function de(){const t=document.getElementById("btn-export-day-csv");t&&(t.onclick=()=>pe())}function ue(t){const o=document.getElementById("schema-warnings-banner"),s=document.getElementById("schema-warnings-list");if(!(!o||!s)){if(!t.length){o.classList.remove("is-visible"),s.innerHTML="";return}s.innerHTML=t.map(e=>`<li>${e}</li>`).join(""),o.classList.add("is-visible"),t.forEach(e=>console.warn("[schema]",e))}}function me(){const t=[],o=i.scheduleData;o&&(o.defaultWeekId||t.push("programacion-semanal.json: falta defaultWeekId"),!Array.isArray(o.weeks)||!o.weeks.length?t.push("programacion-semanal.json: weeks[] vacío o ausente"):((o.weeks.find(a=>a.id===o.defaultWeekId)||o.weeks[0]).days||[]).forEach(a=>{["blocks","towers","ambientales","activities"].forEach(c=>{a[c]==null&&t.push(`Día ${a.key||"?"}: falta campo ${c}`)}),(a.activities||[]).forEach((c,r)=>{c.title||t.push(`Día ${a.key}: activities[${r}] sin title`)})}));const s=i.geoLayers.bloques;if(s&&s.features){const n=["id","potencia_mwp","avance_ponderado","hincado_pct"];s.features.forEach(a=>{n.forEach(c=>{a.properties[c]==null&&t.push(`Bloque ${a.properties.id||"?"}: falta ${c}`)})})}const e=i.geoLayers.comunidades;if(e&&e.features){let n=0,a=0;e.features.forEach(c=>{g(c.properties)||(n+=1),c.properties.Semaforo||(a+=1)}),n&&t.push(`Comunidades: ${n} sin name/Name`),a&&t.push(`Comunidades: ${a} sin Semaforo`)}ue(t.slice(0,8));const l=document.getElementById("schema-warnings-dismiss");l&&(l.onclick=()=>document.getElementById("schema-warnings-banner").classList.remove("is-visible"))}function ve(){if(window.location.protocol==="file:"){const t=document.getElementById("file-protocol-banner");t&&t.classList.add("is-visible")}}window.addEventListener("DOMContentLoaded",()=>{ve(),V()});
//# sourceMappingURL=index-BngilAQT.js.map
