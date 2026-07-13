import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'www');
const assets = [
  'index.html',
  'manifest.json',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'qrcode.html',
  'qrcode.png',
  'native-app.js',
  'workout-core.js',
  'workout.js',
  'workout.css',
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(assets.map(asset => cp(resolve(root, asset), resolve(output, asset))));
console.log(`Built ${assets.length} web assets into ${output}`);
