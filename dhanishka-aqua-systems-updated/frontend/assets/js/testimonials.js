// Dhanishka Aqua Systems - testimonials page: live customer feedback

// Point this at your backend when it runs on a different origin/port than
// the one serving these static files. When the backend serves this
// frontend directly (see backend/server.js), an empty string is correct.
const TESTIMONIALS_API_BASE_URL = "";

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("testimonials-grid");
  const loadingEl = document.getElementById("testimonials-loading");
  const emptyEl = document.getElementById("testimonials-empty");
  const form = document.getElementById("feedback-form");

  if (!grid || !form) return; // not on the testimonials page

  const AVATAR_PALETTE = [
    "#004f4f",
    "#274969",
    "#006a6a",
    "#002b49",
    "#173c30",
  ];

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function initials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("");
  }

  function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  }

  function starsHtml(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
      const filled = i <= rating;
      html += `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${filled ? 1 : 0};">star</span>`;
    }
    return html;
  }

  function avatarHtml(t) {
    if (t.avatarUrl) {
      return `<div class="w-12 h-12 rounded-full bg-surface-container-high bg-cover bg-center shrink-0" style="background-image: url('${encodeURI(String(t.avatarUrl)).replace(/'/g, "%27")}')"></div>`;
    }
    const bg = colorForName(t.name || "?");
    return `<div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-label-md shrink-0" style="background-color:${bg}">${escapeHtml(initials(t.name || "?"))}</div>`;
  }

  function cardHtml(t) {
    return `
<div class="feedback-card bg-surface-container-lowest p-md rounded-xl shadow-[0_4px_12px_rgba(0,43,73,0.08)] border border-outline-variant/30 transition-transform duration-300 hover:-translate-y-2">
<div class="flex text-secondary mb-base">${starsHtml(t.rating || 5)}</div>
<p class="font-body-md text-on-surface-variant mb-lg italic">"${escapeHtml(t.message)}"</p>
<div class="flex items-center gap-base">
${avatarHtml(t)}
<div>
<p class="font-label-md text-primary">${escapeHtml(t.name)}</p>
<p class="font-caption text-on-surface-variant">${escapeHtml(t.role || "Verified Customer")}</p>
</div>
</div>
</div>`;
  }

  function renderAll(list) {
    grid.innerHTML = list.map(cardHtml).join("");
    emptyEl.classList.toggle("hidden", list.length > 0);
  }

  function prependOne(t) {
    grid.insertAdjacentHTML("afterbegin", cardHtml(t));
    emptyEl.classList.add("hidden");
  }

  async function loadTestimonials() {
    loadingEl.classList.remove("hidden");
    try {
      const res = await fetch(`${TESTIMONIALS_API_BASE_URL}/api/testimonials`);
      if (!res.ok) throw new Error("Failed to load feedback");
      const list = await res.json();
      renderAll(list);
    } catch (err) {
      grid.innerHTML = "";
      loadingEl.textContent = "Couldn't load customer feedback right now. Please refresh the page.";
      loadingEl.classList.remove("hidden");
      return;
    }
    loadingEl.classList.add("hidden");
  }

  // --- Star rating selector -------------------------------------------
  const starButtons = document.querySelectorAll(".feedback-star");
  const ratingInput = document.getElementById("feedback-rating-value");

  function paintStars(value) {
    starButtons.forEach((btn) => {
      const filled = Number(btn.dataset.value) <= value;
      const icon = btn.querySelector(".material-symbols-outlined");
      icon.style.fontVariationSettings = `'FILL' ${filled ? 1 : 0}`;
      btn.classList.toggle("text-secondary", filled);
      btn.classList.toggle("text-outline", !filled);
    });
  }

  starButtons.forEach((btn) => {
    btn.setAttribute("aria-label", `${btn.dataset.value} star${btn.dataset.value === "1" ? "" : "s"}`);
    btn.addEventListener("click", () => {
      ratingInput.value = btn.dataset.value;
      paintStars(Number(btn.dataset.value));
    });
  });
  paintStars(Number(ratingInput.value));

  // --- Feedback form submission -----------------------------------------
  const submitBtn = document.getElementById("feedback-submit");
  const submitLabel = document.getElementById("feedback-submit-label");
  const status = document.getElementById("feedback-status");

  // Honeypot field for bots (hidden from people).
  const trap = document.createElement("input");
  trap.type = "text";
  trap.name = "website";
  trap.tabIndex = -1;
  trap.autocomplete = "off";
  trap.setAttribute("aria-hidden", "true");
  trap.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
  form.appendChild(trap);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("feedback-name").value.trim(),
      contact: document.getElementById("feedback-contact").value.trim(),
      rating: Number(ratingInput.value),
      message: document.getElementById("feedback-message").value.trim(),
      website: trap.value,
    };

    submitBtn.disabled = true;
    submitLabel.textContent = "Submitting...";
    status.classList.add("hidden");

    try {
      const res = await fetch(`${TESTIMONIALS_API_BASE_URL}/api/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      // Show the new feedback instantly, without a page reload.
      prependOne(data);

      status.textContent = "Thank you! Your feedback is now live on this page.";
      if (window.showToast) window.showToast("Thanks for sharing your feedback!");
      status.className = "font-body-md text-secondary";
      form.reset();
      ratingInput.value = "5";
      paintStars(5);
    } catch (err) {
      status.textContent = err.message || "Unable to submit your feedback right now.";
      status.className = "font-body-md text-error";
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = "Submit Feedback";
      status.classList.remove("hidden");
    }
  });

  loadTestimonials();
});
