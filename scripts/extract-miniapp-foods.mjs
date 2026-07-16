import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = await readFile(path.join(root, 'index.html'), 'utf8');
const match = source.match(/const BUILTIN_FOODS = (\[[\s\S]*?\n\]);/);
if (!match) throw new Error('BUILTIN_FOODS was not found in index.html');

const output = `'use strict';\n\nconst BUILTIN_FOODS = ${match[1]}\n\nmodule.exports = Object.freeze(BUILTIN_FOODS);\n`;
await writeFile(path.join(root, 'miniprogram/utils/foods.js'), output, 'utf8');
console.log(`Generated ${output.match(/source:'builtin'/g)?.length || 0} built-in foods`);
