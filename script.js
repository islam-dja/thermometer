// =========================
// CONFIG (عدّل هنا)
// =========================
const CONFIG = {
  currency: "DZD",
  // سعر واحد فقط (بدون باقات)
  price: { now: 7900, old: 8900 }, // عدّل الأسعار الحقيقية
  // Endpoint API للطلبات
  // تطوير: http://localhost:4008/api/orders
  // إنتاج: ضع رابط السيرفر عندك
  orderEndpoint: "http://localhost:4008/api/orders",
};

// =========================
// Helpers
// =========================
const fmt = (n) =>
  new Intl.NumberFormat("fr-FR").format(n) + " " + CONFIG.currency;

function setPrice() {
  document.getElementById("priceNow").textContent = fmt(CONFIG.price.now);
  const old = document.getElementById("priceOld");
  if (CONFIG.price.old && CONFIG.price.old > CONFIG.price.now) {
    old.textContent = fmt(CONFIG.price.old);
  } else {
    old.textContent = "";
  }
}

function getUTM() {
  const params = new URLSearchParams(location.search);
  const utmKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "ttclid",
  ];
  const utm = {};
  utmKeys.forEach((k) => {
    if (params.get(k)) utm[k] = params.get(k);
  });
  return utm;
}

function trackLead(payload) {
  try {
    if (window.fbq) fbq("track", "Lead", payload || {});
  } catch (e) {}
  try {
    if (window.ttq) ttq.track("SubmitForm", payload || {});
  } catch (e) {}
}

// =========================
// Gallery swap
// =========================
document.querySelectorAll(".thumbs img").forEach((img) => {
  img.addEventListener("click", () => {
    const main = document.getElementById("mainImage");
    const newSrc = img.getAttribute("src");
    if (!newSrc || main.getAttribute("src") === newSrc) return;
    main.style.opacity = "0";
    main.style.transition = "opacity 0.18s ease";
    const swapOnLoad = () => {
      main.style.opacity = "1";
      main.removeEventListener("load", swapOnLoad);
    };
    main.addEventListener("load", swapOnLoad);
    main.setAttribute("src", newSrc);
    main.alt = img.alt || "صورة المنتج";
  });
});

// =========================
// CTA tracking
// =========================
["heroCta", "stickyCta"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", () => {
    try {
      if (window.fbq) fbq("track", "ViewContent");
    } catch (e) {}
    try {
      if (window.ttq) ttq.track("ViewContent");
    } catch (e) {}
  });
});

// =========================
// Form logic + submit
// =========================
const form = document.getElementById("orderForm");
const success = document.getElementById("successMsg");
const errorEl = document.getElementById("errorMsg");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  success.style.display = "none";
  errorEl.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.style.opacity = ".85";

  const data = new FormData(form);
  const upsell = !!data.get("upsell");

  // API-required fields (مثل مشروعك السابق)
  const name = data.get("name")?.trim();
  const phone = data.get("phone")?.trim().replace(/[\s-]/g, "");
  const city = data.get("city")?.trim();
  const province = data.get("province");
  const delivery_type = data.get("delivery_type");
  const form_loaded_at = Number(data.get("form_loaded_at"));

  // Basic validation
  if (!name || !phone || !province || !city) {
    errorEl.textContent = "❌ يرجى إكمال: الاسم، الهاتف، الولاية، البلدية.";
    errorEl.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
    return;
  }

  // Honeypot basic check (إذا تم تعبئته => بوت)
  if ((data.get("honeypot") || "").trim().length > 0) {
    errorEl.textContent = "❌ تعذر إرسال الطلب. حاول مرة أخرى.";
    errorEl.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
    return;
  }

  const utm = getUTM();

  // Payload sent to API (نفس الشِما الموجودة عندك: name/phone/city/province/delivery_type/form_loaded_at/honeypot)
  const apiPayload = {
    name,
    phone,
    city,
    province,
    delivery_type,
    form_loaded_at,
    honeypot: "",
  };

  // Track lead conversion
  trackLead({
    value: CONFIG.price.now || 0,
    currency: CONFIG.currency,
  });

  try {
    if (CONFIG.orderEndpoint) {
      const res = await fetch(CONFIG.orderEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      if (!res.ok) {
        let msg = "Bad response";
        try {
          const json = await res.json();
          if (json?.message) msg = json.message;
        } catch (_) {}
        throw new Error(msg);
      }
    } else {
      // Demo local
      await new Promise((r) => setTimeout(r, 450));
      console.log("ORDER (demo):", {
        ...apiPayload,
        address: data.get("address")?.trim() || "",
        upsell,
        pricing: {
          unit_price: CONFIG.price.now,
          currency: CONFIG.currency,
        },
        utm,
      });
    }

    // Hide the form fields and show the full thank-you panel
    form
      .querySelectorAll(".form-grid, button[type=submit], .note")
      .forEach((el) => {
        el.style.display = "none";
      });
    success.style.display = "block";
    success.style.animation = "none";
    void success.offsetWidth; // reflow to restart animation
    success.style.animation = "";
    success.scrollIntoView({ behavior: "smooth", block: "center" });
    form.reset();

    // Refresh timing token for next submission
    document.getElementById("form_loaded_at").value = Math.floor(
      Date.now() / 1000,
    );

    location.hash = "#commande";
  } catch (err) {
    errorEl.innerHTML = "❌ حدث خطأ أعد المحاولة لاحقا";
    errorEl.style.display = "block";
    errorEl.style.animation = "none";
    void errorEl.offsetWidth;
    errorEl.style.animation = "";
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
  }
});

// =========================
// Init
// =========================
setPrice();
document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("form_loaded_at").value = Math.floor(Date.now() / 1000);

// =========================
// Scroll-reveal
// =========================
(function () {
  const targets = [
    ".feat",
    ".step",
    ".how2-step",
    ".how2-cta",
    ".section h2",
    ".section > p",
    ".faq details",
  ];
  const els = document.querySelectorAll(targets.join(","));
  els.forEach((el) => el.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
})();
