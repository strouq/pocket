const HOLD_MS = 500;
const SHAPES = ['line', 'arrow', 'rect', 'ellipse'];
const INK_TOOLS = ['pen', 'eraser', ...SHAPES];

const body     = document.body;
const corner   = document.getElementById('corner');
const pocket   = document.getElementById('pocket');
const grip     = document.getElementById('grip');
const badge    = document.getElementById('size-badge');
const paper    = document.getElementById('paper');
const blocksEl = document.getElementById('blocks');
const canvas   = document.getElementById('ink');
const ctx      = canvas.getContext('2d');
const hint     = document.getElementById('hint');
const savedEl  = document.getElementById('saved');
const tabsEl   = document.getElementById('page-tabs');
const shapePop = document.getElementById('shape-pop');
const shapeBtn = document.getElementById('shape-btn');

let doc = null;            // { v, pages:[{id,name,items}], current, size }
let tool = 'select';
let lastShape = 'line';
let color = 'ink';
let selectedId = null;
let lastPointer = { x: 40, y: 40 }; // yapıştırılan görselin düşeceği yer

// ==================================================================
// Dil
// ==================================================================
const I18N = {
  tr: {
    corner: 'Yarım saniye basılı tut ve çek', 'tool.select': 'Seç / Taşı (V)', 'tool.text': 'Yazı (T) — boş yere tıkla',
    'tool.check': 'Checklist (C) — boş yere tıkla', 'tool.pen': 'Kalem (P)', 'tool.eraser': 'Silgi (E) — çizgiyi/şekli siler',
    'tool.shapes': 'Şekiller', 'tool.line': 'Çizgi (L)', 'tool.arrow': 'Ok (A)', 'tool.rect': 'Dikdörtgen (R)', 'tool.ellipse': 'Elips (O)',
    export: 'Sayfayı PNG olarak dışa aktar', fold: 'Köşeye katla (Esc)', quit: 'Kapat', 'page.add': 'Yeni sayfa', grip: 'Boyutu değiştir',
    hint: 'Yazı için çift tıkla · Ctrl+V ile görsel yapıştır', saved: 'kaydedildi', 'page.delete': 'Sayfayı sil', 'page.confirm': 'Sil?',
    'ph.text': 'Yaz…', 'ph.check': 'Yapılacak…', delete: 'Sil', 'export.name': 'pocket-sayfa', 'export.title': 'PNG olarak dışa aktar',
    'menu.lang': 'Dil', 'menu.theme': 'Tema', 'theme.paper': 'Kağıt', 'theme.light': 'Beyaz',
  },
  en: {
    corner: 'Hold half a second and pull', 'tool.select': 'Select / Move (V)', 'tool.text': 'Text (T) — click empty space',
    'tool.check': 'Checklist (C) — click empty space', 'tool.pen': 'Pen (P)', 'tool.eraser': 'Eraser (E) — removes a stroke/shape',
    'tool.shapes': 'Shapes', 'tool.line': 'Line (L)', 'tool.arrow': 'Arrow (A)', 'tool.rect': 'Rectangle (R)', 'tool.ellipse': 'Ellipse (O)',
    export: 'Export page as PNG', fold: 'Fold to corner (Esc)', quit: 'Quit', 'page.add': 'New page', grip: 'Resize',
    hint: 'Double-click to write · Ctrl+V to paste an image', saved: 'saved', 'page.delete': 'Delete page', 'page.confirm': 'Delete?',
    'ph.text': 'Write…', 'ph.check': 'To do…', delete: 'Delete', 'export.name': 'pocket-page', 'export.title': 'Export as PNG',
    'menu.lang': 'Language', 'menu.theme': 'Theme', 'theme.paper': 'Paper', 'theme.light': 'Light',
  },
};
let lang = 'tr';
const t = (k) => I18N[lang][k] ?? I18N.tr[k] ?? k;
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('.block.text .editable').forEach(el => { el.dataset.placeholder = t('ph.text'); });
  document.querySelectorAll('.ct').forEach(el => { el.dataset.placeholder = t('ph.check'); });
  document.querySelectorAll('.del').forEach(el => { el.title = t('delete'); });
  langPop.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  if (doc) renderTabs();
}
const langPop = document.getElementById('lang-pop');
const brandBtn = document.getElementById('brand');
brandBtn.addEventListener('click', () => {
  const open = langPop.classList.toggle('open');
  brandBtn.classList.toggle('open', open);
});
langPop.querySelectorAll('button[data-lang]').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  doc.lang = lang;
  closeBrandMenu();
  applyLang();
  scheduleSave();
}));
function closeBrandMenu() { langPop.classList.remove('open'); brandBtn.classList.remove('open'); }

// ==================================================================
// Tema
// ==================================================================
const THEMES = ['modern', 'venom', 'light', 'paper', 'neon'];
const cssVar = (n) => getComputedStyle(body).getPropertyValue(n).trim();
let theme = 'modern';

function applyTheme(t, { animate = false } = {}) {
  theme = THEMES.includes(t) ? t : 'modern';
  body.dataset.theme = theme;
  langPop.querySelectorAll('button[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  window.api.setMargin(parseInt(cssVar('--fx-margin')) || 0);
  if (theme === 'venom') buildBlobs();
  if (animate) playReveal();
  redraw();
}
langPop.querySelectorAll('button[data-theme]').forEach(b => b.addEventListener('click', () => {
  doc.theme = b.dataset.theme;
  closeBrandMenu();
  applyTheme(doc.theme, { animate: true });
  scheduleSave();
}));

// Venom: kenarlardan taşan damlalar (bir kez üretilir)
const fx = document.getElementById('fx');
function buildBlobs() {
  const goo = fx.querySelector('.goo');
  if (goo.querySelector('.blob')) return;
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('span');
    const side = i % 2 ? 'r' : 'b';
    b.className = 'blob ' + side;
    b.style.setProperty('--s', rnd(18, 44).toFixed(0) + 'px');
    b.style.setProperty('--p', rnd(8, 92).toFixed(0) + '%');
    b.style.setProperty('--d', rnd(3.5, 7).toFixed(1) + 's');
    b.style.setProperty('--delay', (-rnd(0, 6)).toFixed(1) + 's');
    b.style.setProperty('--tx', (side === 'r' ? rnd(10, 30) : rnd(-8, 8)).toFixed(0) + 'px');
    b.style.setProperty('--ty', (side === 'b' ? rnd(10, 34) : rnd(-8, 8)).toFixed(0) + 'px');
    goo.appendChild(b);
  }
}
function playReveal() {
  for (const el of [pocket, fx]) {
    el.classList.remove('reveal');
    void el.offsetWidth; // animasyonu yeniden tetikle
    el.classList.add('reveal');
    el.addEventListener('animationend', () => el.classList.remove('reveal'), { once: true });
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);
const page = () => doc.pages[doc.current];
const items = () => page().items;
const byId = (id) => items().find(i => i.id === id);
const elOf = (id) => blocksEl.querySelector(`.block[data-id="${id}"]`);

// ==================================================================
// Köşe: 1 sn basılı tut -> sürükleme başlar
// ==================================================================
let holdTimer = null;
let holdFired = false;
let releasedEarly = false; // pencere büyümeden önce bırakıldıysa

corner.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  holdFired = false;
  releasedEarly = false;
  corner.classList.add('holding');
  holdTimer = setTimeout(() => {
    holdFired = true;
    corner.classList.remove('holding');
    window.api.beginDrag();
  }, HOLD_MS);
});
function cancelHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
  corner.classList.remove('holding');
}
corner.addEventListener('mouseup', () => {
  if (holdFired) { releasedEarly = true; return; }
  cancelHold();
});
corner.addEventListener('mouseleave', () => { if (!holdFired) cancelHold(); });

// ==================================================================
// Sürükleme (ilk açılış + sağ alt tutamaçtan yeniden boyutlandırma)
// ==================================================================
let dragW = 0, dragH = 0;

function applyDragSize(x, y) {
  dragW = Math.max(0, Math.round(x + 6));
  dragH = Math.max(0, Math.round(y + 6));
  pocket.style.width  = dragW + 'px';
  pocket.style.height = dragH + 'px';
  badge.textContent = dragW + ' x ' + dragH;
}
function onDragMove(e) { applyDragSize(e.clientX, e.clientY); }
function onDragUp(e)   { applyDragSize(e.clientX, e.clientY); finishDrag(); }
function finishDrag() {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragUp);
  window.api.endDrag(dragW, dragH);
}

grip.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  releasedEarly = false;
  holdFired = true;
  window.api.beginDrag();
});

window.api.onState((s) => {
  body.dataset.state = s;
  corner.classList.remove('holding');

  if (s === 'dragging') {
    if (releasedEarly) { applyDragSize(0, 0); finishDrag(); return; }
    pocket.style.width  = '0px';
    pocket.style.height = '0px';
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragUp);
  } else {
    pocket.style.width  = '';   // CSS: 100% - efekt payı
    pocket.style.height = '';
    if (s === 'open') { resizeCanvas(); focusLastBlock(); if (theme === 'venom') playReveal(); }
  }
});

document.getElementById('fold').addEventListener('click', () => window.api.fold());
document.getElementById('quit').addEventListener('click', () => window.api.quit());

// ==================================================================
// Araçlar
// ==================================================================
function setTool(t) {
  tool = t;
  body.dataset.tool = t;
  document.querySelectorAll('.tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  shapePop.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  const isShape = SHAPES.includes(t);
  shapeBtn.classList.toggle('active', isShape);
  if (isShape) {
    lastShape = t;
    shapeBtn.querySelector('svg').replaceWith(shapePop.querySelector(`[data-tool="${t}"] svg`).cloneNode(true));
  }
  shapePop.classList.remove('open');
  if (INK_TOOLS.includes(t)) { select(null); document.activeElement?.blur?.(); }
}
document.querySelectorAll('.tool[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
shapePop.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
shapeBtn.addEventListener('click', () => {
  if (SHAPES.includes(tool)) shapePop.classList.toggle('open');
  else { setTool(lastShape); }
});
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.shape-wrap')) shapePop.classList.remove('open');
  if (!e.target.closest('.brand-wrap')) { langPop.classList.remove('open'); brandBtn.classList.remove('open'); }
});

document.querySelectorAll('.swatch').forEach(b => b.addEventListener('click', () => {
  color = b.dataset.color;
  document.querySelectorAll('.swatch').forEach(x => x.classList.toggle('active', x === b));
  if (tool === 'eraser') setTool('pen');
}));

// ==================================================================
// Klavye
// ==================================================================
const isTyping = () => document.activeElement?.isContentEditable;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isTyping()) { document.activeElement.blur(); return; }
    if (selectedId) { select(null); return; }
    window.api.fold(); return;
  }
  const mod = e.ctrlKey || e.metaKey;

  if (mod && e.key.toLowerCase() === 'z' && !isTyping()) {
    e.preventDefault(); undoInk(); return;
  }
  if (isTyping()) return;

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
    e.preventDefault(); removeItem(selectedId); return;
  }
  if (mod) return;
  const k = e.key.toLowerCase();
  const map = { v: 'select', t: 'text', c: 'check', p: 'pen', e: 'eraser', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse' };
  if (map[k]) setTool(map[k]);
});

// ==================================================================
// Bloklar (yazı / checklist / görsel)
// ==================================================================
// Sayfa koordinatı (kaydırma dahil). Öğeler "dünya" koordinatında saklanır.
const view = () => (page().view ||= { x: 0, y: 0 });
function paperPoint(e) {
  const r = paper.getBoundingClientRect();
  const v = view();
  return { x: e.clientX - r.left - v.x, y: e.clientY - r.top - v.y };
}
paper.addEventListener('pointermove', (e) => { lastPointer = paperPoint(e); });

// --- Serbest kaydırma: tekerlek (Shift = yatay), orta tuş sürükle ---
function applyView() {
  const v = view();
  blocksEl.style.transform = `translate(${v.x}px, ${v.y}px)`;
  paper.style.backgroundPosition = `${v.x}px ${v.y}px`;
  redraw();
}
paper.addEventListener('wheel', (e) => {
  e.preventDefault();
  const v = view();
  if (e.shiftKey) v.x -= e.deltaY;
  else { v.x -= e.deltaX; v.y -= e.deltaY; }
  applyView();
  scheduleSave();
}, { passive: false });
paper.addEventListener('pointerdown', (e) => {
  if (e.button !== 1) return;
  e.preventDefault();
  const v = view(), sx = e.clientX - v.x, sy = e.clientY - v.y;
  paper.setPointerCapture(e.pointerId);
  paper.classList.add('panning');
  const move = (ev) => { v.x = ev.clientX - sx; v.y = ev.clientY - sy; applyView(); };
  const up = () => { paper.removeEventListener('pointermove', move); paper.removeEventListener('pointerup', up); paper.classList.remove('panning'); scheduleSave(); };
  paper.addEventListener('pointermove', move);
  paper.addEventListener('pointerup', up);
});

function renderPage() {
  blocksEl.innerHTML = '';
  for (const it of items()) if (['text', 'check', 'image'].includes(it.type)) blocksEl.appendChild(buildBlock(it));
  select(null);
  applyView();
  renderTabs();
  updateHint();
}
function updateHint() { hint.classList.toggle('hidden', items().length > 0); }

function buildBlock(it) {
  const el = document.createElement('div');
  el.className = `block ${it.type}`;
  el.dataset.id = it.id;
  el.style.left = it.x + 'px';
  el.style.top = it.y + 'px';
  if (it.w) el.style.width = it.w + 'px';

  if (it.type === 'text') {
    const ed = document.createElement('div');
    ed.className = 'editable body';
    ed.contentEditable = 'true';
    ed.spellcheck = false;
    ed.dataset.placeholder = t('ph.text');
    ed.innerHTML = it.html || '';
    ed.addEventListener('input', () => { it.html = ed.innerHTML; scheduleSave(); });
    ed.addEventListener('paste', plainPaste);
    ed.addEventListener('blur', () => { if (!ed.textContent.trim()) removeItem(it.id); });
    el.appendChild(ed);
  }
  if (it.type === 'check') {
    const b = document.createElement('div');
    b.className = 'body';
    el.appendChild(b);
    if (!it.items?.length) it.items = [{ text: '', done: false }];
    it.items.forEach((ci) => b.appendChild(buildCheckItem(it, ci)));
  }
  if (it.type === 'image') {
    const img = document.createElement('img');
    img.src = it.src;
    img.draggable = false;
    el.appendChild(img);
  }
  const rz = document.createElement('div');
  rz.className = 'rz';
  el.appendChild(rz);

  const del = document.createElement('button');
  del.className = 'del';
  del.title = t('delete');
  del.textContent = '×';
  del.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
  del.addEventListener('click', () => removeItem(it.id));
  el.appendChild(del);
  return el;
}

function buildCheckItem(block, ci) {
  const row = document.createElement('div');
  row.className = 'ci' + (ci.done ? ' done' : '');
  const cb = document.createElement('button');
  cb.className = 'cb';
  cb.innerHTML = '<svg viewBox="0 0 10 10"><path d="M2 5l2.2 2.2L8 3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  cb.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
  cb.addEventListener('click', () => { ci.done = !ci.done; row.classList.toggle('done', ci.done); scheduleSave(); });
  const ct = document.createElement('div');
  ct.className = 'editable ct';
  ct.contentEditable = 'true';
  ct.spellcheck = false;
  ct.dataset.placeholder = t('ph.check');
  ct.textContent = ci.text || '';
  ct.addEventListener('input', () => { ci.text = ct.textContent; scheduleSave(); });
  ct.addEventListener('keydown', (e) => {
    const idx = block.items.indexOf(ci);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { cb.click(); return; }
      const n = { text: '', done: false };
      block.items.splice(idx + 1, 0, n);
      const nrow = buildCheckItem(block, n);
      row.after(nrow);
      nrow.querySelector('.ct').focus();
      scheduleSave();
    } else if (e.key === 'Backspace' && !ct.textContent) {
      e.preventDefault();
      if (block.items.length === 1) { removeItem(block.id); return; }
      block.items.splice(idx, 1);
      const prev = row.previousElementSibling || row.nextElementSibling;
      row.remove();
      focusEnd(prev.querySelector('.ct'));
      scheduleSave();
    } else if (e.key === 'ArrowUp' && row.previousElementSibling) {
      e.preventDefault(); focusEnd(row.previousElementSibling.querySelector('.ct'));
    } else if (e.key === 'ArrowDown' && row.nextElementSibling) {
      e.preventDefault(); focusEnd(row.nextElementSibling.querySelector('.ct'));
    }
  });
  ct.addEventListener('paste', plainPaste);
  row.append(cb, ct);
  return row;
}

function plainPaste(e) {
  if (e.clipboardData.files?.length) return; // görsel: global paste halleder
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
}

function focusEnd(el) {
  if (!el) return;
  el.focus();
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function focusLastBlock() {
  const eds = blocksEl.querySelectorAll('.editable');
  if (eds.length && !INK_TOOLS.includes(tool)) focusEnd(eds[eds.length - 1]);
}

function addItem(it) {
  items().push(it);
  if (['text', 'check', 'image'].includes(it.type)) blocksEl.appendChild(buildBlock(it));
  updateHint();
  scheduleSave();
  return it;
}
function removeItem(id) {
  const i = items().findIndex(x => x.id === id);
  if (i < 0) return;
  items().splice(i, 1);
  elOf(id)?.remove();
  if (selectedId === id) select(null);
  updateHint();
  redraw();
  scheduleSave();
}
function select(id) {
  selectedId = id;
  blocksEl.querySelectorAll('.block').forEach(b => b.classList.toggle('selected', b.dataset.id === id));
  redraw(); // çizgi/şekil seçimi canvas'ta çizilir
}

// Blok koyulunca araç otomatik Seç'e döner; blok yazma modunda kalır
function placeBlock(it, focusSel) {
  addItem(it);
  setTool('select');
  select(it.id);
  const el = elOf(it.id);
  el.classList.add('editing');
  el.querySelector(focusSel).focus();
}
function newTextAt(p) {
  placeBlock({ id: uid(), type: 'text', x: Math.round(p.x - 8), y: Math.round(p.y - 14), w: 260, html: '' }, '.editable');
}
function newCheckAt(p) {
  placeBlock({ id: uid(), type: 'check', x: Math.round(p.x - 8), y: Math.round(p.y - 12), w: 280, items: [{ text: '', done: false }] }, '.ct');
}

// Boş yere: çift tık -> yazı; text/check aracıyla tek tık -> ilgili blok
paper.addEventListener('dblclick', (e) => {
  if (e.target.closest('.block') || INK_TOOLS.includes(tool)) return;
  newTextAt(paperPoint(e));
});
paper.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const blk = e.target.closest('.block');
  if (!blk) {
    if (tool === 'select' && inkPointerDown(e)) return;
    select(null);
    if (tool === 'text')  { e.preventDefault(); newTextAt(paperPoint(e)); }
    if (tool === 'check') { e.preventDefault(); newCheckAt(paperPoint(e)); }
    return;
  }
  const it = byId(blk.dataset.id);
  if (e.target.classList.contains('rz')) { startResize(e, it, blk); return; }
  if (tool !== 'select') return;
  // Düzenlenen bloğun yazısına tıklama: imleç yerleştirme tarayıcıya kalsın
  if (blk.classList.contains('editing') && e.target.closest('.editable')) return;
  select(it.id);
  startMove(e, it, blk);
});

// Tık (sürüklemeden) -> tıklanan yerden yazmaya başla
function startEditing(blk, x, y) {
  blk.classList.add('editing');
  const range = document.caretRangeFromPoint(x, y);
  const ed = range?.startContainer?.parentElement?.closest('.editable') || blk.querySelector('.editable');
  if (!ed) return;
  ed.focus();
  if (range && ed.contains(range.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); }
  else focusEnd(ed);
}
blocksEl.addEventListener('focusout', (e) => {
  const blk = e.target.closest?.('.block');
  if (blk && !blk.contains(e.relatedTarget)) blk.classList.remove('editing');
});

function startMove(e, it, blk) {
  e.preventDefault();
  const start = paperPoint(e);
  const ox = it.x, oy = it.y;
  let moved = false;
  blk.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const p = paperPoint(ev);
    if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 4) return;
    moved = true;
    blk.classList.add('dragging');
    it.x = Math.round(ox + p.x - start.x);
    it.y = Math.round(oy + p.y - start.y);
    blk.style.left = it.x + 'px'; blk.style.top = it.y + 'px';
  };
  const up = (ev) => {
    blk.removeEventListener('pointermove', move); blk.removeEventListener('pointerup', up);
    blk.classList.remove('dragging');
    if (moved) scheduleSave();
    else if (it.type !== 'image') startEditing(blk, ev.clientX, ev.clientY);
  };
  blk.addEventListener('pointermove', move);
  blk.addEventListener('pointerup', up);
}
function startResize(e, it, blk) {
  e.preventDefault(); e.stopPropagation();
  const start = paperPoint(e);
  const ow = blk.offsetWidth;
  const rz = e.target;
  rz.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const p = paperPoint(ev);
    it.w = Math.max(60, Math.round(ow + p.x - start.x));
    blk.style.width = it.w + 'px';
  };
  const up = () => { rz.removeEventListener('pointermove', move); rz.removeEventListener('pointerup', up); scheduleSave(); };
  rz.addEventListener('pointermove', move);
  rz.addEventListener('pointerup', up);
}

// --- Görsel yapıştırma / bırakma ---
async function addImageFromFile(file, at) {
  const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  const src = await window.api.saveImage(dataUrl);
  if (!src) return;
  const nat = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = dataUrl; });
  const maxW = Math.max(120, Math.round(paper.clientWidth * 0.6));
  const w = Math.min(nat.width, maxW);
  const p = at || lastPointer;
  const it = addItem({ id: uid(), type: 'image', x: Math.max(0, Math.round(p.x - w / 2)), y: Math.max(0, Math.round(p.y - 20)), w, src });
  setTool('select');
  select(it.id);
}
document.addEventListener('paste', (e) => {
  if (body.dataset.state !== 'open') return;
  const f = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/'));
  if (!f) return;
  e.preventDefault();
  addImageFromFile(f);
});
paper.addEventListener('dragover', (e) => e.preventDefault());
paper.addEventListener('drop', (e) => {
  e.preventDefault();
  const at = paperPoint(e);
  for (const f of e.dataTransfer.files) if (f.type.startsWith('image/')) addImageFromFile(f, at);
});

// ==================================================================
// Mürekkep: çizgiler + şekiller (canvas, her şeyin üstünde)
// ==================================================================
const dpr = () => window.devicePixelRatio || 1;
let drawing = null;   // aktif kalem çizgisi
let shaping = null;   // aktif şekil taslağı

function resizeCanvas() {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  canvas.width  = Math.round(r.width * dpr());
  canvas.height = Math.round(r.height * dpr());
  redraw();
}
new ResizeObserver(resizeCanvas).observe(canvas);

const resolveColor = (c) => (c === 'ink' || c === '#e8ebf5') ? cssVar('--text') : c;
function setStyle(c, w) {
  c = resolveColor(c);
  ctx.strokeStyle = c; ctx.fillStyle = c;
  ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}
function drawStroke(s) {
  setStyle(s.color, s.width);
  if (s.pts.length < 2) {
    ctx.beginPath(); ctx.arc(s.pts[0][0], s.pts[0][1], s.width / 2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(s.pts[0][0], s.pts[0][1]);
  for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]);
  ctx.stroke();
}
function drawShape(s) {
  setStyle(s.color, s.width);
  const { x1, y1, x2, y2 } = s;
  ctx.beginPath();
  if (s.kind === 'line' || s.kind === 'arrow') {
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (s.kind === 'arrow') {
      const a = Math.atan2(y2 - y1, x2 - x1), L = 12;
      ctx.beginPath();
      ctx.moveTo(x2, y2); ctx.lineTo(x2 - L * Math.cos(a - 0.5), y2 - L * Math.sin(a - 0.5));
      ctx.moveTo(x2, y2); ctx.lineTo(x2 - L * Math.cos(a + 0.5), y2 - L * Math.sin(a + 0.5));
      ctx.stroke();
    }
  } else if (s.kind === 'rect') {
    ctx.roundRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), 4); ctx.stroke();
  } else if (s.kind === 'ellipse') {
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
function applyCtxView() {
  const d = dpr(), v = view();
  ctx.setTransform(d, 0, 0, d, v.x * d, v.y * d);
}
function redraw() {
  if (!doc) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyCtxView();
  for (const it of items()) {
    if (it.type === 'stroke') drawStroke(it);
    else if (it.type === 'shape') drawShape(it);
  }
  if (shaping) drawShape(shaping);
  const sel = selectedId && byId(selectedId);
  if (sel && isInk(sel) && tool === 'select') drawInkSelection(sel);
}

// --- Çizgi/şekil seçimi: çerçeve + boyut tutamacı + × ---
const isInk = (it) => it.type === 'stroke' || it.type === 'shape';
const HANDLE = 10, PAD = 6;

function inkBox(it) {
  let l, t, r, b;
  if (it.type === 'stroke') {
    l = r = it.pts[0][0]; t = b = it.pts[0][1];
    for (const [x, y] of it.pts) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
  } else {
    l = Math.min(it.x1, it.x2); r = Math.max(it.x1, it.x2); t = Math.min(it.y1, it.y2); b = Math.max(it.y1, it.y2);
  }
  return { l: l - PAD, t: t - PAD, r: r + PAD, b: b + PAD };
}
function drawInkSelection(it) {
  const { l, t, r, b } = inkBox(it);
  ctx.save();
  ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.strokeStyle = cssVar('--accent');
  ctx.strokeRect(l, t, r - l, b - t);
  ctx.setLineDash([]);
  // boyut tutamacı (sağ alt)
  ctx.fillStyle = cssVar('--accent');
  ctx.fillRect(r - HANDLE / 2, b - HANDLE / 2, HANDLE, HANDLE);
  // sil düğmesi (sağ üst)
  ctx.beginPath(); ctx.arc(r, t, 8, 0, Math.PI * 2); ctx.fillStyle = cssVar('--danger'); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(r - 3, t - 3); ctx.lineTo(r + 3, t + 3); ctx.moveTo(r + 3, t - 3); ctx.lineTo(r - 3, t + 3); ctx.stroke();
  ctx.restore();
}
function translateInk(it, dx, dy, orig) {
  if (it.type === 'stroke') it.pts = orig.pts.map(([x, y]) => [x + dx, y + dy]);
  else { it.x1 = orig.x1 + dx; it.y1 = orig.y1 + dy; it.x2 = orig.x2 + dx; it.y2 = orig.y2 + dy; }
}
function scaleInk(it, ox, oy, sx, sy, orig) {
  const f = (x, y) => [ox + (x - ox) * sx, oy + (y - oy) * sy];
  if (it.type === 'stroke') it.pts = orig.pts.map(([x, y]) => f(x, y));
  else { [it.x1, it.y1] = f(orig.x1, orig.y1); [it.x2, it.y2] = f(orig.x2, orig.y2); }
}
const snapshot = (it) => it.type === 'stroke' ? { pts: it.pts.map(p => [...p]) } : { x1: it.x1, y1: it.y1, x2: it.x2, y2: it.y2 };

// Seç modunda, blok dışına basıldığında: true dönerse olay tüketildi
function inkPointerDown(e) {
  const p = paperPoint(e);
  const sel = selectedId && byId(selectedId);

  if (sel && isInk(sel)) {
    const { l, t, r, b } = inkBox(sel);
    if (Math.hypot(p.x - r, p.y - t) <= 9) { removeItem(sel.id); return true; }           // ×
    if (Math.abs(p.x - r) <= HANDLE && Math.abs(p.y - b) <= HANDLE) {                      // boyut
      e.preventDefault();
      const orig = snapshot(sel), w0 = r - l - 2 * PAD, h0 = b - t - 2 * PAD, ox = l + PAD, oy = t + PAD;
      dragOnPaper(e, (ev) => {
        const q = paperPoint(ev);
        const sx = w0 > 2 ? Math.max(0.05, (q.x - ox) / w0) : 1;
        const sy = h0 > 2 ? Math.max(0.05, (q.y - oy) / h0) : 1;
        scaleInk(sel, ox, oy, sx, sy, orig);
        redraw();
      });
      return true;
    }
  }
  const hit = hitInk(p, 8);
  if (!hit) return false;
  e.preventDefault();
  select(hit.id);
  const orig = snapshot(hit);
  dragOnPaper(e, (ev) => {
    const q = paperPoint(ev);
    translateInk(hit, q.x - p.x, q.y - p.y, orig);
    redraw();
  });
  return true;
}
function dragOnPaper(e, onMove) {
  paper.setPointerCapture(e.pointerId);
  const move = (ev) => onMove(ev);
  const up = () => { paper.removeEventListener('pointermove', move); paper.removeEventListener('pointerup', up); scheduleSave(); };
  paper.addEventListener('pointermove', move);
  paper.addEventListener('pointerup', up);
}
// Seç modunda çizgi/şekil üstünde imleç
paper.addEventListener('pointermove', (e) => {
  if (tool !== 'select' || e.buttons) return;
  if (e.target.closest('.block')) { paper.style.cursor = ''; return; }
  const p = paperPoint(e);
  const sel = selectedId && byId(selectedId);
  let c = '';
  if (sel && isInk(sel)) {
    const { r, t, b } = inkBox(sel);
    if (Math.hypot(p.x - r, p.y - t) <= 9) c = 'pointer';
    else if (Math.abs(p.x - r) <= HANDLE && Math.abs(p.y - b) <= HANDLE) c = 'nwse-resize';
  }
  if (!c && hitInk(p, 8)) c = 'move';
  paper.style.cursor = c;
});
function undoInk() {
  const arr = items();
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].type === 'stroke' || arr[i].type === 'shape') { arr.splice(i, 1); redraw(); scheduleSave(); return; }
  }
}

// Silgi: noktaya yakın çizgi/şekli bütün olarak kaldırır
function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function hitInk(p, r) {
  const arr = items();
  for (let i = arr.length - 1; i >= 0; i--) {
    const it = arr[i];
    if (it.type === 'stroke') {
      const pts = it.pts;
      if (pts.length === 1 && Math.hypot(p.x - pts[0][0], p.y - pts[0][1]) < r) return it;
      for (let k = 1; k < pts.length; k++) if (distSeg(p.x, p.y, pts[k-1][0], pts[k-1][1], pts[k][0], pts[k][1]) < r) return it;
    } else if (it.type === 'shape') {
      const { x1, y1, x2, y2 } = it;
      if (it.kind === 'line' || it.kind === 'arrow') { if (distSeg(p.x, p.y, x1, y1, x2, y2) < r) return it; }
      else {
        const l = Math.min(x1, x2), t = Math.min(y1, y2), rr = Math.max(x1, x2), b = Math.max(y1, y2);
        if (it.kind === 'rect') {
          if (distSeg(p.x, p.y, l, t, rr, t) < r || distSeg(p.x, p.y, rr, t, rr, b) < r ||
              distSeg(p.x, p.y, rr, b, l, b) < r || distSeg(p.x, p.y, l, b, l, t) < r) return it;
        } else {
          const cx = (l + rr) / 2, cy = (t + b) / 2, rx = (rr - l) / 2 || 1, ry = (b - t) / 2 || 1;
          const v = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
          if (Math.abs(v - 1) * Math.min(rx, ry) < r) return it;
        }
      }
    }
  }
  return null;
}
function eraseAt(p) {
  const it = hitInk(p, 10);
  if (it) removeItem(it.id);
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !INK_TOOLS.includes(tool)) return;
  canvas.setPointerCapture(e.pointerId);
  const p = paperPoint(e);
  if (tool === 'pen') {
    drawing = { id: uid(), type: 'stroke', color, width: 2.6, pts: [[p.x, p.y]] };
    items().push(drawing);
    drawStroke(drawing);
  } else if (tool === 'eraser') {
    eraseAt(p);
  } else {
    shaping = { id: uid(), type: 'shape', kind: tool, color, width: 2.2, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  }
});
canvas.addEventListener('pointermove', (e) => {
  const p = paperPoint(e);
  if (drawing) {
    const last = drawing.pts[drawing.pts.length - 1];
    drawing.pts.push([p.x, p.y]);
    setStyle(drawing.color, drawing.width);
    ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p.x, p.y); ctx.stroke();
  } else if (shaping) {
    shaping.x2 = p.x; shaping.y2 = p.y;
    if (e.shiftKey && (shaping.kind === 'rect' || shaping.kind === 'ellipse')) {
      const d = Math.max(Math.abs(p.x - shaping.x1), Math.abs(p.y - shaping.y1));
      shaping.x2 = shaping.x1 + Math.sign(p.x - shaping.x1 || 1) * d;
      shaping.y2 = shaping.y1 + Math.sign(p.y - shaping.y1 || 1) * d;
    }
    redraw();
  } else if (tool === 'eraser' && e.buttons & 1) {
    eraseAt(p);
  }
});
function endInk() {
  if (drawing) { drawing = null; updateHint(); scheduleSave(); }
  if (shaping) {
    const s = shaping; shaping = null;
    if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 4) items().push(s);
    redraw(); updateHint(); scheduleSave();
  }
}
canvas.addEventListener('pointerup', endInk);
canvas.addEventListener('pointercancel', endInk);

// ==================================================================
// Sayfalar
// ==================================================================
function renderTabs() {
  tabsEl.innerHTML = '';
  doc.pages.forEach((p, i) => {
    const tab = document.createElement('button');
    tab.className = 'tab' + (i === doc.current ? ' active' : '');
    tab.innerHTML = `<span>${i + 1}</span><span class="x" title="${t('page.delete')}">×</span>`;
    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('x')) {
        if (tab.classList.contains('confirm')) deletePage(i);
        else {
          tab.classList.add('confirm'); tab.querySelector('span').textContent = t('page.confirm');
          setTimeout(() => { tab.classList.remove('confirm'); tab.querySelector('span').textContent = i + 1; }, 2500);
        }
        return;
      }
      if (i !== doc.current) { doc.current = i; renderPage(); scheduleSave(); }
    });
    tabsEl.appendChild(tab);
  });
  tabsEl.querySelector('.tab.active')?.scrollIntoView({ inline: 'nearest' });
}
document.getElementById('page-add').addEventListener('click', () => {
  doc.pages.push({ id: uid(), name: `Sayfa ${doc.pages.length + 1}`, items: [] });
  doc.current = doc.pages.length - 1;
  renderPage();
  scheduleSave();
});
function deletePage(i) {
  doc.pages.splice(i, 1);
  if (!doc.pages.length) doc.pages.push({ id: uid(), name: 'Sayfa 1', items: [] });
  doc.current = Math.min(i, doc.pages.length - 1);
  renderPage();
  scheduleSave();
}

// ==================================================================
// PNG dışa aktar
// ==================================================================
document.getElementById('export').addEventListener('click', async () => {
  const prev = selectedId;
  select(null);
  document.activeElement?.blur?.();
  hint.classList.add('hidden');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const r = paper.getBoundingClientRect();
  await window.api.exportPng({ x: r.left, y: r.top, width: r.width, height: r.height }, `${t('export.name')}-${doc.current + 1}`, t('export.title'));
  updateHint();
  select(prev);
});

// ==================================================================
// Kayıt
// ==================================================================
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.api.save(doc);
    savedEl.classList.add('show');
    setTimeout(() => savedEl.classList.remove('show'), 900);
  }, 400);
}

(async () => {
  doc = await window.api.load();
  lang = doc.lang === 'en' ? 'en' : 'tr';
  applyLang();
  applyTheme(doc.theme);
  renderPage();
})();
