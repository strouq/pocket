// electron-builder afterPack: macOS paketini ad-hoc imzala.
// Apple Developer sertifikası yok; ad-hoc imza "uygulama hasarlı" hatasını önler,
// kullanıcı ilk açılışta sağ tık -> Aç ile açabilir.
const { execSync } = require('child_process');
const path = require('path');

module.exports = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
  execSync(`codesign --verify --deep --strict "${app}"`, { stdio: 'inherit' });
  console.log('ad-hoc signed:', app);
};
