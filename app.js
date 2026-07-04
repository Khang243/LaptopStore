// ===================================================================
// app.js — ALL LaptopStore JavaScript in one file
// Page logic is auto-detected from the URL and run accordingly.
// ===================================================================

// ===================== FIREBASE CONFIG =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---- YOUR FIREBASE CONFIG HERE ----
const firebaseConfig = {
  apiKey: "AIzaSyBhV66q6dSbj4pZ-Lzd-OoWC-HutiW3qm8",
  authDomain: "manager-d294d.firebaseapp.com",
  projectId: "manager-d294d",
  storageBucket: "manager-d294d.firebasestorage.app",
  messagingSenderId: "201369687184",
  appId: "1:201369687184:web:71f5e85b3f87dac527f415"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===================== CLOUDINARY =====================
const CLOUD_NAME = "dznnqvp9t";
const UPLOAD_PRESET = "shop_upload";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", UPLOAD_URL, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error("Upload failed: " + xhr.statusText));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

async function uploadMultiple(files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadToCloudinary(files[i], (p) => onProgress && onProgress(i, p));
    urls.push(url);
  }
  return urls;
}

// ===================== AUTH + ROLES =====================
const ADMIN_EMAIL = "bob@email.com";
let currentUser = null, currentUserRole = null, userProfile = null;

async function getUserRole(uid, email) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().role) {
    if (email === ADMIN_EMAIL) {
      await setDoc(ref, { email, role: "admin", full_name: "Bob Admin", created_at: new Date().toISOString() }, { merge: true });
      return "admin";
    }
  }
  return snap.exists() ? (snap.data().role || "user") : "user";
}

async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function saveUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      currentUser = null; currentUserRole = null; userProfile = null;
      callback(null);
      return;
    }
    currentUser = user;
    currentUserRole = await getUserRole(user.uid, user.email);
    userProfile = await getUserProfile(user.uid);
    callback({ user, role: currentUserRole, profile: userProfile });
  });
}

async function signOutUser() {
  await signOut(auth);
  window.location.href = "login.html";
}

function requireAuth(onReady) {
  watchAuth((data) => {
    if (!data) window.location.href = "login.html";
    else onReady(data);
  });
}

function requireAdminOrStaff(onReady) {
  watchAuth((data) => {
    if (!data) window.location.href = "login.html";
    else if (data.role !== "admin" && data.role !== "staff") window.location.assign = "index.html";
    else onReady(data);
  });
}

async function listAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function updateUserRole(uid, role) { await updateDoc(doc(db, "users", uid), { role }); }
async function deleteUserRecord(uid) { await deleteDoc(doc(db, "users", uid)); }

// ===================== SHARED UI =====================
const CATEGORIES = [
  { key: "RAM", label: "RAM", icon: "▮▮" },
  { key: "SSD", label: "SSD", icon: "▰" },
  { key: "HDD", label: "HDD", icon: "◯" },
  { key: "Monitor", label: "Monitors", icon: "▭" },
  { key: "Screen", label: "Screens", icon: "▢" },
  { key: "Charger", label: "Chargers", icon: "⚡" },
  { key: "Keyboard", label: "Keyboards", icon: "▭" },
  { key: "Mouse", label: "Mice", icon: "◉" },
  { key: "Cooling", label: "Cooling", icon: "❄" },
  { key: "Other", label: "Other", icon: "▪" }
];

function renderNav(active = "") {
  const el = document.getElementById("site-header");
  if (!el) return;
  el.innerHTML = `
    <div class="container nav-inner">
      <a href="index.html" class="nav-brand"><span class="brand-mark">L</span><span>LaptopStore</span></a>
      <nav class="nav-links" id="nav-links">
        <a href="index.html" class="${active === 'home' ? 'active' : ''}">Home</a>
        <a href="category.html" class="${active === 'category' ? 'active' : ''}">Catalog</a>
        <a href="search.html" class="${active === 'search' ? 'active' : ''}">Search</a>
        <a href="contact.html" class="${active === 'contact' ? 'active' : ''}">Contact</a>
        <a href="dashboard.html" class="nav-dash-link" style="display:none">Dashboard</a>
        <a href="settings.html" class="${active === 'settings' ? 'active' : ''}">Settings</a>
      </nav>
      <div class="nav-actions">
        <a href="cart.html" class="nav-cart"><span>Cart</span><span class="cart-count" id="cart-count">0</span></a>
        <button class="btn btn-outline btn-sm nav-login-btn" onclick="location.href='login.html'">Sign in</button>
        <button class="btn btn-ghost btn-sm nav-logout-btn" id="nav-logout" style="display:none">Logout</button>
        <button class="nav-toggle" id="nav-toggle" aria-label="Menu">☰</button>
      </div>
    </div>`;
  document.getElementById("nav-toggle")?.addEventListener("click", () => document.getElementById("nav-links").classList.toggle("open"));
  document.getElementById("nav-logout")?.addEventListener("click", signOutUser);
  watchAuth((data) => {
    const loginBtn = el.querySelector(".nav-login-btn");
    const logoutBtn = el.querySelector(".nav-logout-btn");
    const dashLink = el.querySelector(".nav-dash-link");
    if (data) {
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-flex";
      if (data.role === "admin" || data.role === "staff") {
        dashLink.style.display = "inline-flex";
        if (active === "dashboard") dashLink.classList.add("active");
      }
    } else {
      loginBtn.style.display = "inline-flex";
      logoutBtn.style.display = "none";
    }
  });
  updateCartCount();
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <div class="nav-brand" style="margin-bottom:12px"><span class="brand-mark">L</span><span>LaptopStore</span></div>
          <p style="font-size:0.85rem;color:var(--text-muted);max-width:280px">Premium laptop components and accessories. Engineered for performance, delivered with precision.</p>
        </div>
        <div class="footer-col"><h4>Catalog</h4>${CATEGORIES.slice(0,5).map(c => `<a href="category.html?cat=${c.key}">${c.label}</a>`).join("")}</div>
        <div class="footer-col"><h4>Company</h4><a href="contact.html">Contact</a><a href="search.html">Search</a><a href="index.html">About</a></div>
        <div class="footer-col"><h4>Account</h4><a href="login.html">Sign in</a><a href="signup.html">Create account</a><a href="settings.html">Settings</a><a href="dashboard.html">Dashboard</a></div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 LaptopStore. All rights reserved.</span>
        <div class="social"><a href="contact.html">Support</a><a href="#">Twitter</a><a href="#">GitHub</a></div>
      </div>
    </div>`;
}

// ---- Cart (localStorage) ----
function getLocalCart() { try { return JSON.parse(localStorage.getItem("ls_cart") || "[]"); } catch { return []; } }
function setLocalCart(cart) { localStorage.setItem("ls_cart", JSON.stringify(cart)); updateCartCount(); }
function addToLocalCart(productId, qty = 1) {
  const cart = getLocalCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) existing.qty += qty; else cart.push({ id: productId, qty });
  setLocalCart(cart);
}
function updateCartCount() {
  const count = getLocalCart().reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById("cart-count");
  if (el) el.textContent = count;
}

// ---- Toast ----
function toast(message, type = "") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = message;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ---- Progress bar ----
function showProgress() {
  let bar = document.querySelector(".progress-bar");
  if (!bar) { bar = document.createElement("div"); bar.className = "progress-bar"; document.body.appendChild(bar); }
  bar.classList.remove("done"); bar.classList.add("active");
  bar.style.width = "30%";
  setTimeout(() => { bar.style.width = "60%"; }, 100);
}
function hideProgress() {
  let bar = document.querySelector(".progress-bar");
  if (!bar) return;
  bar.style.width = "100%";
  setTimeout(() => { bar.classList.add("done"); bar.style.width = "0"; }, 200);
}

// ---- Helpers ----
function formatPrice(n) { return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function productCard(p) {
  const inStock = p.stock > 0;
  const specs = Object.entries(p.specs || {}).slice(0, 3).map(([k, v]) => `<div class="pc-spec-row"><span class="sk">${k}</span><span>${v}</span></div>`).join("");
  return `<div class="product-card" data-id="${p.id}">
    <a href="product.html?id=${p.id}" class="pc-img-wrap">${p.images?.[0] ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy">` : ""}</a>
    <div class="pc-cat">${p.category || ""}</div>
    <a href="product.html?id=${p.id}" class="pc-name">${p.name}</a>
    <div class="pc-specs">${specs}</div>
    <div class="pc-bottom"><span class="pc-price">${formatPrice(p.price)}</span><span class="pc-stock ${inStock ? 'in' : 'out'}">${inStock ? 'In stock' : 'Out'}</span></div>
    <button class="quick-add" onclick="addToCartQuick('${p.id}')">Quick Add</button>
  </div>`;
}

window.addToCartQuick = function(productId) {
  addToLocalCart(productId, 1);
  toast("Product added to cart", "success");
  let live = document.getElementById("aria-live");
  if (!live) { live = document.createElement("div"); live.id = "aria-live"; live.setAttribute("aria-live", "polite"); live.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"; document.body.appendChild(live); }
  live.textContent = "Product added to cart";
};

// ===================== PAGE: HOME =====================
function initHome() {
  renderNav("home"); renderFooter();

  const heroImages = ["hero-img-0", "hero-img-1", "hero-img-2", "hero-img-3"];
  const heroList = document.getElementById("hero-cat-list");
  const catToImg = { RAM: 1, SSD: 2, Monitor: 3 };
  heroList.innerHTML = CATEGORIES.slice(0, 5).map(c => `
    <div class="hero-cat-item" data-img="${catToImg[c.key] ?? 0}">
      <span class="cat-name">${c.label}</span><span class="cat-count">0 items</span>
    </div>`).join("");
  heroList.querySelectorAll(".hero-cat-item").forEach(item => {
    const imgIdx = item.dataset.img;
    item.addEventListener("mouseenter", () => {
      heroImages.forEach((id, i) => { const el = document.getElementById(id); if (el) el.classList.toggle("active", String(i) === String(imgIdx)); });
    });
  });

  document.getElementById("quick-find-chips").innerHTML = CATEGORIES.map(c => `<a href="category.html?cat=${c.key}" class="quick-find-chip">${c.label}</a>`).join("");

  showProgress();
  getDocs(collection(db, "products")).then(snap => {
    const counts = {}; const products = [];
    snap.forEach(d => { const p = { id: d.id, ...d.data() }; products.push(p); counts[p.category] = (counts[p.category] || 0) + 1; });
    heroList.querySelectorAll(".hero-cat-item").forEach(item => {
      const cat = CATEGORIES.find(c => c.label === item.querySelector(".cat-name").textContent);
      if (cat) item.querySelector(".cat-count").textContent = `${counts[cat.key] || 0} items`;
    });
    const featured = products.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 8);
    const grid = document.getElementById("featured-grid");
    grid.innerHTML = featured.length ? featured.map(productCard).join("") : `<div class="empty-state" style="grid-column:1/-1"><h3>No products yet</h3><p>Check back soon — our inventory is being stocked.</p></div>`;
    document.getElementById("category-grid").innerHTML = CATEGORIES.map(c => `
      <a href="category.html?cat=${c.key}" style="padding:24px;text-align:center;display:block">
        <div style="font-size:1.5rem;margin-bottom:8px;color:var(--accent)">${c.icon}</div>
        <div style="font-weight:500;margin-bottom:4px">${c.label}</div>
        <div class="mono-sm" style="color:var(--text-muted)">${counts[c.key] || 0} products</div>
      </a>`).join("");
  }).catch(() => {
    document.getElementById("featured-grid").innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Unable to load</h3><p>Check your Firebase config in js/app.js</p></div>`;
  }).finally(hideProgress);
}

// ===================== PAGE: LOGIN =====================
function initLogin() {
  const form = document.getElementById("login-form");
  const btn = document.getElementById("login-btn");
  const errorEl = document.getElementById("login-error");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";
    btn.disabled = true; btn.textContent = "Signing in…";
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const role = await getUserRole(cred.user.uid, cred.user.email);
      window.location.href = (role === "admin" || role === "staff") ? "dashboard.html" : "index.html";
    } catch (err) {
      errorEl.textContent = "Invalid email or password. Please try again.";
      errorEl.style.display = "block";
      btn.disabled = false; btn.textContent = "Sign in";
    }
  });
}

// ===================== PAGE: SIGNUP =====================
function initSignup() {
  const form = document.getElementById("signup-form");
  const btn = document.getElementById("signup-btn");
  const errorEl = document.getElementById("signup-error");
  let isSubmitting = false; // Lock flag để tránh double-submit

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Ngăn submit lặp lại
    if (isSubmitting) return;
    isSubmitting = true;

    errorEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Creating account…";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const role = email === ADMIN_EMAIL ? "admin" : "user";
      
      await setDoc(doc(db, "users", cred.user.uid), {
        email, 
        full_name: name, 
        role, 
        phone: "", 
        address: "",
        preferences: { currency: "USD", notifications: "all" },
        created_at: new Date().toISOString()
      });

      // Wait for auth state to update
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsubscribe(); // Unsubscribe sau khi check
          setTimeout(() => {
            window.location.href = role === "admin" ? "dashboard.html" : "index.html";
          }, 300);
        }
      });

    } catch (err) {
      isSubmitting = false; // Unlock on error
      btn.disabled = false;
      btn.textContent = "Create account";

      let msg = "Could not create account.";
      if (err.code === "auth/email-already-in-use") 
        msg = "This email is already registered. Try signing in.";
      else if (err.code === "auth/weak-password") 
        msg = "Password should be at least 6 characters.";
      else if (err.code === "auth/invalid-email") 
        msg = "Please enter a valid email address.";
      
      errorEl.textContent = msg;
      errorEl.style.display = "block";
      console.error("Signup error:", err);
    }
  });
}

// ===================== PAGE: CATEGORY =====================
function initCategory() {
  renderNav("category"); renderFooter();
  const params = new URLSearchParams(window.location.search);
  let activeCat = params.get("cat") || "All";
  let allProducts = [];
  const filtersEl = document.getElementById("cat-filters");

  function renderFilters() {
    const cats = ["All", ...CATEGORIES.map(c => c.key)];
    filtersEl.innerHTML = cats.map(c => `<button class="filter-chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`).join("");
    filtersEl.querySelectorAll(".filter-chip").forEach(btn => {
      btn.addEventListener("click", () => { activeCat = btn.dataset.cat; renderFilters(); renderProducts(); updateHeader(); });
    });
  }
  function updateHeader() {
    const eyebrow = document.getElementById("cat-eyebrow"), title = document.getElementById("cat-title"), desc = document.getElementById("cat-desc");
    if (activeCat === "All") { eyebrow.textContent = "Catalog"; title.textContent = "All products"; desc.textContent = "Browse our complete inventory of laptop components."; }
    else { eyebrow.textContent = "Category"; title.textContent = activeCat; desc.textContent = `All ${activeCat} products in our inventory.`; }
  }
  function renderProducts() {
    const sortVal = document.getElementById("sort-select").value;
    let products = [...allProducts];
    if (activeCat !== "All") products = products.filter(p => p.category === activeCat);
    if (sortVal === "price-asc") products.sort((a, b) => a.price - b.price);
    else if (sortVal === "price-desc") products.sort((a, b) => b.price - a.price);
    else if (sortVal === "name") products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else products.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    const grid = document.getElementById("category-grid");
    grid.innerHTML = products.length ? products.map(productCard).join("") : `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">📦</div><h3>No products found</h3><p>There are no products in this category yet. Check back soon.</p></div>`;
  }
  document.getElementById("sort-select").addEventListener("change", renderProducts);
  showProgress();
  getDocs(collection(db, "products")).then(snap => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFilters(); updateHeader(); renderProducts();
  }).catch(() => {
    document.getElementById("category-grid").innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Unable to load</h3><p>Check your Firebase config in js/app.js</p></div>`;
  }).finally(hideProgress);
}

// ===================== PAGE: PRODUCT =====================
function initProduct() {
  renderNav(); renderFooter();
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const container = document.getElementById("product-detail");

  if (!productId) { container.innerHTML = notFound(); return; }
  showProgress();
  getDoc(doc(db, "products", productId)).then(snap => {
    if (!snap.exists()) { container.innerHTML = notFound(); return; }
    const p = { id: snap.id, ...snap.data() };
    const images = p.images || [], specs = Object.entries(p.specs || {}), inStock = p.stock > 0;
    document.title = `${p.name} — LaptopStore`;
    container.innerHTML = `
      <div style="padding:16px 0"><a href="category.html?cat=${p.category}" class="mono-sm" style="color:var(--text-muted)">← Back to ${p.category}</a></div>
      <div class="product-detail">
        <div class="pd-gallery">
          <img class="pd-main-img" id="pd-main-img" src="${images[0] || ''}" alt="${p.name}">
          ${images.length > 1 ? `<div class="pd-thumbs">${images.map((url, i) => `<div class="pd-thumb ${i === 0 ? 'active' : ''}" data-img="${url}"><img src="${url}" alt="${p.name} thumb ${i + 1}"></div>`).join("")}</div>` : ''}
        </div>
        <div class="pd-info">
          <div class="pd-cat">${p.category || ''}</div>
          <h1>${p.name}</h1>
          <div class="pd-price-row">
            <span class="pd-price">${formatPrice(p.price)}</span>
            <span class="pd-stock-badge" style="color:${inStock ? 'var(--success)' : 'var(--danger)'}">${inStock ? `In stock — ${p.stock} available` : 'Out of stock'}</span>
          </div>
          ${p.description ? `<p style="color:var(--text-muted);margin-bottom:24px">${p.description}</p>` : ''}
          <div class="pd-section-title">Technical specifications</div>
          ${specs.length ? `<div class="spec-table">${specs.map(([k, v]) => `<div class="spec-row"><span class="spec-key">${k}</span><span class="spec-val">${v}</span></div>`).join("")}</div>` : '<p class="text-muted mono">No specifications listed.</p>'}
          <div class="pd-cta-bar">
            <div class="qty-control">
              <button id="qty-dec">−</button>
              <input type="number" id="qty-input" value="1" min="1" max="${p.stock}">
              <button id="qty-inc">+</button>
            </div>
            <button class="btn btn-primary" id="add-cart-btn" ${inStock ? '' : 'disabled'} style="flex:1">${inStock ? 'Add to cart' : 'Out of stock'}</button>
          </div>
        </div>
      </div>`;
    document.querySelectorAll(".pd-thumb").forEach(thumb => {
      thumb.addEventListener("click", () => {
        document.querySelectorAll(".pd-thumb").forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
        document.getElementById("pd-main-img").src = thumb.dataset.img;
      });
    });
    const qtyInput = document.getElementById("qty-input");
    document.getElementById("qty-dec").addEventListener("click", () => { qtyInput.value = Math.max(1, parseInt(qtyInput.value) - 1); });
    document.getElementById("qty-inc").addEventListener("click", () => { qtyInput.value = Math.min(parseInt(qtyInput.max) || 99, parseInt(qtyInput.value) + 1); });
    document.getElementById("add-cart-btn").addEventListener("click", () => {
      addToLocalCart(p.id, parseInt(qtyInput.value) || 1);
      toast(`${p.name} added to cart`, "success");
    });
  }).catch(() => { container.innerHTML = notFound(); }).finally(hideProgress);

  function notFound() {
    return `<div class="empty-state" style="padding:64px"><div class="es-icon">🔍</div><h3>Product not found</h3><p>This product may have been removed or the link is incorrect.</p><a href="category.html" class="btn btn-outline" style="margin-top:16px">Browse catalog</a></div>`;
  }
}

// ===================== PAGE: CART =====================
function initCart() {
  renderNav("cart"); renderFooter();
  let cartItems = [];

  async function loadCart() {
    showProgress();
    const localCart = getLocalCart();
    if (localCart.length === 0) { renderEmpty(); hideProgress(); return; }
    try {
      const snaps = await Promise.all(localCart.map(item => getDoc(doc(db, "products", item.id))));
      cartItems = localCart.map((item, i) => {
        const snap = snaps[i];
        return snap.exists() ? { ...snap.data(), id: snap.id, qty: item.qty } : null;
      }).filter(Boolean);
      renderCart();
    } catch { renderEmpty(); }
    hideProgress();
  }

  function renderCart() {
    if (cartItems.length === 0) { renderEmpty(); return; }
    const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal > 100 ? 0 : 9.99;
    const total = subtotal + shipping;
    document.getElementById("cart-content").innerHTML = `
      <div class="cart-layout">
        <div>
          <div class="cart-items">
            ${cartItems.map(item => `
              <div class="cart-item" data-id="${item.id}">
                <img src="${item.images?.[0] || ''}" alt="${item.name}">
                <div>
                  <div class="ci-cat">${item.category || ''}</div>
                  <a href="product.html?id=${item.id}" class="ci-name">${item.name}</a>
                  <div class="mono-sm" style="color:var(--text-muted);margin-top:4px">${formatPrice(item.price)} each</div>
                </div>
                <div class="qty-control">
                  <button onclick="cartChangeQty('${item.id}', -1)">−</button>
                  <input type="number" value="${item.qty}" min="1" readonly>
                  <button onclick="cartChangeQty('${item.id}', 1)">+</button>
                </div>
                <div style="text-align:right">
                  <div class="ci-price">${formatPrice(item.price * item.qty)}</div>
                  <button class="ci-remove" onclick="cartRemove('${item.id}')">Remove</button>
                </div>
              </div>`).join("")}
          </div>
        </div>
        <div class="cart-summary">
          <h3>Order summary</h3>
          <div class="summary-row"><span>Subtotal</span><span class="mono">${formatPrice(subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span class="mono">${shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
          <div class="summary-row total"><span>Total</span><span class="mono">${formatPrice(total)}</span></div>
          <button class="btn btn-primary btn-block" id="checkout-btn" style="margin-top:16px">Proceed to checkout</button>
          <a href="category.html" class="btn btn-ghost btn-block" style="margin-top:8px">Continue shopping</a>
        </div>
      </div>`;
    document.getElementById("checkout-btn").addEventListener("click", checkout);
  }

  function renderEmpty() {
    document.getElementById("cart-content").innerHTML = `<div class="empty-state" style="padding:64px"><div class="es-icon">🛒</div><h3>Your cart is empty</h3><p>Browse our catalog and add components to get started.</p><a href="category.html" class="btn btn-primary" style="margin-top:16px">Browse catalog</a></div>`;
  }

  window.cartChangeQty = function(id, delta) {
    const cart = getLocalCart();
    const item = cart.find(i => i.id === id);
    if (item) { item.qty = Math.max(1, item.qty + delta); setLocalCart(cart); loadCart(); }
  };
  window.cartRemove = function(id) {
    setLocalCart(getLocalCart().filter(i => i.id !== id));
    loadCart(); toast("Item removed from cart");
  };

  async function checkout() {
    requireAuth(async (authData) => {
      const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
      const shipping = subtotal > 100 ? 0 : 9.99;
      try {
        showProgress();
        await addDoc(collection(db, "orders"), {
          user_id: authData.user.uid, user_email: authData.user.email,
          items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          subtotal, shipping, total: subtotal + shipping, status: "pending",
          created_at: new Date().toISOString()
        });
        setLocalCart([]); hideProgress();
        toast("Order placed successfully!", "success");
        setTimeout(() => window.location.href = "index.html", 1500);
      } catch { hideProgress(); toast("Could not place order. Please try again.", "error"); }
    });
  }

  loadCart();
}

// ===================== PAGE: SEARCH =====================
function initSearch() {
  renderNav("search"); renderFooter();
  let allProducts = [], activeCat = "All";
  const filtersEl = document.getElementById("search-cat-filters");

  function renderFilters() {
    const cats = ["All", ...CATEGORIES.map(c => c.key)];
    filtersEl.innerHTML = cats.map(c => `<button class="filter-chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`).join("");
    filtersEl.querySelectorAll(".filter-chip").forEach(btn => {
      btn.addEventListener("click", () => { activeCat = btn.dataset.cat; renderFilters(); doSearch(); });
    });
  }

  function doSearch() {
    const term = document.getElementById("search-input").value.trim().toLowerCase();
    const grid = document.getElementById("search-results");
    const countEl = document.getElementById("results-count");
    let results = [...allProducts];
    if (activeCat !== "All") results = results.filter(p => p.category === activeCat);
    if (term) {
      results = results.filter(p => {
        const name = (p.name || "").toLowerCase(), cat = (p.category || "").toLowerCase();
        const desc = (p.description || "").toLowerCase(), specsStr = JSON.stringify(p.specs || {}).toLowerCase();
        return name.includes(term) || cat.includes(term) || desc.includes(term) || specsStr.includes(term);
      });
    }
    if (!term && activeCat === "All") {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">🔍</div><h3>Start searching</h3><p>Enter a keyword above to find products across all categories.</p></div>`;
      countEl.textContent = "Type to search…"; return;
    }
    countEl.textContent = `${results.length} result${results.length === 1 ? '' : 's'} found`;
    grid.innerHTML = results.length ? results.map(productCard).join("") : `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">🔍</div><h3>No results</h3><p>Try different keywords or remove category filters.</p></div>`;
  }

  document.getElementById("search-btn").addEventListener("click", doSearch);
  document.getElementById("search-input").addEventListener("input", doSearch);
  showProgress();
  getDocs(collection(db, "products")).then(snap => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFilters();
  }).catch(() => {}).finally(hideProgress);
}

// ===================== PAGE: CONTACT =====================
function initContact() {
  renderNav("contact"); renderFooter();
  const form = document.getElementById("contact-form");
  const sendBtn = document.getElementById("contact-send");

  watchAuth((data) => {
    if (data) {
      document.getElementById("contact-name").value = data.profile?.full_name || data.user.email;
      document.getElementById("contact-email").value = data.user.email;
      if (data.role === "admin" || data.role === "staff") {
        document.getElementById("staff-messages").style.display = "block";
        loadMessages();
      }
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    sendBtn.disabled = true; sendBtn.textContent = "Sending…";
    try {
      showProgress();
      await addDoc(collection(db, "messages"), {
        name: document.getElementById("contact-name").value.trim(),
        email: document.getElementById("contact-email").value.trim(),
        subject: document.getElementById("contact-subject").value.trim(),
        message: document.getElementById("contact-message").value.trim(),
        created_at: new Date().toISOString(), replied: false
      });
      hideProgress();
      toast("Message sent! We'll respond soon.", "success");
      form.reset();
    } catch { hideProgress(); toast("Could not send message. Please try again.", "error"); }
    sendBtn.disabled = false; sendBtn.textContent = "Send message";
  });

  async function loadMessages() {
    try {
      const q = query(collection(db, "messages"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      const list = document.getElementById("contact-messages-list");
      if (snap.empty) { list.innerHTML = "<p class='text-muted mono' style='padding:16px'>No messages yet.</p>"; return; }
      list.innerHTML = snap.docs.map(d => {
        const m = d.data();
        const date = new Date(m.created_at?.toDate?.() || m.created_at).toLocaleDateString();
        return `<div class="msg-card"><div class="mc-head"><span class="mc-from">${m.name} — ${m.email}</span><span class="mc-date">${date}</span></div><div class="mc-subject">${m.subject}</div><div class="mc-body">${m.message}</div></div>`;
      }).join("");
    } catch (err) { console.error(err); }
  }
}

// ===================== PAGE: SETTINGS =====================
function initSettings() {
  renderNav("settings"); renderFooter();

  document.querySelectorAll(".settings-nav a").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".settings-nav a").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      document.querySelectorAll(".settings-panel").forEach(p => p.style.display = "none");
      document.getElementById(`panel-${link.dataset.panel}`).style.display = "block";
    });
  });

  requireAuth(async (authData) => {
    const profile = await getUserProfile(authData.user.uid);
    if (profile) {
      document.getElementById("profile-name").value = profile.full_name || "";
      document.getElementById("profile-email").value = authData.user.email;
      document.getElementById("profile-phone").value = profile.phone || "";
      document.getElementById("profile-address").value = profile.address || "";
      document.getElementById("pref-currency").value = profile.preferences?.currency || "USD";
      document.getElementById("pref-notif").value = profile.preferences?.notifications || "all";
    } else {
      document.getElementById("profile-email").value = authData.user.email;
    }

    document.getElementById("profile-form").addEventListener("submit", async (e) => {
      e.preventDefault(); showProgress();
      try {
        await saveUserProfile(authData.user.uid, {
          full_name: document.getElementById("profile-name").value.trim(),
          phone: document.getElementById("profile-phone").value.trim(),
          address: document.getElementById("profile-address").value.trim()
        });
        hideProgress(); toast("Profile updated", "success");
      } catch { hideProgress(); toast("Could not update profile", "error"); }
    });

    document.getElementById("security-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPass = document.getElementById("new-pass").value, confirm = document.getElementById("confirm-pass").value;
      if (newPass !== confirm) { toast("Passwords do not match", "error"); return; }
      if (newPass.length < 6) { toast("Password must be at least 6 characters", "error"); return; }
      showProgress();
      try {
        await updatePassword(auth.currentUser, newPass);
        hideProgress(); toast("Password updated", "success");
        document.getElementById("security-form").reset();
      } catch (err) { hideProgress(); toast(err.message || "Could not update password", "error"); }
    });

    document.getElementById("pref-save").addEventListener("click", async () => {
      showProgress();
      try {
        await saveUserProfile(authData.user.uid, {
          preferences: { currency: document.getElementById("pref-currency").value, notifications: document.getElementById("pref-notif").value }
        });
        hideProgress(); toast("Preferences saved", "success");
      } catch { hideProgress(); toast("Could not save preferences", "error"); }
    });
  });
}

// ===================== PAGE: DASHBOARD =====================
function initDashboard() {
  renderNav("dashboard"); renderFooter();
  let authData = null, allProducts = [], uploadedImages = [];

  requireAdminOrStaff(async (data) => {
    authData = data;
    document.getElementById("dash-role-label").textContent = data.role === "admin" ? "Admin Access" : "Staff Access";
    if (data.role === "admin") document.getElementById("dash-sidebar").classList.add("show-admin");
    document.getElementById("prod-category").innerHTML = CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join("");
    loadStats(); loadInventory(); loadOrders(); loadMessages();
    if (data.role === "admin") loadUsers();
    setupModal(); setupTabs();
  });

  function setupTabs() {
    document.querySelectorAll(".dash-nav-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll(".dash-nav-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        document.querySelectorAll(".dash-panel").forEach(p => p.style.display = "none");
        document.getElementById(`tab-${item.dataset.tab}`).style.display = "block";
      });
    });
  }

  async function loadStats() {
    try {
      const [products, orders, users, messages] = await Promise.all([
        getDocs(collection(db, "products")), getDocs(collection(db, "orders")),
        getDocs(collection(db, "users")), getDocs(collection(db, "messages"))
      ]);
      document.getElementById("stat-products").textContent = products.size;
      document.getElementById("stat-orders").textContent = orders.size;
      document.getElementById("stat-users").textContent = users.size;
      document.getElementById("stat-messages").textContent = messages.size;
    } catch (err) { console.error(err); }
  }

  async function loadInventory() {
    showProgress();
    try {
      const snap = await getDocs(collection(db, "products"));
      allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const body = document.getElementById("inventory-body");
      body.innerHTML = allProducts.length ? allProducts.map(p => `
        <tr><td>${p.name}</td><td class="td-mono">${p.category}</td><td class="td-mono">${formatPrice(p.price)}</td><td class="td-mono">${p.stock}</td>
        <td class="table-actions"><button onclick="editProduct('${p.id}')">Edit</button><button class="danger" onclick="deleteProduct('${p.id}')">Delete</button></td></tr>`).join("")
        : `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">No products yet. Click "Add Product" to create one.</td></tr>`;
    } catch (err) { console.error(err); }
    hideProgress();
  }

  async function loadOrders() {
    try {
      const snap = await getDocs(collection(db, "orders"));
      const body = document.getElementById("orders-body");
      if (snap.empty) { body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No orders yet.</td></tr>`; return; }
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      body.innerHTML = orders.map(o => `
        <tr><td class="td-mono">${o.id.slice(0, 8)}</td><td class="td-mono">${o.user_email || '—'}</td><td>${o.items?.length || 0} item(s)</td>
        <td class="td-mono">${formatPrice(o.total)}</td><td class="td-mono">${o.status}</td>
        <td class="table-actions"><button onclick="updateOrderStatus('${o.id}', 'shipped')">Ship</button><button onclick="updateOrderStatus('${o.id}', 'delivered')">Deliver</button></td></tr>`).join("");
    } catch (err) { console.error(err); }
  }

  window.updateOrderStatus = async function(id, status) {
    try { await updateDoc(doc(db, "orders", id), { status }); toast(`Order marked as ${status}`, "success"); loadOrders(); }
    catch { toast("Could not update order", "error"); }
  };

  async function loadUsers() {
    try {
      const users = await listAllUsers();
      const body = document.getElementById("users-body");
      if (users.length === 0) { body.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted)">No users found.</td></tr>`; return; }
      body.innerHTML = users.map(u => `
        <tr><td class="td-mono">${u.email}</td><td>${u.full_name || '—'}</td><td><span class="role-badge ${u.role}">${u.role}</span></td>
        <td class="table-actions">${u.id !== authData.user.uid ? `
          ${u.role !== 'admin' ? `<button onclick="changeRole('${u.id}', 'admin')">Make admin</button>` : ''}
          ${u.role !== 'staff' ? `<button onclick="changeRole('${u.id}', 'staff')">Make staff</button>` : ''}
          ${u.role !== 'user' ? `<button onclick="changeRole('${u.id}', 'user')">Make user</button>` : ''}
          <button class="danger" onclick="removeUser('${u.id}')">Remove</button>` : '<span class="mono-sm" style="color:var(--text-muted)">You</span>'}</td></tr>`).join("");
    } catch (err) { console.error(err); }
  }

  window.changeRole = async function(uid, role) {
    try { await updateUserRole(uid, role); toast(`User role changed to ${role}`, "success"); loadUsers(); }
    catch { toast("Could not change role", "error"); }
  };
  window.removeUser = async function(uid) {
    if (!confirm("Remove this user's profile? Their auth account remains but loses store access.")) return;
    try { await deleteUserRecord(uid); toast("User removed", "success"); loadUsers(); }
    catch { toast("Could not remove user", "error"); }
  };

  async function loadMessages() {
    try {
      const q = query(collection(db, "messages"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      const list = document.getElementById("messages-list");
      if (snap.empty) { list.innerHTML = "<p style='text-align:center;padding:32px;color:var(--text-muted)'>No messages.</p>"; return; }
      list.innerHTML = snap.docs.map(d => {
        const m = d.data();
        const date = new Date(m.created_at?.toDate?.() || m.created_at).toLocaleString();
        return `<div class="msg-card"><div class="mc-head"><span class="mc-from">${m.name} — ${m.email}</span><span class="mc-date">${date}</span></div><div class="mc-subject">${m.subject}</div><div class="mc-body">${m.message}</div></div>`;
      }).join("");
    } catch (err) { console.error(err); }
  }

  function setupModal() {
    const modal = document.getElementById("product-modal");
    const form = document.getElementById("product-form");
    const zone = document.getElementById("upload-zone");
    let fileInput = null;

    document.getElementById("add-product-btn").addEventListener("click", () => openModal());
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("cancel-product-btn").addEventListener("click", closeModal);

    zone.addEventListener("click", () => {
      fileInput = document.createElement("input");
      fileInput.type = "file"; fileInput.multiple = true; fileInput.accept = "image/*";
      fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
      fileInput.click();
    });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("dragover"); handleFiles(e.dataTransfer.files); });

    async function handleFiles(files) {
      if (!files.length) return;
      const progress = document.getElementById("upload-progress");
      const bar = document.getElementById("upload-bar");
      progress.style.display = "block"; bar.style.width = "0%";
      try {
        const urls = await uploadMultiple(Array.from(files), (idx, pct) => { bar.style.width = pct + "%"; });
        uploadedImages.push(...urls);
        bar.style.width = "100%";
        setTimeout(() => { progress.style.display = "none"; bar.style.width = "0%"; }, 500);
        renderImagePreviews();
      } catch (err) {
        console.error(err);
        toast("Upload failed. Check Cloudinary config in js/app.js", "error");
        progress.style.display = "none";
      }
    }

    function renderImagePreviews() {
      document.getElementById("image-preview-list").innerHTML = uploadedImages.map((url, i) => `
        <div class="image-preview"><img src="${url}" alt="preview"><button class="remove-img" onclick="removeImage(${i})">✕</button></div>`).join("");
    }

    window.removeImage = function(idx) { uploadedImages.splice(idx, 1); renderImagePreviews(); };

    function parseSpecs(text) {
      const specs = {};
      (text || "").split("\n").forEach(line => { const [k, ...v] = line.split("|"); if (k && v.length) specs[k.trim()] = v.join("|").trim(); });
      return specs;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("prod-id").value;
      const product = {
        name: document.getElementById("prod-name").value.trim(),
        category: document.getElementById("prod-category").value,
        price: parseFloat(document.getElementById("prod-price").value),
        stock: parseInt(document.getElementById("prod-stock").value) || 0,
        description: document.getElementById("prod-desc").value.trim(),
        specs: parseSpecs(document.getElementById("prod-specs").value),
        images: uploadedImages,
        updated_at: new Date().toISOString()
      };
      const btn = document.getElementById("save-product-btn");
      btn.disabled = true; btn.textContent = "Saving…"; showProgress();
      try {
        if (id) { await setDoc(doc(db, "products", id), product, { merge: true }); toast("Product updated", "success"); }
        else { product.created_at = new Date().toISOString(); await addDoc(collection(db, "products"), product); toast("Product added", "success"); }
        hideProgress(); closeModal(); loadInventory(); loadStats();
      } catch (err) { console.error(err); hideProgress(); toast("Could not save product", "error"); }
      btn.disabled = false; btn.textContent = "Save Product";
    });
  }

  function openModal(product = null) {
    const modal = document.getElementById("product-modal");
    document.getElementById("modal-title").textContent = product ? "Edit Product" : "Add Product";
    document.getElementById("prod-id").value = product ? product.id : "";
    document.getElementById("prod-name").value = product ? product.name : "";
    document.getElementById("prod-category").value = product ? product.category : CATEGORIES[0].key;
    document.getElementById("prod-price").value = product ? product.price : "";
    document.getElementById("prod-stock").value = product ? product.stock : 0;
    document.getElementById("prod-desc").value = product ? (product.description || "") : "";
    document.getElementById("prod-specs").value = product ? Object.entries(product.specs || {}).map(([k, v]) => `${k}|${v}`).join("\n") : "";
    uploadedImages = product ? [...(product.images || [])] : [];
    renderPreviews();
    modal.classList.add("open");
  }

  function renderPreviews() {
    document.getElementById("image-preview-list").innerHTML = uploadedImages.map((url, i) => `
      <div class="image-preview"><img src="${url}" alt="preview"><button class="remove-img" onclick="removeImage(${i})">✕</button></div>`).join("");
  }

  function closeModal() {
    document.getElementById("product-modal").classList.remove("open");
    document.getElementById("product-form").reset();
    uploadedImages = []; renderPreviews();
  }

  window.editProduct = function(id) { const p = allProducts.find(x => x.id === id); if (p) openModal(p); };
  window.deleteProduct = async function(id) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    showProgress();
    try { await deleteDoc(doc(db, "products", id)); hideProgress(); toast("Product deleted", "success"); loadInventory(); loadStats(); }
    catch { hideProgress(); toast("Could not delete product", "error"); }
  };
}

// ===================== PAGE ROUTER =====================
const page = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];
const routers = {
  "index.html": initHome, "": initHome,
  "login.html": initLogin,
  "signup.html": initSignup,
  "category.html": initCategory,
  "product.html": initProduct,
  "cart.html": initCart,
  "search.html": initSearch,
  "contact.html": initContact,
  "settings.html": initSettings,
  "dashboard.html": initDashboard
};
if (routers[page]) routers[page]();
