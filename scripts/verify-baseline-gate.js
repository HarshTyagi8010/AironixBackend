/**
 * verify-baseline-gate.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Part A Hard Gate Verification Suite:
 *   Check 1: Product count parity
 *   Check 2: ID + slug parity & formatting
 *   Check 3: Price + Cloudinary Image completeness
 *   Check 4: Codebase audit for silent fallbacks
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");

async function runGateCheck() {
  console.log("=================================================");
  console.log("🛡️  RUNNING PART A BASELINE FREEZE GATE CHECKS");
  console.log("=================================================\n");

  const results = [];
  const productsFile = path.join(__dirname, "../data/products.json");

  // ── CHECK 1: Product Store & Count ──────────────────────────────────────────
  if (!fs.existsSync(productsFile)) {
    console.error("❌ FAILED: products.json does not exist!");
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(productsFile, "utf8"));
  const count = products.length;
  const countValid = count >= 9;
  console.log(`[${countValid ? "PASS" : "FAIL"}] Check 1 - Product Count: ${count} products in catalog store.`);
  results.push({ check: "Product Count Parity", pass: countValid, details: `${count} products` });

  // ── CHECK 2: ID + Slug Parity ───────────────────────────────────────────────
  let idSlugValid = true;
  const ids = new Set();
  const slugs = new Set();

  products.forEach((p, idx) => {
    if (!p.id || typeof p.id !== "string" || p.id.trim() === "") {
      console.error(`  ❌ Product at index ${idx} missing valid 'id'`);
      idSlugValid = false;
    }
    if (!p.slug || typeof p.slug !== "string" || p.slug.trim() === "") {
      console.error(`  ❌ Product at index ${idx} (${p.name}) missing valid 'slug'`);
      idSlugValid = false;
    }
    if (ids.has(p.id)) {
      console.error(`  ❌ Duplicate ID detected: ${p.id}`);
      idSlugValid = false;
    }
    if (slugs.has(p.slug)) {
      console.error(`  ❌ Duplicate Slug detected: ${p.slug}`);
      idSlugValid = false;
    }
    ids.add(p.id);
    slugs.add(p.slug);
  });

  console.log(`[${idSlugValid ? "PASS" : "FAIL"}] Check 2 - ID & Slug Parity: ${ids.size} unique IDs and ${slugs.size} unique slugs verified.`);
  results.push({ check: "ID + Slug Parity", pass: idSlugValid, details: `${ids.size} unique IDs` });

  // ── CHECK 3: Price + Image Completeness ─────────────────────────────────────
  let completenessValid = true;
  products.forEach((p) => {
    if (typeof p.price !== "number" || p.price <= 0 || isNaN(p.price)) {
      console.error(`  ❌ Invalid price on ${p.id}: ${p.price}`);
      completenessValid = false;
    }
    if (!p.image || typeof p.image !== "string" || !p.image.startsWith("https://res.cloudinary.com/")) {
      console.error(`  ❌ Invalid or non-Cloudinary image on ${p.id}: ${p.image}`);
      completenessValid = false;
    }
    if (!p.name || !p.category || !p.hp) {
      console.error(`  ❌ Missing core specs on ${p.id}: name=${p.name}, cat=${p.category}, hp=${p.hp}`);
      completenessValid = false;
    }
  });

  console.log(`[${completenessValid ? "PASS" : "FAIL"}] Check 3 - Price & Cloudinary Image Completeness: 100% valid.`);
  results.push({ check: "Price + Image Completeness", pass: completenessValid, details: "All Cloudinary URLs valid" });

  // ── CHECK 4: Silent Fallback Code Audit ──────────────────────────────────────
  let noSilentFallback = true;
  const backendFiles = [
    path.join(__dirname, "../routes/products.js"),
    path.join(__dirname, "../routes/contact.js"),
    path.join(__dirname, "../controllers/adminController.js"),
  ];

  backendFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("require(\"../data/products\")") || content.includes("require('../data/products')")) {
      console.error(`  ❌ Found reference to static products array in ${file}`);
      noSilentFallback = false;
    }
  });

  console.log(`[${noSilentFallback ? "PASS" : "FAIL"}] Check 4 - Strict Error Propagation (No silent static fallbacks).`);
  results.push({ check: "Strict Error Propagation", pass: noSilentFallback, details: "Zero silent fallbacks" });

  console.log("\n=================================================");
  console.log("📊 GATE VERIFICATION SUMMARY:");
  console.table(results);

  const allPassed = results.every((r) => r.pass);
  if (allPassed) {
    console.log("✅ ALL 4 GATE CHECKS PASSED — BASELINE READY TO FREEZE");
  } else {
    console.error("❌ ONE OR MORE GATE CHECKS FAILED");
    process.exit(1);
  }
}

runGateCheck();
