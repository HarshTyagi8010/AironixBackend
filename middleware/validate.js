/**
 * Request validation middleware for API v1 (Production Hardened)
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;
const CLOUDINARY_URL_REGEX = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/.+/;

// Safe raster image MIME types strictly enforced (SVG/GIF prohibited to prevent script injection)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

exports.validateProduct = (req, res, next) => {
  const { name, category, hp, price, image } = req.body;
  const errors = [];

  if (req.method === "POST") {
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      errors.push("name is required and must be at least 2 characters");
    }
    if (!category || typeof category !== "string" || category.trim().length === 0) {
      errors.push("category is required");
    }
    if (hp === undefined || hp === null || isNaN(Number(hp)) || Number(hp) <= 0) {
      errors.push("hp must be a positive number");
    }
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) <= 0) {
      errors.push("price must be a positive number");
    }
  } else if (req.method === "PUT" || req.method === "PATCH") {
    if (name !== undefined && (typeof name !== "string" || name.trim().length < 2)) {
      errors.push("name must be at least 2 characters");
    }
    if (hp !== undefined && (isNaN(Number(hp)) || Number(hp) <= 0)) {
      errors.push("hp must be a positive number");
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) <= 0)) {
      errors.push("price must be a positive number");
    }
  }

  // Strict Cloudinary origin check for product images
  if (image !== undefined && image !== "" && typeof image === "string") {
    if (!CLOUDINARY_URL_REGEX.test(image) && !image.startsWith("/images/")) {
      errors.push("image must be a valid secure Cloudinary asset URL (https://res.cloudinary.com/...)");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors.join(", ") });
  }

  next();
};

exports.validateInquiry = (req, res, next) => {
  const { name, email, message, phone } = req.body;
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("Name is required (at least 2 characters)");
  }
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    errors.push("Valid email address is required");
  }
  if (!message || typeof message !== "string" || message.trim().length < 5) {
    errors.push("Message is required (at least 5 characters)");
  }
  if (phone && typeof phone === "string" && phone.trim().length > 0) {
    const cleanPhone = phone.replace(/\s+/g, "");
    if (!PHONE_REGEX.test(cleanPhone)) {
      errors.push("Valid phone number required");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors.join(", ") });
  }

  next();
};

exports.validateUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: `Invalid file type: ${req.file.mimetype}. Only secure raster images (JPEG, PNG, WebP) are permitted.`,
    });
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: "File size exceeds maximum allowed limit of 10MB.",
    });
  }

  next();
};

exports.validateCompanyInfo = (req, res, next) => {
  const { name, tagline, phone, whatsapp, email, address, website, hours } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      errors.push("name is required and must be at least 2 characters");
    }
  }

  if (tagline !== undefined && typeof tagline === "string" && tagline.trim().length > 200) {
    errors.push("tagline must not exceed 200 characters");
  }

  if (phone !== undefined) {
    if (!phone || typeof phone !== "string" || !PHONE_REGEX.test(phone.replace(/\s+/g, ""))) {
      errors.push("Valid phone number is required");
    }
  }

  if (whatsapp !== undefined && whatsapp !== "" && typeof whatsapp === "string") {
    if (!PHONE_REGEX.test(whatsapp.replace(/[\s+]+/g, ""))) {
      errors.push("Valid whatsapp number is required");
    }
  }

  if (email !== undefined) {
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      errors.push("Valid email address is required");
    }
  }

  if (address !== undefined) {
    if (!address || typeof address !== "string" || address.trim().length < 5) {
      errors.push("address is required and must be at least 5 characters");
    }
  }

  if (website !== undefined && website !== "" && typeof website === "string") {
    if (!/^https?:\/\/.+/.test(website.trim())) {
      errors.push("website must be a valid URL");
    }
  }

  if (hours !== undefined && typeof hours === "string" && hours.trim().length > 200) {
    errors.push("hours must not exceed 200 characters");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors.join(", ") });
  }

  next();
};
