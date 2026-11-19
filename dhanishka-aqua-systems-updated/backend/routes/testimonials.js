const express = require("express");
const store = require("../lib/store");

const router = express.Router();
const DATA_FILE = store.file("testimonials.json");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// GET /api/testimonials - list all testimonials, newest first (public-safe:
// never exposes the submitter's stored contact info)
router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  const sorted = store
    .readJson(DATA_FILE)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .map(({ contact, ...publicFields }) => publicFields);
  res.json(sorted);
});

// POST /api/testimonials - submit new customer feedback
router.post("/", (req, res) => {
  const body = req.body || {};

  // Honeypot for bots (see contact.js).
  if (str(body.website, 200)) {
    return res.status(201).json({
      id: "ok",
      name: "Thank you",
      role: "Verified Customer",
      rating: 5,
      message: "Thank you for your feedback!",
      submittedAt: new Date().toISOString(),
    });
  }

  const name = str(body.name, 80);
  const contact = str(body.contact, 150);
  const message = str(body.message, 1000);

  if (!name) return res.status(400).json({ error: "Name is required." });
  if (!contact) return res.status(400).json({ error: "Contact (email or phone) is required." });
  if (!EMAIL_RE.test(contact) && !PHONE_RE.test(contact)) {
    return res.status(400).json({ error: "Enter a valid email address or phone number for contact." });
  }
  if (message.length < 5) {
    return res.status(400).json({ error: "Please write a short feedback message." });
  }

  const n = Number(body.rating);
  const rating = Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : 5;

  const entry = {
    id: store.newId(),
    name,
    // Stored for the business's follow-up; never returned by the public GET.
    contact,
    role: "Verified Customer",
    rating,
    message,
    avatarUrl: null,
    submittedAt: new Date().toISOString(),
  };

  const list = store.readJson(DATA_FILE);
  list.push(entry);
  store.writeJson(DATA_FILE, list);

  const { contact: _omit, ...publicEntry } = entry;
  res.status(201).json(publicEntry);
});

module.exports = router;
