const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Inquiry = require("../models/Inquiry");
const { isMongoDBConnected } = require("../db");

const router = express.Router();
const INQUIRIES_FILE = path.join(__dirname, "../data/inquiries.json");

function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return []; }
}
function writeJSON(fp, data) {
  const tempPath = fp + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, fp);
}

router.post("/", async (req, res, next) => {
  try {
    const { name, email, phone, company, message, product } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Name, email, and message are required" });
    }

    const id = uuidv4();
    const inquiryData = {
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      company: company?.trim() || "",
      message: message.trim(),
      product: product?.trim() || "",
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

    // JSON fallback
    const inquiries = readJSON(INQUIRIES_FILE);
    inquiries.push({ ...inquiryData, createdAt: new Date().toISOString() });
    writeJSON(INQUIRIES_FILE, inquiries);

    res.status(201).json({ success: true, message: "Inquiry submitted successfully", id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
