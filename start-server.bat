@echo off
title 🥗 营养追踪服务器
echo ====================================
echo   🥗 营养追踪 — 服务器启动中...
echo ====================================
echo.

:: 进入项目目录
cd /d %~dp0

:: 启动 Node.js 服务器（保持窗口打开）
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = {
  '.html':'text/html;charset=utf-8',
  '.js':'application/javascript',
  '.json':'application/json',
  '.css':'text/css',
  '.svg':'image/svg+xml',
  '.png':'image/png',
};
http.createServer((req, res) => {
  let fp = '.' + (req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(fp);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, {'Content-Type': mime[ext] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8080, '0.0.0.0', () => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let ip = 'localhost';
  Object.keys(ifaces).forEach(k => {
    ifaces[k].forEach(v => { if (v.family==='IPv4' && !v.internal) ip = v.address; });
  });
  console.log('');
  console.log('  ✅ 服务器启动成功！');
  console.log('  ─────────────────────────────');
  console.log('  📱 iPhone 访问: http://' + ip + ':8080');
  console.log('  💻 本机访问:    http://localhost:8080');
  console.log('  ─────────────────────────────');
  console.log('  ⚠️  关掉此窗口 = 关闭服务器');
  console.log('  📌 电脑不能关机和休眠');
  console.log('  🌐 手机和电脑必须在同一 WiFi');
  console.log('');
});
"
pause
