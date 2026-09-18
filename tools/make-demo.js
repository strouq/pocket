// renderer/index.html -> demo/index.html (sahte masaüstü içinde çalışan otomatik demo)
// Çalıştır: node tools/make-demo.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const body = src.slice(src.indexOf('>', src.indexOf('<body')) + 1, src.lastIndexOf('</body>'))
  .replace('<script src="app.js"></script>', '');

const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Pocket — demo</title>
  <link rel="stylesheet" href="../renderer/style.css" />
  <link rel="stylesheet" href="demo.css" />
</head>
<body data-state="folded" data-tool="select">
  <div id="desktop">
    <div class="icons">
      <div style="--ic:#3b82f6">Documents</div>
      <div style="--ic:#f59e0b">Photos</div>
      <div style="--ic:#10b981">Music</div>
    </div>
    <div id="taskbar"><span class="start"></span><span></span><span></span><span></span><span class="clock">14:32</span></div>
  </div>

  <div id="win">
${body.trim()}
  </div>

  <div id="cursor">
    <svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2 L2 24 L8 18.5 L12 28 L16 26.3 L12 17 L20 17 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <span class="ripple"></span>
  </div>
  <div id="keys"><kbd>Ctrl</kbd><span class="plus">+</span><kbd>V</kbd></div>
  <div id="toast"><span class="ok">✓</span><span id="toast-text"></span></div>
  <div id="end"><div><h1>POCKET</h1><p id="end-text"></p><p style="margin-top:14px;color:#7c8cff">github.com/strouq/pocket</p></div></div>

  <script src="api-shim.js"></script>
  <script src="../renderer/app.js"></script>
  <script src="demo.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'demo', 'index.html'), html);
console.log('demo/index.html yazıldı');
