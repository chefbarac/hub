/* =========================================================
            1. APP DATA — edit this list to add/remove/reorder apps.
            - icon: any emoji, used inside the generated gradient tile
            - external:true opens in a new browser tab instead of the
              in-app iframe (use for links that block iframing, e.g.
              GitHub, mailto:, other origins with X-Frame-Options)
            - pinned:true puts the app in the bottom dock (max ~5)
            ========================================================= */
const APPS = [
    { id: "portfolio", name: "Portfolio", url: "https://chefbarac.github.io/portfolio/?source=hub", icon: "💼", textColor: "#7B4B2A", pinned: true },
    { id: "resume", name: "Resume", url: "https://chefbarac.github.io/portfolio/resume.pdf", icon: "📄", textColor: "#F8FAFC", pinned: true, external: true },
    { id: "github", name: "GitHub", url: "https://github.com/chefbarac", icon: "🐙", textColor: "#E2557A", external: true, pinned: true },
    { id: "contact", name: "Contact", url: "mailto:chefrel.baracol@gmail.com", icon: "📧", textColor: "#F3E9D2", external: true, pinned: true },
    { id: "ukayfinds", name: "Ukay Finds", url: "https://chefbarac.github.io/ukayfinds/?source=hub", icon: "👕", textColor: "#4A90E2" },
    { id: "lifequote", name: "Life Quotes", url: "https://chefbarac.github.io/lifequote/?source=hub", icon: '""', textColor: "#111827" },
    { id: "smartcalculator", name: "Smart Calcu", url: "https://chefbarac.github.io/smartcalculator/?source=hub", icon: '🧮', textColor: "#ff7b00" },
    { id: "iconprint", name: "Icon Print", url: "https://chefbarac.github.io/iconprint/?source=hub", icon: '🖨️', textColor: "#0062a8", external: true },
];

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get("app");

    const app = APPS.find((a) => a.id === appId);

    if (app) {
        setTimeout(() => openApp(app, document.querySelector(`#icon-${app.id}`)), 1000);
    }
});

/* =========================================================
2. Icon gradients — a curated Material-You-ish palette,
assigned deterministically per app so colors stay stable.
========================================================= */

function gradientFor(id, { textColor = "#ffffff", minContrast = 3 } = {}) {
    // Generate a hash
    let hash = 0;
    for (const c of id) {
        hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    }

    const hue1 = hash % 360;
    // Keep the two hues far enough apart to read as distinct, but not clashing
    const hue2 = (hue1 + 40 + ((hash >> 8) % 80)) % 360;

    // Moderate, consistent saturation avoids neon tones that hurt legibility
    const sat1 = 55 + ((hash >> 16) % 15); // 55-69%
    const sat2 = 55 + ((hash >> 20) % 15); // 55-69%

    // Starting lightness guesses; will be corrected for real contrast below
    let light1 = 45 + ((hash >> 24) % 10); // 45-54%
    let light2 = 30 + ((hash >> 28) % 10); // 30-39%

    light1 = ensureContrast(hue1, sat1, light1, textColor, minContrast);
    light2 = ensureContrast(hue2, sat2, light2, textColor, minContrast);

    return {
        css: `linear-gradient(135deg, hsl(${hue1}, ${sat1}%, ${light1}%), hsl(${hue2}, ${sat2}%, ${light2}%))`,
        textColor,
    };
}

// --- contrast helpers ---

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * f(0), 255 * f(8), 255 * f(4)];
}

function relativeLuminance([r, g, b]) {
    const [R, G, B] = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function contrastRatio(rgb1, rgb2) {
    const L1 = relativeLuminance(rgb1);
    const L2 = relativeLuminance(rgb2);
    const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (lighter + 0.05) / (darker + 0.05);
}

// Nudges lightness down (or up, if text is dark) in small steps until
// the color meets minContrast against textColor.
function ensureContrast(h, s, l, textColor, minContrast) {
    const textRgb = hexToRgb(textColor);
    const textIsLight = relativeLuminance(textRgb) > 0.5;
    let lightness = l;
    let rgb = hslToRgb(h, s, lightness);

    let guard = 0;
    while (contrastRatio(rgb, textRgb) < minContrast && guard < 100) {
        lightness += textIsLight ? -1 : 1; // darken bg for light text, lighten for dark text
        lightness = Math.max(5, Math.min(95, lightness));
        rgb = hslToRgb(h, s, lightness);
        guard++;
        if (lightness <= 5 || lightness >= 95) break; // safety bound
    }
    return Math.round(lightness);
}

/* =========================================================
3. Render grid + dock
========================================================= */
const grid = document.getElementById("appGrid");
const dock = document.getElementById("dock");
const emptyState = document.getElementById("emptyState");

function tile(app) {
    const el = document.createElement("button");
    el.className = "app-tile";
    el.innerHTML = `
             <span id="icon-${app.id}" class="app-icon" style="background:${gradientFor(app.id, { textColor: app.textColor })?.css}">${app.icon}</span>
             <span class="app-label">${app.name}</span>`;
    el.addEventListener("pointerdown", ripple);
    el.addEventListener("click", () => openApp(app, el.querySelector(".app-icon")));
    return el;
}

function renderGrid(filter = "") {
    grid.innerHTML = "";
    const f = filter.trim().toLowerCase();
    const list = APPS.filter((a) => a.name.toLowerCase().includes(f));
    list.forEach((a) => grid.appendChild(tile(a)));
    emptyState.style.display = list.length ? "none" : "block";
}
function renderDock() {
    dock.innerHTML = "";
    APPS.filter((a) => a.pinned)
        .slice(0, 5)
        .forEach((a) => dock.appendChild(tile(a)));
}
renderGrid();
renderDock();

document.getElementById("searchInput").addEventListener("input", (e) => renderGrid(e.target.value));

function ripple(e) {
    const icon = e.currentTarget.querySelector(".app-icon");
    const r = document.createElement("span");
    const rect = icon.getBoundingClientRect();
    const size = rect.width;
    r.className = "ripple";
    r.style.width = r.style.height = size + "px";
    r.style.left = e.clientX - rect.left - size / 2 + "px";
    r.style.top = e.clientY - rect.top - size / 2 + "px";
    icon.appendChild(r);
    setTimeout(() => r.remove(), 550);
}

/* =========================================================
4. App overlay — iframe viewer with Android-style zoom-open
========================================================= */
const overlay = document.getElementById("appOverlay");
const frame = document.getElementById("appFrame");
const overlayName = document.getElementById("overlayName");
const backBtn = document.getElementById("backBtn");
const saveBtn = document.getElementById("saveBtn");
const offlineFallback = document.getElementById("offlineFallback");
let currentApp = null;

function openApp(app, iconEl) {
    if (app.url === "#") {
        pulseUnready(iconEl);
        return;
    }
    if (app.external) {
        window.open(app.url, "_blank", "noopener");
        return;
    }

    currentApp = app;
    overlayName.textContent = app.name;
    saveBtn.classList.remove("saved");
    offlineFallback.classList.remove("show");
    frame.style.display = "block";
    frame.src = app.url;

    // FLIP-style zoom from the tapped icon's position
    const r = iconEl.getBoundingClientRect();
    const s = overlay.getBoundingClientRect();
    const originX = ((r.left + r.width / 2 - s.left) / s.width) * 100;
    const originY = ((r.top + r.height / 2 - s.top) / s.height) * 100;
    overlay.style.transformOrigin = `${originX}% ${originY}%`;
    requestAnimationFrame(() => overlay.classList.add("open"));
}
function pulseUnready(iconEl) {
    if (!iconEl) return;
    iconEl.animate([{ transform: "scale(1)" }, { transform: "scale(.85)" }, { transform: "scale(1)" }], { duration: 220 });
}
function closeApp() {
    overlay.classList.remove("open");
    setTimeout(() => {
        frame.src = "about:blank";
    }, 300);
    currentApp = null;
}
backBtn.addEventListener("click", closeApp);
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeApp();
});

//TODO: Open in External mode
saveBtn.addEventListener("click", async () => {
    window.open(currentApp.url, "_blank", "noopener,noreferrer");

    /* if (!currentApp || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;

    navigator.serviceWorker.ready.then((reg) => {
        // reg.active?.postMessage({ type: "CACHE_URL", url: currentApp.url });
        navigator.serviceWorker.controller?.postMessage({
            type: "CACHE_URL",
            url: currentApp.url,
        });
        saveBtn.classList.add("saved");
    });*/
});

/* =========================================================
5. Live clock
========================================================= */
function tick() {
    const d = new Date();
    document.getElementById("clock").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
tick();
setInterval(tick, 15000);

/* =========================================================
6. Offline indicator
========================================================= */
function updateOnlineState() {
    document.getElementById("offlineChip").classList.toggle("show", !navigator.onLine);
    if (!navigator.onLine && currentApp && frame.style.display !== "none") {
        // leave existing loaded page as-is; only new loads show fallback
    }
}
window.addEventListener("online", updateOnlineState);
window.addEventListener("offline", updateOnlineState);
updateOnlineState();

/* =========================================================
7. PWA install — intercept prompt, show custom button
========================================================= */
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
const installHint = document.getElementById("installHint");
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone) installBtn.classList.add("show");
});

installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    gtag("event", "button_clicked_install_pwa");
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.remove("show");
});

window.addEventListener("appinstalled", () => {
    gtag("event", "log_pwa_install_confirmed");
    installBtn.classList.remove("show");
    installHint.classList.remove("show");
});

// iOS Safari has no beforeinstallprompt — show manual instructions instead
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
if (isIOS && !isStandalone) installHint.classList.add("show");

/* =========================================================
8. Register service worker (offline app shell + caching)
========================================================= */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((err) => console.warn("Service worker registration failed:", err));
    });

    // Auto-refresh once when a new SW version takes control.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}