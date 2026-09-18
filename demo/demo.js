// Otomatik demo: sahte imleçle Pocket'ı baştan sona kullanır.
// Parametreler: ?lang=tr|en  ?theme=modern|venom|light|paper|neon  ?loop=1  ?cursor=1 (gerçek imleci göster)
(async () => {
  const q = new URLSearchParams(location.search);
  const LANG = q.get('lang') === 'en' ? 'en' : 'tr';
  if (q.get('cursor') === '1') document.body.classList.add('show-cursor');

  const T = {
    tr: { items: ['Market alışverişi', 'Bankayı ara', "v0.2'yi yayınla"], note: 'Bu grafiği rapora ekle', saved: 'pocket-sayfa-1.png kaydedildi', end: 'Köşeden çek, notunu al, geri katla.' },
    en: { items: ['Buy groceries', 'Call the bank', 'Ship v0.2'], note: 'Add this chart to the report', saved: 'pocket-page-1.png saved', end: 'Pull from the corner, take a note, fold it back.' },
  }[LANG];

  const cur = document.getElementById('cursor');
  const keys = document.getElementById('keys');
  const toast = document.getElementById('toast');
  const endCard = document.getElementById('end');
  const toastText = document.getElementById('toast-text');
  toastText.textContent = T.saved;
  document.getElementById('end-text').textContent = T.end;
  window.demoToast = () => { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const ease = (t) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  let cx = innerWidth / 2, cy = innerHeight / 2;
  const place = () => { cur.style.transform = `translate(${cx}px, ${cy}px)` + (cur.classList.contains('down') ? ' scale(.88)' : ''); };
  place();

  // İmleci (x,y)'ye kaydır; onMove her karede çağrılır (sürükleme olayları için)
  async function moveTo(x, y, ms = 500, onMove) {
    const sx = cx, sy = cy, t0 = performance.now();
    return new Promise(res => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms), k = ease(t);
        cx = sx + (x - sx) * k; cy = sy + (y - sy) * k;
        place(); onMove?.(cx, cy);
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }
  const press = () => { cur.classList.add('down'); place(); };
  const release = () => { cur.classList.remove('down'); place(); };
  const ripple = () => { cur.classList.remove('click'); void cur.offsetWidth; cur.classList.add('click'); };

  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  async function clickEl(el, ms = 450) {
    const c = center(el);
    await moveTo(c.x, c.y, ms);
    press(); ripple(); await sleep(90); release();
    el.click();
    await sleep(200);
  }
  const pev = (type, el, x, y, extra = {}) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, ...extra }));
  const mev = (type, el, x, y) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y }));

  // Sürükleme: el üzerinde pointerdown -> yol -> pointerup
  async function dragPath(el, pts, msPer = 260) {
    await moveTo(pts[0][0], pts[0][1], 400);
    press(); pev('pointerdown', el, pts[0][0], pts[0][1]); await sleep(60);
    for (let i = 1; i < pts.length; i++) await moveTo(pts[i][0], pts[i][1], msPer, (x, y) => pev('pointermove', el, x, y));
    pev('pointerup', el, cx, cy); release(); await sleep(150);
  }

  // Köşeden çekme: basılı tut, (isteğe bağlı) sürükle, bırak
  async function pullFromCorner(to) {
    await moveTo(3, 3, 650);
    press(); mev('mousedown', corner, 3, 3);
    await sleep(700); // 0.5 sn basılı tutma + pay
    if (to) await moveTo(to[0], to[1], 900, (x, y) => mev('mousemove', window, x, y));
    mev('mouseup', window, cx, cy); release();
    await sleep(500);
  }

  async function typeInto(el, text, cps = 28) {
    for (const ch of text) { el.textContent += ch; el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(1000 / cps + Math.random() * 40); }
  }
  const keyOn = (el, key) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  // Sahte "ekran görüntüsü": küçük bir grafik penceresi
  async function fakeScreenshot() {
    const c = document.createElement('canvas'); c.width = 640; c.height = 400;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 640, 400);
    g.fillStyle = '#f1f3f9'; g.fillRect(0, 0, 640, 44);
    for (const [i, col] of [['#ff5f57'], ['#febc2e'], ['#28c840']].entries()) { g.fillStyle = col; g.beginPath(); g.arc(22 + i * 22, 22, 7, 0, 7); g.fill(); }
    g.fillStyle = '#1a1d26'; g.font = '600 18px Inter, Segoe UI, sans-serif'; g.fillText('Weekly Active Users', 32, 84);
    g.fillStyle = '#7b8194'; g.font = '13px Inter, Segoe UI, sans-serif'; g.fillText('Last 8 weeks', 32, 106);
    const vals = [32, 41, 38, 52, 61, 58, 74, 88];
    vals.forEach((v, i) => { const h = v * 2.6; g.fillStyle = i === 7 ? '#5b6cff' : '#c9cff5'; g.beginPath(); g.roundRect(48 + i * 72, 360 - h, 44, h, 6); g.fill(); });
    g.strokeStyle = '#e6e8f0'; g.beginPath(); g.moveTo(32, 360.5); g.lineTo(608, 360.5); g.stroke();
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    return new File([blob], 'screenshot.png', { type: 'image/png' });
  }

  const paperTop = () => paper.getBoundingClientRect().top;
  const paperLeft = () => paper.getBoundingClientRect().left;

  // ------------------------------------------------------------ senaryo
  async function run() {
    endCard.classList.remove('show');
    window.demoShim.fold();
    cx = innerWidth * .55; cy = innerHeight * .55; place();
    await sleep(1200);

    // 1) köşeden çek
    await pullFromCorner([560, 520]);
    await sleep(600);

    // 2) checklist
    await clickEl(document.querySelector('.tool[data-tool="check"]'));
    const px = paperLeft() + 46, py = paperTop() + 70;
    await moveTo(px, py, 450); press(); ripple(); pev('pointerdown', blocksEl, px, py); await sleep(80); pev('pointerup', blocksEl, px, py); release();
    await sleep(350);
    let ct = [...blocksEl.querySelectorAll('.block.check')].pop().querySelector('.ct');
    for (let i = 0; i < T.items.length; i++) {
      await typeInto(ct, T.items[i]);
      await sleep(250);
      if (i < T.items.length - 1) { keyOn(ct, 'Enter'); await sleep(150); ct = ct.closest('.ci').nextElementSibling.querySelector('.ct'); }
    }
    await sleep(500);
    await clickEl(blocksEl.querySelector('.cb'));
    await sleep(700);
    document.activeElement?.blur?.(); hideFmt();

    // 3) görsel yapıştır
    keys.classList.add('show'); await sleep(900);
    const file = await fakeScreenshot();
    await addImageFromFile(file, { x: 250, y: 230 });
    await sleep(300); keys.classList.remove('show');
    await sleep(600);

    // 4) görseli taşı
    const img = blocksEl.querySelector('.block.image');
    let ic = center(img);
    await dragPath(img, [[ic.x, ic.y], [ic.x - 40, ic.y + 30]], 500);
    await sleep(400);

    // 5) kalemle daire, sonra ok
    await clickEl(document.querySelector('.tool[data-tool="pen"]'));
    await clickEl(document.querySelector('.swatch[data-color="#ff6b8b"]'));
    const r = img.getBoundingClientRect();
    const ex = r.left + r.width * .87, ey = r.top + r.height * .68, rx = r.width * .11, ry = r.height * .2;
    const circ = []; for (let a = -0.4; a <= Math.PI * 2 + .2; a += .35) circ.push([ex + rx * Math.cos(a), ey + ry * Math.sin(a)]);
    await dragPath(canvas, circ, 45);
    await sleep(300);
    const shapeBtn = document.getElementById('shape-btn');
    await moveTo(...Object.values(center(shapeBtn)), 400); press(); ripple(); await sleep(90); release(); setTool('arrow'); await sleep(250);
    const row = blocksEl.querySelectorAll('.ci')[2].getBoundingClientRect();
    await dragPath(canvas, [[row.right + 24, row.top + row.height / 2], [ex - rx - 10, ey - ry - 8]], 550);
    await sleep(500);

    // 6) PNG dışa aktar
    await clickEl(document.getElementById('export'));
    await sleep(1800);

    // 7) katla
    await clickEl(document.getElementById('fold'));
    await moveTo(innerWidth * .6, innerHeight * .6, 900);
    await sleep(1200);

    // 8) tekrar aç: sürüklemeden bırak -> son boyutta
    await pullFromCorner(null);
    await moveTo(innerWidth * .45, innerHeight * .7, 900);
    await sleep(2200);

    // 9) kapanış
    endCard.classList.add('show');
    await sleep(3500);
    if (q.get('loop') === '1') { endCard.classList.remove('show'); await sleep(600); run(); }
  }

  await sleep(300);
  run();
})();
