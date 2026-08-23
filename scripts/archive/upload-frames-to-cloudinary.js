/**
 * upload-frames-to-cloudinary.js
 * ──────────────────────────────────
 * Idempotent upload of the 90 hero scroll-animation frames to Cloudinary.
 * Saves the ordered URL list to data/hero-frames.json.
 *
 * Safe to run multiple times: checks hero-frames.json for existing URLs
 * and only uploads frames that haven't been uploaded yet.
 *
 * Usage:  node scripts/upload-frames-to-cloudinary.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const cloudinary = require("../cloudinary");

const FRAMES_DIR = path.join(__dirname, "../../frames_webp");
const OUTPUT_FILE = path.join(__dirname, "../data/hero-frames.json");
const FRAME_COUNT = 90;

// ── Helpers ──────────────────────────────────────────────────────────────────
function frameName(i) {
  return `frame-${String(i).padStart(3, "0")}.webp`;
}

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
  } catch {
    return new Array(FRAME_COUNT).fill(null);
  }
}

function saveFrames(frames) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(frames, null, 2), "utf8");
}

async function uploadOne(filePath, publicId) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: "aironix/hero-frames",
    public_id: publicId,
    overwrite: false,
    resource_type: "image",
  });
  return result.secure_url;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("── Hero Frame Upload to Cloudinary ──\n");

  const frames = loadExisting();
  let uploaded = 0;
  let skipped = 0;

  // Process in batches of 6 to avoid rate limits
  const BATCH_SIZE = 6;

  for (let b = 0; b < FRAME_COUNT; b += BATCH_SIZE) {
    const batchIndices = [];
    for (let i = b; i < Math.min(b + BATCH_SIZE, FRAME_COUNT); i++) {
      batchIndices.push(i);
    }

    await Promise.all(
      batchIndices.map(async (i) => {
        const idx = i + 1; // frames are 1-indexed
        const name = frameName(idx);

        // Idempotent check
        if (frames[i]) {
          console.log(`  ✓ SKIP (already uploaded): ${name}`);
          skipped++;
          return;
        }

        const filePath = path.join(FRAMES_DIR, name);
        if (!fs.existsSync(filePath)) {
          console.error(`  ✗ NOT FOUND: ${name}`);
          return;
        }

        try {
          const publicId = `frame-${String(idx).padStart(3, "0")}`;
          const url = await uploadOne(filePath, publicId);
          frames[i] = url;
          console.log(`  ↑ UPLOADED: ${name} → ${url}`);
          uploaded++;
        } catch (err) {
          console.error(`  ✗ FAILED: ${name} — ${err.message}`);
        }
      })
    );

    // Save progress after each batch
    saveFrames(frames);
  }

  console.log(`\n  Uploaded: ${uploaded}  |  Skipped: ${skipped}`);
  console.log(`  Total frames in hero-frames.json: ${frames.filter(Boolean).length}\n`);
  console.log("── Upload complete ──\n");
}

main().catch(console.error);
