import { createServer } from 'node:http';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function hasDistBuild() {
  try {
    await access(path.join(distDir, 'index.html'));
    await access(path.join(distDir, 'app.js'));
    return true;
  } catch {
    return false;
  }
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let relPath = decodeURIComponent(url.pathname);
  if (relPath === '/') relPath = '/index.html';

  const serveFromDist = await hasDistBuild();
  const baseDir = serveFromDist ? distDir : rootDir;
  const filePath = path.join(baseDir, relPath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      throw new Error('directory');
    }

    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mimeTypes.get(ext) || 'application/octet-stream');
    res.end(data);
  } catch {
    const fallback = await readFile(path.join(rootDir, 'index.html'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fallback);
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port}`);
});
