const express = require("express");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");
const { isMongoDBConnected } = require("../db");

const router = express.Router();
const PRODUCTS_FILE = path.join(__dirname, "../data/products.json");

function getLocalProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) {
    throw new Error("Local products JSON store not found");
  }
  const data = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
  if (!Array.isArray(data)) {
    throw new Error("Local products JSON store is corrupted");
  }
  return data;
}

router.get("/", async (req, res, next) => {
  try {
    const { hp, category, search, minPrice, maxPrice } = req.query;

    if (isMongoDBConnected()) {
      const filter = {};
      if (hp) filter.hp = Number(hp);
      if (category) filter.category = new RegExp(`^${category}$`, "i");
      if (search) {
        filter.$or = [
          { name: new RegExp(search, "i") },
          { category: new RegExp(search, "i") },
          { description: new RegExp(search, "i") },
        ];
      }
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
      }

      const products = await Product.find(filter).sort({ hp: 1 }).lean();
      return res.json({ success: true, count: products.length, data: products });
    }

    // JSON file mode fallback
    let result = [...getLocalProducts()];
    if (hp) result = result.filter((p) => p.hp === Number(hp));
    if (category) result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (minPrice) result = result.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) result = result.filter((p) => p.price <= Number(maxPrice));

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoDBConnected()) {
      const product = await Product.findOne({ $or: [{ id }, { slug: id }] }).lean();
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });

      const related = await Product.find({
        category: product.category,
        id: { $ne: product.id },
      })
        .limit(3)
        .lean();

      return res.json({ success: true, data: product, related });
    }

    // JSON file mode fallback
    const products = getLocalProducts();
    const product = products.find((p) => p.id === id || p.slug === id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const related = products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 3);
    res.json({ success: true, data: product, related });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
