/* ==========================================================
   مطعم الحجي — منطق الموقع.
   بيانات التواصل في CONFIG، والمنيو في js/menu.js.
   ========================================================== */

const CONFIG = {
  name: "مطعم الحجي",
  whatsapp: "9647700240001",          // 07700240001 بالصيغة الدولية
  phoneDisplay: "0770 024 0001",
  phoneTel: "+9647700240001",
  mapUrl: "https://maps.app.goo.gl/duHoVyHKfrD1osG96",
  deliveryFee: 1000,                   // نفس أجور التوصيل في نظام الكاشير
  currency: "د.ع",
  // الأطباق المميزة: [اسم القسم، اسم الصنف]
  signature: [
    ["الشرقي", "منسف دجاج + لحم"],
    ["المشويات", "نفر كباب لحم غنم"],
    ["الكنتاكي", "كنتاكي 10 قطع عائلي"],
    ["البيتزا", "بيتزا الفصول الأربعة"],
    ["المشويات", "نفر تكه لحم غنم"],
    ["الريزو", "ريزو شاورما لحم"],
    ["الدجاج", "دجاجة مشوية"],
    ["البركر", "بركَر لحم دبل"],
  ],
};

const IMG = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;

/* ---------- أدوات ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Number(n).toLocaleString("en-US");
const money = (n) => `${fmt(n)} ${CONFIG.currency}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* التخزين غير متاح */ } },
};

/** توحيد الكتابة العربية للبحث: الهمزات، التاء المربوطة، الألف المقصورة، التشكيل، كاف/گاف. */
function norm(s) {
  return String(s)
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/گ/g, "ك").replace(/پ/g, "ب").replace(/ڤ/g, "ف")
    .toLowerCase().trim();
}

/* ---------- تجهيز المنيو ---------- */
const ITEMS = new Map(); // key -> {name, price, cat, base, size}
MENU.forEach((cat) => {
  cat.items.forEach((it, i) => {
    it.id = `${cat.id}-${i}`;
    it.cat = cat;
    it.search = norm(it.n + " " + cat.name);
    if (it.sizes) {
      it.sizes.forEach(([size, price]) =>
        ITEMS.set(`${it.id}|${size}`, { name: `${it.n} (${size})`, price, cat, item: it }));
    } else {
      ITEMS.set(it.id, { name: it.n, price: it.p, cat, item: it });
    }
  });
});
const minPrice = (it) => (it.sizes ? Math.min(...it.sizes.map((s) => s[1])) : it.p);

/** صورة مع بديل أنيق إن تعذر تحميلها. */
function imgTag(cat, cls = "", w = 900) {
  return `<img src="${IMG(cat.img, w)}" alt="${esc(cat.name)}" loading="lazy" decoding="async" class="${cls}" data-icon="${cat.icon}">`;
}
function guardImages(root = document) {
  $$("img[data-icon]", root).forEach((img) => {
    if (img.dataset.guarded) return;
    img.dataset.guarded = 1;
    const fail = () => {
      const ph = document.createElement("div");
      ph.className = "ph " + img.className;
      ph.textContent = img.dataset.icon;
      img.replaceWith(ph);
    };
    if (img.complete && img.naturalWidth === 0 && img.src) fail();
    else img.addEventListener("error", fail, { once: true });
  });
}

/* ---------- بيانات التواصل ---------- */
function waLink(text) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
}
function applyConfig() {
  $$("[data-phone]").forEach((el) => (el.textContent = CONFIG.phoneDisplay));
  $$("[data-tel]").forEach((el) => (el.href = "tel:" + CONFIG.phoneTel));
  $$("[data-map]").forEach((el) => Object.assign(el, { href: CONFIG.mapUrl, target: "_blank", rel: "noopener" }));
  $$("[data-wa]").forEach((el) =>
    Object.assign(el, { href: waLink(`السلام عليكم ${CONFIG.name} 👋`), target: "_blank", rel: "noopener" }));
  $("#year").textContent = new Date().getFullYear();
}

/* ---------- البيانات المنظمة لمحركات البحث ---------- */
function structuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: CONFIG.name,
    telephone: CONFIG.phoneTel,
    hasMap: CONFIG.mapUrl,
    servesCuisine: ["Iraqi", "Middle Eastern", "Grill", "Fast Food"],
    priceRange: "IQD",
    acceptsReservations: false,
    url: location.href.split("#")[0],
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: MENU.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: c.items.map((it) => ({
          "@type": "MenuItem",
          name: it.n,
          offers: { "@type": "Offer", price: minPrice(it), priceCurrency: "IQD" },
        })),
      })),
    },
  };
  $("#ldjson").textContent = JSON.stringify(data);
}

/* ---------- الشريط المتحرك ---------- */
function renderStrip() {
  const html = MENU.map((c) => `<a href="#cat-${c.id}">${c.icon} ${esc(c.name)}</a><i>✦</i>`).join("");
  $("#stripTrack").innerHTML = html + html;
}

/* ---------- الأطباق المميزة ---------- */
function renderSignature() {
  const rail = $("#rail");
  rail.innerHTML = CONFIG.signature
    .map(([catName, itemName]) => {
      const cat = MENU.find((c) => c.name === catName);
      const it = cat && cat.items.find((x) => x.n === itemName);
      if (!it) return "";
      return `
      <article class="dish">
        <div class="dish-img">${imgTag(cat, "", 700)}</div>
        <div class="dish-body">
          <span class="dish-cat">${cat.icon} ${esc(cat.name)}</span>
          <h3>${esc(it.n)}</h3>
          <div class="dish-foot">
            <div class="dish-price">${it.sizes ? "من " : ""}${fmt(minPrice(it))}<small>${CONFIG.currency}</small></div>
            <button class="add" data-item="${it.id}" aria-label="أضف ${esc(it.n)}">+</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
  guardImages(rail);

  // سحب بالماوس + أزرار
  let down = false, startX = 0, startScroll = 0, moved = false;
  rail.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    down = true; moved = false; startX = e.clientX; startScroll = rail.scrollLeft;
  });
  addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) { moved = true; rail.classList.add("dragging"); }
    rail.scrollLeft = startScroll - dx;
  });
  addEventListener("pointerup", () => {
    if (!down) return;
    down = false;
    setTimeout(() => rail.classList.remove("dragging"), 0);
  });
  rail.addEventListener("click", (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  const step = () => rail.querySelector(".dish")?.offsetWidth + 20 || 300;
  // في الاتجاه العربي: «التالي» يعني التمرير نحو اليسار
  $("#railNext").addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
  $("#railPrev").addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));
}

/* ---------- المنيو الكامل ---------- */
function renderChips() {
  $("#chips").innerHTML = MENU.map(
    (c) => `<button class="chip" role="tab" data-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`
  ).join("");
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const sec = document.getElementById("cat-" + b.dataset.cat);
    if (sec) sec.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
}

function itemRow(it, q) {
  const name = q ? highlight(it.n, q) : esc(it.n);
  const price = it.sizes
    ? `<span class="item-price">من ${fmt(minPrice(it))}<small>${CONFIG.currency}</small></span>
       <span class="item-sizes">${it.sizes.map((s) => `${s[0]} ${fmt(s[1])}`).join(" · ")}</span>`
    : `<span class="item-price">${fmt(it.p)}<small>${CONFIG.currency}</small></span>`;
  return `
    <div class="item" data-row="${it.id}">
      <div class="item-info">
        <div class="item-name">${name}</div>
        <div class="item-meta">${price}</div>
      </div>
      <button class="add" data-item="${it.id}" aria-label="أضف ${esc(it.n)}">+</button>
    </div>`;
}

/** تظليل كلمة البحث مع مراعاة توحيد الحروف. */
function highlight(text, q) {
  const n = norm(text);
  const i = n.indexOf(q);
  if (i < 0 || !q) return esc(text);
  // التوحيد يحذف التشكيل فقط، لذا نطابق المواقع حرفاً بحرف بعد تجاوز المحذوف
  let start = -1, end = -1, k = 0;
  for (let j = 0; j < text.length; j++) {
    if (/[ً-ْـ]/.test(text[j])) continue;
    if (k === i) start = j;
    k++;
    if (k === i + q.length) { end = j + 1; break; }
  }
  if (start < 0 || end < 0) return esc(text);
  return esc(text.slice(0, start)) + "<mark>" + esc(text.slice(start, end)) + "</mark>" + esc(text.slice(end));
}

function renderMenu(query = "") {
  const q = norm(query);
  let shown = 0;
  const html = MENU.map((cat) => {
    const items = q ? cat.items.filter((it) => it.search.includes(q)) : cat.items;
    if (!items.length) return "";
    shown += items.length;
    return `
      <section class="cat" id="cat-${cat.id}" data-cat="${cat.id}">
        <div class="cat-banner">
          ${imgTag(cat, "", 1200)}
          <div class="cat-title"><h3>${cat.icon} ${esc(cat.name)}</h3><p>${esc(cat.tag)}</p></div>
          <span class="cat-count">${items.length} صنف</span>
        </div>
        <div class="items">${items.map((it) => itemRow(it, q)).join("")}</div>
      </section>`;
  }).join("");
  $("#menuList").innerHTML = html;
  $("#noResults").hidden = shown > 0;
  $$(".chip").forEach((c) => (c.hidden = q && !document.getElementById("cat-" + c.dataset.cat)));
  guardImages($("#menuList"));
  refreshAddButtons();
  observeCats();
}

let catObserver;
function observeCats() {
  catObserver?.disconnect();
  catObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.dataset.cat;
        $$(".chip").forEach((c) => {
          const on = c.dataset.cat === id;
          c.classList.toggle("active", on);
          if (on) {
            const bar = $("#chips");
            const left = c.offsetLeft - bar.clientWidth / 2 + c.clientWidth / 2;
            bar.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
          }
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$(".cat").forEach((s) => catObserver.observe(s));
}

/* ---------- السلة ---------- */
let cart = store.get("alhaji-cart", {});
const CUSTOMER_KEY = "alhaji-customer";
let location_ = null;

function saveCart() { store.set("alhaji-cart", cart); }
function cartLines() {
  return Object.entries(cart)
    .map(([key, q]) => ({ key, q, it: ITEMS.get(key) }))
    .filter((l) => l.it && l.q > 0);
}
function orderType() { return $("#orderForm").elements.type.value; }
function totals() {
  const lines = cartLines();
  const count = lines.reduce((s, l) => s + l.q, 0);
  const sub = lines.reduce((s, l) => s + l.q * l.it.price, 0);
  const fee = orderType() === "delivery" && count ? CONFIG.deliveryFee : 0;
  return { lines, count, sub, fee, total: sub + fee };
}

function addKey(key, sourceEl) {
  cart[key] = (cart[key] || 0) + 1;
  saveCart();
  renderCart();
  const btn = $("#cartBtn");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  flyToCart(sourceEl);
  toast(`✓ أُضيف «${ITEMS.get(key).name}»`);
  if (navigator.vibrate) navigator.vibrate(15);
}
function onAdd(itemId, el) {
  const cat = MENU.find((c) => itemId.startsWith(c.id + "-") && c.items.some((x) => x.id === itemId));
  const it = cat.items.find((x) => x.id === itemId);
  if (it.sizes) return openSizes(it, el);
  addKey(it.id, el);
}
function changeQty(key, d) {
  cart[key] = (cart[key] || 0) + d;
  if (cart[key] <= 0) delete cart[key];
  saveCart();
  renderCart();
}

function refreshAddButtons() {
  const perItem = {};
  for (const [key, q] of Object.entries(cart)) {
    const id = key.split("|")[0];
    perItem[id] = (perItem[id] || 0) + q;
  }
  $$("[data-item]").forEach((b) => {
    const q = perItem[b.dataset.item];
    b.innerHTML = q ? `+ <span class="q">${q}</span>` : "+";
  });
  $$("[data-row]").forEach((r) => r.classList.toggle("in-cart", !!perItem[r.dataset.row]));
}

function renderCart() {
  const { lines, count, sub, fee, total } = totals();
  $("#cartCount").textContent = count;
  $("#cbCount").textContent = count;
  $("#cbTotal").textContent = money(total);
  $("#cartBar").hidden = !count;
  document.body.classList.toggle("has-cart", !!count);
  $("#subTotal").textContent = money(sub);
  $("#deliveryFee").textContent = money(fee);
  $("#grandTotal").textContent = money(total);
  const drawer = $("#drawer");
  drawer.classList.toggle("empty-cart", !count);
  $("#orderForm").classList.toggle("hidden", !count);

  const box = $("#cartItems");
  if (!count) {
    const last = store.get("alhaji-last-order", null);
    box.innerHTML = `<div class="empty"><div>🍽️</div>طلبك فارغ. أضف أصنافاً من المنيو.
      ${last ? `<br><br><button class="btn btn-ghost btn-sm" id="reorder">↺ أعد طلبك السابق</button>` : ""}
      <br><br><a href="#menu" class="btn btn-gold btn-sm" data-close>تصفح المنيو</a></div>`;
  } else {
    box.innerHTML = lines.map(({ key, q, it }) => `
      <div class="c-item">
        <div class="c-info"><b>${esc(it.name)}</b><span>${money(it.price * q)}</span></div>
        <div class="qty">
          <button data-qty="${esc(key)}" data-d="1" aria-label="زيادة">+</button>
          <b>${q}</b>
          <button data-qty="${esc(key)}" data-d="-1" aria-label="إنقاص">−</button>
        </div>
      </div>`).join("");
  }
  refreshAddButtons();
}

function openCart(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", String(!open));
  $("#backdrop").classList.toggle("open", open);
  document.body.classList.toggle("locked", open);
}

/* ---------- اختيار الحجم ---------- */
let sizeSource = null;
function openSizes(it, el) {
  sizeSource = el;
  $("#sizeTitle").textContent = it.n;
  $("#sizeOptions").innerHTML = it.sizes
    .map(([s, p]) => `<button class="size-opt" data-size="${esc(it.id + "|" + s)}"><span>${esc(s)}</span><b>${money(p)}</b></button>`)
    .join("");
  $("#sizeSheet").classList.add("open");
  $("#sizeSheet").setAttribute("aria-hidden", "false");
  $(".size-opt")?.focus();
}
function closeSizes() {
  $("#sizeSheet").classList.remove("open");
  $("#sizeSheet").setAttribute("aria-hidden", "true");
}

/* ---------- نموذج الطلب والإرسال ---------- */
function loadCustomer() {
  const c = store.get(CUSTOMER_KEY, {});
  const f = $("#orderForm").elements;
  ["name", "phone", "address"].forEach((k) => c[k] && (f[k].value = c[k]));
  if (c.type && f.type) f.type.value = c.type;
  syncType();
}
function syncType() {
  $("#drawer").classList.toggle("pickup", orderType() !== "delivery");
  renderCart();
}
function shareLocation() {
  const btn = $("#locBtn");
  const st = $("#locStatus");
  if (!navigator.geolocation) { st.textContent = "المتصفح لا يدعم تحديد الموقع"; return; }
  st.textContent = "جارٍ تحديد موقعك...";
  navigator.geolocation.getCurrentPosition(
    (p) => {
      location_ = { lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) };
      btn.classList.add("ok");
      btn.textContent = "✓ تم إرفاق موقعك";
      st.textContent = "سيُرسل موقعك على الخريطة مع الطلب لتسهيل التوصيل.";
    },
    () => { st.textContent = "تعذر تحديد الموقع. اسمح بالوصول للموقع أو اكتب العنوان يدوياً."; },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}
function validate() {
  const f = $("#orderForm").elements;
  const need = ["name", "phone"].concat(orderType() === "delivery" ? ["address"] : []);
  let firstBad = null;
  $$(".field").forEach((x) => x.classList.remove("error"));
  need.forEach((k) => {
    const v = f[k].value.trim();
    const bad = !v || (k === "phone" && v.replace(/\D/g, "").length < 10);
    if (bad) {
      f[k].closest(".field").classList.add("error");
      firstBad = firstBad || f[k];
    }
  });
  if (firstBad) {
    firstBad.focus();
    toast(firstBad.name === "phone" ? "أدخل رقم هاتف صحيح" : "أكمل البيانات المطلوبة");
    return false;
  }
  return true;
}
function sendOrder() {
  const { lines, sub, fee, total, count } = totals();
  if (!count) return toast("طلبك فارغ");
  if (!validate()) return;
  const f = $("#orderForm").elements;
  const type = orderType();
  const typeLabel = { delivery: "توصيل 🛵", pickup: "استلام من المطعم 🏃", dinein: "داخل المطعم 🍽️" }[type];
  const sep = "────────────";
  const msg = [
    `🧾 *طلب جديد — ${CONFIG.name}*`,
    "",
    `*نوع الطلب:* ${typeLabel}`,
    `*الاسم:* ${f.name.value.trim()}`,
    `*الهاتف:* ${f.phone.value.trim()}`,
    ...(type === "delivery" ? [`*العنوان:* ${f.address.value.trim()}`] : []),
    ...(type === "delivery" && location_ ? [`*الموقع:* https://maps.google.com/?q=${location_.lat},${location_.lng}`] : []),
    sep,
    ...lines.map((l) => `• ${l.q} × ${l.it.name} = ${fmt(l.q * l.it.price)}`),
    sep,
    `المجموع: ${money(sub)}`,
    ...(fee ? [`أجور التوصيل: ${money(fee)}`] : []),
    `*الإجمالي: ${money(total)}*`,
    ...(f.note.value.trim() ? ["", `*ملاحظات:* ${f.note.value.trim()}`] : []),
  ].join("\n");

  store.set(CUSTOMER_KEY, { name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim(), type });
  store.set("alhaji-last-order", cart);
  window.open(waLink(msg), "_blank", "noopener");

  cart = {};
  saveCart();
  f.note.value = "";
  renderCart();
  toast("✓ فُتح واتساب برسالة الطلب — اضغط إرسال لتأكيده");
}

/* ---------- حركة الإضافة إلى السلة ---------- */
function flyToCart(el) {
  if (reduceMotion || !el) return;
  const visibleTarget = $("#cartBar").offsetParent ? $("#cartBar") : $("#cartBtn");
  const t = visibleTarget.getBoundingClientRect();
  const f = el.getBoundingClientRect();
  const dot = document.createElement("div");
  Object.assign(dot.style, {
    position: "fixed", zIndex: 700, pointerEvents: "none", width: "26px", height: "26px", borderRadius: "50%",
    left: f.left + f.width / 2 - 13 + "px", top: f.top + f.height / 2 - 13 + "px",
    background: "linear-gradient(135deg,#ffe98a,#b8912a)", boxShadow: "0 0 24px #f4d35e",
  });
  document.body.appendChild(dot);
  const dx = t.left + t.width / 2 - (f.left + f.width / 2);
  const dy = t.top + t.height / 2 - (f.top + f.height / 2);
  dot.animate(
    [
      { transform: "translate(0,0) scale(1)" },
      { transform: `translate(${dx * 0.4}px, ${Math.min(dy, 0) - 90}px) scale(1.3)`, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0.4 },
    ],
    { duration: 750, easing: "cubic-bezier(.45,0,.3,1)" }
  ).finished.then(() => dot.remove());
}

let toastTimer;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------- الواجهة: تبديل الصور والدخان ---------- */
function heroSlides() {
  const slides = $$(".hero-slide");
  const dots = $("#heroDots");
  dots.innerHTML = slides.map(() => "<button tabindex='-1'></button>").join("");
  let i = 0;
  const go = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("active", k === i));
    $$("button", dots).forEach((d, k) => d.classList.toggle("active", k === i));
  };
  go(0);
  if (!reduceMotion) setInterval(() => go(i + 1), 6500);
}

function smoke() {
  const c = $("#smoke");
  if (reduceMotion) return;
  const ctx = c.getContext("2d");
  let w, h, parts = [], visible = true;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(70, (w * h) / 18000));
    parts = Array.from({ length: n }, () => spawn(true));
  };
  const spawn = (any) => ({
    x: Math.random() * w,
    y: any ? Math.random() * h : h + 20,
    r: Math.random() * 1.8 + 0.6,
    vy: Math.random() * 0.6 + 0.2,
    sway: Math.random() * Math.PI * 2,
    a: Math.random() * 0.6 + 0.3,
    gold: Math.random() < 0.7,
  });
  const tick = (t) => {
    if (visible) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.y -= p.vy;
        p.x += Math.sin(t / 1400 + p.sway) * 0.3;
        if (p.y < -20) Object.assign(p, spawn(false));
        const fade = Math.min(1, p.y / h + 0.1) * p.a;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, p.gold ? `rgba(255,220,120,${fade})` : `rgba(232,87,42,${fade})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(c);
  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
}

/* ---------- الظهور والعدادات ---------- */
function reveals() {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  const co = new IntersectionObserver((es) =>
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      co.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || "";
      const t0 = performance.now(), dur = reduceMotion ? 1 : 1500;
      (function step(now) {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    })
  );
  $$("[data-count]").forEach((el) => co.observe(el));
}

/* ---------- التمرير ---------- */
function scrolling() {
  const nav = $("#nav"), bar = $("#menuBar"), prog = $("#progress"), top = $("#toTop");
  const links = $$(".links a");
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  let lastY = scrollY, ticking = false;
  const update = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    nav.classList.toggle("scrolled", y > 20);
    const hide = y > 500 && y > lastY + 2 && !$("#links").classList.contains("open");
    if (y < lastY - 2 || y < 500) nav.classList.remove("hide");
    else if (hide) nav.classList.add("hide");
    bar.classList.toggle("top0", nav.classList.contains("hide"));
    top.classList.toggle("show", y > 800);
    let cur = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top < 160) cur = s;
    links.forEach((a) => a.classList.toggle("active", cur && a.getAttribute("href") === "#" + cur.id));
    lastY = y;
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

function magnetic() {
  if (!canHover || reduceMotion) return;
  $$(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  });
}

function mobileNav() {
  const burger = $("#burger"), links = $("#links"), nav = $("#nav");
  const set = (open) => {
    links.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    nav.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
  };
  burger.addEventListener("click", () => set(!links.classList.contains("open")));
  links.addEventListener("click", (e) => { if (e.target.tagName === "A") set(false); });
}

/* ---------- التشغيل ---------- */
document.addEventListener("DOMContentLoaded", () => {
  applyConfig();
  structuredData();
  renderStrip();
  renderSignature();
  renderChips();
  renderMenu();
  loadCustomer();
  renderCart();
  heroSlides();
  reveals();
  scrolling();
  magnetic();
  mobileNav();
  smoke();

  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderMenu(e.target.value);
      if (e.target.value.trim()) {
        const y = $("#menuBar").getBoundingClientRect().top;
        if (y > 80) $("#menu").scrollIntoView({ behavior: "smooth" });
      }
    }, 160);
  });

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-item]");
    if (add) return onAdd(add.dataset.item, add);
    const q = e.target.closest("[data-qty]");
    if (q) return changeQty(q.dataset.qty, +q.dataset.d);
    const size = e.target.closest("[data-size]");
    if (size) { closeSizes(); return addKey(size.dataset.size, sizeSource); }
    if (e.target.closest("#reorder")) {
      cart = { ...store.get("alhaji-last-order", {}) };
      saveCart(); renderCart(); toast("✓ أُعيد طلبك السابق");
      return;
    }
    if (e.target.closest("[data-close]")) openCart(false);
  });
  $("#sizeSheet").addEventListener("click", (e) => { if (e.target.id === "sizeSheet") closeSizes(); });
  $("#sizeCancel").addEventListener("click", closeSizes);
  $("#cartBtn").addEventListener("click", () => openCart(true));
  $("#cartBar").addEventListener("click", () => openCart(true));
  $("#closeCart").addEventListener("click", () => openCart(false));
  $("#backdrop").addEventListener("click", () => openCart(false));
  $("#sendOrder").addEventListener("click", sendOrder);
  $("#clearCart").addEventListener("click", () => { cart = {}; saveCart(); renderCart(); });
  $("#locBtn").addEventListener("click", shareLocation);
  $("#orderForm").addEventListener("change", (e) => { if (e.target.name === "type") syncType(); });
  $("#orderForm").addEventListener("submit", (e) => e.preventDefault());
  addEventListener("keydown", (e) => { if (e.key === "Escape") { closeSizes(); openCart(false); } });
});

const hideLoader = () => $("#loader")?.classList.add("done");
addEventListener("load", () => setTimeout(hideLoader, 300));
setTimeout(hideLoader, 3000);

if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
