const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const HERO_FRAMES_FILE = path.join(__dirname, "../data/hero-frames.json");
const IMAGES_MAPPING_FILE = path.join(__dirname, "../data/cloudinary-images.json");

/**
 * GET /api/assets/hero-frames
 * Returns the ordered array of Cloudinary URLs for the scroll animation frames.
 * Response is cacheable — frames don't change often.
 */
router.get("/hero-frames", (req, res) => {
  try {
    if (!fs.existsSync(HERO_FRAMES_FILE)) {
      return res.json({ success: true, data: [] });
    }
    const frames = JSON.parse(fs.readFileSync(HERO_FRAMES_FILE, "utf8"));
    // Cache for 1 hour — frames are static assets
    res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.json({ success: true, count: frames.filter(Boolean).length, data: frames });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load hero frames" });
  }
});

/**
 * GET /api/assets/images
 * Returns the local-path → Cloudinary-URL mapping.
 */
router.get("/images", (req, res) => {
  try {
    if (!fs.existsSync(IMAGES_MAPPING_FILE)) {
      return res.json({ success: true, data: {} });
    }
    const mapping = JSON.parse(fs.readFileSync(IMAGES_MAPPING_FILE, "utf8"));
    res.set("Cache-Control", "public, max-age=3600");
    res.json({ success: true, data: mapping });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load image mapping" });
  }
});

module.exports = router;
