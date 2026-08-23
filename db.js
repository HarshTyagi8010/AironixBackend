const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log("ℹ No MONGODB_URI found in environment. Running in JSON file store mode.");
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);

    // Run idempotent seeder if collection is empty
    await seedInitialData();

    return true;
  } catch (err) {
    console.error("✗ MongoDB Connection Error:", err.message);
    console.log("ℹ Falling back to local atomic JSON store.");
    return false;
  }
}

async function seedInitialData() {
  try {
    const Product = require("./models/Product");
    const count = await Product.countDocuments();

    if (count === 0) {
      console.log("ℹ MongoDB products collection is empty. Seeding initial catalog...");
      const productsPath = path.join(__dirname, "data/products.json");
      if (fs.existsSync(productsPath)) {
        const seedProducts = JSON.parse(fs.readFileSync(productsPath, "utf8"));
        if (Array.isArray(seedProducts) && seedProducts.length > 0) {
          await Product.insertMany(seedProducts);
          console.log(`✓ Seeded ${seedProducts.length} products to MongoDB.`);
        }
      }
    } else {
      console.log(`✓ MongoDB contains ${count} products. Skipping seeder (preserving live data).`);
    }
  } catch (err) {
    console.error("✗ Seeding check error:", err.message);
  }
}

module.exports = {
  connectDB,
  isMongoDBConnected: () => isConnected,
};
