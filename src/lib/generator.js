import { createRandom, intBetween, pick, shuffle } from './random.js';
import { buildContentDtd, buildContentXml, buildThemeConfigXml } from './xml.js';
import { createZip } from './zip.js';

const BLOCK_ICON_MAP = {
  text: 'page',
  quote: 'think',
  list: 'guide',
  table: 'activity',
  image: 'gallery',
  mermaid: 'interactive',
  latex: 'math',
  callout: 'info',
};

const BLOCK_NAMES = {
  text: 'Texto',
  quote: 'Cita',
  list: 'Lista',
  table: 'Tabla',
  image: 'Imagen',
  mermaid: 'Mermaid',
  latex: 'LaTeX',
  callout: 'Aviso',
};

const DEFAULT_THEME = 'default';
const DEFAULT_UPSTREAM_THEME_NAMES = ['base', 'flux', 'neo', 'nova', 'universal', 'zen'];
const UPSTREAM_THEME_ALIASES = {
  default: 'base',
  base: 'base',
  flux: 'flux',
  neo: 'neo',
  nova: 'nova',
  universal: 'universal',
  zen: 'zen',
};
const EXELEARNING_ASSET_ROOT = './assets/exelearning/public';
const EXELEARNING_THEME_ROOT = `${EXELEARNING_ASSET_ROOT}/files/perm/themes/base`;
const EXELEARNING_IDEVICE_ROOT = `${EXELEARNING_ASSET_ROOT}/files/perm/idevices/base/text`;
const EXELEARNING_DTD_PATH = `${EXELEARNING_ASSET_ROOT}/app/schemas/ode/content.dtd`;
const PLACEHOLDER_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUREhIVFRUVFRUVFRUVFRUVFRUWFhUVFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGi0lHyU3LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAUAAEAAAAAAAAAAAAAAAAAAAAB/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAByA//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/AKP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AKP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AKP/2Q==';
const LOGO_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1yX6kAAAAASUVORK5CYII=';

function normalizeLines(text) {
  return String(text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function normalizeName(value, fallback = '') {
  return String(value || fallback).trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'project';
}

/**
 * Build an ODE-conformant identifier factory.
 *
 * eXeLearning v4 expects every ODE id (page, block, iDevice, project,
 * version) to match the regex `[0-9]{14}[A-Z0-9]{6}` — 14 digits of a
 * `YYYYMMDDHHmmss` timestamp followed by 6 random uppercase alphanumeric
 * characters. The XSD `odeIdentifierType` (public/app/schemas/ode/ode-content.xsd)
 * enforces this pattern, and the importer relies on it for collision
 * tracking. We mirror the algorithm used by `OdeXmlGenerator.generateOdeId()`.
 *
 * @param {() => number} random - Seeded RNG, range [0,1).
 * @returns {() => string} A function that emits a fresh ODE id every call.
 */
function uniqueIdFactory(random) {
  const baseTime = new Date();
  const stampParts = [
    baseTime.getFullYear().toString(),
    String(baseTime.getMonth() + 1).padStart(2, '0'),
    String(baseTime.getDate()).padStart(2, '0'),
    String(baseTime.getHours()).padStart(2, '0'),
    String(baseTime.getMinutes()).padStart(2, '0'),
    String(baseTime.getSeconds()).padStart(2, '0'),
  ];
  const timestamp = stampParts.join('');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let counter = 0;
  return () => {
    counter += 1;
    let suffix = '';
    for (let i = 0; i < 6; i += 1) {
      suffix += alphabet.charAt(Math.floor(random() * alphabet.length));
    }
    // The legacy callers passed a prefix (`page`, `block`, `idevice`, …) but
    // the v4 format does not embed a category in the id — the surrounding
    // XML element already disambiguates. We accept and ignore the argument
    // for backward compatibility with the existing call sites.
    void counter;
    return `${timestamp}${suffix}`;
  };
}

function splitParagraphs(text) {
  const paragraphs = String(text || '').split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
  return paragraphs.length ? paragraphs : [String(text || '').trim()];
}

function firstSentence(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/[^.!?]+[.!?]?/);
  return (match ? match[0] : normalized).trim();
}

function buildTiming(random) {
  const durations = ['3 min', '5 min', '10 min', '15 min', '20 min', '30 min'];
  const groups = ['Individual', 'Parejas', 'Pequeño grupo', 'Gran grupo', 'Clase completa'];
  return {
    duration: pick(random, durations) || '5 min',
    group: pick(random, groups) || 'Individual',
  };
}

function createPlaceholderSvg(title, accent) {
  const safeTitle = escapeHtml(title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="#10141f"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#g)"/>
    <circle cx="1020" cy="120" r="190" fill="rgba(255,255,255,0.08)"/>
    <circle cx="220" cy="620" r="240" fill="rgba(255,255,255,0.06)"/>
    <text x="80" y="180" fill="white" font-size="72" font-family="Georgia, serif" font-weight="700">${safeTitle}</text>
    <text x="80" y="260" fill="rgba(255,255,255,0.82)" font-size="32" font-family="Verdana, sans-serif">Placeholder incrustado en el paquete .elpx</text>
  </svg>`;
  return new TextEncoder().encode(svg);
}

function decodeBase64ToBytes(input) {
  const binary = atob(input);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function tryFetchText(url, fallback) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function tryFetchBytes(url, fallback) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    return buffer.byteLength ? new Uint8Array(buffer) : fallback;
  } catch {
    return fallback;
  }
}

function createPlaceholderJpeg() {
  return decodeBase64ToBytes(PLACEHOLDER_JPEG_BASE64);
}

function makeTextHtml(text, config, random, timing) {
  const paragraphs = splitParagraphs(text);
  const accents = ['<strong>destacado</strong>', '<em>clave</em>', '<span class="highlight">importante</span>'];
  const enriched = paragraphs.map((paragraph, index) => {
    const accent = pick(random, accents) || '';
    return `<p>${escapeHtml(paragraph)} ${index % 2 === 0 ? accent : ''}</p>`;
  });
  if (config.timing) {
    enriched.unshift(`<p class="exe-meta"><strong>Duración:</strong> ${timing.duration} · <strong>Agrupamiento:</strong> ${timing.group}</p>`);
  }
  return `<div class="exe-text"><div class="exe-text-activity">${enriched.join('')}<p class="clearfix"></p></div></div>`;
}

function makeQuoteHtml(text, random) {
  const quote = firstSentence(text);
  const citation = pick(random, ['Generador ELPX', 'eXeLearning', 'Proyecto aleatorio', 'Repositorio de muestra']) || 'Generador ELPX';
  return `<blockquote class="exe-quote-cite styled-qc"><p>${escapeHtml(quote)}</p><cite>${escapeHtml(citation)}</cite></blockquote>`;
}

function makeListHtml(text, random) {
  const items = splitParagraphs(text).slice(0, 4);
  const source = items.length ? items : ['Elemento 1', 'Elemento 2', 'Elemento 3'];
  const listItems = source
    .map(item => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const extra = pick(random, ['Observa el orden', 'Compara ideas', 'Resume en voz alta', 'Explica el procedimiento']) || 'Resume en voz alta';
  return `<div class="exe-list-block"><p>${escapeHtml(extra)}</p><ul>${listItems}</ul></div>`;
}

function makeTableHtml(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const rows = [];
  const chunks = [];
  for (let i = 0; i < Math.min(words.length, 8); i += 2) {
    chunks.push(words.slice(i, i + 2));
  }
  const safeRows = chunks.length ? chunks : [['Concepto', 'Detalle'], ['Dato', 'Ejemplo']];
  for (const [left, right] of safeRows) {
    rows.push(`<tr><td>${escapeHtml(left || 'Dato')}</td><td>${escapeHtml(right || 'Ejemplo')}</td></tr>`);
  }
  return `<table class="exe-table"><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function makeMermaidMarkup(random) {
  const nodes = ['Inicio', 'Idea', 'Proceso', 'Resultado', 'Cierre'];
  const shuffled = shuffle(random, nodes);
  const edges = [];
  for (let i = 0; i < shuffled.length - 1; i += 1) {
    edges.push(`${shuffled[i]} --> ${shuffled[i + 1]}`);
  }
  return `<pre class="mermaid">graph TD; ${edges.join('; ')}</pre>`;
}

function makeLatexMarkup(random) {
  const expressions = [
    'E = mc^2',
    '\\int_0^1 x^2 \\, dx = \\frac{1}{3}',
    '\\frac{a}{b} = \\frac{c}{d}',
    '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}',
  ];
  const expr = pick(random, expressions) || expressions[0];
  return `<p>\\(${expr}\\)</p>`;
}

function makeCalloutHtml(text, random) {
  const title = pick(random, ['Atención', 'Pista', 'Recuerda', 'Observación']) || 'Atención';
  return `<aside class="exe-callout"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(firstSentence(text))}</p></aside>`;
}

function makeImageHtml(asset, title) {
  // v4 reference form: `{{context_path}}/<filename>`. The placeholder
  // resolves to `content/resources/` (or `../content/resources/` for nested
  // pages) at render time, so the XML body carries only the bare filename.
  // Asset paths inside the ZIP live FLAT at `content/resources/<filename>`.
  const filename = asset.filename || asset.path.replace(/^content\/resources\//, '');
  return `<figure class="exe-figure exe-image position-center" style="width: 100%;">
    <img src="{{context_path}}/${filename}" alt="${escapeHtml(title)}" width="1280" height="720">
    <figcaption class="figcaption"><span class="title"><em>${escapeHtml(title)}</em></span></figcaption>
  </figure>`;
}

function buildComponentHtml(type, config, random, project, page, block, index) {
  const baseText = config.lorem;
  const timing = buildTiming(random);
  const title = `${page.title} · ${block.name}`;
  switch (type) {
    case 'quote': {
      const quoteHtml = makeQuoteHtml(baseText, random);
      return {
        html: quoteHtml,
        props: {
          textTextarea: quoteHtml,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
    case 'list': {
      const listHtml = makeListHtml(baseText, random);
      return {
        html: listHtml,
        props: {
          textTextarea: listHtml,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
    case 'table': {
      const tableHtml = makeTableHtml(baseText);
      return {
        html: tableHtml,
        props: {
          textTextarea: tableHtml,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
    case 'image': {
      const asset = project.assets[index % project.assets.length];
      const html = makeImageHtml(asset, title);
      return {
        html,
        props: {
          textTextarea: html,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
    case 'mermaid': {
      const html = makeMermaidMarkup(random);
      return {
        html,
        props: {
          textTextarea: html,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
    case 'latex': {
      const html = makeLatexMarkup(random);
      return {
        html,
        props: {
          textTextarea: html,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
    case 'callout': {
      const calloutHtml = makeCalloutHtml(baseText, random);
      return {
        html: calloutHtml,
        props: {
          textTextarea: calloutHtml,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
    case 'text':
    default: {
      const html = makeTextHtml(baseText, config, random, timing);
      return {
        html,
        props: {
          textInfoDurationInput: config.timing ? timing.duration : '',
          textInfoDurationTextInput: 'Duración',
          textInfoParticipantsInput: config.timing ? timing.group : '',
          textInfoParticipantsTextInput: 'Agrupamiento',
          textTextarea: html,
          textFeedbackInput: 'Show Feedback',
          textFeedbackTextarea: '',
        },
      };
    }
  }
}

function makeBlockName(type, index) {
  const base = BLOCK_NAMES[type] || 'Bloque';
  return `${base} ${index + 1}`;
}

function makeIconName(type, random) {
  const fallback = pick(random, Object.values(BLOCK_ICON_MAP)) || 'page';
  return BLOCK_ICON_MAP[type] || fallback;
}

function buildPageTitle(config, pathLabel) {
  return `Página ${pathLabel}`;
}

function buildPageTree(config, random, availableThemes = DEFAULT_UPSTREAM_THEME_NAMES) {
  const id = uniqueIdFactory(random);
  const pages = [];
  const depthLimit = config.randomMode ? intBetween(random, 1, Math.max(1, config.depth)) : config.depth;
  const rootCount = config.randomMode
    ? intBetween(random, config.pages > 1 ? 2 : 1, Math.max(config.pages, config.pages > 1 ? 2 : 1))
    : config.pages;
  const maxChildren = config.randomMode ? intBetween(random, 0, Math.max(0, config.children + 1)) : config.children;

  const contentTypes = config.contentTypes.length ? [...config.contentTypes] : ['text'];
  const assets = [];
  const urls = normalizeLines(config.imageUrls.join('\n'));
  if (contentTypes.includes('image')) {
    const sourceUrls = urls.length ? urls : [''];
    const seenNames = new Set();
    for (let i = 0; i < sourceUrls.length; i += 1) {
      // v4 layout: assets live FLAT under content/resources/<filename>.
      // No per-asset UUID subfolder (that was a v3 artefact normalised
      // away by scripts/flatten-elpx.ts in the eXeLearning repo).
      // Collision-safe filenames keep the layout deterministic.
      let filename = `image-${i + 1}.jpg`;
      while (seenNames.has(filename)) {
        filename = `image-${i + 1}-${seenNames.size + 1}.jpg`;
      }
      seenNames.add(filename);
      assets.push({
        url: sourceUrls[i] || '',
        name: filename.replace(/\.jpg$/i, ''),
        path: `content/resources/${filename}`,
        filename,
      });
    }
  }

  const project = {
    odeId: id('ode'),
    odeVersionId: id('version'),
    meta: {
      title: config.title,
      subtitle: '',
      author: config.author,
      language: config.language,
      theme: config.theme === 'random' ? pick(random, availableThemes) || DEFAULT_THEME : normalizeName(config.theme, DEFAULT_THEME),
      license: 'creative commons: attribution - share alike 4.0',
      description: `Proyecto generado de forma ${config.randomMode ? 'aleatoria' : 'controlada'} por el generador ELPX.`,
      exportSource: config.exportSource,
      exeLink: config.exeLink,
      pagination: config.pagination,
      pageCounter: config.pageCounter,
      searchBox: config.searchBox,
      accessibility: config.accessibility,
      mathjax: config.mathjax || contentTypes.includes('latex'),
      footerHtml: config.footer
        ? `<footer class="exe-footer"><p>Generado con elpx-sample-generator.</p></footer>`
        : '',
      extraHeadContent: config.mathjax || contentTypes.includes('latex')
        ? '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        : '',
    },
    pages,
    assets,
    theme: config.theme,
    contentTypes,
  };

  const makeBlocks = (page, level, pathLabel) => {
    const blockCount = config.randomMode ? intBetween(random, 1, Math.max(1, config.blocks + 1)) : config.blocks;
    for (let i = 0; i < blockCount; i += 1) {
      const blockType = pick(random, contentTypes) || 'text';
      const blockId = id('block');
      const block = {
        id: blockId,
        name: makeBlockName(blockType, i),
        order: i + 1,
        iconName: config.blockIcons ? makeIconName(blockType, random) : '',
        components: [],
      };

      const componentCount = config.randomMode ? intBetween(random, 1, Math.max(1, config.components + 1)) : config.components;
      for (let c = 0; c < componentCount; c += 1) {
        const forceImage = c === 0 && i === 0 && contentTypes.includes('image') && project.assets.length > 0;
        const componentType = forceImage ? 'image' : (pick(random, contentTypes) || 'text');
        const componentId = id('idevice');
      const component = buildComponentHtml(componentType, config, random, project, page, block, c);
      block.components.push({
        id: componentId,
        type: 'text',
        order: c + 1,
        htmlView: component.html,
        jsonProperties: { ...component.props, ideviceId: componentId },
      });
      }

      page.blocks.push(block);
    }

    if (level >= depthLimit) return;

    const childCount = config.randomMode
      ? intBetween(random, config.children > 0 ? 1 : 0, Math.max(config.children > 0 ? 1 : 0, maxChildren))
      : maxChildren;
    for (let i = 0; i < childCount; i += 1) {
      const childPathLabel = `${pathLabel}.${i + 1}`;
      const child = {
        id: id('page'),
        parentId: page.id,
        title: buildPageTitle(config, childPathLabel),
        order: i + 1,
        description: '',
        blocks: [],
      };
      pages.push(child);
      makeBlocks(child, level + 1, childPathLabel);
    }
  };

  for (let i = 0; i < rootCount; i += 1) {
    const page = {
      id: id('page'),
      parentId: null,
      title: buildPageTitle(config, String(i + 1)),
      order: i + 1,
      description: '',
      blocks: [],
    };
    pages.push(page);
    makeBlocks(page, 1, String(i + 1));
  }

  return project;
}

function buildIndexHtml(project) {
  const pageLinks = buildNavTreeHtml(project.pages);
  const searchBlock = project.meta.searchBox
    ? `<section class="search-box">
        <h2>Buscar</h2>
        <input id="searchInput" type="search" placeholder="Buscar páginas">
        <ul id="searchResults"></ul>
      </section>`
    : '';
  const searchScript = project.meta.searchBox
    ? `<script src="./search_index.js"></script>
      <script>
        const input = document.getElementById('searchInput');
        const results = document.getElementById('searchResults');
        const items = window.__ELPX_SEARCH_INDEX__ || [];
        function render(value) {
          const query = value.trim().toLowerCase();
          const filtered = items.filter(item => item.title.toLowerCase().includes(query));
          results.innerHTML = filtered.map(item => '<li><a href="./' + item.path + '">' + item.title + '</a></li>').join('');
        }
        input.addEventListener('input', e => render(e.target.value));
        render('');
      </script>`
    : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(project.meta.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0b7285">
  <title>${escapeHtml(project.meta.title)}</title>
  <link rel="stylesheet" href="./content/css/base.css">
  <link rel="stylesheet" href="./theme/style.css">
</head>
<body>
  <main class="exe-home">
    <header>
      <h1>${escapeHtml(project.meta.title)}</h1>
      <p>${escapeHtml(project.meta.description)}</p>
    </header>
    <nav>
      <h2>Páginas</h2>
      ${pageLinks}
    </nav>
    ${searchBlock}
  </main>
  ${searchScript}
</body>
</html>`;
}

function buildNavTreeHtml(pages, parentId = null) {
  const children = pages.filter(page => page.parentId === parentId).sort((left, right) => left.order - right.order);
  if (!children.length) {
    return '';
  }
  const items = children
    .map(page => {
      const childTree = buildNavTreeHtml(pages, page.id);
      return `<li><a href="./html/${slugify(page.title)}.html">${escapeHtml(page.title)}</a>${childTree}</li>`;
    })
    .join('');
  return `<ul>${items}</ul>`;
}

function buildPageHtml(project, page, pageNumber, totalPages) {
  const blocks = page.blocks
    .map(block => {
      const components = block.components
        .map(component => `<div class="component">${component.htmlView}</div>`)
        .join('\n');
      return `<section class="block">
  <header><strong>${escapeHtml(block.name)}</strong>${block.iconName ? `<span class="icon">${escapeHtml(block.iconName)}</span>` : ''}</header>
  ${components}
</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(project.meta.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}</title>
  <link rel="stylesheet" href="../content/css/base.css">
  <link rel="stylesheet" href="../theme/style.css">
</head>
<body>
  <main class="page">
    <p><a href="../index.html">Volver al índice</a></p>
    <p class="counter">${project.meta.pageCounter || project.meta.pagination ? `Página ${pageNumber} / ${totalPages}` : ''}</p>
    <h1>${escapeHtml(page.title)}</h1>
    ${blocks}
  </main>
</body>
</html>`;
}

function buildSearchIndex(project) {
  const items = project.pages.map(page => ({
    id: page.id,
    title: page.title,
    path: `html/${slugify(page.title)}.html`,
  }));
  return `window.__ELPX_SEARCH_INDEX__ = ${JSON.stringify(items, null, 2)};`;
}

function buildCommonJs() {
  return `window.eXeLearning = window.eXeLearning || {};
window.eXeLearning.ready = true;
window.eXeLearning.download = function download() {};
`;
}

function buildCommonI18nJs(project) {
  return `window.__ELPX_I18N__ = ${JSON.stringify({ language: project.meta.language })};`;
}

function buildExeExportJs() {
  return `window.__ELPX_EXPORT__ = { version: '1.0.0' };`;
}

function buildIdeviceHtml() {
  return `<div class="exe-text-template"><div class="textIdeviceContent"></div></div>`;
}

function buildIdeviceCss() {
  return `.exe-text-template{display:block}.textIdeviceContent{padding:0}.exe-footer{margin-top:2rem}`;
}

function buildIdeviceJs() {
  return `window.__ELPX_IDEVICE__ = true;`;
}

function buildThemeCss(theme) {
  const palettes = {
    default: ['#0f766e', '#155e75', '#f8fafc'],
    base: ['#0f766e', '#155e75', '#f8fafc'],
    flux: ['#ff6b35', '#1c2541', '#f7f7ff'],
    neo: ['#6366f1', '#1e293b', '#f8fafc'],
    nova: ['#0891b2', '#0f172a', '#f8fafc'],
    universal: ['#1d4ed8', '#0f172a', '#ffffff'],
    zen: ['#14b8a6', '#134e4a', '#f0fdfa'],
  };
  const [accent, contrast, paper] = palettes[theme] || palettes.default;
  return `:root{--accent:${accent};--contrast:${contrast};--paper:${paper};}
body{margin:0;font-family:Verdana,Arial,sans-serif;background:linear-gradient(145deg,var(--contrast),#111827);color:#fff}
.exe-home,.page{max-width:980px;margin:0 auto;padding:2rem}
.page{background:rgba(255,255,255,.95);color:#111827;min-height:100vh}
.block{border:1px solid rgba(0,0,0,.12);border-radius:1rem;padding:1rem 1.25rem;margin:1rem 0;background:rgba(255,255,255,.75)}
.block header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
.counter{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.08em}`;
}

function buildThemeStyleJs(theme) {
  return `window.__ELPX_THEME__ = ${JSON.stringify(theme)};`;
}

function buildThemeIconSvg(name, theme) {
  const palette = {
    default: ['#0f766e', '#d1fae5'],
    base: ['#0f766e', '#d1fae5'],
    flux: ['#ff6b35', '#ffe5d6'],
    neo: ['#6366f1', '#e0e7ff'],
    nova: ['#0891b2', '#cffafe'],
    universal: ['#1d4ed8', '#dbeafe'],
    zen: ['#14b8a6', '#ccfbf1'],
  };
  const [accent, fill] = palette[theme] || palette.default;
  const label = name.slice(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <rect x="4" y="4" width="56" height="56" rx="16" fill="${fill}"/>
    <circle cx="32" cy="32" r="20" fill="${accent}" opacity="0.22"/>
    <text x="32" y="39" text-anchor="middle" font-family="Verdana, sans-serif" font-size="18" font-weight="700" fill="${accent}">${label}</text>
  </svg>`;
}

function buildThemeFiles(theme) {
  const iconNames = ['page', 'guide', 'activity', 'gallery', 'interactive', 'math', 'info', 'think', 'download', 'share', 'search', 'menu', 'settings', 'close'];
  return [
    { name: 'theme/config.xml', data: buildThemeConfigXml(theme) },
    { name: 'theme/style.css', data: buildThemeCss(theme) },
    { name: 'theme/style.js', data: buildThemeStyleJs(theme) },
    ...iconNames.map(icon => ({ name: `theme/icons/${icon}.svg`, data: buildThemeIconSvg(icon, theme) })),
  ];
}

async function buildThemeFilesFromAssets(theme) {
  const normalizedTheme = normalizeName(theme, DEFAULT_THEME);
  const themeName = UPSTREAM_THEME_ALIASES[normalizedTheme] || 'base';
  const themeRoot = `${EXELEARNING_THEME_ROOT}/${themeName}`;
  const themeFiles = [
    ['theme/config.xml', buildThemeConfigXml(themeName)],
    ['theme/style.css', buildThemeCss(theme)],
    ['theme/style.js', buildThemeStyleJs(themeName)],
    ['theme/screenshot.png', null],
  ];

  const files = [];
  for (const [name, fallback] of themeFiles) {
    if (fallback === null) {
      const bytes = await tryFetchBytes(`${themeRoot}/screenshot.png`, null);
      if (bytes) files.push({ name, data: bytes });
      continue;
    }

    const data = await tryFetchText(`${themeRoot}/${name.split('/').pop()}`, fallback);
    files.push({ name, data });
  }

  return files;
}

async function buildTextIdeviceFiles() {
  // v4 layout for `idevices/<type>/` inside an .elpx is FLAT: only the
  // export-side files live there (text.html, text.css, text.js, plus the
  // exequextsq.svg quote-mark asset). The legacy edition/* and export/*
  // sub-trees were source-tree artefacts; the exporter copies the export
  // outputs flat. See doc/elpx-format/examples/full-package-tree.md and
  // public/files/perm/idevices/base/text/ in the upstream repository.
  const files = [
    {
      zipName: 'idevices/text/text.html',
      upstream: 'export/text.html',
      fallback: buildIdeviceHtml(),
    },
    {
      zipName: 'idevices/text/text.css',
      upstream: 'export/text.css',
      fallback: buildIdeviceCss(),
    },
    {
      zipName: 'idevices/text/text.js',
      upstream: 'export/text.js',
      fallback: buildIdeviceJs(),
    },
    {
      zipName: 'idevices/text/exequextsq.svg',
      upstream: 'export/exequextsq.svg',
      fallback: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"></svg>',
    },
  ];
  const output = [];
  for (const file of files) {
    const upstream = await tryFetchText(`${EXELEARNING_IDEVICE_ROOT}/${file.upstream}`, file.fallback);
    output.push({ name: file.zipName, data: upstream });
  }
  return output;
}

/**
 * Build a 1280x720 PNG screenshot for the project.
 *
 * v4 packages always carry a project thumbnail at the ZIP root
 * (see doc/elpx-format/screenshot.md). When running in a browser we draw
 * one with HTMLCanvasElement; outside a browser (Node-driven build) we
 * fall back to a tiny 1x1 transparent PNG so the file still validates as
 * PNG against the bundled magic-byte check.
 *
 * @param {object} project - Project model from buildPageTree().
 * @returns {Promise<Uint8Array>} Raw PNG bytes.
 */
async function buildProjectScreenshot(project) {
  const title = (project.meta && project.meta.title) || 'eXeLearning project';

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const accent = (project.meta && project.meta.themeAccent) || '#1565c0';
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, '#0d47a1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);
      // Decorative bands
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 0, 1280, 80);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 720 - 80, 1280, 80);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '24px sans-serif';
      ctx.fillText('eXeLearning project', 1280 / 2, 720 - 40);
      // Title — wrap to 32 chars per line, max 3 lines, scale font
      const words = String(title).split(/\s+/);
      const lines = [];
      let current = '';
      for (const w of words) {
        if (!current) current = w;
        else if ((`${current} ${w}`).length <= 32) current = `${current} ${w}`;
        else { lines.push(current); current = w; }
      }
      if (current) lines.push(current);
      const trimmed = lines.slice(0, 3);
      const fontSize = trimmed.length === 1 ? 80 : trimmed.length === 2 ? 64 : 52;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const lineHeight = fontSize * 1.25;
      const startY = 720 / 2 - (trimmed.length * lineHeight) / 2 + lineHeight / 2;
      for (let i = 0; i < trimmed.length; i += 1) {
        ctx.fillText(trimmed[i], 1280 / 2, startY + i * lineHeight);
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        return new Uint8Array(await blob.arrayBuffer());
      }
    }
  }

  // Fallback: 1x1 transparent PNG (still passes magic-byte validation).
  return decodeBase64ToBytes(LOGO_PNG_BASE64);
}

async function buildStaticFiles(project, rootSlug) {
  const files = [];
  const totalPages = project.pages.length;
  files.push({ name: 'index.html', data: buildIndexHtml(project) });
  files.push({ name: 'content.dtd', data: await tryFetchText(EXELEARNING_DTD_PATH, buildContentDtd()) });
  // v4 packages always ship a project thumbnail at the ZIP root.
  files.push({ name: 'screenshot.png', data: await buildProjectScreenshot(project) });
  files.push({ name: 'content/css/base.css', data: `body{font-family:Verdana,Arial,sans-serif;background:#f6f7fb;color:#111827;margin:0}img{max-width:100%}.exe-footer{margin-top:2rem;font-size:.9rem;color:#555}.highlight{background:#fef08a}.exe-callout{padding:1rem;border-left:4px solid #0f766e;background:#ecfeff}.exe-table{width:100%;border-collapse:collapse}.exe-table th,.exe-table td{border:1px solid #cbd5e1;padding:.5rem}.mermaid{padding:1rem;background:#f8fafc;border:1px solid #dbe4ea;border-radius:.75rem}.exe-meta{font-size:.9rem;color:#475569}` });
  files.push({ name: 'content/img/exe_powered_logo.png', data: decodeBase64ToBytes(LOGO_PNG_BASE64) });
  files.push(...buildThemeFiles(project.meta.theme));
  files.push(...await buildThemeFilesFromAssets(project.meta.theme));
  files.push({ name: 'libs/jquery/jquery.min.js', data: buildCommonJs() });
  files.push({ name: 'libs/common.js', data: buildCommonJs() });
  files.push({ name: 'libs/common_i18n.js', data: buildCommonI18nJs(project) });
  files.push({ name: 'libs/exe_export.js', data: buildExeExportJs() });
  files.push(...await buildTextIdeviceFiles());
  files.push({ name: 'search_index.js', data: buildSearchIndex(project) });
  files.push({ name: 'custom/.keep', data: '' });

  for (const [index, page] of project.pages.entries()) {
    const pageFile = `html/${slugify(page.title)}.html`;
    files.push({ name: pageFile, data: buildPageHtml(project, page, index + 1, totalPages) });
  }

  for (const asset of project.assets) {
    const image = asset.bytes || createPlaceholderSvg(project.meta.title, '#0f766e');
    files.push({ name: asset.path, data: image });
  }

  return files;
}

export async function buildProjectPackage(config, availableThemes = DEFAULT_UPSTREAM_THEME_NAMES) {
  const random = createRandom(config.seed);
  const normalized = {
    ...config,
    theme: config.theme === 'random' ? pick(random, availableThemes) || DEFAULT_THEME : normalizeName(config.theme, DEFAULT_THEME),
  };
  const project = buildPageTree(normalized, random, availableThemes);
  const rootSlug = slugify(project.meta.title);

  // Resolve assets after the content structure has been created.
  const imageUrls = normalizeLines(normalized.imageUrls.join('\n'));
  let assetIndex = 0;
  for (const asset of project.assets) {
    const candidateUrl = imageUrls[assetIndex % imageUrls.length] || '';
    assetIndex += 1;
    const bytes = await downloadAsset(candidateUrl, project.meta.title, assetIndex);
    asset.bytes = bytes;
  }

  const files = await buildStaticFiles(project, rootSlug);
  files.push({ name: 'content.xml', data: buildContentXml(normalized, project) });
  const zipEntries = files.map(file => ({ name: file.name, data: file.data }));
  const zipBytes = createZip(zipEntries);
  const filename = `${rootSlug}.elpx`;
  return { filename, zipBytes, project };
}

async function downloadAsset(url, title, index) {
  if (!url) {
    return createPlaceholderJpeg();
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) throw new Error('empty response');
    return new Uint8Array(buffer);
  } catch {
    return createPlaceholderJpeg();
  }
}

export function getRandomizedConfig(baseConfig, availableThemes = DEFAULT_UPSTREAM_THEME_NAMES) {
  const random = createRandom(baseConfig.seed);
  return {
    ...baseConfig,
    randomMode: true,
    theme: baseConfig.theme === 'random' ? pick(random, availableThemes) || DEFAULT_THEME : normalizeName(baseConfig.theme, DEFAULT_THEME),
    pages: intBetween(random, 2, 6),
    depth: intBetween(random, 1, 3),
    children: intBetween(random, 0, 3),
    blocks: intBetween(random, 1, 3),
    components: intBetween(random, 1, 2),
    blockIcons: random() > 0.15,
    searchBox: random() > 0.2,
    pagination: random() > 0.15,
    pageCounter: random() > 0.15,
    exeLink: random() > 0.1,
    accessibility: random() > 0.2,
    mathjax: random() > 0.2,
    footer: random() > 0.3,
    exportSource: random() > 0.1,
    timing: random() > 0.2,
    contentTypes: shuffle(random, baseConfig.contentTypes).slice(0, intBetween(random, 3, baseConfig.contentTypes.length)),
  };
}

export default buildProjectPackage;
