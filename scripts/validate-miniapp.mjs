import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const mini = path.join(root, 'miniprogram');
const failures = [];

function findAppleDoubleFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.name.startsWith('._')) return [target];
    return entry.isDirectory() ? findAppleDoubleFiles(target) : [];
  });
}

const appleDoubleFiles = findAppleDoubleFiles(mini);
if (appleDoubleFiles.length) {
  failures.push(`发现 ${appleDoubleFiles.length} 个 macOS AppleDouble 文件（._*），请运行 dot_clean miniprogram 后重试`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => !entry.name.startsWith('._')).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const files = walk(mini);
const appConfig = JSON.parse(fs.readFileSync(path.join(mini, 'app.json'), 'utf8'));

for (const page of appConfig.pages) {
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    const file = path.join(mini, `${page}.${extension}`);
    if (!fs.existsSync(file)) failures.push(`缺少页面文件: ${page}.${extension}`);
  }
}

for (const file of files.filter(file => file.endsWith('.json'))) {
  try { JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { failures.push(`${path.relative(root, file)} JSON 无效: ${error.message}`); }
}

const forbidden = /(?:api\.github\.com|gist|localStorage|sessionStorage|document\.|window\.|serviceWorker|Notification|indexedDB)/i;
for (const file of files.filter(file => /\.(?:js|json|wxml|wxss)$/.test(file))) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(forbidden);
  if (match) failures.push(`${path.relative(root, file)} 包含禁用平台依赖: ${match[0]}`);
}

for (const file of files.filter(file => file.endsWith('.wxml'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/^\s*<view\s+class="page \{\{themeClass\}\}/.test(source)) {
    failures.push(`${path.relative(root, file)} 根节点未应用全局主题类`);
  }
  if ((source.match(/\{\{/g) || []).length !== (source.match(/\}\}/g) || []).length) {
    failures.push(`${path.relative(root, file)} 数据绑定括号不平衡`);
  }
  if (/<\/?(?:div|span|strong|small|video)\b/i.test(source)) {
    failures.push(`${path.relative(root, file)} 使用了 HTML 标签`);
  }

  const pageSource = fs.readFileSync(file.replace(/\.wxml$/, '.js'), 'utf8');
  const handlers = [...source.matchAll(/(?:bind|catch)[a-z-]+="([A-Za-z_$][\w$]*)"/g)].map(match => match[1]);
  for (const handler of new Set(handlers)) {
    if (!new RegExp(`(?:^|[,\\s])${handler}\\s*\\(`, 'm').test(pageSource)) {
      failures.push(`${path.relative(root, file)} 引用了不存在的事件函数: ${handler}`);
    }
  }

  const xml = `<root xmlns:wx="urn:wx">${source
    .replace(/\b(wx:else|scroll-x|scroll-y)(?=\s|>)/g, '$1="true"')
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')}</root>`;
  const result = spawnSync('xmllint', ['--noout', '-'], { input: xml, encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${path.relative(root, file)} 标签结构无效: ${result.stderr.trim().split('\n').at(-1)}`);
}

const appStyles = fs.readFileSync(path.join(mini, 'app.wxss'), 'utf8');
for (const variable of ['--bg-primary','--bg-secondary','--bg-tertiary','--bg-sidebar','--text-primary','--text-secondary','--text-tertiary','--separator','--accent']) {
  if (!appStyles.includes(variable)) failures.push(`app.wxss 缺少主题变量: ${variable}`);
}

for (const file of files.filter(file => /pages\/.+\.(?:js|wxml|wxss)$/.test(file))) {
  const source = fs.readFileSync(file, 'utf8');
  if (/(?:#[0-9a-f]{3,8}|rgba?\()/i.test(source)) {
    failures.push(`${path.relative(root, file)} 包含页面级硬编码颜色，请改用全局主题变量或 theme.palette()`);
  }
}

for (const required of ['assets/rest-finished.wav', 'utils/foods.js', 'utils/workout-core.js', 'utils/data-io.js', 'utils/health.js']) {
  if (!fs.existsSync(path.join(mini, required))) failures.push(`缺少资源: ${required}`);
}

const packageBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
if (packageBytes > 2 * 1024 * 1024) failures.push(`主包实际大小 ${(packageBytes / 1024 / 1024).toFixed(2)}MB，超过 2MB`);

if (failures.length) {
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}
console.log(`Mini Program validation passed: ${appConfig.pages.length} pages, ${(packageBytes / 1024).toFixed(1)}KB`);
