(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const digitsFa = value => new Intl.NumberFormat("fa-IR").format(value);
  const money = value => `${digitsFa(value)} تومان`;

  // Mobile navigation
  const menuToggle = $(".menu-toggle");
  const nav = $("#main-nav");
  function closeMenu() {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "باز کردن منو");
    nav.classList.remove("is-open");
  }
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "بستن منو" : "باز کردن منو");
      nav.classList.toggle("is-open", isOpen);
    });
    $$('a[href^="#"]', nav).forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
    document.addEventListener("click", event => {
      if (!nav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    });
  }

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Image fallbacks for all product and service photos
  $$("img").forEach(img => {
    img.addEventListener("error", () => {
      const parent = img.parentElement;
      if (parent) parent.classList.add("photo-failed");
      img.remove();
    }, { once: true });
  });

  // Catalog filtering and search
  const cards = $$(".product-card");
  const tabs = $$(".category-tab");
  const search = $("#product-search");
  let selectedCategory = "all";
  function filterProducts() {
    const term = (search?.value || "").trim().toLocaleLowerCase("fa");
    cards.forEach(card => {
      const categoryMatches = selectedCategory === "all" || card.dataset.category === selectedCategory;
      const haystack = `${card.dataset.name || ""} ${card.dataset.brand || ""}`.toLocaleLowerCase("fa");
      const textMatches = !term || haystack.includes(term);
      card.hidden = !(categoryMatches && textMatches);
    });
  }
  tabs.forEach(tab => tab.addEventListener("click", () => {
    selectedCategory = tab.dataset.category || "all";
    tabs.forEach(item => item.classList.toggle("active", item === tab));
    filterProducts();
  }));
  search?.addEventListener("input", filterProducts);

  // Favorites are front-end only
  $$(".favorite-btn").forEach(button => button.addEventListener("click", () => {
    const active = button.classList.toggle("is-favorite");
    button.textContent = active ? "♥" : "♡";
    button.setAttribute("aria-pressed", String(active));
  }));

  // Cart state intentionally stays in memory; no backend or checkout processing.
  const cart = new Map();
  const drawer = $("#cart-drawer");
  const backdrop = $("#drawer-backdrop");
  const cartItems = $("#cart-items");
  const cartCount = $("#cart-count");
  const cartCount2 = $("#cart-count-2");
  const subtotal = $("#cart-subtotal");
  const toast = $("#toast");
  const checkoutNote = $("#checkout-note");
  let toastTimeout;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2300);
  }
  function openCart() {
    document.body.classList.add("drawer-open");
    drawer?.setAttribute("aria-hidden", "false");
    $("#cart-close")?.focus();
  }
  function closeCart() {
    document.body.classList.remove("drawer-open");
    drawer?.setAttribute("aria-hidden", "true");
  }
  $("#cart-open")?.addEventListener("click", openCart);
  $("#cart-open-shop")?.addEventListener("click", openCart);
  $("#cart-close")?.addEventListener("click", closeCart);
  backdrop?.addEventListener("click", closeCart);
  $("#continue-shopping")?.addEventListener("click", () => {
    closeCart();
    $("#shop")?.scrollIntoView({ behavior: "smooth" });
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeCart(); });

  function getProduct(card) {
    const img = $("img", card);
    return {
      id: card.dataset.id,
      name: card.dataset.name || "محصول",
      brand: card.dataset.brand || "",
      price: Number(card.dataset.price) || 0,
      image: img?.getAttribute("src") || ""
    };
  }
  function updateCount() {
    const count = [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = digitsFa(count);
    if (cartCount2) cartCount2.textContent = digitsFa(count);
    if (subtotal) subtotal.textContent = money([...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0));
  }
  function renderCart() {
    if (!cartItems) return;
    if (!cart.size) {
      cartItems.innerHTML = `<div class="cart-empty"><span>🛒</span><strong>سبد خرید شما خالی است</strong><p>برای شروع، محصولات دلخواهتان را اضافه کنید.</p><button class="btn btn-yellow" id="continue-shopping" type="button">مشاهده محصولات</button></div>`;
      $("#continue-shopping")?.addEventListener("click", () => {
        closeCart();
        $("#shop")?.scrollIntoView({ behavior: "smooth" });
      });
      updateCount();
      return;
    }
    cartItems.innerHTML = "";
    cart.forEach(item => {
      const row = document.createElement("article");
      row.className = "cart-item";
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      img.loading = "lazy";
      img.addEventListener("error", () => { img.style.visibility = "hidden"; }, { once: true });
      const details = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = item.name;
      const brand = document.createElement("small");
      brand.textContent = item.brand;
      const controls = document.createElement("div");
      controls.className = "qty-control";
      const minus = document.createElement("button");
      minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "کم کردن تعداد");
      const qty = document.createElement("span"); qty.textContent = digitsFa(item.quantity);
      const plus = document.createElement("button");
      plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "زیاد کردن تعداد");
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "remove-item"; remove.textContent = "حذف کالا";
      minus.addEventListener("click", () => changeQuantity(item.id, -1));
      plus.addEventListener("click", () => changeQuantity(item.id, 1));
      remove.addEventListener("click", () => { cart.delete(item.id); renderCart(); });
      controls.append(minus, qty, plus);
      details.append(name, brand, controls, remove);
      const price = document.createElement("strong");
      price.className = "cart-item-price";
      price.textContent = money(item.price * item.quantity);
      row.append(img, details, price);
      cartItems.append(row);
    });
    updateCount();
  }
  function changeQuantity(id, delta) {
    const item = cart.get(id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart.delete(id);
    renderCart();
  }
  $$(".add-cart").forEach(button => button.addEventListener("click", () => {
    const card = button.closest(".product-card");
    if (!card) return;
    const product = getProduct(card);
    if (cart.has(product.id)) cart.get(product.id).quantity += 1;
    else cart.set(product.id, { ...product, quantity: 1 });
    renderCart();
    showToast(`${product.name} به سبد خرید اضافه شد.`);
  }));
  $("#checkout-button")?.addEventListener("click", () => {
    if (!cart.size) {
      if (checkoutNote) checkoutNote.textContent = "سبد خرید خالی است؛ ابتدا محصولی اضافه کنید.";
      return;
    }
    if (checkoutNote) checkoutNote.textContent = "این فروشگاه نمایشی است؛ سفارش ثبت نمی‌شود و پرداخت آنلاین فعال نیست. برای خرید واقعی باید بک‌اند و درگاه پرداخت متصل شود.";
  });

  // Demo warranty lookup: never claim a real result.
  const warrantyForm = $("#warranty-form");
  warrantyForm?.addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#warranty-code");
    const message = $("#warranty-message");
    if (!input.value.trim()) {
      message.textContent = "لطفاً کد گارانتی را وارد کنید.";
      message.className = "form-message error";
      input.focus();
      return;
    }
    message.textContent = "این نسخه به سامانه واقعی متصل نیست؛ وضعیت گارانتی قابل تأیید نیست. برای استعلام قطعی با شرکت تماس بگیرید.";
    message.className = "form-message info";
  });

  // Demo service request form with client-side validation only.
  const requestForm = $("#request-form");
  requestForm?.addEventListener("submit", event => {
    event.preventDefault();
    const name = $("#customer-name");
    const phone = $("#customer-phone");
    const details = $("#customer-details");
    const message = $("#request-message");
    const normalizedPhone = phone.value.replace(/[\\s()\\-]/g, "");
    const phonePattern = /^(?:\\+98|0098|0)?9\\d{9}$/;
    if (name.value.trim().length < 3) {
      message.textContent = "لطفاً نام و نام خانوادگی را کامل وارد کنید.";
      message.className = "form-message error"; name.focus(); return;
    }
    if (!phonePattern.test(normalizedPhone)) {
      message.textContent = "شماره تماس معتبر نیست؛ شماره موبایل ایران را بررسی کنید.";
      message.className = "form-message error"; phone.focus(); return;
    }
    if (details.value.trim().length < 8) {
      message.textContent = "لطفاً شرح درخواست را کمی کامل‌تر بنویسید.";
      message.className = "form-message error"; details.focus(); return;
    }
    message.textContent = "اطلاعات بررسی شد، اما چون این نسخه نمایشی است درخواست ارسال یا ذخیره نشده است. برای ثبت واقعی با شرکت تماس بگیرید.";
    message.className = "form-message info";
  });

  renderCart();
})();