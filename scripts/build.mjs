import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(rootDir, 'assets');

async function run(cmd, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: rootDir, stdio: 'inherit' });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const indexHtml = await readFile(path.join(rootDir, 'index.html'), 'utf8');
await writeFile(
  path.join(distDir, 'index.html'),
  indexHtml.replace('./src/main.js', './app.js'),
);
await cp(path.join(rootDir, 'src'), path.join(distDir, 'src'), { recursive: true });
await run('bun', ['build', './src/main.js', '--target=browser', '--outfile=dist/app.js']);

try {
  await cp(assetsDir, path.join(distDir, 'assets'), { recursive: true });
} catch {
  // The app still works without synced upstream assets.
}

await writeFile(path.join(distDir, '.nojekyll'), '');
await writeFile(
  path.join(distDir, 'build-info.json'),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      source: 'elpx-sample-generator',
    },
    null,
    2,
  ),
);

console.log(`Built static site at ${distDir}`);
