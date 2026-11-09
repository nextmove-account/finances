/* Finances — interface. Everything stays in this browser (IndexedDB). This file makes no network requests. */
(function () {
  'use strict';
  const C = self.FinCore;
  // The laptop (Chrome or Edge) edits and keeps the shared data file up to date.
  // A browser that can't save to a file, like Safari on an iPhone, only views that file.
  const MODE = new URLSearchParams(location.search).get('mode');
  const CAN_LINK = typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';
  const VIEWER = MODE === 'view' || (MODE !== 'edit' && !CAN_LINK);

  /* ================================================================== icons (24px line icons) */
  const ICONS = {
    home: 'M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
    list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    inbox: 'M4 13.5h4.2l1.6 2.5h4.4l1.6-2.5H20M6.2 5h11.6L20 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5.5z',
    sliders: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
    upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3',
    download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3',
    search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.6-4.6',
    chevL: 'M14.5 6 8.5 12l6 6', chevR: 'M9.5 6l6 6-6 6', chevD: 'M6 9.5l6 6 6-6',
    calendar: 'M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1zM4 10.5h16M8.5 4v4M15.5 4v4',
    bank: 'M4 9.5 12 5l8 4.5M5.5 10.5v6.5M9.8 10.5v6.5M14.2 10.5v6.5M18.5 10.5v6.5M3.5 19.5h17',
    card: 'M4 6.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM3 10.5h18M7 14.5h3',
    wallet: 'M4 8v10a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-7.5a1 1 0 0 0-1-1H5.5A1.5 1.5 0 0 1 4 8a1.5 1.5 0 0 1 1.5-1.5H17v3M16 14.5h.01',
    trend: 'M4 17l5-5 4 3 7-7M15 8h5v5',
    shield: 'M12 4l7 3v5c0 4.2-3 7.2-7 8-4-.8-7-3.8-7-8V7z',
    lock: 'M6.5 10.5h11a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
    bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
    cart: 'M3.5 5h2l2 10.5h10l2-7.5H7M9.5 19.5h.01M16.5 19.5h.01',
    cup: 'M5 8.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M11.5 3.5v2.5',
    bus: 'M7 4.5h10a2 2 0 0 1 2 2V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6.5a2 2 0 0 1 2-2zM5 11.5h14M8.5 14.3h.01M15.5 14.3h.01M8 17l-1.5 2.5M16 17l1.5 2.5',
    bag: 'M5.5 8h13l-1 12h-11zM9 8V6.5a3 3 0 0 1 6 0V8',
    repeat: 'M17 4.5 19.5 7 17 9.5M19.5 7H8a3.5 3.5 0 0 0-3.5 3.5V11M7 19.5 4.5 17 7 14.5M4.5 17H16a3.5 3.5 0 0 0 3.5-3.5V13',
    heart: 'M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4z',
    plane: 'M20.5 3.5 3.5 10.5l7 2.5 2.5 7zM10.5 13l4-4',
    ticket: 'M4 7.5h16v3a1.5 1.5 0 0 0 0 3v3H4v-3a1.5 1.5 0 0 0 0-3zM14.5 7.5v2M14.5 11v2M14.5 14.5v2',
    gift: 'M4 9.5h16v3H4zM5.5 12.5V20h13v-7.5M12 9.5V20M12 9.5S10.5 5 8.5 5a2 2 0 0 0 0 4.5M12 9.5S13.5 5 15.5 5a2 2 0 0 1 0 4.5',
    receipt: 'M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5zM9 8h6M9 11.5h6M9 15h3.5',
    cash: 'M3.5 7h17v10h-17zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6.5 10v4M17.5 10v4',
    dots: 'M6 12h.01M12 12h.01M18 12h.01',
    target: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
    coins: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM14.6 9.6c-.4-.9-1.4-1.5-2.6-1.5-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.1 0 1.1-1.1 1.9-2.5 1.9-1.3 0-2.3-.6-2.6-1.6M12 6.5V8M12 16v1.5',
    briefcase: 'M4 8h16v11H4zM9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2M4 13h16',
    percent: 'M18 6 6 18M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19a5.5 5.5 0 0 1 11 0M16 11a2.5 2.5 0 1 0 0-5M17 13.5a4.5 4.5 0 0 1 3.5 4.5',
    arrowUp: 'M12 19V5M6 11l6-6 6 6', arrowDown: 'M12 5v14M6 13l6 6 6-6',
    arrowUpRight: 'M7 17 17 7M8 7h9v9',
    check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12M18 6 6 18',
    alert: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17h.01',
    clock: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 8v4.5l3 2',
    info: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 11v5M12 8h.01',
    plus: 'M12 5v14M5 12h14',
    trash: 'M5 7h14M10 7V5h4v2M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5',
    edit: 'M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4',
    swap: 'M7 7.5h12M15.5 4 19 7.5 15.5 11M17 16.5H5M8.5 13 5 16.5 8.5 20',
    eyeOff: 'M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.5 4.5 9 6-.3.8-1.2 2.2-2.6 3.6M6.4 7.6C4.6 8.9 3.4 10.7 3 12c.5 1.5 4 6 9 6 1.6 0 3-.4 4.2-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2',
    phone: 'M8 3.5h8a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM11 17.5h2',
    file: 'M7 3.5h7l4.5 4.5v12.5H7zM14 3.5V8h4.5',
    chart: 'M5 19.5V11M10 19.5V5M15 19.5v-6M20 19.5V8',
    refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
    pie: 'M12 4a8 8 0 1 0 8 8h-8z M14.5 3.8A8 8 0 0 1 20.2 9.5H14.5z',
    star: 'M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z',
  };
  const CAT_ICON = {
    housing: 'home', utilities: 'bolt', groceries: 'cart', eating: 'cup', transport: 'bus', shopping: 'bag', subscriptions: 'repeat',
    health: 'heart', travel: 'plane', entertainment: 'ticket', family: 'users', gifts: 'gift', fees: 'receipt', cash: 'cash', other: 'dots',
    salary: 'briefcase', bonus: 'star', interest: 'percent', dividends: 'trend', 'family-in': 'users', 'other-income': 'coins',
  };
  const ACCT_ICON = { hsbc: 'bank', amex: 'card', revolut: 'wallet', t212: 'trend', pension: 'shield' };
  const SVGNS = 'http://www.w3.org/2000/svg';

  function icon(name, size) {
    const sz = size || 18;
    const el = document.createElementNS(SVGNS, 'svg');
    el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('width', sz); el.setAttribute('height', sz);
    el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'currentColor'); el.setAttribute('stroke-width', name === 'dots' ? '2.6' : '1.7');
    el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round'); el.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', ICONS[name] || ICONS.dots);
    el.append(p);
    return el;
  }

  /* ================================================================== DOM helpers (text is always set as text, never parsed as HTML) */
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') Object.assign(el.style, v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if ((k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'open') && typeof v !== 'string') el[k] = v;
        else if (k === 'value') el.value = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { for (const k of kid) add(el, k); return; }
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  function setKids(el, kids) { el.replaceChildren(); add(el, kids); }
  function s(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k of Object.keys(attrs)) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    for (let i = 2; i < arguments.length; i++) {
      const kid = arguments[i];
      if (kid == null) continue;
      if (Array.isArray(kid)) kid.forEach((x) => x && el.append(x));
      else el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  /* ================================================================== formatting */
  const f2 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
  const MINUS = '−';
  function money(v, opts) {
    const o = opts || {};
    if (v == null || Number.isNaN(v)) return '—';
    const abs = Math.abs(v);
    const body = o.pence === false ? f0.format(Math.round(abs)) : f2.format(abs);
    const pre = v < -0.004 ? MINUS : (o.sign && v > 0.004 ? '+' : '');
    return pre + '£' + body;
  }
  function compact(v) {
    const a = Math.abs(v);
    if (a >= 1000) return (v < 0 ? MINUS : '') + '£' + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return (v < 0 ? MINUS : '') + '£' + f0.format(a);
  }
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmtDate(iso, year) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MON[m - 1]}${year ? ' ' + y : ''}`;
  }
  function fmtMonth(ym, short) {
    const [y, m] = ym.split('-').map(Number);
    return short ? MON[m - 1] : `${MONTH[m - 1]} ${y}`;
  }
  function fmtMonthYearShort(iso) {
    const [y, m] = iso.split('-').map(Number);
    return `${MON[m - 1]} ’${String(y).slice(2)}`;
  }
  function rel(n) {
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n > 1) return `in ${n} days`;
    if (n === -1) return 'yesterday';
    return `${-n} days ago`;
  }
  const pct = (v) => `${Math.round(v * 100)}%`;
  function fmtStamp(iso) {
    const d = new Date(iso);
    if (!iso || Number.isNaN(d.getTime())) return 'at an unknown time';
    const year = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
    return `${d.getDate()} ${MON[d.getMonth()]}${year}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const acctLabel = (a) => (a === 'pension' ? 'L&G pension' : (C.ACCOUNTS[a] || {}).label || a);
  const catLabel = (c) => C.CAT_LABEL[c] || 'Other';

  /* ================================================================== storage */
  const store = (() => {
    let dbp = null;
    const mem = {};
    let ok = true;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((resolve) => {
        try {
          const req = indexedDB.open('finances', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => { ok = false; resolve(null); };
          req.onblocked = () => { ok = false; resolve(null); };
        } catch (e) { ok = false; resolve(null); }
      });
      return dbp;
    }
    async function get(key) {
      const db = await open();
      if (!db) return mem[key];
      return new Promise((resolve) => {
        try {
          const r = db.transaction('kv').objectStore('kv').get(key);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => resolve(mem[key]);
        } catch (e) { resolve(mem[key]); }
      });
    }
    async function set(key, val) {
      mem[key] = val;
      const db = await open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(val, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => { ok = false; resolve(false); };
        } catch (e) { ok = false; resolve(false); }
      });
    }
    async function clear() {
      for (const k of Object.keys(mem)) delete mem[k];
      const db = await open();
      if (!db) return;
      await new Promise((resolve) => {
        try { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').clear(); tx.oncomplete = resolve; tx.onerror = resolve; }
        catch (e) { resolve(); }
      });
    }
    return { get, set, clear, get ok() { return ok; } };
  })();

  /* ================================================================== state */
  const state = {
    txns: [], settings: C.defaultSettings(), meta: { imports: [], demo: false, revolutBalance: null },
    view: 'overview', month: null, boardTab: 'bills', expand: {},
    tx: { q: '', month: '', acct: '', type: '', from: '', to: '' }, txLimit: 150,
    remember: true, chartTable: false, model: null, loaded: false,
  };
  // Saves to this browser, then (on the laptop) to the shared data file.
  async function persist(opts) {
    const quiet = opts && opts.quiet;
    if (!quiet) state.meta.changedAt = new Date().toISOString();
    await Promise.all([store.set('txns', state.txns), store.set('settings', state.settings), store.set('meta', state.meta)]);
    if (!quiet) scheduleSave();
  }

  /* ================================================================== the shared data file (laptop) */
  const sync = { handle: null, status: 'none', error: '', timer: null };
  const FILE_TYPES = [{ description: 'Finances data', accept: { 'application/json': ['.json'] } }];
  function setSync(status, error) {
    sync.status = status; sync.error = error || '';
    const chip = document.getElementById('sync-chip');
    if (chip) chip.replaceWith(syncChip());
    const line = document.getElementById('sync-status');
    if (line) line.textContent = syncStatusText();
  }
  async function writeFile(interactive) {
    const hnd = sync.handle;
    if (!hnd || VIEWER || state.meta.demo || !state.txns.length) return false;
    try {
      let perm = await hnd.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && interactive) perm = await hnd.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') { setSync('needs'); return false; }
      const savedAt = new Date().toISOString();
      state.meta.fileSavedAt = savedAt;
      const w = await hnd.createWritable();
      await w.write(JSON.stringify(C.packData(state.txns, state.settings, state.meta, savedAt)));
      await w.close();
      await store.set('meta', state.meta);
      setSync('saved');
      return true;
    } catch (e) { setSync('error', e && e.message ? e.message : ''); return false; }
  }
  function scheduleSave() {
    if (!sync.handle || VIEWER) return;
    clearTimeout(sync.timer);
    sync.timer = setTimeout(() => { writeFile(false); }, 600);
  }
  // Replace what's in this browser with the contents of a data file.
  async function applyData(data, extraMeta) {
    state.txns = data.txns;
    state.settings = data.settings;
    state.meta = Object.assign({ imports: [], demo: false, revolutBalance: null }, data.meta, { demo: false }, extraMeta || {});
    await persist({ quiet: true });
    state.month = null;
    recompute();
  }
  // On opening the app: make sure the file and this browser hold the same thing.
  async function connectFile(interactive) {
    const hnd = sync.handle;
    if (!hnd) return;
    try {
      let perm = await hnd.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && interactive) perm = await hnd.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') { setSync('needs'); return; }
      let data = null;
      try { const text = await (await hnd.getFile()).text(); if (text.trim()) data = C.readData(JSON.parse(text)); } catch (e) { data = null; }
      const mine = state.meta.fileSavedAt || '';
      const unsaved = !state.meta.demo && state.txns.length > 0 && (state.meta.changedAt || '') > mine;
      if (data && data.saved && data.saved > mine) {
        // The file was saved from somewhere else since this browser last wrote it.
        if (unsaved) { askWhich(data); return; }
        await applyData(data, { fileSavedAt: data.saved, changedAt: data.saved });
        render(); setSync('saved'); toast('Loaded the newer data file.');
        return;
      }
      if (unsaved || (!data && state.txns.length && !state.meta.demo)) { await writeFile(interactive); return; }
      setSync('saved');
    } catch (e) { setSync('error', e && e.message ? e.message : ''); }
  }
  function askWhich(data) {
    setSync('needs');
    sheet({
      title: 'Two versions of your data', sub: sync.handle.name,
      body: [h('p', { class: 'card-sub', style: { margin: 0 } }, `The data file was saved ${fmtStamp(data.saved)} from another browser, and this browser has changes that aren’t in it. Which do you want to keep?`)],
      foot: (close) => [
        h('button', { class: 'btn', onclick: async () => { close(); await applyData(data, { fileSavedAt: data.saved, changedAt: data.saved }); render(); setSync('saved'); toast('Loaded the data file.'); } }, `Use the file (${data.txns.length} transactions)`),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn primary', onclick: async () => { close(); state.meta.fileSavedAt = data.saved; await writeFile(true); } }, `Keep this browser’s (${state.txns.length})`)],
    });
  }
  async function linkNewFile() {
    try {
      const hnd = await window.showSaveFilePicker({ suggestedName: 'finances-data.json', types: FILE_TYPES });
      sync.handle = hnd;
      await store.set('fileHandle', hnd);
      const real = state.txns.length > 0 && !state.meta.demo;
      const ok = await writeFile(true);
      if (!real) setSync('saved');
      closeSheet(); render();
      toast(ok ? `Saved to ${hnd.name}. It’s kept up to date after every change.` : real ? 'Linked, but the first save didn’t work. Try “Save now” in Settings.' : 'Linked. It’s written once your own data is imported.');
    } catch (e) { if (!e || e.name !== 'AbortError') toast('Couldn’t link that file.'); }
  }
  async function linkExistingFile() {
    try {
      const [hnd] = await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false });
      let data;
      try { data = C.readData(JSON.parse(await (await hnd.getFile()).text())); }
      catch (e) { toast(e instanceof SyntaxError ? 'That isn’t a Finances data file.' : (e.message || 'Couldn’t read that file.')); return; }
      const use = async () => {
        sync.handle = hnd;
        await applyData(data, { fileSavedAt: data.saved, changedAt: data.saved });
        await store.set('fileHandle', hnd);
        let perm = 'prompt';
        try { perm = await hnd.requestPermission({ mode: 'readwrite' }); } catch (e) { perm = 'prompt'; }
        closeSheet(); state.view = 'overview'; render();
        setSync(perm === 'granted' ? 'saved' : 'needs');
        toast(`Loaded ${data.txns.length} transactions from ${hnd.name}.`);
      };
      if (state.txns.length && !state.meta.demo) {
        sheet({
          title: 'Replace what’s in this browser?', sub: hnd.name,
          body: [h('p', { class: 'card-sub', style: { margin: 0 } }, `The file has ${data.txns.length} transactions, saved ${fmtStamp(data.saved)}. This browser has ${state.txns.length}. Opening the file replaces what’s here.`)],
          foot: (close) => [h('button', { class: 'btn', onclick: close }, 'Cancel'), h('button', { class: 'btn primary', onclick: use }, 'Replace')],
        });
      } else await use();
    } catch (e) { if (!e || e.name !== 'AbortError') toast('Couldn’t open that file.'); }
  }
  async function unlinkFile() {
    clearTimeout(sync.timer);
    sync.handle = null;
    await store.set('fileHandle', null);
    setSync('none'); render();
    toast('Unlinked. The file itself isn’t touched.');
  }
  function syncStatusText() {
    if (state.meta.demo) return 'Demo data is never saved to the file.';
    if (!sync.handle) return 'Not linked yet. Create the file inside your Google Drive folder and the laptop keeps it up to date.';
    const name = sync.handle.name;
    if (sync.status === 'needs') return `Linked to ${name}, but the browser needs your permission again. Click “Save now”.`;
    if (sync.status === 'error') return `Couldn’t save to ${name}${sync.error ? ' (' + sync.error + ')' : ''}. Check the file still exists, then click “Save now”.`;
    return state.meta.fileSavedAt ? `Linked to ${name}. Last saved ${fmtStamp(state.meta.fileSavedAt)}.` : `Linked to ${name}. It’s written once your own data is imported.`;
  }
  function syncChip() {
    const id = 'sync-chip';
    if (VIEWER || !CAN_LINK || state.meta.demo || !state.model || state.model.empty) return h('span', { id, hidden: true });
    if (!sync.handle) return h('button', { id, class: 'btn ghost desk-only', onclick: openLink }, icon('file', 17), 'Link data file');
    if (sync.status === 'needs') return h('button', { id, class: 'btn sync-warn', onclick: () => connectFile(true) }, icon('alert', 17), 'Reconnect data file');
    if (sync.status === 'error') return h('button', { id, class: 'btn sync-warn', onclick: () => writeFile(true) }, icon('alert', 17), 'Couldn’t save. Retry');
    return h('span', { id, class: 'sync-ok desk-only', title: `Saved to ${sync.handle.name}` }, icon('check', 15), state.meta.fileSavedAt ? `Saved ${fmtStamp(state.meta.fileSavedAt)}` : 'Linked');
  }
  function openLink() {
    sheet({
      title: 'Link your data file', sub: 'One file in your Google Drive, shared with your iPhone',
      body: [h('div', { class: 'prose' }, h('ul', null,
        h('li', null, 'The laptop saves everything to this one file after every change.'),
        h('li', null, 'Put it inside your Google Drive folder. Google Drive for desktop adds that folder to File Explorer.'),
        h('li', null, 'On your iPhone, open the app, tap “Load latest” and pick the same file.')))],
      foot: () => [h('button', { class: 'btn', onclick: linkExistingFile }, 'Open an existing one'), h('span', { class: 'spacer' }),
        h('button', { class: 'btn primary', onclick: linkNewFile }, icon('file', 16), 'Create the data file')],
    });
  }
  // View only (iPhone): read the data file that the laptop saved.
  async function loadDataFile(file) {
    let data;
    try { data = C.readData(JSON.parse(await file.text())); }
    catch (e) { toast(e instanceof SyntaxError ? 'That isn’t the data file. Pick finances-data.json.' : (e.message || 'Couldn’t read that file.')); return; }
    const before = state.meta.demo ? '' : (state.meta.fileSavedAt || '');
    await applyData(data, { fileSavedAt: data.saved, changedAt: data.saved, loadedAt: new Date().toISOString() });
    closeSheet(); state.view = 'overview'; render(); window.scrollTo(0, 0);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    toast(data.saved && data.saved === before ? `Already up to date. This is the file saved ${fmtStamp(data.saved)}.` : `Loaded ${data.txns.length} transactions, saved ${fmtStamp(data.saved)}.`);
  }
  function loadLabel(cls, text) {
    return h('label', { class: cls || 'btn primary', for: 'data-input', role: 'button', tabindex: '0',
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('data-input').click(); } } },
    icon('refresh', 17), h('span', { class: 'lbl' }, text || 'Load latest'));
  }

  function recompute() {
    state.model = C.analyse(state.txns, state.settings, { today: C.todayISO() });
    const m = state.model;
    if (!m.empty && (!state.month || !m.byMonth[state.month])) state.month = m.months[m.months.length - 1];
  }
  function lastDataDate() {
    const m = state.model;
    if (!m || m.empty) return null;
    return Object.values(m.coverage).map((c) => c.to).sort().pop();
  }
  function inProgress(month) {
    const last = lastDataDate();
    return !!last && C.monthOf(last) === month && last < `${month}-${String(C.daysInMonth(month)).padStart(2, '0')}`;
  }

  /* ================================================================== shell */
  const VIEWS = { overview: 'Overview', transactions: 'Transactions', review: 'Review', check: 'Check', settings: VIEWER ? 'Data' : 'Settings' };
  function go(view, opts) {
    state.view = view;
    if (opts && opts.tx) state.tx = Object.assign({ q: '', month: '', acct: '', type: '', from: '', to: '' }, opts.tx);
    if (opts && opts.tx) state.txLimit = 150;
    render();
    window.scrollTo(0, 0);
    if (opts && opts.anchor) requestAnimationFrame(() => { const el = document.getElementById(opts.anchor); if (el) el.scrollIntoView({ block: 'start' }); });
  }

  function render() {
    const app = document.getElementById('app');
    if (!state.loaded) return;
    hideTip();
    const content = h('main', { class: 'content', id: 'content' });
    add(content, viewContent());
    app.replaceChildren(sidebar(), h('div', { class: 'main' }, topbar(), content), tabbar());
  }
  function renderContent() {
    const content = document.getElementById('content');
    if (!content) return render();
    hideTip();
    content.replaceChildren();
    add(content, viewContent());
    const sb = document.querySelector('.sidebar');
    if (sb) sb.replaceWith(sidebar());
    const tb = document.querySelector('.tabbar');
    if (tb) tb.replaceWith(tabbar());
  }
  function viewContent() {
    const m = state.model;
    if (!m || m.empty) return state.view === 'settings' ? (VIEWER ? viewData() : viewSettings()) : viewWelcome();
    if (state.view === 'transactions') return viewTransactions();
    if (VIEWER) return state.view === 'settings' ? viewData() : viewOverview();
    if (state.view === 'review') return viewReview();
    if (state.view === 'check') return viewCheck();
    if (state.view === 'settings') return viewSettings();
    return viewOverview();
  }

  function importLabel(cls, text) {
    return h('label', { class: cls || 'btn primary', for: 'file-input', role: 'button', tabindex: '0',
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('file-input').click(); } } },
    icon('upload', 17), h('span', { class: 'lbl' }, text || 'Import files'));
  }

  function sidebar() {
    const m = state.model;
    const has = m && !m.empty;
    const reviewN = has ? m.review.length : 0;
    const checkOff = has && C.CHECK_ACCTS.some((a) => m.checks[a].status === 'off');
    const nav = (view, ic, label, extra) => h('button', { class: 'nav-item', 'aria-current': state.view === view ? 'page' : null, onclick: () => go(view) },
      icon(ic, 19), label, extra || null);
    const accts = [];
    if (has) {
      for (const a of ['hsbc', 'amex', 'revolut', 't212']) {
        const c = m.coverage[a];
        if (!c) continue;
        const age = C.dayDiff(c.to, C.todayISO());
        let meta = `to ${fmtDate(c.to)}`;
        if (a === 'revolut' && m.revolutBalance) meta = money(m.revolutBalance.value, { pence: false });
        if (a === 't212' && m.inv.t212) meta = money(m.inv.t212.value, { pence: false });
        accts.push(h('button', { class: 'nav-item', onclick: () => go('transactions', { tx: { acct: a } }) },
          h('span', { class: `badge sm ${a}` }, icon(ACCT_ICON[a], 13)), acctLabel(a),
          h('span', { class: 'count' + (age > 21 && a !== 't212' ? ' alert' : ''), title: `Data up to ${fmtDate(c.to, true)}` }, meta)));
      }
      const typed = (a, label, b) => h('button', { class: 'nav-item', disabled: VIEWER, onclick: openBalances },
        h('span', { class: `badge sm ${a}` }, icon(ACCT_ICON[a], 13)), label,
        h('span', { class: 'count', title: b ? `Typed in ${fmtDate(b.date, true)}` : null }, b ? money(b.value, { pence: false }) : (VIEWER ? '—' : 'Add')));
      if (!m.coverage.t212) accts.push(typed('t212', 'Trading 212', m.inv.t212));
      accts.push(typed('pension', 'L&G pension', m.inv.pension));
    }
    return h('aside', { class: 'sidebar', 'aria-label': 'Main' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, icon('chart', 16)), 'Finances'),
      h('nav', { class: 'nav' },
        nav('overview', 'home', 'Overview'),
        nav('transactions', 'list', 'Transactions'),
        VIEWER ? null : nav('review', 'inbox', 'Review', reviewN ? h('span', { class: 'count alert' }, String(reviewN)) : null),
        VIEWER ? null : nav('check', 'shield', 'Check', checkOff ? h('span', { class: 'count alert' }, '!') : null),
        nav('settings', VIEWER ? 'file' : 'sliders', VIEWER ? 'Data' : 'Settings')),
      accts.length ? h('nav', { class: 'nav' }, h('div', { class: 'nav-label' }, 'Accounts'), accts) : null,
      h('div', { class: 'privacy-card' }, icon('lock', 18),
        VIEWER ? h('div', null, h('strong', null, 'View only'), 'This device shows the data file saved from your laptop. Changes are made there.')
          : h('div', null, h('strong', null, 'Stays yours'), 'No bank logins, and the app uploads nothing. Your data is in this browser and in the one file you save to your Drive.')));
  }

  function topbar() {
    const search = h('label', { class: 'search desk-only' }, icon('search', 17),
      h('input', { type: 'search', placeholder: 'Search transactions…', 'aria-label': 'Search transactions', id: 'top-search', value: state.tx.q,
        oninput: (e) => {
          state.tx.q = e.target.value; state.txLimit = 150;
          if (state.view !== 'transactions') { state.view = 'transactions'; renderContent(); setCrumb(); document.getElementById('top-search').focus(); }
          else { syncSearch(e.target); renderTxnResults(); }
        } }),
      h('span', { class: 'kbd' }, '/'));
    const hasData = state.model && !state.model.empty;
    const right = VIEWER
      ? [hasData && !state.meta.demo && state.meta.fileSavedAt ? h('span', { class: 'sync-ok desk-only' }, `Saved ${fmtStamp(state.meta.fileSavedAt)}`) : null, loadLabel()]
      : [syncChip(), importLabel()];
    return h('header', { class: 'topbar' },
      h('div', { class: 'crumbs' },
        h('span', { class: 'root desk-only' }, 'Finances'), h('span', { class: 'sep desk-only' }, icon('chevR', 15)),
        h('span', { class: 'here' }, crumbHere())),
      h('div', { class: 'spacer' }),
      hasData ? search : null,
      right);
  }

  function crumbHere() {
    return [icon({ overview: 'home', transactions: 'list', review: 'inbox', check: 'shield', settings: VIEWER ? 'file' : 'sliders' }[state.view], 17), VIEWS[state.view]];
  }
  function setCrumb() { const el = document.querySelector('.crumbs .here'); if (el) setKids(el, crumbHere()); }
  function syncSearch(from) {
    for (const id of ['top-search', 'page-search']) { const el = document.getElementById(id); if (el && el !== from && el.value !== state.tx.q) el.value = state.tx.q; }
  }

  function tabbar() {
    const n = state.model && !state.model.empty ? state.model.review.length : 0;
    const tab = (view, ic, label) => h('button', { 'aria-current': state.view === view ? 'page' : null, onclick: () => go(view) },
      icon(ic, 22), label, view === 'review' && n ? h('span', { class: 'dot' }, String(n)) : null);
    const tabs = VIEWER ? [tab('overview', 'home', 'Overview'), tab('transactions', 'list', 'Activity'), tab('settings', 'file', 'Data')]
      : [tab('overview', 'home', 'Overview'), tab('transactions', 'list', 'Activity'), tab('review', 'inbox', 'Review'), tab('check', 'shield', 'Check'), tab('settings', 'sliders', 'Settings')];
    return h('nav', { class: 'tabbar', 'aria-label': 'Sections' }, tabs);
  }

  /* ================================================================== welcome */
  const HOWTO = [
    ['hsbc', 'HSBC', 'Online banking', ['Log on to online banking and open the account.', 'Set dates under “Search and filter”.', 'Click “Download” under the transactions list and choose CSV.']],
    ['amex', 'Amex', 'Website, not the app', ['Sign in at americanexpress.com.', 'Open Statements & Activity and pick the period.', 'Click Download and choose CSV.']],
    ['revolut', 'Revolut', 'In the app', ['Open the account and tap “…” → Statement.', 'Choose Excel (it’s really a CSV) and the period.', 'Send the file to your laptop, for example through Google Drive.']],
  ];
  function viewWelcome() {
    if (VIEWER) {
      return h('div', { class: 'welcome' },
        h('section', { class: 'card' },
          h('span', { class: 'pill info' }, icon('lock', 13), 'View only'),
          h('h1', null, 'Load your data file.'),
          h('p', null, 'This device shows what your laptop saved. The file is read here and kept in this browser. Nothing is uploaded.'),
          h('ol', { class: 'steps' },
            h('li', null, h('span', { class: 'n' }, '1'), h('div', null, 'On the laptop, import your exports', h('p', { class: 'card-sub' }, 'The laptop saves everything to finances-data.json in your Google Drive.'))),
            h('li', null, h('span', { class: 'n' }, '2'), h('div', null, 'Here, tap “Load latest”', h('p', { class: 'card-sub' }, 'Choose Browse, then Google Drive, then finances-data.json.'))),
            h('li', null, h('span', { class: 'n' }, '3'), h('div', null, 'Load it again after each monthly import', h('p', { class: 'card-sub' }, 'Until then this device keeps showing the last file you loaded, even offline.')))),
          h('div', { class: 'row-actions' }, loadLabel(), h('button', { class: 'btn', onclick: loadDemo }, icon('chart', 17), 'Try with demo data'))),
        h('section', { class: 'card' },
          h('div', { class: 'card-head' }, icon('info', 18), 'If Google Drive isn’t listed'),
          h('div', { class: 'prose', style: { marginTop: '14px' } }, h('ul', null,
            h('li', null, 'Install the Google Drive app on this iPhone and sign in.'),
            h('li', null, 'Open the Files app and tap Browse.'),
            h('li', null, 'Tap the “…” button, choose Edit, and switch on Google Drive.')))));
    }
    return h('div', { class: 'welcome' },
      h('section', { class: 'card' },
        h('span', { class: 'pill info' }, icon('lock', 13), 'Private by design'),
        h('h1', null, 'Your money, kept by you.'),
        h('p', null, 'Import the CSV exports from your accounts. They’re read in this browser and saved here, never uploaded. There are no bank logins.'),
        h('ol', { class: 'steps' },
          h('li', null, h('span', { class: 'n' }, '1'), h('div', null, 'Export a CSV from each account', h('p', { class: 'card-sub' }, 'How-to on the right. Six months is a good start.'))),
          h('li', null, h('span', { class: 'n' }, '2'), h('div', null, 'Import them all at once', h('p', { class: 'card-sub' }, 'Overlapping dates are fine: duplicates are skipped.'))),
          h('li', null, h('span', { class: 'n' }, '3'), h('div', null, 'Link your data file', h('p', { class: 'card-sub' }, 'One file in your Google Drive, so your iPhone can show the same numbers.')))),
        h('div', { class: 'row-actions' }, importLabel(), h('button', { class: 'btn', onclick: loadDemo }, icon('chart', 17), 'Try with demo data'),
          CAN_LINK ? h('button', { class: 'btn ghost', onclick: linkExistingFile }, icon('file', 17), 'Open a data file') : null)),
      h('section', { class: 'card' },
        h('div', { class: 'card-head' }, icon('file', 18), 'How to export each one'),
        h('div', { class: 'how', style: { marginTop: '14px' } },
          HOWTO.map(([a, name, where, steps]) => h('details', null,
            h('summary', null, h('span', { class: `badge sm ${a}` }, icon(ACCT_ICON[a], 13)), name, h('span', { class: 'card-sub' }, '· ' + where), h('span', { class: 'chev' }, icon('chevR', 16))),
            h('div', { class: 'body' }, h('ol', null, steps.map((x) => h('li', null, x))))))),
        h('p', { class: 'note' }, icon('info', 15), 'Revolut statements start with your account details; those lines are skipped and never stored.')));
  }

  /* ================================================================== overview */
  function monthSwitch() {
    const m = state.model;
    const i = m.months.indexOf(state.month);
    return h('div', { class: 'month-switch', role: 'group', 'aria-label': 'Month' },
      h('button', { class: 'icon-btn', 'aria-label': 'Previous month', disabled: i <= 0, onclick: () => { state.month = m.months[i - 1]; renderContent(); } }, icon('chevL', 18)),
      h('span', { class: 'label', 'aria-live': 'polite' }, icon('calendar', 16), fmtMonth(state.month).replace(/ (\d{4})$/, ' $1')),
      h('button', { class: 'icon-btn', 'aria-label': 'Next month', disabled: i >= m.months.length - 1, onclick: () => { state.month = m.months[i + 1]; renderContent(); } }, icon('chevR', 18)));
  }

  function viewOverview() {
    const m = state.model;
    const v = C.monthView(m, state.month);
    const live = inProgress(state.month);
    const out = [];
    out.push(h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'Financial overview'),
        h('p', null, `${fmtMonth(state.month)} income, spending and bills${live ? ' · so far' : ''}${VIEWER && !state.meta.demo && state.meta.fileSavedAt ? ` · file saved ${fmtStamp(state.meta.fileSavedAt)}` : ''}`)),
      monthSwitch()));
    out.push(banners());
    out.push(kpiRow(v, live));
    out.push(boardSection(v));
    out.push(h('div', { class: 'lower' }, sisterCard(v), investCard(v), trendCard(v)));
    return out;
  }

  function banners() {
    const m = state.model;
    const s = state.settings;
    const list = [];
    const banner = (cls, ic, title, text, action) => h('div', { class: 'banner' + (cls ? ' ' + cls : '') }, h('span', { class: 'ico' }, icon(ic, 18)),
      h('div', null, h('h3', null, title), h('p', null, text)), action ? h('div', { class: 'actions' }, action) : null);
    if (state.meta.demo) {
      list.push(banner('', 'info', 'You’re looking at demo data', VIEWER ? 'Everything here is made up. Load your data file whenever you’re ready.' : 'Everything here is made up. Import your own CSVs whenever you’re ready.',
        h('button', { class: 'btn sm', onclick: () => confirmErase('Remove the demo data?', 'This clears the demo transactions and settings.') }, 'Remove demo')));
    } else if (VIEWER) {
      // nothing to set up on a view-only device
    } else if (!s.myNames.length || !s.sisterNames.length) {
      list.push(banner('', 'users', 'Finish setting up', 'Add how your name and your sister’s appear on transfers, so moving money between your accounts and her repayments aren’t counted as income.',
        h('button', { class: 'btn sm primary', onclick: () => go('settings', { anchor: 'set-names' }) }, 'Set up')));
    } else if (CAN_LINK && !sync.handle) {
      list.push(banner('', 'file', 'Link your data file', 'Save everything to one file in your Google Drive, so your iPhone can show it and you have a copy outside this browser.',
        h('button', { class: 'btn sm primary', onclick: openLink }, 'Link it')));
    }
    {
      const off = C.CHECK_ACCTS.filter((a) => m.checks[a].status === 'off');
      if (off.length) {
        list.push(banner('warn', 'alert', `${off.map(acctLabel).join(' and ')} ${off.length === 1 ? 'doesn’t' : 'don’t'} add up`,
          'The imported transactions don’t match the balances you entered, so something is missing or doubled.' + (VIEWER ? ' Fix it on the laptop.' : ''),
          VIEWER ? null : h('button', { class: 'btn sm', onclick: () => go('check') }, 'Open Check')));
      }
      const stale = state.meta.demo ? [] : Object.entries(m.coverage).filter(([a, c]) => a !== 't212' && C.dayDiff(c.to, C.todayISO()) > 21);
      if (stale.length) {
        list.push(banner('warn', 'clock', 'Some accounts need a fresh export',
          stale.map(([a, c]) => `${acctLabel(a)} ends ${fmtDate(c.to)}`).join(' · ') + (VIEWER ? '. Import on the laptop, then load the file again.' : ''),
          VIEWER ? null : importLabel('btn sm', 'Import')));
      }
    }
    return list;
  }

  /* --- KPI tiles */
  function deltaTag(cur, prev, upIsGood) {
    if (prev == null || !Number.isFinite(prev) || Math.abs(prev) < 1) return null;
    const d = (cur - prev) / Math.abs(prev);
    if (!Number.isFinite(d)) return null;
    const up = d >= 0;
    const cls = Math.abs(d) < 0.005 ? 'flat' : (up === upIsGood ? (up ? 'up-good' : 'down-good') : (up ? 'up-bad' : 'down-bad'));
    return h('span', { class: `delta ${cls}` }, icon(up ? 'arrowUp' : 'arrowDown', 14), `${Math.abs(d * 100).toFixed(1)}%`);
  }
  function deltaAbsTag(cur, prev) {
    if (prev == null || !Number.isFinite(prev)) return null;
    const d = cur - prev;
    if (Math.abs(d) < 1) return h('span', { class: 'tag' }, 'Same as last month');
    return h('span', { class: 'tag', title: 'Change from last month' }, h('span', { class: `delta ${d > 0 ? 'up-good' : 'down-bad'}` }, icon(d > 0 ? 'arrowUp' : 'arrowDown', 14), money(Math.abs(d), { pence: false })));
  }
  function kpiRow(v, live) {
    const m = state.model;
    const prevMonths = v.series.slice(0, 5).filter((x) => x.income != null && x.income > 0);
    const usual = prevMonths.length ? prevMonths.slice(-3).reduce((a, x) => a + x.income - (x.bonus || 0), 0) / Math.min(3, prevMonths.length) : 0;
    const expected = v.incomeItems.find((i) => i.status === 'expected' || i.status === 'late');

    // left over
    const k1 = h('section', { class: 'card kpi', 'aria-label': 'Left over' },
      h('div', { class: 'card-head' }, h('span', { class: 'ico', style: { background: 'var(--s-spend)', color: '#fff' } }, icon('wallet', 14)), 'Left over',
        h('span', { class: 'spacer' }), live ? h('span', { class: 'tag' }, 'So far') : (v.prev ? deltaAbsTag(v.left, v.prev.left) : null),
        h('button', { class: 'icon-btn outline', 'aria-label': 'See what’s counted this month', title: 'What’s counted', onclick: () => openMonth(v) }, icon('arrowUpRight', 16))),
      h('div', { class: 'kpi-value hero' }, money(v.left, { pence: false })),
      h('div', { class: 'kpi-label' }, live && expected ? `Salary of ${money(expected.amount, { pence: false })} due ${fmtDate(expected.date)}` : `Income minus your spending in ${fmtMonth(state.month, true)}`),
      h('div', { class: 'viz' }, dotMatrix(v.series)));

    // income
    const prevBonus = v.prev && v.prev.bonus > 0;
    const incLabel = live && expected
      ? h('div', { class: 'kpi-label' }, h('b', null, money(expected.amount, { pence: false })), ` expected ${fmtDate(expected.date)}`)
      : v.bonus > 0 ? h('div', { class: 'kpi-label' }, 'Includes a ', h('b', null, money(v.bonus, { pence: false })), ' bonus')
        : h('div', { class: 'kpi-label' }, deltaTag(v.income, v.prev && v.prev.income - (v.prev.bonus || 0), true) || '', prevBonus ? ' vs last month without its bonus' : ' vs last month');
    const k2 = h('section', { class: 'card kpi', 'aria-label': 'Monthly income' },
      h('div', { class: 'card-head' }, h('span', { class: 'ico', style: { background: 'var(--s-income)', color: '#fff' } }, icon('calendar', 14)), 'Monthly income',
        h('span', { class: 'spacer' }), h('button', { class: 'icon-btn outline', 'aria-label': 'See income transactions', onclick: () => go('transactions', { tx: { month: state.month, type: 'income' } }) }, icon('arrowUpRight', 16))),
      h('div', { class: 'kpi-value' }, money(v.income, { pence: false })),
      incLabel,
      h('div', { class: 'viz' }, incomeBars(v.series)));

    // spending
    const denom = v.income > 0 && !live ? v.income : (usual || v.income);
    const ratio = denom > 0 ? v.spend / denom : null;
    const sev = ratio == null ? 'neutral' : ratio < 0.8 ? 'good' : ratio <= 1 ? 'warn' : 'bad';
    const k3 = h('section', { class: 'card kpi', 'aria-label': 'Spending' },
      h('div', { class: 'card-head' }, h('span', { class: 'ico', style: { background: 'var(--good)', color: '#0b0b0b' } }, icon('card', 14)), 'Spending',
        h('span', { class: 'spacer' }), h('button', { class: 'icon-btn outline', 'aria-label': 'See spending transactions', onclick: () => go('transactions', { tx: { month: state.month, type: 'spend' } }) }, icon('arrowUpRight', 16))),
      h('div', { class: 'kpi-value' }, money(v.spend, { pence: false })),
      h('div', { class: 'kpi-label' }, ratio == null ? 'No income recorded yet' : [h('b', null, pct(ratio)), (v.income > 0 && !live) ? ' of income spent' : ' of your usual monthly income']),
      h('div', { class: 'viz' }, h('div', { class: `meter lg ${sev}`, role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': ratio == null ? 0 : Math.round(Math.min(1, ratio) * 100), 'aria-label': 'Share of income spent' },
        h('i', { style: { width: `${Math.max(3, Math.min(100, (ratio || 0) * 100))}%` } }))));
    return h('div', { class: 'kpis' }, k1, k2, k3);
  }

  // Chart colours (mirror the CSS tokens; SVG attributes get literal values so every browser renders them)
  const COL = { income: '#3987e5', spend: '#d95926', muted: '#3a3a41', dim: '#26262b', past: '#6b6b74', bad: '#f25757', axis: '#7a7a84', grid: '#232328', base: '#3b3b43', text: '#f4f4f5' };

  // Draws a chart at the container's real pixel width, so text stays crisp and readable at any size.
  function autoChart(build, height, extraClass) {
    const box = h('div', { class: 'chart' + (extraClass ? ' ' + extraClass : ''), style: { minHeight: height + 'px' } });
    let lastW = 0;
    const draw = () => {
      if (!box.isConnected) { if (ro) ro.disconnect(); return; }
      const w = Math.floor(box.clientWidth);
      if (!w || w === lastW) return;
      lastW = w;
      box.replaceChildren(build(w));
    };
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => draw()) : null;
    requestAnimationFrame(() => { draw(); if (ro && box.isConnected) ro.observe(box); });
    return box;
  }

  function dotMatrix(series) {
    const H = 64;
    const label = 'Left over, last six months: ' + series.map((x) => `${fmtMonth(x.month, true)} ${x.left == null ? 'no data' : money(x.left, { pence: false })}`).join(', ');
    return autoChart((W) => {
      const groups = series.length, gw = W / groups;
      const step = Math.max(7, Math.min(12, (gw - 8) / 3));
      const rad = Math.max(2.2, Math.min(3.4, step * 0.3));
      const maxAbs = Math.max(1, ...series.map((x) => Math.abs(x.left || 0)));
      const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
      series.forEach((x, gi) => {
        const lit = x.left == null ? 0 : Math.max(x.left ? 1 : 0, Math.round(18 * Math.abs(x.left) / maxAbs));
        const neg = (x.left || 0) < 0;
        const cur = gi === groups - 1;
        const g = s('g', { class: 'mark', tabindex: '0', 'aria-label': `${fmtMonth(x.month)}: ${x.left == null ? 'no data' : money(x.left)}` });
        const x0 = gi * gw + gw / 2 - step;
        let n = 0;
        for (let c = 0; c < 3; c++) {
          for (let r = 0; r < 6; r++) {
            n++;
            const on = n <= lit;
            g.append(s('circle', { cx: x0 + c * step, cy: H - 5 - r * 10.4, r: rad, fill: !on ? COL.dim : neg ? COL.bad : cur ? COL.spend : COL.past }));
          }
        }
        g.append(s('rect', { class: 'hit', x: gi * gw + 1, y: 0, width: gw - 2, height: H, rx: 6, fill: 'transparent' }));
        tipOn(g, () => [fmtMonth(x.month), [['Left over', x.left == null ? 'No data' : money(x.left), null]]]);
        svg.append(g);
      });
      return svg;
    }, H);
  }

  function roundTopRect(x, y, w, hgt, r) {
    if (hgt <= 0) return '';
    const rr = Math.min(r, w / 2, hgt);
    return `M${x},${y + hgt}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + hgt}Z`;
  }

  function incomeBars(series) {
    const H = 60, AX = 18;
    const label = 'Income, last six months: ' + series.map((x) => `${fmtMonth(x.month, true)} ${x.income == null ? 'no data' : money(x.income, { pence: false })}`).join(', ');
    return autoChart((W) => {
      const n = series.length;
      const max = Math.max(1, ...series.map((x) => x.income || 0));
      const slot = W / n;
      const bw = Math.max(6, Math.min(12, slot * 0.3));
      const svg = s('svg', { width: W, height: H + AX, viewBox: `0 0 ${W} ${H + AX}`, role: 'img', 'aria-label': label });
      svg.append(s('line', { x1: 0, x2: W, y1: H + 0.5, y2: H + 0.5, stroke: COL.base }));
      series.forEach((x, i) => {
        const cx = slot * i + slot / 2;
        const hh = x.income ? Math.max(3, (x.income / max) * (H - 4)) : 0;
        const g = s('g', { class: 'mark', tabindex: '0', 'aria-label': `${fmtMonth(x.month)}: ${money(x.income)}` });
        if (hh) g.append(s('path', { class: 'bar', d: roundTopRect(cx - bw / 2, H - hh, bw, hh, 4), fill: i === n - 1 ? COL.income : COL.muted }));
        g.append(s('text', { x: cx, y: H + 14, 'text-anchor': 'middle', fill: i === n - 1 ? COL.text : COL.axis, 'font-size': '11', 'font-family': 'inherit' }, fmtMonth(x.month, true)));
        g.append(s('rect', { class: 'hit', x: slot * i + 1, y: 0, width: slot - 2, height: H + AX, fill: 'transparent', rx: 6 }));
        tipOn(g, () => [fmtMonth(x.month), [['Income', x.income == null ? 'No data' : money(x.income), COL.income]].concat(x.bonus > 0 ? [['of it bonus', money(x.bonus), null]] : [])]);
        svg.append(g);
      });
      return svg;
    }, H + AX);
  }

  /* --- board */
  function pill(kind, label, ic) { return h('span', { class: `pill ${kind}` }, ic ? icon(ic, 13) : null, label); }

  function boardSection(v) {
    const cols = [
      { id: 'bills', title: 'Bills & fixed', short: 'Bills', ic: 'receipt', items: v.bills.map(billItem), empty: 'Regular payments show up here once they’ve repeated for two months.' },
      { id: 'spending', title: 'Spending', short: 'Spending', ic: 'card', items: v.cats.filter((c) => c.count || c.budget).map(catItem), empty: 'No spending this month yet.' },
      { id: 'income', title: 'Income', short: 'Income', ic: 'coins', items: v.incomeItems.map(incomeItem), empty: 'No income recorded this month yet.' },
    ];
    const tabs = h('div', { class: 'board-tabs' }, h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Board columns' },
      cols.map((c) => h('button', { role: 'tab', 'aria-selected': state.boardTab === c.id ? 'true' : 'false', onclick: () => { state.boardTab = c.id; renderContent(); } },
        c.short, h('span', { class: 'count' }, String(c.items.length))))));
    const board = h('div', { class: 'board' }, cols.map((c) => {
      const limit = state.expand[c.id] ? Infinity : 5;
      const shown = c.items.slice(0, limit);
      return h('section', { class: 'col' + (state.boardTab === c.id ? ' active' : ''), 'aria-label': c.title },
        h('div', { class: 'col-head' }, icon(c.ic, 18), c.title, h('span', { class: 'n' }, String(c.items.length)), h('span', { class: 'spacer' }),
          c.id === 'spending' && !VIEWER ? h('button', { class: 'icon-btn', 'aria-label': 'Edit budgets', title: 'Edit budgets', onclick: () => go('settings', { anchor: 'set-budgets' }) }, icon('edit', 16)) : null),
        shown.length ? shown : h('div', { class: 'col-empty' }, c.empty),
        c.items.length > limit ? h('button', { class: 'btn sm ghost col-more', onclick: () => { state.expand[c.id] = true; renderContent(); } }, `Show all ${c.items.length}`) : null,
        !c.items.length && c.action ? c.action : null);
    }));
    return [h('div', { class: 'section-head' }, h('h2', null, 'Budget board'), h('span', { class: 'divider' }), h('span', { class: 'card-sub' }, fmtMonth(state.month))), tabs, board];
  }

  function billItem(b) {
    let p, foot, right;
    if (b.status === 'paid') { p = pill('good', 'Paid', 'check'); foot = `Paid ${fmtDate(b.date)}`; right = b.debit ? 'Direct debit' : acctLabel(b.acct); }
    else if (b.status === 'overdue') { p = pill('bad', 'Overdue', 'alert'); foot = `Due ${fmtDate(b.date)}`; right = `${b.late} days late`; }
    else if (b.status === 'missed') { p = pill('', 'Not seen', 'info'); foot = `Usually ${fmtDate(b.date)}`; right = 'Not in this month'; }
    else {
      const soon = b.inDays != null && b.inDays <= 5;
      p = pill(soon ? 'warn' : '', soon ? 'Due soon' : 'Upcoming', 'clock');
      foot = `Due ${fmtDate(b.date)}`; right = b.inDays != null && b.inDays >= 0 ? rel(b.inDays) : '';
    }
    return h('button', { class: 'item', onclick: () => openBill(b), 'aria-label': `${b.name}, ${money(b.amount)}, ${b.status}` },
      h('div', { class: 'item-top' }, h('span', { class: 'item-label' }, icon(CAT_ICON[b.cat], 15), h('span', null, catLabel(b.cat))), p),
      h('div', { class: 'item-title' }, b.name),
      h('div', { class: 'item-amount' }, money(b.amount)),
      h('div', { class: 'item-foot' }, icon('calendar', 15), foot, h('span', { class: 'right' }, right)));
  }

  function catItem(c) {
    const has = c.budget > 0;
    const ratio = has ? c.total / c.budget : 0;
    const sev = !has ? 'neutral' : ratio > 1 ? 'bad' : ratio >= 0.85 ? 'warn' : 'good';
    const p = !has ? pill('', 'No budget') : ratio > 1 ? pill('bad', 'Over', 'alert') : ratio >= 0.85 ? pill('warn', 'Close', 'clock') : pill('good', 'On budget', 'check');
    return h('button', { class: 'item', onclick: () => go('transactions', { tx: { month: state.month, type: 'cat:' + c.id, acct: '', q: '' } }), 'aria-label': `${c.label}, ${money(c.total)} spent` },
      h('div', { class: 'item-top' }, h('span', { class: 'item-label' }, icon(CAT_ICON[c.id], 15), h('span', null, c.label)), p),
      h('div', { class: 'item-title' }, 'Spent this month'),
      h('div', { class: 'item-amount' }, money(c.total), has ? h('span', { class: 'of' }, `/ ${money(c.budget, { pence: false })}`) : null),
      has ? h('div', { class: `meter ${sev}` }, h('i', { style: { width: `${Math.min(100, Math.max(2, ratio * 100))}%` } })) : null,
      h('div', { class: 'item-foot' }, icon('list', 15), `${c.count} payment${c.count === 1 ? '' : 's'}`,
        h('span', { class: 'right' }, has ? (ratio > 1 ? `${money(c.total - c.budget, { pence: false })} over` : `${money(c.budget - c.total, { pence: false })} left`) : '')));
  }

  function incomeItem(i) {
    const p = i.status === 'received' ? pill('good', 'Received', 'check') : i.status === 'late' ? pill('bad', 'Late', 'alert') : pill('warn', 'Expected', 'clock');
    return h('button', { class: 'item', onclick: () => go('transactions', { tx: { month: state.month, type: 'income' } }), 'aria-label': `${i.name}, ${money(i.amount)}, ${i.status}` },
      h('div', { class: 'item-top' }, h('span', { class: 'item-label' }, icon(CAT_ICON[i.cat] || 'coins', 15), h('span', null, catLabel(i.cat))), p),
      h('div', { class: 'item-title' }, i.n > 1 ? `${i.name} · ${i.n} payments` : i.source === 'typical' ? `${i.name} (usual amount)` : i.name),
      h('div', { class: 'item-amount' }, money(i.amount, { sign: true })),
      h('div', { class: 'item-foot' }, icon('calendar', 15), (i.status === 'received' ? '' : 'Due ') + fmtDate(i.date), h('span', { class: 'right' }, acctLabel(i.acct))));
  }

  /* --- lower cards */
  function owedText(bal, now, month) {
    const when = now ? '' : ` at the end of ${fmtMonth(month, true)}`;
    if (bal > 0.5) return [money(bal, { pence: false }), now ? 'she owes you' : `she owed you${when}`];
    if (bal < -0.5) return [money(-bal, { pence: false }), now ? 'of hers you’re holding' : `of hers you held${when}`];
    return ['All square', now ? 'nothing owed either way' : `nothing owed${when}`];
  }
  function sisterCard(v) {
    const sv = v.sister;
    const s = state.settings;
    const m = state.model;
    const setUp = s.sisterNames.length > 0 && s.sisterPays.length > 0;
    const now = state.month === m.months[m.months.length - 1];
    const [big, label] = owedText(now ? sv.balanceNow : sv.balanceEnd, now, state.month);
    const mon = fmtMonth(state.month, true);
    const rows = [
      h('div', { class: 'stat-row' }, h('span', { class: 'k' }, `Bills you paid for her in ${mon}`), h('span', { class: 'v' }, money(sv.paid))),
      h('div', { class: 'stat-row' }, h('span', { class: 'k' }, `She paid you in ${mon}`), h('span', { class: 'v' + (sv.repaid > 0 ? ' good' : '') }, money(sv.repaid))),
    ];
    if (sv.sent) rows.push(h('div', { class: 'stat-row' }, h('span', { class: 'k' }, `You sent her in ${mon}`), h('span', { class: 'v' }, money(sv.sent))));
    rows.push(h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'Her last repayment'),
      h('span', { class: 'v' }, sv.lastRepay ? `${money(sv.lastRepay.amount, { pence: false })} · ${fmtDate(sv.lastRepay.date)}` : '—')));
    if (sv.smallOut || sv.smallIn) {
      rows.push(h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'Small transfers, in your totals'),
        h('span', { class: 'v' }, [sv.smallOut ? `${money(sv.smallOut, { pence: false })} out` : null, sv.smallIn ? `${money(sv.smallIn, { pence: false })} in` : null].filter(Boolean).join(' · '))));
    }
    const link = (label, fn) => (VIEWER ? null : h('button', { class: 'link-btn', onclick: fn }, label));
    let note;
    if (!setUp) {
      note = h('div', { class: 'note' }, icon('info', 15), h('span', null, 'Add her name and the bills you pay for her, so they stay out of your spending. ', link('Set up', () => go('settings', { anchor: 'set-sister' }))));
    } else if (sv.pendingConfirm) {
      note = h('div', { class: 'note' }, icon('alert', 15), h('span', null, `${sv.pendingConfirm} transfer${sv.pendingConfirm > 1 ? 's' : ''} between you to confirm. Until then ${sv.pendingConfirm > 1 ? 'they’re' : 'it’s'} counted as suggested. `, link('Confirm now', () => go('review'))));
    } else if (sv.pendingCash) {
      note = h('div', { class: 'note' }, icon('alert', 15), h('span', null, `${sv.pendingCash} cash deposit${sv.pendingCash > 1 ? 's' : ''} to check. If it was her paying you back, mark it as hers. `, link('Check now', () => go('review'))));
    } else {
      note = h('div', { class: 'note' }, icon('info', 15), 'Bills you pay for her and her repayments aren’t in your spending or income. Every transfer between you has been confirmed.');
    }
    return h('section', { class: 'card', 'aria-label': 'Paid for your sister' },
      h('div', { class: 'card-head' }, h('span', { class: 'ico', style: { background: 'var(--violet-bg)', color: 'var(--violet)' } }, icon('users', 14)), 'Paid for your sister',
        h('span', { class: 'spacer' }), h('button', { class: 'icon-btn outline', 'aria-label': 'Month by month', onclick: openSister }, icon('arrowUpRight', 16))),
      h('div', { class: 'big-line' }, h('span', { class: 'v' }, big), h('span', { class: 'k' }, label)),
      balanceBars(sv.series),
      h('div', { class: 'stat-rows' }, rows),
      note);
  }

  // What she owed you at the end of each month: one bar per month, the selected month highlighted.
  function balanceBars(series) {
    const H = 58, AX = 18;
    const known = series.filter((x) => x.balance != null);
    if (!known.length) return null;
    const label = 'Owed to you at each month end: ' + series.map((x) => `${fmtMonth(x.month, true)} ${x.balance == null ? 'no data' : money(x.balance, { pence: false })}`).join(', ');
    return h('div', { style: { marginTop: '14px' } }, h('div', { class: 'card-sub', style: { fontSize: '12.5px', marginBottom: '6px' } }, 'Owed to you at each month end'),
      autoChart((W) => {
        const n = series.length;
        const max = Math.max(1, ...known.map((x) => Math.max(0, x.balance)));
        const min = Math.min(0, ...known.map((x) => x.balance));
        const span = max - min || 1;
        const zero = 4 + ((max) / span) * (H - 8);
        const slot = W / n;
        const bw = Math.max(6, Math.min(14, slot * 0.32));
        const svg = s('svg', { width: W, height: H + AX, viewBox: `0 0 ${W} ${H + AX}`, role: 'img', 'aria-label': label });
        series.forEach((x, i) => {
          const cx = slot * i + slot / 2;
          const sel = x.month === state.month;
          const g = s('g', { class: 'mark', tabindex: '0', 'aria-label': `${fmtMonth(x.month)}: ${x.balance == null ? 'no data' : money(x.balance)}` });
          if (x.balance != null && Math.abs(x.balance) >= 0.5) {
            const hh = Math.max(3, (Math.abs(x.balance) / span) * (H - 8));
            const fill = sel ? 'var(--violet)' : COL.muted;
            if (x.balance > 0) g.append(s('path', { class: 'bar', d: roundTopRect(cx - bw / 2, zero - hh, bw, hh, 4), fill }));
            else g.append(s('path', { class: 'bar', d: roundTopRect(cx - bw / 2, zero - hh, bw, hh, 4), fill, transform: `translate(0 ${2 * zero}) scale(1 -1)` }));
          }
          g.append(s('text', { x: cx, y: H + 14, 'text-anchor': 'middle', fill: sel ? COL.text : COL.axis, 'font-size': '11', 'font-family': 'inherit' }, fmtMonth(x.month, true)));
          g.append(s('rect', { class: 'hit', x: slot * i + 1, y: 0, width: slot - 2, height: H + AX, fill: 'transparent', rx: 6 }));
          tipOn(g, () => [fmtMonth(x.month), [[x.balance == null ? '' : x.balance < -0.5 ? 'You were holding of hers' : 'She owed you', x.balance == null ? 'No data' : money(Math.abs(x.balance)), null]]]);
          svg.append(g);
        });
        svg.append(s('line', { x1: 0, x2: W, y1: Math.round(zero) + 0.5, y2: Math.round(zero) + 0.5, stroke: COL.base }));
        return svg;
      }, H + AX));
  }

  function investCard(v) {
    const inv = v.investments;
    const total = (inv.t212 ? inv.t212.value : 0) + (inv.pension ? inv.pension.value : 0);
    const age = (b) => (b ? `typed in ${fmtDate(b.date)}` : 'not set');
    const oldest = [inv.t212, inv.pension].filter(Boolean).map((b) => C.dayDiff(b.date, C.todayISO())).sort((a, b) => b - a)[0] || 0;
    const update = VIEWER ? null : h('button', { class: 'link-btn', onclick: openBalances }, total ? 'Update them' : 'Add the current values');
    const note = !total ? h('div', { class: 'note' }, icon('info', 15), h('span', null, 'Exports don’t include today’s value, so you type it in. ', update))
      : oldest > 45 ? h('div', { class: 'note' }, icon('clock', 15), h('span', null, `These are the values you last typed in. The oldest is ${oldest} days old. `, update))
        : h('div', { class: 'note' }, icon('info', 15), 'These are the values you last typed in from each app.');
    return h('section', { class: 'card', 'aria-label': 'Investments and pension' },
      h('div', { class: 'card-head' }, h('span', { class: 'ico', style: { background: 'var(--acct-t212)', color: '#0b0b0b' } }, icon('trend', 14)), 'Investments & pension',
        h('span', { class: 'spacer' }), VIEWER ? null : h('button', { class: 'btn sm', onclick: openBalances }, icon('edit', 15), 'Update')),
      h('div', { class: 'big-line' }, h('span', { class: 'v' }, total ? money(total, { pence: false }) : '—'), h('span', { class: 'k' }, total ? 'total value' : 'no values yet')),
      h('div', { class: 'stat-rows' },
        h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'Trading 212 ', h('small', { class: 'card-sub' }, `(${age(inv.t212)})`)), h('span', { class: 'v' }, inv.t212 ? money(inv.t212.value, { pence: false }) : '—')),
        h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'L&G pension ', h('small', { class: 'card-sub' }, `(${age(inv.pension)})`)), h('span', { class: 'v' }, inv.pension ? money(inv.pension.value, { pence: false }) : '—')),
        h('div', { class: 'stat-row' }, h('span', { class: 'k' }, `Sent to Trading 212 in ${fmtMonth(state.month, true)}`), h('span', { class: 'v' }, money(inv.thisMonth))),
        inv.hasData ? h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'Dividends & interest this year'), h('span', { class: 'v good' }, money(inv.dividendsYTD + inv.interestYTD))) : null),
      note);
  }

  // Everything that moved in the month: what's counted, what isn't, and the transactions behind each line.
  function openMonth(v) {
    const b = v.breakdown;
    const both = { total: C.round2(b.transfers.total + b.invest.total), n: b.transfers.n + b.invest.n };
    const line = (label, part, type, o) => h('button', { class: 'stat-row link', disabled: !part.n, onclick: () => { closeSheet(); go('transactions', { tx: { month: v.month, type } }); } },
      h('span', { class: 'k' }, label, h('small', { class: 'card-sub' }, ` · ${part.n}`)),
      h('span', { class: 'v' }, money(o && o.flip ? -part.total : part.total, { sign: !(o && o.flip) })), icon('chevR', 15));
    sheet({
      title: `What’s counted in ${fmtMonth(v.month)}`, sub: 'Tap a line to see its transactions',
      body: [
        h('div', { class: 'section-label' }, 'Counted'),
        h('div', { class: 'stat-rows', style: { marginTop: 0 } },
          line('Income', b.income, 'income'),
          line('Spending, after refunds', b.spend, 'spend', { flip: true }),
          h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'Left over'), h('span', { class: 'v strong' }, money(v.left)))),
        h('div', { class: 'section-label' }, 'Not counted as your income or spending'),
        h('div', { class: 'stat-rows', style: { marginTop: 0 } },
          line('Bills paid for your sister', b.forSister, 'onbehalf'),
          line('Settling up with your sister', b.settle, 'sister'),
          line('Between your own accounts and investments, net', both, 'transfer'),
          line('Money in, not sorted yet', b.unknown, 'unknown'),
          line('Ignored or not in pounds', b.ignored, 'ignore')),
        h('p', { class: 'note', style: { marginTop: 0 } }, icon('info', 15), 'A transfer between two accounts you import shows on both sides and nets to zero. Money sent to an account you don’t import, like Trading 212, shows on one side only.'),
      ],
      foot: (close) => [h('span', { class: 'spacer' }), h('button', { class: 'btn primary', onclick: close }, 'Done')],
    });
  }

  function trendCard(v) {
    const series = v.series.filter((x) => x.income != null);
    const body = state.chartTable ? trendTable(series) : trendChart(series);
    return h('section', { class: 'card', 'aria-label': 'Last six months' },
      h('div', { class: 'card-head' }, h('span', { class: 'ico', style: { background: 'var(--surface-3)', color: 'var(--text-2)' } }, icon('chart', 14)), 'Last 6 months',
        h('span', { class: 'spacer' }),
        h('div', { class: 'seg' }, h('button', { 'aria-pressed': !state.chartTable ? 'true' : 'false', onclick: () => { state.chartTable = false; renderContent(); } }, 'Chart'),
          h('button', { 'aria-pressed': state.chartTable ? 'true' : 'false', onclick: () => { state.chartTable = true; renderContent(); } }, 'Table'))),
      h('div', { class: 'legend', style: { marginTop: '12px' } }, h('span', null, h('i', { style: { background: 'var(--s-income)' } }), 'Income'), h('span', null, h('i', { style: { background: 'var(--s-spend)' } }), 'Spending')),
      body);
  }
  function niceTicks(maxVal) {
    const v = Math.max(1, maxVal);
    const p = Math.pow(10, Math.floor(Math.log10(v / 4)));
    let step = p;
    for (const k of [1, 2, 2.5, 5, 10]) { step = k * p; if (Math.ceil(v / step) <= 5) break; }
    const n = Math.max(1, Math.ceil(v / step));
    return Array.from({ length: n + 1 }, (_, i) => i * step);
  }
  function trendChart(series) {
    const H = 236;
    const label = 'Income and spending by month: ' + series.map((x) => `${fmtMonth(x.month, true)} income ${money(x.income, { pence: false })}, spending ${money(x.spend, { pence: false })}`).join('; ');
    return autoChart((W) => {
      const padL = 46, padR = 4, padB = 28, padT = 22, plotH = H - padB - padT, plotW = W - padL - padR;
      const ticks = niceTicks(Math.max(...series.map((x) => Math.max(x.income || 0, x.spend || 0))));
      const max = ticks[ticks.length - 1];
      const y = (val) => padT + plotH - (Math.max(0, val) / max) * plotH;
      const gw = plotW / Math.max(1, series.length), bw = Math.max(6, Math.min(22, gw * 0.3));
      const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
      for (const t of ticks) {
        svg.append(s('line', { x1: padL, x2: W - padR, y1: Math.round(y(t)) + 0.5, y2: Math.round(y(t)) + 0.5, stroke: t === 0 ? COL.base : COL.grid }));
        svg.append(s('text', { x: padL - 8, y: y(t) + 4, 'text-anchor': 'end', fill: COL.axis, 'font-size': '11.5', 'font-family': 'inherit' }, compact(t)));
      }
      series.forEach((x, i) => {
        const cx = padL + gw * i + gw / 2;
        const sel = x.month === state.month;
        const g = s('g', { class: 'mark', tabindex: '0', role: 'button', 'aria-label': `${fmtMonth(x.month)}: income ${money(x.income)}, spending ${money(x.spend)}. Select to view this month.` });
        const ih = y(0) - y(x.income || 0), sh = y(0) - y(x.spend || 0);
        if (ih > 0) g.append(s('path', { class: 'bar', d: roundTopRect(cx - bw - 1, y(x.income), bw, ih, 4), fill: COL.income }));
        if (sh > 0) g.append(s('path', { class: 'bar', d: roundTopRect(cx + 1, y(x.spend), bw, sh, 4), fill: COL.spend }));
        if (sel) {
          const li = compact(x.income || 0), ls = compact(x.spend || 0);
          const yi = y(x.income || 0) - 6, ys = y(x.spend || 0) - 6;
          if (Math.abs(yi - ys) < 13) {
            g.append(s('text', { x: cx, y: Math.min(yi, ys) - 1, 'text-anchor': 'middle', fill: COL.text, 'font-size': '11.5', 'font-weight': '600', 'font-family': 'inherit' }, `${li} · ${ls}`));
          } else {
            g.append(s('text', { x: cx - bw / 2 - 1, y: yi, 'text-anchor': 'middle', fill: COL.text, 'font-size': '11.5', 'font-weight': '600', 'font-family': 'inherit' }, li));
            g.append(s('text', { x: cx + bw / 2 + 1, y: ys, 'text-anchor': 'middle', fill: COL.text, 'font-size': '11.5', 'font-weight': '600', 'font-family': 'inherit' }, ls));
          }
        }
        g.append(s('text', { x: cx, y: H - 8, 'text-anchor': 'middle', fill: sel ? COL.text : COL.axis, 'font-size': '12', 'font-weight': sel ? '600' : '400', 'font-family': 'inherit' }, fmtMonth(x.month, true)));
        g.append(s('rect', { class: 'hit', x: cx - gw / 2 + 2, y: padT - 12, width: gw - 4, height: plotH + 12 + padB, fill: 'transparent', rx: 8 }));
        const pick = () => { state.month = x.month; renderContent(); };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        tipOn(g, () => [fmtMonth(x.month), [['Income', money(x.income), COL.income], ['Spending', money(x.spend), COL.spend], ['Left over', money(x.left), null]]]);
        svg.append(g);
      });
      return svg;
    }, H);
  }
  function trendTable(series) {
    return h('table', { class: 'data' },
      h('thead', null, h('tr', null, h('th', null, 'Month'), h('th', null, 'Income'), h('th', null, 'Spending'), h('th', null, 'Left over'))),
      h('tbody', null, series.map((x) => h('tr', null, h('td', null, fmtMonth(x.month)), h('td', null, money(x.income)), h('td', null, money(x.spend)), h('td', null, money(x.left))))));
  }

  /* --- tooltip */
  let tipEl = null;
  function hideTip() { if (tipEl) tipEl.classList.remove('show'); }
  function showTip(target, content, evt) {
    if (!tipEl) { tipEl = h('div', { class: 'tooltip', role: 'tooltip' }); document.body.append(tipEl); }
    const [title, rows] = content();
    setKids(tipEl, [h('div', { class: 't' }, title), rows.map(([k, v, col]) => h('div', { class: 'r' }, col ? h('span', { class: 'key', style: { background: col } }) : null, h('b', null, v), h('span', null, k)))]);
    const r = target.getBoundingClientRect();
    const x = evt && evt.clientX != null ? evt.clientX : r.left + r.width / 2;
    const yy = r.top;
    tipEl.classList.add('show');
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    tipEl.style.left = `${Math.max(8, Math.min(window.innerWidth - tw - 8, x - tw / 2))}px`;
    tipEl.style.top = `${Math.max(8, yy - th - 10)}px`;
  }
  function tipOn(el, content) {
    el.addEventListener('pointermove', (e) => showTip(el, content, e));
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('focus', () => showTip(el, content));
    el.addEventListener('blur', hideTip);
  }

  /* ================================================================== transactions */
  const TYPE_OPTIONS = [['', 'Everything'], ['spend', 'Spending'], ['income', 'Income'], ['transfer', 'Between my accounts'], ['onbehalf', 'Paid for my sister'],
    ['sister', 'Settling up with my sister'], ['sister-all', 'Everything with my sister'], ['review', 'Needs review'], ['unknown', 'Money in, not sorted yet'], ['ignore', 'Ignored'], ['trade', 'Investment trades']];
  function viewTransactions() {
    const m = state.model;
    const months = [...m.months].reverse();
    const sel = (value, opts, onchange, label) => h('select', { class: 'input', 'aria-label': label, onchange },
      opts.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
    const typeOpts = TYPE_OPTIONS.concat(C.CATEGORIES.map((c) => ['cat:' + c.id, c.label]));
    const filters = h('div', { class: 'filters' },
      h('label', { class: 'search', style: { display: 'flex' } }, icon('search', 17),
        h('input', { type: 'search', id: 'page-search', placeholder: 'Search', 'aria-label': 'Search transactions', value: state.tx.q, oninput: (e) => { state.tx.q = e.target.value; state.txLimit = 150; syncSearch(e.target); renderTxnResults(); } })),
      sel(state.tx.month, [['', 'All months']].concat(months.map((x) => [x, fmtMonth(x)])), (e) => { state.tx.month = e.target.value; state.txLimit = 150; renderTxnResults(); }, 'Month'),
      sel(state.tx.acct, [['', 'All accounts'], ['hsbc', 'HSBC'], ['amex', 'Amex'], ['revolut', 'Revolut'], ['t212', 'Trading 212']], (e) => { state.tx.acct = e.target.value; state.txLimit = 150; renderTxnResults(); }, 'Account'),
      sel(state.tx.type, typeOpts, (e) => { state.tx.type = e.target.value; state.txLimit = 150; renderTxnResults(); }, 'Type'),
      state.tx.from ? h('button', { class: 'chip', 'aria-pressed': 'true', 'aria-label': 'Clear the date range', onclick: () => { state.tx.from = ''; state.tx.to = ''; renderContent(); } },
        `${fmtDate(C.addDays(state.tx.from, 1), true)} – ${fmtDate(state.tx.to, true)}`, icon('x', 14)) : null);
    return [
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Transactions'), h('p', { id: 'txn-count' }, ''))),
      filters,
      h('div', { id: 'txn-results' }, txnResults()),
    ];
  }
  function filterTxns() {
    const f = state.tx;
    const q = f.q.trim().toUpperCase();
    return state.model.txns.filter((t) => {
      if (f.month && C.monthOf(t.date) !== f.month) return false;
      if (f.acct && t.acct !== f.acct) return false;
      if (f.from && !(t.date > f.from && t.date <= f.to)) return false;
      if (f.type) {
        if (f.type.startsWith('cat:')) { if (t.kind !== 'spend' || t.cat !== f.type.slice(4)) return false; }
        else if (f.type === 'sister-all') { if (!(t.kind === 'sister' || t.kind === 'onbehalf' || state.settings.sisterNames.some((n) => C.nameMatches(t.desc, n)))) return false; }
        else if (f.type === 'review') { if (!t.review) return false; }
        else if (f.type === 'transfer') { if (t.kind !== 'transfer') return false; }
        else if (f.type === 'ignore') { if (!(t.kind === 'ignore' || t.kind === 'foreign')) return false; }
        else if (t.kind !== f.type) return false;
      }
      if (q && !t.desc.toUpperCase().includes(q) && !C.prettyName(t.desc).toUpperCase().includes(q) && !catLabel(t.cat).toUpperCase().includes(q)) return false;
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }
  function renderTxnResults() {
    const el = document.getElementById('txn-results');
    if (!el) return;
    el.replaceChildren(txnResults());
  }
  function kindLabel(t) {
    if (t.kind === 'spend') return catLabel(t.cat) + (t.amount > 0 ? ' · refund' : '');
    if (t.kind === 'income') return catLabel(t.cat);
    if (t.kind === 'transfer') return t.sub === 'invest' ? 'Investing' : t.sub === 'card' ? 'Card payment' : t.sub === 'fx' ? 'Currency exchange' : t.sub === 'vault' ? 'Savings' : 'Between my accounts';
    if (t.kind === 'sister') return t.amount > 0 ? 'Sister paying you back' : 'Sent to your sister';
    if (t.kind === 'onbehalf') return t.amount > 0 ? 'Paid for sister · refund' : 'Paid for your sister';
    if (t.kind === 'trade') return 'Investment trade';
    if (t.kind === 'unknown') return 'Money in · needs review';
    if (t.kind === 'foreign') return 'Not in pounds';
    if (t.kind === 'ignore') return 'Ignored';
    return '';
  }
  function txnRow(t) {
    const muted = ['transfer', 'trade', 'ignore', 'foreign', 'onbehalf', 'sister'].includes(t.kind);
    const isIn = t.amount > 0 && !muted;
    const ic = t.kind === 'transfer' ? 'swap' : t.kind === 'sister' || t.kind === 'onbehalf' ? 'users' : t.kind === 'trade' ? 'trend' : t.kind === 'unknown' ? 'inbox' : CAT_ICON[t.cat] || 'dots';
    return h('button', { class: 'txn', onclick: () => openTxn(t.id) },
      h('span', { class: 'cat-ico' }, icon(ic, 18), h('span', { class: `badge ${t.acct}`, title: acctLabel(t.acct) })),
      h('span', { class: 'mid' }, h('div', { class: 'name' }, C.prettyName(t.desc)),
        h('div', { class: 'sub' }, kindLabel(t), ' · ', acctLabel(t.acct), t.kind === 'onbehalf' || t.kind === 'sister' ? h('span', { class: 'pill violet', style: { height: '20px' } }, 'Sister') : null,
          t.review ? h('span', { class: 'pill warn', style: { height: '20px' } }, 'Review') : null)),
      h('span', { class: 'amt' + (isIn ? ' in' : '') + (muted ? ' muted' : '') }, money(t.amount, { sign: true })));
  }
  function txnResults() {
    const list = filterTxns();
    const cnt = document.getElementById('txn-count');
    const spend = list.filter((t) => t.kind === 'spend').reduce((a, t) => a + t.cost, 0);
    const forHer = list.filter((t) => t.kind === 'onbehalf').reduce((a, t) => a - t.amount, 0);
    const text = `${list.length} transaction${list.length === 1 ? '' : 's'}${spend ? ` · ${money(spend)} spent` : ''}${forHer ? ` · ${money(forHer)} paid for your sister` : ''}`;
    if (cnt) cnt.textContent = text; else setTimeout(() => { const c = document.getElementById('txn-count'); if (c) c.textContent = text; });
    if (!list.length) return h('div', { class: 'txn-list' }, h('div', { class: 'list-empty' }, 'Nothing matches these filters.'));
    const wrap = h('div', { class: 'txn-list' });
    let day = null;
    let dayTotal = 0;
    let dayHead = null;
    const shown = list.slice(0, state.txLimit);
    for (const t of shown) {
      if (t.date !== day) {
        if (dayHead) dayHead.lastChild.textContent = dayTotal ? money(-dayTotal) : '';
        day = t.date; dayTotal = 0;
        dayHead = h('div', { class: 'txn-day' }, h('span', null, fmtDate(t.date, true)), h('span', { class: 'num' }, ''));
        wrap.append(dayHead);
      }
      if (t.kind === 'spend') dayTotal += t.cost;
      wrap.append(txnRow(t));
    }
    if (dayHead) dayHead.lastChild.textContent = dayTotal ? money(-dayTotal) : '';
    if (list.length > shown.length) wrap.append(h('div', { class: 'more-row' }, h('button', { class: 'btn', onclick: () => { state.txLimit += 200; renderTxnResults(); } }, `Show more (${list.length - shown.length} left)`)));
    return wrap;
  }

  /* ================================================================== review */
  function viewReview() {
    const m = state.model;
    const sis = m.review.filter((t) => t.review === 'sister');
    const groups = [
      ['sister', 'Transfers with your sister', 'Each one is counted as suggested until you confirm it. Settling up changes what she owes you. Anything else is ordinary spending or income.', sis,
        sis.length > 1 ? h('button', { class: 'btn sm', onclick: () => confirmAllSister(sis) }, icon('check', 15), `Confirm all ${sis.length} as suggested`) : null],
      ['money', 'Money in — what was it?', 'Not salary, and not from a name you’ve told me about. Pick what it was so totals stay right.', m.review.filter((t) => t.review === 'money-in' || t.review === 'cash')],
      ['category', 'Spending without a category', 'Pick a category. With “remember” on, future ones from the same merchant follow.', m.review.filter((t) => t.review === 'category')],
      ['fx', 'Currency exchanges', 'Moving pounds into another currency. If you didn’t import that currency’s statement, count it as travel spending.', m.review.filter((t) => t.review === 'fx')],
      ['foreign', 'Not in pounds', 'These aren’t counted in your totals.', m.review.filter((t) => t.review === 'foreign')],
    ].filter((g) => g[3].length);
    const head = h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'Review'), h('p', null, m.review.length ? `${m.review.length} thing${m.review.length === 1 ? '' : 's'} to check` : 'Nothing to check')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: state.remember, onchange: (e) => { state.remember = e.target.checked; } }), 'Remember my choices for the same merchant'));
    if (!groups.length) {
      return [head, h('div', { class: 'card', style: { textAlign: 'center', padding: '40px' } }, h('div', { style: { display: 'grid', placeItems: 'center', color: 'var(--good)' } }, icon('check', 34)),
        h('h2', { style: { margin: '10px 0 4px', fontSize: '19px' } }, 'All clear'), h('p', { class: 'card-sub', style: { margin: 0 } }, 'Everything imported so far has been sorted.'))];
    }
    return [head, groups.map(([id, title, desc, items, action]) => h('section', { class: 'review-group' },
      h('h3', null, `${title} (${items.length})`), h('p', null, desc),
      action ? h('div', { class: 'row-actions', style: { margin: '0 0 12px' } }, action) : null,
      items.slice(0, 40).map((t) => reviewItem(t, id)),
      items.length > 40 ? h('p', { class: 'card-sub' }, `${items.length - 40} more will appear as you clear these.`) : null))];
  }
  function reviewItem(t, group) {
    const chip = (label, fn, ic) => h('button', { class: 'chip', onclick: fn }, ic ? icon(ic, 15) : null, label);
    let actions;
    if (group === 'sister') {
      const opts = t.amount > 0
        ? [['sister', null, 'Paying me back'], ['income', 'family-in', 'A gift or small payment']]
        : [['sister', null, 'For her bills, or settling up'], ['spend', 'family', 'A gift or my own spending']];
      actions = opts.map(([kind, cat, label]) => {
        const suggested = t.kind === kind;
        const b = chip(suggested ? `${label} (suggested)` : label, () => decide(t, cat ? { kind, cat } : { kind }, false), kind === 'sister' ? 'users' : 'gift');
        if (suggested) b.setAttribute('aria-pressed', 'true');
        return b;
      }).concat([chip('More…', () => openTxn(t.id))]);
    } else if (group === 'money') {
      actions = [chip('My sister paying me back', () => decide(t, { kind: 'sister' }, t.review !== 'cash'), 'users'), chip('Income', () => decide(t, { kind: 'income', cat: 'other-income' }), 'coins'),
        chip('My own account', () => decide(t, { kind: 'transfer' }), 'swap'), chip('Refund / paid back', () => decide(t, { kind: 'spend', cat: 'other' }), 'refresh'),
        chip('Ignore', () => decide(t, { kind: 'ignore' }, false), 'eyeOff'), chip('More…', () => openTxn(t.id))];
    } else if (group === 'category') {
      actions = ['groceries', 'eating', 'transport', 'shopping', 'subscriptions', 'utilities', 'gifts', 'health', 'entertainment', 'travel']
        .map((c) => chip(catLabel(c), () => decide(t, { kind: 'spend', cat: c }), CAT_ICON[c])).concat([chip('Paid for my sister', () => decide(t, { kind: 'onbehalf' }), 'users'), chip('Not spending…', () => openTxn(t.id))]);
    } else if (group === 'fx') {
      actions = [chip('Count as travel spending', () => decide(t, { kind: 'spend', cat: 'travel' }, false), 'plane'), chip('Keep as a transfer', () => decide(t, { kind: 'transfer' }, false), 'swap')];
    } else {
      actions = [chip('Ignore', () => decide(t, { kind: 'ignore' }, false), 'eyeOff'), chip('More…', () => openTxn(t.id))];
    }
    return h('div', { class: 'review-item' },
      h('div', { class: 'top' }, h('span', { class: `badge ${t.acct}` }, icon(ACCT_ICON[t.acct], 15)),
        h('div', { class: 'mid' }, h('div', { style: { fontWeight: 500 } }, C.prettyName(t.desc)), h('div', { class: 'card-sub' }, `${fmtDate(t.date, true)} · ${acctLabel(t.acct)}`)),
        h('div', { style: { fontWeight: 600 }, class: 'num' }, money(t.amount, { sign: true }))),
      h('div', { class: 'raw' }, t.desc),
      h('div', { class: 'chips' }, actions));
  }
  async function confirmAllSister(list) {
    const snap = snapshot();
    for (const t of list) state.settings.edits[t.id] = (t.kind === 'spend' || t.kind === 'income') ? { kind: t.kind, cat: t.cat } : { kind: t.kind };
    await persist(); recompute(); renderContent();
    toast(`Confirmed ${list.length} as suggested.`, () => restoreSnapshot(snap));
  }

  /* ================================================================== check: do the imports match your real balances? */
  const CHECK_HELP = {
    hsbc: 'Online banking shows a running balance beside each transaction. Use the balance after the last transaction of a day.',
    amex: 'Use the closing date and closing balance from your statements. A purchase from the last day or two of a statement can land in the next one, so a gap the size of one purchase is normal.',
    revolut: 'Read automatically from the Balance column of each statement you import. You can add your own too.',
  };
  function viewCheck() {
    const m = state.model;
    const s = state.settings;
    const cards = C.CHECK_ACCTS.map((a) => {
      const k = m.checks[a];
      const owed = a === 'amex';
      const status = k.status === 'ok' ? pill('good', `Adds up to ${fmtDate(k.checkedTo, true)}`, 'check') : k.status === 'off' ? pill('bad', 'Doesn’t add up', 'alert')
        : k.status === 'one' ? pill('warn', 'Add one more balance', 'clock') : k.status === 'nodata' ? pill('', 'Nothing imported') : pill('', 'Not checked yet');
      const segs = [...k.segs].reverse().map((x) => {
        const n = `${x.count} transaction${x.count === 1 ? '' : 's'}`;
        const what = owed ? 'what you owed' : 'your balance';
        let why = null;
        if (!x.ok) {
          why = x.uncovered && k.cover ? `Your ${acctLabel(a)} data runs ${fmtDate(k.cover.from, true)} to ${fmtDate(k.cover.to, true)}, which doesn’t cover all of this period. Import the missing dates.`
            : x.diff > 0 ? `The app has ${money(x.diff)} more coming in, or less going out, than the balances show. Look for a missing payment out, or money in that’s counted twice.`
              : `The app has ${money(-x.diff)} more going out, or less coming in, than the balances show. Look for a payment that’s doubled, or money in that’s missing.`;
        }
        return h('div', { class: 'check-seg' + (x.ok ? '' : ' bad') },
          h('div', { class: 'top' }, h('span', { class: 'when' }, `${fmtDate(C.addDays(x.from, 1), true)} – ${fmtDate(x.to, true)}`), h('span', { class: 'spacer' }),
            x.ok ? pill('good', 'Adds up', 'check') : pill('bad', `Off by ${money(Math.abs(x.diff))}`, 'alert')),
          h('div', { class: 'card-sub' }, x.ok ? `${n} add up to ${money(x.actual, { sign: true })}, matching the change in ${what} (${money(x.start)} to ${money(x.end)}).`
            : `${n} add up to ${money(x.actual, { sign: true })}. ${owed ? 'What you owed' : 'Your balance'} went from ${money(x.start)} to ${money(x.end)}, so they should add up to ${money(x.expected, { sign: true })}.`),
          why ? h('div', { class: 'card-sub' }, why) : null,
          h('div', null, h('button', { class: 'btn sm', onclick: () => go('transactions', { tx: { acct: a, from: x.from, to: x.to } }) }, icon('list', 15), 'See these transactions')));
      });
      const pts = [...k.points].reverse().map((p) => h('div', { class: 'rule-line' },
        h('div', { class: 'mid' }, h('div', { class: 'num' }, `${fmtDate(p.date, true)} · ${money(p.value)}`), h('div', { class: 'sub' }, p.auto ? 'Read from a statement' : 'Typed by you')),
        p.auto ? null : h('button', { class: 'icon-btn', 'aria-label': `Delete the balance for ${fmtDate(p.date, true)}`, onclick: async () => {
          s.checks[a] = s.checks[a].filter((y) => !(y.date === p.date && !y.auto)); await persist(); recompute(); renderContent();
        } }, icon('trash', 17))));
      const d = { date: '', value: '' };
      const err = h('div', { class: 'err', role: 'alert' });
      const form = h('div', { class: 'form-grid three check-form' },
        h('label', { class: 'field' }, h('span', null, owed ? 'Statement closing date' : 'Date'),
          h('input', { class: 'input', type: 'date', max: C.todayISO(), oninput: (e) => { d.date = e.target.value; err.textContent = ''; } })),
        h('label', { class: 'field' }, h('span', null, owed ? 'Closing balance you owed (£)' : 'Balance at the end of that day (£)'),
          h('input', { class: 'input', type: 'number', inputmode: 'decimal', step: '0.01', oninput: (e) => { d.value = e.target.value; err.textContent = ''; } })),
        h('div', { class: 'field' }, h('span', { 'aria-hidden': 'true' }, '\u00a0'), h('button', { class: 'btn', onclick: async () => {
          const val = parseFloat(d.value);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) { err.textContent = 'Pick the date.'; return; }
          if (!Number.isFinite(val)) { err.textContent = 'Type the balance.'; return; }
          s.checks[a] = s.checks[a].filter((y) => !(y.date === d.date && !y.auto)).concat([{ date: d.date, value: C.round2(val) }]);
          await persist(); recompute(); renderContent();
        } }, icon('plus', 16), 'Add balance')));
      return h('section', { class: 'card check-card', id: 'check-' + a, 'aria-label': `${acctLabel(a)} check` },
        h('div', { class: 'card-head' }, h('span', { class: `badge sm ${a}` }, icon(ACCT_ICON[a], 13)), acctLabel(a), h('span', { class: 'spacer' }), status),
        h('p', { class: 'card-sub' }, CHECK_HELP[a]),
        segs.length ? h('div', { class: 'check-segs' }, segs) : null,
        h('div', { class: 'section-label' }, 'Balances'),
        pts.length ? h('div', null, pts) : h('p', { class: 'card-sub' }, 'None yet. Add two, and the period between them is checked.'),
        form, err);
    });
    return [
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Check'), h('p', null, 'Do the imported transactions match your real balances?'))),
      h('div', { class: 'check-wrap' },
        h('div', { class: 'card' }, h('p', { class: 'card-sub', style: { margin: 0 } }, 'Between two balances, the transactions in between must add up to the change. If they do, nothing in that period is missing or doubled. This checks what was imported, not how each transaction is categorised.')),
        cards),
    ];
  }

  function snapshot() { return JSON.stringify(state.settings); }
  async function restoreSnapshot(snap) { state.settings = C.withDefaults(JSON.parse(snap)); await persist(); recompute(); renderContent(); }
  async function decide(t, res, allowRule) {
    const snap = snapshot();
    const s = state.settings;
    const rule = allowRule !== false && state.remember && t.review !== 'cash';
    const match = C.suggestMatch(t.desc);
    if (rule && res.kind === 'onbehalf') {
      addPayee(match);
      s.edits[t.id] = Object.assign({}, res);
    } else if (rule) {
      s.rules.push({ id: 'r' + Date.now().toString(36), match, acct: t.acct, dir: t.amount < 0 ? 'out' : 'in', kind: res.kind, cat: res.cat || null });
    } else {
      s.edits[t.id] = Object.assign({}, res);
    }
    await persist(); recompute(); renderContent();
    toast(rule && res.kind === 'onbehalf' ? `Saved. “${match}” is now a bill you pay for your sister.` : rule ? `Saved. Future “${match}” transactions will follow.` : 'Saved.', () => restoreSnapshot(snap));
  }
  function addPayee(text) {
    const s = state.settings;
    const v = String(text || '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (v.length < 3) return false;
    if (s.sisterPays.some((x) => x.toUpperCase() === v)) return false;
    s.sisterPays = [...s.sisterPays, v];
    return true;
  }

  /* ================================================================== settings */
  function splitNames(v) { return String(v || '').split(',').map((x) => x.trim()).filter((x) => x.length >= 3); }
  function suggestions() {
    const m = state.model;
    const out = { me: new Map(), sister: new Map(), employer: new Map() };
    if (!m || m.empty) return out;
    const s = state.settings;
    const known = new Set([...s.myNames, ...s.sisterNames, ...s.employerNames].map((x) => x.toUpperCase()));
    const toRev = m.txns.filter((t) => t.acct === 'hsbc' && t.amount < 0 && /REVOLUT/i.test(t.desc));
    for (const t of toRev) {
      const pre = C.stripCode(t.desc.toUpperCase()).split('REVOLUT')[0].replace(/APPLE PAY/, '').trim();
      if (pre.length >= 3 && !known.has(pre)) out.me.set(pre, (out.me.get(pre) || 0) + 1);
    }
    for (const t of m.txns) {
      if (t.acct === 'revolut' && t.amount > 0 && /^PAYMENT FROM /i.test(t.desc)) {
        const name = t.desc.replace(/^payment from /i, '').trim().toUpperCase();
        if (name.length < 3 || known.has(name)) continue;
        const mine = toRev.some((x) => Math.abs(x.amount + t.amount) < 0.01 && Math.abs(C.dayDiff(x.date, t.date)) <= 3);
        const map = mine ? out.me : out.sister;
        map.set(name, (map.get(name) || 0) + 1);
      }
      if (t.kind === 'unknown' && t.review === 'money-in' && t.amount >= 100) {
        const k = C.stripCode(t.desc.toUpperCase()).split(/\s+/).slice(0, 2).join(' ');
        if (k.length >= 3 && !known.has(k)) out.sister.set(k, (out.sister.get(k) || 0) + 1);
      }
      if (t.kind === 'income' && t.cat === 'salary' && t.guessed) {
        const k = C.suggestMatch(t.desc);
        if (k && !known.has(k)) out.employer.set(k, (out.employer.get(k) || 0) + 1);
      }
    }
    return out;
  }
  function viewSettings() {
    const s = state.settings;
    const hasData = state.model && !state.model.empty;
    const sug = suggestions();
    const saveSettings = async () => { await persist(); recompute(); const sb = document.querySelector('.sidebar'); if (sb) sb.replaceWith(sidebar()); };
    const nameField = (key, label, hint, sugMap) => {
      const input = h('input', { class: 'input', value: s[key].join(', '), placeholder: 'e.g. as it appears on a statement',
        onchange: async (e) => { s[key] = splitNames(e.target.value); await saveSettings(); } });
      const sugs = [...sugMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return h('div', { class: 'field' }, h('label', null, label), input, h('span', { class: 'hint' }, hint),
        sugs.length ? h('div', { class: 'suggest' }, 'Found in your data:', sugs.map(([n]) => h('button', { class: 'chip', onclick: async () => {
          s[key] = [...new Set([...s[key], n])]; input.value = s[key].join(', '); await saveSettings(); renderContent();
        } }, icon('plus', 14), n))) : null);
    };
    const card = (id, title, desc, ...body) => h('section', { class: 'card', id }, h('h2', null, title), desc ? h('p', null, desc) : null, body);
    const navLink = (id, label) => h('button', { class: 'nav-item', onclick: () => document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' }) }, label);

    const names = card('set-names', 'Names on your statements', 'Used to spot money moving between your own accounts, your sister’s payments and your salary. Separate several with commas. Names match whole words, so “M SMITH” won’t match “HM SMITH”.',
      h('div', { class: 'form-grid' },
        nameField('myNames', 'Your name on transfers', 'As it shows when you pay yourself, e.g. into Revolut.', sug.me),
        nameField('sisterNames', 'Your sister’s name on transfers', 'As it shows when she pays you, with her initial, e.g. “M SMITH”.', sug.sister),
        nameField('employerNames', 'Salary text', 'Any word from the salary line. Leave blank and it’s guessed from repeating payments.', sug.employer)),
      nameWarnings(s));

    const sister = sisterSettings(s, saveSettings, card);
    const pay = paySettings(s, saveSettings, card);

    const budgets = card('set-budgets', 'Monthly budgets', 'Leave blank for no budget. Bills you pay for your sister aren’t counted.',
      h('div', { class: 'form-grid three' }, C.CATEGORIES.filter((c) => c.id !== 'other').map((c) => h('label', { class: 'field' }, h('span', null, c.label),
        h('input', { class: 'input', type: 'number', inputmode: 'decimal', min: '0', step: '10', value: s.budgets[c.id] ? String(s.budgets[c.id]) : '', placeholder: '—',
          onchange: async (e) => { const n = parseFloat(e.target.value); if (n > 0) s.budgets[c.id] = n; else delete s.budgets[c.id]; await saveSettings(); } })))));

    const t212 = C.withDefaults(s).balances;
    const lastOf = (list) => (list && list.length ? [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0] : null);
    const balances = card('set-balances', 'Values you update by hand', 'Exports don’t include today’s value of your investments or pension, so type them in when you check.',
      h('div', { class: 'stat-rows' },
        h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'Trading 212'), h('span', { class: 'v' }, lastOf(t212.t212) ? `${money(lastOf(t212.t212).value)} · ${fmtDate(lastOf(t212.t212).date, true)}` : 'Not set')),
        h('div', { class: 'stat-row' }, h('span', { class: 'k' }, 'L&G pension'), h('span', { class: 'v' }, lastOf(t212.pension) ? `${money(lastOf(t212.pension).value)} · ${fmtDate(lastOf(t212.pension).date, true)}` : 'Not set'))),
      h('div', { class: 'row-actions' }, h('button', { class: 'btn', onclick: openBalances }, icon('edit', 16), 'Update values')));

    const rulesCard = card('set-rules', 'Your rules', 'Created when you tick “remember”. Newest wins.',
      s.rules.length ? h('div', null, [...s.rules].reverse().map((r) => h('div', { class: 'rule-line' },
        h('div', { class: 'mid' }, h('div', null, `“${r.match}”`), h('div', { class: 'sub' }, `${r.acct ? acctLabel(r.acct) + ' · ' : ''}${r.dir === 'in' ? 'money in' : r.dir === 'out' ? 'money out' : 'any'} → ${ruleResult(r)}`)),
        h('button', { class: 'icon-btn', 'aria-label': 'Delete rule', onclick: async () => { s.rules = s.rules.filter((x) => x.id !== r.id); await persist(); recompute(); renderContent(); } }, icon('trash', 17))))) :
        h('p', { class: 'card-sub' }, 'No rules yet.'));

    const data = card('set-data', 'Your data', hasData ? `${state.txns.length} transactions from ${state.meta.imports.length} import${state.meta.imports.length === 1 ? '' : 's'}${store.ok ? ', saved in this browser.' : '.'}` : 'Nothing imported yet.',
      !store.ok ? h('div', { class: 'banner warn', style: { marginBottom: '14px' } }, h('span', { class: 'ico' }, icon('alert', 18)), h('div', null, h('h3', null, 'This browser isn’t saving'), h('p', null, 'Private browsing can block storage. You’ll need to import again next time.'))) : null,
      h('div', { class: 'field' }, h('span', null, 'Shared data file'),
        CAN_LINK ? [
          h('div', { class: 'card-sub', id: 'sync-status' }, syncStatusText()),
          h('div', { class: 'row-actions', style: { marginTop: '10px' } }, sync.handle
            ? [h('button', { class: 'btn', onclick: async () => { const ok = await (sync.status === 'needs' ? connectFile(true).then(() => sync.status === 'saved') : writeFile(true)); toast(ok ? 'Saved to the data file.' : state.meta.demo || !state.txns.length ? 'There’s nothing of yours to save yet.' : 'Couldn’t save to the data file.'); } }, icon('download', 16), 'Save now'),
              h('button', { class: 'btn', onclick: unlinkFile }, 'Unlink')]
            : [h('button', { class: 'btn primary', onclick: linkNewFile }, icon('file', 16), 'Create the data file'), h('button', { class: 'btn', onclick: linkExistingFile }, 'Open an existing one')]),
        ] : h('div', { class: 'card-sub' }, 'This browser can’t save to a file by itself. Use Chrome or Edge on the laptop. Or use “Download a copy” below and put the file in your Drive by hand.'),
        h('span', { class: 'hint' }, 'On your iPhone, open the app, tap “Load latest” and pick this file from Google Drive.')),
      h('div', { class: 'section-label', style: { marginTop: '18px' } }, 'Import and backups'),
      h('div', { class: 'row-actions', style: { marginTop: '10px' } },
        importLabel('btn', 'Import files'),
        hasData ? h('button', { class: 'btn', onclick: () => exportBackup(true) }, icon('download', 16), 'Download a copy') : null,
        h('button', { class: 'btn', onclick: () => exportBackup(false) }, icon('download', 16), 'Back up settings only'),
        h('label', { class: 'btn', for: 'backup-input', role: 'button', tabindex: '0' }, icon('upload', 16), 'Restore a backup or setup file'),
        !hasData ? h('button', { class: 'btn', onclick: loadDemo }, icon('chart', 16), 'Load demo data') : null,
        hasData ? h('button', { class: 'btn danger', onclick: () => confirmErase('Erase everything?', 'Deletes all transactions and settings from this browser and unlinks the data file. The file in your Drive and your CSV files aren’t touched.') }, icon('trash', 16), 'Erase everything') : null));

    const about = aboutCard(card);

    return [
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Settings'), h('p', null, 'Stored in this browser and in your data file.'))),
      h('div', { class: 'settings' },
        h('nav', { class: 'settings-nav' }, navLink('set-names', 'Names'), navLink('set-sister', 'Sister'), navLink('set-pay', 'Pay'), navLink('set-budgets', 'Budgets'),
          navLink('set-balances', 'Values'), navLink('set-rules', 'Rules'), navLink('set-data', 'Data'), navLink('set-about', 'Privacy')),
        h('div', { class: 'settings-body' }, names, sister, pay, budgets, balances, rulesCard, data, about)),
    ];
  }
  function aboutCard(card) {
    return card('set-about', 'Privacy and offline use', null,
      h('div', { class: 'prose' },
        h('ul', null,
          h('li', null, h('strong', null, 'No connections out. '), 'The page carries a security policy that blocks every network request, so the app can’t send your data anywhere.'),
          VIEWER ? h('li', null, h('strong', null, 'Where your data is. '), 'In this browser’s storage on this device, copied from the file you picked.')
            : h('li', null, h('strong', null, 'Where your data is. '), 'In this browser’s storage, and in the one data file you save. Google Drive syncs that file like any other; the app itself uploads nothing.'),
          h('li', null, h('strong', null, 'Works offline. '), 'After the first visit it loads without internet.'),
          VIEWER ? null : h('li', null, h('strong', null, 'On iPhone: '), 'open the link in Safari, tap Share, then “Add to Home Screen”. Then tap “Load latest”.'),
          h('li', null, h('strong', null, 'Lock your devices. '), 'The data is as private as the devices and the Google account it’s on.'),
          h('li', null, h('strong', null, 'Version 3. '), VIEWER ? 'This device is view only.' : 'The laptop edits; the iPhone views.'))));
  }
  // View only: where the data came from and how to refresh it.
  function viewData() {
    const m = state.model;
    const has = m && !m.empty;
    const card = (id, title, desc, ...body) => h('section', { class: 'card', id }, h('h2', null, title), desc ? h('p', null, desc) : null, body);
    const rows = [];
    if (has) {
      for (const a of ['hsbc', 'amex', 'revolut']) {
        const c = m.coverage[a];
        if (!c) continue;
        const k = m.checks[a];
        const chk = k.status === 'ok' ? ` · adds up to ${fmtDate(k.checkedTo)}` : k.status === 'off' ? ' · doesn’t add up' : '';
        rows.push(h('div', { class: 'stat-row' }, h('span', { class: 'k' }, acctLabel(a)), h('span', { class: 'v' }, `to ${fmtDate(c.to, true)}${chk}`)));
      }
    }
    const desc = !has ? 'Nothing loaded yet.' : state.meta.demo ? 'Demo data. It’s all made up.'
      : `${state.txns.length} transactions${state.meta.fileSavedAt ? `, saved on the laptop ${fmtStamp(state.meta.fileSavedAt)}` : ''}.`;
    return [
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Data'), h('p', null, 'This device shows the file saved from your laptop.'))),
      h('div', { class: 'settings-body' },
        card('set-data', 'Your data file', desc,
          rows.length ? h('div', { class: 'stat-rows', style: { marginTop: 0 } }, rows) : null,
          h('div', { class: 'row-actions' }, loadLabel(),
            !has ? h('button', { class: 'btn', onclick: loadDemo }, icon('chart', 16), 'Load demo data') : null,
            has ? h('button', { class: 'btn danger', onclick: () => confirmErase('Erase from this device?', 'Removes the copy held in this browser. The data file and your laptop aren’t touched.') }, icon('trash', 16), 'Erase from this device') : null),
          h('p', { class: 'note' }, icon('info', 15), 'To update: import your exports on the laptop, then tap “Load latest” here and pick finances-data.json from Google Drive.')),
        aboutCard(card)),
    ];
  }
  function nameWarnings(s) {
    const out = [];
    const single = s.sisterNames.filter((n) => !/\s/.test(n.trim()));
    if (single.length) out.push(`“${single.join('”, “')}” is a single word, so it could also match your own transfers or other people. Use it as it appears with her initial, e.g. “M ${single[0].toUpperCase()}”.`);
    for (const sn of s.sisterNames) for (const mn of s.myNames) {
      if (C.nameMatches(mn, sn) || C.nameMatches(sn, mn)) out.push(`“${sn}” (your sister) and “${mn}” (you) overlap, so your own transfers could be counted as hers. Make them more specific.`);
    }
    if (!out.length) return null;
    return h('div', { class: 'banner warn', style: { marginTop: '14px' } }, h('span', { class: 'ico' }, icon('alert', 18)), h('div', null, h('h3', null, 'Check these names'), out.map((x) => h('p', null, x))));
  }

  function payeeStats(s) {
    const m = state.model;
    const stats = new Map(s.sisterPays.map((p) => [p, { n: 0, total: 0, last: null, names: new Set() }]));
    if (!m || m.empty) return stats;
    for (const t of m.txns) {
      if (t.acct === 't212' || (t.cur && t.cur !== 'GBP')) continue;
      for (const p of s.sisterPays) {
        if (!C.nameMatches(t.desc, p, true)) continue;
        const x = stats.get(p);
        x.n++; x.total -= t.amount; if (!x.last || t.date > x.last) x.last = t.date;
        x.names.add(C.prettyName(t.desc));
        break;
      }
    }
    return stats;
  }

  function sisterSettings(s, saveSettings, card) {
    const m = state.model;
    const stats = payeeStats(s);
    const listEl = h('div', { class: 'payee-list' });
    const redraw = () => renderContent();
    const add = async (text) => { if (addPayee(text)) { await saveSettings(); redraw(); } };
    for (const p of s.sisterPays) {
      const x = stats.get(p);
      listEl.append(h('div', { class: 'payee' + (x && x.n ? '' : ' none') },
        h('div', { class: 'mid' }, h('div', { class: 'name' }, p),
          h('div', { class: 'sub' }, x && x.n ? `${x.n} payment${x.n === 1 ? '' : 's'} · ${money(x.total, { pence: false })} · last ${fmtDate(x.last)}` : m && !m.empty ? 'No matches in your data yet. Check the spelling on a statement.' : 'Import your data to see matches.'),
          x && x.names.size ? h('div', { class: 'sub' }, `Matches: ${[...x.names].slice(0, 4).join(', ')}${x.names.size > 4 ? ` and ${x.names.size - 4} more` : ''}`) : null),
        x && x.n ? h('button', { class: 'icon-btn', 'aria-label': `See payments to ${p}`, title: 'See payments', onclick: () => go('transactions', { tx: { q: p, month: '', acct: '', type: '' } }) }, icon('list', 17)) : null,
        h('button', { class: 'icon-btn', 'aria-label': `Remove ${p}`, title: 'Remove', onclick: async () => { s.sisterPays = s.sisterPays.filter((y) => y !== p); await saveSettings(); redraw(); } }, icon('trash', 17))));
    }
    if (!s.sisterPays.length) listEl.append(h('p', { class: 'card-sub', style: { margin: 0 } }, 'None yet. Add the rent, council tax and utilities you pay for her.'));
    const input = h('input', { class: 'input', placeholder: 'e.g. THAMES WATER', 'aria-label': 'Payee text from a statement', onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); add(input.value); } } });
    const covered = (b) => s.sisterPays.some((p) => C.nameMatches(b.desc, p, true));
    const sugs = m && !m.empty ? m.bills.filter((b) => !covered(b)).sort((a, b) => b.amount - a.amount).slice(0, 8) : [];
    const small = h('input', { class: 'input', type: 'number', inputmode: 'decimal', min: '0', step: '10', value: String(s.sisterSmall), style: { maxWidth: '120px' },
      onchange: async (e) => { const n = parseFloat(e.target.value); s.sisterSmall = n >= 0 ? n : 200; await saveSettings(); } });
    const start = h('input', { class: 'input', type: 'number', inputmode: 'decimal', step: '1', value: s.sisterStart ? String(s.sisterStart) : '', placeholder: '0', style: { maxWidth: '160px' },
      onchange: async (e) => { s.sisterStart = parseFloat(e.target.value) || 0; await saveSettings(); } });
    return card('set-sister', 'Paid for your sister', 'Bills you pay for her aren’t your spending, and her repayments aren’t your income. The overview keeps a running total of what she owes you, however the timing falls.',
      h('div', { class: 'field' }, h('span', null, 'Bills you pay for her'), listEl,
        h('div', { class: 'add-row' }, input, h('button', { class: 'btn', onclick: () => add(input.value) }, icon('plus', 16), 'Add')),
        h('span', { class: 'hint' }, 'Type part of the name as it appears on statements. It matches from the start of a word, on every account, and refunds from them count too.'),
        sugs.length ? h('div', { class: 'suggest' }, 'Regular bills in your data:', sugs.map((b) => h('button', { class: 'chip', onclick: () => add(C.suggestMatch(b.desc)) }, icon('plus', 14), C.suggestMatch(b.desc)))) : null),
      h('div', { class: 'form-grid', style: { marginTop: '18px' } },
        h('label', { class: 'field' }, h('span', null, 'Settling-up suggestion (£)'), small,
          h('span', { class: 'hint' }, 'Transfers between you of this much or more are suggested as settling up, and smaller ones as ordinary spending or income. Each one waits in Review until you confirm it.')),
        h('label', { class: 'field' }, h('span', null, 'What she owed you before your first export (£)'), start,
          h('span', { class: 'hint' }, 'Use a minus if you were holding money of hers. If the running total is off by a fixed amount, this fixes it.'))));
  }

  function paySettings(s, saveSettings, card) {
    const m = state.model;
    const has = m && !m.empty;
    const pays = has ? m.txns.filter((t) => t.kind === 'income' && t.cat === 'salary').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3) : [];
    const usual = has && m.expectedSalary && m.expectedSalary.source === 'typical' ? m.expectedSalary.amount : null;
    const input = h('input', { class: 'input', type: 'number', inputmode: 'decimal', min: '0', step: '0.01', value: s.pay.takeHome ? String(s.pay.takeHome) : '', placeholder: usual ? String(usual) : '', style: { maxWidth: '200px' },
      onchange: async (e) => { const val = parseFloat(e.target.value); if (val > 0) s.pay.takeHome = C.round2(val); else delete s.pay.takeHome; await saveSettings(); } });
    return card('set-pay', 'Your take-home pay', 'What lands in your account in a normal month. The app expects this before pay day, and shows anything more than 12% above it as a bonus.',
      h('label', { class: 'field' }, h('span', null, 'Normal monthly take-home (£)'), input,
        h('span', { class: 'hint' }, 'Type the net pay from a normal payslip, and change it when your pay changes. Leave it blank to use the middle of your last three pay days.')),
      pays.length ? [h('div', { class: 'section-label', style: { marginTop: '18px' } }, 'Your last pay days'),
        h('div', { class: 'stat-rows', style: { marginTop: '4px' } }, pays.map((t) => h('div', { class: 'stat-row' }, h('span', { class: 'k' }, fmtDate(t.date, true)), h('span', { class: 'v' }, money(t.amount)))))] : null);
  }

  function ruleResult(r) {
    if (r.kind === 'spend') return catLabel(r.cat || 'other');
    if (r.kind === 'income') return r.cat ? catLabel(r.cat) : 'Income';
    if (r.kind === 'transfer') return 'Between my accounts';
    if (r.kind === 'sister') return 'Settling up with my sister';
    if (r.kind === 'onbehalf') return 'Paid for my sister';
    if (r.kind === 'ignore') return 'Ignore';
    return r.kind;
  }

  /* ================================================================== sheets */
  let openSheetEl = null;
  function sheet(opts) {
    closeSheet();
    const prevFocus = document.activeElement;
    const close = () => { scrim.remove(); openSheetEl = null; document.removeEventListener('keydown', onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const body = h('div', { class: 'sheet-body' }, opts.body);
    const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
      h('div', { class: 'sheet-head' }, h('div', null, h('h2', { id: 'sheet-title' }, opts.title), opts.sub ? h('p', null, opts.sub) : null),
        h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x', 18))),
      body, opts.foot ? h('div', { class: 'sheet-foot' }, opts.foot(close)) : null);
    const scrim = h('div', { class: 'scrim', onclick: (e) => { if (e.target === scrim) close(); } }, box);
    document.body.append(scrim);
    document.addEventListener('keydown', onKey);
    openSheetEl = { close };
    requestAnimationFrame(() => { const f = box.querySelector('input, select, textarea, .chip[aria-pressed="true"], .btn.primary'); if (f && window.matchMedia('(min-width: 760px)').matches) f.focus(); });
    return { close, body };
  }
  function closeSheet() { if (openSheetEl) openSheetEl.close(); }

  /* --- transaction editor */
  function openTxn(id) {
    const t = state.model.txns.find((x) => x.id === id);
    if (!t) return;
    if (VIEWER) {
      sheet({
        title: C.prettyName(t.desc), sub: `${fmtDate(t.date, true)} · ${acctLabel(t.acct)} · ${money(t.amount, { sign: true })}`,
        body: [h('div', { class: 'review-item', style: { padding: '12px 14px' } }, h('div', { class: 'raw' }, t.desc)),
          h('dl', { class: 'kv' }, h('dt', null, 'Counted as'), h('dd', null, kindLabel(t) || '—'),
            h('dt', null, 'Decided by'), h('dd', null, t.source === 'edit' ? 'You, for this transaction' : t.source === 'rule' ? 'One of your rules' : 'The built-in rules')),
          t.review ? h('p', { class: 'note', style: { marginTop: 0 } }, icon('info', 15), 'Waiting in Review on the laptop.') : null],
        foot: (close) => [h('span', { class: 'spacer' }), h('button', { class: 'btn primary', onclick: close }, 'Done')],
      });
      return;
    }
    const s = state.settings;
    const prev = s.edits[t.id] || {};
    const draft = { kind: t.kind === 'unknown' || t.kind === 'foreign' ? (t.amount < 0 ? 'spend' : 'income') : t.kind === 'trade' ? 'trade' : t.kind, cat: t.cat };
    if (draft.kind === 'income' && !C.INCOME_CATS.some((c) => c.id === draft.cat)) draft.cat = 'other-income';
    if (draft.kind === 'spend' && !C.CATEGORIES.some((c) => c.id === draft.cat)) draft.cat = 'other';
    let remember = false;
    let match = C.suggestMatch(t.desc);
    const area = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } });
    const kinds = [['spend', 'Spending', 'card'], ['income', 'Income', 'coins'], ['transfer', 'My own accounts', 'swap'],
      ['onbehalf', 'Paid for my sister', 'users'], ['sister', 'Settling up with my sister', 'users'], ['ignore', 'Ignore', 'eyeOff']];
    const KIND_HINT = {
      onbehalf: 'A bill you paid for her. It’s not your spending, and it adds to what she owes you.',
      sister: 'Money between you for those bills. It’s not your income or spending, and it changes what she owes you.',
      ignore: 'Left out of every total.',
      transfer: 'Money moving between your own accounts. Not counted.',
    };
    function draw() {
      const blocks = [
        h('div', { class: 'field' }, h('span', null, 'What is this?'), h('div', { class: 'chips' }, kinds.map(([k, l, ic]) => h('button', { class: 'chip', 'aria-pressed': draft.kind === k ? 'true' : 'false',
          onclick: () => { draft.kind = k; if (k === 'spend' && !C.CATEGORIES.some((c) => c.id === draft.cat)) draft.cat = t.amount < 0 ? C.classify(Object.assign({}, t, { cur: 'GBP' }), C.withDefaults({}), { salaryKeys: new Set() }).cat || 'other' : 'other';
            if (k === 'income' && !C.INCOME_CATS.some((c) => c.id === draft.cat)) draft.cat = 'other-income'; draw(); } }, icon(ic, 15), l)))),
      ];
      if (draft.kind === 'spend') {
        blocks.push(h('div', { class: 'field' }, h('span', null, 'Category'), h('div', { class: 'chips' }, C.CATEGORIES.map((c) => h('button', { class: 'chip', 'aria-pressed': draft.cat === c.id ? 'true' : 'false', onclick: () => { draft.cat = c.id; draw(); } }, icon(CAT_ICON[c.id], 15), c.label)))));
      }
      if (KIND_HINT[draft.kind]) blocks.push(h('p', { class: 'card-sub', style: { margin: '-6px 0 0' } }, KIND_HINT[draft.kind]));
      if (draft.kind === 'income') {
        blocks.push(h('div', { class: 'field' }, h('span', null, 'Type of income'), h('div', { class: 'chips' }, C.INCOME_CATS.map((c) => h('button', { class: 'chip', 'aria-pressed': draft.cat === c.id ? 'true' : 'false', onclick: () => { draft.cat = c.id; draw(); } }, icon(CAT_ICON[c.id], 15), c.label)))));
      }
      if (t.review !== 'cash') {
        const matchInput = h('input', { class: 'input', value: match, disabled: !remember, oninput: (e) => { match = e.target.value; } });
        blocks.push(h('div', { class: 'field' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: remember, onchange: (e) => { remember = e.target.checked; matchInput.disabled = !remember; } }),
          draft.kind === 'onbehalf' ? 'Add to the bills I pay for her, matching' : 'Do the same for future transactions containing'), matchInput));
      }
      area.replaceChildren(...blocks);
    }
    draw();
    sheet({
      title: C.prettyName(t.desc),
      sub: `${fmtDate(t.date, true)} · ${acctLabel(t.acct)} · ${money(t.amount, { sign: true })}`,
      body: [h('div', { class: 'review-item', style: { padding: '12px 14px' } }, h('div', { class: 'raw' }, t.desc),
        t.source === 'auto' && (t.kind === 'onbehalf' || t.kind === 'sister' || t.cat === 'family' || t.cat === 'family-in') ? h('div', { class: 'card-sub' }, autoReason(t)) : null), area],
      foot: (close) => [
        (prev.kind || prev.cat) ? h('button', { class: 'btn ghost', onclick: async () => { delete s.edits[t.id]; await persist(); recompute(); close(); renderContent(); toast('Back to automatic.'); } }, 'Reset') : null,
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn', onclick: close }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: async () => {
          const snap = snapshot();
          const res = { kind: draft.kind };
          if (draft.kind === 'spend' || draft.kind === 'income') res.cat = draft.cat;
          s.edits[t.id] = res;
          let msg = 'Saved.';
          if (remember && match.trim().length >= 3) {
            if (draft.kind === 'onbehalf') { addPayee(match); msg = `Saved. “${match.trim().toUpperCase()}” is now a bill you pay for her.`; }
            else s.rules.push({ id: 'r' + Date.now().toString(36), match: match.trim(), acct: t.acct, dir: t.amount < 0 ? 'out' : 'in', kind: res.kind, cat: res.cat || null });
          }
          await persist(); recompute(); close(); renderContent(); toast(msg, () => restoreSnapshot(snap));
        } }, 'Save'),
      ],
    });
  }

  function autoReason(t) {
    const s = state.settings;
    if (t.kind === 'onbehalf') { const p = s.sisterPays.find((x) => C.nameMatches(t.desc, x, true)); return p ? `Counted as paid for your sister because it matches “${p}”.` : 'Counted as paid for your sister.'; }
    const small = money(Number(s.sisterSmall) || 0, { pence: false });
    if (t.kind === 'sister') return `Suggested as settling up because it’s ${small} or more. Confirm it in Review.`;
    return `Suggested as ordinary ${t.amount < 0 ? 'spending' : 'income'} because it’s under ${small}. Confirm it in Review.`;
  }

  /* --- bill detail */
  function openBill(b) {
    const s = state.settings;
    const ov = s.billOverrides[b.key] || {};
    let forHer = false;
    const match = C.suggestMatch(b.desc);
    const recent = b.txns.slice(-6).reverse();
    sheet({
      title: b.name, sub: `${catLabel(b.cat)} · usually around the ${ordinal(b.day)} · ${acctLabel(b.acct)}`,
      body: [
        h('dl', { class: 'kv' }, h('dt', null, 'Typical amount'), h('dd', null, money(b.amount)), h('dt', null, 'Last paid'), h('dd', null, fmtDate(b.last, true)),
          h('dt', null, 'How it’s paid'), h('dd', null, b.code === 'DD' ? 'Direct debit' : b.code === 'SO' ? 'Standing order' : 'Card / other')),
        h('div', { class: 'field' }, h('span', null, 'Recent payments'), h('div', { class: 'txn-list' }, recent.map(txnRow))),
        VIEWER ? null : h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: false, onchange: (e) => { forHer = e.target.checked; } }), `I pay this for my sister (adds “${match}” to her bills)`),
      ],
      foot: (close) => VIEWER ? [h('span', { class: 'spacer' }), h('button', { class: 'btn primary', onclick: close }, 'Done')] : [
        h('button', { class: 'btn ghost', onclick: async () => { s.billOverrides[b.key] = Object.assign({}, ov, { hidden: true }); await persist(); recompute(); close(); renderContent(); toast('Hidden from bills.'); } }, 'Not a regular bill'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn', onclick: close }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: async () => {
          if (!forHer) { close(); return; }
          const snap = snapshot();
          addPayee(match); await persist(); recompute(); close(); renderContent();
          toast(`Moved to Paid for your sister. “${match}” won’t count as your spending.`, () => restoreSnapshot(snap));
        } }, 'Save'),
      ],
    });
  }
  function ordinal(n) { const v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')); }

  /* --- sister detail */
  function openSister() {
    const m = state.model;
    const L = m.sister;
    const sentAny = m.months.some((mo) => L.byMonth[mo].sent);
    const rows = [...m.months].reverse().map((mo) => [mo, L.byMonth[mo]]);
    const [big, label] = owedText(L.balance, true);
    const payees = [...payeeStats(state.settings).entries()].filter(([, x]) => x.n).sort((a, b) => b[1].total - a[1].total);
    sheet({
      title: 'Paid for your sister', sub: 'Month by month, newest first',
      body: [
        h('div', { class: 'big-line', style: { marginTop: 0 } }, h('span', { class: 'v' }, big), h('span', { class: 'k' }, label)),
        h('p', { class: 'card-sub', style: { margin: 0 } }, 'Each bill you pay for her adds to what she owes you. Each repayment takes it down, whichever month it lands in.'),
        h('table', { class: 'data' }, h('thead', null, h('tr', null, h('th', null, 'Month'), h('th', null, 'You paid for her'), h('th', null, 'She paid you'), sentAny ? h('th', null, 'You sent her') : null, h('th', null, 'Owed at month end'))),
          h('tbody', null, rows.map(([mo, b]) => h('tr', null, h('td', null, fmtMonth(mo, true) + '\u00a0' + mo.slice(2, 4)), h('td', null, money(b.paid, { pence: false })),
            h('td', null, money(b.repaid, { pence: false })), sentAny ? h('td', null, money(b.sent, { pence: false })) : null, h('td', null, money(b.balance, { pence: false })))))),
        payees.length ? h('div', { class: 'field', style: { marginTop: '6px' } }, h('span', null, 'By payee, all time'),
          h('div', { class: 'stat-rows', style: { marginTop: 0 } }, payees.map(([p, x]) => h('div', { class: 'stat-row' }, h('span', { class: 'k' }, `${p} · ${x.n}`), h('span', { class: 'v' }, money(x.total, { pence: false })))))) : null,
        Number(state.settings.sisterStart) ? h('p', { class: 'note' }, icon('info', 15), `Includes ${money(Number(state.settings.sisterStart), { pence: false })} owed before your first export.`) : null,
      ],
      foot: (close) => [h('button', { class: 'btn', onclick: () => { close(); go('transactions', { tx: { type: 'sister-all' } }); } }, 'See the transactions'),
        VIEWER ? null : h('button', { class: 'btn', onclick: () => { close(); go('settings', { anchor: 'set-sister' }); } }, 'Settings'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn primary', onclick: close }, 'Done')],
    });
  }

  /* --- balances */
  function openBalances() {
    const s = state.settings;
    const today = C.todayISO();
    const d = { t212: '', t212Date: today, pension: '', pensionDate: today };
    const err = h('div', { class: 'err', role: 'alert' });
    const last = (list) => (list && list.length ? [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0] : null);
    const lt = last(s.balances.t212), lp = last(s.balances.pension);
    sheet({
      title: 'Update values', sub: 'Type the value shown in each app today',
      body: [
        h('div', { class: 'form-grid' },
          h('label', { class: 'field' }, h('span', null, 'Trading 212 value (£)'), h('input', { class: 'input', type: 'number', inputmode: 'decimal', placeholder: lt ? String(lt.value) : '', oninput: (e) => { d.t212 = e.target.value; } }),
            h('span', { class: 'hint' }, lt ? `Last: ${money(lt.value)} on ${fmtDate(lt.date, true)}` : 'Not set yet')),
          h('label', { class: 'field' }, h('span', null, 'Date'), h('input', { class: 'input', type: 'date', value: today, oninput: (e) => { d.t212Date = e.target.value; } })),
          h('label', { class: 'field' }, h('span', null, 'L&G pension value (£)'), h('input', { class: 'input', type: 'number', inputmode: 'decimal', placeholder: lp ? String(lp.value) : '', oninput: (e) => { d.pension = e.target.value; } }),
            h('span', { class: 'hint' }, lp ? `Last: ${money(lp.value)} on ${fmtDate(lp.date, true)}` : 'Not set yet')),
          h('label', { class: 'field' }, h('span', null, 'Date'), h('input', { class: 'input', type: 'date', value: today, oninput: (e) => { d.pensionDate = e.target.value; } }))),
        err,
      ],
      foot: (close) => [h('button', { class: 'btn', onclick: close }, 'Cancel'), h('button', { class: 'btn primary', onclick: async () => {
        const a = parseFloat(d.t212), b = parseFloat(d.pension);
        if (!(a >= 0) && !(b >= 0)) { err.textContent = 'Enter at least one value.'; return; }
        if (a >= 0) s.balances.t212.push({ date: d.t212Date || today, value: a });
        if (b >= 0) s.balances.pension.push({ date: d.pensionDate || today, value: b });
        await persist(); recompute(); close(); render(); toast('Values updated.');
      } }, 'Save')],
    });
  }

  /* --- confirm erase */
  function confirmErase(title, text) {
    sheet({
      title, body: [h('p', { class: 'card-sub', style: { margin: 0 } }, text)],
      foot: (close) => [h('button', { class: 'btn', onclick: close }, 'Cancel'), h('button', { class: 'btn danger', onclick: async () => {
        // Removing the demo keeps the link to your data file. Erasing your own data unlinks it, so an empty copy can never overwrite the file.
        const keep = state.meta.demo ? sync.handle : null;
        clearTimeout(sync.timer);
        await store.clear();
        if (keep) await store.set('fileHandle', keep); else { sync.handle = null; sync.status = 'none'; }
        state.txns = []; state.settings = C.defaultSettings(); state.meta = { imports: [], demo: false, revolutBalance: null };
        state.month = null; state.view = 'overview';
        recompute(); close(); render(); toast('Erased.');
      } }, icon('trash', 16), 'Erase')],
    });
  }

  /* ================================================================== import */
  const PROVIDER_OPTS = [['hsbc', 'HSBC'], ['amex', 'Amex'], ['revolut', 'Revolut'], ['t212', 'Trading 212 (optional)'], ['', 'Skip this file']];
  async function readFile(f) {
    if (/\.xls$/i.test(f.name)) throw new Error('Old .xls files aren’t supported. Export CSV (or .xlsx) instead.');
    if (/\.xlsx$/i.test(f.name) || /spreadsheetml/.test(f.type)) {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser can’t open .xlsx files. Save it as CSV first.');
      return C.readXLSX(await f.arrayBuffer());
    }
    if (/\.pdf$/i.test(f.name)) throw new Error('PDF statements can’t be read. Export CSV instead.');
    return C.parseCSV(await f.text());
  }
  function preview(item) {
    item.res = null; item.newCount = 0;
    if (!item.provider || !item.rows) return;
    const det = item.provider === item.det.provider ? item.det : { header: item.provider === 'hsbc' ? (item.det.header >= 0 ? item.det.header : -1) : item.det.header, variant: item.det.variant };
    item.res = C.adapt(item.provider, item.rows, det);
    const ids = new Set(state.txns.map((t) => t.id));
    item.newCount = item.res.txns.filter((t) => !ids.has(t.id)).length;
  }
  async function onFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    if (VIEWER) {
      if (files.length === 1 && /\.json$/i.test(files[0].name)) return loadDataFile(files[0]);
      toast('This device is view only. Import your exports on the laptop.');
      return;
    }
    const items = [];
    for (const f of files) {
      const item = { name: f.name, error: null, rows: null, det: { provider: null, header: -1 }, provider: '' };
      try {
        item.rows = await readFile(f);
        item.det = C.detect(item.rows, f.name);
        item.provider = item.det.provider || '';
        preview(item);
        if (item.provider && item.res && !item.res.txns.length) item.warn = 'No transactions found. Is this the right account type?';
      } catch (e) { item.error = e && e.message ? e.message : 'Couldn’t read this file.'; }
      items.push(item);
    }
    openImport(items);
  }
  // Revolut statements carry a running balance, so the file can be checked against itself.
  function balanceNote(it) {
    const c = it.provider === 'revolut' && it.res ? it.res.check : null;
    if (!c) return '';
    return c.breaks ? ` · ${c.breaks} row${c.breaks === 1 ? ' doesn’t' : 's don’t'} follow the balance column` : ' · balance column adds up';
  }
  function openImport(items) {
    let dropDemo = !!state.meta.demo;
    const list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
    const btnHolder = { el: null };
    function total() { return items.reduce((a, i) => a + (i.provider && i.res ? i.newCount : 0), 0); }
    function draw() {
      list.replaceChildren(...items.map((it) => {
        const sub = it.error ? h('div', { class: 'err' }, it.error) : !it.provider ? h('div', { class: 'err' }, it.det.ambiguous ? 'Pick the account this came from.' : 'Couldn’t tell which account this is. Pick one or skip it.') :
          h('div', { class: 'sub' }, it.res && it.res.txns.length ? `${it.res.txns.length} transactions · ${fmtDate(it.res.from, true)} – ${fmtDate(it.res.to, true)} · ${it.newCount} new${balanceNote(it)}` : (it.warn || 'No transactions found'));
        return h('div', { class: 'file-row' }, h('span', { class: `badge ${it.provider || ''}`, style: it.provider ? null : { background: 'var(--surface-4)' } }, icon(it.provider ? ACCT_ICON[it.provider] : 'file', 15)),
          h('div', { class: 'mid' }, h('div', { class: 'name' }, it.name), sub),
          it.error ? null : h('select', { class: 'input', 'aria-label': `Account for ${it.name}`, onchange: (e) => { it.provider = e.target.value; preview(it); draw(); } },
            PROVIDER_OPTS.map(([v, l]) => h('option', { value: v, selected: it.provider === v }, l))));
      }));
      if (btnHolder.el) { const n = total(); btnHolder.el.disabled = n === 0 && !dropDemo; btnHolder.el.lastChild.textContent = n ? `Import ${n} new` : 'Nothing new to import'; }
    }
    draw();
    sheet({
      title: 'Import files', sub: 'Read on this device. Nothing is uploaded.',
      body: [list, state.meta.demo ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { dropDemo = e.target.checked; draw(); } }), 'Remove the demo data first') : null,
        h('p', { class: 'note', style: { marginTop: 0 } }, icon('info', 15), 'Already-imported transactions are skipped, so overlapping exports are fine.')],
      foot: (close) => {
        const b = h('button', { class: 'btn primary', onclick: async () => {
          if (dropDemo) { state.txns = []; state.settings = C.defaultSettings(); state.meta = { imports: [], demo: false, revolutBalance: null }; items.forEach(preview); }
          let added = 0, dupes = 0;
          for (const it of items) {
            if (!it.provider || !it.res || !it.res.txns.length) continue;
            const r = C.merge(state.txns, it.res.txns);
            state.txns = r.all; added += r.added; dupes += r.dupes;
            if (it.provider === 'revolut' && it.res.check) state.settings.checks.revolut = C.mergeAutoChecks(state.settings.checks.revolut, it.res.check);
            state.meta.imports.push({ name: it.name, provider: it.provider, from: it.res.from, to: it.res.to, count: it.res.txns.length, at: new Date().toISOString(),
              breaks: it.res.check ? it.res.check.breaks : undefined });
          }
          state.meta.demo = false;
          await persist();
          if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
          state.month = null; recompute(); close(); state.view = 'overview'; render(); window.scrollTo(0, 0);
          toast(`Added ${added} new transaction${added === 1 ? '' : 's'}${dupes ? ` · ${dupes} already here` : ''}.`);
        } }, icon('upload', 16), h('span', null, ''));
        btnHolder.el = b; draw();
        return [h('button', { class: 'btn', onclick: close }, 'Cancel'), b];
      },
    });
  }

  /* --- demo */
  function ensureDemo() {
    if (self.FIN_DEMO) return Promise.resolve(self.FIN_DEMO);
    return new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = 'demo.js'; sc.onload = () => resolve(self.FIN_DEMO); sc.onerror = () => reject(new Error('Demo data couldn’t load.'));
      document.head.append(sc);
    });
  }
  async function loadDemo() {
    try {
      const demo = await ensureDemo();
      let all = [];
      let revCheck = null;
      for (const f of demo.files) { const rows = C.parseCSV(f.text); const det = C.detect(rows, f.name); const res = C.adapt(det.provider, rows, det); if (res.check) revCheck = res.check; all = C.merge(all, res.txns).all; }
      state.txns = all;
      state.settings = C.withDefaults(JSON.parse(JSON.stringify(demo.settings)));
      state.settings.checks.revolut = C.mergeAutoChecks([], revCheck);
      for (const [acct, start, sign] of [['hsbc', 2140.55, 1], ['amex', 2680.4, -1]]) {
        const list = all.filter((t) => t.acct === acct).sort((a, b) => (a.date < b.date ? -1 : 1));
        if (!list.length) continue;
        const months = [...new Set(list.map((t) => C.monthOf(t.date)))];
        const ends = months.slice(0, -1).filter((mo, i) => i % 3 === 2).map((mo) => `${mo}-${String(C.daysInMonth(mo)).padStart(2, '0')}`);
        const at = (date) => C.round2(start + sign * list.filter((t) => t.date <= date).reduce((x, t) => x + t.amount, 0));
        state.settings.checks[acct] = [{ date: C.addDays(list[0].date, -1), value: start }].concat([...ends, list[list.length - 1].date].map((date) => ({ date, value: at(date) })));
      }
      state.meta = { imports: demo.files.map((f) => ({ name: f.name, demo: true })), demo: true, revolutBalance: null };
      await persist(); state.month = null; recompute(); state.view = 'overview'; render(); window.scrollTo(0, 0);
      toast('Demo data loaded. It’s all made up.');
    } catch (e) { toast(e.message || 'Demo data couldn’t load.'); }
  }

  /* --- backup */
  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function exportBackup(everything) {
    // A full copy is in the same format as the shared data file, so the iPhone can load it too.
    const data = everything ? C.packData(state.txns, state.settings, state.meta) : { app: 'finances', version: 3, exported: new Date().toISOString(), settings: state.settings };
    download(everything ? `finances-data-${C.todayISO()}.json` : `finances-settings-backup-${C.todayISO()}.json`, JSON.stringify(data));
    toast(everything ? 'Copy saved. It contains your transactions, so keep it somewhere private.' : 'Settings backup saved.');
  }
  // Lists are added to (no duplicates); single values are replaced.
  function mergeSettings(cur, add) {
    const out = C.withDefaults(JSON.parse(JSON.stringify(cur)));
    const lists = ['myNames', 'sisterNames', 'employerNames', 'sisterPays'];
    const counts = {};
    for (const k of Object.keys(add || {})) {
      const v = add[k];
      if (lists.includes(k) && Array.isArray(v)) {
        const seen = new Set(out[k].map((x) => String(x).toUpperCase()));
        let n = 0;
        for (const x of v) { const t = String(x).trim(); if (t.length >= 3 && !seen.has(t.toUpperCase())) { out[k].push(t); seen.add(t.toUpperCase()); n++; } }
        counts[k] = n;
      } else if (k === 'pay' && v && typeof v === 'object') out.pay = Object.assign({}, out.pay, v);
      else if (['sisterSmall', 'sisterStart'].includes(k)) out[k] = Number(v) || 0;
    }
    return { settings: C.withDefaults(out), counts };
  }
  async function restoreBackup(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.app !== 'finances' || !data.settings) throw new Error('This isn’t a Finances backup file.');
      const isSetup = data.kind === 'setup';
      const demo = !!state.meta.demo;
      let text;
      if (isSetup) {
        const add = data.settings;
        const parts = [];
        if (add.sisterNames) parts.push(`${add.sisterNames.length} name${add.sisterNames.length === 1 ? '' : 's'} for your sister`);
        if (add.myNames) parts.push(`${add.myNames.length} for you`);
        if (add.sisterPays) parts.push(`${add.sisterPays.length} bills you pay for her`);
        if (add.sisterSmall != null) parts.push(`a ${money(Number(add.sisterSmall) || 0, { pence: false })} small-transfer limit`);
        text = `Adds ${parts.join(', ') || 'these settings'} to what you have. Nothing is removed.${demo ? ' The demo data is cleared first.' : ''}`;
      } else {
        text = data.txns ? `Replaces your settings and transactions with the backup’s (${data.txns.length} transactions).` : 'Replaces your settings. Transactions here are kept.';
      }
      sheet({
        title: isSetup ? 'Add this setup?' : 'Restore backup?', sub: isSetup ? file.name : `From ${fmtDate(String(data.saved || data.exported || '').slice(0, 10), true) || 'unknown date'}`,
        body: [h('p', { class: 'card-sub', style: { margin: 0 } }, text)],
        foot: (close) => [h('button', { class: 'btn', onclick: close }, 'Cancel'), h('button', { class: 'btn primary', onclick: async () => {
          if (isSetup) {
            if (demo) { state.txns = []; state.settings = C.defaultSettings(); state.meta = { imports: [], demo: false, revolutBalance: null }; }
            state.settings = mergeSettings(state.settings, data.settings).settings;
          } else {
            state.settings = C.withDefaults(data.settings);
            if (Array.isArray(data.txns)) { state.txns = data.txns; state.meta = Object.assign({ imports: [], demo: false }, data.meta || {}); }
          }
          await persist(); state.month = null; recompute(); close(); render(); toast(isSetup ? 'Setup added.' : 'Backup restored.');
        } }, isSetup ? 'Add' : 'Restore')],
      });
    } catch (e) { toast(e.message || 'Couldn’t read that file.'); }
  }

  /* ================================================================== toast */
  let toastTimer = null;
  function toast(text, undo, label) {
    let el = document.querySelector('.toast');
    if (!el) { el = h('div', { class: 'toast', role: 'status' }); document.body.append(el); }
    setKids(el, [h('span', null, text), undo ? h('button', { class: 'link-btn', onclick: () => { el.classList.remove('show'); undo(); } }, label || 'Undo') : null]);
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 6000 : 3800);
  }

  /* ================================================================== boot */
  async function boot() {
    document.body.classList.toggle('viewer', VIEWER);
    const [txns, settings, meta, handle] = await Promise.all([store.get('txns'), store.get('settings'), store.get('meta'), store.get('fileHandle')]);
    state.txns = Array.isArray(txns) ? txns : [];
    state.settings = C.withDefaults(settings);
    state.meta = Object.assign({ imports: [], demo: false, revolutBalance: null }, meta || {});
    if (!VIEWER && CAN_LINK && handle && typeof handle.queryPermission === 'function') { sync.handle = handle; sync.status = 'needs'; }
    recompute();
    state.loaded = true;
    render();
    if (sync.handle) connectFile(false);
    document.getElementById('data-input').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) loadDataFile(f).finally(() => { e.target.value = ''; }); });
    document.getElementById('file-input').addEventListener('change', (e) => { const fl = e.target.files; onFiles(fl).finally(() => { e.target.value = ''; }); });
    document.getElementById('backup-input').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) restoreBackup(f).finally(() => { e.target.value = ''; }); });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') && !openSheetEl) {
        const el = document.getElementById('top-search');
        if (el && el.offsetParent) { e.preventDefault(); el.focus(); }
      }
    });
    // drag and drop files anywhere (laptop)
    document.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    document.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); onFiles(e.dataTransfer.files); } });
    window.addEventListener('scroll', hideTip, { passive: true });
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      let had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (had) toast('A new version is ready.', () => location.reload(), 'Reload');
        had = true;
      });
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  boot();
})();
