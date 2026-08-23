const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    hp: { type: Number, required: true, index: true },
    price: { type: Number, required: true },
    pressure: { type: String, default: "" },
    air_flow: { type: String, default: "" },
    power: { type: String, default: "" },
    description: { type: String, default: "" },
    features: [{ type: String }],
    applications: [{ type: String }],
    image: { type: String, required: true },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.models.Product || mongoose.model("Product", ProductSchema);
