/**
 * audit-test-suite.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-Stack Automated Test Suite for Aditya Air Compressors:
 *   1. Backend Health Check (/api/v1/health & /api/health)
 *   2. Hero Frames API (/api/v1/assets/hero-frames)
 *   3. Products API & Cloudinary Integration (/api/v1/products)
 *   4. Admin Auth Login (/api/v1/admin/auth/login)
 *   5. Admin Stats Endpoint (/api/v1/admin/stats)
 *   6. Product CRUD Regression & Partial Update Persistence
 *   7. Public Inquiries Submission & Validation (/api/v1/inquiries)
 *   8. Server-Side Schema Validation Guard
 *   9. Strict Cloudinary Origin Security Guard
 * ─────────────────────────────────────────────────────────────────────────────
 */

const http = require('http');
const app = require('../server');

let testServer;
const TEST_PORT = 5099;

function request({ hostname = 'localhost', port = TEST_PORT, path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.status, statusCode: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.status, statusCode: res.statusCode, headers: res.headers, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runAudit() {
  console.log('🧪 Starting Full-Stack API v1 Production Audit Test Suite...\n');
  
  await new Promise((resolve) => {
    testServer = app.listen(TEST_PORT, () => {
      console.log(`✓ Test API instance active on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const results = [];
  let adminToken = '';

  // Test 1: Health Check (v1)
  try {
    const res = await request({ path: '/api/v1/health' });
    const pass = res.statusCode === 200 && res.body.status === 'ok' && res.body.version === 'v1';
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 1. Backend v1 Health Check (HTTP ${res.statusCode}): version=${res.body?.version}, status=${res.body?.status}`);
    results.push({ name: 'Backend v1 Health Check', pass });
  } catch (err) {
    console.error(`[FAIL] 1. Backend Health Check:`, err.message);
    results.push({ name: 'Backend v1 Health Check', pass: false, error: err.message });
  }

  // Test 2: Hero Frames API
  try {
    const res = await request({ path: '/api/v1/assets/hero-frames' });
    const count = res.body?.data?.length || 0;
    const sample = res.body?.data?.[0] || '';
    const pass = res.statusCode === 200 && count === 90 && sample.includes('cloudinary.com');
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 2. Hero Frames v1 API (HTTP ${res.statusCode}): count=${count}, sample=${sample}`);
    results.push({ name: 'Hero Frames v1 API', pass });
  } catch (err) {
    console.error(`[FAIL] 2. Hero Frames API:`, err.message);
    results.push({ name: 'Hero Frames v1 API', pass: false, error: err.message });
  }

  // Test 3: Products API (Cloudinary Integration)
  try {
    const res = await request({ path: '/api/v1/products' });
    const count = res.body?.data?.length || 0;
    const allCloudinary = res.body?.data?.every((p) => p.image && p.image.includes('cloudinary.com'));
    const pass = res.statusCode === 200 && count >= 9 && allCloudinary;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 3. Products v1 API (HTTP ${res.statusCode}): ${count} products loaded. All Cloudinary images: ${allCloudinary}`);
    results.push({ name: 'Products API Cloudinary Integration', pass });
  } catch (err) {
    console.error(`[FAIL] 3. Products API:`, err.message);
    results.push({ name: 'Products API Cloudinary Integration', pass: false, error: err.message });
  }

  // Test 4: Admin Auth Login
  try {
    const res = await request({
      path: '/api/v1/admin/auth/login',
      method: 'POST',
      body: { email: 'adityaaircompressor@gmail.com', password: 'aditya@2002' },
    });
    adminToken = res.body?.token;
    const pass = res.statusCode === 200 && !!adminToken;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 4. Admin Auth Login (HTTP ${res.statusCode}): token received = ${!!adminToken}`);
    results.push({ name: 'Admin Auth Login', pass });
  } catch (err) {
    console.error(`[FAIL] 4. Admin Auth Login:`, err.message);
    results.push({ name: 'Admin Auth Login', pass: false, error: err.message });
  }

  // Test 5: Admin Stats Endpoint
  try {
    const res = await request({
      path: '/api/v1/admin/stats',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const total = res.body?.data?.totalProducts;
    const pass = res.statusCode === 200 && typeof total === 'number';
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 5. Admin Stats Endpoint (HTTP ${res.statusCode}): totalProducts=${total}`);
    results.push({ name: 'Admin Stats Endpoint', pass });
  } catch (err) {
    console.error(`[FAIL] 5. Admin Stats Endpoint:`, err.message);
    results.push({ name: 'Admin Stats Endpoint', pass: false, error: err.message });
  }

  // Test 6: Product CRUD Regression & Persistence Test
  try {
    console.log('\n--- Running Product CRUD & Persistence Regression Test ---');
    const testProductPayload = {
      name: 'V1 Audit Test Compressor ' + Math.random().toString(36).substring(7),
      category: 'Piston Air Compressor',
      hp: 15,
      price: 88500,
      pressure: '12 kg/cm²',
      air_flow: '45 CFM',
      power: '11 kW',
      description: 'Audit test compressor created by automated test suite',
      features: ['Cast iron cylinders', 'Heavy-duty crankcase'],
      applications: ['Textile mills', 'Auto garages'],
      image: 'https://res.cloudinary.com/zo1rixsw/image/upload/v1786778298/aironix/products/comp2.jpg',
      inStock: true,
    };

    // 6a. Create
    const createRes = await request({
      path: '/api/v1/admin/products',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: testProductPayload,
    });
    const createdId = createRes.body?.data?.id;
    console.log(`  * Created Product: ${createdId} (status ${createRes.statusCode})`);

    // 6b. Partial Update
    const patchRes = await request({
      path: `/api/v1/admin/products/${createdId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { price: 92000 },
    });
    const updatedPrice = patchRes.body?.data?.price;
    const retainedHp = patchRes.body?.data?.hp;
    const fieldsRetained = updatedPrice === 92000 && retainedHp === 15;
    console.log(`  * Partial Update Check: Price updated to ${updatedPrice} & other fields intact (${retainedHp} HP)? ${fieldsRetained ? 'YES (PASS)' : 'NO (FAIL)'}`);

    // 6c. Verify in list
    const listRes = await request({ path: '/api/v1/products' });
    const productCountAfterAdd = listRes.body?.count;
    console.log(`  * Products list count after addition: ${productCountAfterAdd} -> ${productCountAfterAdd >= 10 ? 'PASS' : 'FAIL'}`);

    // 6d. Delete
    const delRes = await request({
      path: `/api/v1/admin/products/${createdId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`  * Cleanup deleted test product (status ${delRes.statusCode})`);

    const crudPass = createRes.statusCode === 201 && fieldsRetained && delRes.statusCode === 200;
    console.log(`[${crudPass ? 'PASS' : 'FAIL'}] 6. Product CRUD Regression & Partial Update Integrity`);
    results.push({ name: 'Product CRUD & Partial Update Integrity', pass: crudPass });
  } catch (err) {
    console.error(`[FAIL] 6. Product CRUD Regression Test:`, err.message);
    results.push({ name: 'Product CRUD Regression Test', pass: false, error: err.message });
  }

  // Test 7: Inquiry Submission & Validation
  try {
    const inquiryPayload = {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+919876543210',
      company: 'Test Industries Ltd',
      message: 'Requesting quote for 15HP Screw compressor installation.',
      product: 'Screw Air Compressor – 15 HP',
    };
    const inqRes = await request({
      path: '/api/v1/inquiries',
      method: 'POST',
      body: inquiryPayload,
    });
    const pass = inqRes.statusCode === 201 && inqRes.body?.success === true;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 7. Public Inquiries Submission (HTTP ${inqRes.statusCode}): id=${inqRes.body?.id}`);
    results.push({ name: 'Public Inquiries Submission', pass });
  } catch (err) {
    console.error(`[FAIL] 7. Public Inquiries Submission:`, err.message);
    results.push({ name: 'Public Inquiries Submission', pass: false, error: err.message });
  }

  // Test 8: Server-Side Schema Validation Rejection
  try {
    const badProductPayload = {
      name: 'X', // too short (< 2 chars)
      category: '',
      hp: -5, // invalid negative hp
      price: -100, // invalid price
    };
    const badRes = await request({
      path: '/api/v1/admin/products',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: badProductPayload,
    });
    const pass = badRes.statusCode === 400 && badRes.body?.success === false;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 8. Server-Side Validation Guard (HTTP ${badRes.statusCode} Rejection): ${badRes.body?.message}`);
    results.push({ name: 'Server-Side Schema Validation Guard', pass });
  } catch (err) {
    console.error(`[FAIL] 8. Server-Side Validation Guard:`, err.message);
    results.push({ name: 'Server-Side Schema Validation Guard', pass: false, error: err.message });
  }

  // Test 9: Strict Cloudinary Origin Security Guard
  try {
    const fakeImagePayload = {
      name: 'Security Test Compressor',
      category: 'Piston Air Compressor',
      hp: 5,
      price: 45000,
      image: 'https://untrusted-external-site.com/hacked-image.jpg', // Non-Cloudinary URL
    };
    const secRes = await request({
      path: '/api/v1/admin/products',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fakeImagePayload,
    });
    const pass = secRes.statusCode === 400 && secRes.body?.message?.includes('Cloudinary');
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 9. Strict Cloudinary Origin Security Guard (HTTP ${secRes.statusCode} Rejection): ${secRes.body?.message}`);
    results.push({ name: 'Strict Cloudinary Origin Security Guard', pass });
  } catch (err) {
    console.error(`[FAIL] 9. Strict Cloudinary Origin Security Guard:`, err.message);
    results.push({ name: 'Strict Cloudinary Origin Security Guard', pass: false, error: err.message });
  }

  // ── Company Information Tests ──────────────────────────────────────────────
  // Test 10: Public GET /api/v1/company & Field Verification
  let initialCompanyData = null;
  try {
    const res = await request({ path: '/api/v1/company' });
    initialCompanyData = res.body?.data;
    const requiredFields = ['name', 'tagline', 'phone', 'whatsapp', 'email', 'address', 'website', 'hours'];
    const allFieldsPresent = initialCompanyData && requiredFields.every((f) => initialCompanyData[f] !== undefined);
    const pass = res.statusCode === 200 && allFieldsPresent;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 10. Public Company Info Endpoint (HTTP ${res.statusCode}): all fields present: ${allFieldsPresent}`);
    results.push({ name: 'Public Company Info & Field Verification', pass });
  } catch (err) {
    console.error(`[FAIL] 10. Public Company Info:`, err.message);
    results.push({ name: 'Public Company Info & Field Verification', pass: false, error: err.message });
  }

  // Test 11: Authenticated GET /api/v1/admin/company
  try {
    const res = await request({
      path: '/api/v1/admin/company',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pass = res.statusCode === 200 && res.body?.data?.name === initialCompanyData?.name;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 11. Authenticated Admin Company GET (HTTP ${res.statusCode})`);
    results.push({ name: 'Authenticated Admin Company GET', pass });
  } catch (err) {
    console.error(`[FAIL] 11. Authenticated Admin Company GET:`, err.message);
    results.push({ name: 'Authenticated Admin Company GET', pass: false, error: err.message });
  }

  // Test 12: Authenticated PUT /api/v1/admin/company (Partial Safe Update - change ONLY phone)
  const testUpdatedPhone = '+91-99999-88888';
  try {
    const updateRes = await request({
      path: '/api/v1/admin/company',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { phone: testUpdatedPhone },
    });
    const updatedPhone = updateRes.body?.data?.phone;
    const unchangedName = updateRes.body?.data?.name === initialCompanyData?.name;
    const unchangedEmail = updateRes.body?.data?.email === initialCompanyData?.email;
    const unchangedAddress = updateRes.body?.data?.address === initialCompanyData?.address;
    const partialPass = updateRes.statusCode === 200 && updatedPhone === testUpdatedPhone && unchangedName && unchangedEmail && unchangedAddress;
    console.log(`[${partialPass ? 'PASS' : 'FAIL'}] 12. Authenticated Admin Company Partial PUT: phone updated to ${updatedPhone}, all other fields preserved: ${unchangedName && unchangedEmail}`);
    results.push({ name: 'Admin Company Partial PUT Persistence', pass: partialPass });
  } catch (err) {
    console.error(`[FAIL] 12. Admin Company Partial PUT:`, err.message);
    results.push({ name: 'Admin Company Partial PUT Persistence', pass: false, error: err.message });
  }

  // Test 13: Public GET reflection of updated company info
  try {
    const res = await request({ path: '/api/v1/company' });
    const pass = res.statusCode === 200 && res.body?.data?.phone === testUpdatedPhone;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 13. Public Endpoint Returns Updated Company Phone: ${res.body?.data?.phone}`);
    results.push({ name: 'Public API Reflects Admin Update', pass });
  } catch (err) {
    console.error(`[FAIL] 13. Public API Reflects Admin Update:`, err.message);
    results.push({ name: 'Public API Reflects Admin Update', pass: false, error: err.message });
  }

  // Test 14: Unauthenticated PUT rejection
  try {
    const res = await request({
      path: '/api/v1/admin/company',
      method: 'PUT',
      body: { phone: '+91-11111-22222' },
    });
    const pass = res.statusCode === 401;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 14. Unauthenticated Admin Company PUT Rejection (HTTP ${res.statusCode})`);
    results.push({ name: 'Unauthenticated Admin Company PUT Rejection', pass });
  } catch (err) {
    console.error(`[FAIL] 14. Unauthenticated Admin Company PUT:`, err.message);
    results.push({ name: 'Unauthenticated Admin Company PUT Rejection', pass: false, error: err.message });
  }

  // Test 15: Invalid Email & Invalid Phone Validation
  try {
    const badEmailRes = await request({
      path: '/api/v1/admin/company',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { email: 'not-an-email' },
    });
    const badPhoneRes = await request({
      path: '/api/v1/admin/company',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { phone: '12' },
    });
    const pass = badEmailRes.statusCode === 400 && badPhoneRes.statusCode === 400;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] 15. Schema Validation for Company Info (HTTP 400 on invalid email/phone)`);
    results.push({ name: 'Company Info Schema Validation Guards', pass });
  } catch (err) {
    console.error(`[FAIL] 15. Schema Validation for Company Info:`, err.message);
    results.push({ name: 'Company Info Schema Validation Guards', pass: false, error: err.message });
  }

  // Restore initial phone number for clean state
  if (initialCompanyData?.phone) {
    await request({
      path: '/api/v1/admin/company',
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { phone: initialCompanyData.phone },
    });
  }

  console.log('\n📊 Summary of Test Results:');
  console.table(results);

  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }

  const allPassed = results.every((r) => r.pass);
  if (allPassed) {
    console.log('✅ ALL PRODUCTION REGRESSION & SECURITY TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ ONE OR MORE TESTS FAILED');
    process.exit(1);
  }
}

runAudit();
