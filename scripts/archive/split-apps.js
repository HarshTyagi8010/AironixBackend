const fs = require('fs');
const path = require('path');

function copyDir(src, dest, ignore = []) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, ignore);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const root = path.join(__dirname, '../..');
const frontendDir = path.join(root, 'frontend');
const storefrontDir = path.join(root, 'apps/storefront');
const adminDir = path.join(root, 'apps/admin');

console.log('1. Setting up apps/storefront...');
// Copy frontend -> apps/storefront (excluding node_modules, .next, and admin stuff)
copyDir(frontendDir, storefrontDir, ['node_modules', '.next']);

// Strip admin from storefront
const storefrontAdminApp = path.join(storefrontDir, 'app/admin');
const storefrontAdminComp = path.join(storefrontDir, 'components/admin');
const storefrontAdminAuth = path.join(storefrontDir, 'context/AdminAuthContext.jsx');
const storefrontAdminApi = path.join(storefrontDir, 'lib/adminApi.js');

if (fs.existsSync(storefrontAdminApp)) fs.rmSync(storefrontAdminApp, { recursive: true, force: true });
if (fs.existsSync(storefrontAdminComp)) fs.rmSync(storefrontAdminComp, { recursive: true, force: true });
if (fs.existsSync(storefrontAdminAuth)) fs.rmSync(storefrontAdminAuth, { force: true });
if (fs.existsSync(storefrontAdminApi)) fs.rmSync(storefrontAdminApi, { force: true });

console.log('✓ apps/storefront created with ZERO admin files.');

console.log('2. Setting up apps/admin...');
// Copy base configuration & admin-specific modules into apps/admin
const adminAppDir = path.join(adminDir, 'app');
const adminCompDir = path.join(adminDir, 'components');
const adminContextDir = path.join(adminDir, 'context');
const adminLibDir = path.join(adminDir, 'lib');
const adminPublicDir = path.join(adminDir, 'public');

fs.mkdirSync(adminAppDir, { recursive: true });
fs.mkdirSync(adminCompDir, { recursive: true });
fs.mkdirSync(adminContextDir, { recursive: true });
fs.mkdirSync(adminLibDir, { recursive: true });
fs.mkdirSync(adminPublicDir, { recursive: true });

// Copy admin app folder contents to apps/admin/app
copyDir(path.join(frontendDir, 'app/admin'), adminAppDir, []);
// Copy admin component
copyDir(path.join(frontendDir, 'components/admin'), adminCompDir, []);
// Copy AdminAuthContext
fs.copyFileSync(path.join(frontendDir, 'context/AdminAuthContext.jsx'), path.join(adminContextDir, 'AdminAuthContext.jsx'));
// Copy adminApi & constants
fs.copyFileSync(path.join(frontendDir, 'lib/adminApi.js'), path.join(adminLibDir, 'adminApi.js'));
fs.copyFileSync(path.join(frontendDir, 'lib/constants.js'), path.join(adminLibDir, 'constants.js'));
// Copy jsconfig, package.json
fs.copyFileSync(path.join(frontendDir, 'jsconfig.json'), path.join(adminDir, 'jsconfig.json'));

console.log('✓ apps/admin structure created.');
