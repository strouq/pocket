# Pocket

**English** · [Türkçe](#türkçe)

**[⬇ Download](https://github.com/strouq/pocket/releases/latest)** — Windows `.exe` · macOS `.dmg` (Apple Silicon / Intel)

- Windows: run the `.exe`. If SmartScreen appears, click *More info → Run anyway* (unsigned build).
- macOS: open the `.dmg`, drag Pocket to Applications. On first launch **right-click → Open** (unsigned build);
  if macOS says the app is damaged, run `xattr -cr /Applications/Pocket.app` in Terminal once.

A quick-note pocket that you pull out of the top-left corner of your desktop.
Hold the corner for 1 second, drag diagonally, take your notes, fold it back with `–`.

- Text and checklist blocks, paste images with Ctrl+V
- Pen, eraser, line / arrow / rectangle / ellipse
- Everything can be selected, moved and resized
- Infinite page (scroll with the wheel), multiple pages
- Auto-save, PNG export
- Turkish / English UI (toggle in the bottom bar)
- Windows and macOS (Electron)

### Development

```bash
npm install
npm start
```

### Packaging

```bash
npm run build:win   # Windows installer (on Windows)
npm run build:mac   # macOS dmg (on a Mac)
```

Pushing a `v*` tag builds both on GitHub Actions and attaches them to the release.

### License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) —
personal and noncommercial use is permitted; commercial use is prohibited.
Copyright (c) 2026 strouq

---

## Türkçe

**[⬇ İndir](https://github.com/strouq/pocket/releases/latest)** — Windows `.exe` · macOS `.dmg` (Apple Silicon / Intel)

- Windows: `.exe`'yi çalıştır. SmartScreen uyarısı çıkarsa *Daha fazla bilgi → Yine de çalıştır* (derleme imzasız).
- macOS: `.dmg`'yi aç, Pocket'ı Applications'a sürükle. İlk açılışta **sağ tık → Aç** (derleme imzasız);
  "uygulama hasarlı" derse Terminal'de bir kez `xattr -cr /Applications/Pocket.app` çalıştır.

Masaüstünün sol üst köşesinden çekilen hızlı not cebi. Ekranın köşesine 1 saniye
basılı tut, çaprazlama çek; notlarını al, `–` ile geri katla.

- Yazı ve checklist blokları, Ctrl+V ile görsel yapıştırma
- Kalem, silgi, çizgi / ok / dikdörtgen / elips
- Her şey seçilip taşınabilir, boyutlandırılabilir
- Sonsuz sayfa (tekerlekle kaydır), birden fazla sayfa
- Otomatik kayıt, PNG dışa aktarma
- Türkçe / İngilizce arayüz (alt çubuktaki anahtar)
- Windows ve macOS (Electron)

### Geliştirme

```bash
npm install
npm start
```

### Paketleme

```bash
npm run build:win   # Windows installer (Windows'ta)
npm run build:mac   # macOS dmg (Mac'te)
```

`v*` etiketi push edilince GitHub Actions ikisini de derleyip Release'e ekler.

### Lisans

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) —
kişisel ve ticari olmayan kullanım serbesttir; ticari kullanım yasaktır.
Copyright (c) 2026 strouq
