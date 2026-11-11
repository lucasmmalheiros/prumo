'use strict';
// Ponte do celular
(function () {
  const Cap = window.Capacitor;
  const call = (plugin, method, opts = {}) => Cap.nativePromise(plugin, method, opts);
  const FORMAT = 'prumo', VERSION = 1, DIR = 'DATA', CACHE = 'CACHE';
  const FILE = 'prumo-dados.json', BACKUPS = 'backups';
  const SCRYPT = { N: 1 << 15, r: 8, p: 1 };
  const KEEP_DAILY = 14, KEEP_MONTHLY = 12;
  const AUTO_RE = /^prumo-auto-(\d{4}-\d{2}-\d{2})\.json$/;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Bancos
  const BANK_APPS = {
    nubank: ['com.nu.production'], itau: ['com.itau'], bradesco: ['com.bradesco'], bb: ['br.com.bb.android'],
    caixa: ['br.com.gabba.Caixa', 'br.gov.caixa.tem'], santander: ['com.santander.app'], inter: ['br.com.intermedium'],
    c6: ['com.c6bank.app'], btg: ['com.btg.pactual.banking'], xp: ['br.com.xp.carteira'], picpay: ['com.picpay'],
    mercadopago: ['com.mercadopago.wallet'], pagbank: ['br.com.uol.ps.myaccount'], neon: ['br.com.neon'],
    sicredi: ['br.com.sicredimobi.smart', 'br.com.sicredi.app'],
  };

  let key = null, salt = null, backupError = null;

  // Arquivos
  const fs = {
    exists: (path) => call('Filesystem', 'stat', { path, directory: DIR }).then(() => true, () => false),
    read: (path) => call('Filesystem', 'readFile', { path, directory: DIR, encoding: 'utf8' }).then((r) => r.data),
    write: (path, data) => call('Filesystem', 'writeFile', { path, data, directory: DIR, encoding: 'utf8', recursive: true }),
    remove: (path) => call('Filesystem', 'deleteFile', { path, directory: DIR }).catch(() => {}),
    list: (path) => call('Filesystem', 'readdir', { path, directory: DIR }).then((r) => r.files.map((f) => f.name || f), () => []),
    rename: (from, to) => call('Filesystem', 'rename', { from, to, directory: DIR, toDirectory: DIR }),
  };

  function parseRaw(text) {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.format !== FORMAT) throw new Error('Arquivo de dados inválido.');
    return parsed;
  }
  async function readRaw(path = FILE) {
    if (!(await fs.exists(path))) return null;
    return parseRaw(await fs.read(path));
  }

  // Criptografia
  const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  const deriveKey = async (password, s) => {
    const raw = await window.scrypt.scrypt(new TextEncoder().encode(String(password)), s, SCRYPT.N, SCRYPT.r, SCRYPT.p, 32);
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  };
  async function encrypt(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const out = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
    return { format: FORMAT, version: VERSION, encrypted: true, salt: b64(salt), iv: b64(iv), tag: b64(out.subarray(out.length - 16)), payload: b64(out.subarray(0, out.length - 16)) };
  }
  async function decrypt(raw, k) {
    const payload = unb64(raw.payload), tag = unb64(raw.tag);
    const joined = new Uint8Array(payload.length + tag.length);
    joined.set(payload); joined.set(tag, payload.length);
    const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(raw.iv) }, k, joined);
    return JSON.parse(new TextDecoder().decode(out));
  }
  async function tryPassword(raw, password) {
    const s = unb64(raw.salt);
    const k = await deriveKey(password, s);
    try { return { data: await decrypt(raw, k), key: k, salt: s }; } catch { return null; }
  }

  async function writeData(data) {
    const body = key ? await encrypt(data) : { format: FORMAT, version: VERSION, encrypted: false, data };
    const text = JSON.stringify(body);
    await fs.write(`${FILE}.tmp`, text);
    if (await fs.exists(FILE)) await fs.write(`${FILE}.bak`, await fs.read(FILE));
    await fs.rename(`${FILE}.tmp`, FILE);
    await autoBackup();
  }

  // Backup
  const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  async function listBackups() {
    const names = await fs.list(BACKUPS);
    return names.filter((n) => AUTO_RE.test(n)).map((n) => ({ name: n, date: n.match(AUTO_RE)[1] })).sort((a, b) => b.date.localeCompare(a.date));
  }
  async function pruneBackups() {
    const list = await listBackups();
    const keep = new Set(list.slice(0, KEEP_DAILY).map((b) => b.name));
    const first = new Map();
    for (const b of [...list].reverse()) if (!first.has(b.date.slice(0, 7))) first.set(b.date.slice(0, 7), b.name);
    [...first.keys()].sort().reverse().slice(0, KEEP_MONTHLY).forEach((m) => keep.add(first.get(m)));
    for (const b of list) if (!keep.has(b.name)) await fs.remove(`${BACKUPS}/${b.name}`);
  }
  async function autoBackup(force = false) {
    if (!(await fs.exists(FILE))) return false;
    const target = `${BACKUPS}/prumo-auto-${localDate()}.json`;
    if (!force && await fs.exists(target)) return true;
    try {
      const text = await fs.read(FILE);
      parseRaw(text);
      await fs.write(target, text);
      await pruneBackups();
      backupError = null;
      return true;
    } catch (e) {
      console.error('Backup automático falhou:', e);
      backupError = 'Não consegui salvar a cópia de hoje.';
      return false;
    }
  }
  async function purgeBackups() { for (const b of await listBackups()) await fs.remove(`${BACKUPS}/${b.name}`); }

  // Arquivos externos
  const SHARE_ERRORS = { grande: 'Arquivo grande demais (máximo 5 MB).', arquivo: 'Envie o arquivo do extrato, em PDF, OFX ou CSV.', leitura: 'Não consegui abrir esse arquivo.' };
  function decodeText(buf) {
    const text = new TextDecoder('utf-8').decode(buf);
    return text.includes('�') ? new TextDecoder('windows-1252').decode(buf) : text; // muitos bancos usam Windows-1252
  }
  function statementFile(name, bytes) {
    const pdf = /\.pdf$/i.test(name || '') || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
    return pdf ? { ok: true, name, bytes } : { ok: true, name, text: decodeText(bytes) };
  }
  function pickFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.addEventListener('change', () => resolve(input.files[0] || null));
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }
  async function shareData(text, name) {
    const saved = await call('Filesystem', 'writeFile', { path: name, data: text, directory: CACHE, encoding: 'utf8' });
    try {
      await call('Share', 'share', { title: 'Backup do Prumo', dialogTitle: 'Enviar backup do Prumo', files: [saved.uri] });
      return { ok: true };
    } catch (e) {
      return /cancel/i.test(String(e && e.message)) ? { ok: false } : { ok: false, error: 'Não consegui abrir o envio do arquivo.' };
    }
  }
  async function cleanShared() {
    const names = await call('Filesystem', 'readdir', { path: '', directory: CACHE }).then((r) => r.files.map((f) => f.name || f), () => []);
    for (const n of names) if (/^prumo-backup-.*\.json$/.test(n)) await call('Filesystem', 'deleteFile', { path: n, directory: CACHE }).catch(() => {});
  }

  // Avisos de vencimento
  const NOTIF_BASE = 7000, NOTIF_DAYS = 14;
  let lastCfg = null, notifTimer = null;
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  async function allowed(ask) {
    try {
      let p = await call('LocalNotifications', 'checkPermissions');
      if (p.display !== 'granted' && ask) p = await call('LocalNotifications', 'requestPermissions');
      return p.display === 'granted';
    } catch { return false; }
  }
  function summary(items, generic, today) {
    const late = items.filter((i) => i.date < today), now = items.filter((i) => i.date === today), soon = items.filter((i) => i.date > today);
    const groups = [[late, 'atrasada(s)'], [now, 'para hoje'], [soon, 'em breve']].filter(([g]) => g.length);
    if (generic) return { title: `Prumo · ${items.length} conta(s) pedindo atenção`, body: `${groups.map(([g, l]) => `${g.length} ${l}`).join(', ')}. Abra o Prumo para ver.` };
    const total = items.reduce((a, i) => a + (i.amount || 0), 0);
    return { title: `Prumo · ${items.length} conta(s) somando ${money(total)}`, body: groups.map(([g, l]) => `${l[0].toUpperCase()}${l.slice(1)}: ${g.slice(0, 3).map((i) => i.name).join(', ')}${g.length > 3 ? ' e outras' : ''}`).join('\n') };
  }
  async function schedule(cfg) {
    const ids = Array.from({ length: NOTIF_DAYS }, (_, i) => ({ id: NOTIF_BASE + i }));
    await call('LocalNotifications', 'cancel', { notifications: ids }).catch(() => {});
    if (!cfg.enabled || !(await allowed(true))) return;
    const notifications = [];
    for (let i = 0; i < NOTIF_DAYS; i++) {
      const at = new Date(); at.setDate(at.getDate() + i); at.setHours(9, 0, 0, 0);
      if (at <= new Date()) continue;
      const today = localDate(at);
      const limit = new Date(at); limit.setDate(limit.getDate() + (cfg.daysBefore || 0));
      const items = (cfg.items || []).filter((x) => x.date <= localDate(limit));
      if (items.length) notifications.push({ id: NOTIF_BASE + i, ...summary(items, cfg.generic, today), schedule: { at: at.toISOString(), allowWhileIdle: true } });
    }
    if (notifications.length) await call('LocalNotifications', 'schedule', { notifications });
  }

  window.prumo = {
    mobile: true,
    status: async () => { const raw = await readRaw(); return { exists: !!raw, encrypted: !!(raw && raw.encrypted), unlocked: !raw || !raw.encrypted || !!key }; },
    load: async () => {
      const raw = await readRaw();
      if (!raw) return null;
      if (!raw.encrypted) return raw.data;
      if (!key) throw new Error('Dados bloqueados.');
      return decrypt(raw, key);
    },
    unlock: async (password) => {
      const raw = await readRaw();
      if (!raw || !raw.encrypted) return { ok: true };
      const res = await tryPassword(raw, password);
      if (!res) { await sleep(700); return { ok: false }; }
      key = res.key; salt = res.salt;
      return { ok: true, data: res.data };
    },
    save: async (data) => {
      if (!data || typeof data !== 'object') throw new Error('Dados inválidos.');
      const raw = await readRaw();
      if (raw && raw.encrypted && !key) throw new Error('Dados bloqueados.');
      await writeData(data);
      return true;
    },
    setPassword: async ({ current, next, data }) => {
      const raw = await readRaw();
      if (raw && raw.encrypted && !(await tryPassword(raw, current))) { await sleep(700); return { ok: false, error: 'A senha atual está incorreta.' }; }
      if (next) {
        if (String(next).length < 6) return { ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' };
        salt = crypto.getRandomValues(new Uint8Array(16));
        key = await deriveKey(next, salt);
      } else { key = null; salt = null; }
      await writeData(data);
      await fs.remove(`${FILE}.bak`);
      await fs.remove(`${FILE}.antes-da-restauracao`);
      await purgeBackups();
      await autoBackup(true);
      return { ok: true };
    },
    lock: async () => { key = null; salt = null; return true; },
    exportBackup: async () => {
      if (!(await fs.exists(FILE))) return { ok: false, error: 'Ainda não há dados salvos.' };
      return shareData(await fs.read(FILE), `prumo-backup-${localDate()}.json`);
    },
    importBackup: async () => {
      const file = await pickFile();
      if (!file) return { ok: false };
      let raw;
      try { raw = parseRaw(await file.text()); } catch { raw = null; }
      if (!raw) return { ok: false, error: 'Esse arquivo não é um backup do Prumo.' };
      if (await fs.exists(FILE)) await fs.write(`${FILE}.antes-da-restauracao`, await fs.read(FILE));
      await fs.write(FILE, JSON.stringify(raw));
      key = null; salt = null;
      return { ok: true };
    },
    openFolder: async () => {},
    backupInfo: async () => {
      const list = await listBackups();
      return { folder: 'dentro do app, neste celular', custom: false, error: backupError, last: list[0] ? list[0].date : null, count: list.length, list };
    },
    backupNow: async () => {
      if (!(await fs.exists(FILE))) return { ok: false, error: 'Ainda não há dados salvos.' };
      const ok = await autoBackup(true);
      return { ok, error: ok ? null : backupError };
    },
    backupPick: async () => ({ ok: false }),
    backupReset: async () => ({ ok: true }),
    backupOpen: async () => {},
    backupRestore: async (name) => {
      const b = AUTO_RE.test(String(name)) ? (await listBackups()).find((x) => x.name === name) : null;
      if (!b) return { ok: false, error: 'Não encontrei essa cópia.' };
      let raw;
      try { raw = await readRaw(`${BACKUPS}/${b.name}`); } catch { raw = null; }
      if (!raw) return { ok: false, error: 'Essa cópia está danificada.' };
      if (await fs.exists(FILE)) await fs.write(`${FILE}.antes-da-restauracao`, await fs.read(FILE));
      await fs.write(FILE, JSON.stringify(raw));
      key = null; salt = null;
      return { ok: true };
    },
    bankReader: Cap.isPluginAvailable('BankNotifications'),
    bankStatus: () => call('BankNotifications', 'status').then((r) => r.access),
    bankOpenSettings: () => call('BankNotifications', 'openSettings'),
    bankOpenAppInfo: () => call('BankNotifications', 'openAppInfo'),
    bankSetBanks: (keys) => call('BankNotifications', 'setPackages', { packages: keys.flatMap((k) => BANK_APPS[k] || []) }),
    bankInbox: () => call('BankNotifications', 'list').then((r) => r.items.map((i) => ({ ...i, bank: Object.keys(BANK_APPS).find((k) => BANK_APPS[k].includes(i.pkg)) || null }))),
    bankAck: (ids) => call('BankNotifications', 'ack', { ids }),
    setTheme: async (dark) => {
      const splash = !!document.querySelector('#splash:not(.out)');
      await call('StatusBar', 'setBackgroundColor', { color: splash ? '#3b76f6' : dark ? '#0b1020' : '#eef1f7' }).catch(() => {});
      await call('StatusBar', 'setStyle', { style: splash || dark ? 'DARK' : 'LIGHT' }).catch(() => {});
      return true;
    },
    pickStatement: async () => {
      const file = await pickFile();
      if (!file) return { ok: false };
      if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'Arquivo grande demais (máximo 5 MB).' };
      return statementFile(file.name, new Uint8Array(await file.arrayBuffer()));
    },
    warmStart: () => call('PrumoApp', 'warmStart').then((r) => r.warm, () => false),
    onShared: (receive) => {
      const take = async () => {
        const r = await call('PrumoApp', 'takeShared');
        if (r.error) receive({ ok: false, error: SHARE_ERRORS[r.error] });
        else if (r.data) receive(statementFile(r.name, new Uint8Array(unb64(r.data))));
      };
      Cap.nativeCallback('PrumoApp', 'addListener', { eventName: 'arrived' }, take);
      take();
    },
    updateSecretary: async (cfg) => {
      lastCfg = { ...(lastCfg || {}), ...(cfg || {}) };
      clearTimeout(notifTimer);
      notifTimer = setTimeout(() => schedule(lastCfg).catch((e) => console.error(e)), 800);
      return { ok: true };
    },
    testSecretary: async () => {
      if (!(await allowed(true))) return { ok: false };
      await call('LocalNotifications', 'schedule', { notifications: [{ id: NOTIF_BASE + 99, title: 'Prumo', body: 'Os avisos das contas vão aparecer assim.' }] });
      return { ok: true };
    },
  };

  cleanShared();
  autoBackup();

  // Navegação
  document.documentElement.classList.add('is-mobile');
  const TABS = [['visao', 'Início'], ['fluxo', 'Fluxo'], ['contas', 'Contas'], ['cartoes', 'Cartões']];
  const MENU_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const $ = (q) => document.querySelector(q);

  function mountNav() {
    const tabs = document.createElement('nav');
    tabs.className = 'm-tabs';
    tabs.hidden = true;
    tabs.innerHTML = TABS.map(([page, label]) => `<button class="m-tab" data-action="nav" data-page="${page}"><b class="plumb" aria-hidden="true"><svg viewBox="0 0 8 12"><path d="M4 0v7" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="9" r="2.8" fill="currentColor"/></svg></b><i></i><span>${label}</span></button>`).join('')
      + `<button class="m-tab" id="m-more"><i>${MENU_ICON}</i><span>Mais</span></button>`;
    const scrim = document.createElement('div');
    scrim.className = 'm-scrim';
    document.body.append(scrim, tabs);

    const setDrawer = (on) => document.body.classList.toggle('m-drawer', on);
    $('#m-more').addEventListener('click', () => setDrawer(true));
    scrim.addEventListener('click', () => setDrawer(false));
    document.addEventListener('click', (e) => { if (e.target.closest('.sidebar .nav-item')) setDrawer(false); }, true);

    const sync = () => {
      const side = $('.sidebar');
      tabs.hidden = !side;
      if (!side) return;
      const active = $('.nav-item.active');
      const page = active && active.dataset.page;
      let known = false;
      tabs.querySelectorAll('.m-tab[data-page]').forEach((t) => {
        const on = t.dataset.page === page;
        known = known || on;
        t.classList.toggle('on', on);
        const slot = t.querySelector('i');
        const icon = $(`.nav-item[data-page="${t.dataset.page}"] svg`);
        if (!slot.firstChild && icon) slot.appendChild(icon.cloneNode(true));
      });
      $('#m-more').classList.toggle('on', !known);
    };
    new MutationObserver(sync).observe($('#app'), { childList: true });
    sync();

    // Botão voltar
    Cap.nativeCallback('App', 'addListener', { eventName: 'backButton' }, () => {
      const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      if (document.body.classList.contains('m-drawer')) return setDrawer(false);
      const modal = $('#modal-root');
      if ((modal && !modal.hidden) || $('.popover') || $('.cmd-dock.open:not(.inline)')) return esc();
      const home = tabs.querySelector('.m-tab[data-page="visao"]');
      if ($('.sidebar') && !home.classList.contains('on')) return home.click();
      call('App', 'minimizeApp'); // fica em segundo plano, sem recarregar ao voltar
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountNav); else mountNav();
})();
