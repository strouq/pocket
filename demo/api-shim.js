// Electron preload'un tarayıcı içi taklidi: pencere yerine #win div'i boyutlanır.
(() => {
  const q = new URLSearchParams(location.search);
  const win = document.getElementById('win');
  let stateCb = () => {};
  let margin = 0;
  let size = { w: 560, h: 520 };
  const CORNER = 10;

  const setWin = (w, h) => { win.style.width = w + 'px'; win.style.height = h + 'px'; };
  const setState = (s) => { stateCb(s); };

  window.demoShim = {
    get size() { return size; },
    fold() { setWin(CORNER, CORNER); setState('folded'); },
  };

  window.api = {
    beginDrag() {
      setWin(innerWidth, innerHeight);
      setState('dragging');
    },
    endDrag(w, h) {
      if (w < 160 || h < 160) { w = size.w; h = size.h; }
      size = { w: Math.round(w), h: Math.round(h) };
      setWin(size.w + margin, size.h + margin);
      setState('open');
    },
    fold() { window.demoShim.fold(); },
    quit() { window.demoShim.fold(); },
    load: async () => ({
      v: 2,
      pages: [{ id: 'p1', name: 'Sayfa 1', items: [] }],
      current: 0,
      size,
      lang: q.get('lang') || 'en',
      theme: q.get('theme') || 'modern',
    }),
    save() {},
    saveImage: async (dataUrl) => dataUrl,
    exportPng: async () => { window.demoToast?.(); return true; },
    setMargin(m) {
      margin = m || 0;
      if (document.body.dataset.state === 'open') setWin(size.w + margin, size.h + margin);
    },
    onState(cb) { stateCb = cb; },
  };

  // Sentetik pointer olaylarında setPointerCapture hata vermesin
  Element.prototype.setPointerCapture = function () {};
})();
