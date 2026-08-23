const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Product = require("../models/Product");
const Inquiry = require("../models/Inquiry");
const { isMongoDBConnected } = require("../db");

const PRODUCTS_FILE = path.join(__dirname, "../data/products.json");
const INQUIRIES_FILE = path.join(__dirname, "../data/inquiries.json");
const JWT_SECRET = process.env.JWT_SECRET || "aac_fallback_secret";
const JWT_EXPIRES = "24h";

// ── Lazy hash admin password once on first use ──────────────────────────────
let _adminHash = null;
function getAdminHash() {
  if (!_adminHash) {
    _adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "aditya@2002", 10);
  }
  return _adminHash;
}

// ── File helpers (fallback store) ───────────────────────────────────────────
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return [];
  }
}

function readProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) {
    throw new Error("Product store file not found");
  }
  const data = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
  if (!Array.isArray(data)) {
    throw new Error("Product store is corrupt");
  }
  return data;
}

function writeJSON(filePath, data) {
  try {
    const tempPath = filePath + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Failed to atomic write JSON at ${filePath}:`, err.message);
    throw err;
  }
}

// ── AUTH ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || "adityaaircompressor@gmail.com";

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, getAdminHash());
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({ email: adminEmail, role: "admin" }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ success: true, token, email: adminEmail });
  } catch (error) {
    next(error);
  }
};

// ── STATS ────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    if (isMongoDBConnected()) {
      const totalProducts = await Product.countDocuments();
      const inStockProducts = await Product.countDocuments({ inStock: true });
      const categories = await Product.distinct("category");
      const totalInquiries = await Inquiry.countDocuments();
      const newInquiries = await Inquiry.countDocuments({ status: "new" });
      const recentInquiries = await Inquiry.find().sort({ createdAt: -1 }).limit(5).lean();

      return res.json({
        success: true,
        data: {
          totalProducts,
          totalCategories: categories.length,
          totalInquiries,
          newInquiries,
          inStockProducts,
          recentInquiries,
        },
      });
    }

    const products = readProducts();
    const inquiries = readJSON(INQUIRIES_FILE);
    const categories = [...new Set(products.map((p) => p.category))];
    const inStock = products.filter((p) => p.inStock).length;
    const newInquiries = inquiries.filter((i) => i.status === "new").length;
    res.json({
      success: true,
      data: {
        totalProducts: products.length,
        totalCategories: categories.length,
        totalInquiries: inquiries.length,
        newInquiries,
        inStockProducts: inStock,
        recentInquiries: inquiries.slice(-5).reverse(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
exports.getAllProducts = async (req, res, next) => {
  try {
    if (isMongoDBConnected()) {
      const products = await Product.find().sort({ hp: 1 }).lean();
      return res.json({ success: true, count: products.length, data: products });
    }

    const products = readProducts();
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, category, hp, pressure, air_flow, power, price, description, features, applications, image, inStock } = req.body;

    if (!name || !category || !hp || !price) {
      return res.status(400).json({ success: false, message: "name, category, hp, and price are required" });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const id = slug + "-" + uuidv4().slice(0, 6);

    const productData = {
      id,
      name: name.trim(),
      category: category.trim(),
      hp: Number(hp),
      pressure: pressure || "",
      air_flow: air_flow || "",
      power: power || "",
      price: Number(price),
      description: description || "",
      features: Array.isArray(features) ? features : (features ? String(features).split("\n").filter(Boolean) : []),
      applications: Array.isArray(applications) ? applications : (applications ? String(applications).split("\n").filter(Boolean) : []),
      image: image || "https://res.cloudinary.com/zo1rixsw/image/upload/v1786778298/aironix/products/comp2.jpg",
      inStock: inStock !== false && inStock !== "false",
      slug,
    };

    if (isMongoDBConnected()) {
      const created = await Product.create(productData);
      return res.status(201).json({ success: true, data: created });
    }

    // JSON fallback
    const products = readProducts();
    products.push(productData);
    writeJSON(PRODUCTS_FILE, products);
    res.status(201).json({ success: true, data: productData });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, hp, pressure, air_flow, power, price, description, features, applications, image, inStock } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category.trim();
    if (hp !== undefined) updates.hp = Number(hp);
    if (pressure !== undefined) updates.pressure = pressure;
    if (air_flow !== undefined) updates.air_flow = air_flow;
    if (power !== undefined) updates.power = power;
    if (price !== undefined) updates.price = Number(price);
    if (description !== undefined) updates.description = description;
    if (features !== undefined) {
      updates.features = Array.isArray(features) ? features : String(features).split("\n").filter(Boolean);
    }
    if (applications !== undefined) {
      updates.applications = Array.isArray(applications) ? applications : String(applications).split("\n").filter(Boolean);
    }
    if (image !== undefined) updates.image = image;
    if (inStock !== undefined) updates.inStock = inStock !== false && inStock !== "false";

    if (isMongoDBConnected()) {
      const updated = await Product.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
      if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
      return res.json({ success: true, data: updated });
    }

    // JSON fallback
    const products = readProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Product not found" });

    const updated = {
      ...products[idx],
      ...updates,
    };

    products[idx] = updated;
    writeJSON(PRODUCTS_FILE, products);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoDBConnected()) {
      const deleted = await Product.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ success: false, message: "Product not found" });
      return res.json({ success: true, message: "Product deleted" });
    }

    const products = readProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Product not found" });
    products.splice(idx, 1);
    writeJSON(PRODUCTS_FILE, products);
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};

// ── INQUIRIES ────────────────────────────────────────────────────────────────
exports.getAllInquiries = async (req, res, next) => {
  try {
    if (isMongoDBConnected()) {
      const inquiries = await Inquiry.find().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, count: inquiries.length, data: inquiries });
    }
    const inquiries = readJSON(INQUIRIES_FILE);
    res.json({ success: true, count: inquiries.length, data: inquiries.slice().reverse() });
  } catch (error) {
    next(error);
  }
};

exports.updateInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoDBConnected()) {
      const updated = await Inquiry.findOneAndUpdate({ id }, { $set: req.body }, { new: true }).lean();
      if (!updated) return res.status(404).json({ success: false, message: "Inquiry not found" });
      return res.json({ success: true, data: updated });
    }

    const inquiries = readJSON(INQUIRIES_FILE);
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Inquiry not found" });
    inquiries[idx] = { ...inquiries[idx], ...req.body, id: inquiries[idx].id };
    writeJSON(INQUIRIES_FILE, inquiries);
    res.json({ success: true, data: inquiries[idx] });
  } catch (error) {
    next(error);
  }
};

exports.deleteInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoDBConnected()) {
      const deleted = await Inquiry.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ success: false, message: "Inquiry not found" });
      return res.json({ success: true, message: "Inquiry deleted" });
    }

    const inquiries = readJSON(INQUIRIES_FILE);
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Inquiry not found" });
    inquiries.splice(idx, 1);
    writeJSON(INQUIRIES_FILE, inquiries);
    res.json({ success: true, message: "Inquiry deleted" });
  } catch (error) {
    next(error);
  }
};

// ── IMAGE UPLOAD (Cloudinary) ────────────────────────────────────────────────
exports.uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

  try {
    const cloudinary = require("../cloudinary");

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "aironix/products",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      const fs = require("fs");
      fs.createReadStream(req.file.path).pipe(stream);
    });

    const fs = require("fs");
    try { fs.unlinkSync(req.file.path); } catch {}

    res.json({
      success: true,
      path: result.secure_url,
      filename: result.public_id,
      url: result.secure_url,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err.message);
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
};
