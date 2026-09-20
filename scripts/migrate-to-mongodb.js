/**
 * migrate-to-mongodb.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete, idempotent MongoDB Atlas migration & verification script for Aironix Solutions.
 * Supports:
 *   --dry-run (default): Simulates actions, reports planned changes and safety checks
 *   --apply: Executes the idempotent upsert and migration
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose');

const Product = require('../models/Product');
const CompanyInfo = require('../models/CompanyInfo');
const Inquiry = require('../models/Inquiry');
const cloudinary = require('../cloudinary');

const isApply = process.argv.includes('--apply');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const COMPANY_INFO_FILE = path.join(__dirname, '../data/company-info.json');
const INQUIRIES_FILE = path.join(__dirname, '../data/inquiries.json');

function checkUrlStatus(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, (res) => {
        resolve({ url, status: res.statusCode, ok: res.statusCode === 200 });
      });
      req.on('error', (err) => {
        resolve({ url, status: 0, ok: false, error: err.message });
      });
      req.setTimeout(12000, () => {
        req.destroy();
        resolve({ url, status: 408, ok: false, error: 'Timeout' });
      });
    } catch (err) {
      resolve({ url, status: 0, ok: false, error: err.message });
    }
  });
}

async function runMigration() {
  console.log('===============================================================');
  console.log(`🚀 AIRONIX SOLUTIONS — MONGODB ATLAS MIGRATION [${isApply ? 'APPLY MODE' : 'DRY RUN'}]`);
  console.log('===============================================================\n');

  // Step 1: Check MONGODB_URI presence
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ FAILED: MONGODB_URI is not defined in environment!');
    process.exit(1);
  }

  // Step 2: Connect to MongoDB Atlas
  let conn;
  try {
    conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connection: PASS (Host: ${conn.connection.host}, DB: ${conn.connection.name})\n`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // Step 3: Audit Source Files
  if (!fs.existsSync(PRODUCTS_FILE)) {
    console.error(`❌ Missing products source file: ${PRODUCTS_FILE}`);
    process.exit(1);
  }
  const sourceProducts = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  const sourceCompany = fs.existsSync(COMPANY_INFO_FILE) ? JSON.parse(fs.readFileSync(COMPANY_INFO_FILE, 'utf8')) : null;
  const sourceInquiries = fs.existsSync(INQUIRIES_FILE) ? JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8')) : [];

  // Step 4: Audit Existing Atlas Collections
  const existingProducts = await Product.find({}).lean();
  const existingCompany = await CompanyInfo.findOne({ key: 'primary' }).lean();
  const existingInquiries = await Inquiry.find({}).lean();

  const existingProductMap = new Map();
  existingProducts.forEach((p) => existingProductMap.set(p.id, p));

  let toInsert = 0;
  let toUpdate = 0;
  let unchanged = 0;
  const duplicateRiskIds = [];

  const seenIds = new Set();
  const seenSlugs = new Set();
  sourceProducts.forEach((sp) => {
    if (seenIds.has(sp.id)) duplicateRiskIds.push(`Duplicate ID in source: ${sp.id}`);
    if (seenSlugs.has(sp.slug)) duplicateRiskIds.push(`Duplicate Slug in source: ${sp.slug}`);
    seenIds.add(sp.id);
    seenSlugs.add(sp.slug);

    const match = existingProductMap.get(sp.id);
    if (!match) {
      toInsert++;
    } else {
      // Check if data is different
      const diff =
        match.name !== sp.name ||
        match.slug !== sp.slug ||
        match.price !== sp.price ||
        match.image !== sp.image ||
        match.hp !== sp.hp ||
        match.category !== sp.category;
      if (diff) toUpdate++;
      else unchanged++;
    }
  });

  // Step 5: Cloudinary Asset Audit
  let heroFrameCount = 0;
  let productAssetCount = 0;
  try {
    const hfRes = await cloudinary.api.resources({ type: 'upload', prefix: 'aironix/hero-frames', max_results: 150 });
    heroFrameCount = hfRes.resources.length;
    const prRes = await cloudinary.api.resources({ type: 'upload', prefix: 'aironix/products', max_results: 100 });
    productAssetCount = prRes.resources.length;
  } catch (err) {
    console.warn('⚠️ Cloudinary resource count warning:', err.message);
  }

  // Verify all source product image URLs
  console.log('🔍 Checking HTTP status of all Product Cloudinary image URLs...');
  const imageUrlChecks = await Promise.all(sourceProducts.map((p) => checkUrlStatus(p.image)));
  const brokenUrls = imageUrlChecks.filter((r) => !r.ok);

  // Step 6: Print Dry-Run Report
  console.log('---------------------------------------------------------------');
  console.log('📊 DRY RUN AUDIT REPORT');
  console.log('---------------------------------------------------------------');
  console.log(`MongoDB Connection: PASS`);
  console.log(`\nProducts:`);
  console.log(`  Source count:    ${sourceProducts.length}`);
  console.log(`  Existing Atlas:  ${existingProducts.length}`);
  console.log(`  To insert:       ${toInsert}`);
  console.log(`  To update:       ${toUpdate}`);
  console.log(`  Unchanged:       ${unchanged}`);
  console.log(`  Duplicate risk:  ${duplicateRiskIds.length > 0 ? duplicateRiskIds.join(', ') : '0 (None)'}`);

  console.log(`\nCompanyInfo:`);
  console.log(`  Source:          ${sourceCompany ? '1 (key: "primary")' : '0'}`);
  console.log(`  Existing Atlas:  ${existingCompany ? '1 (Found)' : '0 (Missing)'}`);
  console.log(`  Action:          ${!existingCompany ? 'INSERT' : 'UPDATE/VERIFY'}`);

  console.log(`\nInquiries:`);
  console.log(`  JSON records:    ${sourceInquiries.length}`);
  console.log(`  Atlas records:   ${existingInquiries.length}`);
  console.log(`  Import required: ${existingInquiries.length === 0 && sourceInquiries.length > 0 ? 'YES' : 'NO'}`);

  console.log(`\nCloudinary:`);
  console.log(`  Hero frames:     ${heroFrameCount}/90`);
  console.log(`  Product assets:  ${productAssetCount}/16`);
  console.log(`  Broken URLs:     ${brokenUrls.length}`);
  if (brokenUrls.length > 0) {
    console.error('❌ Broken URLs detected:', brokenUrls);
  }
  console.log('---------------------------------------------------------------\n');

  if (!isApply) {
    console.log('ℹ DRY RUN COMPLETED. No writes were made to Atlas.');
    console.log('ℹ Re-run with --apply to execute the database writes.');
    await mongoose.disconnect();
    return;
  }

  // Step 7: EXECUTE WRITES (APPLY MODE)
  console.log('⚡ APPLYING MIGRATION TO MONGODB ATLAS...');

  // 7a. Upsert Products
  console.log('\n1. Migrating Products...');
  let insertedCount = 0;
  let updatedCount = 0;
  for (const prod of sourceProducts) {
    const result = await Product.findOneAndUpdate(
      { id: prod.id },
      { $set: prod },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (existingProductMap.has(prod.id)) {
      updatedCount++;
    } else {
      insertedCount++;
    }
  }
  console.log(`✅ Products migration complete: ${insertedCount} inserted, ${updatedCount} verified/updated.`);

  // 7b. Upsert CompanyInfo
  console.log('\n2. Migrating CompanyInfo...');
  if (sourceCompany) {
    const compResult = await CompanyInfo.findOneAndUpdate(
      { key: 'primary' },
      { $set: sourceCompany },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ CompanyInfo primary record saved: "${compResult.name}" (${compResult.phone})`);
  }

  // 7c. Import Inquiries if Atlas collection is empty
  console.log('\n3. Checking Inquiries...');
  const currentInqCount = await Inquiry.countDocuments();
  if (currentInqCount === 0 && sourceInquiries.length > 0) {
    console.log(`ℹ Importing ${sourceInquiries.length} historical inquiries to Atlas...`);
    await Inquiry.insertMany(sourceInquiries, { ordered: false });
    console.log(`✅ Seeded ${sourceInquiries.length} inquiries to MongoDB Atlas.`);
  } else {
    console.log(`✅ Inquiry collection contains ${currentInqCount} records. Preserving live data.`);
  }

  // Step 8: Post-Migration Verification
  console.log('\n4. Post-Migration Verification...');
  const finalProductCount = await Product.countDocuments();
  const finalCompanyCount = await CompanyInfo.countDocuments();
  const finalInquiryCount = await Inquiry.countDocuments();

  const liveProducts = await Product.find({}).lean();
  const allCloudinary = liveProducts.every((p) => p.image && p.image.startsWith('https://res.cloudinary.com/'));

  console.log(`\n===============================================================`);
  console.log(`🎉 POST-MIGRATION ATLAS AUDIT VERIFICATION:`);
  console.log(`  Products count in Atlas:       ${finalProductCount} (Expected: 9)`);
  console.log(`  All products have Cloudinary:  ${allCloudinary}`);
  console.log(`  CompanyInfo primary exists:    ${finalCompanyCount >= 1}`);
  console.log(`  Inquiries count in Atlas:      ${finalInquiryCount}`);
  console.log(`===============================================================\n`);

  await mongoose.disconnect();
  console.log('✅ Migration connection closed cleanly.');
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
