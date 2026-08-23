const mongoose = require("mongoose");

const InquirySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    company: { type: String, default: "" },
    city: { type: String, default: "" },
    product: { type: String, default: "" },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new" },
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

module.exports = mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
