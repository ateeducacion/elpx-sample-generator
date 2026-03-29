import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.cache', 'exelearning-src');
const assetsDir = path.join(rootDir, 'assets', 'exelearning');
const repoUrl = 'https://github.com/exelearning/exelearning';
const branch = 'main';
const command = process.argv[2] || 'all';
const localRepoCandidates = [
  process.env.EXELEARNING_REPO_PATH,
  '/Users/ernesto/Downloads/exelearning',
  path.join(rootDir, '..', 'exelearning'),
].filter(Boolean);

let sourceRoot = cacheDir;

async function run(cmd, args, cwd = rootDir) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureSourceRepo() {
  for (const candidate of localRepoCandidates) {
    if (await pathExists(path.join(candidate, 'public', 'files', 'perm', 'themes', 'base'))) {
      sourceRoot = candidate;
      return;
    }
  }

  if (await pathExists(path.join(cacheDir, '.git'))) {
    await run('git', ['-C', cacheDir, 'fetch', 'origin', branch, '--depth', '1']);
    await run('git', ['-C', cacheDir, 'checkout', '-f', 'FETCH_HEAD']);
    sourceRoot = cacheDir;
    return;
  }

  await mkdir(path.dirname(cacheDir), { recursive: true });
  await run('git', [
    'clone',
    '--depth',
    '1',
    '--filter=blob:none',
    '--sparse',
    '--branch',
    branch,
    repoUrl,
    cacheDir,
  ]);
  await run('git', [
    '-C',
    cacheDir,
    'sparse-checkout',
    'set',
    'public/files/perm/themes/base',
    'public/files/perm/idevices/base',
    'public/app/schemas/ode',
  ]);
  sourceRoot = cacheDir;
}

async function copyTree(source, destination) {
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

async function listDirectories(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name.toLowerCase())
    .sort();
}

async function walkFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath, baseDir));
      continue;
    }
    files.push(relativePath);
  }
  return files.sort();
}

async function syncThemes() {
  const source = path.join(sourceRoot, 'public/files/perm/themes/base');
  const destination = path.join(assetsDir, 'public/files/perm/themes/base');
  await copyTree(source, destination);
  return listDirectories(source);
}

async function syncIdevices() {
  const source = path.join(sourceRoot, 'public/files/perm/idevices/base');
  const destination = path.join(assetsDir, 'public/files/perm/idevices/base');
  await copyTree(source, destination);
  return listDirectories(source);
}

async function syncDtd() {
  const source = path.join(sourceRoot, 'public/app/schemas/ode/content.dtd');
  const destination = path.join(assetsDir, 'public/app/schemas/ode/content.dtd');
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

async function writeManifest(data) {
  await mkdir(assetsDir, { recursive: true });
  await writeFile(
    path.join(assetsDir, 'manifest.json'),
    `${JSON.stringify(
      {
        source: repoUrl,
        branch,
        syncedAt: new Date().toISOString(),
        ...data,
      },
      null,
      2,
    )}\n`,
  );
}

async function writeCatalog() {
  const themesRoot = path.join(assetsDir, 'public/files/perm/themes/base');
  const idevicesRoot = path.join(assetsDir, 'public/files/perm/idevices/base');
  const catalog = {
    themes: await listDirectories(themesRoot),
    idevices: await listDirectories(idevicesRoot),
    themeFiles: await walkFiles(themesRoot),
    ideviceFiles: await walkFiles(idevicesRoot),
    dtd: 'public/app/schemas/ode/content.dtd',
  };
  await writeFile(path.join(assetsDir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
}

async function readExistingManifest() {
  const manifestPath = path.join(assetsDir, 'manifest.json');
  if (!(await pathExists(manifestPath))) return {};
  try {
    const text = await readFile(manifestPath, 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function main() {
  await ensureSourceRepo();
  const existingManifest = await readExistingManifest();

  const manifest = {};
  if (command === 'themes' || command === 'all') {
    manifest.themes = await syncThemes();
  }
  if (command === 'idevices' || command === 'all') {
    manifest.idevices = await syncIdevices();
  }
  if (command === 'dtd' || command === 'all') {
    await syncDtd();
  }

  if (command === 'all') {
    if (!manifest.themes) manifest.themes = await listDirectories(path.join(sourceRoot, 'public/files/perm/themes/base'));
    if (!manifest.idevices) manifest.idevices = await listDirectories(path.join(sourceRoot, 'public/files/perm/idevices/base'));
    await syncDtd();
  }

  const syncedAt = new Date().toISOString();
  const finalManifest = {
    source: repoUrl,
    branch,
    syncedAt,
    themes: manifest.themes || existingManifest.themes || [],
    idevices: manifest.idevices || existingManifest.idevices || [],
    dtd: 'public/app/schemas/ode/content.dtd',
  };
  await writeManifest(finalManifest);
  await writeCatalog();
  console.log(`Synced eXeLearning assets to ${assetsDir}`);
}

await main();
