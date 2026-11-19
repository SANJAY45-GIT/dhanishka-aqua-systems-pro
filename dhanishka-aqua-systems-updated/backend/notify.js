// notify.js
// Sends an email (via the Resend API) and a WhatsApp message (via the free
// CallMeBot API) whenever a new contact-form submission comes in.
//
// Both are "best effort" - if either isn't configured yet (missing API
// keys) or the request fails, we just log a warning and move on. We never
// want a notification failure to block the visitor's form submission.

const NOTIFY_EMAIL = "dhanishkaaquasystems@gmail.com";
const NOTIFY_WHATSAPP_NUMBER = "919942266932"; // 91 + 9942266932

async function sendEmailNotification(entry) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY not set - skipping email notification.");
    return;
  }

  // Resend's free tier only lets you send FROM their shared test domain
  // (onboarding@resend.dev) until you verify your own domain. That's fine
  // for receiving notifications at NOTIFY_EMAIL.
  const fromAddress = process.env.RESEND_FROM || "Dhanishka Aqua Systems <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [NOTIFY_EMAIL],
        reply_to: entry.email,
        subject: `New website inquiry from ${entry.name}`,
        text:
          `New contact form submission:\n\n` +
          `Name: ${entry.name}\n` +
          `Email: ${entry.email}\n` +
          `Phone: ${entry.phone}\n` +
          `Service: ${entry.service}\n\n` +
          `Message:\n${entry.message}\n\n` +
          `Submitted: ${entry.submittedAt}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[notify] Resend email failed (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error("[notify] Resend email error:", err.message);
  }
}

async function sendWhatsAppNotification(entry) {
  const phone = process.env.CALLMEBOT_PHONE || NOTIFY_WHATSAPP_NUMBER;
  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!apiKey) {
    console.warn("[notify] CALLMEBOT_API_KEY not set - skipping WhatsApp notification.");
    return;
  }

  const text =
    `New website inquiry!\n` +
    `Name: ${entry.name}\n` +
    `Phone: ${entry.phone}\n` +
    `Service: ${entry.service}\n` +
    `Message: ${entry.message}`;

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[notify] CallMeBot WhatsApp failed (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error("[notify] CallMeBot WhatsApp error:", err.message);
  }
}

// Fire both notifications without making the caller wait for them.
function notifyNewContactEntry(entry) {
  sendEmailNotification(entry);
  sendWhatsAppNotification(entry);
}

module.exports = { notifyNewContactEntry };
