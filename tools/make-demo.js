// renderer/index.html -> demo/index.html (sahte masaüstü içinde çalışan otomatik demo)
// Çalıştır: node tools/make-demo.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const body = src.slice(src.indexOf('>', src.indexOf('<body')) + 1, src.lastIndexOf('</body>'))
  .replace('<script src="app.js"></script>', '');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Pocket — demo</title>
  <link rel="stylesheet" href="../renderer/style.css" />
  <link rel="stylesheet" href="demo.css" />
</head>
<body data-state="folded" data-tool="select">
  <div id="desktop">
    <div class="icons">
      <div>Documents</div>
      <div>Photos</div>
      <div>Music</div>
      <div class="file" id="exported"></div>
    </div>
    <div id="taskbar"><span class="start"></span><span></span><span></span><span></span><span class="clock">14:32</span></div>
  </div>

  <!-- sahte tarayıcı -->
  <div id="browser">
    <div class="tabs"><span class="tab active"><i></i>Inbox — Mail</span><span class="tab"><i></i>Q3 Report</span><span class="tab"><i></i>Calendar</span></div>
    <div class="addr"><span class="nav">‹ › ↻</span><span class="url">mail.example.com/inbox</span></div>
    <div class="page">
      <aside><div class="logo"></div><div class="nav-item active">Inbox <b>12</b></div><div class="nav-item">Starred</div><div class="nav-item">Sent</div><div class="nav-item">Drafts</div><div class="nav-item">Archive</div></aside>
      <main>
        <div class="row unread"><span class="from">Client — Northwind</span><span class="subj">Re: Proposal v2 — can we close by Friday?</span><span class="time">09:41</span></div>
        <div class="row"><span class="from">Finance</span><span class="subj">Q3 report draft attached</span><span class="time">09:12</span></div>
        <div class="row"><span class="from">Design</span><span class="subj">Landing page — final review</span><span class="time">Yesterday</span></div>
        <div class="row"><span class="from">HR</span><span class="subj">Team sync moved to 15:00</span><span class="time">Yesterday</span></div>
        <div class="row"><span class="from">Product</span><span class="subj">Roadmap notes</span><span class="time">Mon</span></div>
        <div class="row"><span class="from">Ops</span><span class="subj">Weekly metrics</span><span class="time">Mon</span></div>
      </main>
    </div>
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
  <div id="viewer">
    <div class="vbar"><span class="app"></span><span class="vtitle"></span><button class="vclose">×</button></div>
    <div class="vbody"><div class="frame"></div></div>
  </div>
  <div id="end"><div class="logo"><img src="../build/icon.png" alt="" /><span>Pocket</span></div></div>

  <script src="api-shim.js"></script>
  <script src="../renderer/app.js"></script>
  <script src="demo.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'demo', 'index.html'), html);
console.log('demo/index.html yazıldı');
