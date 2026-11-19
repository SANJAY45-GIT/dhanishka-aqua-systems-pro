require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { securityHeaders, rateLimit } = require("./lib/security");
const contactRouter = require("./routes/contact");
const testimonialsRouter = require("./routes/testimonials");
const productsRouter = require("./routes/products");
const settingsRouter = require("./routes/settings");
const adminRouter = require("./routes/admin");
const chatRouter = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

// Behind a host's proxy (Render, Railway, Nginx...) the real visitor IP is in
// X-Forwarded-For. Needed so rate limiting counts each visitor separately.
app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(cors());
app.use(express.json({ limit: "20kb" }));

// ---- Rate limits (per visitor IP) ------------------------------------
const limitContact = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "You've sent several messages already. Please try again in a few minutes, or call us directly.",
});
const limitFeedback = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many feedback submissions. Please try again later.",
});
const limitLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please wait 15 minutes and try again.",
});
const limitChat = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "You're sending messages very quickly - please wait a moment.",
});

// ---- API routes -------------------------------------------------------
app.post("/api/contact", limitContact);
app.post("/api/testimonials", limitFeedback);
app.post("/api/admin/login", limitLogin);
app.use("/api/chat", limitChat);

app.use("/api/contact", contactRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/products", productsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/chat", chatRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Unknown /api paths get a JSON 404 (not an HTML page) so the frontend can
// always parse the response.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Short, memorable admin URL (in addition to /admin.html)
app.get("/admin", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "admin.html"));
});

// Static frontend. Static assets are cached for a day; HTML is always
// revalidated so content edits show up immediately.
app.use(
  express.static(FRONTEND_DIR, {
    maxAge: "1d",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  })
);

// Multi-site (not an SPA): unknown paths are a genuine 404.
app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, "404.html"));
});

// Last-resort error handler: malformed JSON, oversized bodies, bugs.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid request body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request is too large." });
  }
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

app.listen(PORT, () => {
  console.log(`Dhanishka Aqua Systems server running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[chat] ANTHROPIC_API_KEY not set - the AI assistant will show a contact fallback.");
  }
});
