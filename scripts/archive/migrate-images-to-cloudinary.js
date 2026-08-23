/**
 * migrate-images-to-cloudinary.js
 * ──────────────────────────────────
 * Idempotent migration — uploads product images to Cloudinary and updates
 * products.json with the Cloudinary URLs.
 *
 * Safe to run multiple times: it checks cloudinary-images.json for existing
 * mappings and only uploads images that haven't been uploaded yet.
 *
 * Usage:  node scripts/migrate-images-to-cloudinary.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const cloudinary = require("../cloudinary");

const IMAGES_DIR = path.join(__dirname, "../images");
const PRODUCTS_FILE = path.join(__dirname, "../data/products.json");
const MAPPING_FILE = path.join(__dirname, "../data/cloudinary-images.json");
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadMapping() {
  try {
    return JSON.parse(fs.readFileSync(MAPPING_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveMapping(mapping) {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf8");
}

async function uploadOne(filePath, folder) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    use_filename: true,
    unique_filename: false,
    overwrite: false,
    resource_type: "image",
  });
  return result.secure_url;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("── Product Image Migration to Cloudinary ──\n");

  // 1. Gather all image files
  const files = fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()));
  console.log(`Found ${files.length} images in backend/images/\n`);

  // 2. Load existing mapping (idempotent check)
  const mapping = loadMapping();
  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const localPath = `/images/${file}`;
    if (mapping[localPath]) {
      console.log(`  ✓ SKIP (already mapped): ${file}`);
      skipped++;
      continue;
    }

    try {
      const absPath = path.join(IMAGES_DIR, file);
      const url = await uploadOne(absPath, "aironix/products");
      mapping[localPath] = url;
      saveMapping(mapping); // Save after each so we don't lose progress
      console.log(`  ↑ UPLOADED: ${file} → ${url}`);
      uploaded++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${file} — ${err.message}`);
    }
  }

  console.log(`\n  Uploaded: ${uploaded}  |  Skipped: ${skipped}\n`);

  // 3. Update products.json with Cloudinary URLs
  try {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
    let updated = 0;

    for (const product of products) {
      if (product.image && mapping[product.image]) {
        product.image = mapping[product.image];
        updated++;
      }
    }

    if (updated > 0) {
      // Atomic write
      const tmpPath = PRODUCTS_FILE + ".tmp";
      fs.writeFileSync(tmpPath, JSON.stringify(products, null, 2), "utf8");
      fs.renameSync(tmpPath, PRODUCTS_FILE);
      console.log(`  Updated ${updated} product(s) in products.json\n`);
    } else {
      console.log("  No product image paths needed updating.\n");
    }
  } catch (err) {
    console.error("  Failed to update products.json:", err.message);
  }

  console.log("── Migration complete ──\n");
}

main().catch(console.error);
