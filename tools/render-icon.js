// tools/icon.svg -> build/icon.png (512x512)
// Çalıştır: npx electron tools/render-icon.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const SIZE = 512;
const svgPath = path.join(__dirname, 'icon.svg');
const outDir = path.join(__dirname, '..', 'build');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE, height: SIZE, show: false, frame: false, transparent: true,
    webPreferences: { offscreen: true },
  });
  const svg = fs.readFileSync(svgPath, 'utf8');
  const html = `<!doctype html><html><body style="margin:0;overflow:hidden;background:transparent"><style>svg{display:block}</style>${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 300));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'icon.png'), img.toPNG());
  console.log('yazıldı:', path.join(outDir, 'icon.png'), img.getSize());
  app.quit();
});
