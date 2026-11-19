// lib/store.js - tiny JSON-file store with atomic writes.
//
// Every write goes to a temp file first and is then renamed into place.
// A rename is atomic, so a crash or two overlapping requests can never
// leave a half-written JSON file behind.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function file(name) {
  return path.join(DATA_DIR, name);
}

function readJson(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`[store] Could not parse ${path.basename(filePath)}:`, err.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { DATA_DIR, file, readJson, writeJson, newId };
