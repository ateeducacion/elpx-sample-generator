const DEFAULT_TYPES = ['text', 'quote', 'list', 'table', 'image', 'mermaid', 'latex', 'callout'];

export const DEFAULT_CONFIG = {
  title: 'Proyecto eXeLearning aleatorio',
  author: 'Generador ELPX',
  language: 'es',
  theme: 'default',
  randomMode: false,
  seed: 'elpx-2026',
  pages: 3,
  depth: 2,
  children: 2,
  blocks: 2,
  components: 1,
  blockIcons: true,
  searchBox: true,
  pagination: true,
  pageCounter: true,
  exeLink: true,
  accessibility: true,
  mathjax: true,
  footer: true,
  exportSource: true,
  timing: true,
  lorem:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  imageUrls: [
    'https://picsum.photos/seed/classroom/1280/720',
    'https://picsum.photos/seed/library/1280/720',
    'https://picsum.photos/seed/forest/1280/720',
    'https://picsum.photos/seed/geometry/1280/720',
  ],
  contentTypes: DEFAULT_TYPES,
};

export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseCsvList(value, fallback = []) {
  if (!value) return [...fallback];
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value)
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function decodeBase64Url(input) {
  if (!input) return null;
  try {
    const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function readConfigFromLocation(locationObj = window.location) {
  const params = new URLSearchParams(locationObj.search);
  const configParam = params.get('config');
  if (configParam) {
    const decoded = decodeBase64Url(configParam);
    if (decoded) {
      try {
        const parsed = JSON.parse(decoded);
        return mergeConfig(parsed);
      } catch {
        // fall through to other params
      }
    }
  }

  const next = mergeConfig({
    title: params.get('title') || undefined,
    author: params.get('author') || undefined,
    language: params.get('language') || undefined,
    theme: params.get('theme') || undefined,
    randomMode: parseBoolean(params.get('random'), DEFAULT_CONFIG.randomMode),
    seed: params.get('seed') || undefined,
    pages: parseInteger(params.get('pages'), DEFAULT_CONFIG.pages),
    depth: parseInteger(params.get('depth'), DEFAULT_CONFIG.depth),
    children: parseInteger(params.get('children'), DEFAULT_CONFIG.children),
    blocks: parseInteger(params.get('blocks'), DEFAULT_CONFIG.blocks),
    components: parseInteger(params.get('components'), DEFAULT_CONFIG.components),
    blockIcons: parseBoolean(params.get('icons'), DEFAULT_CONFIG.blockIcons),
    searchBox: parseBoolean(params.get('search'), DEFAULT_CONFIG.searchBox),
    pagination: parseBoolean(params.get('pagination'), DEFAULT_CONFIG.pagination),
    pageCounter: parseBoolean(params.get('pageCounter'), DEFAULT_CONFIG.pageCounter),
    exeLink: parseBoolean(params.get('exeLink'), DEFAULT_CONFIG.exeLink),
    accessibility: parseBoolean(params.get('accessibility'), DEFAULT_CONFIG.accessibility),
    mathjax: parseBoolean(params.get('mathjax'), DEFAULT_CONFIG.mathjax),
    footer: parseBoolean(params.get('footer'), DEFAULT_CONFIG.footer),
    exportSource: parseBoolean(params.get('exportSource'), DEFAULT_CONFIG.exportSource),
    timing: parseBoolean(params.get('timing'), DEFAULT_CONFIG.timing),
    lorem: params.get('text') || undefined,
    imageUrls: parseCsvList(params.get('images'), DEFAULT_CONFIG.imageUrls),
    contentTypes: parseCsvList(params.get('types'), DEFAULT_CONFIG.contentTypes),
  });

  return next;
}

export function mergeConfig(partial = {}) {
  const config = { ...DEFAULT_CONFIG, ...partial };
  config.randomMode = Boolean(config.randomMode);
  config.title = String(config.title || DEFAULT_CONFIG.title);
  config.author = String(config.author || DEFAULT_CONFIG.author);
  config.language = String(config.language || DEFAULT_CONFIG.language);
  config.theme = String(config.theme || DEFAULT_CONFIG.theme).trim().toLowerCase();
  config.seed = String(config.seed || DEFAULT_CONFIG.seed);
  config.pages = Math.max(1, Number.parseInt(config.pages, 10) || DEFAULT_CONFIG.pages);
  config.depth = Math.max(1, Number.parseInt(config.depth, 10) || DEFAULT_CONFIG.depth);
  config.children = Math.max(0, Number.parseInt(config.children, 10) || DEFAULT_CONFIG.children);
  config.blocks = Math.max(1, Number.parseInt(config.blocks, 10) || DEFAULT_CONFIG.blocks);
  config.components = Math.max(1, Number.parseInt(config.components, 10) || DEFAULT_CONFIG.components);
  config.blockIcons = Boolean(config.blockIcons);
  config.searchBox = Boolean(config.searchBox);
  config.pagination = Boolean(config.pagination);
  config.pageCounter = Boolean(config.pageCounter);
  config.exeLink = Boolean(config.exeLink);
  config.accessibility = Boolean(config.accessibility);
  config.mathjax = Boolean(config.mathjax);
  config.footer = Boolean(config.footer);
  config.exportSource = Boolean(config.exportSource);
  config.timing = Boolean(config.timing);
  config.lorem = String(config.lorem || DEFAULT_CONFIG.lorem);
  config.imageUrls = parseCsvList(config.imageUrls, DEFAULT_CONFIG.imageUrls);
  config.contentTypes = parseCsvList(config.contentTypes, DEFAULT_CONFIG.contentTypes).map(type => String(type).trim().toLowerCase());
  if (!config.contentTypes.length) config.contentTypes = [...DEFAULT_CONFIG.contentTypes];
  if (!config.imageUrls.length) config.imageUrls = [...DEFAULT_CONFIG.imageUrls];
  return config;
}

export function serializeConfigToUrl(config) {
  const encoded = encodeBase64Url(JSON.stringify(config));
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('config', encoded);
  return url.toString();
}

export function createDefaultUrlParams(config) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('generate', '1');
  url.searchParams.set('config', encodeBase64Url(JSON.stringify(config)));
  return url.toString();
}
