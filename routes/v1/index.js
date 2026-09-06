const express = require("express");
const productsRouter = require("./products");
const inquiriesRouter = require("./inquiries");
const assetsRouter = require("./assets");
const adminRouter = require("./admin");
const companyRouter = require("./company");

const router = express.Router();

router.use("/products", productsRouter);
router.use("/inquiries", inquiriesRouter);
router.use("/contact", inquiriesRouter); // alias for backwards compatibility
router.use("/assets", assetsRouter);
router.use("/admin", adminRouter);
router.use("/company", companyRouter);

router.get("/health", (req, res) => {
  res.json({
    version: "v1",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
