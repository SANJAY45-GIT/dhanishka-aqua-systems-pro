const express = require("express");
const store = require("../lib/store");
const { notifyNewContactEntry } = require("../notify");

const router = express.Router();
const DATA_FILE = store.file("messages.json");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

const SERVICES = [
  "Industrial RO Systems",
  "Commercial Water Softeners",
  "Residential Filtration",
  "AMC & Maintenance",
  "Others",
];

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// POST /api/contact - store a new contact/inquiry submission.
// (There is intentionally NO public GET here: inquiries contain customers'
// names, emails and phone numbers, so they are only readable through the
// password-protected /api/admin/messages route.)
router.post("/", (req, res) => {
  const body = req.body || {};

  // Honeypot: real visitors never see or fill this hidden field, bots do.
  // Pretend success so the bot doesn't learn it was filtered.
  if (str(body.website, 200)) {
    return res.status(201).json({ message: "Thank you! Your message has been received." });
  }

  const name = str(body.name, 100);
  const email = str(body.email, 150);
  const phone = str(body.phone, 20);
  const message = str(body.message, 2000);
  const service = SERVICES.includes(body.service) ? body.service : "Others";

  if (!name) return res.status(400).json({ error: "Name is required." });
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: "A valid phone number is required." });
  }
  if (message.length < 5) {
    return res.status(400).json({ error: "Please tell us a little more in your message." });
  }

  const entry = {
    id: store.newId(),
    name,
    email,
    phone,
    service,
    message,
    submittedAt: new Date().toISOString(),
  };

  const messages = store.readJson(DATA_FILE);
  messages.push(entry);
  store.writeJson(DATA_FILE, messages);

  // Fire-and-forget email + WhatsApp alert (see notify.js).
  notifyNewContactEntry(entry);

  return res.status(201).json({
    message: "Thank you! Your message has been received.",
    id: entry.id,
  });
});

module.exports = router;
