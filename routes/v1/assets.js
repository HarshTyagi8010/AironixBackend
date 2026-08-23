const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const FRAMES_FILE = path.join(__dirname, "../../data/hero-frames.json");
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "zo1rixsw";

function getHeroFrames() {
  if (fs.existsSync(FRAMES_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(FRAMES_FILE, "utf8"));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {}
  }
  // Fallback to generated Cloudinary URLs
  return Array.from({ length: 90 }, (_, i) => {
    const num = String(i + 1).padStart(3, "0");
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/aironix/hero-frames/frame-${num}.webp`;
  });
}

// GET /api/v1/assets/hero-frames
router.get("/hero-frames", (req, res) => {
  const frames = getHeroFrames();
  res.json({
    success: true,
    count: frames.length,
    data: frames,
  });
});

module.exports = router;
