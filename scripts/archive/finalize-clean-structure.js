const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

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

function cleanDirContents(dirPath, keep = []) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return;
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (keep.includes(entry.name)) continue;
    const p = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        fs.rmSync(p, { recursive: true, force: true });
      } else {
        fs.unlinkSync(p);
      }
    } catch (err) {
      // ignore locked subfiles if any
    }
  }
}

console.log('── Step 1: Migrating apps/storefront -> frontend ──');
const storefrontSrc = path.join(root, 'apps/storefront');
const frontendDest = path.join(root, 'frontend');

cleanDirContents(frontendDest, ['node_modules', '.next']);
copyDir(storefrontSrc, frontendDest, ['node_modules', '.next']);

// Ensure frontend/package.json has name "aditya-air-compressors-frontend"
const fePkgPath = path.join(frontendDest, 'package.json');
const fePkg = JSON.parse(fs.readFileSync(fePkgPath, 'utf8'));
fePkg.name = 'aditya-air-compressors-frontend';
fs.writeFileSync(fePkgPath, JSON.stringify(fePkg, null, 2), 'utf8');

// Ensure frontend/.env.example exists
fs.writeFileSync(path.join(frontendDest, '.env.example'), `NEXT_PUBLIC_API_URL=https://aironixsolutions-com.onrender.com\nNEXT_PUBLIC_SITE_URL=https://www.aironixsolutions.com\nNEXT_PUBLIC_CLOUDINARY_CLOUD=zo1rixsw\n`, 'utf8');
fs.writeFileSync(path.join(frontendDest, '.gitignore'), `node_modules/\n.next/\nout/\n.env\n.env.local\n.env.production\n*.log\n`, 'utf8');

console.log('✓ frontend/ established (Clean Storefront, 0 Admin code).');

console.log('── Step 2: Migrating apps/admin -> admin ──');
const adminSrc = path.join(root, 'apps/admin');
const adminDest = path.join(root, 'admin');

cleanDirContents(adminDest, ['node_modules', '.next']);
copyDir(adminSrc, adminDest, ['node_modules', '.next']);

const adminPkgPath = path.join(adminDest, 'package.json');
const adminPkg = JSON.parse(fs.readFileSync(adminPkgPath, 'utf8'));
adminPkg.name = 'aditya-air-compressors-admin';
fs.writeFileSync(adminPkgPath, JSON.stringify(adminPkg, null, 2), 'utf8');

// Ensure admin/.env.example exists
fs.writeFileSync(path.join(adminDest, '.env.example'), `NEXT_PUBLIC_API_URL=https://aironixsolutions-com.onrender.com\nNEXT_PUBLIC_SITE_URL=https://www.aironixsolutions.com\nNEXT_PUBLIC_ADMIN_URL=https://admin.aironixsolutions.com\nNEXT_PUBLIC_CLOUDINARY_CLOUD=zo1rixsw\nPORT=3001\n`, 'utf8');
fs.writeFileSync(path.join(adminDest, '.gitignore'), `node_modules/\n.next/\nout/\n.env\n.env.local\n.env.production\n*.log\n`, 'utf8');

console.log('✓ admin/ established (Standalone Admin App).');

console.log('── Step 3: Removing apps/ and packages/ ──');
fs.rmSync(path.join(root, 'apps'), { recursive: true, force: true });
fs.rmSync(path.join(root, 'packages'), { recursive: true, force: true });

console.log('── Step 4: Backend Scripts Archiving ──');
const backendScripts = path.join(root, 'backend/scripts');
const archiveDir = path.join(backendScripts, 'archive');
fs.mkdirSync(archiveDir, { recursive: true });

const archiveFiles = ['migrate-images-to-cloudinary.js', 'upload-frames-to-cloudinary.js', 'split-apps.js'];
for (const f of archiveFiles) {
  const p = path.join(backendScripts, f);
  if (fs.existsSync(p)) {
    fs.renameSync(p, path.join(archiveDir, f));
    console.log(`  * Archived historical script: ${f}`);
  }
}

console.log('── Step 5: Root Cleanup ──');
const rootFilesToDelete = [
  'ScrollAssemblyReveal.jsx',
  'README-scroll-assembly.md',
  'demo.html',
  'package.json',
  'package-lock.json',
];

for (const rf of rootFilesToDelete) {
  const p = path.join(root, rf);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { force: true });
    console.log(`  * Removed loose root file: ${rf}`);
  }
}

// Ensure root .gitignore ignores root node_modules and envs
fs.writeFileSync(path.join(root, '.gitignore'), `node_modules/\n.npm\n.env\n.env.local\n.env.production\n.next/\nout/\ndist/\nbuild/\n*.log\n.DS_Store\nThumbs.db\n*.bak\n*.tmp\nassembly-frames.zip\nframes_webp/\n`, 'utf8');

// Ensure root README.md
fs.writeFileSync(path.join(root, 'README.md'), `# Aditya Air Compressors (aironixsolutions.com)

## Architecture

\`\`\`
aditya-air-compressors/
├── frontend/    ← Customer Storefront Next.js App (Port 3000)
├── admin/       ← Dedicated Admin Panel Next.js App (Port 3001)
└── backend/     ← Express REST API + MongoDB Atlas + Cloudinary (Port 5000)
\`\`\`

## Development

### Frontend Storefront
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

### Admin Panel
\`\`\`bash
cd admin
npm install
npm run dev
\`\`\`

### Backend API
\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`
`, 'utf8');

console.log('\n✅ Clean structure finalized: frontend/, admin/, backend/ at root.');
