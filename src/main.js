import { DEFAULT_CONFIG, mergeConfig, readConfigFromLocation } from './lib/params.js';
import { buildProjectPackage } from './lib/generator.js';

const form = document.getElementById('configForm');
const title = document.getElementById('title');
const author = document.getElementById('author');
const languageGroup = document.getElementById('languageGroup');
const themeGroup = document.getElementById('themeGroup');
const pages = document.getElementById('pages');
const depth = document.getElementById('depth');
const children = document.getElementById('children');
const blocks = document.getElementById('blocks');
const components = document.getElementById('components');
const icons = document.getElementById('icons');
const lorem = document.getElementById('lorem');
const searchBox = document.getElementById('searchBox');
const pagination = document.getElementById('pagination');
const pageCounter = document.getElementById('pageCounter');
const exeLink = document.getElementById('exeLink');
const accessibility = document.getElementById('accessibility');
const mathjax = document.getElementById('mathjax');
const footer = document.getElementById('footer');
const exportSource = document.getElementById('exportSource');
const timing = document.getElementById('timing');
const contentTypes = document.getElementById('contentTypes');
const generateBtn = document.getElementById('generateBtn');
const wizardPrev = document.getElementById('wizardPrev');
const wizardNext = document.getElementById('wizardNext');
const wizardLabel = document.getElementById('wizardLabel');
const wizardPanels = Array.from(document.querySelectorAll('[data-step-panel]'));
const wizardStepButtons = Array.from(document.querySelectorAll('[data-step-nav]'));
const stepLines = Array.from(document.querySelectorAll('.step-line'));
const imageGallery = document.getElementById('imageGallery');
const addImageBtn = document.getElementById('addImageBtn');

const statusTemplate = document.getElementById('statusTemplate');
const WIZARD_STEP_COUNT = wizardPanels.length;
let currentWizardStep = 0;

const PICSUM_SEEDS = [
  'classroom', 'library', 'forest', 'geometry', 'ocean', 'mountain',
  'city', 'sunset', 'garden', 'bridge', 'desert', 'river', 'castle',
  'lighthouse', 'train', 'bicycle', 'piano', 'telescope', 'compass',
  'lantern', 'notebook', 'butterfly', 'sailboat', 'clock', 'rainbow',
];

let imageUrls = [
  'https://picsum.photos/seed/classroom/1280/720',
  'https://picsum.photos/seed/library/1280/720',
  'https://picsum.photos/seed/forest/1280/720',
  'https://picsum.photos/seed/geometry/1280/720',
];

for (const slider of form.querySelectorAll('input[type="range"]')) {
  slider.addEventListener('input', () => {
    const display = document.querySelector(`.range-value[data-for="${slider.id}"]`);
    if (display) display.textContent = slider.value;
  });
}

const state = mergeConfig(readConfigFromLocation(window.location));
applyConfigToForm(state);
renderImageGallery();
setWizardStep(0);
const catalogReady = hydrateCatalog().catch(() => ({ themes: [], idevices: [] }));

for (const button of wizardStepButtons) {
  button.addEventListener('click', () => {
    const nextStep = Number.parseInt(button.dataset.stepNav, 10);
    if (Number.isFinite(nextStep)) setWizardStep(nextStep);
  });
}

wizardPrev.addEventListener('click', () => {
  setWizardStep(currentWizardStep - 1);
});

wizardNext.addEventListener('click', () => {
  setWizardStep(currentWizardStep + 1);
});

addImageBtn.addEventListener('click', () => {
  const usedSeeds = new Set(imageUrls.map(u => {
    const m = u.match(/\/seed\/([^/]+)\//);
    return m ? m[1] : null;
  }));
  const available = PICSUM_SEEDS.filter(s => !usedSeeds.has(s));
  const seed = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : `random-${Date.now()}`;
  imageUrls.push(`https://picsum.photos/seed/${seed}/1280/720`);
  renderImageGallery();
});

generateBtn.addEventListener('click', async event => {
  event.preventDefault();
  const config = readFormConfig();
  const catalog = await catalogReady;
  const result = await buildProjectPackage(config, catalog.themes);
  downloadFile(result.filename, result.zipBytes);
  flashStatus('Archivo generado', `${result.filename} listo para descargar.`);
});

function applyConfigToForm(config) {
  title.value = config.title;
  author.value = config.author;
  const langRadio = languageGroup.querySelector(`input[value="${config.language}"]`);
  if (langRadio) langRadio.checked = true;
  const themeRadio = themeGroup.querySelector(`input[value="${config.theme}"]`);
  if (themeRadio) themeRadio.checked = true;
  pages.value = config.pages;
  depth.value = config.depth;
  children.value = config.children;
  blocks.value = config.blocks;
  components.value = config.components;
  icons.checked = Boolean(config.blockIcons);
  lorem.value = config.lorem;
  searchBox.checked = Boolean(config.searchBox);
  pagination.checked = Boolean(config.pagination);
  pageCounter.checked = Boolean(config.pageCounter);
  exeLink.checked = Boolean(config.exeLink);
  accessibility.checked = Boolean(config.accessibility);
  mathjax.checked = Boolean(config.mathjax);
  footer.checked = Boolean(config.footer);
  exportSource.checked = Boolean(config.exportSource);
  timing.checked = Boolean(config.timing);

  if (Array.isArray(config.imageUrls) && config.imageUrls.length > 0) {
    imageUrls = [...config.imageUrls];
  }

  for (const checkbox of contentTypes.querySelectorAll('input[type="checkbox"]')) {
    checkbox.checked = config.contentTypes.includes(checkbox.value);
  }

  for (const slider of form.querySelectorAll('input[type="range"]')) {
    const display = document.querySelector(`.range-value[data-for="${slider.id}"]`);
    if (display) display.textContent = slider.value;
  }
}

function readFormConfig() {
  const selectedTypes = Array.from(contentTypes.querySelectorAll('input[type="checkbox"]:checked')).map(
    input => input.value,
  );
  return mergeConfig({
    title: title.value.trim() || DEFAULT_CONFIG.title,
    author: author.value.trim() || DEFAULT_CONFIG.author,
    language: languageGroup.querySelector('input:checked')?.value || 'es',
    theme: themeGroup.querySelector('input:checked')?.value || 'base',
    pages: Number.parseInt(pages.value, 10) || DEFAULT_CONFIG.pages,
    depth: Number.parseInt(depth.value, 10) || DEFAULT_CONFIG.depth,
    children: Number.parseInt(children.value, 10) || DEFAULT_CONFIG.children,
    blocks: Number.parseInt(blocks.value, 10) || DEFAULT_CONFIG.blocks,
    components: Number.parseInt(components.value, 10) || DEFAULT_CONFIG.components,
    blockIcons: icons.checked,
    lorem: lorem.value,
    imageUrls: imageUrls.join('\n'),
    searchBox: searchBox.checked,
    pagination: pagination.checked,
    pageCounter: pageCounter.checked,
    exeLink: exeLink.checked,
    accessibility: accessibility.checked,
    mathjax: mathjax.checked,
    footer: footer.checked,
    exportSource: exportSource.checked,
    timing: timing.checked,
    contentTypes: selectedTypes,
  });
}

function renderImageGallery() {
  imageGallery.innerHTML = imageUrls.map((url, i) => `
    <div class="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <img src="${url}" alt="Imagen ${i + 1}" class="aspect-video w-full object-cover" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="hidden aspect-video w-full items-center justify-center bg-slate-100 text-xs text-slate-400">Error</div>
      <button type="button" data-remove-image="${i}"
        class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
        aria-label="Quitar imagen">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  `).join('');

  for (const btn of imageGallery.querySelectorAll('[data-remove-image]')) {
    btn.addEventListener('click', () => {
      imageUrls.splice(Number.parseInt(btn.dataset.removeImage, 10), 1);
      renderImageGallery();
    });
  }
}

async function hydrateCatalog() {
  const response = await fetch('./assets/exelearning/catalog.json');
  if (!response.ok) return { themes: [], idevices: [] };
  const manifest = await response.json();
  const extraThemes = Array.isArray(manifest.themes) ? manifest.themes.map(name => String(name).toLowerCase()) : [];
  const extraIdevices = Array.isArray(manifest.idevices) ? manifest.idevices.map(name => String(name).toLowerCase()) : [];
  const existing = new Set(Array.from(themeGroup.querySelectorAll('input[type="radio"]')).map(r => r.value));
  for (const name of extraThemes) {
    if (existing.has(name)) continue;
    const label = document.createElement('label');
    label.className = 'theme-card cursor-pointer';
    label.innerHTML = `<input type="radio" name="theme" value="${name}" class="peer sr-only"><div class="overflow-hidden rounded-xl border-2 border-slate-200 transition peer-checked:border-sky-500 peer-checked:ring-2 peer-checked:ring-sky-200"><div class="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 text-xs text-slate-400">${name}</div></div><span class="mt-1 block text-center text-xs font-medium text-slate-500 peer-checked:text-sky-700">${name}</span>`;
    themeGroup.appendChild(label);
  }
  return { themes: extraThemes, idevices: extraIdevices };
}

function downloadFile(filename, bytes) {
  const blob = new Blob([bytes], { type: 'application/zip' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function flashStatus(titleText, description) {
  let status = document.querySelector('.status');
  if (status) status.remove();
  status = statusTemplate.content.firstElementChild.cloneNode(true);
  status.querySelector('strong').textContent = titleText;
  status.querySelector('span').textContent = description;
  document.body.appendChild(status);
  window.setTimeout(() => status?.remove(), 5000);
}

function setWizardStep(step) {
  const nextStep = Math.max(0, Math.min(WIZARD_STEP_COUNT - 1, step));
  currentWizardStep = nextStep;

  for (const panel of wizardPanels) {
    const panelStep = Number.parseInt(panel.dataset.stepPanel, 10);
    panel.classList.toggle('hidden', panelStep !== nextStep);
  }

  for (const button of wizardStepButtons) {
    const buttonStep = Number.parseInt(button.dataset.stepNav, 10);
    if (buttonStep < nextStep) {
      button.dataset.state = 'completed';
    } else if (buttonStep === nextStep) {
      button.dataset.state = 'active';
    } else {
      button.dataset.state = '';
    }
    button.setAttribute('aria-current', buttonStep === nextStep ? 'step' : 'false');
  }

  for (let i = 0; i < stepLines.length; i++) {
    stepLines[i].dataset.state = i < nextStep ? 'completed' : '';
  }

  wizardPrev.disabled = nextStep === 0;
  const isLast = nextStep === WIZARD_STEP_COUNT - 1;
  wizardNext.classList.toggle('hidden', isLast);
  wizardLabel.textContent = `Paso ${nextStep + 1} de ${WIZARD_STEP_COUNT}`;
}
