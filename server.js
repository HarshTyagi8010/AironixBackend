require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const v1Router = require("./routes/v1");
const { connectDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database connection
connectDB();

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://localhost:3001,https://www.aironixsolutions.com,https://aironixsolutions.com,https://admin.aironixsolutions.com"
)
  .split(",")
  .map(origin => origin.trim());
  
console.log("Allowed origins:", ALLOWED_ORIGINS);

app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json({ limit: "10kb" }));

// ── Rate limiter ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use(limiter);

// ── Static files ──────────────────────────────────────────────────────────────
app.use("/images", express.static(path.join(__dirname, "images")));

// ── Primary Versioned API (v1) ────────────────────────────────────────────────
app.use("/api/v1", v1Router);

// ── Legacy API Route Aliases (100% Backward Compatibility) ────────────────────
app.use("/api", v1Router);

app.get("/api/health", (_, res) =>
  res.json({ version: "v1", status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() })
);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "CORS policy violation" });
  }
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`✓ API running on http://localhost:${PORT}`));
}

module.exports = app;
