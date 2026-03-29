# elpx-sample-generator

Generador estático de archivos `.elpx` para eXeLearning.

## Qué hace

- Genera un paquete `.elpx` descargable desde el navegador, sin servidor.
- Permite configurar tema, páginas, subpáginas, bloques, contenido y recursos.
- Soporta parámetros en la URL para generar proyectos al vuelo.
- Publica la web en GitHub Pages mediante un workflow de build.

## Uso local

1. Instala dependencias con `make deps`.
2. Sincroniza assets de eXeLearning con `make download`.
3. Abre `index.html` con un servidor estático o usa `make up`.
4. Ajusta los campos del formulario.
5. Pulsa `Generar .elpx`.

## Parámetros de URL

Ejemplos:

```text
?generate=1&title=Mi%20curso&theme=flux&pages=4&depth=2&blocks=2&components=1
?config=eyJ0aXRsZSI6Ik1pIGN1cnNvIiwidGhlbWUiOiJ1bml2ZXJzYWwiLCJwYWdlcyI6M30
```

Parámetros principales:

- `generate=1` genera automáticamente al cargar.
- `title`, `author`, `language`, `theme`
- `pages`, `depth`, `children`, `blocks`, `components`
- `random=1`, `seed=...`
- `search=1`, `pagination=1`, `pageCounter=1`, `exeLink=1`
- `icons=1`, `mathjax=1`, `footer=1`, `accessibility=1`
- `text=...` para el texto base
- `images=...` para una lista de URLs separadas por saltos de línea o comas
- `types=text,image,mermaid,latex,...`
- `config=...` para un preset completo en base64url JSON

## Build

```bash
make build
```

El build sincroniza temas, iDevices y el DTD desde eXeLearning, copia la app a `dist/` y deja el sitio listo para GitHub Pages.

## Arquitectura

- `src/main.js`: UI, estado y descarga del `.elpx`
- `src/lib/generator.js`: estructura del proyecto, XML y ZIP
- `src/lib/xml.js`: escapado y serialización
- `src/lib/zip.js`: generador ZIP sin dependencias externas
- `src/lib/params.js`: lectura y escritura de parámetros URL
