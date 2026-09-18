const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Katlı haldeyken sol üstte duran görünmez köşe penceresinin boyutu (px)
const CORNER = 10;
// Bırakıldığında bundan küçük çekildiyse son kaydedilen boyutta açılır
const MIN_OPEN = 160;
const DEFAULT_SIZE = { w: 520, h: 600 };

let win = null;
let state = 'folded'; // folded | dragging | open
let fxMargin = 0;     // temaya göre cebin dışına taşan efektler için pencere payı

const dataFile = () => path.join(app.getPath('userData'), 'pocket.json');
const imageDir = () => path.join(app.getPath('userData'), 'images');

// --- Veri ---------------------------------------------------------

function emptyDoc() {
  return { v: 2, pages: [{ id: uid(), name: 'Sayfa 1', items: [] }], current: 0, size: { ...DEFAULT_SIZE } };
}
function uid() { return Math.random().toString(36).slice(2, 10); }

// v1 (tek metin + çizimler) -> v2 (sayfalar + bloklar)
function migrate(d) {
  if (d && d.v === 2) return d;
  const doc = emptyDoc();
  if (d && d.size) doc.size = d.size;
  const items = doc.pages[0].items;
  if (d && d.text) items.push({ id: uid(), type: 'text', x: 20, y: 16, w: 300, html: d.text });
  if (d && Array.isArray(d.strokes)) {
    for (const s of d.strokes) if (!s.erase) items.push({ id: uid(), type: 'stroke', color: s.color, width: s.width, pts: s.pts });
  }
  return doc;
}

function loadData() {
  try { return migrate(JSON.parse(fs.readFileSync(dataFile(), 'utf8'))); }
  catch { return emptyDoc(); }
}
function saveData(doc) {
  fs.writeFileSync(dataFile(), JSON.stringify(doc));
}

// --- Pencere ------------------------------------------------------

function workArea() { return screen.getPrimaryDisplay().workArea; }

function setState(next, bounds) {
  state = next;
  win.setBounds(bounds);
  win.webContents.send('state', state);
}

// Açık cep: kaydedilen boyut + efekt payı (çalışma alanına sığdırılır)
function openBounds(size) {
  const wa = workArea();
  return {
    x: wa.x, y: wa.y,
    width: Math.min(size.w + fxMargin, wa.width),
    height: Math.min(size.h + fxMargin, wa.height),
  };
}

function foldBounds() {
  const wa = workArea();
  return { x: wa.x, y: wa.y, width: CORNER, height: CORNER };
}

function createWindow() {
  win = new BrowserWindow({
    ...foldBounds(),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// --- IPC -----------------------------------------------------------

// 1 sn basılı tutuldu: pencereyi tüm çalışma alanına yay, sürükleme başlasın
ipcMain.on('begin-drag', () => {
  const wa = workArea();
  setState('dragging', { x: wa.x, y: wa.y, width: wa.width, height: wa.height });
});

// Sürükleme bitti: çekilen boyuta küçül.
// Çekmeden (ya da çok az çekip) bırakıldıysa son kaydedilen boyutta aç.
ipcMain.on('end-drag', (_e, { w, h }) => {
  const wa = workArea();
  const doc = loadData();
  if (w < MIN_OPEN || h < MIN_OPEN) {
    w = doc.size.w; h = doc.size.h;
  }
  w = Math.min(Math.round(w), wa.width - fxMargin);
  h = Math.min(Math.round(h), wa.height - fxMargin);
  doc.size = { w, h };
  saveData(doc);
  setState('open', openBounds(doc.size));
});

ipcMain.on('fold', () => setState('folded', foldBounds()));
ipcMain.on('set-margin', (_e, m) => {
  fxMargin = Math.max(0, Number(m) || 0);
  if (state === 'open') setState('open', openBounds(loadData().size));
});
ipcMain.on('quit', () => app.quit());

ipcMain.handle('load', () => loadData());
ipcMain.on('save', (_e, doc) => {
  const cur = loadData();
  doc.size = cur.size; // boyutu ana süreç yönetir
  saveData(doc);
});

// Yapıştırılan görseli diske yaz, dosya URL'sini döndür
ipcMain.handle('save-image', (_e, dataUrl) => {
  const m = /^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  fs.mkdirSync(imageDir(), { recursive: true });
  const file = path.join(imageDir(), `${Date.now()}-${uid()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`);
  fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
  return pathToFileURL(file).href;
});

// Sayfanın görünen kısmını PNG olarak kaydet
ipcMain.handle('export-png', async (_e, rect, suggested, title) => {
  const img = await win.webContents.capturePage({
    x: Math.round(rect.x), y: Math.round(rect.y),
    width: Math.round(rect.width), height: Math.round(rect.height),
  });
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: title || 'Export as PNG',
    defaultPath: path.join(app.getPath('pictures'), `${suggested || 'pocket'}.png`),
    filters: [{ name: 'PNG', extensions: ['png'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, img.toPNG());
  return true;
});

// --- Uygulama ------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    // macOS: Dock'ta ikon gösterme (köşede yaşayan bir araç)
    if (process.platform === 'darwin') app.dock?.hide();
    // Sadece paketlenmiş uygulama kendini sistem başlangıcına ekler;
    // kullanıcı Görev Yöneticisi'nden kapatırsa o ayar geçerli olur.
    if (app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: true });
    }
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
