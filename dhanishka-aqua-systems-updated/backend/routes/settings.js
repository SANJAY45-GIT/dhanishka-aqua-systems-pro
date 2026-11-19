const express = require("express");
const store = require("../lib/store");

const router = express.Router();
const SETTINGS_FILE = store.file("settings.json");

// Fallback used if settings.json is ever missing or corrupted, so the
// frontend always has something sensible to render.
const DEFAULT_SETTINGS = {
  companyName: "DHANISHKA AQUA SYSTEMS",
  footerTagline:
    "Serving clean water solutions with 13+ years of expertise. Your health is our priority.",
  officeName: "Madurai Office",
  addressLine1: "Ark Biscuit Complex",
  addressLine2: "Near Ilagi Readymades, Melur",
  addressLine3: "Madurai, Tamil Nadu 625106",
  phone: "+91 99422 66932",
  whatsappNumber: "919942266932",
  email: "dhanishkaaquasystems@gmail.com",
  mapLat: 10.030623,
  mapLng: 78.34021,
  mapZoom: 15,
  mapLabel: "Dhanishka Aqua Systems",
};

// Fields the admin panel is allowed to edit. Keeping this list in one
// place means both the public GET and the admin PUT stay in sync, and a
// stray/unexpected field in a PUT body can never sneak into settings.json.
const STRING_FIELDS = [
  "companyName",
  "footerTagline",
  "officeName",
  "addressLine1",
  "addressLine2",
  "addressLine3",
  "phone",
  "whatsappNumber",
  "email",
  "mapLabel",
];
const NUMBER_FIELDS = ["mapLat", "mapLng", "mapZoom"];

function readSettings() {
  const parsed = store.readJson(SETTINGS_FILE, {});
  return { ...DEFAULT_SETTINGS, ...parsed };
}

function writeSettings(next) {
  store.writeJson(SETTINGS_FILE, next);
}

// Merge only the known, valid fields from a PUT body onto the current
// settings, so a malformed request can't wipe out unrelated fields.
function mergeSettingsUpdate(body) {
  const current = readSettings();
  const next = { ...current };

  STRING_FIELDS.forEach((field) => {
    if (typeof body[field] === "string" && body[field].trim()) {
      next[field] = body[field].trim();
    }
  });

  NUMBER_FIELDS.forEach((field) => {
    if (body[field] !== undefined && body[field] !== "") {
      const num = Number(body[field]);
      const RANGES = { mapLat: [-90, 90], mapLng: [-180, 180], mapZoom: [1, 21] };
      const [lo, hi] = RANGES[field];
      if (Number.isFinite(num) && num >= lo && num <= hi) next[field] = num;
    }
  });

  // WhatsApp numbers must be digits only (country code included, no "+").
  next.whatsappNumber = String(next.whatsappNumber).replace(/\D/g, "") || DEFAULT_SETTINGS.whatsappNumber;

  return next;
}

// GET /api/settings - public site-wide content (address, phone, map
// coordinates, etc.). Every frontend page fetches this on load so the
// same admin-controlled values render everywhere instead of hardcoded
// per-page text.
router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(readSettings());
});

module.exports = router;
module.exports.readSettings = readSettings;
module.exports.writeSettings = writeSettings;
module.exports.mergeSettingsUpdate = mergeSettingsUpdate;
