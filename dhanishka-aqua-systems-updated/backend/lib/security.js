// lib/security.js - security headers, rate limiting and admin tokens.
// Dependency-free on purpose so the project still runs with the three
// packages already in package.json (express, cors, dotenv).

const crypto = require("crypto");

// ---------------------------------------------------------------------
// Security headers (a small, safe subset of what "helmet" would set).
// ---------------------------------------------------------------------
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.removeHeader("X-Powered-By");
  next();
}

// ---------------------------------------------------------------------
// In-memory rate limiter (per IP + per limiter name).
// ---------------------------------------------------------------------
function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Periodically drop expired entries so the map can't grow forever.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (entry.resetAt <= now) hits.delete(ip);
  }, Math.max(windowMs, 60_000));
  sweeper.unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        error: message || "Too many requests. Please wait a moment and try again.",
      });
    }
    next();
  };
}

// ---------------------------------------------------------------------
// Admin auth: password -> short-lived signed token (HMAC-SHA256).
// The password itself is never stored in the browser or sent again.
// ---------------------------------------------------------------------
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // Still do a comparison so timing doesn't reveal the length difference.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

function sign(payload) {
  return crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
}

function issueToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  if (!safeEqual(sig, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyToken(token)) {
    return res.status(401).json({ error: "Your session has expired. Please log in again." });
  }
  next();
}

module.exports = {
  securityHeaders,
  rateLimit,
  safeEqual,
  issueToken,
  verifyToken,
  requireAdmin,
};
