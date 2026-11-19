// Dhanishka Aqua Systems - "Aqua Assistant" AI chat widget + floating buttons.
// Talks only to POST /api/chat on our own server (the API key never reaches the browser).

(function () {
  const API = "/api/chat";
  const STORAGE_KEY = "aqua_chat_history_v1";
  const MAX_SAVED = 20;

  const WA_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/></svg>';
  const CHAT_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 5.9 2 10.8c0 2.6 1.3 4.9 3.4 6.5L4.5 22l4.4-2.3c1 .3 2 .4 3.1.4 5.5 0 10-3.9 10-8.8S17.5 2 12 2z"/></svg>';
  const DROP_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5z"/></svg>';

  const SUGGESTIONS = [
    "Which RO purifier is best for borewell water?",
    "Do I need a water softener?",
    "How does annual maintenance work?",
  ];

  let history = [];
  try {
    history = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }

  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_SAVED)));
    } catch {}
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function init() {
    const waNumber =
      (window.siteSettings && window.siteSettings.whatsappNumber) || "919942266932";

    // ---- Floating buttons ----
    const fab = el("div");
    fab.id = "aqua-fab";

    const wa = el("a", "aqua-fab-btn aqua-fab-wa");
    wa.href = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'd like to know more about your water purification solutions.")}`;
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.setAttribute("aria-label", "Chat with us on WhatsApp");
    wa.innerHTML = WA_SVG;

    const chatBtn = el("button", "aqua-fab-btn aqua-fab-chat");
    chatBtn.type = "button";
    chatBtn.setAttribute("aria-label", "Open AI assistant");
    chatBtn.setAttribute("aria-expanded", "false");
    chatBtn.innerHTML = CHAT_SVG + '<span class="aqua-ping"></span>';

    fab.append(wa, chatBtn);

    // ---- Chat panel ----
    const panel = el("section");
    panel.id = "aqua-chat";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Aqua Assistant chat");

    const head = el("div", "aqua-chat-head");
    const avatar = el("div", "aqua-chat-avatar");
    avatar.innerHTML = DROP_SVG;
    const titles = el("div");
    titles.append(el("div", "aqua-chat-title", "Aqua Assistant"), el("div", "aqua-chat-sub", "AI water expert · online"));
    const closeBtn = el("button", "aqua-chat-close", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close chat");
    head.append(avatar, titles, closeBtn);

    const body = el("div", "aqua-chat-body");
    body.setAttribute("aria-live", "polite");

    const form = el("form", "aqua-chat-form");
    const input = el("input");
    input.type = "text";
    input.placeholder = "Ask about RO, softeners, AMC…";
    input.maxLength = 800;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Your message");
    const send = el("button", "", "Send");
    send.type = "submit";
    form.append(input, send);

    const foot = el("div", "aqua-chat-foot", "AI can make mistakes. For quotes & site visits, call or WhatsApp us.");

    panel.append(head, body, form, foot);
    document.body.append(fab, panel);

    // ---- Rendering ----
    function addMsg(role, text, extraClass) {
      const m = el("div", `aqua-msg ${role}${extraClass ? " " + extraClass : ""}`, text);
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }

    function showTyping() {
      const t = el("div", "aqua-msg bot aqua-typing");
      t.innerHTML = "<span></span><span></span><span></span>";
      t.setAttribute("aria-label", "Assistant is typing");
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
      return t;
    }

    function showChips() {
      const wrap = el("div", "aqua-chips");
      SUGGESTIONS.forEach((q) => {
        const c = el("button", "aqua-chip", q);
        c.type = "button";
        c.addEventListener("click", () => {
          wrap.remove();
          ask(q);
        });
        wrap.appendChild(c);
      });
      body.appendChild(wrap);
    }

    function greet() {
      addMsg(
        "bot",
        "Hi! 👋 I'm the Dhanishka Aqua assistant. Tell me about your water (borewell, municipal, hard, salty…) and I'll help you choose the right purifier or service."
      );
    }

    function restore() {
      if (!history.length) {
        greet();
        showChips();
        return;
      }
      history.forEach((m) => addMsg(m.role === "user" ? "user" : "bot", m.content));
    }

    let busy = false;

    async function ask(text) {
      text = (text || "").trim();
      if (!text || busy) return;
      busy = true;
      send.disabled = true;
      body.querySelectorAll(".aqua-chips").forEach((n) => n.remove());

      addMsg("user", text);
      history.push({ role: "user", content: text });
      save();
      input.value = "";

      const typing = showTyping();
      try {
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-12) }),
        });
        const data = await res.json().catch(() => ({}));
        typing.remove();

        if (!res.ok) {
          addMsg("bot", data.error || "Sorry, something went wrong. Please try again.", "err");
          history.pop(); // don't keep an unanswered question in the history
        } else {
          addMsg("bot", data.reply);
          history.push({ role: "assistant", content: data.reply });
        }
        save();
      } catch {
        typing.remove();
        addMsg("bot", "I can't reach the server right now. Please check your connection or WhatsApp us.", "err");
        history.pop();
        save();
      } finally {
        busy = false;
        send.disabled = false;
        input.focus();
      }
    }

    // ---- Open / close ----
    function open() {
      panel.classList.add("open");
      chatBtn.setAttribute("aria-expanded", "true");
      chatBtn.querySelector(".aqua-ping")?.remove();
      body.scrollTop = body.scrollHeight;
      setTimeout(() => input.focus(), 50);
    }
    function close() {
      panel.classList.remove("open");
      chatBtn.setAttribute("aria-expanded", "false");
      chatBtn.focus();
    }

    chatBtn.addEventListener("click", () => (panel.classList.contains("open") ? close() : open()));
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) close();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      ask(input.value);
    });

    restore();

    // Use the admin-configured WhatsApp number once settings arrive.
    document.addEventListener("aqua:settings", (e) => {
      const n = e.detail && e.detail.whatsappNumber;
      if (n) wa.href = `https://wa.me/${n}?text=${encodeURIComponent("Hi! I'd like to know more about your water purification solutions.")}`;
    });

    // Public hook so other scripts (e.g. product cards) can start a conversation.
    window.AquaChat = {
      open,
      ask(text) {
        open();
        ask(text);
      },
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
