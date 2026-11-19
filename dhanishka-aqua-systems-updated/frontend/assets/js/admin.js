// Dhanishka Aqua Systems - admin page: password-gated feedback + product management

const ADMIN_API_BASE_URL = "";
const SESSION_KEY = "dhanishka_admin_token";

document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("admin-login");
  const panelSection = document.getElementById("admin-panel");
  const loginForm = document.getElementById("admin-login-form");
  const passwordInput = document.getElementById("admin-password");
  const loginSubmit = document.getElementById("admin-login-submit");
  const loginLabel = document.getElementById("admin-login-label");
  const loginStatus = document.getElementById("admin-login-status");
  const logoutBtn = document.getElementById("admin-logout");

  // Feedback tab elements
  const list = document.getElementById("admin-list");
  const countEl = document.getElementById("admin-count");
  const emptyEl = document.getElementById("admin-empty");
  const statusEl = document.getElementById("admin-status");
  const saveBar = document.getElementById("admin-savebar");
  const saveBarText = document.getElementById("admin-savebar-text");
  const saveBarUndo = document.getElementById("admin-savebar-undo");
  const saveBarSave = document.getElementById("admin-savebar-save");

  // Products tab elements
  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  const tabMessages = document.getElementById("admin-tab-messages");
  const tabFeedback = document.getElementById("admin-tab-feedback");
  const tabProducts = document.getElementById("admin-tab-products");
  const tabSettings = document.getElementById("admin-tab-settings");
  const productForm = document.getElementById("admin-product-form");
  const productSubmit = document.getElementById("product-submit");
  const productSubmitLabel = document.getElementById("product-submit-label");
  const productFormStatus = document.getElementById("product-form-status");
  const productsList = document.getElementById("admin-products-list");
  const productsCount = document.getElementById("admin-products-count");
  const productsEmpty = document.getElementById("admin-products-empty");
  const productsStatus = document.getElementById("admin-products-status");

  const CATEGORY_LABELS = {
    "domestic-ro": "Domestic RO",
    commercial: "Commercial Plants",
    industrial: "Industrial Filtration",
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function starsHtml(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
      const filled = i <= rating;
      html += `<span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' ${filled ? 1 : 0};">star</span>`;
    }
    return html;
  }

  function showPanel() {
    loginSection.classList.add("hidden");
    panelSection.classList.remove("hidden");
    loadMessages();
    loadFeedback();
    loadProducts();
    loadSettings();
  }

  function showLogin(message) {
    panelSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    if (message) {
      loginStatus.textContent = message;
      loginStatus.className = "font-body-md text-error";
      loginStatus.classList.remove("hidden");
    }
  }

  function getStoredToken() {
    return sessionStorage.getItem(SESSION_KEY) || "";
  }

  async function adminFetch(path, options = {}) {
    const res = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${getStoredToken()}`,
      },
    });
    if (res.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      showLogin("Your session expired. Please log in again.");
      throw new Error("Unauthorized");
    }
    return res;
  }

  // --- Tabs ----------------------------------------------------------------
  const TAB_PANELS = {
    messages: tabMessages,
    feedback: tabFeedback,
    products: tabProducts,
    settings: tabSettings,
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      Object.entries(TAB_PANELS).forEach(([name, panel]) => {
        panel.classList.toggle("hidden", name !== btn.dataset.tab);
      });
      tabButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("text-secondary", active);
        b.classList.toggle("border-secondary", active);
        b.classList.toggle("text-on-surface-variant", !active);
        b.classList.toggle("border-transparent", !active);
      });
      if (btn.dataset.tab === "settings") loadSettings();
      if (btn.dataset.tab === "messages") loadMessages();
    });
  });

  // --- Login -------------------------------------------------------------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = passwordInput.value;

    loginSubmit.disabled = true;
    loginLabel.textContent = "Checking...";
    loginStatus.classList.add("hidden");

    try {
      const res = await fetch(`${ADMIN_API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Incorrect password.");
      }

      sessionStorage.setItem(SESSION_KEY, data.token);
      passwordInput.value = "";
      showPanel();
    } catch (err) {
      loginStatus.textContent = err.message || "Incorrect password.";
      loginStatus.className = "font-body-md text-error";
      loginStatus.classList.remove("hidden");
    } finally {
      loginSubmit.disabled = false;
      loginLabel.textContent = "Log In";
    }
  });

  // --- Logout --------------------------------------------------------------
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  // =========================================================================
  // Inquiries (contact form submissions)
  // =========================================================================

  const messagesList = document.getElementById("admin-messages-list");
  const messagesCount = document.getElementById("admin-messages-count");
  const messagesEmpty = document.getElementById("admin-messages-empty");
  const messagesStatus = document.getElementById("admin-messages-status");
  const messagesBadge = document.getElementById("admin-messages-badge");

  function messageCardHtml(m) {
    const phoneDigits = String(m.phone || "").replace(/[^0-9]/g, "");
    return `
<div class="admin-message-card bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_12px_rgba(0,43,73,0.08)] border border-outline-variant/30 flex flex-col md:flex-row md:items-start justify-between gap-4" data-id="${escapeHtml(m.id)}">
<div class="flex-1 min-w-0">
<div class="flex flex-wrap items-center gap-2 mb-1">
<p class="font-label-md text-primary">${escapeHtml(m.name)}</p>
<span class="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-caption font-semibold">${escapeHtml(m.service || "Others")}</span>
</div>
<p class="font-body-md text-on-surface-variant mb-3 whitespace-pre-wrap break-words">${escapeHtml(m.message)}</p>
<div class="flex flex-wrap gap-x-6 gap-y-1 font-caption text-on-surface-variant">
<a class="hover:text-secondary underline-offset-2 hover:underline" href="tel:${escapeHtml(phoneDigits)}">📞 ${escapeHtml(m.phone)}</a>
<a class="hover:text-secondary underline-offset-2 hover:underline" href="mailto:${escapeHtml(m.email)}">✉️ ${escapeHtml(m.email)}</a>
<span>🕒 ${new Date(m.submittedAt).toLocaleString()}</span>
</div>
</div>
<div class="flex md:flex-col gap-2 shrink-0">
<a class="border border-secondary text-secondary px-4 py-2 rounded-lg font-label-md hover:bg-secondary hover:text-white transition-colors text-center" target="_blank" rel="noopener noreferrer" href="https://wa.me/${escapeHtml(phoneDigits)}">WhatsApp</a>
<button class="admin-delete-message-btn border border-error text-error px-4 py-2 rounded-lg font-label-md hover:bg-error hover:text-white transition-colors flex items-center justify-center gap-2" data-id="${escapeHtml(m.id)}" type="button">
<span class="material-symbols-outlined text-lg">delete</span>
                Delete
</button>
</div>
</div>`;
  }

  function updateMessagesSummary() {
    const n = messagesList.querySelectorAll(".admin-message-card").length;
    messagesCount.textContent = `${n} inquir${n === 1 ? "y" : "ies"} total`;
    messagesEmpty.classList.toggle("hidden", n > 0);
    messagesBadge.textContent = n;
    messagesBadge.classList.toggle("hidden", n === 0);
  }

  async function loadMessages() {
    messagesStatus.classList.add("hidden");
    try {
      const res = await adminFetch("/api/admin/messages");
      if (!res.ok) throw new Error("Failed to load inquiries.");
      const items = await res.json();
      messagesList.innerHTML = items.map(messageCardHtml).join("");
      updateMessagesSummary();
    } catch (err) {
      if (err.message !== "Unauthorized") {
        messagesStatus.textContent = "Couldn't load inquiries right now.";
        messagesStatus.className = "font-body-md text-error";
        messagesStatus.classList.remove("hidden");
      }
    }
  }

  messagesList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-delete-message-btn");
    if (!btn) return;
    const card = btn.closest(".admin-message-card");
    const name = card.querySelector(".font-label-md")?.textContent || "this inquiry";
    if (!confirm(`Delete the inquiry from "${name}"? This can't be undone.`)) return;

    btn.disabled = true;
    try {
      const res = await adminFetch(`/api/admin/messages/${encodeURIComponent(btn.dataset.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete.");
      card.remove();
      updateMessagesSummary();
    } catch (err) {
      if (err.message !== "Unauthorized") {
        messagesStatus.textContent = err.message || "Couldn't delete that inquiry.";
        messagesStatus.className = "font-body-md text-error";
        messagesStatus.classList.remove("hidden");
      }
      btn.disabled = false;
    }
  });

  // =========================================================================
  // Feedback (testimonials) management
  // =========================================================================

  // Reviews the user has clicked "Delete" on but not yet saved. Kept as a
  // Map(id -> original item) so "Undo All" can restore them without a
  // re-fetch, and so a page refresh before saving leaves the data untouched
  // (nothing is sent to the server until "Save Changes" is clicked).
  const pendingDeletes = new Map();

  function feedbackCardHtml(t) {
    return `
<div class="admin-feedback-card bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_12px_rgba(0,43,73,0.08)] border border-outline-variant/30 flex flex-col md:flex-row md:items-start justify-between gap-4" data-id="${escapeHtml(t.id)}">
<div class="flex-1">
<div class="flex text-secondary mb-2">${starsHtml(t.rating || 5)}</div>
<p class="font-body-md text-on-surface-variant mb-2 italic">"${escapeHtml(t.message)}"</p>
<p class="font-label-md text-primary">${escapeHtml(t.name)} <span class="font-body-md text-on-surface-variant font-normal">— ${escapeHtml(t.role || "Verified Customer")}</span></p>
${t.contact ? `<p class="font-caption text-on-surface-variant mt-1">Contact: ${escapeHtml(t.contact)}</p>` : ""}
<p class="font-caption text-on-surface-variant mt-1">Submitted: ${new Date(t.submittedAt).toLocaleString()}</p>
</div>
<button class="admin-delete-btn shrink-0 border border-error text-error px-4 py-2 rounded-lg font-label-md hover:bg-error hover:text-white transition-colors flex items-center gap-2" data-id="${escapeHtml(t.id)}" type="button">
<span class="material-symbols-outlined text-lg">delete</span>
                Delete
</button>
</div>`;
  }

  function updateSaveBar() {
    const n = pendingDeletes.size;
    saveBar.classList.toggle("hidden", n === 0);
    saveBarText.textContent = `${n} review${n === 1 ? "" : "s"} marked for deletion`;
  }

  function updateCount() {
    const remaining = list.querySelectorAll(".admin-feedback-card").length;
    countEl.textContent = `${remaining} review${remaining === 1 ? "" : "s"} total`;
    emptyEl.classList.toggle("hidden", remaining > 0);
  }

  async function loadFeedback() {
    statusEl.classList.add("hidden");
    pendingDeletes.clear();
    updateSaveBar();
    try {
      const res = await adminFetch("/api/admin/testimonials");
      if (!res.ok) throw new Error("Failed to load feedback.");
      const items = await res.json();

      countEl.textContent = `${items.length} review${items.length === 1 ? "" : "s"} total`;
      emptyEl.classList.toggle("hidden", items.length > 0);
      list.innerHTML = items.map(feedbackCardHtml).join("");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        statusEl.textContent = "Couldn't load feedback right now.";
        statusEl.className = "font-body-md text-error";
        statusEl.classList.remove("hidden");
      }
    }
  }

  // Clicking "Delete" only hides the card and marks it pending - nothing is
  // sent to the server yet. This lets the admin mark several reviews and
  // then commit them all at once with "Save Changes" (or back out with
  // "Undo All").
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-delete-btn");
    if (!btn) return;

    const id = btn.dataset.id;
    const card = btn.closest(".admin-feedback-card");

    pendingDeletes.set(id, card);
    card.classList.add("hidden");
    updateCount();
    updateSaveBar();
  });

  saveBarUndo.addEventListener("click", () => {
    pendingDeletes.forEach((card) => card.classList.remove("hidden"));
    pendingDeletes.clear();
    updateCount();
    updateSaveBar();
  });

  saveBarSave.addEventListener("click", async () => {
    if (pendingDeletes.size === 0) return;

    const ids = [...pendingDeletes.keys()];
    saveBarSave.disabled = true;
    saveBarSave.textContent = "Saving...";
    statusEl.classList.add("hidden");

    const failedIds = [];
    for (const id of ids) {
      try {
        const res = await adminFetch(`/api/admin/testimonials/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete.");
        pendingDeletes.get(id)?.remove();
        pendingDeletes.delete(id);
      } catch (err) {
        if (err.message === "Unauthorized") return; // adminFetch already redirected to login
        failedIds.push(id);
      }
    }

    updateCount();
    updateSaveBar();
    saveBarSave.disabled = false;
    saveBarSave.textContent = "Save Changes";

    if (failedIds.length > 0) {
      // Put the failed cards back on screen so nothing silently vanishes
      // from the UI without actually being saved.
      failedIds.forEach((id) => pendingDeletes.get(id)?.classList.remove("hidden"));
      statusEl.textContent = `${failedIds.length} review${failedIds.length === 1 ? "" : "s"} couldn't be saved. Please try again.`;
      statusEl.className = "font-body-md text-error";
      statusEl.classList.remove("hidden");
    } else {
      statusEl.textContent = "Changes saved.";
      statusEl.className = "font-body-md text-secondary";
      statusEl.classList.remove("hidden");
      setTimeout(() => statusEl.classList.add("hidden"), 2500);
    }
  });

  // =========================================================================
  // Products management
  // =========================================================================

  function productCardHtml(p) {
    const specsHtml = (p.specs || [])
      .map(
        (s) =>
          `<span class="inline-flex items-center gap-1 bg-surface-container-low text-on-surface-variant text-caption px-2 py-1 rounded-md mr-2 mb-1"><span class="material-symbols-outlined text-sm">${escapeHtml(s.icon || "check_circle")}</span>${escapeHtml(s.label)}: ${escapeHtml(s.value)}</span>`
      )
      .join("");

    return `
<div class="admin-product-card bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_12px_rgba(0,43,73,0.08)] border border-outline-variant/30 flex flex-col md:flex-row md:items-start justify-between gap-4" data-id="${escapeHtml(p.id)}">
<div class="flex-1">
<div class="flex items-center gap-2 mb-1">
<p class="font-label-md text-primary">${escapeHtml(p.name)}</p>
${p.badge ? `<span class="bg-secondary text-on-secondary px-2 py-0.5 rounded-full text-caption font-semibold">${escapeHtml(p.badge)}</span>` : ""}
</div>
<p class="font-caption text-on-surface-variant mb-2">${escapeHtml(CATEGORY_LABELS[p.category] || p.category)}</p>
<p class="font-body-md text-on-surface-variant mb-2">${escapeHtml(p.description)}</p>
<div class="flex flex-wrap">${specsHtml}</div>
</div>
<button class="admin-delete-product-btn shrink-0 border border-error text-error px-4 py-2 rounded-lg font-label-md hover:bg-error hover:text-white transition-colors flex items-center gap-2" data-id="${escapeHtml(p.id)}" type="button">
<span class="material-symbols-outlined text-lg">delete</span>
                Delete
</button>
</div>`;
  }

  async function loadProducts() {
    productsStatus.classList.add("hidden");
    try {
      const res = await adminFetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to load products.");
      const items = await res.json();

      productsCount.textContent = `${items.length} product${items.length === 1 ? "" : "s"} total`;
      productsEmpty.classList.toggle("hidden", items.length > 0);
      productsList.innerHTML = items.map(productCardHtml).join("");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        productsStatus.textContent = "Couldn't load products right now.";
        productsStatus.className = "font-body-md text-error";
        productsStatus.classList.remove("hidden");
      }
    }
  }

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const iconInputs = productForm.querySelectorAll(".spec-icon");
    const labelInputs = productForm.querySelectorAll(".spec-label");
    const valueInputs = productForm.querySelectorAll(".spec-value");
    const specs = [];
    for (let i = 0; i < labelInputs.length; i++) {
      const label = labelInputs[i].value.trim();
      const value = valueInputs[i].value.trim();
      if (label && value) {
        specs.push({ icon: iconInputs[i].value.trim(), label, value });
      }
    }

    const payload = {
      name: document.getElementById("product-name").value.trim(),
      category: document.getElementById("product-category").value,
      badge: document.getElementById("product-badge").value.trim(),
      imageUrl: document.getElementById("product-image").value.trim(),
      description: document.getElementById("product-description").value.trim(),
      specs,
    };

    productSubmit.disabled = true;
    productSubmitLabel.textContent = "Adding...";
    productFormStatus.classList.add("hidden");

    try {
      const res = await adminFetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product.");

      productsList.insertAdjacentHTML("afterbegin", productCardHtml(data));
      productsEmpty.classList.add("hidden");
      const total = productsList.querySelectorAll(".admin-product-card").length;
      productsCount.textContent = `${total} product${total === 1 ? "" : "s"} total`;

      productForm.reset();
      productFormStatus.textContent = "Product added and now live on the Products page.";
      productFormStatus.className = "font-body-md text-secondary";
      productFormStatus.classList.remove("hidden");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        productFormStatus.textContent = err.message || "Couldn't add that product.";
        productFormStatus.className = "font-body-md text-error";
        productFormStatus.classList.remove("hidden");
      }
    } finally {
      productSubmit.disabled = false;
      productSubmitLabel.textContent = "Add Product";
    }
  });

  productsList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-delete-product-btn");
    if (!btn) return;

    const id = btn.dataset.id;
    const card = btn.closest(".admin-product-card");
    const name = card.querySelector(".font-label-md")?.textContent || "this product";

    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;

    btn.disabled = true;
    try {
      const res = await adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete.");

      card.remove();
      const remaining = productsList.querySelectorAll(".admin-product-card").length;
      productsCount.textContent = `${remaining} product${remaining === 1 ? "" : "s"} total`;
      productsEmpty.classList.toggle("hidden", remaining > 0);
    } catch (err) {
      if (err.message !== "Unauthorized") {
        productsStatus.textContent = err.message || "Couldn't delete that product.";
        productsStatus.className = "font-body-md text-error";
        productsStatus.classList.remove("hidden");
      }
    } finally {
      btn.disabled = false;
    }
  });

  // =========================================================================
  // Site Settings management (address, phone, email, footer text, map pin)
  // =========================================================================

  const settingsForm = document.getElementById("admin-settings-form");
  const settingsSubmit = document.getElementById("settings-submit");
  const settingsSubmitLabel = document.getElementById("settings-submit-label");
  const settingsFormStatus = document.getElementById("settings-form-status");
  const settingsMapPreview = document.getElementById("settings-map-preview");

  const SETTINGS_FIELDS = [
    "companyName",
    "footerTagline",
    "officeName",
    "addressLine1",
    "addressLine2",
    "addressLine3",
    "phone",
    "whatsappNumber",
    "email",
    "mapLat",
    "mapLng",
    "mapZoom",
    "mapLabel",
  ];

  function fillSettingsForm(s) {
    SETTINGS_FIELDS.forEach((field) => {
      const input = document.getElementById(`settings-${field}`);
      if (input && s[field] !== undefined) input.value = s[field];
    });
    updateMapPreview(s);
  }

  function readSettingsForm() {
    const values = {};
    SETTINGS_FIELDS.forEach((field) => {
      const input = document.getElementById(`settings-${field}`);
      if (input) values[field] = input.value;
    });
    return values;
  }

  function updateMapPreview(s) {
    if (!s.mapLat || !s.mapLng) return;
    const label = encodeURIComponent(s.mapLabel || s.companyName || "");
    settingsMapPreview.src = `https://maps.google.com/maps?q=${s.mapLat},${s.mapLng}(${label})&z=${s.mapZoom || 15}&output=embed`;
  }

  async function loadSettings() {
    settingsFormStatus.classList.add("hidden");
    try {
      const res = await adminFetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings.");
      const s = await res.json();
      fillSettingsForm(s);
    } catch (err) {
      if (err.message !== "Unauthorized") {
        settingsFormStatus.textContent = "Couldn't load site settings right now.";
        settingsFormStatus.className = "font-body-md text-error";
        settingsFormStatus.classList.remove("hidden");
      }
    }
  }

  // Live-update the map preview as lat/lng/zoom/label are edited, without
  // waiting for a save.
  ["mapLat", "mapLng", "mapZoom", "mapLabel"].forEach((field) => {
    const input = document.getElementById(`settings-${field}`);
    if (input) input.addEventListener("input", () => updateMapPreview(readSettingsForm()));
  });

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    settingsSubmit.disabled = true;
    settingsSubmitLabel.textContent = "Saving...";
    settingsFormStatus.classList.add("hidden");

    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(readSettingsForm()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings.");

      fillSettingsForm(data);
      settingsFormStatus.textContent = "Saved. The live site now reflects these changes.";
      settingsFormStatus.className = "font-body-md text-secondary";
      settingsFormStatus.classList.remove("hidden");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        settingsFormStatus.textContent = err.message || "Couldn't save site settings.";
        settingsFormStatus.className = "font-body-md text-error";
        settingsFormStatus.classList.remove("hidden");
      }
    } finally {
      settingsSubmit.disabled = false;
      settingsSubmitLabel.textContent = "Save Changes";
    }
  });

  // --- Restore session on reload -----------------------------------------
  if (getStoredToken()) {
    showPanel();
  }
});
