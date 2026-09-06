const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const adminController = require("../../controllers/adminController");
const auth = require("../../middleware/auth");
const { validateProduct, validateUpload, validateCompanyInfo } = require("../../middleware/validate");

const router = express.Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } });

// ── Auth Rate Limiter (Brute-force protection) ──────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
});

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", authLimiter, adminController.login);
router.post("/login", authLimiter, adminController.login); // backward-compatible alias

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", auth, adminController.getStats);

// ── Company Info ─────────────────────────────────────────────────────────────
router.get("/company", auth, adminController.getCompanyInfo);
router.put("/company", auth, validateCompanyInfo, adminController.updateCompanyInfo);

// ── Products CRUD ────────────────────────────────────────────────────────────
router.get("/products", auth, adminController.getAllProducts);
router.post("/products", auth, validateProduct, adminController.createProduct);
router.put("/products/:id", auth, validateProduct, adminController.updateProduct);
router.delete("/products/:id", auth, adminController.deleteProduct);

// ── Inquiries ────────────────────────────────────────────────────────────────
router.get("/inquiries", auth, adminController.getAllInquiries);
router.patch("/inquiries/:id", auth, adminController.updateInquiry);
router.delete("/inquiries/:id", auth, adminController.deleteInquiry);

// ── Image Upload (Cloudinary) ────────────────────────────────────────────────
router.post("/uploads", auth, upload.single("image"), validateUpload, adminController.uploadImage);
router.post("/upload", auth, upload.single("image"), validateUpload, adminController.uploadImage); // alias

module.exports = router;
