const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

const { v4: uuidv4 } = require("uuid");

// ── Image upload storage ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../images"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = uuidv4() + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only valid image files are allowed"));
    }
  },
});

const rateLimit = require("express-rate-limit");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window`
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" },
});

// ── Public ───────────────────────────────────────────────────────────────────
router.post("/login", loginLimiter, ctrl.login);

// ── Protected (all require JWT) ───────────────────────────────────────────────
router.get("/stats", auth, ctrl.getStats);

// Products
router.get("/products", auth, ctrl.getAllProducts);
router.post("/products", auth, ctrl.createProduct);
router.put("/products/:id", auth, ctrl.updateProduct);
router.delete("/products/:id", auth, ctrl.deleteProduct);

// Inquiries
router.get("/inquiries", auth, ctrl.getAllInquiries);
router.patch("/inquiries/:id", auth, ctrl.updateInquiry);
router.delete("/inquiries/:id", auth, ctrl.deleteInquiry);

// Image upload
router.post("/upload", auth, upload.single("image"), ctrl.uploadImage);

module.exports = router;
