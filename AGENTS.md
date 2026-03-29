# AGENTS.md - elpx-sample-generator

## Proyecto

Este repositorio genera archivos `.elpx` directamente desde el navegador y publica la web en GitHub Pages.

## Objetivo

- Mantener el frontend simple y estático.
- Generar paquetes `.elpx` importables por eXeLearning.
- Evitar dependencias innecesarias.
- Mantener el build reproducible y apto para GitHub Pages.

## Fuente de verdad

- La documentación del formato vive en el repo upstream: `http://github.com/exelearning/exelearning`.
- La referencia local principal es `doc/elpx-format.md` del repo de eXeLearning.
- Los temas deben sincronizarse desde `public/files/perm/themes/base/*`.
- Los iDevices deben sincronizarse desde `public/files/perm/idevices/base/*`.
- Los nombres de temas e iDevices se normalizan a minúsculas en el catálogo y en la UI.
- El DTD debe copiarse desde `public/app/schemas/ode/content.dtd`.
- Los assets descargados se guardan en `assets/exelearning/` y no se versionan.

## Reglas

- Usa ASCII salvo que un archivo ya use Unicode o el idioma lo requiera.
- Prefiere HTML, CSS y JavaScript sin framework si no aporta valor claro.
- Usa `apply_patch` para cambios manuales.
- No borres trabajo existente que no sea tuyo.
- Evita dependencias externas si la misma funcionalidad se puede implementar de forma local.
- Usa `bun` para instalar dependencias y ejecutar scripts cuando el flujo de trabajo lo pida.

## Flujo de trabajo

- `make deps` instala dependencias con `bun`.
- `make download-themes` sincroniza los temas upstream.
- `make download-idevices` sincroniza los iDevices upstream.
- `make download-dtd` copia el DTD upstream.
- `make download` ejecuta la sincronización completa.
- `make up` sirve la app localmente con `bun`.
- `make build` sincroniza assets y publica el sitio en `dist/`.
- El workflow de GitHub Pages publica `dist/` con `make build`.

## Contrato del generador

- La descarga se produce en el navegador, sin servidor.
- El ZIP debe contener `content.xml` y `content.dtd`.
- Los recursos de imagen se incrustan dentro del ZIP y no se enlazan como URLs remotas.
- La URL debe poder reconstruir el mismo estado mediante parámetros o `config=`.
- Los temas y iDevices del paquete deben proceder del material sincronizado desde eXeLearning cuando exista en `assets/exelearning/`.

## Criterios de calidad

- `content.xml` debe ser válido y escapar correctamente HTML/XML.
- Los nombres de archivos y rutas dentro del ZIP deben usar `/`.
- Si una imagen remota falla, se usa un placeholder local.
