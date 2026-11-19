const express = require("express");
const store = require("../lib/store");
const settingsStore = require("./settings");
const { safeEqual, issueToken, requireAdmin } = require("../lib/security");

const router = express.Router();
const TESTIMONIALS_FILE = store.file("testimonials.json");
const PRODUCTS_FILE = store.file("products.json");
const MESSAGES_FILE = store.file("messages.json");

// ---------------------------------------------------------------------
// Admin password
// Set ADMIN_PASSWORD in backend/.env (or your host's environment settings).
// For backwards compatibility the old default ("SANJAY") still works when
// running locally, but it is DISABLED when NODE_ENV=production, because a
// password written in the source code is not a secret.
// ---------------------------------------------------------------------
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || (IS_PRODUCTION ? "" : "SANJAY");

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    IS_PRODUCTION
      ? "[admin] ADMIN_PASSWORD is not set - admin login is DISABLED until you set it."
      : '[admin] ADMIN_PASSWORD is not set - using the insecure default "SANJAY". Set ADMIN_PASSWORD in .env before going live.'
  );
}

// POST /api/admin/login - exchange the password for a short-lived token
router.post("/login", (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({
      error: "Admin login is not configured. Set the ADMIN_PASSWORD environment variable.",
    });
  }
  const { password } = req.body || {};
  if (typeof password === "string" && safeEqual(password, ADMIN_PASSWORD)) {
    return res.json({ ok: true, token: issueToken() });
  }
  return res.status(401).json({ error: "Incorrect password." });
});

// Everything below this line needs a valid admin token.
router.use(requireAdmin);
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ---------------------------------------------------------------------
// Inquiries (contact form submissions)
// ---------------------------------------------------------------------
router.get("/messages", (req, res) => {
  const list = store
    .readJson(MESSAGES_FILE)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(list);
});

router.delete("/messages/:id", (req, res) => {
  const list = store.readJson(MESSAGES_FILE);
  const next = list.filter((m) => m.id !== req.params.id);
  if (next.length === list.length) {
    return res.status(404).json({ error: "Inquiry not found." });
  }
  store.writeJson(MESSAGES_FILE, next);
  res.json({ deleted: true, id: req.params.id });
});

// ---------------------------------------------------------------------
// Testimonials (customer feedback)
// ---------------------------------------------------------------------
router.get("/testimonials", (req, res) => {
  const list = store
    .readJson(TESTIMONIALS_FILE)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(list);
});

router.delete("/testimonials/:id", (req, res) => {
  const list = store.readJson(TESTIMONIALS_FILE);
  const next = list.filter((t) => t.id !== req.params.id);
  if (next.length === list.length) {
    return res.status(404).json({ error: "Feedback not found." });
  }
  store.writeJson(TESTIMONIALS_FILE, next);
  res.json({ deleted: true, id: req.params.id });
});

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------
const VALID_CATEGORIES = ["domestic-ro", "commercial", "industrial"];

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Only allow http(s) URLs or site-relative paths for product images.
function safeImageUrl(v) {
  const url = str(v, 1000);
  if (!url) return "";
  return /^(https?:\/\/|\/|assets\/)/i.test(url) ? url : null;
}

router.get("/products", (req, res) => {
  const list = store
    .readJson(PRODUCTS_FILE)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(list);
});

router.post("/products", (req, res) => {
  const { name, category, badge, description, imageUrl, specs } = req.body || {};

  const cleanName = str(name, 100);
  const cleanDesc = str(description, 600);
  const cleanImage = safeImageUrl(imageUrl);

  if (!cleanName) return res.status(400).json({ error: "Product name is required." });
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "A valid category is required." });
  }
  if (!cleanDesc) return res.status(400).json({ error: "Description is required." });
  if (cleanImage === null) {
    return res.status(400).json({ error: "Image URL must start with http:// or https://." });
  }

  const cleanSpecs = Array.isArray(specs)
    ? specs
        .filter((s) => s && str(s.label, 40) && str(s.value, 60))
        .slice(0, 4)
        .map((s) => ({
          icon: str(s.icon, 40).replace(/[^a-z0-9_]/gi, "") || "check_circle",
          label: str(s.label, 40),
          value: str(s.value, 60),
        }))
    : [];

  const entry = {
    id: store.newId(),
    name: cleanName,
    category,
    badge: str(badge, 30),
    description: cleanDesc,
    imageUrl: cleanImage,
    specs: cleanSpecs,
    submittedAt: new Date().toISOString(),
  };

  const list = store.readJson(PRODUCTS_FILE);
  list.push(entry);
  store.writeJson(PRODUCTS_FILE, list);
  res.status(201).json(entry);
});

router.delete("/products/:id", (req, res) => {
  const list = store.readJson(PRODUCTS_FILE);
  const next = list.filter((p) => p.id !== req.params.id);
  if (next.length === list.length) {
    return res.status(404).json({ error: "Product not found." });
  }
  store.writeJson(PRODUCTS_FILE, next);
  res.json({ deleted: true, id: req.params.id });
});

// ---------------------------------------------------------------------
// Site settings (address, map location, phone, email, footer text)
// ---------------------------------------------------------------------
router.get("/settings", (req, res) => {
  res.json(settingsStore.readSettings());
});

router.put("/settings", (req, res) => {
  const next = settingsStore.mergeSettingsUpdate(req.body || {});
  settingsStore.writeSettings(next);
  res.json(next);
});

module.exports = router;
