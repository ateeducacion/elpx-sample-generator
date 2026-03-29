# Generador ELPX

Genera proyectos `.elpx` aleatorios para [eXeLearning](https://exelearning.net/) directamente desde el navegador, sin servidor.

## Funcionalidades

- Wizard de 2 pasos: proyecto + estructura/contenido.
- Selector visual de temas con screenshots.
- Sliders para configurar paginas, profundidad, bloques e iDevices.
- Galeria de imagenes con thumbnails desde Picsum.
- Tipos de contenido: texto, cita, lista, tabla, imagen, Mermaid, LaTeX, aviso.
- Descarga del `.elpx` generado al instante.
- Publicacion automatica en GitHub Pages.

## Uso local

```bash
make deps        # instala dependencias con bun
make download    # sincroniza temas, iDevices y DTD desde eXeLearning
make up          # sirve la app en localhost
```

Abre el navegador, ajusta los campos y pulsa **Generar .elpx**.

## Build

```bash
make build
```

Sincroniza assets, copia la app a `dist/` y deja el sitio listo para GitHub Pages.

## Estructura del proyecto

```
index.html              # UI del wizard
src/main.js             # logica de la UI, wizard y galeria
src/lib/generator.js    # arbol de paginas, bloques, HTML e imagenes
src/lib/xml.js          # content.xml y escapado XML
src/lib/zip.js          # generador ZIP sin dependencias externas
src/lib/params.js       # lectura de parametros y config por defecto
src/styles.css          # estilos del wizard (sliders, stepper)
scripts/                # build, dev server y sincronizacion de assets
.github/workflows/      # deploy a GitHub Pages
```

## Licencia

Made with ❤️ by Area de Tecnologia Educativa.
