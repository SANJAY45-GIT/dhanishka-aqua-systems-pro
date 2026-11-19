// Dhanishka Aqua Systems - products page: live product catalog

const PRODUCTS_API_BASE_URL = "";

const CATEGORY_LABELS = {
  all: "All Systems",
  "domestic-ro": "Domestic RO Systems",
  commercial: "Commercial Plants",
  industrial: "Industrial Filtration",
};

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("products-grid");
  const loadingEl = document.getElementById("products-loading");
  const emptyEl = document.getElementById("products-empty");
  const heading = document.getElementById("products-heading");
  const filterButtons = document.querySelectorAll(".product-filter-btn");

  if (!grid) return; // not on the products page

  let allProducts = [];
  let activeCategory = "all";

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function specHtml(spec) {
    return `
<div class="flex items-start gap-2">
<span class="material-symbols-outlined text-secondary text-xl">${escapeHtml(spec.icon || "check_circle")}</span>
<div>
<p class="text-caption text-outline">${escapeHtml(spec.label)}</p>
<p class="font-label-md text-primary">${escapeHtml(spec.value)}</p>
</div>
</div>`;
  }

  function cardHtml(p) {
    const imageBlock = p.imageUrl
      ? `<img class="object-contain h-full w-full drop-shadow-xl" loading="lazy" decoding="async" alt="${escapeHtml(p.name)}" src="${escapeHtml(p.imageUrl)}"/>`
      : `<span class="material-symbols-outlined text-6xl text-outline-variant">water_drop</span>`;

    return `
<article class="bg-surface-container-lowest rounded-xl shadow-[0_4px_12px_rgba(0,43,73,0.08)] overflow-hidden border border-surface-variant transition-transform duration-300 hover:-translate-y-1 flex flex-col h-full">
<div class="relative h-64 bg-surface-container-low p-6 flex items-center justify-center">
${imageBlock}
${p.badge ? `<span class="absolute top-4 right-4 bg-secondary text-on-secondary px-3 py-1 rounded-full text-caption font-semibold">${escapeHtml(p.badge)}</span>` : ""}
</div>
<div class="p-6 flex flex-col flex-grow">
<h3 class="font-headline-md text-headline-md text-primary mb-2">${escapeHtml(p.name)}</h3>
<p class="font-body-md text-body-md text-on-surface-variant mb-6 line-clamp-2">${escapeHtml(p.description)}</p>
<div class="grid grid-cols-2 gap-4 mb-6 mt-auto">
${(p.specs || []).map(specHtml).join("")}
</div>
<a class="w-full py-3 rounded-lg border-2 border-primary text-primary font-label-md hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center gap-2" href="contact.html">
                Request Quote
                <span class="material-symbols-outlined text-sm">arrow_forward</span>
</a>
<button type="button" class="ask-ai-btn mt-3 w-full py-2 rounded-lg text-secondary font-label-md hover:bg-secondary-container/40 transition-colors flex items-center justify-center gap-2" data-product="${escapeHtml(p.name)}">
<span class="material-symbols-outlined text-lg">auto_awesome</span>
                Ask our AI about this
</button>
</div>
</article>`;
  }

  function render() {
    const visible =
      activeCategory === "all"
        ? allProducts
        : allProducts.filter((p) => p.category === activeCategory);

    heading.textContent = CATEGORY_LABELS[activeCategory] || "Products";
    grid.innerHTML = visible.map(cardHtml).join("");
    emptyEl.classList.toggle("hidden", visible.length > 0);
  }

  async function loadProducts() {
    loadingEl.classList.remove("hidden");
    try {
      const res = await fetch(`${PRODUCTS_API_BASE_URL}/api/products`);
      if (!res.ok) throw new Error("Failed to load products");
      allProducts = await res.json();
    } catch (err) {
      grid.innerHTML = "";
      loadingEl.textContent = "Couldn't load products right now. Please refresh the page.";
      loadingEl.classList.remove("hidden");
      return;
    }
    loadingEl.classList.add("hidden");
    render();
  }

  // Product photos can fail (hosted elsewhere) - swap in a tidy placeholder
  // instead of a broken-image icon.
  grid.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      const ph = document.createElement("span");
      ph.className = "material-symbols-outlined text-6xl text-outline-variant";
      ph.textContent = "water_drop";
      img.replaceWith(ph);
    },
    true
  );

  // "Ask our AI about this" opens the chat widget with the question filled in.
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".ask-ai-btn");
    if (!btn || !window.AquaChat) return;
    window.AquaChat.ask(`Tell me more about the ${btn.dataset.product}. Who is it best suited for?`);
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      filterButtons.forEach((b) => {
        const isActive = b === btn;
        b.setAttribute("aria-pressed", String(isActive));
        b.classList.toggle("bg-tertiary-fixed", isActive);
        b.classList.toggle("text-on-tertiary-fixed-variant", isActive);
        b.classList.toggle("border-tertiary-fixed-dim", isActive);
        b.classList.toggle("shadow-sm", isActive);
        b.classList.toggle("bg-surface", !isActive);
        b.classList.toggle("text-on-surface-variant", !isActive);
        b.classList.toggle("border-outline-variant", !isActive);
      });
      render();
    });
  });

  loadProducts();
});
