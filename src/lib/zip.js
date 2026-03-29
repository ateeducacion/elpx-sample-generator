import { zipSync, strToU8 } from 'fflate';

function toBytes(content) {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return strToU8(String(content ?? ''));
}

function normalizeName(name) {
  return String(name).replace(/\\/g, '/');
}

export function createZip(entries) {
  const files = {};
  for (const entry of entries) {
    files[normalizeName(entry.name)] = toBytes(entry.data);
  }
  return zipSync(files, { level: 0 });
}
