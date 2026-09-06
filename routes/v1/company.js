const express = require("express");
const adminController = require("../../controllers/adminController");

const router = express.Router();

// GET /api/v1/company (Public)
router.get("/", adminController.getCompanyInfo);

module.exports = router;
