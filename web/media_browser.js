import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const PAGE = 250;
const THUMB_SIZES = [128, 256, 384, 512];
const ROOTS = { input: "Input", output: "Output" };
const MEDIA = new Set(["image", "video"]);
const PREFS_KEY = "MediaBrowser.prefs";

const css = document.createElement("link");
css.rel = "stylesheet";
css.href = new URL("./media_browser.css", import.meta.url).href;
document.head.appendChild(css);

// ------------------------------------------------------------------ utils ---

const svg = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

const ICONS = {
  back: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  forward: svg('<path d="M5 12h14M12 5l7 7-7 7"/>'),
  up: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  folderPlus: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v6M9 14h6"/>'),
  upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>'),
  rename: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  cut: svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>'),
  paste: svg('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>'),
  view: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  external: svg('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  video: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"/>'),
  file: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'),
  grid: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  maximize: svg('<rect x="4" y="4" width="16" height="16" rx="1.5"/>'),
  restore: svg('<rect x="3" y="8" width="13" height="13" rx="1.5"/><path d="M8 8V4.5A1.5 1.5 0 0 1 9.5 3h10A1.5 1.5 0 0 1 21 4.5v10a1.5 1.5 0 0 1-1.5 1.5H16"/>'),
  chevron: svg('<path d="m9 18 6-6-6-6"/>'),
  prev: svg('<path d="m15 18-6-6 6-6"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  workflow: svg('<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h4a2 2 0 0 1 2 2v7"/>'),
  sortAsc: svg('<path d="M3 6h7M3 12h5M3 18h3M17 20V4M13 8l4-4 4 4"/>'),
  sortDesc: svg('<path d="M3 6h7M3 12h5M3 18h3M17 4v16M13 16l4 4 4-4"/>'),
  fit: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
  input: svg('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>'),
  output: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  send: svg('<path d="M4 12h16M14 6l6 6-6 6"/>'),
  app: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
};

const h = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
};

const joinPath = (...parts) => parts.filter(Boolean).join("/");
const parentPath = (p) => p.split("/").slice(0, -1).join("/");
const baseName = (p) => p.split("/").pop();
const extOf = (name) => (name.includes(".") ? name.split(".").pop().toUpperCase() : "");

function fmtSize(n) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`;
}
const fmtDate = (s) => new Date(s * 1000).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
function fmtDuration(s) {
  if (s == null) return "";
  s = Math.round(s);
  const m = Math.floor(s / 60), hh = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, "0");
  return hh ? `${hh}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
const typeLabel = (it) =>
  it.kind === "dir" ? "File folder" : `${extOf(it.name) || "File"} ${it.kind === "file" ? "file" : it.kind}`;

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function savePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

async function request(route, { params, body } = {}) {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  const res = await api.fetchApi(route + query, body !== undefined
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined);
  if (!res.ok) throw new Error((await res.text()) || `${res.status} ${res.statusText}`);
  return res.headers.get("Content-Type")?.includes("json") ? res.json() : res;
}

const fileUrl = (root, path, download) =>
  api.apiURL(`/mediabrowser/file?${new URLSearchParams({ root, path, ...(download ? { download: 1 } : {}) })}`);
const thumbUrl = (root, path, it, s) =>
  api.apiURL(`/mediabrowser/thumb?${new URLSearchParams({ root, path, s, v: `${it.mtime}-${it.size}` })}`);
const absolute = (u) => new URL(u, location.href).href;

function download(href, name) {
  const a = h("a", { href, download: name || "" });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Loads thumbnails with bounded concurrency so a fast scroll can't monopolise the
 * browser's per-host connection pool (which the API and websocket also need).
 * Requests for tiles that were recycled before their turn are dropped.
 */
class ThumbLoader {
  constructor(max = 4) {
    this.max = max;
    this.active = 0;
    this.queue = [];
  }
  load(img, src) {
    img._want = src;
    img.classList.remove("loaded", "failed");
    img.removeAttribute("src");
    this.queue.push(img);
    this.pump();
  }
  cancel(img) {
    img._want = null;
    img.classList.remove("loaded", "failed");
    img.removeAttribute("src");
  }
  pump() {
    while (this.active < this.max && this.queue.length) {
      const img = this.queue.shift();
      const src = img._want;
      if (!src || img._started === src) continue;
      img._started = src;
      this.active++;
      const probe = new Image();
      probe.decoding = "async";
      const done = (ok) => {
        this.active--;
        if (img._want === src) {
          if (ok) {
            img.src = src;
            img.classList.add("loaded");
          } else img.classList.add("failed");
        }
        img._started = null;
        this.pump();
      };
      probe.onload = () => done(true);
      probe.onerror = () => done(false);
      probe.src = src;
    }
  }
}

// --------------------------------------------------------------- browser ---

class MediaBrowser {
  constructor() {
    const prefs = loadPrefs();
    this.root = "output";
    this.path = "";
    this.history = [];
    this.historyIndex = -1;
    this.sort = prefs.sort || "mtime";
    this.desc = prefs.desc ?? true;
    this.view = prefs.view || "grid";
    this.zoom = prefs.zoom || 168;
    this.kinds = "";
    this.query = "";
    this.maximized = !!prefs.maximized;

    this.items = [];
    this.total = 0;
    this.pages = new Map();
    this.gen = 0;
    this.selected = new Set();
    this.anchor = -1;
    this.focusIndex = -1;
    this.clip = null;
    this.meta = new Map();
    this.metaQueue = new Set();
    this.folders = new Map();
    this.folderQueue = new Set();
    this.tree = new Map();
    this.rendered = new Map();
    this.pool = [];
    this.thumbs = new ThumbLoader(4);
    this.typeahead = { text: "", time: 0 };
    this.built = false;
  }

  // ----- DOM -----

  build() {
    const tb = (icon, title, onclick, extra = {}) =>
      h("button", { class: "mb-btn", title, html: ICONS[icon], onclick, ...extra });

    this.el = {};
    const E = this.el;
    E.back = tb("back", "Back (Alt+Left)", () => this.goHistory(-1));
    E.forward = tb("forward", "Forward (Alt+Right)", () => this.goHistory(1));
    E.up = tb("up", "Up (Backspace)", () => this.goUp());
    E.refresh = tb("refresh", "Refresh (F5)", () => this.refresh(true));
    E.crumbs = h("div", { class: "mb-crumbs" });
    E.address = h("div", { class: "mb-address", onclick: (e) => e.target === E.address && this.editAddress() }, E.crumbs);
    E.search = h("input", { class: "mb-search-input", type: "search", placeholder: "Search", spellcheck: "false" });
    E.search.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => { this.query = E.search.value.trim(); this.reload(); }, 180);
    });

    E.sortSelect = h("select", { class: "mb-select", title: "Sort by", onchange: () => this.setSort(E.sortSelect.value) },
      ...[["name", "Name"], ["mtime", "Date modified"], ["size", "Size"], ["type", "Type"]]
        .map(([v, l]) => h("option", { value: v }, l)));
    E.sortDir = tb("sortDesc", "Toggle sort direction", () => this.setSort(this.sort, !this.desc));
    E.filter = h("div", { class: "mb-segment" }, ...[["", "All"], ["image", "Images"], ["video", "Videos"]].map(([v, l]) =>
      h("button", { "data-kind": v, onclick: () => { this.kinds = v; this.updateChrome(); this.reload(); } }, l)));
    E.viewGrid = tb("grid", "Large icons", () => this.setView("grid"));
    E.viewList = tb("list", "Details", () => this.setView("details"));
    E.zoom = h("input", { class: "mb-zoom", type: "range", min: 96, max: 360, step: 8, value: this.zoom, title: "Icon size (Ctrl+Wheel)" });
    E.zoom.addEventListener("input", () => this.setZoom(+E.zoom.value));
    E.fileInput = h("input", { type: "file", multiple: true, style: { display: "none" } });
    E.fileInput.addEventListener("change", () => {
      if (E.fileInput.files.length) this.upload([...E.fileInput.files], this.root, this.path);
      E.fileInput.value = "";
    });

    E.cmdRename = tb("rename", "Rename (F2)", () => this.renameSelected());
    E.cmdDelete = tb("trash", "Delete (Del)", () => this.deleteSelected());
    E.cmdCopy = tb("copy", "Copy (Ctrl+C)", () => this.copySelected());
    E.cmdCut = tb("cut", "Cut (Ctrl+X)", () => this.cutSelected());
    E.cmdPaste = tb("paste", "Paste (Ctrl+V)", () => this.paste());
    E.cmdDownload = tb("download", "Save to disk", () => this.saveSelected());
    E.cmdInfo = tb("info", "Properties (Alt+Enter)", () => this.showProperties());

    E.sidebar = h("div", { class: "mb-sidebar" });
    E.header = h("div", { class: "mb-header" },
      ...[["name", "Name"], ["mtime", "Date modified"], ["type", "Type"], ["size", "Size"]].map(([k, l]) =>
        h("div", { class: `mb-hcol mb-col-${k}`, "data-sort": k, onclick: () => this.setSort(k, this.sort === k ? !this.desc : k !== "name" && k !== "type") }, l)));
    E.canvas = h("div", { class: "mb-canvas" });
    E.marquee = h("div", { class: "mb-marquee" });
    E.empty = h("div", { class: "mb-empty" });
    E.scroll = h("div", { class: "mb-scroll", tabindex: "-1" }, E.canvas, E.marquee, E.empty);
    E.main = h("div", { class: "mb-main" }, E.header, E.scroll);
    E.statusLeft = h("span");
    E.statusRight = h("span", { class: "mb-status-right" });
    E.progress = h("div", { class: "mb-progress" }, h("div"));
    E.toasts = h("div", { class: "mb-toasts" });
    E.title = h("span", { class: "mb-title-text" }, "Media Browser");
    E.maxBtn = h("button", { class: "mb-wbtn", title: "Maximize", onclick: () => this.toggleMaximize() });
    E.titlebar = h("div", { class: "mb-titlebar", ondblclick: (e) => !e.target.closest("button") && this.toggleMaximize() },
      h("span", { class: "mb-title-icon", html: ICONS.app }), E.title, h("div", { class: "mb-flex" }),
      E.maxBtn, h("button", { class: "mb-wbtn mb-wclose", title: "Close (Esc)", html: ICONS.close, onclick: () => this.close() }));

    E.window = h("div", { class: "mb-window", tabindex: "0", role: "dialog", "aria-label": "Media Browser" },
      E.titlebar,
      h("div", { class: "mb-toolbar" }, E.back, E.forward, E.up, E.refresh, E.address,
        h("label", { class: "mb-search", html: ICONS.search }, E.search)),
      h("div", { class: "mb-commandbar" },
        h("button", { class: "mb-btn mb-btn-text", html: `${ICONS.folderPlus}<span>New folder</span>`, title: "New folder (Ctrl+Shift+N)", onclick: () => this.newFolder() }),
        h("button", { class: "mb-btn mb-btn-text", html: `${ICONS.upload}<span>Upload</span>`, title: "Upload files (or drop files here)", onclick: () => E.fileInput.click() }),
        h("div", { class: "mb-sep" }), E.cmdCut, E.cmdCopy, E.cmdPaste, E.cmdRename, E.cmdDelete, E.cmdDownload, E.cmdInfo,
        h("div", { class: "mb-flex" }), E.filter, h("div", { class: "mb-sep" }),
        E.sortSelect, E.sortDir, h("div", { class: "mb-sep" }), E.viewGrid, E.viewList, E.zoom, E.fileInput),
      h("div", { class: "mb-body" }, E.sidebar, h("div", { class: "mb-splitter" }), E.main),
      h("div", { class: "mb-statusbar" }, E.statusLeft, E.progress, E.statusRight),
      E.toasts);
    E.overlay = h("div", { class: "mb-overlay" }, E.window);
    document.body.appendChild(E.overlay);

    this.viewer = new MediaViewer(this);
    this.bindEvents();
    this.applyWindowState();
    new ResizeObserver(() => this.relayout()).observe(E.scroll);
    api.addEventListener("executed", () => this.onExternalChange("output"));
    this.built = true;
  }

  bindEvents() {
    const E = this.el;
    E.overlay.addEventListener("mousedown", (e) => { if (e.target === E.overlay) this.close(); });
    E.window.addEventListener("keydown", (e) => this.onKeyDown(e));
    // Keep ComfyUI's global shortcuts and graph clipboard from seeing our events.
    for (const t of ["keyup", "keypress", "copy", "cut", "wheel"]) E.window.addEventListener(t, (e) => e.stopPropagation());
    E.window.addEventListener("paste", (e) => this.onPaste(e));
    E.window.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); });

    E.scroll.addEventListener("scroll", () => { this.scheduleRender(); this.hideHoverPreview(); }, { passive: true });
    E.scroll.addEventListener("mousedown", (e) => this.onPointerDown(e));
    E.scroll.addEventListener("dblclick", (e) => {
      const i = this.indexFromEvent(e);
      if (i >= 0) this.openItem(i);
    });
    E.scroll.addEventListener("contextmenu", (e) => this.onContextMenu(e));
    E.scroll.addEventListener("wheel", (e) => {
      if (!e.ctrlKey || this.view !== "grid") return;
      e.preventDefault();
      this.setZoom(this.zoom + (e.deltaY < 0 ? 16 : -16));
    }, { passive: false });
    E.scroll.addEventListener("mouseover", (e) => this.onHover(e));
    E.scroll.addEventListener("mouseleave", () => this.hideHoverPreview());

    // Drag & drop: internal moves/copies, and OS files for upload.
    E.window.addEventListener("dragstart", (e) => this.onDragStart(e));
    E.window.addEventListener("dragover", (e) => this.onDragOver(e));
    E.window.addEventListener("dragleave", (e) => { if (e.target.classList?.contains("mb-drop")) e.target.classList.remove("mb-drop"); });
    E.window.addEventListener("drop", (e) => this.onDrop(e));
    E.window.addEventListener("dragend", () => this.clearDropHighlight());

    // Window move by title bar.
    E.titlebar.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.target.closest("button") || this.maximized) return;
      const r = E.window.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      const move = (ev) => {
        E.window.style.left = `${Math.max(0, Math.min(innerWidth - 80, ev.clientX - dx))}px`;
        E.window.style.top = `${Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy))}px`;
      };
      const up = () => { removeEventListener("mousemove", move); removeEventListener("mouseup", up); };
      addEventListener("mousemove", move);
      addEventListener("mouseup", up);
    });

    // Sidebar resize.
    const splitter = E.window.querySelector(".mb-splitter");
    splitter.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const start = e.clientX, w = E.sidebar.offsetWidth;
      const move = (ev) => { E.sidebar.style.width = `${Math.max(120, Math.min(480, w + ev.clientX - start))}px`; };
      const up = () => { removeEventListener("mousemove", move); removeEventListener("mouseup", up); };
      addEventListener("mousemove", move);
      addEventListener("mouseup", up);
    });

    addEventListener("resize", () => this.isOpen && this.applyWindowState());
  }

  applyWindowState() {
    const E = this.el;
    E.window.classList.toggle("maximized", this.maximized);
    E.maxBtn.innerHTML = this.maximized ? ICONS.restore : ICONS.maximize;
    E.maxBtn.title = this.maximized ? "Restore" : "Maximize";
  }

  toggleMaximize() {
    this.maximized = !this.maximized;
    this.persist();
    this.applyWindowState();
  }

  persist() {
    savePrefs({ sort: this.sort, desc: this.desc, view: this.view, zoom: this.zoom, maximized: this.maximized });
  }

  // ----- open / close -----

  get isOpen() {
    return this.built && this.el.overlay.classList.contains("open");
  }

  open() {
    if (!this.built) this.build();
    this.el.overlay.classList.add("open");
    this.el.window.focus({ preventScroll: true });
    if (this.historyIndex < 0) this.navigate("output", "");
    else this.refresh();
    this.loadTree(this.root, "", true);
  }

  close() {
    if (!this.isOpen) return;
    this.viewer.close();
    this.closeMenu();
    this.hideHoverPreview();
    this.el.overlay.classList.remove("open");
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  onExternalChange(root) {
    if (!this.isOpen || this.root !== root) return;
    clearTimeout(this.extTimer);
    this.extTimer = setTimeout(() => this.refresh(), 400);
    this.invalidateTree(root, this.path);
  }

  // ----- navigation & data -----

  listParams() {
    return { root: this.root, path: this.path, sort: this.sort, desc: this.desc ? 1 : 0, q: this.query, kinds: this.kinds };
  }

  async navigate(root, path, { push = true, select } = {}) {
    if (push) {
      this.history.splice(this.historyIndex + 1, Infinity, { root, path });
      this.historyIndex = this.history.length - 1;
    }
    this.root = root;
    this.path = path;
    this.selected.clear();
    this.anchor = this.focusIndex = -1;
    if (this.query) { this.query = ""; this.el.search.value = ""; }
    this.expandTreeTo(root, path);
    this.updateChrome();
    await this.reload();
    if (select) this.selectByName(select);
  }

  async reload() {
    const gen = ++this.gen;
    this.items = [];
    this.total = 0;
    this.pages.clear();
    this.clearTiles();
    this.el.scroll.scrollTop = 0;
    this.setLoading(true);
    try {
      await this.loadPage(0, gen);
    } catch (e) {
      if (gen !== this.gen) return;
      this.toast(e.message, "error");
      if (this.path) return this.navigate(this.root, parentPath(this.path), { push: false });
    } finally {
      if (gen === this.gen) this.setLoading(false);
    }
    this.relayout();
  }

  /** Re-fetch the visible pages and swap them in at once, keeping scroll position and selection. */
  async refresh(fresh = false) {
    const gen = ++this.gen;
    if (fresh) this.folders.clear();
    const { start, end } = this.visibleRange();
    const first = Math.floor(start / PAGE), last = Math.max(first, Math.floor(Math.max(0, end - 1) / PAGE));
    this.setLoading(true);
    try {
      const results = [];
      for (let p = first; p <= last; p++) results.push(this.fetchPage(p, fresh && p === first));
      const pages = await Promise.all(results);
      if (gen !== this.gen) return;
      this.total = pages[0].total;
      this.items = new Array(this.total);
      this.pages.clear();
      pages.forEach((d, k) => this.storePage(first + k, d));
      if (this.focusIndex >= this.total) this.focusIndex = this.total - 1;
      this.clearTiles();
      this.relayout();
    } catch (e) {
      if (gen === this.gen) this.toast(e.message, "error");
    } finally {
      if (gen === this.gen) this.setLoading(false);
    }
    this.updateChrome();
  }

  fetchPage(p, fresh) {
    return request("/mediabrowser/list", { params: { ...this.listParams(), offset: p * PAGE, limit: PAGE, ...(fresh ? { fresh: 1 } : {}) } });
  }

  storePage(p, data) {
    data.items.forEach((it, k) => { this.items[p * PAGE + k] = it; });
    this.pages.set(p, "loaded");
  }

  async loadPage(p, gen = this.gen) {
    if (this.pages.has(p)) return this.pages.get(p) === "loaded" ? undefined : this.pages.get(p);
    const promise = this.fetchPage(p).then((data) => {
      if (gen !== this.gen) return;
      if (data.total !== this.total) {
        this.total = data.total;
        this.items.length = data.total;
        this.relayout();
      }
      this.storePage(p, data);
      this.scheduleRender();
      this.updateStatus();
    }, (e) => {
      if (gen === this.gen) this.pages.delete(p);
      throw e;
    });
    this.pages.set(p, promise);
    return promise;
  }

  async ensureLoaded(start, end) {
    const jobs = [];
    for (let p = Math.floor(start / PAGE); p <= Math.floor(Math.max(start, end - 1) / PAGE); p++) jobs.push(this.loadPage(p));
    await Promise.all(jobs);
  }

  async itemAt(i) {
    if (!this.items[i]) await this.ensureLoaded(i, i + 1);
    return this.items[i];
  }

  goHistory(delta) {
    const i = this.historyIndex + delta;
    if (i < 0 || i >= this.history.length) return;
    const from = this.history[this.historyIndex];
    this.historyIndex = i;
    const { root, path } = this.history[i];
    const select = delta < 0 && root === from.root && parentPath(from.path) === path ? baseName(from.path) : undefined;
    this.navigate(root, path, { push: false, select });
  }

  goUp() {
    if (!this.path) return;
    this.navigate(this.root, parentPath(this.path), { select: baseName(this.path) });
  }

  setSort(sort, desc = this.desc) {
    this.sort = sort;
    this.desc = desc;
    this.persist();
    this.updateChrome();
    this.reload();
  }

  setView(view) {
    this.view = view;
    this.persist();
    this.updateChrome();
    this.relayout(true);
  }

  setZoom(z) {
    const anchor = this.focusIndex >= 0 ? this.focusIndex : this.visibleRange().start;
    this.zoom = Math.max(96, Math.min(360, z));
    this.el.zoom.value = this.zoom;
    this.persist();
    if (this.view !== "grid") this.setView("grid");
    else this.relayout(true);
    this.ensureVisible(anchor, true);
  }

  // ----- layout & virtual rendering -----

  computeLayout() {
    const width = this.el.scroll.clientWidth;
    const pad = 10;
    if (this.view === "details") {
      return { mode: "details", cols: 1, pad: 4, gap: 0, tileW: width - 8, rowH: 30, tileH: 30, thumb: 128 };
    }
    const gap = 8;
    const inner = width - pad * 2;
    const cols = Math.max(1, Math.floor((inner + gap) / (this.zoom + gap)));
    const tileW = Math.floor((inner - gap * (cols - 1)) / cols);
    const need = tileW * (devicePixelRatio || 1);
    const thumb = THUMB_SIZES.find((s) => s >= need) || THUMB_SIZES[THUMB_SIZES.length - 1];
    return { mode: "grid", cols, pad, gap, tileW, tileH: tileW + 34, rowH: tileW + 34 + gap, thumb };
  }

  relayout(force = false) {
    if (!this.built) return;
    const L = this.computeLayout();
    const prev = this.layout;
    this.layout = L;
    const changed = force || !prev || prev.mode !== L.mode || prev.tileW !== L.tileW || prev.cols !== L.cols;
    if (changed) {
      this.el.window.classList.toggle("mb-details", L.mode === "details");
      for (const el of this.rendered.values()) el._pos = null;
      if (!prev || prev.thumb !== L.thumb || prev.mode !== L.mode) this.clearTiles();
    }
    this.el.header.style.paddingRight = `${this.el.scroll.offsetWidth - this.el.scroll.clientWidth + 4}px`;
    const rows = Math.ceil(this.total / L.cols);
    this.el.canvas.style.height = `${rows * L.rowH + L.pad * 2}px`;
    this.render();
  }

  visibleRange(extra = 0) {
    const L = this.layout || this.computeLayout();
    const top = this.el.scroll.scrollTop - L.pad, hgt = this.el.scroll.clientHeight;
    const r0 = Math.max(0, Math.floor(top / L.rowH) - extra);
    const r1 = Math.ceil((top + hgt) / L.rowH) + extra;
    return { start: r0 * L.cols, end: Math.min(this.total, r1 * L.cols) };
  }

  scheduleRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => this.render());
  }

  render() {
    this.renderQueued = false;
    if (!this.layout) return;
    const L = this.layout;
    const { start, end } = this.visibleRange(2);
    for (const [i, el] of this.rendered) {
      if (i < start || i >= end) {
        this.recycle(el);
        this.rendered.delete(i);
      }
    }
    for (let i = start; i < end; i++) {
      let el = this.rendered.get(i);
      if (!el) {
        el = this.pool.pop() || this.createTile();
        el.style.display = "";
        this.rendered.set(i, el);
      }
      el._i = i;
      const it = this.items[i];
      const key = it ? `${it.name}|${it.mtime}|${it.size}|${L.mode}|${L.thumb}` : "";
      if (el._key !== key) this.fillTile(el, it, key);
      const col = i % L.cols, row = (i / L.cols) | 0;
      const pos = `${L.pad + col * (L.tileW + L.gap)},${L.pad + row * L.rowH},${L.tileW}`;
      if (el._pos !== pos) {
        el._pos = pos;
        el.style.transform = `translate(${L.pad + col * (L.tileW + L.gap)}px,${L.pad + row * L.rowH}px)`;
        el.style.width = `${L.tileW}px`;
        el.style.height = `${L.tileH}px`;
      }
      this.paintState(el, it, i);
    }
    this.el.empty.textContent = this.total || this.loading ? "" : this.query ? "No items match your search." : "This folder is empty.";
    this.el.empty.style.display = this.el.empty.textContent ? "" : "none";
    // Fetch pages ahead of the viewport so scrolling never hits blank tiles.
    const ahead = this.visibleRange(8);
    if (this.total) this.ensureLoaded(ahead.start, ahead.end).catch((e) => this.toast(e.message, "error"));
    this.flushMetaSoon();
    this.flushFoldersSoon();
  }

  paintState(el, it, i) {
    const sel = !!it && this.selected.has(it.name);
    if (el._sel !== sel) { el._sel = sel; el.classList.toggle("selected", sel); }
    const foc = i === this.focusIndex;
    if (el._foc !== foc) { el._foc = foc; el.classList.toggle("focused", foc); }
    const cut = !!it && this.clip?.op === "move" && this.clip.root === this.root && this.clip.dir === this.path && this.clip.names.has(it.name);
    if (el._cut !== cut) { el._cut = cut; el.classList.toggle("cut", cut); }
  }

  repaint() {
    for (const [i, el] of this.rendered) this.paintState(el, this.items[i], i);
    this.updateStatus();
    this.updateCommands();
  }

  createTile() {
    const img = h("img", { draggable: "false", alt: "" });
    const tiles = [0, 1, 2, 3].map(() => h("img", { draggable: "false", alt: "" }));
    const el = h("div", { class: "mb-item", draggable: "true" },
      h("div", { class: "mb-thumb" }, h("div", { class: "mb-icon" }), img,
        h("div", { class: "mb-folder" }, h("div", { class: "mb-folder-back" }), h("div", { class: "mb-mosaic" }, ...tiles), h("div", { class: "mb-folder-front" })),
        h("span", { class: "mb-badge" })),
      h("div", { class: "mb-name" }),
      h("div", { class: "mb-col mb-col-mtime" }),
      h("div", { class: "mb-col mb-col-type" }),
      h("div", { class: "mb-col mb-col-size" }));
    el._img = img;
    el._tiles = tiles;
    el._mosaic = el.querySelector(".mb-mosaic");
    el._icon = el.querySelector(".mb-icon");
    el._badge = el.querySelector(".mb-badge");
    el._name = el.querySelector(".mb-name");
    el._cols = el.querySelectorAll(".mb-col");
    this.el.canvas.appendChild(el);
    return el;
  }

  fillTile(el, it, key) {
    el._key = key;
    el._sel = el._foc = el._cut = undefined;
    el.className = `mb-item ${it ? `kind-${it.kind}` : "placeholder"}`;
    if (!it) {
      this.thumbs.cancel(el._img);
      this.clearFolder(el);
      el._icon.innerHTML = "";
      el._name.textContent = "";
      el._badge.textContent = "";
      el._cols.forEach((c) => { c.textContent = ""; });
      el.removeAttribute("title");
      return;
    }
    el._icon.innerHTML = it.kind === "dir" ? ICONS.folder : ICONS[it.kind] || ICONS.file;
    el._name.textContent = it.name;
    el.title = `${it.name}\n${typeLabel(it)}${it.kind === "dir" ? "" : ` · ${fmtSize(it.size)}`}\nModified ${fmtDate(it.mtime)}`;
    el._cols[0].textContent = fmtDate(it.mtime);
    el._cols[1].textContent = typeLabel(it);
    el._cols[2].textContent = it.kind === "dir" ? "" : fmtSize(it.size);
    if (MEDIA.has(it.kind)) {
      this.thumbs.load(el._img, thumbUrl(this.root, joinPath(this.path, it.name), it, this.layout.thumb));
    } else this.thumbs.cancel(el._img);
    if (it.kind === "dir") this.fillFolder(el, it);
    else this.clearFolder(el);
    this.fillBadge(el, it);
  }

  folderKey(it) {
    return `${this.root}/${joinPath(this.path, it.name)}@${it.mtime}`;
  }

  /** Folder tiles show a mosaic of their most recent media (fetched in batches). */
  fillFolder(el, it) {
    const preview = this.folders.get(this.folderKey(it));
    if (preview === undefined) {
      this.folderQueue.add(it);
      return this.clearFolder(el);
    }
    const items = preview?.items || [];
    if (!items.length || this.layout.mode !== "grid") return this.clearFolder(el);
    el.classList.add("has-preview");
    el._mosaic.dataset.count = items.length;
    // One large cell needs a full-size thumbnail; the 2x2 cells can use a smaller one.
    const size = items.length === 1 ? this.layout.thumb : THUMB_SIZES.find((s) => s >= this.layout.thumb / 2) || 128;
    el._tiles.forEach((img, k) => {
      const p = items[k];
      if (p) this.thumbs.load(img, thumbUrl(this.root, p.path, p, size));
      else this.thumbs.cancel(img);
    });
  }

  clearFolder(el) {
    el.classList.remove("has-preview");
    for (const img of el._tiles) this.thumbs.cancel(img);
  }

  fillBadge(el, it) {
    if (it.kind === "dir") {
      const count = this.folders.get(this.folderKey(it))?.count;
      el._badge.textContent = count ? `${count.toLocaleString()} item${count === 1 ? "" : "s"}` : "";
      return;
    }
    if (it.kind !== "video") { el._badge.textContent = ""; return; }
    const m = this.meta.get(this.metaKey(it));
    el._badge.innerHTML = `${ICONS.play}${m?.duration != null ? `<span>${fmtDuration(m.duration)}</span>` : ""}`;
    if (!m) this.metaQueue.add(it);
  }

  recycle(el) {
    this.thumbs.cancel(el._img);
    this.clearFolder(el);
    el.style.display = "none";
    this.pool.push(el);
  }

  clearTiles() {
    for (const el of this.rendered.values()) {
      el._key = null;
      el._pos = null;
      this.recycle(el);
    }
    this.rendered.clear();
  }

  metaKey(it) {
    return `${this.root}/${joinPath(this.path, it.name)}@${it.mtime}`;
  }

  flushMetaSoon() {
    if (!this.metaQueue.size || this.metaTimer) return;
    this.metaTimer = setTimeout(async () => {
      this.metaTimer = null;
      const root = this.root, dir = this.path;
      const batch = [...this.metaQueue].filter((it) => !this.meta.has(this.metaKey(it)));
      this.metaQueue.clear();
      if (!batch.length) return;
      try {
        const res = await request("/mediabrowser/meta", { body: { root, paths: batch.map((it) => joinPath(dir, it.name)) } });
        for (const it of batch) this.meta.set(`${root}/${joinPath(dir, it.name)}@${it.mtime}`, res[joinPath(dir, it.name)] || {});
        if (root !== this.root || dir !== this.path) return;
        for (const [i, el] of this.rendered) if (this.items[i]?.kind === "video") this.fillBadge(el, this.items[i]);
      } catch { /* badges are cosmetic */ }
    }, 120);
  }

  flushFoldersSoon() {
    if (!this.folderQueue.size || this.folderTimer) return;
    this.folderTimer = setTimeout(async () => {
      this.folderTimer = null;
      const root = this.root, dir = this.path;
      const batch = [...this.folderQueue].filter((it) => !this.folders.has(this.folderKey(it)));
      this.folderQueue.clear();
      if (!batch.length) return;
      try {
        const res = await request("/mediabrowser/folders", { body: { root, paths: batch.map((it) => joinPath(dir, it.name)) } });
        for (const it of batch) this.folders.set(`${root}/${joinPath(dir, it.name)}@${it.mtime}`, res[joinPath(dir, it.name)]);
        if (root !== this.root || dir !== this.path) return;
        for (const [i, el] of this.rendered) {
          const it = this.items[i];
          if (it?.kind === "dir") { this.fillFolder(el, it); this.fillBadge(el, it); }
        }
      } catch { /* previews are cosmetic; the folder icon remains */ }
    }, 60);
  }

  ensureVisible(i, center = false) {
    if (i < 0 || !this.layout) return;
    const L = this.layout, s = this.el.scroll;
    const y = L.pad + Math.floor(i / L.cols) * L.rowH;
    if (center) s.scrollTop = y - (s.clientHeight - L.tileH) / 2;
    else if (y < s.scrollTop) s.scrollTop = y - L.pad;
    else if (y + L.tileH > s.scrollTop + s.clientHeight) s.scrollTop = y + L.tileH - s.clientHeight + L.pad;
  }

  indexFromEvent(e) {
    const el = e.target.closest?.(".mb-item");
    return el && el._i != null && this.items[el._i] ? el._i : -1;
  }

  // ----- chrome -----

  updateChrome() {
    const E = this.el;
    E.back.disabled = this.historyIndex <= 0;
    E.forward.disabled = this.historyIndex >= this.history.length - 1;
    E.up.disabled = !this.path;
    E.sortSelect.value = this.sort;
    E.sortDir.innerHTML = this.desc ? ICONS.sortDesc : ICONS.sortAsc;
    E.sortDir.title = this.desc ? "Descending" : "Ascending";
    E.viewGrid.classList.toggle("active", this.view === "grid");
    E.viewList.classList.toggle("active", this.view === "details");
    E.zoom.style.display = this.view === "grid" ? "" : "none";
    for (const b of E.filter.children) b.classList.toggle("active", b.dataset.kind === this.kinds);
    for (const c of E.header.children) {
      c.classList.toggle("sorted", c.dataset.sort === this.sort);
      c.classList.toggle("desc", c.dataset.sort === this.sort && this.desc);
    }
    E.title.textContent = `${this.path ? baseName(this.path) : ROOTS[this.root]} — Media Browser`;
    this.renderCrumbs();
    this.renderTree();
    this.updateStatus();
    this.updateCommands();
  }

  updateCommands() {
    const E = this.el, n = this.selected.size, one = n === 1;
    E.cmdRename.disabled = !one;
    E.cmdDelete.disabled = E.cmdCopy.disabled = E.cmdCut.disabled = E.cmdDownload.disabled = !n;
    E.cmdPaste.disabled = !this.clip;
  }

  updateStatus() {
    if (!this.built) return;
    const parts = [`${this.total.toLocaleString()} item${this.total === 1 ? "" : "s"}`];
    const sel = this.selectedItems();
    if (this.selected.size) {
      const bytes = sel.reduce((a, it) => a + (it.kind === "dir" ? 0 : it.size), 0);
      parts.push(`${this.selected.size} selected${bytes ? ` · ${fmtSize(bytes)}` : ""}`);
    }
    this.el.statusLeft.textContent = parts.join("   |   ");
  }

  setLoading(on) {
    this.loading = on;
    this.el.window.classList.toggle("loading", on);
  }

  renderCrumbs() {
    const E = this.el;
    E.crumbs.replaceChildren();
    const segs = this.path ? this.path.split("/") : [];
    const add = (label, path, icon) => {
      const c = h("button", { class: "mb-crumb", "data-root": this.root, "data-path": path, onclick: () => this.navigate(this.root, path) });
      if (icon) c.insertAdjacentHTML("beforeend", icon);
      c.append(label);
      E.crumbs.append(c);
    };
    add(ROOTS[this.root], "", ICONS[this.root]);
    segs.forEach((s, i) => {
      E.crumbs.append(h("span", { class: "mb-crumb-sep", html: ICONS.chevron }));
      add(s, segs.slice(0, i + 1).join("/"));
    });
    requestAnimationFrame(() => { E.crumbs.scrollLeft = E.crumbs.scrollWidth; });
  }

  editAddress() {
    const E = this.el;
    const input = h("input", { class: "mb-address-input", value: `${this.root}/${this.path}`.replace(/\/$/, ""), spellcheck: "false" });
    const done = (go) => {
      if (!input.isConnected) return;
      const v = input.value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
      input.replaceWith(E.crumbs);
      if (!go) return;
      const [root, ...rest] = v.split("/");
      if (!ROOTS[root.toLowerCase()]) return this.toast(`Path must start with "input" or "output"`, "error");
      this.navigate(root.toLowerCase(), rest.join("/"));
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") done(true);
      else if (e.key === "Escape") done(false);
    });
    input.addEventListener("blur", () => done(false));
    E.crumbs.replaceWith(input);
    input.focus();
    input.select();
  }

  // ----- sidebar tree -----

  treeNode(root, path) {
    const key = `${root}:${path}`;
    let n = this.tree.get(key);
    if (!n) this.tree.set(key, n = { root, path, expanded: false, children: null, loading: false });
    return n;
  }

  async loadTree(root, path, expand) {
    const n = this.treeNode(root, path);
    if (expand) n.expanded = true;
    if (n.children || n.loading) return this.renderTree();
    n.loading = true;
    try {
      n.children = await request("/mediabrowser/dirs", { params: { root, path } });
    } catch {
      n.children = [];
    }
    n.loading = false;
    this.renderTree();
  }

  invalidateTree(root, path) {
    const n = this.tree.get(`${root}:${path}`);
    if (n) {
      n.children = null;
      if (n.expanded) this.loadTree(root, path);
    }
  }

  expandTreeTo(root, path) {
    const segs = path ? path.split("/") : [];
    for (let i = 0; i <= segs.length; i++) {
      const p = segs.slice(0, i).join("/");
      if (i < segs.length) this.loadTree(root, p, true);
    }
  }

  renderTree() {
    if (!this.built) return;
    const frag = document.createDocumentFragment();
    const row = (root, path, label, depth, hasChildren, icon) => {
      const n = this.treeNode(root, path);
      const active = root === this.root && path === this.path;
      const twisty = h("span", { class: `mb-twisty ${hasChildren ? "" : "none"} ${n.expanded ? "open" : ""}`, html: ICONS.chevron,
        onclick: (e) => {
          e.stopPropagation();
          n.expanded = !n.expanded;
          n.expanded ? this.loadTree(root, path) : this.renderTree();
        } });
      frag.append(h("div", {
        class: `mb-tree-row ${active ? "active" : ""} ${depth === 0 ? "root" : ""}`, style: { paddingLeft: `${6 + depth * 14}px` },
        "data-root": root, "data-path": path, title: `${root}/${path}`,
        onclick: () => this.navigate(root, path),
      }, twisty, h("span", { class: "mb-tree-icon", html: icon || ICONS.folder }), h("span", { class: "mb-tree-label" }, label)));
      if (n.expanded && n.children) {
        for (const c of n.children) row(root, joinPath(path, c.name), c.name, depth + 1, c.has_children);
      }
    };
    for (const [root, label] of Object.entries(ROOTS)) row(root, "", label, 0, true, ICONS[root]);
    this.el.sidebar.replaceChildren(frag);
  }

  // ----- selection -----

  selectedItems() {
    const out = [];
    if (!this.selected.size) return out;
    for (const it of this.items) if (it && this.selected.has(it.name)) out.push(it);
    return out;
  }

  selectedPaths() {
    return this.selectedItems().map((it) => joinPath(this.path, it.name));
  }

  setFocus(i, { select = "single", scroll = true } = {}) {
    if (i < 0 || i >= this.total) return;
    const it = this.items[i];
    this.focusIndex = i;
    if (select === "single") {
      this.selected.clear();
      if (it) this.selected.add(it.name);
      this.anchor = i;
    } else if (select === "toggle" && it) {
      this.selected.has(it.name) ? this.selected.delete(it.name) : this.selected.add(it.name);
      this.anchor = i;
    } else if (select === "range") {
      this.selectRange(this.anchor < 0 ? i : this.anchor, i, false);
    }
    if (scroll) this.ensureVisible(i);
    this.repaint();
  }

  async selectRange(a, b, additive) {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    if (!additive) this.selected.clear();
    const apply = () => { for (let k = lo; k <= hi; k++) if (this.items[k]) this.selected.add(this.items[k].name); };
    apply();
    for (let k = lo; k <= hi; k++) {
      if (!this.items[k]) {
        await this.ensureLoaded(lo, hi + 1);
        apply();
        break;
      }
    }
    this.repaint();
  }

  async selectAll() {
    this.setLoading(true);
    try {
      await this.ensureLoaded(0, this.total);
    } finally {
      this.setLoading(false);
    }
    for (const it of this.items) if (it) this.selected.add(it.name);
    this.repaint();
  }

  selectByName(name) {
    const i = this.items.findIndex((it) => it && it.name === name);
    if (i >= 0) this.setFocus(i, { select: "single" });
    requestAnimationFrame(() => this.ensureVisible(i, true));
  }

  // ----- pointer -----

  onPointerDown(e) {
    this.closeMenu();
    if (e.button !== 0 && e.button !== 2) return;
    if (e.target === this.el.scroll && e.offsetX > this.el.scroll.clientWidth) return; // scrollbar
    const i = this.indexFromEvent(e);
    if (i >= 0) {
      const it = this.items[i];
      if (e.button === 2) {
        if (!this.selected.has(it.name)) this.setFocus(i, { scroll: false });
        return;
      }
      if (e.shiftKey) {
        this.focusIndex = i;
        this.selectRange(this.anchor < 0 ? i : this.anchor, i, e.ctrlKey || e.metaKey);
      } else if (e.ctrlKey || e.metaKey) {
        this.setFocus(i, { select: "toggle", scroll: false });
      } else if (!this.selected.has(it.name)) {
        this.setFocus(i, { scroll: false });
      } else {
        // Clicking an already-selected item keeps the group (for dragging) until mouseup.
        this.focusIndex = i;
        this.anchor = i;
        const up = (ev) => {
          removeEventListener("mouseup", up);
          if (Math.abs(ev.clientX - e.clientX) < 4 && Math.abs(ev.clientY - e.clientY) < 4) this.setFocus(i, { scroll: false });
        };
        addEventListener("mouseup", up);
        this.repaint();
      }
      return;
    }
    if (e.button !== 0) return;
    this.startMarquee(e);
  }

  startMarquee(e) {
    const E = this.el, L = this.layout;
    const base = e.ctrlKey || e.metaKey ? new Set(this.selected) : new Set();
    if (!e.ctrlKey && !e.metaKey) { this.selected.clear(); this.repaint(); }
    const box = E.scroll.getBoundingClientRect();
    const x0 = e.clientX - box.left + E.scroll.scrollLeft, y0 = e.clientY - box.top + E.scroll.scrollTop;
    let last = e, raf = 0;
    const update = () => {
      raf = 0;
      const b = E.scroll.getBoundingClientRect();
      // Auto-scroll when dragging past the edges.
      if (last.clientY > b.bottom - 16) E.scroll.scrollTop += Math.min(40, last.clientY - b.bottom + 16);
      else if (last.clientY < b.top + 16) E.scroll.scrollTop -= Math.min(40, b.top + 16 - last.clientY);
      const x1 = Math.max(0, Math.min(b.width, last.clientX - b.left)), y1 = last.clientY - b.top + E.scroll.scrollTop;
      const l = Math.min(x0, x1), r = Math.max(x0, x1), t = Math.min(y0, y1), btm = Math.max(y0, y1);
      Object.assign(E.marquee.style, { display: "block", left: `${l}px`, top: `${t}px`, width: `${r - l}px`, height: `${btm - t}px` });
      this.selected = new Set(base);
      const r0 = Math.max(0, Math.floor((t - L.pad) / L.rowH)), r1 = Math.floor((btm - L.pad) / L.rowH);
      for (let row = r0; row <= r1; row++) {
        const ty = L.pad + row * L.rowH;
        if (ty > btm || ty + L.tileH < t) continue;
        for (let c = 0; c < L.cols; c++) {
          const tx = L.pad + c * (L.tileW + L.gap);
          if (tx > r || tx + L.tileW < l) continue;
          const it = this.items[row * L.cols + c];
          if (it) base.has(it.name) ? this.selected.delete(it.name) : this.selected.add(it.name);
        }
      }
      this.repaint();
      if (last.clientY > b.bottom - 16 || last.clientY < b.top + 16) raf = requestAnimationFrame(update);
    };
    const move = (ev) => {
      last = ev;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const up = () => {
      cancelAnimationFrame(raf);
      E.marquee.style.display = "none";
      removeEventListener("mousemove", move);
      removeEventListener("mouseup", up);
    };
    addEventListener("mousemove", move);
    addEventListener("mouseup", up);
  }

  onHover(e) {
    const el = e.target.closest?.(".mb-item.kind-video");
    if (el === this.hoverEl) return;
    this.hideHoverPreview();
    if (!el || this.view !== "grid") return;
    this.hoverEl = el;
    const it = this.items[el._i];
    this.hoverTimer = setTimeout(() => {
      if (this.hoverEl !== el || !it) return;
      const v = h("video", { class: "mb-hover-video", muted: true, loop: true, autoplay: true, playsinline: true, preload: "auto" });
      v.muted = true;
      v.src = fileUrl(this.root, joinPath(this.path, it.name));
      v.addEventListener("playing", () => v.classList.add("playing"), { once: true });
      el.querySelector(".mb-thumb").appendChild(v);
      this.hoverVideo = v;
    }, 450);
  }

  hideHoverPreview() {
    clearTimeout(this.hoverTimer);
    this.hoverEl = null;
    if (this.hoverVideo) {
      this.hoverVideo.pause();
      this.hoverVideo.removeAttribute("src");
      this.hoverVideo.load();
      this.hoverVideo.remove();
      this.hoverVideo = null;
    }
  }

  // ----- keyboard -----

  onKeyDown(e) {
    e.stopPropagation();
    if (this.dialogOpen) return;
    if (this.menu) {
      if (this.menu.onKey(e)) e.preventDefault();
      return;
    }
    if (this.viewer.isOpen) {
      this.viewer.onKey(e);
      return;
    }
    const inInput = e.target.matches?.("input, textarea, select");
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") {
      e.preventDefault();
      if (inInput && e.target === this.el.search && this.el.search.value) {
        this.el.search.value = "";
        this.query = "";
        this.reload();
      } else if (inInput) this.el.window.focus();
      else if (this.selected.size) { this.selected.clear(); this.repaint(); }
      else this.close();
      return;
    }
    if (ctrl && e.key.toLowerCase() === "f") { e.preventDefault(); this.el.search.focus(); this.el.search.select(); return; }
    if (e.key === "F5") { e.preventDefault(); this.refresh(true); return; }
    if (inInput) {
      if (e.key === "ArrowDown" && e.target === this.el.search) { e.preventDefault(); this.el.window.focus(); this.setFocus(0); }
      return;
    }

    const L = this.layout, n = this.total;
    const cur = this.focusIndex;
    const mode = e.shiftKey ? "range" : ctrl ? "none" : "single";
    const move = (to) => {
      e.preventDefault();
      if (!n) return;
      this.setFocus(Math.max(0, Math.min(n - 1, to)), { select: mode });
    };
    const perPage = Math.max(1, Math.floor(this.el.scroll.clientHeight / L.rowH)) * L.cols;
    switch (e.key) {
      case "ArrowRight": if (e.altKey) { e.preventDefault(); this.goHistory(1); return; } return move(cur < 0 ? 0 : L.mode === "grid" ? cur + 1 : cur);
      case "ArrowLeft": if (e.altKey) { e.preventDefault(); this.goHistory(-1); return; } return move(cur < 0 ? 0 : L.mode === "grid" ? cur - 1 : cur);
      case "ArrowDown": return move(cur < 0 ? 0 : cur + L.cols);
      case "ArrowUp": if (e.altKey) { e.preventDefault(); this.goUp(); return; } return move(cur < 0 ? 0 : cur - L.cols);
      case "Home": return move(0);
      case "End": return move(n - 1);
      case "PageDown": return move(cur + perPage);
      case "PageUp": return move(cur - perPage);
      case " ":
        e.preventDefault();
        if (cur >= 0) this.setFocus(cur, { select: ctrl ? "toggle" : "single" });
        return;
      case "Enter":
        e.preventDefault();
        if (e.altKey) this.showProperties();
        else if (cur >= 0 && this.selected.size <= 1) this.openItem(cur);
        else if (this.selected.size > 1) this.viewSelected();
        return;
      case "Backspace": e.preventDefault(); this.goUp(); return;
      case "Delete": e.preventDefault(); this.deleteSelected(); return;
      case "F2": e.preventDefault(); this.renameSelected(); return;
      case "ContextMenu": {
        e.preventDefault();
        const el = this.rendered.get(cur);
        const r = (el || this.el.scroll).getBoundingClientRect();
        this.showContextMenu(r.left + 20, r.top + 20, cur >= 0 && this.selected.size ? "items" : "empty");
        return;
      }
    }
    if (ctrl) {
      switch (e.key.toLowerCase()) {
        case "a": e.preventDefault(); this.selectAll(); return;
        case "c": e.preventDefault(); this.copySelected(); return;
        case "x": e.preventDefault(); this.cutSelected(); return;
        case "s": e.preventDefault(); this.saveSelected(); return;
        case "n": if (e.shiftKey) { e.preventDefault(); this.newFolder(); } return;
        case "v":
          // Internal file clipboard pastes directly; otherwise let the paste event
          // deliver clipboard files (e.g. screenshots) for upload.
          if (this.clip) { e.preventDefault(); this.paste(); }
          return;
      }
      return;
    }
    if (e.key.length === 1 && !e.altKey) this.typeAhead(e.key);
  }

  typeAhead(ch) {
    const now = performance.now();
    this.typeahead.text = now - this.typeahead.time > 800 ? ch.toLowerCase() : this.typeahead.text + ch.toLowerCase();
    this.typeahead.time = now;
    const t = this.typeahead.text;
    const from = t.length === 1 ? this.focusIndex + 1 : Math.max(0, this.focusIndex);
    for (let k = 0; k < this.items.length; k++) {
      const i = (from + k) % this.items.length;
      if (this.items[i]?.name.toLowerCase().startsWith(t)) return this.setFocus(i);
    }
  }

  // ----- drag & drop -----

  dropTarget(e) {
    const tile = e.target.closest?.(".mb-item.kind-dir");
    if (tile && this.items[tile._i]) return { el: tile, root: this.root, path: joinPath(this.path, this.items[tile._i].name) };
    const node = e.target.closest?.(".mb-tree-row, .mb-crumb");
    if (node) return { el: node, root: node.dataset.root, path: node.dataset.path };
    if (e.target.closest?.(".mb-main")) return { el: null, root: this.root, path: this.path };
    return null;
  }

  onDragStart(e) {
    const i = this.indexFromEvent(e);
    if (i < 0) return;
    const it = this.items[i];
    if (!this.selected.has(it.name)) this.setFocus(i, { scroll: false });
    this.hideHoverPreview();
    const paths = this.selectedPaths();
    this.dragging = { root: this.root, paths };
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("application/x-media-browser", JSON.stringify(this.dragging));
    if (paths.length === 1 && it.kind !== "dir") {
      const url = absolute(fileUrl(this.root, paths[0]));
      e.dataTransfer.setData("text/uri-list", url);
      // Lets Chrome drop the file onto the desktop / other apps.
      e.dataTransfer.setData("DownloadURL", `application/octet-stream:${it.name}:${absolute(fileUrl(this.root, paths[0], true))}`);
    }
    const count = paths.length;
    if (count > 1) {
      const ghost = h("div", { class: "mb-drag-ghost" }, `${count} items`);
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 10, 10);
      setTimeout(() => ghost.remove());
    }
  }

  onDragOver(e) {
    const t = this.dropTarget(e);
    const types = e.dataTransfer.types;
    const internal = types.includes("application/x-media-browser");
    if (!t || (!internal && !types.includes("Files"))) return;
    if (internal && this.dragging && !this.canDrop(this.dragging, t)) {
      e.dataTransfer.dropEffect = "none";
      this.clearDropHighlight();
      return;
    }
    e.preventDefault();
    if (internal) {
      const copy = e.ctrlKey || (!e.shiftKey && this.dragging && this.dragging.root !== t.root);
      e.dataTransfer.dropEffect = copy ? "copy" : "move";
    } else e.dataTransfer.dropEffect = "copy";
    if (this.dropEl !== t.el) {
      this.clearDropHighlight();
      this.dropEl = t.el;
      t.el?.classList.add("mb-drop");
      if (!t.el) this.el.main.classList.add("mb-drop-main");
    }
  }

  canDrop(src, t) {
    if (!t.el && src.root === t.root && t.path === this.path) return false;
    return !src.paths.some((p) => src.root === t.root && (t.path === p || t.path.startsWith(`${p}/`) || parentPath(p) === t.path));
  }

  clearDropHighlight() {
    this.dropEl?.classList.remove("mb-drop");
    this.dropEl = null;
    this.el.main.classList.remove("mb-drop-main");
  }

  async onDrop(e) {
    const t = this.dropTarget(e);
    this.clearDropHighlight();
    if (!t) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-media-browser");
    if (raw) {
      const src = JSON.parse(raw);
      this.dragging = null;
      if (!this.canDrop(src, t)) return;
      const op = e.ctrlKey || (!e.shiftKey && src.root !== t.root) ? "copy" : "move";
      await this.transfer(op, src.root, src.paths, t.root, t.path);
    } else if (e.dataTransfer.files.length) {
      await this.upload([...e.dataTransfer.files], t.root, t.path);
    }
  }

  // ----- actions -----

  async openItem(i) {
    const it = await this.itemAt(i);
    if (!it) return;
    if (it.kind === "dir") this.navigate(this.root, joinPath(this.path, it.name));
    else if (MEDIA.has(it.kind)) this.viewer.open(i);
    else window.open(fileUrl(this.root, joinPath(this.path, it.name)), "_blank");
  }

  viewSelected() {
    const i = this.items.findIndex((it) => it && this.selected.has(it.name) && MEDIA.has(it.kind));
    if (i >= 0) this.viewer.open(i);
  }

  openInNewTab(items = this.selectedItems()) {
    for (const it of items.filter((x) => x.kind !== "dir").slice(0, 10)) {
      window.open(fileUrl(this.root, joinPath(this.path, it.name)), "_blank", "noopener");
    }
  }

  async renameSelected() {
    const [it] = this.selectedItems();
    if (!it || this.selected.size !== 1) return;
    const dot = it.kind === "dir" ? -1 : it.name.lastIndexOf(".");
    const name = await this.prompt("Rename", it.name, [0, dot > 0 ? dot : it.name.length], "Rename");
    if (!name || name === it.name) return;
    try {
      const res = await request("/mediabrowser/rename", { body: { root: this.root, path: joinPath(this.path, it.name), name } });
      if (it.kind === "dir") this.invalidateTree(this.root, this.path);
      await this.refresh();
      this.selectByName(res.name);
    } catch (e) {
      this.toast(e.message, "error");
    }
  }

  async deleteSelected(items = this.selectedItems()) {
    if (!items.length) return false;
    const what = items.length === 1 ? `"${items[0].name}"` : `these ${items.length} items`;
    const hasDir = items.some((it) => it.kind === "dir");
    const ok = await this.confirm("Delete", `Permanently delete ${what}?${hasDir ? " Folders are deleted with all of their contents." : ""} This cannot be undone.`, "Delete", true);
    if (!ok) return false;
    try {
      const res = await request("/mediabrowser/delete", { body: { root: this.root, paths: items.map((it) => joinPath(this.path, it.name)) } });
      const errs = Object.entries(res.errors);
      if (errs.length) this.toast(`Could not delete ${errs.length} item(s): ${errs[0][1]}`, "error");
      else this.toast(`Deleted ${res.deleted.length} item${res.deleted.length === 1 ? "" : "s"}`);
      for (const p of res.deleted) this.selected.delete(baseName(p));
      if (hasDir) this.invalidateTree(this.root, this.path);
      await this.refresh();
      if (this.focusIndex >= 0 && !this.selected.size) this.setFocus(Math.min(this.focusIndex, this.total - 1), { scroll: false });
      return true;
    } catch (e) {
      this.toast(e.message, "error");
      return false;
    }
  }

  async newFolder() {
    const name = await this.prompt("New folder", "New folder", null, "Create");
    if (!name) return;
    try {
      const res = await request("/mediabrowser/mkdir", { body: { root: this.root, path: this.path, name } });
      this.invalidateTree(this.root, this.path);
      await this.refresh();
      this.selectByName(res.name);
    } catch (e) {
      this.toast(e.message, "error");
    }
  }

  setClip(op) {
    const items = this.selectedItems();
    if (!items.length) return null;
    this.clip = { op, root: this.root, dir: this.path, names: new Set(items.map((it) => it.name)), paths: items.map((it) => joinPath(this.path, it.name)) };
    this.repaint();
    return items;
  }

  cutSelected() {
    const items = this.setClip("move");
    if (items) this.toast(`Cut ${items.length} item${items.length === 1 ? "" : "s"} — paste with Ctrl+V`);
  }

  async copySelected(items = this.selectedItems()) {
    if (!items.length) return;
    this.setClip("copy");
    const files = items.filter((it) => it.kind !== "dir");
    const first = files[0];
    try {
      if (items.length === 1 && first?.kind === "image" && navigator.clipboard?.write && window.ClipboardItem) {
        // Clipboard only accepts PNG images; convert other formats through a canvas.
        const src = fileUrl(this.root, joinPath(this.path, first.name));
        const png = fetch(src).then((r) => r.blob()).then(async (b) => {
          if (b.type === "image/png") return b;
          const bmp = await createImageBitmap(b);
          const c = new OffscreenCanvas(bmp.width, bmp.height);
          c.getContext("2d").drawImage(bmp, 0, 0);
          return c.convertToBlob({ type: "image/png" });
        });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
        this.toast(`Copied image "${first.name}" to clipboard`);
      } else {
        const text = files.map((it) => absolute(fileUrl(this.root, joinPath(this.path, it.name)))).join("\n");
        if (text) await this.copyText(text);
        this.toast(files.length === 1
          ? `Copied link to "${first.name}" (browsers can only put images on the clipboard) — Ctrl+V here pastes the file`
          : `Copied ${items.length} items — Ctrl+V in another folder pastes them`);
      }
    } catch (e) {
      this.toast(`Clipboard unavailable (${e.message.replace(/\.+$/, "")}). Ctrl+V in another folder still pastes the file.`, "error");
    }
  }

  async copyText(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(text);
    const ta = h("textarea", { style: { position: "fixed", opacity: "0" } });
    ta.value = text;
    this.el.window.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    this.el.window.focus();
  }

  onPaste(e) {
    e.stopPropagation();
    if (e.target.matches?.("input, textarea") || this.dialogOpen) return;
    e.preventDefault();
    const files = [...(e.clipboardData?.files || [])];
    if (this.clip) this.paste();
    else if (files.length) {
      const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      this.upload(files.map((f) => (f.name === "image.png" ? new File([f], `pasted_${stamp}.png`, { type: f.type }) : f)), this.root, this.path);
    }
  }

  async paste() {
    if (!this.clip) return;
    const { op, root, paths } = this.clip;
    await this.transfer(op, root, paths, this.root, this.path);
    if (op === "move") this.clip = null;
    this.updateCommands();
  }

  async transfer(op, srcRoot, paths, dstRoot, dstPath) {
    try {
      const res = await request("/mediabrowser/transfer", { body: { op, src_root: srcRoot, paths, dst_root: dstRoot, dst_path: dstPath } });
      const errs = Object.entries(res.errors);
      if (errs.length) this.toast(`${errs.length} item(s) failed: ${errs[0][1]}`, "error");
      if (res.done.length) {
        const where = dstPath ? baseName(dstPath) : ROOTS[dstRoot];
        this.toast(`${op === "move" ? "Moved" : "Copied"} ${res.done.length} item${res.done.length === 1 ? "" : "s"} to ${where}`);
      }
      this.invalidateTree(srcRoot, parentPath(paths[0] || ""));
      this.invalidateTree(dstRoot, dstPath);
      await this.refresh();
      if (dstRoot === this.root && dstPath === this.path && res.done.length) {
        this.selected = new Set(res.done);
        this.repaint();
      }
    } catch (e) {
      this.toast(e.message, "error");
    }
  }

  async saveSelected(items = this.selectedItems()) {
    if (!items.length) return;
    if (items.length === 1 && items[0].kind !== "dir") {
      return download(fileUrl(this.root, joinPath(this.path, items[0].name), true), items[0].name);
    }
    this.progress(0.02, `Preparing zip of ${items.length} item(s)…`);
    try {
      const res = await request("/mediabrowser/zip", { body: { root: this.root, paths: items.map((it) => joinPath(this.path, it.name)) } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || "media.zip";
      download(url, name);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      this.toast(e.message, "error");
    } finally {
      this.progress(null);
    }
  }

  async loadWorkflow(it) {
    try {
      const blob = await (await fetch(fileUrl(this.root, joinPath(this.path, it.name)))).blob();
      await app.handleFile(new File([blob], it.name, { type: blob.type }));
      this.close();
    } catch (e) {
      this.toast(`Could not load workflow: ${e.message}`, "error");
    }
  }

  upload(files, root, path) {
    if (!files.length) return;
    const fd = new FormData();
    fd.append("root", root);
    fd.append("path", path);
    for (const f of files) fd.append("file", f, f.name);
    const total = files.reduce((a, f) => a + f.size, 0);
    const label = files.length === 1 ? `"${files[0].name}"` : `${files.length} files`;
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", api.apiURL("/mediabrowser/upload"));
      xhr.upload.onprogress = (ev) => this.progress(ev.loaded / (ev.total || total || 1), `Uploading ${label}… ${fmtSize(ev.loaded)} / ${fmtSize(ev.total || total)}`);
      xhr.onload = async () => {
        this.progress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          const { saved } = JSON.parse(xhr.responseText);
          this.toast(`Uploaded ${saved.length} file${saved.length === 1 ? "" : "s"}`);
          if (root === this.root && path === this.path) {
            await this.refresh();
            this.selected = new Set(saved);
            this.repaint();
          } else this.invalidateTree(root, parentPath(path));
        } else this.toast(`Upload failed: ${xhr.responseText || xhr.statusText}`, "error");
        resolve();
      };
      xhr.onerror = () => { this.progress(null); this.toast("Upload failed: network error", "error"); resolve(); };
      this.progress(0, `Uploading ${label}…`);
      xhr.send(fd);
    });
  }

  progress(frac, text) {
    const E = this.el;
    E.progress.style.display = frac == null ? "none" : "";
    if (frac != null) E.progress.firstChild.style.width = `${Math.round(frac * 100)}%`;
    E.statusRight.textContent = text || "";
  }

  // ----- properties -----

  async showProperties(items = this.selectedItems()) {
    if (!items.length) items = [{ name: this.path ? baseName(this.path) : ROOTS[this.root], kind: "dir", self: true }];
    if (items.length > 1) {
      const bytes = items.reduce((a, it) => a + (it.kind === "dir" ? 0 : it.size), 0);
      const count = (k) => items.filter((it) => it.kind === k).length;
      const rows = [["Items", items.length], ["Images", count("image")], ["Videos", count("video")], ["Folders", count("dir")],
        ["Other files", count("file")], ["Total size", `${fmtSize(bytes)} (${bytes.toLocaleString()} bytes)`],
        ["Location", joinPath(this.root, this.path)]].filter(([, v]) => v !== 0);
      return this.dialog({ title: `Properties — ${items.length} items`, body: propTable(rows), buttons: [{ label: "Close", value: true, primary: true }] });
    }
    const it = items[0];
    const path = it.self ? this.path : joinPath(this.path, it.name);
    let info;
    try {
      info = await request("/mediabrowser/info", { params: { root: this.root, path } });
    } catch (e) {
      return this.toast(e.message, "error");
    }
    const m = info.media || {};
    const rows = [
      ["Name", info.name],
      ["Type", info.kind === "dir" ? "File folder" : `${typeLabel(info)}${info.mime ? ` (${info.mime})` : ""}`],
      ["Location", joinPath(this.root, parentPath(path))],
      ["Size", `${fmtSize(info.size)} (${info.size.toLocaleString()} bytes)`],
      info.kind === "dir" && ["Contains", `${info.files.toLocaleString()} files, ${info.dirs.toLocaleString()} folders`],
      "-",
      ["Created", new Date(info.created * 1000).toLocaleString()],
      ["Modified", new Date(info.modified * 1000).toLocaleString()],
      ["Accessed", new Date(info.accessed * 1000).toLocaleString()],
    ];
    if (info.media) {
      rows.push("-",
        m.width && ["Dimensions", `${m.width} × ${m.height} px`],
        m.width && ["Megapixels", (m.width * m.height / 1e6).toFixed(2)],
        m.format && ["Format", m.format],
        m.codec && ["Video codec", `${m.codec}${m.pix_fmt ? ` (${m.pix_fmt})` : ""}`],
        m.mode && ["Color mode", m.mode],
        m.fps && ["Frame rate", `${m.fps} fps`],
        m.duration != null && ["Duration", `${fmtDuration(m.duration)} (${m.duration.toFixed(2)} s)`],
        m.frames && ["Frames", m.frames.toLocaleString()],
        m.bitrate && ["Bitrate", `${(m.bitrate / 1000).toFixed(0)} kbps`],
        info.kind === "video" && ["Audio", m.audio ? `${m.audio.codec}, ${m.audio.sample_rate} Hz, ${m.audio.channels} ch` : "None"],
        m.dpi && ["DPI", m.dpi.join(" × ")],
        m.has_workflow != null && ["ComfyUI metadata", m.has_workflow ? "Workflow embedded" : m.has_prompt ? "Prompt embedded" : "None"],
        m.error && ["Error", m.error]);
    }
    const preview = MEDIA.has(info.kind) && !it.self
      ? h("img", { class: "mb-prop-thumb", src: thumbUrl(this.root, path, it, 256) })
      : h("div", { class: "mb-prop-icon", html: info.kind === "dir" ? ICONS.folder : ICONS.file });
    const body = h("div", { class: "mb-props" }, preview, propTable(rows.filter(Boolean)));
    const buttons = [{ label: "Close", value: "close", primary: true }];
    if (m.has_workflow || m.has_prompt) buttons.unshift({ label: "Load workflow", value: "workflow" });
    const choice = await this.dialog({ title: `Properties — ${info.name}`, body, buttons, wide: true });
    if (choice === "workflow") this.loadWorkflow(it);
  }

  // ----- context menu -----

  onContextMenu(e) {
    e.preventDefault();
    const i = this.indexFromEvent(e);
    if (i < 0 && this.selected.size) { this.selected.clear(); this.repaint(); }
    this.showContextMenu(e.clientX, e.clientY, i >= 0 ? "items" : "empty");
  }

  showContextMenu(x, y, kind) {
    const items = kind === "items" ? this.selectedItems() : [];
    const one = items.length === 1 ? items[0] : null;
    const media = items.filter((it) => MEDIA.has(it.kind));
    const other = this.root === "input" ? "output" : "input";
    const entries = [];
    if (kind === "items" && items.length) {
      if (one?.kind === "dir") entries.push({ label: "Open", icon: "folder", bold: true, action: () => this.navigate(this.root, joinPath(this.path, one.name)) });
      if (media.length) {
        entries.push({ label: "View", icon: "view", bold: one?.kind !== "dir", shortcut: "Enter", action: () => this.viewSelected() });
        entries.push({ label: media.length > 1 ? `View in new tabs (${Math.min(10, media.length)})` : "View in new tab", icon: "external", action: () => this.openInNewTab(media) });
      }
      if (one && MEDIA.has(one.kind)) entries.push({ label: "Load workflow", icon: "workflow", action: () => this.loadWorkflow(one) });
      entries.push("-",
        { label: "Cut", icon: "cut", shortcut: "Ctrl+X", action: () => this.cutSelected() },
        { label: one?.kind === "image" ? "Copy image" : "Copy", icon: "copy", shortcut: "Ctrl+C", action: () => this.copySelected() },
        { label: `Copy to ${ROOTS[other]}`, icon: "send", action: () => this.transfer("copy", this.root, this.selectedPaths(), other, "") },
        { label: items.length > 1 || one.kind === "dir" ? "Save as zip" : "Save", icon: "download", shortcut: "Ctrl+S", action: () => this.saveSelected() },
        "-",
        { label: "Rename", icon: "rename", shortcut: "F2", disabled: !one, action: () => this.renameSelected() },
        { label: items.length > 1 ? `Delete ${items.length} items` : "Delete", icon: "trash", shortcut: "Del", danger: true, action: () => this.deleteSelected() },
        "-",
        { label: "Properties", icon: "info", shortcut: "Alt+Enter", action: () => this.showProperties() });
    } else {
      const check = (on) => (on ? "check" : null);
      entries.push(
        { label: "Paste", icon: "paste", shortcut: "Ctrl+V", disabled: !this.clip, action: () => this.paste() },
        "-",
        { label: "New folder", icon: "folderPlus", shortcut: "Ctrl+Shift+N", action: () => this.newFolder() },
        { label: "Upload files…", icon: "upload", action: () => this.el.fileInput.click() },
        { label: "Refresh", icon: "refresh", shortcut: "F5", action: () => this.refresh(true) },
        "-",
        { label: "Large icons", icon: check(this.view === "grid"), action: () => this.setView("grid") },
        { label: "Details", icon: check(this.view === "details"), action: () => this.setView("details") },
        "-",
        ...[["name", "Name"], ["mtime", "Date modified"], ["size", "Size"], ["type", "Type"]].map(([k, l]) =>
          ({ label: `Sort by ${l.toLowerCase()}`, icon: check(this.sort === k), action: () => this.setSort(k) })),
        { label: this.desc ? "Descending" : "Ascending", icon: this.desc ? "sortDesc" : "sortAsc", action: () => this.setSort(this.sort, !this.desc) },
        "-",
        { label: "Select all", shortcut: "Ctrl+A", action: () => this.selectAll() },
        { label: "Properties", icon: "info", action: () => this.showProperties([]) });
    }
    this.openMenu(x, y, entries);
  }

  openMenu(x, y, entries) {
    this.closeMenu();
    const buttons = [];
    const el = h("div", { class: "mb-menu", role: "menu" }, ...entries.map((en) => {
      if (en === "-") return h("div", { class: "mb-menu-sep" });
      const b = h("button", { class: `mb-menu-item ${en.danger ? "danger" : ""} ${en.bold ? "bold" : ""}`, disabled: en.disabled, role: "menuitem",
        onclick: () => { this.closeMenu(); en.action(); } },
        h("span", { class: "mb-menu-icon", html: en.icon === "check" ? svg('<path d="M20 6 9 17l-5-5"/>') : en.icon ? ICONS[en.icon] : "" }),
        h("span", { class: "mb-menu-label" }, en.label),
        h("span", { class: "mb-menu-shortcut" }, en.shortcut || ""));
      if (!en.disabled) buttons.push(b);
      return b;
    }));
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    this.el.window.appendChild(el);
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 4))}px`;
    el.style.top = `${Math.max(4, y + r.height > innerHeight - 4 ? y - r.height : y)}px`;
    let idx = -1;
    const closer = () => this.closeMenu();
    setTimeout(() => addEventListener("mousedown", closer, { once: true }));
    this.menu = {
      el,
      closer,
      onKey: (e) => {
        if (e.key === "Escape") { this.closeMenu(); return true; }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[idx].focus();
          return true;
        }
        if (e.key === "Enter" && idx >= 0) { buttons[idx].click(); return true; }
        return false;
      },
    };
  }

  closeMenu() {
    if (!this.menu) return;
    removeEventListener("mousedown", this.menu.closer);
    this.menu.el.remove();
    this.menu = null;
    if (this.isOpen && !this.viewer.isOpen) this.el.window.focus({ preventScroll: true });
  }

  // ----- dialogs & toasts -----

  dialog({ title, body, buttons, input, wide }) {
    return new Promise((resolve) => {
      const prevFocus = document.activeElement;
      this.dialogOpen = true;
      const finish = (v) => {
        this.dialogOpen = false;
        back.remove();
        (prevFocus?.isConnected ? prevFocus : this.el.window).focus({ preventScroll: true });
        resolve(v);
      };
      const field = input ? h("input", { class: "mb-dialog-input", value: input.value, spellcheck: "false" }) : null;
      const btns = buttons.map((b) => h("button", { class: `mb-dbtn ${b.primary ? "primary" : ""} ${b.danger ? "danger" : ""}`,
        onclick: () => finish(field && b.primary ? field.value.trim() : b.value) }, b.label));
      const box = h("div", { class: `mb-dialog ${wide ? "wide" : ""}` },
        h("div", { class: "mb-dialog-title" }, title),
        h("div", { class: "mb-dialog-body" }, body || "", field),
        h("div", { class: "mb-dialog-buttons" }, ...btns));
      const back = h("div", { class: "mb-dialog-back", onmousedown: (e) => e.target === back && finish(null) }, box);
      box.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") { e.preventDefault(); finish(null); }
        else if (e.key === "Enter" && !e.target.matches("button")) {
          e.preventDefault();
          const primary = buttons.findIndex((b) => b.primary);
          btns[primary >= 0 ? primary : 0].click();
        }
      });
      this.el.window.appendChild(back);
      if (field) {
        field.focus();
        field.setSelectionRange(...(input.select || [0, field.value.length]));
      } else (btns.find((b) => b.classList.contains("primary")) || btns[0]).focus();
    });
  }

  prompt(title, value, select, okLabel = "OK") {
    return this.dialog({ title, input: { value, select }, buttons: [{ label: "Cancel", value: null }, { label: okLabel, primary: true }] });
  }

  confirm(title, message, okLabel = "OK", danger = false) {
    return this.dialog({ title, body: h("p", {}, message), buttons: [{ label: "Cancel", value: false }, { label: okLabel, value: true, primary: true, danger }] })
      .then((v) => v === true);
  }

  toast(text, type = "info") {
    const t = h("div", { class: `mb-toast ${type}` }, text);
    this.el.toasts.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, type === "error" ? 6000 : 3000);
  }
}

function propTable(rows) {
  return h("table", { class: "mb-prop-table" }, ...rows.map((r) =>
    r === "-" ? h("tr", { class: "sep" }, h("td", { colspan: 2 })) : h("tr", {}, h("th", {}, r[0]), h("td", {}, String(r[1])))));
}

// ---------------------------------------------------------------- viewer ---

class MediaViewer {
  constructor(browser) {
    this.b = browser;
    this.index = -1;
    this.tf = { s: 1, x: 0, y: 0, fit: true };
    const btn = (icon, title, fn) => h("button", { class: "mb-vbtn", title, html: ICONS[icon], onclick: fn });
    this.title = h("div", { class: "mb-v-title" });
    this.sub = h("div", { class: "mb-v-sub" });
    this.img = h("img", { class: "mb-v-img", draggable: "false", alt: "" });
    this.video = h("video", { class: "mb-v-video", controls: true, loop: true, playsinline: true, preload: "auto" });
    this.stage = h("div", { class: "mb-v-stage" }, this.img, this.video);
    this.spinner = h("div", { class: "mb-v-spinner" });
    this.el = h("div", { class: "mb-viewer", tabindex: "-1" },
      h("div", { class: "mb-v-top" },
        h("div", { class: "mb-v-heading" }, this.title, this.sub),
        btn("fit", "Fit / actual size (F)", () => this.toggleZoom()),
        btn("external", "Open in new tab", () => this.current && window.open(this.src(), "_blank", "noopener")),
        btn("download", "Save (Ctrl+S)", () => this.current && this.b.saveSelected([this.current])),
        btn("copy", "Copy (Ctrl+C)", () => this.current && this.b.copySelected([this.current])),
        btn("info", "Properties (I)", () => this.current && this.b.showProperties([this.current])),
        btn("trash", "Delete (Del)", () => this.deleteCurrent()),
        h("div", { class: "mb-v-divider" }),
        btn("close", "Close (Esc)", () => this.close())),
      this.stage, this.spinner,
      h("button", { class: "mb-v-nav prev", title: "Previous (←)", html: ICONS.prev, onclick: () => this.step(-1) }),
      h("button", { class: "mb-v-nav next", title: "Next (→)", html: ICONS.chevron, onclick: () => this.step(1) }));
    browser.el.window.appendChild(this.el);
    this.bind();
  }

  get isOpen() {
    return this.el.classList.contains("open");
  }

  get current() {
    return this.b.items[this.index];
  }

  src(it = this.current) {
    return fileUrl(this.b.root, joinPath(this.b.path, it.name));
  }

  bind() {
    this.stage.addEventListener("wheel", (e) => {
      if (!this.img.naturalWidth || this.current?.kind !== "image") return;
      e.preventDefault();
      const r = this.stage.getBoundingClientRect();
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    this.stage.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || this.current?.kind !== "image") return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = this.tf.x, oy = this.tf.y;
      this.stage.classList.add("panning");
      const move = (ev) => { this.tf.x = ox + ev.clientX - sx; this.tf.y = oy + ev.clientY - sy; this.tf.fit = false; this.apply(); };
      const up = () => { this.stage.classList.remove("panning"); removeEventListener("mousemove", move); removeEventListener("mouseup", up); };
      addEventListener("mousemove", move);
      addEventListener("mouseup", up);
    });
    this.stage.addEventListener("dblclick", (e) => {
      if (this.current?.kind !== "image") return;
      const r = this.stage.getBoundingClientRect();
      this.toggleZoom(e.clientX - r.left, e.clientY - r.top);
    });
    this.stage.addEventListener("click", (e) => { if (e.target === this.stage && this.current?.kind === "video") this.close(); });
    this.img.addEventListener("load", () => {
      if (this.tf.fit) this.fit();
      else this.apply();
    });
    new ResizeObserver(() => this.isOpen && this.tf.fit && this.fit()).observe(this.stage);
  }

  async open(i) {
    this.el.classList.add("open");
    this.el.focus({ preventScroll: true });
    await this.show(i);
  }

  close() {
    if (!this.isOpen) return;
    this.el.classList.remove("open");
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.img.removeAttribute("src");
    if (this.index >= 0 && this.index < this.b.total) this.b.setFocus(this.index, { select: "single" });
    this.b.el.window.focus({ preventScroll: true });
  }

  async show(i) {
    const it = await this.b.itemAt(i);
    if (!it) return;
    this.index = i;
    const token = (this.token = {});
    const isVideo = it.kind === "video";
    this.el.classList.toggle("is-video", isVideo);
    this.title.textContent = it.name;
    this.sub.textContent = `${fmtSize(it.size)} · ${fmtDate(it.mtime)}`;
    this.tf.fit = true;
    if (isVideo) {
      this.img.removeAttribute("src");
      this.video.poster = thumbUrl(this.b.root, joinPath(this.b.path, it.name), it, 512);
      this.video.src = this.src(it);
      this.video.play().catch(() => {});
      this.video.addEventListener("loadedmetadata", () => {
        if (this.token === token) this.sub.textContent = `${this.video.videoWidth} × ${this.video.videoHeight} · ${fmtDuration(this.video.duration)} · ${fmtSize(it.size)}`;
      }, { once: true });
    } else {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.removeAttribute("poster");
      // Show the cached thumbnail immediately, then swap in the full image once decoded.
      this.img.src = thumbUrl(this.b.root, joinPath(this.b.path, it.name), it, 512);
      this.el.classList.add("pending");
      const full = new Image();
      full.decoding = "async";
      full.src = this.src(it);
      full.decode().catch(() => {}).then(() => {
        if (this.token !== token) return;
        this.el.classList.remove("pending");
        if (full.naturalWidth) {
          this.img.src = full.src;
          this.sub.textContent = `${full.naturalWidth} × ${full.naturalHeight} · ${fmtSize(it.size)} · ${fmtDate(it.mtime)}`;
        }
      });
    }
    this.updatePosition();
    this.preloadNeighbour(1);
    this.preloadNeighbour(-1);
  }

  updatePosition() {
    const b = this.b;
    this.el.querySelector(".mb-v-nav.prev").disabled = this.index <= 0;
    this.el.querySelector(".mb-v-nav.next").disabled = this.index >= b.total - 1;
  }

  async neighbour(dir) {
    for (let i = this.index + dir; i >= 0 && i < this.b.total; i += dir) {
      const it = await this.b.itemAt(i);
      if (it && MEDIA.has(it.kind)) return i;
    }
    return -1;
  }

  async preloadNeighbour(dir) {
    const i = await this.neighbour(dir);
    const it = this.b.items[i];
    if (it?.kind === "image") new Image().src = this.src(it);
  }

  async step(dir) {
    const i = await this.neighbour(dir);
    if (i >= 0) this.show(i);
  }

  async jumpToEnd(dir) {
    const keep = this.index;
    this.index = dir > 0 ? -1 : this.b.total;
    const i = await this.neighbour(dir);
    this.index = keep;
    if (i >= 0) this.show(i);
  }

  async deleteCurrent() {
    const it = this.current;
    if (!it) return;
    const next = await this.neighbour(1);
    const prev = await this.neighbour(-1);
    const nextName = this.b.items[next]?.name, prevName = this.b.items[prev]?.name;
    const deleted = await this.b.deleteSelected([it]);
    if (!deleted) return this.el.focus();
    await this.b.ensureLoaded(0, this.b.total);
    const i = this.b.items.findIndex((x) => x && (x.name === nextName || (!nextName && x.name === prevName)));
    if (i >= 0) { this.el.focus(); this.show(i); } else this.close();
  }

  fit() {
    const r = this.stage.getBoundingClientRect();
    const w = this.img.naturalWidth, hgt = this.img.naturalHeight;
    if (!w) return;
    const isThumb = this.el.classList.contains("pending");
    // A thumbnail is scaled up to where the full image will land to avoid a jump.
    const s = Math.min(r.width / w, r.height / hgt, isThumb ? Infinity : 1);
    this.tf = { s, x: (r.width - w * s) / 2, y: (r.height - hgt * s) / 2, fit: true };
    this.apply();
  }

  zoomAt(cx, cy, factor) {
    const s = Math.max(0.02, Math.min(40, this.tf.s * factor));
    const k = s / this.tf.s;
    this.tf = { s, x: cx - (cx - this.tf.x) * k, y: cy - (cy - this.tf.y) * k, fit: false };
    this.apply();
  }

  toggleZoom(cx, cy) {
    if (this.current?.kind !== "image") return;
    const r = this.stage.getBoundingClientRect();
    if (this.tf.fit || Math.abs(this.tf.s - 1) > 0.01) {
      cx ??= r.width / 2;
      cy ??= r.height / 2;
      this.zoomAt(cx, cy, 1 / this.tf.s);
    } else this.fit();
  }

  apply() {
    this.img.style.transform = `translate(${this.tf.x}px, ${this.tf.y}px) scale(${this.tf.s})`;
    this.img.classList.toggle("pixelated", this.tf.s >= 3);
  }

  onKey(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key;
    const handled = () => e.preventDefault();
    if (key === "Escape") { handled(); this.close(); }
    else if (key === "ArrowRight" || key === "PageDown") { handled(); this.step(1); }
    else if (key === "ArrowLeft" || key === "PageUp") { handled(); this.step(-1); }
    else if (key === "Home" || key === "End") { handled(); this.jumpToEnd(key === "Home" ? 1 : -1); }
    else if (key === "Delete") { handled(); this.deleteCurrent(); }
    else if (key === " " && this.current?.kind === "video") { handled(); this.video.paused ? this.video.play() : this.video.pause(); }
    else if (key.toLowerCase() === "f" || key === "0") { handled(); this.toggleZoom(); }
    else if (key === "+" || key === "=") { handled(); const r = this.stage.getBoundingClientRect(); this.zoomAt(r.width / 2, r.height / 2, 1.25); }
    else if (key === "-") { handled(); const r = this.stage.getBoundingClientRect(); this.zoomAt(r.width / 2, r.height / 2, 0.8); }
    else if (key.toLowerCase() === "i" || (key === "Enter" && e.altKey)) { handled(); this.b.showProperties([this.current]); }
    else if (ctrl && key.toLowerCase() === "c") { handled(); this.b.copySelected([this.current]); }
    else if (ctrl && key.toLowerCase() === "s") { handled(); this.b.saveSelected([this.current]); }
  }
}

// ------------------------------------------------------------- extension ---

const browser = new MediaBrowser();

app.registerExtension({
  name: "MediaBrowser",
  commands: [{
    id: "MediaBrowser.Toggle",
    label: "Toggle Media Browser",
    icon: "icon-[lucide--images]",
    function: () => browser.toggle(),
  }],
  actionBarButtons: [{
    icon: "icon-[lucide--images]",
    label: "Media",
    tooltip: "Media Browser — browse input & output files",
    onClick: () => browser.toggle(),
  }],
});
