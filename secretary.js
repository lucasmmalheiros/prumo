'use strict';
// Secretário
const { app, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const DEFAULTS = { enabled: true, tray: true, startup: false, daysBefore: 2, items: [], generic: false, notified: '' };
const file = () => path.join(app.getPath('userData'), 'prumo-lembretes.json');

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), 'utf8')) }; } catch { return { ...DEFAULTS }; }
}
function write(r) { fs.writeFileSync(file(), JSON.stringify(r)); }

const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0).replace(/ /g, ' ');

// Ícone
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function iconPNG(size = 32, foreground = false) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const SUB = 4;
  const CORNER = 0.22;
  const inSquare = (u, v) => {
    const cx = Math.min(Math.max(u, CORNER), 1 - CORNER), cy = Math.min(Math.max(v, CORNER), 1 - CORNER);
    return (u - cx) ** 2 + (v - cy) ** 2 <= CORNER ** 2;
  };
  const inP = (u, v) => {
    if (u >= 0.31 && u <= 0.45 && v >= 0.2 && v <= 0.8) return true;
    const bowlX = 0.49, bowlY = 0.39, outer = 0.19, inner = 0.065;
    if (u < bowlX) return u >= 0.31 && Math.abs(v - bowlY) <= outer && Math.abs(v - bowlY) >= inner;
    const d = Math.hypot(u - bowlX, v - bowlY);
    return d <= outer && d >= inner;
  };
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      let inside = 0, white = 0;
      for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) {
        const u = (x + (i + 0.5) / SUB) / size, v = (y + (j + 0.5) / SUB) / size;
        if (foreground) {
          const SCALE = 0.62;
          if (inP(0.5 + (u - 0.5) / SCALE, 0.5 + (v - 0.5) / SCALE)) white++;
          continue;
        }
        if (!inSquare(u, v)) continue;
        inside++;
        if (inP(u, v)) white++;
      }
      if (foreground) {
        raw.fill(255, o, o + 3);
        raw[o + 3] = Math.round((255 * white) / (SUB * SUB));
        continue;
      }
      if (!inside) continue;
      const t = (x + y) / (2 * size);
      const blue = [79 + (29 - 79) * t, 134 + (78 - 134) * t, 255 + (216 - 255) * t];
      const w = white / inside;
      raw[o] = Math.round(blue[0] + (255 - blue[0]) * w);
      raw[o + 1] = Math.round(blue[1] + (255 - blue[1]) * w);
      raw[o + 2] = Math.round(blue[2] + (255 - blue[2]) * w);
      raw[o + 3] = Math.round((255 * inside) / (SUB * SUB));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const appIcon = () => nativeImage.createFromBuffer(iconPNG(64));

// Aviso
function buildMessage(r, now = new Date()) {
  const today = ymd(now);
  const limit = ymd(addDays(now, r.daysBefore));
  const items = r.items.filter((i) => i.date <= limit);
  if (!items.length) return null;
  const groups = { late: [], today: [], soon: [] };
  items.forEach((i) => { (i.date < today ? groups.late : i.date === today ? groups.today : groups.soon).push(i); });
  const tomorrow = ymd(addDays(now, 1));
  const when = (i) => (i.date === tomorrow ? 'amanhã' : `dia ${i.date.slice(8)}`);
  if (r.generic) {
    const parts = [];
    if (groups.today.length) parts.push(`${groups.today.length} vence(m) hoje`);
    if (groups.soon.length) parts.push(`${groups.soon.length} vence(m) nos próximos dias`);
    if (groups.late.length) parts.push(`${groups.late.length} atrasada(s)`);
    return { title: `Prumo · ${items.length} conta(s) pedindo atenção`, body: parts.join(', ') + '. Abra o Prumo para ver.' };
  }
  const line = (i) => `${i.name} (${money(i.amount)})`;
  const parts = [];
  if (groups.today.length) parts.push(`Hoje: ${groups.today.map(line).join(', ')}`);
  if (groups.soon.length) parts.push(groups.soon.map((i) => `${when(i)}: ${line(i)}`).join(' · '));
  if (groups.late.length) parts.push(`Atrasadas: ${groups.late.map(line).join(', ')}`);
  const total = items.reduce((a, i) => a + (i.amount || 0), 0);
  return { title: `Prumo · ${items.length} conta(s) somando ${money(total)}`, body: parts.join('\n') };
}

function setup({ showWindow }) {
  let tray = null;

  const notify = (msg) => {
    if (!msg || !Notification.isSupported()) return false;
    const n = new Notification({ title: msg.title, body: msg.body, icon: appIcon() });
    n.on('click', showWindow);
    n.show();
    return true;
  };

  const check = (force = false) => {
    const r = read();
    if (!r.enabled && !force) return;
    const today = ymd(new Date());
    if (!force && r.notified === today) return;
    const msg = buildMessage(r);
    if (force) return notify(msg || { title: 'Prumo · tudo em dia', body: 'Nenhuma conta vencendo nos próximos dias. Os avisos estão funcionando.' });
    if (notify(msg)) { r.notified = today; write(r); }
  };

  const applyTray = (on) => {
    if (on && !tray) {
      tray = new Tray(nativeImage.createFromBuffer(iconPNG(32)));
      tray.setToolTip('Prumo');
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Abrir Prumo', click: showWindow },
        { label: 'Ver contas que vencem logo', click: () => check(true) },
        { type: 'separator' },
        { label: 'Sair do Prumo', click: () => { app.isQuitting = true; app.quit(); } },
      ]));
      tray.on('click', showWindow);
    } else if (!on && tray) { tray.destroy(); tray = null; }
  };

  const applyStartup = (on) => {
    // Abrir com o Windows
    const args = app.isPackaged ? ['--hidden'] : [app.getAppPath(), '--hidden'];
    app.setLoginItemSettings({ openAtLogin: !!on, path: process.execPath, args });
  };

  const r0 = read();
  applyTray(r0.tray);
  setTimeout(() => check(false), 15000);
  setInterval(() => check(false), 30 * 60 * 1000);

  return {
    icon: appIcon,
    keepInTray: () => read().tray,
    update(cfg) {
      const r = read();
      const items = Array.isArray(cfg.items) ? cfg.items.slice(0, 200).map((i) => ({
        date: String(i.date).slice(0, 10),
        name: cfg.generic ? '' : String(i.name || '').slice(0, 80),
        amount: cfg.generic ? 0 : Number(i.amount) || 0,
      })) : r.items;
      const next = {
        ...r,
        enabled: cfg.enabled ?? r.enabled,
        tray: cfg.tray ?? r.tray,
        startup: cfg.startup ?? r.startup,
        daysBefore: Math.min(Math.max(Number(cfg.daysBefore ?? r.daysBefore) || 0, 0), 10),
        generic: !!cfg.generic,
        items,
      };
      write(next);
      applyTray(next.tray);
      if (cfg.startup !== undefined && !!cfg.startup !== !!r.startup) applyStartup(next.startup);
      return { ok: true };
    },
    test: () => ({ ok: check(true) !== false && Notification.isSupported() }),
  };
}

module.exports = { setup, buildMessage, iconPNG };
