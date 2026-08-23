/**
 * update-new-frames.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Renames all `frame-XXX(1).webp` to `frame-XXX.webp` in `frames_webp/`
 * 2. Uploads all 90 new frames to Cloudinary (`aironix/hero-frames`) with `overwrite: true`
 * 3. Updates `backend/data/hero-frames.json` with the new URLs
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const cloudinary = require("../cloudinary");

const FRAMES_DIR = path.join(__dirname, "../../frames_webp");
const OUTPUT_FILE = path.join(__dirname, "../data/hero-frames.json");
const FRAME_COUNT = 90;

async function main() {
  console.log("── Processing & Uploading New Frames to Cloudinary ──\n");

  // 1. Rename any frame-XXX(1).webp over frame-XXX.webp
  const allFiles = fs.readdirSync(FRAMES_DIR);
  let replacedCount = 0;

  for (const file of allFiles) {
    if (file.includes("(1)")) {
      const srcPath = path.join(FRAMES_DIR, file);
      const destName = file.replace("(1)", "");
      const destPath = path.join(FRAMES_DIR, destName);
      fs.copyFileSync(srcPath, destPath);
      fs.unlinkSync(srcPath);
      replacedCount++;
    }
  }

  console.log(`✓ Replaced ${replacedCount} frame files with newest versions.`);

  // 2. Upload all 90 frames with overwrite: true
  const frames = new Array(FRAME_COUNT).fill(null);
  let uploaded = 0;
  const BATCH_SIZE = 6;

  for (let b = 0; b < FRAME_COUNT; b += BATCH_SIZE) {
    const batchIndices = [];
    for (let i = b; i < Math.min(b + BATCH_SIZE, FRAME_COUNT); i++) {
      batchIndices.push(i);
    }

    await Promise.all(
      batchIndices.map(async (i) => {
        const idx = i + 1;
        const name = `frame-${String(idx).padStart(3, "0")}.webp`;
        const filePath = path.join(FRAMES_DIR, name);

        if (!fs.existsSync(filePath)) {
          console.error(`  ✗ NOT FOUND: ${name}`);
          return;
        }

        try {
          const publicId = `frame-${String(idx).padStart(3, "0")}`;
          const result = await cloudinary.uploader.upload(filePath, {
            folder: "aironix/hero-frames",
            public_id: publicId,
            overwrite: true,
            invalidate: true,
            resource_type: "image",
          });
          frames[i] = result.secure_url;
          console.log(`  ↑ UPLOADED (${idx}/${FRAME_COUNT}): ${name} → ${result.secure_url}`);
          uploaded++;
        } catch (err) {
          console.error(`  ✗ FAILED: ${name} — ${err.message}`);
        }
      })
    );

    // Save progress incrementally
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(frames, null, 2), "utf8");
  }

  console.log(`\n✅ Upload complete: ${uploaded} frames updated in Cloudinary.`);
  console.log(`✅ Saved to backend/data/hero-frames.json\n`);
}

main().catch(console.error);
