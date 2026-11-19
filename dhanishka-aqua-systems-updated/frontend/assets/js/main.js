// Dhanishka Aqua Systems - shared frontend behaviour

// Point this at your backend when it runs on a different origin/port
// than the one serving these static files. When the backend serves this
// frontend directly (see backend/server.js), an empty string is correct.
const API_BASE_URL = "";

// Fallback WhatsApp number, only used if /api/settings can't be reached.
const CONTACT_WHATSAPP_NUMBER = "919942266932";

let siteSettings = null;

// --- Toast ------------------------------------------------------------
function showToast(message, ms = 3500) {
  let t = document.getElementById("aqua-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "aqua-toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), ms);
}
window.showToast = showToast;

// --- Site-wide settings (address, phone, email, map, footer text) -------
// Populated from /api/settings (editable in Admin > Site Settings).
function setLink(el, href, text) {
  // Turn a plain-text element into a click-to-call / click-to-email link.
  el.textContent = "";
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  a.className = "hover:underline underline-offset-2";
  el.appendChild(a);
}

async function applySiteSettings() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings`);
    if (!res.ok) return;
    const s = await res.json();
    siteSettings = s;
    window.siteSettings = s;

    const each = (key, fn) =>
      document.querySelectorAll(`[data-site="${key}"]`).forEach(fn);

    each("companyName", (el) => (el.textContent = s.companyName));
    each("footerTagline", (el) => (el.textContent = s.footerTagline));
    each("officeName", (el) => (el.textContent = s.officeName));
    each("phone", (el) => setLink(el, `tel:+${String(s.whatsappNumber).replace(/\D/g, "")}`, s.phone));
    each("email", (el) => setLink(el, `mailto:${s.email}`, s.email));
    each("addressHtml", (el) => {
      el.textContent = "";
      [s.addressLine1, s.addressLine2, s.addressLine3].forEach((line, i, arr) => {
        el.appendChild(document.createTextNode(line + (i < arr.length - 1 ? "," : "")));
        if (i < arr.length - 1) el.appendChild(document.createElement("br"));
      });
    });
    each("addressInline", (el) => {
      el.textContent = `${s.addressLine1}, ${s.addressLine2}, ${s.addressLine3}`;
    });
    each("mapEmbed", (el) => {
      const label = encodeURIComponent(s.mapLabel || s.companyName || "");
      el.src = `https://maps.google.com/maps?q=${s.mapLat},${s.mapLng}(${label})&z=${s.mapZoom || 15}&output=embed`;
    });
    each("mapLink", (el) => {
      el.href = `https://www.google.com/maps/search/?api=1&query=${s.mapLat},${s.mapLng}`;
    });
    each("whatsappLink", (el) => {
      el.href = `https://wa.me/${s.whatsappNumber}`;
    });

    document.dispatchEvent(new CustomEvent("aqua:settings", { detail: s }));
  } catch (err) {
    // Pages ship with static fallback text, so a failed fetch is harmless.
  }
}

// --- Mobile menu --------------------------------------------------------
function setupMobileMenu() {
  document
    .querySelectorAll("header button.lg\\:hidden, nav button.lg\\:hidden")
    .forEach((btn) => {
      const nav = btn.closest("nav") || btn.closest("header");
      const links = nav && nav.querySelector(".lg\\:flex");
      if (!links) return;

      const icon = btn.querySelector(".material-symbols-outlined");
      btn.setAttribute("aria-label", "Toggle navigation menu");
      btn.setAttribute("aria-expanded", "false");

      const OPEN = ["flex", "flex-col", "nav-open", "absolute", "top-full", "left-0", "w-full", "bg-surface", "p-6", "shadow-lg"];

      function setOpen(open) {
        if (open) {
          links.classList.remove("hidden");
          links.classList.add(...OPEN);
        } else {
          links.classList.remove(...OPEN);
          links.classList.add("hidden");
        }
        btn.setAttribute("aria-expanded", String(open));
        if (icon) icon.textContent = open ? "close" : "menu";
      }

      btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
      links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) setOpen(false);
      });
    });
}

// --- Scroll reveal --------------------------------------------------------
function setupReveal() {
  if (!("IntersectionObserver" in window)) return;
  const targets = [...document.querySelectorAll("main section, section")].filter(
    (s, i) => i > 0 && !s.closest("header") // keep the hero visible immediately
  );
  if (!targets.length) return;

  document.documentElement.classList.add("js-reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach((s) => {
    s.classList.add("reveal");
    io.observe(s);
  });
}

// --- Accessibility helpers -------------------------------------------------
function setupA11y() {
  // "Skip to content" link
  const main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main-content";
    if (!document.querySelector(".skip-link")) {
      const a = document.createElement("a");
      a.className = "skip-link";
      a.href = `#${main.id}`;
      a.textContent = "Skip to main content";
      document.body.prepend(a);
    }
  }
  // Mark the current page in the nav for screen readers
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("header nav a[href]").forEach((a) => {
    if (a.getAttribute("href") === here || (here === "" && a.getAttribute("href") === "index.html")) {
      a.setAttribute("aria-current", "page");
    }
  });
  // External links open safely
  document.querySelectorAll('a[target="_blank"]').forEach((a) => {
    if (!a.rel) a.rel = "noopener noreferrer";
  });
}

// --- Contact form ---------------------------------------------------------
function setupContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const submitBtn = document.getElementById("contact-submit");
  const submitLabel = document.getElementById("contact-submit-label");
  const status = document.getElementById("contact-status");

  // Honeypot field: invisible to people, tempting to bots.
  const trap = document.createElement("input");
  trap.type = "text";
  trap.name = "website";
  trap.id = "contact-website";
  trap.tabIndex = -1;
  trap.autocomplete = "off";
  trap.setAttribute("aria-hidden", "true");
  trap.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
  form.appendChild(trap);

  function setStatus(text, ok) {
    status.textContent = text;
    status.className = `font-body-md ${ok ? "text-secondary" : "text-error"}`;
    status.classList.remove("hidden");
  }

  function showSuccess(payload) {
    const number = (siteSettings && siteSettings.whatsappNumber) || CONTACT_WHATSAPP_NUMBER;
    const text = encodeURIComponent(
      `Hello, I just sent an inquiry on your website.\nName: ${payload.name}\nService: ${payload.service}\n${payload.message}`
    );

    const box = document.createElement("div");
    box.className = "form-success";
    box.setAttribute("role", "status");
    box.innerHTML = `
      <div class="tick"><span class="material-symbols-outlined" style="font-size:36px">check_circle</span></div>
      <h3 class="font-headline-md text-headline-md text-primary mb-2">Thank you, ${payload.name.replace(/[<>&"']/g, "")}!</h3>
      <p class="font-body-md text-on-surface-variant mb-6">Your inquiry has reached our team. We'll contact you shortly.<br>Need an answer right away?</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a class="bg-[#25d366] text-white px-6 py-3 rounded-lg font-label-md inline-flex items-center justify-center gap-2" target="_blank" rel="noopener noreferrer" href="https://wa.me/${number}?text=${text}">Continue on WhatsApp</a>
        <button type="button" class="border-2 border-primary text-primary px-6 py-3 rounded-lg font-label-md" data-again>Send another message</button>
      </div>`;
    form.classList.add("hidden");
    form.parentNode.insertBefore(box, form);
    box.querySelector("[data-again]").addEventListener("click", () => {
      box.remove();
      form.classList.remove("hidden");
      status.classList.add("hidden");
      form.querySelector("input")?.focus();
    });
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      service: document.getElementById("service").value,
      message: document.getElementById("message").value.trim(),
      website: trap.value,
    };

    // Friendly client-side checks (the server validates again).
    if (!payload.name) return setStatus("Please enter your name.", false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return setStatus("Please enter a valid email address.", false);
    if (!/^[0-9+\-\s()]{7,20}$/.test(payload.phone)) return setStatus("Please enter a valid phone number.", false);
    if (payload.message.length < 5) return setStatus("Please tell us a little more in your message.", false);

    submitBtn.disabled = true;
    submitLabel.textContent = "Sending...";
    status.classList.add("hidden");

    try {
      const res = await fetch(`${API_BASE_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");

      form.reset();
      showSuccess(payload);
    } catch (err) {
      const offline = err instanceof TypeError;
      setStatus(
        offline ? "We couldn't reach the server. Please check your connection or call us directly." : err.message,
        false
      );
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = "Send Message";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applySiteSettings();
  setupMobileMenu();
  setupA11y();
  setupReveal();
  setupContactForm();
});
