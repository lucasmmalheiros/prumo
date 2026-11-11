'use strict';
// Processo principal
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, session, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

protocol.registerSchemesAsPrivileged([{ scheme: 'prumo-model', privileges: { standard: true, supportFetchAPI: true, corsEnabled: true } }]);

const FORMAT = 'prumo';
const VERSION = 1;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

let win = null;
let key = null;
let salt = null;

const dataFile = () => path.join(app.getPath('userData'), 'prumo-dados.json');

function readRaw(file = dataFile()) {
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || parsed.format !== FORMAT) throw new Error('Arquivo de dados inválido.');
  return parsed;
}

function deriveKey(password, s) {
  return crypto.scryptSync(String(password), s, 32, SCRYPT);
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return {
    format: FORMAT, version: VERSION, encrypted: true,
    salt: salt.toString('base64'), iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'), payload: payload.toString('base64'),
  };
}

function decrypt(raw, k) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(raw.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(raw.tag, 'base64'));
  const out = Buffer.concat([decipher.update(Buffer.from(raw.payload, 'base64')), decipher.final()]);
  return JSON.parse(out.toString('utf8'));
}

function tryPassword(raw, password) {
  const s = Buffer.from(raw.salt, 'base64');
  const k = deriveKey(password, s);
  try { return { data: decrypt(raw, k), key: k, salt: s }; } catch { return null; }
}

function writeData(data) {
  const file = dataFile();
  const body = key ? encrypt(data) : { format: FORMAT, version: VERSION, encrypted: false, data };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(body));
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
  fs.renameSync(tmp, file);
  autoBackup();
}

// Backup
const AUTO_RE = /^prumo-auto-(\d{4}-\d{2}-\d{2})\.json$/;
const KEEP_DAILY = 14;
const KEEP_MONTHLY = 12;
let backupError = null;

const defaultBackupDir = () => path.join(app.getPath('userData'), 'backups');
const backupCfgFile = () => path.join(app.getPath('userData'), 'prumo-backup-config.json');
function backupCfg() {
  try { return JSON.parse(fs.readFileSync(backupCfgFile(), 'utf8')) || {}; } catch { return {}; }
}
function saveBackupCfg(cfg) { fs.writeFileSync(backupCfgFile(), JSON.stringify(cfg)); }
const backupDir = () => backupCfg().folder || defaultBackupDir();

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function listBackups(dir) {
  let names;
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names.filter((n) => AUTO_RE.test(n)).map((n) => ({ name: n, date: n.match(AUTO_RE)[1], dir })).sort((a, b) => b.date.localeCompare(a.date));
}

// Limpeza de backups
function pruneBackups(dir) {
  const list = listBackups(dir);
  const keep = new Set(list.slice(0, KEEP_DAILY).map((b) => b.name));
  const firstOfMonth = new Map();
  for (const b of [...list].reverse()) if (!firstOfMonth.has(b.date.slice(0, 7))) firstOfMonth.set(b.date.slice(0, 7), b.name);
  [...firstOfMonth.keys()].sort().reverse().slice(0, KEEP_MONTHLY).forEach((m) => keep.add(firstOfMonth.get(m)));
  for (const b of list) if (!keep.has(b.name)) fs.unlinkSync(path.join(dir, b.name));
}

function writeBackup(dir) {
  readRaw();
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `prumo-auto-${localDate()}.json`);
  fs.copyFileSync(dataFile(), target + '.tmp');
  fs.renameSync(target + '.tmp', target);
  pruneBackups(dir);
}

function autoBackup(force = false) {
  if (!fs.existsSync(dataFile())) return false;
  const dir = backupDir();
  if (!force && fs.existsSync(path.join(dir, `prumo-auto-${localDate()}.json`))) return true;
  try {
    writeBackup(dir);
    backupError = null;
    return true;
  } catch (e) {
    console.error('Backup automático falhou:', e);
    backupError = dir === defaultBackupDir() ? 'Não consegui salvar a cópia de hoje.' : 'A pasta escolhida não está disponível. A cópia de hoje ficou na pasta padrão.';
    if (dir !== defaultBackupDir()) { try { writeBackup(defaultBackupDir()); } catch {} }
    return false;
  }
}

function allBackups() {
  const seen = new Set();
  return [...listBackups(backupDir()), ...listBackups(defaultBackupDir())].filter((b) => !seen.has(b.name) && seen.add(b.name)).sort((a, b) => b.date.localeCompare(a.date));
}

function purgeBackups() {
  const cfg = backupCfg();
  for (const dir of new Set([defaultBackupDir(), cfg.folder, ...(cfg.past || [])].filter(Boolean))) {
    for (const b of listBackups(dir)) { try { fs.unlinkSync(path.join(dir, b.name)); } catch {} }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Segurança
function guard(handler) {
  return async (event, ...args) => {
    const url = event.senderFrame && event.senderFrame.url;
    if (!url || !url.startsWith('file://')) throw new Error('Origem não permitida.');
    return handler(...args);
  };
}

ipcMain.handle('store:status', guard(() => {
  const raw = readRaw();
  return { exists: !!raw, encrypted: !!(raw && raw.encrypted), unlocked: !raw || !raw.encrypted || !!key };
}));

ipcMain.handle('store:load', guard(() => {
  const raw = readRaw();
  if (!raw) return null;
  if (!raw.encrypted) return raw.data;
  if (!key) throw new Error('Dados bloqueados.');
  return decrypt(raw, key);
}));

ipcMain.handle('store:unlock', guard(async (password) => {
  const raw = readRaw();
  if (!raw || !raw.encrypted) return { ok: true };
  const res = tryPassword(raw, password);
  if (!res) { await sleep(700); return { ok: false }; }
  key = res.key; salt = res.salt;
  return { ok: true, data: res.data };
}));

ipcMain.handle('store:save', guard((data) => {
  if (!data || typeof data !== 'object') throw new Error('Dados inválidos.');
  const raw = readRaw();
  if (raw && raw.encrypted && !key) throw new Error('Dados bloqueados.');
  writeData(data);
  return true;
}));

ipcMain.handle('store:setPassword', guard(async ({ current, next, data }) => {
  const raw = readRaw();
  if (raw && raw.encrypted) {
    if (!tryPassword(raw, current)) { await sleep(700); return { ok: false, error: 'A senha atual está incorreta.' }; }
  }
  if (next) {
    if (String(next).length < 6) return { ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' };
    salt = crypto.randomBytes(16);
    key = deriveKey(next, salt);
  } else {
    key = null; salt = null;
  }
  writeData(data);
  try { fs.unlinkSync(dataFile() + '.bak'); } catch {}
  try { fs.unlinkSync(dataFile() + '.antes-da-restauracao'); } catch {}
  purgeBackups();
  autoBackup(true);
  return { ok: true };
}));

ipcMain.handle('store:lock', guard(() => { key = null; salt = null; return true; }));

ipcMain.handle('store:export', guard(async () => {
  if (!fs.existsSync(dataFile())) return { ok: false, error: 'Ainda não há dados salvos.' };
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const res = await dialog.showSaveDialog(win, {
    title: 'Salvar backup do Prumo',
    defaultPath: path.join(app.getPath('documents'), `prumo-backup-${stamp}.json`),
    filters: [{ name: 'Backup do Prumo', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false };
  fs.copyFileSync(dataFile(), res.filePath);
  return { ok: true, path: res.filePath };
}));

ipcMain.handle('store:import', guard(async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Restaurar backup do Prumo',
    properties: ['openFile'],
    filters: [{ name: 'Backup do Prumo', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false };
  let raw;
  try { raw = readRaw(res.filePaths[0]); } catch { raw = null; }
  if (!raw) return { ok: false, error: 'Esse arquivo não é um backup do Prumo.' };
  const file = dataFile();
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.antes-da-restauracao');
  fs.writeFileSync(file, JSON.stringify(raw));
  key = null; salt = null;
  return { ok: true };
}));

ipcMain.handle('store:openFolder', guard(() => shell.openPath(app.getPath('userData'))));

ipcMain.handle('backup:info', guard(() => {
  const list = allBackups();
  const cfg = backupCfg();
  return { folder: backupDir(), custom: !!cfg.folder, error: backupError, last: list[0] ? list[0].date : null, count: list.length, list: list.map((b) => ({ name: b.name, date: b.date })) };
}));

ipcMain.handle('backup:now', guard(() => {
  if (!fs.existsSync(dataFile())) return { ok: false, error: 'Ainda não há dados salvos.' };
  const ok = autoBackup(true);
  return { ok, error: ok ? null : backupError };
}));

ipcMain.handle('backup:pick', guard(async () => {
  const res = await dialog.showOpenDialog(win, { title: 'Escolher a pasta dos backups do Prumo', properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled || !res.filePaths[0]) return { ok: false };
  const folder = res.filePaths[0];
  try {
    const probe = path.join(folder, '.prumo-teste');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
  } catch { return { ok: false, error: 'Não consigo salvar nessa pasta. Escolha outra.' }; }
  const cfg = backupCfg();
  saveBackupCfg({ ...cfg, folder, past: [...new Set([...(cfg.past || []), ...(cfg.folder ? [cfg.folder] : [])])] });
  return { ok: autoBackup(true), folder, error: backupError };
}));

ipcMain.handle('backup:reset', guard(() => {
  const cfg = backupCfg();
  saveBackupCfg({ past: [...new Set([...(cfg.past || []), ...(cfg.folder ? [cfg.folder] : [])])] });
  backupError = null;
  autoBackup(true);
  return { ok: true };
}));

ipcMain.handle('backup:open', guard(() => {
  fs.mkdirSync(backupDir(), { recursive: true });
  return shell.openPath(backupDir());
}));

ipcMain.handle('backup:restore', guard((name) => {
  const b = AUTO_RE.test(String(name)) ? allBackups().find((x) => x.name === name) : null;
  if (!b) return { ok: false, error: 'Não encontrei essa cópia.' };
  let raw;
  try { raw = readRaw(path.join(b.dir, b.name)); } catch { raw = null; }
  if (!raw) return { ok: false, error: 'Essa cópia está danificada.' };
  const file = dataFile();
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.antes-da-restauracao');
  fs.writeFileSync(file, JSON.stringify(raw));
  key = null; salt = null;
  return { ok: true };
}));

ipcMain.handle('win:theme', guard((dark) => {
  if (win && process.platform === 'win32') {
    win.setTitleBarOverlay({ color: dark ? '#0b1020' : '#eef1f7', symbolColor: dark ? '#e5e7eb' : '#1f2937', height: 44 });
  }
  if (win) win.setBackgroundColor(dark ? '#0b1020' : '#eef1f7');
  return true;
}));

// Extrato
ipcMain.handle('import:pick', guard(async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Importar extrato do banco',
    properties: ['openFile'],
    filters: [{ name: 'Extrato (PDF, OFX ou CSV)', extensions: ['pdf', 'ofx', 'qfx', 'csv', 'txt'] }],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false };
  const f = res.filePaths[0];
  if (fs.statSync(f).size > 5 * 1024 * 1024) return { ok: false, error: 'Arquivo grande demais (máximo 5 MB).' };
  const buf = fs.readFileSync(f);
  if (/\.pdf$/i.test(f) || buf.subarray(0, 4).toString('latin1') === '%PDF') return { ok: true, name: path.basename(f), bytes: new Uint8Array(buf) };
  let text = buf.toString('utf8');
  if (text.includes('�')) text = buf.toString('latin1'); // muitos bancos usam Windows-1252
  return { ok: true, name: path.basename(f), text };
}));

ipcMain.handle('secretary:update', guard((cfg) => (secretary ? secretary.update(cfg || {}) : { ok: false })));
ipcMain.handle('secretary:test', guard(() => (secretary ? secretary.test() : { ok: false })));

let secretary = null;
const startHidden = process.argv.includes('--hidden');
function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1480, height: 940, minWidth: 1080, minHeight: 680,
    title: 'Prumo', show: false, backgroundColor: '#eef1f7', icon: secretary ? secretary.icon() : undefined,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#eef1f7', symbolColor: '#1f2937', height: 44 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  win.once('ready-to-show', () => { win.maximize(); if (!startHidden) win.show(); });
  // Bandeja
  let warned = false;
  win.on('close', (e) => {
    if (app.isQuitting || !secretary || !secretary.keepInTray()) return;
    e.preventDefault();
    win.hide();
    if (!warned) {
      warned = true;
      const { Notification } = require('electron');
      if (Notification.isSupported()) new Notification({ title: 'O Prumo continua aberto', body: 'Ele fica no canto da barra de tarefas para avisar das contas. Para sair, clique com o botão direito no ícone.', icon: secretary.icon() }).show();
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

Menu.setApplicationMenu(null);
// Instância única
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  // Notificações
  app.setAppUserModelId(app.isPackaged ? 'com.prumo.app' : process.execPath);
  app.whenReady().then(() => {
    autoBackup();
    // Modelo de voz
    protocol.handle('prumo-model', (req) => {
      const f = path.join(__dirname, 'models', 'vosk-pt.tar.gz');
      if (req.url !== 'prumo-model://vosk/pt.tar.gz' || !fs.existsSync(f)) return new Response('', { status: 404 });
      return new Response(fs.readFileSync(f), { headers: { 'Content-Type': 'application/gzip', 'Access-Control-Allow-Origin': '*' } });
    });
    // Permissões
    const fromApp = (url) => String(url || '').startsWith('file://');
    session.defaultSession.setPermissionRequestHandler((wc, permission, done, details) => {
      const types = details.mediaTypes || [];
      done(permission === 'media' && fromApp(details.requestingUrl) && types.length > 0 && types.every((t) => t === 'audio'));
    });
    session.defaultSession.setPermissionCheckHandler((wc, permission, origin) => permission === 'media' && fromApp(origin));
    secretary = require('./secretary').setup({ showWindow });
    createWindow();
  });
}
app.on('before-quit', () => { app.isQuitting = true; });
app.on('window-all-closed', () => app.quit());
