# Dhanishka Aqua Systems — Website

Corporate website (Home, About, Services, Products, Testimonials, Contact, Privacy/Terms)
with a Node/Express backend, an admin dashboard and an **AI assistant**.

## Quick start

```bash
cd backend
cp .env.example .env     # then edit .env (see "Configuration")
npm install
npm start                # http://localhost:3000   (admin: /admin)
```

Requires **Node.js 18+**.

## Configuration (`backend/.env`)

| Variable | Needed? | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | **Yes, before going live** | Admin login. The old built-in default (`SANJAY`) only works locally and is disabled when `NODE_ENV=production`. |
| `ANTHROPIC_API_KEY` | For AI answers | Powers the "Aqua Assistant" chat. Without it the chat still opens but replies with your phone/WhatsApp details. |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-haiku-5-5` (fast and low-cost). |
| `ADMIN_TOKEN_SECRET` | No | Signs admin sessions. If blank, a random one is made at each restart. |
| `RESEND_API_KEY`, `CALLMEBOT_API_KEY`, `CALLMEBOT_PHONE` | No | Email / WhatsApp alerts for new inquiries (see `.env.example`). |
| `PORT` | No | Default 3000. |

## What's in the site

- **AI assistant** (bottom-right chat button on every page): answers water-quality and product questions using your live product catalog and contact details, suggests the right system, and sends people to WhatsApp/Contact for quotes. Every product card also has **"Ask our AI about this"**. The API key stays on the server.
- **Admin dashboard** (`/admin`): **Inquiries** (contact-form messages, with call / WhatsApp / delete), **Feedback** moderation, **Products** (add/delete), **Site Settings** (address, phone, email, map).
- **Contact form**: validation, spam trap, success screen with a "Continue on WhatsApp" button, plus email/WhatsApp alerts to your team.
- **Live product catalog & customer feedback** backed by JSON files in `backend/data/`.
- Floating WhatsApp button, click-to-call / click-to-email links, mobile menu, scroll animations, skip-link and keyboard/screen-reader support, SEO + social-share tags, favicon, `robots.txt`, branded 404 page and a Privacy / Terms / Cookies page.

## API reference

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/health` | – | Health check |
| `GET /api/settings` | – | Address, phone, map, etc. |
| `GET /api/products` | – | Public catalog |
| `GET /api/testimonials` | – | Public reviews (contact info never included) |
| `POST /api/testimonials` | – | Rate-limited, validated |
| `POST /api/contact` | – | Rate-limited, validated, triggers alerts |
| `POST /api/chat` | – | AI assistant (rate-limited) |
| `POST /api/admin/login` | – | Returns a signed 8-hour token (rate-limited) |
| `GET/DELETE /api/admin/messages[/:id]` | Bearer token | Inquiries |
| `GET/DELETE /api/admin/testimonials[/:id]` | Bearer token | Feedback |
| `GET/POST/DELETE /api/admin/products[/:id]` | Bearer token | Catalog |
| `GET/PUT /api/admin/settings` | Bearer token | Site-wide content |

## Security notes

- Customer inquiries are **no longer public** (`GET /api/contact` used to list every name, email and phone number to anyone).
- Admin uses a signed, expiring token; the password is never kept in the browser. Login is rate-limited and uses a constant-time comparison.
- Public forms are rate-limited per IP and have a hidden bot trap; request size is capped; security headers are set; all JSON writes are atomic.

## Deploying

Run it anywhere Node runs (Render, Railway, a VPS…). Set the environment variables above and `NODE_ENV=production`.
**Important:** data lives in `backend/data/*.json`. On hosts with an ephemeral disk (free tiers, serverless) it is wiped on redeploy — attach a persistent disk/volume to `backend/data/`, or move to a database.

## Known follow-ups

- Product and "about" photos still load from `lh3.googleusercontent.com` (the design tool's CDN). Download them into `frontend/assets/img/` and update the paths so they can't disappear.
- Tailwind is loaded from its CDN, which is fine to launch but slower than a compiled stylesheet; compile it for best performance.
- The Testimonials page shows only real submitted reviews (the data file is currently empty).
- No sitemap yet: add `sitemap.xml` once the final domain is known.
- `privacy.html` is a sensible starting template; have it reviewed before relying on it legally.
