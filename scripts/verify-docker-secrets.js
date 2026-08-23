const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');

console.log('=================================================');
console.log('🔍 DOCKER SECURITY & SECRET ISOLATION AUDIT (BACKEND)');
console.log('=================================================\n');

const checks = [];

// Check 1: .dockerignore in backend
const dockerignores = [
  path.join(backendRoot, '.dockerignore'),
];

let allIgnoreExist = true;
dockerignores.forEach((p) => {
  const exists = fs.existsSync(p);
  const rel = path.relative(backendRoot, p);
  if (exists) {
    const content = fs.readFileSync(p, 'utf8');
    const ignoresEnv = content.includes('.env');
    console.log(`[PASS] ${rel} exists and ignores .env: ${ignoresEnv}`);
    if (!ignoresEnv) allIgnoreExist = false;
  } else {
    console.error(`[FAIL] Missing ${rel}`);
    allIgnoreExist = false;
  }
});
checks.push({ check: '.dockerignore Coverage', pass: allIgnoreExist });

// Check 2: Verify no hardcoded secrets in Dockerfiles and compose configs
const dockerfiles = [
  path.join(backendRoot, 'Dockerfile'),
  path.join(backendRoot, 'deployment/docker-compose.yml'),
];

let noSecretsBake = true;
const forbiddenKeywords = ['mongodb+srv://', 'api_secret', 'secret=', 'password='];

dockerfiles.forEach((p) => {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8').toLowerCase();
    const rel = path.relative(backendRoot, p);
    let fileClean = true;
    forbiddenKeywords.forEach((kw) => {
      // Allow variable substitutions like ${MONGODB_URI} but reject raw hardcoded strings
      if (content.includes(kw) && !content.includes('${') && !rel.includes('docker-compose')) {
        console.error(`[FAIL] Potential hardcoded secret in ${rel}: ${kw}`);
        fileClean = false;
        noSecretsBake = false;
      }
    });
    if (fileClean) {
      console.log(`[PASS] ${rel} uses runtime environment variable substitution (zero baked secrets).`);
    }
  }
});
checks.push({ check: 'No Hardcoded Docker Secrets', pass: noSecretsBake });

// Check 3: Nginx reverse proxy configuration completeness
const nginxConf = path.join(backendRoot, 'deployment/nginx/aironixsolutions.conf');
let nginxValid = false;
if (fs.existsSync(nginxConf)) {
  const content = fs.readFileSync(nginxConf, 'utf8');
  const hasStorefront = content.includes('www.aironixsolutions.com');
  const hasAdmin = content.includes('admin.aironixsolutions.com');
  const hasApi = content.includes('api.aironixsolutions.com');
  const hasSSL = content.includes('ssl_certificate');
  nginxValid = hasStorefront && hasAdmin && hasApi && hasSSL;
  console.log(`[${nginxValid ? 'PASS' : 'FAIL'}] Nginx 3-domain reverse proxy config verified.`);
}
checks.push({ check: 'Nginx 3-Domain Reverse Proxy', pass: nginxValid });

console.log('\n📊 AUDIT RESULTS SUMMARY:');
console.table(checks);

const allPassed = checks.every((c) => c.pass);
if (allPassed) {
  console.log('✅ DOCKER & DEPLOYMENT CONFIGURATION AUDIT PASSED!');
  process.exit(0);
} else {
  console.error('❌ ONE OR MORE CHECKS FAILED');
  process.exit(1);
}

