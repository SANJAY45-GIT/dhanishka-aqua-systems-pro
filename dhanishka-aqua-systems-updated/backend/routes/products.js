const express = require("express");
const store = require("../lib/store");

const router = express.Router();
const DATA_FILE = store.file("products.json");

// GET /api/products - list all products (used by products.html and the AI assistant)
router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  const list = store
    .readJson(DATA_FILE)
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  res.json(list);
});

module.exports = router;
