# Archivos omitidos / notas de copia

- No se copió `.git/` (historial git; no es fuente de aplicación).
- No había `node_modules/` ni dependencias instaladas (proyecto estático sin package manager).
- No se omitió ningún archivo de datos del árbol público: el más grande es `geojson/Municipios.geojson` (~2.9 MB). Es GeoJSON de texto, no binario; se incluyó.
- Scripts mencionados en `.gitignore` pero **ausentes** del clone público: `build_index.py`, `create_docs.py`, `generate_html.py` (probablemente generadores locales no publicados).
