// routes/chat.js - "Aqua Assistant", the AI chat on every page.
//
// The browser talks only to THIS route. The Anthropic API key stays on the
// server (ANTHROPIC_API_KEY in .env) and is never sent to visitors.
// If no key is configured, the route replies with a friendly fallback that
// points people to phone / WhatsApp, so the widget never looks broken.

const express = require("express");
const store = require("../lib/store");
const settingsStore = require("./settings");

const router = express.Router();

const API_URL = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

const MAX_TURNS = 12; // messages kept from the conversation
const MAX_CHARS = 800; // per visitor message

const CATEGORY_LABELS = {
  "domestic-ro": "Domestic RO Systems",
  commercial: "Commercial Plants",
  industrial: "Industrial Filtration",
};

function buildSystemPrompt() {
  const s = settingsStore.readSettings();
  const products = store.readJson(store.file("products.json"));

  const catalog = products.length
    ? products
        .map((p) => {
          const specs = (p.specs || []).map((x) => `${x.label}: ${x.value}`).join(", ");
          return `- ${p.name} [${CATEGORY_LABELS[p.category] || p.category}]${p.badge ? ` (${p.badge})` : ""}: ${p.description}${specs ? ` Specs - ${specs}.` : ""}`;
        })
        .join("\n")
    : "(No products are listed online right now.)";

  return `You are "Aqua Assistant", the friendly website assistant for ${s.companyName}, a water-treatment company in ${s.addressLine3}.

ABOUT THE BUSINESS
- ${s.footerTagline}
- Services: RO systems (domestic, commercial, industrial), water softeners, filtration, installation, annual maintenance contracts (AMC), filter replacement and water testing.
- ${s.officeName}: ${s.addressLine1}, ${s.addressLine2}, ${s.addressLine3}.
- Phone / WhatsApp: ${s.phone}. Email: ${s.email}.

PRODUCTS CURRENTLY LISTED
${catalog}

HOW TO BEHAVE
- Help visitors understand water-quality problems (hardness, high TDS, odour, taste) and pick a suitable product or service from the list above.
- Be warm, concise (usually 2-5 short sentences) and practical. Plain text only - no markdown headings or tables.
- Only state facts you were given above. Do NOT invent prices, discounts, delivery times, certifications or specifications. If you don't know, say so and offer the phone / WhatsApp number or the Contact page (contact.html) for a quote or site visit.
- Recommending a purifier from general knowledge is fine (for example: high-TDS borewell water usually needs RO; hard water benefits from a softener), but say that a water test or site visit gives the accurate answer.
- When someone is ready to buy, book a visit or get a quote, invite them to use the Contact page or WhatsApp.
- Stay on topic (water, purification, this company). Politely decline unrelated requests.
- Reply in the same language the visitor writes in.`;
}

function fallbackReply() {
  const s = settingsStore.readSettings();
  return (
    `Thanks for your message! Our assistant is taking a short break, but our team is happy to help directly - ` +
    `call or WhatsApp us on ${s.phone}, or use the Contact page for a free quote.`
  );
}

// Keep only well-formed user/assistant turns, trimmed, ending on a user turn.
function cleanMessages(input) {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS);

  // The API requires the first message to come from the user.
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  return cleaned;
}

// Merge consecutive same-role turns (the API requires strict alternation).
function alternate(messages) {
  const out = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else out.push({ ...m });
  }
  return out;
}

// POST /api/chat  { messages: [{ role: "user"|"assistant", content: "..." }] }
router.post("/", async (req, res) => {
  const messages = alternate(cleanMessages((req.body || {}).messages));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Please type a message first." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.json({ reply: fallbackReply(), ai: false });
  }

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: buildSystemPrompt(),
        messages,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`[chat] Anthropic API error ${upstream.status}: ${detail.slice(0, 300)}`);
      return res.json({ reply: fallbackReply(), ai: false });
    }

    const data = await upstream.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!reply) return res.json({ reply: fallbackReply(), ai: false });
    return res.json({ reply, ai: true });
  } catch (err) {
    console.error("[chat] Request failed:", err.message);
    return res.json({ reply: fallbackReply(), ai: false });
  }
});

module.exports = router;
