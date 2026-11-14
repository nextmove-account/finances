/* Finances core (version 3.1): parsing, classification and analysis.
   Pure logic: no DOM rendering and no network. Runs in the browser and in Node (for tests). */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ utils */
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymd = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  const monthOf = (iso) => iso.slice(0, 7);
  const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

  function addMonths(ym, k) {
    let [y, m] = ym.split('-').map(Number);
    m += k;
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    return `${y}-${pad2(m)}`;
  }
  function monthRange(a, b) {
    const out = [];
    for (let m = a; m <= b; m = addMonths(m, 1)) out.push(m);
    return out;
  }
  function daysInMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }
  function dayDiff(a, b) {
    return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
  }
  function addDays(iso, k) {
    const d = new Date(Date.parse(iso + 'T00:00:00Z') + k * 86400000);
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((x, y) => x - y);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }
  const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  function todayISO() {
    const d = new Date();
    return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  /* ------------------------------------------------------------------ CSV */
  function detectDelimiter(text) {
    const counts = { ',': 0, '\t': 0, ';': 0 };
    let inQ = false;
    const lim = Math.min(text.length, 6000);
    for (let i = 0; i < lim; i++) {
      const c = text[i];
      if (c === '"') inQ = !inQ;
      else if (!inQ && c in counts) counts[c]++;
    }
    let best = ',';
    for (const k of ['\t', ';']) if (counts[k] > counts[best] * 1.5) best = k;
    return best;
  }

  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const delim = detectDelimiter(text);
    const rows = [];
    let row = [];
    let field = '';
    let inQ = false;
    let i = 0;
    const n = text.length;
    while (i < n) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"' && field === '') { inQ = true; i++; continue; }
      if (c === delim) { row.push(field); field = ''; i++; continue; }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = ''; i++; continue;
      }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* ------------------------------------------------------------------ XLSX (browser: DecompressionStream + DOMParser) */
  function excelDate(serial) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(serial * 86400) * 1000;
    const d = new Date(ms);
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  function colIndex(ref) {
    const letters = (ref || '').replace(/[0-9]/g, '');
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }
  async function readXLSX(buffer) {
    const u8 = new Uint8Array(buffer);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('This doesn’t look like an .xlsx file.');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const entries = {};
    const dec = new TextDecoder();
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true);
      const xlen = dv.getUint16(p + 30, true);
      const clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      entries[dec.decode(u8.subarray(p + 46, p + 46 + nlen))] = { method, csize, off };
      p += 46 + nlen + xlen + clen;
    }
    async function read(name) {
      const e = entries[name];
      if (!e) return null;
      const nlen = dv.getUint16(e.off + 26, true);
      const xlen = dv.getUint16(e.off + 28, true);
      const start = e.off + 30 + nlen + xlen;
      const data = u8.subarray(start, start + e.csize);
      if (e.method === 0) return dec.decode(data);
      if (e.method !== 8) throw new Error('Unsupported compression in .xlsx');
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    }
    const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
    let sheetPath = 'xl/worksheets/sheet1.xml';
    const wbXml = await read('xl/workbook.xml');
    const relXml = await read('xl/_rels/workbook.xml.rels');
    if (wbXml && relXml) {
      const sheet = xml(wbXml).getElementsByTagName('sheet')[0];
      const rid = sheet && (sheet.getAttribute('r:id') ||
        sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
      for (const r of xml(relXml).getElementsByTagName('Relationship')) {
        if (r.getAttribute('Id') === rid) {
          const t = r.getAttribute('Target').replace(/^\//, '');
          sheetPath = t.startsWith('xl/') ? t : 'xl/' + t;
        }
      }
    }
    const shared = [];
    const ssXml = await read('xl/sharedStrings.xml');
    if (ssXml) {
      for (const si of xml(ssXml).getElementsByTagName('si')) {
        let s = '';
        for (const t of si.getElementsByTagName('t')) {
          if (t.parentNode && t.parentNode.nodeName === 'rPh') continue;
          s += t.textContent;
        }
        shared.push(s);
      }
    }
    const dateStyles = new Set();
    const stXml = await read('xl/styles.xml');
    if (stXml) {
      const doc = xml(stXml);
      const custom = {};
      for (const nf of doc.getElementsByTagName('numFmt')) custom[nf.getAttribute('numFmtId')] = nf.getAttribute('formatCode') || '';
      const xfs = doc.getElementsByTagName('cellXfs')[0];
      if (xfs) {
        let idx = 0;
        for (const xf of xfs.getElementsByTagName('xf')) {
          const id = Number(xf.getAttribute('numFmtId') || 0);
          const code = (custom[id] || '').replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');
          if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || /[dmy]/i.test(code)) dateStyles.add(idx);
          idx++;
        }
      }
    }
    const sheetXml = await read(sheetPath);
    if (!sheetXml) throw new Error('Couldn’t find a worksheet in this .xlsx file.');
    const rows = [];
    let next = 0;
    for (const r of xml(sheetXml).getElementsByTagName('row')) {
      const ri = r.getAttribute('r') ? Number(r.getAttribute('r')) - 1 : next;
      next = ri + 1;
      const arr = [];
      let ci = 0;
      for (const c of r.getElementsByTagName('c')) {
        const col = c.getAttribute('r') ? colIndex(c.getAttribute('r')) : ci;
        ci = col + 1;
        const t = c.getAttribute('t');
        const s = Number(c.getAttribute('s') || 0);
        const vEl = c.getElementsByTagName('v')[0];
        let v = vEl ? vEl.textContent : '';
        if (t === 's') v = shared[Number(v)] == null ? '' : shared[Number(v)];
        else if (t === 'inlineStr') { v = ''; for (const tt of c.getElementsByTagName('t')) v += tt.textContent; }
        else if (t === 'b') v = v === '1' ? 'TRUE' : 'FALSE';
        else if (t === 'str' || t === 'e') { /* keep text */ }
        else if (v !== '') { const num = Number(v); v = dateStyles.has(s) ? excelDate(num) : num; }
        arr[col] = v;
      }
      for (let k = 0; k < arr.length; k++) if (arr[k] === undefined) arr[k] = '';
      rows[ri] = arr;
    }
    for (let k = 0; k < rows.length; k++) if (!rows[k]) rows[k] = [];
    return rows;
  }

  /* ------------------------------------------------------------------ value parsing */
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  function validDate(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) return null;
    return ymd(y, m, d);
  }
  function parseDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v > 20000 && v < 80000 ? excelDate(v) : null;
    const s = String(v).trim();
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return validDate(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/))) {
      let y = +m[3]; if (y < 100) y += 2000;
      return validDate(y, +m[2], +m[1]);
    }
    if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?[\s,-]+(\d{2,4})\b/))) {
      const mo = MON[m[2].toLowerCase().slice(0, 4)] || MON[m[2].toLowerCase().slice(0, 3)];
      let y = +m[3]; if (y < 100) y += 2000;
      return mo ? validDate(y, mo, +m[1]) : null;
    }
    if ((m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/))) {
      const mo = MON[m[1].toLowerCase().slice(0, 4)] || MON[m[1].toLowerCase().slice(0, 3)];
      return mo ? validDate(+m[3], mo, +m[2]) : null;
    }
    return null;
  }

  function parseAmount(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? { value: v, cur: null } : null;
    if (v == null) return null;
    let s = String(v).trim().replace(/−/g, '-');
    if (!s) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    const first = s.search(/\d/);
    if (first < 0) return null;
    if (s.slice(0, first).includes('-') || /-\s*$/.test(s) || /\bDR\b/i.test(s)) neg = true;
    let cur = null;
    if (/£|\bGBP\b/i.test(s)) cur = 'GBP';
    else if (/€|\bEUR\b/i.test(s)) cur = 'EUR';
    else if (/\$|\bUSD\b/i.test(s)) cur = 'USD';
    else if (/\bJOD\b/i.test(s)) cur = 'JOD';
    const num = parseFloat(s.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(num)) return null;
    return { value: neg ? -num : num, cur };
  }

  /* ------------------------------------------------------------------ descriptions */
  const HSBC_CODES = new Set(['DD', 'SO', 'BP', 'CR', 'DR', 'VIS', ')))', 'ATM', 'TFR', 'OBP', 'CHQ', 'BGC', 'FPI', 'FPO',
    'IBP', 'CHG', 'PAY', 'DEB', 'MPI', 'MPO', 'SBT', 'CIR', 'INT', 'CDM', 'DPC']);
  function hsbcCode(desc) {
    const toks = String(desc).trim().split(/\s+/);
    const last = (toks[toks.length - 1] || '').toUpperCase();
    return HSBC_CODES.has(last) ? last : null;
  }
  function stripCode(desc) {
    const toks = String(desc).trim().split(/\s+/);
    if (toks.length > 1 && HSBC_CODES.has(toks[toks.length - 1].toUpperCase())) toks.pop();
    return toks.join(' ');
  }
  const NOISE = new Set(['LONDON', 'GB', 'GBR', 'UK', 'LTD', 'LIMITED', 'PLC', 'THE', 'WWW', 'COM', 'CO', 'INC', 'LLC', 'HELP', 'BILL', 'CP']);
  function merchantKey(desc) {
    let s = stripCode(desc).toUpperCase();
    s = s.replace(/WWW\./g, '').replace(/\.(COM|CO\.UK|NET|ORG|IO|APP)\b/g, ' ').replace(/[*#/\\|_:]/g, ' ').replace(/[^A-Z0-9&' -]/g, ' ');
    const toks = [];
    for (const t of s.split(/\s+/)) {
      if (!t || t.length < 2 || /\d/.test(t) || NOISE.has(t)) continue;
      if (toks[toks.length - 1] === t) continue;
      toks.push(t);
    }
    return toks.slice(0, 3).join(' ') || stripCode(desc).toUpperCase().slice(0, 24);
  }
  function titleCase(s) {
    return String(s).toLowerCase().replace(/(^|[\s(/&-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/\b(Tfl|Bt|Ee|Uk|Atm|Hsbc|Hmrc|Amex|Uber|Ikea|Asos|Hmv)\b/g, (w) => w === 'Uber' ? 'Uber' : w.toUpperCase());
  }
  const BRANDS = [
    [/NETFLIX/, 'Netflix'], [/SPOTIFY/, 'Spotify'], [/AMAZON PRIME|AMZNPRIME|PRIME VIDEO/, 'Amazon Prime'],
    [/APPLE\.COM\/BILL|APPLE SERVICES|ITUNES/, 'Apple'], [/AMAZON|\bAMZN/, 'Amazon'], [/DISNEY/, 'Disney+'],
    [/\bTFL\b|TRANSPORT FOR LONDON/, 'TfL'], [/UBER ?\*?EATS/, 'Uber Eats'], [/\bUBER\b/, 'Uber'], [/\bBOLT\b/, 'Bolt'],
    [/PRET A MANGER|^PRET\b/, 'Pret'], [/TESCO/, 'Tesco'], [/SAINSBURY/, 'Sainsbury’s'], [/WAITROSE/, 'Waitrose'],
    [/M&S|M & S|MARKS ?& ?SPENCER/, 'M&S'], [/\bGAILS?\b/, 'Gail’s'], [/DELIVEROO/, 'Deliveroo'], [/JUST ?EAT/, 'Just Eat'],
    [/NANDO/, 'Nando’s'], [/DISHOOM/, 'Dishoom'], [/COSTA/, 'Costa'], [/STARBUCKS/, 'Starbucks'], [/JOHN LEWIS/, 'John Lewis'],
    [/UNIQLO/, 'Uniqlo'], [/\bBOOTS\b/, 'Boots'], [/TRAINLINE/, 'Trainline'], [/BRITISH AIRWAYS/, 'British Airways'],
    [/BOOKING\.COM/, 'Booking.com'], [/AIRBNB/, 'Airbnb'], [/OCTOPUS/, 'Octopus Energy'], [/THAMES WATER/, 'Thames Water'],
    [/VIRGIN MEDIA/, 'Virgin Media'], [/VODAFONE/, 'Vodafone'], [/PUREGYM/, 'PureGym'], [/COUNCIL TAX/, 'Council tax'],
    [/TICKETMASTER/, 'Ticketmaster'], [/ODEON/, 'Odeon'], [/AMERICAN EXP|\bAMEX\b/, 'Amex'], [/TRADING ?212/, 'Trading 212'],
    [/NOTEMAC|\bATM\b|CASH WITHDRAWAL/, 'Cash withdrawal'], [/PAYMENT RECEIVED/, 'Payment received'], [/^EXCHANGED TO/, 'Currency exchange'],
    [/TOP-?UP/, 'Top-up'],
  ];
  const PLACE_NOISE = /\b(LONDON|LOS GATOS|CORK|LUXEMBOUR?G|DUBLIN|AMSTERDAM|GB|GBR|UK|LTD|LIMITED|PLC)\b/g;
  function prettyName(desc) {
    const U = stripCode(desc).toUpperCase();
    for (const [re, name] of BRANDS) if (re.test(U)) return name;
    let base = stripCode(desc).replace(/\*/g, ' ').replace(/\s+/g, ' ').trim();
    const toks = base.split(' ').filter((t) => !(/\d/.test(t) && t.replace(/\D/g, '').length >= 3));
    base = toks.join(' ').trim() || base;
    if (/[a-z]/.test(base)) return base;
    const stripped = base.replace(PLACE_NOISE, ' ').replace(/\b(WWW\.)?([A-Z0-9-]+)\.(COM|CO\.UK|NET|ORG)\S*/g, '$2').replace(/\s+/g, ' ').trim();
    return titleCase(stripped || base);
  }

  /* ------------------------------------------------------------------ providers */
  const ACCOUNTS = {
    hsbc: { label: 'HSBC', kind: 'Current account' },
    amex: { label: 'Amex', kind: 'Credit card' },
    revolut: { label: 'Revolut', kind: 'Spending account' },
    t212: { label: 'Trading 212', kind: 'Investments' },
  };

  function findHeader(rows, required, maxScan) {
    const lim = Math.min(rows.length, maxScan || 80);
    for (let i = 0; i < lim; i++) {
      const cells = (rows[i] || []).map(norm);
      if (required.every((r) => cells.includes(r))) return i;
    }
    return -1;
  }

  function detect(rows, fileName) {
    const name = fileName || '';
    let h;
    if ((h = findHeader(rows, ['action', 'isin', 'ticker'])) >= 0) return { provider: 't212', header: h };
    if ((h = findHeader(rows, ['date', 'description', 'amount', 'appears on your statement as'])) >= 0) return { provider: 'amex', header: h };
    if ((h = findHeader(rows, ['date', 'description', 'money in/out'])) >= 0) return { provider: 'revolut', header: h, variant: 'statement' };
    if ((h = findHeader(rows, ['date', 'description', 'money in', 'money out'])) >= 0) return { provider: 'revolut', header: h, variant: 'inout' };
    if ((h = findHeader(rows, ['type', 'started date', 'description', 'amount', 'currency'])) >= 0) return { provider: 'revolut', header: h, variant: 'classic' };
    if ((h = findHeader(rows, ['date', 'merchant/description'])) >= 0) return { provider: 'hsbc', header: h, variant: 'midata' };
    if ((h = findHeader(rows, ['date', 'description', 'amount'])) >= 0) {
      const guess = /amex|american|activity/i.test(name) ? 'amex' : /hsbc|transactionhistory/i.test(name) ? 'hsbc' : null;
      return { provider: guess, header: h, ambiguous: true };
    }
    const sample = rows.filter((r) => r.some((c) => String(c).trim() !== '')).slice(0, 12);
    if (sample.length && sample.every((r) => r.length >= 3 && parseDate(r[0]) && parseAmount(r[r.length - 1]) != null)) {
      return { provider: 'hsbc', header: -1 };
    }
    return { provider: null, header: -1 };
  }

  function cell(r, i) { return i >= 0 && i < r.length ? r[i] : ''; }

  function adaptHSBC(rows, header) {
    const out = [];
    for (let i = header + 1; i < rows.length; i++) {
      const r = (rows[i] || []).map((c) => String(c == null ? '' : c).trim());
      while (r.length && r[r.length - 1] === '') r.pop();
      if (r.length < 3) continue;
      const date = parseDate(r[0]);
      if (!date) continue;
      const parts = [r[r.length - 1]];
      let j = r.length - 2;
      while (j >= 2 && /^\d{3}(\.\d+)?$/.test(parts[0]) && /^[-(]?£?\d{1,3}$/.test(r[j])) { parts.unshift(r[j]); j--; }
      const amt = parseAmount(parts.join(','));
      if (!amt) continue;
      const desc = clean(r.slice(1, j + 1).join(','));
      out.push({ acct: 'hsbc', date, desc, amount: round2(amt.value), cur: 'GBP', code: hsbcCode(desc) });
    }
    return out;
  }

  // HSBC midata export (12 months): Date, Type, Merchant/Description, Debit/Credit, Balance
  function adaptMidata(rows, header) {
    const H = rows[header].map(norm);
    const ix = (n) => H.indexOf(n);
    const iD = ix('date'), iT = ix('type'), iDesc = ix('merchant/description');
    const iA = ix('debit/credit') >= 0 ? ix('debit/credit') : ix('amount');
    const out = [];
    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const date = parseDate(cell(r, iD));
      const amt = parseAmount(cell(r, iA));
      if (!date || !amt) continue;
      const type = clean(cell(r, iT)).toUpperCase();
      const desc = clean(cell(r, iDesc) + (type && HSBC_CODES.has(type) ? ' ' + type : ''));
      out.push({ acct: 'hsbc', date, desc, amount: round2(amt.value), cur: 'GBP', code: hsbcCode(desc) });
    }
    return out;
  }

  function adaptAmex(rows, header) {
    const H = rows[header].map(norm);
    const ix = (n) => H.indexOf(n);
    const iD = ix('date'), iDesc = ix('description'), iA = ix('amount'), iCat = ix('category'), iRef = ix('reference'), iExt = ix('extended details');
    const out = [];
    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const date = parseDate(cell(r, iD));
      const amt = parseAmount(cell(r, iA));
      if (!date || !amt) continue;
      const ext = String(cell(r, iExt) || '');
      out.push({
        acct: 'amex', date, desc: clean(cell(r, iDesc)), amount: round2(-amt.value), cur: 'GBP',
        provCat: clean(cell(r, iCat)), ref: String(cell(r, iRef) || '').replace(/'/g, '').trim() || undefined,
        foreign: /foreign spend amount/i.test(ext) || undefined,
      });
    }
    return out;
  }

  function adaptRevolut(rows, header, variant) {
    const H = rows[header].map(norm);
    const ix = (n) => H.indexOf(n);
    const out = [];
    let balance = null;
    if (variant === 'classic') {
      const iType = ix('type'), iStart = ix('started date'), iComp = ix('completed date'), iDesc = ix('description'),
        iAmt = ix('amount'), iFee = ix('fee'), iCur = ix('currency'), iState = ix('state'), iBal = ix('balance');
      for (let i = header + 1; i < rows.length; i++) {
        const r = rows[i] || [];
        const state = norm(cell(r, iState));
        if (state && !['completed', 'pending'].includes(state)) continue;
        const date = parseDate(cell(r, iComp)) || parseDate(cell(r, iStart));
        const amt = parseAmount(cell(r, iAmt));
        if (!date || !amt) continue;
        const fee = parseAmount(cell(r, iFee));
        const cur = clean(cell(r, iCur)).toUpperCase() || 'GBP';
        const bal = parseAmount(cell(r, iBal));
        out.push({ acct: 'revolut', date, desc: clean(cell(r, iDesc)), amount: round2(amt.value - (fee ? Math.abs(fee.value) : 0)),
          cur, provCat: clean(cell(r, iType)), bal: bal ? bal.value : undefined });
        if (bal && cur === 'GBP') balance = { date, value: bal.value };
      }
      return { txns: out, balance };
    }
    const iD = ix('date'), iDesc = ix('description'), iCat = ix('category'), iBal = ix('balance'), iFee = ix('fees');
    const iAmt = ix('money in/out'), iIn = ix('money in'), iOut = ix('money out');
    // Work oldest first, so each row's balance follows from the one before it.
    let body = rows.slice(header + 1);
    const dated = body.map((r) => parseDate(cell(r || [], iD))).filter(Boolean);
    if (dated.length > 1 && dated[0] > dated[dated.length - 1]) body = body.slice().reverse();
    const check = { rows: 0, breaks: 0, flipped: 0, opening: null, closing: null };
    let prevBal = null;
    for (const row of body) {
      const r = row || [];
      const date = parseDate(cell(r, iD));
      if (!date) continue;
      let amt;
      if (iAmt >= 0) amt = parseAmount(cell(r, iAmt));
      else {
        const a = parseAmount(cell(r, iIn)), b = parseAmount(cell(r, iOut));
        if (!a && !b) continue;
        amt = { value: (a ? Math.abs(a.value) : 0) - (b ? Math.abs(b.value) : 0), cur: (a && a.cur) || (b && b.cur) };
      }
      if (!amt) continue;
      const cur = amt.cur || 'GBP';
      const bal = parseAmount(cell(r, iBal));
      const desc = clean(cell(r, iDesc));
      const fee = parseAmount(cell(r, iFee));
      const feeAbs = fee ? Math.abs(round2(fee.value)) : 0;
      let value = round2(amt.value);
      // The balance says which way the money went, whatever sign the file uses.
      if (bal && value !== 0) {
        if (prevBal != null) {
          const delta = bal.value - prevBal;
          const fits = (v) => Math.abs(delta - v) < 0.006 || (feeAbs >= 0.005 && Math.abs(delta - (v - feeAbs)) < 0.006);
          if (!fits(value) && fits(-value)) { value = -value; check.flipped++; }
        } else if (value > 0 && bal.value - value < -0.005 && bal.value + value >= -0.005) { value = -value; check.flipped++; }
      }
      out.push({ acct: 'revolut', date, desc, amount: value, cur, provCat: clean(cell(r, iCat)), bal: bal ? bal.value : undefined });
      let feeRow = 0;
      if (feeAbs >= 0.005) {
        const included = bal && prevBal != null && Math.abs((bal.value - prevBal) - value) < 0.006;
        if (!included) { feeRow = -feeAbs; out.push({ acct: 'revolut', date, desc: 'Revolut fee · ' + desc, amount: feeRow, cur, provCat: 'Fees' }); }
      }
      if (bal && cur === 'GBP') {
        if (prevBal == null) check.opening = { date: addDays(date, -1), value: round2(bal.value - value - feeRow) };
        else { check.rows++; if (Math.abs(bal.value - prevBal - value - feeRow) >= 0.006) check.breaks++; }
        check.closing = { date, value: round2(bal.value) };
      }
      if (bal) { prevBal = bal.value; if (cur === 'GBP' && (!balance || date >= balance.date)) balance = { date, value: bal.value }; }
    }
    return { txns: out, balance, check: check.opening && check.closing ? check : null };
  }

  function adaptT212(rows, header) {
    const H = rows[header].map(norm);
    const ix = (n) => H.indexOf(n);
    const iA = ix('action'), iT = ix('time (utc)') >= 0 ? ix('time (utc)') : ix('time'), iTick = ix('ticker'), iName = ix('name'),
      iID = ix('id'), iTot = ix('total'), iTotCur = ix('currency (total)'), iRes = ix('result'), iSh = ix('no. of shares');
    const out = [];
    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const action = clean(cell(r, iA));
      const date = parseDate(cell(r, iT));
      if (!action || !date) continue;
      const tot = parseAmount(cell(r, iTot));
      const total = tot ? Math.abs(tot.value) : 0;
      const a = action.toLowerCase();
      let amount;
      if (a === 'deposit') amount = total;
      else if (a === 'withdrawal') amount = -total;
      else if (a.includes('dividend') || a.includes('interest') || a.includes('cashback')) amount = total;
      else if (a.includes('buy') || a.includes('card debit') || a.includes('spending')) amount = -total;
      else if (a.includes('sell')) amount = total;
      else amount = tot ? tot.value : 0;
      const ticker = clean(cell(r, iTick));
      const res = parseAmount(cell(r, iRes));
      out.push({
        acct: 't212', date, desc: action + (ticker ? ' · ' + ticker : ''), amount: round2(amount),
        cur: clean(cell(r, iTotCur)).toUpperCase() || 'GBP', action, ticker: ticker || undefined,
        name: clean(cell(r, iName)) || undefined, shares: parseFloat(cell(r, iSh)) || undefined,
        result: res ? res.value : undefined, ref: clean(cell(r, iID)) || undefined,
      });
    }
    return out;
  }

  /** Turn parsed rows into normalised transactions. */
  function adapt(provider, rows, det) {
    let txns = [];
    let balance = null;
    let check = null;
    const header = det && det.header != null ? det.header : -1;
    if (provider === 'hsbc') txns = det && det.variant === 'midata' && header >= 0 ? adaptMidata(rows, header) : adaptHSBC(rows, header);
    else if (provider === 'amex') txns = header >= 0 ? adaptAmex(rows, header) : [];
    else if (provider === 'revolut') { const r = adaptRevolut(rows, header, det && det.variant); txns = r.txns; balance = r.balance; check = r.check || null; }
    else if (provider === 't212') txns = adaptT212(rows, header);
    assignIds(txns);
    const dates = txns.map((t) => t.date).sort();
    return { provider, txns, balance, check, from: dates[0] || null, to: dates[dates.length - 1] || null };
  }

  function assignIds(txns) {
    const seen = {};
    for (const t of txns) {
      const base = t.ref
        ? [t.acct, 'ref', t.ref, t.action || '', t.date, t.amount.toFixed(2)].join('|')
        : [t.acct, t.date, t.amount.toFixed(2), t.desc.toUpperCase()].join('|');
      seen[base] = (seen[base] || 0) + 1;
      t.id = t.acct + '-' + hash(base + '#' + seen[base]);
    }
  }

  /** Merge new transactions into the existing list, skipping ones already imported. */
  function merge(existing, incoming) {
    const map = new Map(existing.map((t) => [t.id, t]));
    let added = 0;
    for (const t of incoming) {
      if (map.has(t.id)) continue;
      map.set(t.id, t);
      added++;
    }
    const all = [...map.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return { all, added, dupes: incoming.length - added };
  }

  /* ------------------------------------------------------------------ categories */
  const CATEGORIES = [
    { id: 'housing', label: 'Housing' },
    { id: 'utilities', label: 'Utilities' },
    { id: 'groceries', label: 'Groceries' },
    { id: 'eating', label: 'Eating out' },
    { id: 'transport', label: 'Transport' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'health', label: 'Health & care' },
    { id: 'travel', label: 'Travel' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'family', label: 'Family & friends' },
    { id: 'gifts', label: 'Gifts & giving' },
    { id: 'fees', label: 'Fees' },
    { id: 'cash', label: 'Cash' },
    { id: 'other', label: 'Other' },
  ];
  const INCOME_CATS = [
    { id: 'salary', label: 'Salary' },
    { id: 'bonus', label: 'Bonus' },
    { id: 'interest', label: 'Interest' },
    { id: 'dividends', label: 'Dividends' },
    { id: 'family-in', label: 'Family & friends' },
    { id: 'other-income', label: 'Other income' },
  ];
  const CAT_LABEL = Object.fromEntries([...CATEGORIES, ...INCOME_CATS].map((c) => [c.id, c.label]));

  const MERCHANT_RULES = [
    [/COUNCIL TAX|\bRENT\b|LANDLORD|LETTINGS|MORTGAGE|SERVICE CHARGE|GROUND RENT/, 'housing'],
    [/OCTOPUS|BRITISH GAS|\bEDF\b|E\.ON|EON NEXT|\bOVO\b|SCOTTISH POWER|\bSSE\b|SO ENERGY|WATER\b|VIRGIN MEDIA|\bBT GROUP\b|^BT\b|SKY DIGITAL|SKY UK|TALKTALK|HYPEROPTIC|COMMUNITY FIBRE|PLUSNET|TV LICEN[CS]E|BROADBAND/, 'utilities'],
    [/NETFLIX|SPOTIFY|DISNEY|PRIME VIDEO|AMAZON PRIME|AMZNPRIME|APPLE\.COM\/BILL|APPLE SERVICES|ITUNES|YOUTUBE|AUDIBLE|NOW TV|PATREON|OPENAI|CHATGPT|ANTHROPIC|CLAUDE\.AI|MICROSOFT|ADOBE|DROPBOX|ICLOUD|VODAFONE|\bEE\b|GIFFGAFF|\bO2\b|THREE\.CO|LEBARA|PUREGYM|GYM GROUP|DAVID LLOYD|VIRGIN ACTIVE|BARRY'?S|CLASSPASS|\bF45\b|NUFFIELD|BETTER LEISURE|STRAVA|PELOTON/, 'subscriptions'],
    [/TESCO|SAINSBURY|\bASDA\b|MORRISONS|WAITROSE|\bLIDL\b|\bALDI\b|CO-OP|\bCOOP\b|M&S SIMPLY|M & S SIMPLY|MARKS ?& ?SPENCER|OCADO|WHOLE FOODS|BUDGENS|\bSPAR\b|PINGO DOCE|CARREFOUR|SUPERMARKET|GROCER/, 'groceries'],
    [/\bPRET\b|COSTA|STARBUCKS|CAFFE NERO|\bGAILS?\b|GREGGS|\bLEON\b|\bITSU\b|WASABI|WAGAMAMA|NANDO|DISHOOM|FIVE GUYS|MCDONALD|BURGER KING|\bKFC\b|SUBWAY|PIZZA|DELIVEROO|UBER ?\*?EATS|JUST ?EAT|TIME OUT MARKET|RESTAURANT|\bCAFE|CAFÉ|COFFEE|BAKERY|KITCHEN|TAVERN|\bPUB\b|\bBAR\b|BREWDOG|WETHERSPOON|HONEST BURGER|TORTILLA|CHIPOTLE|SHAKE SHACK/, 'eating'],
    [/\bTFL\b|TRANSPORT FOR LONDON|\bUBER\b|\bBOLT\b|ADDISON LEE|FREE ?NOW|TRAINLINE|NATIONAL RAIL|\bLNER\b|AVANTI|\bGWR\b|THAMESLINK|SOUTHEASTERN|ELIZABETH LINE|\bLIME\b|SANTANDER CYCLES|\bSHELL\b|\bESSO\b|TEXACO|PARKING|RINGGO|PAYBYPHONE|ZIPCAR|NATIONAL EXPRESS|HEATHROW EXPRESS|GATWICK EXPRESS/, 'transport'],
    [/BRITISH AIRWAYS|EASYJET|RYANAIR|\bWIZZ|\bJET2|VIRGIN ATLANTIC|EMIRATES|QATAR AIR|ROYAL JORDANIAN|TURKISH AIR|LUFTHANSA|\bKLM\b|AIR FRANCE|BOOKING\.COM|AIRBNB|EXPEDIA|HOTELS\.COM|\bHOTEL|MARRIOTT|HILTON|PREMIER INN|TRAVELODGE|EUROSTAR|SKYSCANNER|TRIP\.COM/, 'travel'],
    [/ODEON|\bVUE\b|CINEWORLD|PICTUREHOUSE|EVERYMAN|TICKETMASTER|SEE ?TICKETS|EVENTIM|DICE\.FM|THEATRE|MUSEUM|\bSTEAM\b|PLAYSTATION|\bXBOX\b|NINTENDO|GALLERY|CONCERT|FESTIVAL/, 'entertainment'],
    [/\bBOOTS\b|SUPERDRUG|PHARMACY|CHEMIST|DENTAL|DENTIST|OPTICIAN|SPECSAVERS|VISION EXPRESS|BARBER|\bHAIR|SALON|PHYSIO|CLINIC|\bBUPA\b/, 'health'],
    [/AMAZON|\bAMZN|\bEBAY\b|ARGOS|JOHN LEWIS|UNIQLO|\bZARA\b|\bH ?& ?M\b|\bNEXT\b|PRIMARK|\bASOS\b|SELFRIDGES|LIBERTY|\bIKEA\b|HABITAT|APPLE STORE|CURRYS|SCREWFIX|\bB ?& ?Q\b|WICKES|TK ?MAXX|GYMSHARK|\bNIKE\b|ADIDAS|JD SPORTS|SPORTS DIRECT|DECATHLON|WATERSTONES|WHSMITH|\bMUJI\b|\bCOS\b|ARKET|MR PORTER|FARFETCH|\bETSY\b|SHEIN|\bTEMU\b|ALIEXPRESS|DUNELM|BELLROY|\bHMV\b/, 'shopping'],
    [/JUSTGIVING|GOFUNDME|CHARITY|DONATION|MOONPIG|FUNKY PIGEON|CARD FACTORY|INTERFLORA|BLOOM ?& ?WILD/, 'gifts'],
    [/\bFEES?\b|\bCHARGES?\b|INTEREST CHARGED|OVERDRAFT|LATE PAYMENT/, 'fees'],
    [/\bATM\b|CASH WITHDRAWAL|NOTEMAC|CASHPOINT|LINK ATM/, 'cash'],
  ];

  function mapAmexCat(c) {
    const s = String(c || '').toUpperCase();
    if (!s) return null;
    if (/GROCER/.test(s)) return 'groceries';
    if (/RESTAURANT|BAR & CAF|FAST FOOD/.test(s)) return 'eating';
    if (/AIRLINE|LODGING|TRAVEL AGENC|VEHICLE RENTAL|CRUISE|TOUR/.test(s)) return 'travel';
    if (/RAIL|TAXI|COACH|TRANSPORT|FUEL|PARKING|TOLL/.test(s)) return 'transport';
    if (/PHARMAC|HEALTH|MEDICAL|DENTAL|OPTIC|BEAUTY|HAIR/.test(s)) return 'health';
    if (/ENTERTAINMENT/.test(s)) return 'entertainment';
    if (/COMMUNICATION|UTILIT|CABLE/.test(s)) return 'utilities';
    if (/MERCHANDISE|GENERAL PURCHASES|RETAIL|CLOTHING|DEPARTMENT|INTERNET PURCHASE/.test(s)) return 'shopping';
    if (/FEES|ADJUSTMENT|INTEREST/.test(s)) return 'fees';
    if (/CHARIT|DONAT/.test(s)) return 'gifts';
    return null;
  }
  function mapRevolutCat(c) {
    const s = String(c || '').toLowerCase();
    if (!s) return null;
    if (/grocer/.test(s)) return 'groceries';
    if (/restaurant|cafe|café|food|drink/.test(s)) return 'eating';
    if (/transport|taxi/.test(s)) return 'transport';
    if (/travel|hotel|flight|holiday/.test(s)) return 'travel';
    if (/shopping|cloth|electronic/.test(s)) return 'shopping';
    if (/entertain|leisure/.test(s)) return 'entertainment';
    if (/health|beauty|personal care|wellness/.test(s)) return 'health';
    if (/bill|utilit/.test(s)) return 'utilities';
    if (/service|subscription/.test(s)) return 'subscriptions';
    if (/cash|atm/.test(s)) return 'cash';
    if (/fee/.test(s)) return 'fees';
    if (/gift|charit/.test(s)) return 'gifts';
    return null;
  }
  function merchantCategory(desc) {
    const D = stripCode(desc).toUpperCase();
    for (const [re, cat] of MERCHANT_RULES) if (re.test(D)) return cat;
    return null;
  }

  /* ------------------------------------------------------------------ settings */
  const CHECK_ACCTS = ['hsbc', 'amex', 'revolut'];
  function defaultSettings() {
    return {
      myNames: [], sisterNames: [], employerNames: [],
      sisterPays: [],          // payees whose bills you pay for your sister (rent, council tax, utilities…)
      sisterSmall: 200,        // suggestion only: transfers between you below this are suggested as ordinary spending / income
      sisterStart: 0,          // what she owed you when your data starts (negative if you owed her)
      pay: {},                 // { takeHome }: your normal monthly take-home pay, typed from a payslip
      billOverrides: {}, budgets: {},
      balances: { t212: [], pension: [] },
      checks: { hsbc: [], amex: [], revolut: [] },   // balances from your statements, to check the imported data against
      other: [],               // other money you add by hand for net worth: { id, name, value, locked, date }
      rules: [], edits: {},
    };
  }
  function withDefaults(s) {
    const d = defaultSettings();
    const out = Object.assign(d, s || {});
    out.balances = Object.assign({ t212: [], pension: [] }, out.balances || {});
    for (const k of ['myNames', 'sisterNames', 'employerNames', 'sisterPays', 'rules']) if (!Array.isArray(out[k])) out[k] = d[k];
    for (const k of ['billOverrides', 'budgets', 'edits', 'pay', 'checks']) if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {};
    for (const a of CHECK_ACCTS) {
      out.checks[a] = (Array.isArray(out.checks[a]) ? out.checks[a] : [])
        .filter((p) => p && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(Number(p.value)))
        .map((p) => (p.auto ? { date: p.date, value: Number(p.value), auto: true } : { date: p.date, value: Number(p.value) }));
    }
    out.other = (Array.isArray(out.other) ? out.other : [])
      .filter((o) => o && String(o.name || '').trim() && Number.isFinite(Number(o.value)))
      .map((o, i) => ({ id: String(o.id || 'o' + i), name: String(o.name).trim().slice(0, 60), value: round2(Number(o.value)), locked: !!o.locked, date: /^\d{4}-\d{2}-\d{2}$/.test(o.date || '') ? o.date : null }));
    // Earlier versions kept salary, tax and pension settings and savings goals. Only the typed take-home is used now.
    out.pay = Number(out.pay.takeHome) > 0 ? { takeHome: Number(out.pay.takeHome) } : {};
    delete out.goals;
    out.sisterSmall = Number.isFinite(Number(out.sisterSmall)) && String(out.sisterSmall) !== '' ? Number(out.sisterSmall) : 200;
    out.sisterStart = Number(out.sisterStart) || 0;
    return out;
  }

  // People's names match as whole words, so "M SMITH" never matches inside "HM SMITH".
  // Payees (prefix = true) only need to start at a word: "OVO" matches "OVO ENERGY" and "OVOENERGY" but not "NOVOTEL".
  const nameReCache = new Map();
  function nameRe(n, prefix) {
    const name = String(n).trim().toUpperCase();
    const key = (prefix ? 'p:' : 'w:') + name;
    let re = nameReCache.get(key);
    if (!re) {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      re = new RegExp('(^|[^A-Z0-9])' + esc + (prefix ? '' : '($|[^A-Z0-9])'));
      nameReCache.set(key, re);
    }
    return re;
  }
  const nameMatches = (text, name, prefix) => !!name && String(name).trim().length >= 3 && nameRe(name, prefix).test(String(text).toUpperCase());
  const hasAny = (D, names) => (names || []).some((n) => nameMatches(D, n));
  const hasPayee = (D, list) => (list || []).some((p) => nameMatches(D, p, true));

  /* ------------------------------------------------------------------ classification */
  // kind: spend | income | transfer | sister | onbehalf | trade | unknown | foreign | ignore
  //   onbehalf = a bill you paid for your sister: not your spending
  //   sister   = money settling up with her for those bills: not your income or spending
  function buildContext(txns, s) {
    // Salary heuristic when no employer text has been set: large inflows that repeat across months on HSBC/Revolut.
    const groups = {};
    for (const t of txns) {
      if (t.amount < 400 || (t.acct !== 'hsbc' && t.acct !== 'revolut')) continue;
      const D = t.desc.toUpperCase();
      if (/REVOLUT|AMERICAN EXP|AMEX|TRADING ?212|CASH|PAID IN|DEPOSIT|INTEREST/.test(D)) continue;
      if (hasAny(D, s.myNames) || hasAny(D, s.sisterNames)) continue;
      const k = merchantKey(t.desc);
      (groups[k] = groups[k] || []).push(t);
    }
    const salaryKeys = new Set();
    for (const [k, list] of Object.entries(groups)) {
      const months = new Set(list.map((t) => monthOf(t.date)));
      if (months.size >= 2 && list.length <= months.size * 2) salaryKeys.add(k);
    }
    return { salaryKeys };
  }

  function builtIn(t, s, ctx) {
    const D = t.desc.toUpperCase();
    const a = t.amount;
    const own = hasAny(D, s.myNames);
    const sis = hasAny(D, s.sisterNames);
    if (t.acct === 't212') {
      const act = (t.action || '').toLowerCase();
      if (act === 'deposit' || act === 'withdrawal') return { kind: 'transfer', sub: 'invest' };
      if (act.includes('dividend')) return { kind: 'income', cat: 'dividends' };
      if (act.includes('interest')) return { kind: 'income', cat: 'interest' };
      if (act.includes('cashback')) return { kind: 'income', cat: 'other-income' };
      if (act.includes('card debit') || act.includes('spending')) return { kind: 'spend' };
      return { kind: 'trade' };
    }
    if (t.cur && t.cur !== 'GBP') return { kind: 'foreign', review: 'foreign' };
    if (hasPayee(D, s.sisterPays)) return { kind: 'onbehalf' };
    if (sis) {
      // A suggestion from the size of the transfer. It stays in Review until you confirm or change it.
      if (Math.abs(a) >= (Number(s.sisterSmall) || 0)) return { kind: 'sister', review: 'sister' };
      return a < 0 ? { kind: 'spend', cat: 'family', review: 'sister' } : { kind: 'income', cat: 'family-in', review: 'sister' };
    }
    if (t.acct === 'amex') {
      if (a > 0 && /PAYMENT RECEIVED|THANK YOU|PAYMENT - |DIRECT DEBIT PAYMENT/.test(D)) return { kind: 'transfer', sub: 'card' };
      if (a < 0 && /REVOLUT/.test(D)) return { kind: 'transfer', sub: 'topup' };
      return { kind: 'spend' };
    }
    if (t.acct === 'hsbc') {
      if (/AMERICAN EXP|\bAMEX\b/.test(D)) return { kind: 'transfer', sub: 'card' };
      if (/TRADING ?212/.test(D)) return { kind: 'transfer', sub: 'invest' };
      if (/REVOLUT/.test(D) || own) return { kind: 'transfer', sub: 'topup' };
      if (a > 0) {
        if (hasAny(D, s.employerNames)) return { kind: 'income', cat: 'salary' };
        if (/INTEREST/.test(D)) return { kind: 'income', cat: 'interest' };
        if (/\bCASH\b|PAID IN|COUNTER CREDIT|\bCDM\b|DEPOSIT/.test(D)) return { kind: 'unknown', review: 'cash' };
        if (/REFUND/.test(D) || t.code === 'VIS' || t.code === ')))') return { kind: 'spend', refund: true };
        if (/HMRC|TAX REFUND|CASHBACK/.test(D)) return { kind: 'income', cat: 'other-income' };
        if (!(s.employerNames || []).length && ctx.salaryKeys.has(merchantKey(t.desc))) return { kind: 'income', cat: 'salary', guessed: true };
        return { kind: 'unknown', review: 'money-in' };
      }
      return { kind: 'spend' };
    }
    if (t.acct === 'revolut') {
      if (/TOP ?UP/i.test(t.provCat || '') || /TOP-?UP/.test(D)) return { kind: 'transfer', sub: 'topup' };
      if (/^EXCHANGED? (TO|FROM)|^EXCHANGE\b/.test(D)) return { kind: 'transfer', sub: 'fx', review: 'fx' };
      if (/SAVINGS|\bVAULT\b|\bPOCKET\b/.test(D) && /^(TO|FROM)\b|VAULT|POCKET/.test(D)) return { kind: 'transfer', sub: 'vault' };
      if (own || /\bHSBC\b/.test(D)) return { kind: 'transfer', sub: 'topup' };
      if (/AMERICAN EXPRESS|\bAMEX\b/.test(D)) return { kind: 'transfer', sub: 'card' };
      if (/TRADING ?212/.test(D)) return { kind: 'transfer', sub: 'invest' };
      if (a > 0) {
        if (hasAny(D, s.employerNames)) return { kind: 'income', cat: 'salary' };
        if (/INTEREST/.test(D)) return { kind: 'income', cat: 'interest' };
        if (/CASHBACK|REWARD/.test(D)) return { kind: 'income', cat: 'other-income' };
        if (/REFUND/.test(D) || (mapRevolutCat(t.provCat) && !/transfer/i.test(t.provCat || ''))) return { kind: 'spend', refund: true };
        if (!(s.employerNames || []).length && ctx.salaryKeys.has(merchantKey(t.desc))) return { kind: 'income', cat: 'salary', guessed: true };
        return { kind: 'unknown', review: 'money-in' };
      }
      return { kind: 'spend' };
    }
    return { kind: a < 0 ? 'spend' : 'unknown', review: a < 0 ? undefined : 'money-in' };
  }

  function spendCategory(t) {
    const m = merchantCategory(t.desc);
    if (m) return m;
    if (t.acct === 'amex') { const c = mapAmexCat(t.provCat); if (c) return c; }
    if (t.acct === 'revolut') { const c = mapRevolutCat(t.provCat); if (c) return c; }
    return 'other';
  }

  function ruleMatches(rule, t) {
    if (!rule || !rule.match) return false;
    if (rule.acct && rule.acct !== t.acct) return false;
    if (rule.dir === 'in' && t.amount <= 0) return false;
    if (rule.dir === 'out' && t.amount >= 0) return false;
    return t.desc.toUpperCase().includes(String(rule.match).toUpperCase());
  }

  function classify(t, s, ctx) {
    const edit = (s.edits || {})[t.id] || {};
    let res = null;
    let source = 'auto';
    for (let i = (s.rules || []).length - 1; i >= 0; i--) {
      const r = s.rules[i];
      if (ruleMatches(r, t)) { res = { kind: r.kind, cat: r.cat }; source = 'rule'; break; }
    }
    if (!res) res = builtIn(t, s, ctx);
    if (edit.kind) { res = { kind: edit.kind, cat: edit.cat }; source = 'edit'; }
    else if (edit.cat && (res.kind === 'spend' || res.kind === 'income')) { res = Object.assign({}, res, { cat: edit.cat }); source = 'edit'; }
    const out = { kind: res.kind, cat: res.cat || null, sub: res.sub || null, source, guessed: !!res.guessed };
    if (out.kind === 'spend' && !out.cat) out.cat = spendCategory(t);
    if (out.kind === 'income' && !out.cat) out.cat = 'other-income';
    // review flags, cleared once the person has decided (edit or rule)
    if (source === 'auto') {
      if (res.review) out.review = res.review;
      else if (out.kind === 'spend' && out.cat === 'other' && Math.abs(t.amount) >= 1) out.review = 'category';
    }
    return out;
  }

  /* ------------------------------------------------------------------ pay */
  /** Your normal monthly take-home pay, as typed in Settings. */
  function expectedPay(s) {
    const v = Number(((s && s.pay) || {}).takeHome) || 0;
    return v > 0 ? { amount: round2(v), source: 'yours' } : null;
  }

  /* ------------------------------------------------------------------ balance checks */
  /** Balances read from a Revolut statement replace older automatic ones inside the same dates. */
  function mergeAutoChecks(list, check) {
    const cur = Array.isArray(list) ? list : [];
    if (!check || !check.opening || !check.closing) return cur;
    const keep = cur.filter((p) => !(p.auto && p.date >= check.opening.date && p.date <= check.closing.date));
    keep.push({ date: check.opening.date, value: check.opening.value, auto: true }, { date: check.closing.date, value: check.closing.value, auto: true });
    return keep.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  /**
   * Compares the imported transactions with balances from your statements.
   * Between two balances, the transactions in between must add up to the change.
   * A balance is as at the end of its day. Amex balances are what you owe, so they move the other way.
   */
  function checkPoints(s, a) {
    const byDate = new Map();
    for (const p of ((s.checks || {})[a] || [])) {
      const have = byDate.get(p.date);
      if (!have || !p.auto || have.auto) byDate.set(p.date, p);        // a balance you typed beats one read from a file
    }
    return [...byDate.values()].sort((x, y) => (x.date < y.date ? -1 : 1));
  }
  function balanceChecks(txns, s) {
    const out = {};
    for (const a of CHECK_ACCTS) {
      const points = checkPoints(s, a);
      const list = txns.filter((t) => t.acct === a && (t.cur || 'GBP') === 'GBP');
      const dates = list.map((t) => t.date).sort();
      const cover = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
      const sign = a === 'amex' ? -1 : 1;
      const segs = [];
      for (let i = 1; i < points.length; i++) {
        const p = points[i - 1], q = points[i];
        const inside = list.filter((t) => t.date > p.date && t.date <= q.date);
        const actual = round2(inside.reduce((x, t) => x + t.amount, 0));
        const expected = round2(sign * (q.value - p.value));
        const diff = round2(actual - expected);
        const uncovered = !cover || addDays(p.date, 1) < cover.from || q.date > cover.to;
        segs.push({ from: p.date, to: q.date, start: p.value, end: q.value, expected, actual, diff, ok: Math.abs(diff) < 0.005, count: inside.length, uncovered });
      }
      const bad = segs.filter((x) => !x.ok);
      let checkedTo = null;
      for (const x of segs) if (x.ok) checkedTo = x.to;
      out[a] = { points, segs, cover, bad: bad.length, checkedTo,
        status: !list.length ? 'nodata' : points.length < 2 ? (points.length ? 'one' : 'none') : bad.length ? 'off' : 'ok' };
    }
    return out;
  }

  /* ------------------------------------------------------------------ net worth */
  /**
   * What each stream of money is worth now.
   * A bank or card balance is the latest balance on Check plus everything imported after it, so it needs at least one balance.
   * Amex is money you owe, so it counts as a minus. `avail` says whether you can get at the money today.
   */
  function netWorth(txns, s, sisterBalance, checks) {
    const streams = [];
    for (const a of CHECK_ACCTS) {
      const list = txns.filter((t) => t.acct === a && (t.cur || 'GBP') === 'GBP');
      const points = checkPoints(s, a);
      if (!list.length && !points.length) continue;
      const sign = a === 'amex' ? -1 : 1;
      const p = points[points.length - 1];
      let value = null, asOf = null;
      if (p) {
        const after = list.filter((t) => t.date > p.date);
        value = round2(sign * p.value + after.reduce((x, t) => x + t.amount, 0));
        asOf = after.reduce((d, t) => (t.date > d ? t.date : d), p.date);
      }
      streams.push({ id: a, label: ACCOUNTS[a].label, value, asOf, avail: true, warn: !!(checks && checks[a] && checks[a].status === 'off') });
    }
    const t212 = latestBalance(s.balances.t212), pension = latestBalance(s.balances.pension);
    streams.push({ id: 't212', label: 'Trading 212', value: t212 ? round2(t212.value) : null, asOf: t212 ? t212.date : null, avail: true, typed: true });
    streams.push({ id: 'pension', label: 'L&G pension', value: pension ? round2(pension.value) : null, asOf: pension ? pension.date : null, avail: false, typed: true });
    const bal = round2(Number(sisterBalance) || 0);
    if ((s.sisterNames || []).length && (s.sisterPays || []).length && Math.abs(bal) >= 0.005) {
      // Money she owes you isn't in your accounts yet. Money of hers you're holding is in your accounts but isn't yours.
      streams.push({ id: 'sister', label: bal > 0 ? 'Owed by your sister' : 'Held for your sister', value: bal, asOf: null, avail: bal < 0 });
    }
    for (const o of (s.other || [])) streams.push({ id: 'other:' + o.id, label: o.name, value: o.value, asOf: o.date, avail: !o.locked, other: true });
    return { streams };
  }
  /** Adds up the streams that are switched on. Streams with no value yet are listed as missing, not counted as zero. */
  function netTotal(streams, offIds) {
    const off = new Set(offIds || []);
    const on = streams.filter((x) => !off.has(x.id));
    const known = on.filter((x) => x.value != null);
    const sum = (l) => round2(l.reduce((a, x) => a + x.value, 0));
    return { total: sum(known), available: sum(known.filter((x) => x.avail)), locked: sum(known.filter((x) => !x.avail)),
      included: on.length, of: streams.length, missing: on.filter((x) => x.value == null) };
  }

  /* ------------------------------------------------------------------ the shared data file */
  function packData(txns, settings, meta, savedAt) {
    return { app: 'finances', kind: 'data', version: 3, saved: savedAt || new Date().toISOString(), settings, txns, meta };
  }
  /** Checks a data file or full backup and returns its contents, or throws with a plain reason. */
  function readData(obj) {
    if (!obj || obj.app !== 'finances') throw new Error('This isn’t a Finances file.');
    if (obj.kind === 'setup') throw new Error('That’s a setup file. Restore it in Settings on the laptop.');
    if (!obj.settings || !Array.isArray(obj.txns)) throw new Error('This file has settings only, with no transactions. Pick the data file.');
    for (const t of obj.txns) {
      if (!t || typeof t.id !== 'string' || typeof t.date !== 'string' || typeof t.amount !== 'number' || typeof t.desc !== 'string') throw new Error('This file is damaged. Save it again from the laptop.');
    }
    return { settings: withDefaults(obj.settings), txns: obj.txns, meta: Object.assign({ imports: [], demo: false }, obj.meta || {}), saved: obj.saved || obj.exported || null };
  }

  /* ------------------------------------------------------------------ analysis */
  /** Running balance with your sister: what she owes you for the bills you've paid for her. */
  function sisterLedger(txns, s, months) {
    const byMonth = {};
    for (const m of months) byMonth[m] = { paid: 0, repaid: 0, sent: 0, smallOut: 0, smallIn: 0, balance: 0, items: [], moves: [] };
    for (const t of txns) {
      const b = byMonth[monthOf(t.date)];
      if (!b) continue;
      if (t.kind === 'onbehalf') { b.paid += -t.amount; b.items.push(t); }
      else if (t.kind === 'sister') { if (t.amount > 0) b.repaid += t.amount; else b.sent += -t.amount; b.moves.push(t); }
      else if (t.kind === 'spend' && t.cat === 'family' && hasAny(t.desc.toUpperCase(), s.sisterNames)) b.smallOut += -t.amount;
      else if (t.kind === 'income' && t.cat === 'family-in' && hasAny(t.desc.toUpperCase(), s.sisterNames)) b.smallIn += t.amount;
    }
    let bal = Number(s.sisterStart) || 0;
    for (const m of months) {
      const b = byMonth[m];
      for (const k of ['paid', 'repaid', 'sent', 'smallOut', 'smallIn']) b[k] = round2(b[k]);
      bal = round2(bal + b.paid + b.sent - b.repaid);
      b.balance = bal;
      b.items.sort((x, y) => (x.date < y.date ? -1 : 1));
      b.moves.sort((x, y) => (x.date < y.date ? -1 : 1));
    }
    const repays = txns.filter((t) => t.kind === 'sister' && t.amount > 0).sort((x, y) => (x.date < y.date ? 1 : -1))
      .map((t) => ({ date: t.date, amount: t.amount }));
    return { byMonth, balance: bal, repays, lastRepay: repays[0] || null };
  }

  function detectBills(txns, s, months, asOfBy) {
    const groups = {};
    for (const t of txns) {
      if (t.kind !== 'spend' || t.amount >= 0) continue;
      if (!['hsbc', 'amex', 'revolut'].includes(t.acct)) continue;
      if (t.cat === 'family') continue;
      const k = merchantKey(t.desc);
      (groups[k] = groups[k] || []).push(t);
    }
    const lastMonth = months[months.length - 1];
    const bills = [];
    for (const [key, list] of Object.entries(groups)) {
      const ov = (s.billOverrides || {})[key] || {};
      const ms = [...new Set(list.map((t) => monthOf(t.date)))].sort();
      const perMonth = list.length / ms.length;
      const amounts = list.map((t) => -t.amount);
      const mean = amounts.reduce((x, y) => x + y, 0) / amounts.length;
      const sd = Math.sqrt(amounts.reduce((x, y) => x + (y - mean) ** 2, 0) / amounts.length);
      const isDebit = list.some((t) => t.code === 'DD' || t.code === 'SO');
      const recent = ms.filter((m) => m >= addMonths(lastMonth, -3));
      const regular = (ms.length >= 2 && recent.length >= 2 && perMonth <= 1.3 && (isDebit || sd / (mean || 1) <= 0.35)) ||
        (isDebit && ms.length >= 1 && recent.length >= 1 && perMonth <= 1.3);
      if (!(regular || ov.bill) || ov.hidden) continue;
      list.sort((a, b) => (a.date < b.date ? -1 : 1));
      const last = list[list.length - 1];
      const days = list.map((t) => Number(t.date.slice(8, 10)));
      const cats = {};
      for (const t of list) cats[t.cat] = (cats[t.cat] || 0) + 1;
      bills.push({
        key, name: prettyName(last.desc), desc: last.desc, acct: last.acct, cat: Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0],
        amount: round2(median(list.slice(-3).map((t) => -t.amount))), day: Math.round(median(days)),
        first: monthOf(list[0].date), last: last.date, code: last.code || null, txns: list,
        debit: isDebit, asOf: asOfBy[last.acct] || null,
      });
    }
    bills.sort((a, b) => a.day - b.day || b.amount - a.amount);
    return bills;
  }

  function billStatus(b, month, today) {
    const inMonth = b.txns.filter((t) => monthOf(t.date) === month);
    if (b.first > month) return null;
    if (b.last < addMonths(month, -2) + '-01') return null;          // stopped a while before this month
    if (inMonth.length) {
      const paid = inMonth[inMonth.length - 1];
      return { status: 'paid', date: paid.date, amount: round2(inMonth.reduce((x, t) => x - t.amount, 0)) };
    }
    const dim = daysInMonth(month);
    const due = `${month}-${pad2(Math.min(b.day, dim))}`;
    const asOf = b.asOf && b.asOf < today ? b.asOf : today;
    if (monthOf(asOf) > month) return { status: 'missed', date: due, amount: b.amount };
    if (due > asOf) return { status: 'due', date: due, amount: b.amount, inDays: dayDiff(today, due) };
    const late = dayDiff(due, asOf);
    if (late > 3) return { status: 'overdue', date: due, amount: b.amount, late };
    return { status: 'due', date: due, amount: b.amount, inDays: dayDiff(today, due) };
  }

  function latestBalance(list) {
    if (!list || !list.length) return null;
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  }

  function analyse(rawTxns, settingsIn, opts) {
    const s = withDefaults(settingsIn);
    const today = (opts && opts.today) || todayISO();
    const ctx = buildContext(rawTxns, s);
    const txns = rawTxns.map((t) => Object.assign({}, t, classify(t, s, ctx)));
    if (!txns.length) return { empty: true, txns: [], months: [], today, settings: s, review: [], checks: balanceChecks([], s) };

    const allDates = txns.map((t) => t.date).sort();
    const months = monthRange(monthOf(allDates[0]), monthOf(allDates[allDates.length - 1]));
    const coverage = {};
    for (const t of txns) {
      const c = coverage[t.acct] || (coverage[t.acct] = { from: t.date, to: t.date, count: 0 });
      if (t.date < c.from) c.from = t.date;
      if (t.date > c.to) c.to = t.date;
      c.count++;
    }
    const asOfBy = Object.fromEntries(Object.entries(coverage).map(([k, v]) => [k, v.to]));

    for (const t of txns) if (t.kind === 'spend') t.cost = round2(-t.amount);   // positive = money you're out of pocket

    // salary: normal take-home, and any bonus on top of it
    const salary = txns.filter((t) => t.kind === 'income' && t.cat === 'salary').sort((a, b) => (a.date < b.date ? 1 : -1));
    const exp = expectedPay(s);
    const salaryDay = salary.length ? Math.round(median(salary.map((t) => Number(t.date.slice(8, 10))))) : null;
    const typical = salary.length ? round2(median(salary.slice(0, 3).map((t) => t.amount))) : null;
    const expectedSalary = exp ? exp : (typical ? { amount: typical, source: 'typical' } : null);
    if (expectedSalary) {
      for (const t of salary) {
        if (t.amount > expectedSalary.amount * 1.12) { t.salaryPart = expectedSalary.amount; t.bonusPart = round2(t.amount - expectedSalary.amount); }
      }
    }
    const salaryAcct = salary.length ? salary[0].acct : null;

    const hasT212 = txns.some((t) => t.acct === 't212');
    const byMonth = {};
    for (const m of months) byMonth[m] = { income: 0, bonus: 0, spend: 0, invested: 0, cats: {}, incomeItems: [], count: 0 };
    for (const t of txns) {
      const b = byMonth[monthOf(t.date)];
      if (!b) continue;
      b.count++;
      if (t.kind === 'income') { b.income += t.amount; b.incomeItems.push(t); if (t.bonusPart) b.bonus += t.bonusPart; }
      if (t.kind === 'spend') {
        b.spend += t.cost;
        const c = b.cats[t.cat] || (b.cats[t.cat] = { total: 0, count: 0, gross: 0 });
        c.total += t.cost; c.gross += -t.amount; c.count++;
      }
      if (t.kind === 'transfer' && t.sub === 'invest') {
        if (hasT212 ? t.acct === 't212' : t.acct !== 't212') b.invested += hasT212 ? t.amount : -t.amount;
      }
    }
    for (const m of months) {
      const b = byMonth[m];
      b.income = round2(b.income); b.bonus = round2(b.bonus); b.spend = round2(b.spend); b.invested = round2(b.invested);
      b.left = round2(b.income - b.spend);
      for (const c of Object.values(b.cats)) { c.total = round2(c.total); c.gross = round2(c.gross); }
    }

    const sister = sisterLedger(txns, s, months);
    const bills = detectBills(txns, s, months, asOfBy);

    // investments and pension
    const t212 = txns.filter((t) => t.acct === 't212');
    const pension = latestBalance(s.balances.pension);
    const inv = {
      hasData: t212.length > 0,
      contributed: round2(t212.filter((t) => t.kind === 'transfer').reduce((x, t) => x + t.amount, 0)),
      t212: latestBalance(s.balances.t212), pension,
    };

    const revBal = txns.filter((t) => t.acct === 'revolut' && t.bal != null && (t.cur || 'GBP') === 'GBP')
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

    const review = txns.filter((t) => t.review).sort((a, b) => (a.date < b.date ? 1 : -1));
    const checks = balanceChecks(txns, s);

    return { empty: false, today, txns, months, byMonth, sister, bills, coverage, asOfBy, salaryDay, salaryAcct, expectedSalary,
      inv, revolutBalance: revBal ? { date: revBal.date, value: revBal.bal } : null, review, checks, net: netWorth(txns, s, sister.balance, checks), settings: s };
  }

  /** Everything the dashboard needs for one month. */
  function monthView(model, month) {
    const b = model.byMonth[month];
    const s = model.settings;
    const prev = model.byMonth[addMonths(month, -1)];
    const series = [];
    for (let k = 5; k >= 0; k--) {
      const m = addMonths(month, -k);
      const x = model.byMonth[m];
      series.push({ month: m, income: x ? x.income : null, spend: x ? x.spend : null, left: x ? x.left : null, bonus: x ? x.bonus : null });
    }
    const today = model.today;
    const bills = model.bills.map((bl) => {
      const st = billStatus(bl, month, today);
      return st ? Object.assign({}, bl, st) : null;
    }).filter(Boolean);

    const cats = CATEGORIES.map((c) => {
      const v = b.cats[c.id] || { total: 0, count: 0, gross: 0 };
      const budget = Number(s.budgets[c.id]) || 0;
      return { id: c.id, label: c.label, total: v.total, gross: v.gross, count: v.count, budget };
    }).filter((c) => c.count || c.budget).sort((a, c) => c.total - a.total);

    // income: received (salary split from any bonus) + expected salary
    const income = [];
    for (const t of b.incomeItems.slice().sort((a, c) => (a.date < c.date ? -1 : 1))) {
      const base = { date: t.date, acct: t.acct, status: 'received' };
      if (t.cat === 'salary' && t.bonusPart) {
        income.push(Object.assign({ id: t.id, cat: 'salary', name: 'Salary', amount: t.salaryPart }, base));
        income.push(Object.assign({ id: t.id + '-bonus', cat: 'bonus', name: 'Bonus (after tax, estimated)', amount: t.bonusPart }, base));
      } else {
        const name = t.cat === 'salary' ? 'Salary' : t.cat === 'bonus' ? 'Bonus' : t.cat === 'dividends' ? (t.ticker ? 'Dividend · ' + t.ticker : 'Dividends') :
          t.cat === 'interest' ? 'Interest' : prettyName(t.desc);
        income.push(Object.assign({ id: t.id, cat: t.cat, name, amount: t.amount }, base));
      }
    }
    const groupedIncome = [];
    const small = { interest: null, dividends: null };
    for (const it of income) {
      if (it.cat === 'interest' || it.cat === 'dividends') {
        const g = small[it.cat] || (small[it.cat] = { id: 'grp-' + it.cat, cat: it.cat, name: it.cat === 'interest' ? 'Interest' : 'Dividends', amount: 0, date: it.date, acct: it.acct, status: 'received', n: 0 });
        g.amount = round2(g.amount + it.amount); g.date = it.date; g.n++;
      } else groupedIncome.push(it);
    }
    for (const g of Object.values(small)) if (g) groupedIncome.push(g);
    if (model.salaryDay && model.expectedSalary && !income.some((i) => i.cat === 'salary')) {
      const due = `${month}-${pad2(Math.min(model.salaryDay, daysInMonth(month)))}`;
      const asOf = model.asOfBy[model.salaryAcct] || today;
      if (monthOf(asOf) <= month) {
        const late = due <= asOf && dayDiff(due, asOf) > 3;
        groupedIncome.unshift({ id: 'expected-salary', cat: 'salary', name: 'Salary', amount: model.expectedSalary.amount, source: model.expectedSalary.source,
          date: due, acct: model.salaryAcct, status: late ? 'late' : 'expected' });
      }
    }

    const L = model.sister;
    const sm = L.byMonth[month];
    const sister = {
      paid: sm.paid, repaid: sm.repaid, sent: sm.sent, smallOut: sm.smallOut, smallIn: sm.smallIn,
      balanceEnd: sm.balance, balanceNow: L.balance,
      lastRepay: L.repays.find((r) => r.date <= `${month}-${pad2(daysInMonth(month))}`) || null,   // as of the end of this month
      items: sm.items, moves: sm.moves,
      series: series.map((x) => ({ month: x.month, balance: L.byMonth[x.month] ? L.byMonth[x.month].balance : null })),
      pendingCash: model.review.filter((t) => t.review === 'cash').length,
      pendingConfirm: model.review.filter((t) => t.review === 'sister').length,
    };
    // Everything that moved this month, including what isn't counted as income or spending.
    const mt = model.txns.filter((t) => monthOf(t.date) === month && t.kind !== 'trade');
    const part = (pred) => { const l = mt.filter(pred); return { total: round2(l.reduce((x, t) => x + t.amount, 0)), n: l.length }; };
    const breakdown = {
      income: part((t) => t.kind === 'income'), spend: part((t) => t.kind === 'spend'),
      forSister: part((t) => t.kind === 'onbehalf'), settle: part((t) => t.kind === 'sister'),
      transfers: part((t) => t.kind === 'transfer' && t.sub !== 'invest'), invest: part((t) => t.kind === 'transfer' && t.sub === 'invest'),
      unknown: part((t) => t.kind === 'unknown'), ignored: part((t) => t.kind === 'ignore' || t.kind === 'foreign'),
    };
    const year = month.slice(0, 4);
    const yearSum = (pred) => round2(model.txns.filter((t) => t.date.slice(0, 4) === year && pred(t)).reduce((x, t) => x + t.amount, 0));
    const investments = Object.assign({}, model.inv, {
      thisMonth: b.invested,
      dividendsYTD: yearSum((t) => t.kind === 'income' && t.cat === 'dividends'),
      interestYTD: yearSum((t) => t.acct === 't212' && t.kind === 'income' && t.cat === 'interest'),
    });
    return {
      month, income: b.income, bonus: b.bonus, spend: b.spend, left: b.left, invested: b.invested,
      prev: prev ? { income: prev.income, spend: prev.spend, left: prev.left, bonus: prev.bonus } : null,
      spentPct: b.income > 0 ? b.spend / b.income : null,
      series, bills, cats, incomeItems: groupedIncome, sister, investments, breakdown,
    };
  }

  /* ------------------------------------------------------------------ rule helpers */
  /** A short piece of the description to match future transactions on. Always a real substring of the description. */
  function suggestMatch(desc) {
    const toks = stripCode(clean(desc)).toUpperCase().split(' ').filter(Boolean);
    if (!toks.length) return '';
    const lead = toks.slice(0, 2).join(' ');
    if (/^(PAYMENT|TRANSFER) (FROM|TO)$/.test(lead) || /^(TO|FROM)$/.test(toks[0])) {
      const n = /^(TO|FROM)$/.test(toks[0]) ? 1 : 2;
      return toks.slice(0, n + Math.min(2, toks.length - n)).join(' ');
    }
    const out = [];
    for (const t of toks) {
      if (/\d/.test(t)) {
        if (!out.length) { const cut = t.split(/[*#\d]/)[0]; if (cut.length >= 3) out.push(cut); }
        break;
      }
      if (out.length && NOISE.has(t)) break;
      out.push(t);
      const len = out.join(' ').length;
      if (out.length >= 2 && len >= 5) break;
      if (out.length >= 3) break;
    }
    return out.join(' ') || toks[0];
  }

  const FinCore = {
    // parsing
    parseCSV, readXLSX, parseDate, parseAmount, detect, adapt, merge, assignIds,
    // naming
    merchantKey, prettyName, titleCase, stripCode, hsbcCode, suggestMatch,
    // model
    CATEGORIES, INCOME_CATS, CAT_LABEL, ACCOUNTS, defaultSettings, withDefaults, classify, analyse, monthView,
    // pay and people
    expectedPay, nameMatches,
    // balance checks and the shared data file
    CHECK_ACCTS, balanceChecks, mergeAutoChecks, packData, readData, netWorth, netTotal,
    // date utils
    addMonths, addDays, monthRange, monthOf, dayDiff, daysInMonth, todayISO, round2,
  };
  root.FinCore = FinCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = FinCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
