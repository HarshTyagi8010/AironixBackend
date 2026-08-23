const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Inquiry = require("../../models/Inquiry");
const { isMongoDBConnected } = require("../../db");
const { validateInquiry } = require("../../middleware/validate");

const router = express.Router();
const INQUIRIES_FILE = path.join(__dirname, "../../data/inquiries.json");

// ── Rate limiter for customer inquiries (Anti-spam protection) ──────────────
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Inquiry submission limit reached. Please call us directly." },
});

function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return []; }
}
function writeJSON(fp, data) {
  const tempPath = fp + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, fp);
}

// POST /api/v1/inquiries (and alias for /api/v1/contact)
router.post("/", inquiryLimiter, validateInquiry, async (req, res, next) => {
  try {
    const { name, email, phone, company, message, product, city } = req.body;

    const id = uuidv4();
    const inquiryData = {
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : "",
      company: company ? company.trim() : "",
      city: city ? city.trim() : "",
      message: message.trim(),
      product: product ? product.trim() : "",
      status: "new",
    };

    if (isMongoDBConnected()) {
      const created = await Inquiry.create(inquiryData);
      return res.status(201).json({
        success: true,
        message: "Inquiry submitted successfully",
        id: created.id,
      });
    }

    // Local JSON mode
    const inquiries = readJSON(INQUIRIES_FILE);
    inquiries.push({ ...inquiryData, createdAt: new Date().toISOString() });
    writeJSON(INQUIRIES_FILE, inquiries);

    res.status(201).json({ success: true, message: "Inquiry submitted successfully", id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
