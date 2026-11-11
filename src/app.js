'use strict';

const api = window.prumo;
const I = window.ICONS;
const ILLU = window.ILLU;

// Utilidades
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v) => BRL.format(v || 0).replace(/ /g, ' ');
const sum = (arr, f = (x) => x.amount) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const fmtPct = (v) => `${Math.round(v)}%`;
const pad2 = (n) => String(n).padStart(2, '0');

function moneyBig(v, cls = '') {
  const neg = v < 0;
  const [int, dec] = Math.abs(v || 0).toFixed(2).split('.');
  return `<span class="money-big num ${cls} ${neg ? 'neg' : ''}"><span class="cur">${neg ? '−' : ''}R$</span><span class="int">${Number(int).toLocaleString('pt-BR')}</span><span class="dec">,${dec}</span></span>`;
}
function parseMoney(s) {
  if (typeof s === 'number') return s;
  s = String(s || '').replace(/R\$|\s/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
const moneyInput = (v) => (v || v === 0 ? Number(v).toFixed(2).replace('.', ',') : '');

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_C = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ymNow = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
function addMonths(ym, n) {
  let [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${pad2((t % 12) + 1)}`;
}
const ymParts = (ym) => ym.split('-').map(Number);
const monthName = (ym) => MESES[ymParts(ym)[1] - 1];
const monthLong = (ym) => `${monthName(ym)} ${ymParts(ym)[0]}`;
const monthShort = (ym) => `${MESES_C[ymParts(ym)[1] - 1]} ${String(ymParts(ym)[0]).slice(2)}`;
const daysIn = (ym) => { const [y, m] = ymParts(ym); return new Date(y, m, 0).getDate(); };
const clampDay = (d, ym) => Math.min(Math.max(1, d || 1), daysIn(ym));

// Categorias
const CATS = {
  moradia: { label: 'Moradia', color: '#2563eb' },
  alimentacao: { label: 'Comida e mercado', color: '#f59e0b' },
  transporte: { label: 'Mobilidade', color: '#8b5cf6' },
  saude: { label: 'Saúde', color: '#ef4444' },
  cuidados: { label: 'Cuidados pessoais', color: '#fb7185' },
  lazer: { label: 'Rolês e diversão', color: '#ec4899' },
  educacao: { label: 'Estudos', color: '#14b8a6' },
  assinaturas: { label: 'Assinaturas', color: '#6366f1' },
  compras: { label: 'Compras', color: '#0ea5e9' },
  pets: { label: 'Pets', color: '#b7791f' },
  dividas: { label: 'Dívidas e parcelas', color: '#9f1239' },
  impostos: { label: 'Impostos e taxas', color: '#475569' },
  reserva: { label: 'Reserva', color: '#16a34a' },
  outros: { label: 'Outros', color: '#94a3b8' },
  cartao: { label: 'Cartões', color: '#64748b' },
  diaadia: { label: 'Dia a dia', color: '#cbd5e1' },
};
const CUSTOM_COLORS = ['#0ea5e9', '#d946ef', '#84cc16', '#f97316', '#06b6d4', '#a855f7', '#eab308', '#10b981'];
function catInfo(k) {
  const c = CATS[k] || data?.customCats?.[k];
  return c ? { label: esc(c.label), color: c.color } : { label: CATS.outros.label, color: CATS.outros.color };
}
function catOptions(outrosLabel = 'Outros') {
  const base = Object.entries(CATS).filter(([k]) => !['cartao', 'diaadia', 'outros'].includes(k)).map(([k, v]) => [k, v.label]);
  const used = new Set(data.bills.map((b) => b.category));
  const custom = Object.entries(data.customCats || {}).filter(([k]) => used.has(k)).map(([k, v]) => [k, v.label]).sort((a, b) => a[1].localeCompare(b[1]));
  return [...base, ...custom, ['outros', outrosLabel]];
}
const TYPE_LABEL = { fixa: 'Fixa', variavel: 'Variável', cartao: 'Cartão' };
const CARD_STYLES = [['banco', 'Cor do banco'], ['grafite', 'Grafite'], ['azul', 'Azul'], ['laranja', 'Laranja'], ['roxo', 'Roxo'], ['verde', 'Verde'], ['vinho', 'Vinho']];
// Bancos
const BANKS = [
  ['nubank', 'Nubank', '#9b3ce0', '#5c0a9c', '#fff'],
  ['itau', 'Itaú', '#ff8a1a', '#e05d00', '#fff'],
  ['bradesco', 'Bradesco', '#e3173e', '#9c0222', '#fff'],
  ['bb', 'Banco do Brasil', '#fcf03a', '#f2c500', '#1a2c6b'],
  ['caixa', 'Caixa', '#1a73c4', '#003f7d', '#fff'],
  ['santander', 'Santander', '#f2262a', '#b30000', '#fff'],
  ['inter', 'Inter', '#ff8f2b', '#f06400', '#fff'],
  ['c6', 'C6 Bank', '#3a3d44', '#101114', '#fff'],
  ['btg', 'BTG Pactual', '#1b3b6f', '#081a38', '#fff'],
  ['xp', 'XP', '#2a2a2a', '#000000', '#ffd400'],
  ['picpay', 'PicPay', '#2fd36f', '#119a47', '#fff'],
  ['mercadopago', 'Mercado Pago', '#2bc4f5', '#0089c7', '#fff'],
  ['pagbank', 'PagBank', '#25b37b', '#0b7a4f', '#fff'],
  ['neon', 'Neon', '#22c4ff', '#0072e0', '#fff'],
  ['sicredi', 'Sicredi', '#5cb531', '#2f7d12', '#fff'],
  ['outro', 'Outro banco', null, null, null],
];
const bankOf = (c) => BANKS.find((b) => b[0] === c.bank);
// Selos
const BANK_MARKS = { nubank: 'nu', itau: 'itaú', bradesco: 'BR', bb: 'BB', caixa: 'CX', santander: 'ST', inter: 'in', c6: 'C6', btg: 'BTG', xp: 'XP', picpay: 'PP', mercadopago: 'MP', pagbank: 'PB', neon: 'ne', sicredi: 'SI' };
function bankMark(b) {
  const t = b && BANK_MARKS[b[0]];
  if (!t) return '';
  return `<span class="bank-mark ${t.length > 2 ? 'long' : ''}" style="color:${b[0] === 'bb' ? b[4] : b[3]}" aria-hidden="true">${t}</span>`;
}
function cardLook(c) {
  const b = bankOf(c);
  if ((c.style || 'banco') === 'banco' && b && b[2]) {
    return { cls: 'cc', style: `background:linear-gradient(135deg, ${b[2]}, ${b[3]});color:${b[4]}` };
  }
  return { cls: `cc cc-${esc(c.style === 'banco' || !c.style ? 'grafite' : c.style)}`, style: '' };
}
const catDot = (k) => `<span class="dot" style="background:${catInfo(k).color}"></span>`;

// Serviços
const SERVICES = [
  ['netflix', 'Netflix', '#e50914', '#fff', 'N'],
  ['spotify', 'Spotify', '#1ed760', '#06301a', 'S'],
  ['disney', 'Disney+', '#0e2f7c', '#fff', 'D+'],
  ['max', 'Max', '#0026e6', '#fff', 'max'],
  ['primevideo', 'Prime Video', '#00a8e1', '#fff', 'pv'],
  ['amazonprime', 'Amazon Prime', '#232f3e', '#ff9900', 'a'],
  ['globoplay', 'Globoplay', '#fb0234', '#fff', 'g'],
  ['youtube', 'YouTube Premium', '#ff0033', '#fff', 'YT'],
  ['deezer', 'Deezer', '#a238ff', '#fff', 'dz'],
  ['icloud', 'iCloud+', '#3693f3', '#fff', 'iC'],
  ['googleone', 'Google One', '#1a73e8', '#fff', 'G1'],
  ['chatgpt', 'ChatGPT', '#10a37f', '#fff', 'AI'],
  ['m365', 'Microsoft 365', '#d83b01', '#fff', 'M'],
  ['canva', 'Canva', '#7d2ae8', '#fff', 'C'],
  ['gamepass', 'Xbox Game Pass', '#107c10', '#fff', 'GP'],
  ['psplus', 'PlayStation Plus', '#0070d1', '#fff', 'PS'],
  ['crunchyroll', 'Crunchyroll', '#f47521', '#fff', 'CR'],
  ['paramount', 'Paramount+', '#0064ff', '#fff', 'P+'],
  ['duolingo', 'Duolingo', '#58cc02', '#fff', 'Du'],
  ['wellhub', 'Wellhub', '#e8304b', '#fff', 'W'],
  ['ifood', 'Clube iFood', '#ea1d2c', '#fff', 'iF'],
  ['meli', 'Meli+', '#ffe600', '#2d3277', 'M+'],
  ['uberone', 'Uber One', '#111111', '#fff', 'U1'],
  ['outro', 'Outro serviço', null, null, null],
];
const SUB_COLORS = ['#6366f1', '#0ea5e9', '#f97316', '#14b8a6', '#d946ef', '#64748b'];
const serviceOf = (s) => SERVICES.find((x) => x[0] === s.service);
function subMark(s, size = 40) {
  const sv = serviceOf(s);
  const known = sv && sv[2];
  const txt = known ? sv[4] : (s.name || '?').trim().slice(0, 2);
  return `<span class="sub-mark ${txt.length > 2 ? 'long' : ''}" style="background:${known ? sv[2] : s.color || SUB_COLORS[0]};color:${known ? sv[3] : '#fff'};width:${size}px;height:${size}px;font-size:${Math.round(size * (txt.length > 2 ? 0.3 : 0.38))}px" aria-hidden="true">${esc(txt)}</span>`;
}
const subMonthly = (s) => (s.cycle === 'anual' ? s.amount / 12 : s.amount);
const subActive = (s) => !s.paused && !(s.end && s.end < ymNow());
function subChargesIn(s, m) {
  if (s.paused || (s.start && m < s.start) || (s.end && m > s.end)) return false;
  return s.cycle !== 'anual' || ymParts(m)[1] === Number(s.month);
}
const subOnCard = (s) => s.pay !== 'conta' && data.cards.some((c) => c.id === s.pay);
function subPayLabel(s) {
  if (s.pay === 'conta') return 'Pix, boleto ou débito';
  const c = data.cards.find((x) => x.id === s.pay);
  return c ? `${c.name}${cardDigits(c)}` : 'Cartão removido';
}
function nextCharge(s) {
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  for (let i = 0; i < 14; i++) {
    const ym = addMonths(ymNow(), i);
    if (!subChargesIn(s, ym)) continue;
    const [y, mm] = ymParts(ym);
    const date = new Date(y, mm - 1, clampDay(s.day, ym));
    if (date >= today) return { date, days: Math.round((date - today) / 864e5) };
  }
  return null;
}

// Estado
let data = null;
let store = { encrypted: false };
const ui = { page: 'visao', month: ymNow(), day: null, cardIdx: 0, pop: null, popYear: null, billFilter: 'todas', view: null, housingBase: 'meu' };

// Pessoas
const PERSON_COLORS = [['#2563eb', 'Azul'], ['#f43f5e', 'Rosa'], ['#16a34a', 'Verde'], ['#f59e0b', 'Amarelo'], ['#8b5cf6', 'Roxo'], ['#0ea5e9', 'Celeste']];
const MAX_PEOPLE = 6;
const people = () => data.household.people;
const isMulti = () => people().length > 1;
const personOf = (id) => people().find((p) => p.id === id) || people()[0];
const personOptions = () => people().map((p) => [p.id, p.name]);
function currentView() {
  if (!isMulti()) return people()[0].id;
  if (ui.view === 'casa') return 'casa';
  return people().some((p) => p.id === ui.view) ? ui.view : people()[0].id;
}
const viewName = (v = currentView()) => (v === 'casa' ? 'Casa toda' : personOf(v).name);
const avatar = (p, size = 32) => `<div class="avatar" style="background:${p.color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</div>`;
const pDot = (p) => `<span class="dot" style="background:${p.color}"></span>`;
const SPLIT_LABEL = { renda: 'proporcional à renda', igual: 'em partes iguais', custom: 'por percentuais definidos' };

function sampleData() {
  const m = ymNow(), m1 = addMonths(m, 1), m2 = addMonths(m, 2), m3 = addMonths(m, 3);
  const b = (name, amount, day, category, type) => ({ id: uid(), name, amount, day, category, type });
  const nu = { id: uid(), name: 'Nubank', bank: 'nubank', last4: '4821', style: 'banco', dueDay: 5, limit: 12000, invoices: { [m]: 1350.4, [m1]: 1120, [m2]: 890.5, [m3]: 640 } };
  const c6 = { id: uid(), name: 'Black', bank: 'c6', last4: '0937', style: 'banco', dueDay: 12, limit: 4000, invoices: { [m]: 420, [m1]: 380, [m2]: 210 } };
  const sub = (service, name, amount, day, pay) => ({ id: uid(), service, name, amount, day, pay, cycle: 'mensal' });
  return {
    version: 1,
    meta: { sample: true, created: new Date().toISOString() },
    profile: { name: 'Você' },
    settings: { dailyBudget: 600, housingRef: 30 },
    incomes: [
      { id: uid(), name: 'Salário', amount: 8500, day: 5 },
      { id: uid(), name: 'Freela de design', amount: 600, day: 20, month: m },
    ],
    bills: [
      b('Aluguel', 1650, 5, 'moradia', 'fixa'),
      b('Guardar na reserva', 800, 5, 'reserva', 'fixa'),
      b('Academia', 119.9, 8, 'saude', 'fixa'),
      b('Mercado do mês', 850, 8, 'alimentacao', 'variavel'),
      b('Condomínio', 790, 10, 'moradia', 'fixa'),
      b('Plano de saúde', 420, 10, 'saude', 'fixa'),
      b('Luz', 170, 12, 'moradia', 'variavel'),
      b('Internet', 99.9, 15, 'moradia', 'fixa'),
      b('Celular', 59.9, 15, 'assinaturas', 'fixa'),
      b('Combustível', 380, 15, 'transporte', 'variavel'),
      b('Ração e banho da Mel', 160, 18, 'pets', 'variavel'),
    ],
    cards: [nu, c6],
    subs: [
      sub('netflix', 'Netflix', 44.9, 8, nu.id),
      sub('spotify', 'Spotify', 21.9, 12, nu.id),
      sub('chatgpt', 'ChatGPT', 99.9, 17, c6.id),
      sub('youtube', 'YouTube Premium', 24.9, 20, 'conta'),
      sub('icloud', 'iCloud+', 4.9, 3, 'conta'),
      { ...sub('disney', 'Disney+', 279.9, 15, nu.id), cycle: 'anual', month: ymParts(m2)[1] },
      { ...sub('duolingo', 'Duolingo', 29.9, 22, 'conta'), paused: true },
    ],
    payments: {},
    reserve: { balance: 14250, goal: 30000, history: [] },
  };
}
function emptyData(names = ['Você'], split = 'renda') {
  return normalize({
    version: 1, meta: { sample: false, created: new Date().toISOString() },
    settings: { theme: data?.settings?.theme, themePicked: data?.settings?.themePicked, housingRef: 30 },
    household: { people: names.map((n, i) => ({ id: 'p' + uid(), name: n, color: PERSON_COLORS[i % PERSON_COLORS.length][0], daily: 0 })), split, custom: {} },
    incomes: [], bills: [], cards: [], subs: [], payments: {}, reserve: { balance: 0, goal: 0, history: [] },
  });
}
function normalize(d) {
  d.meta ||= {}; d.profile ||= { name: 'Você' };
  d.settings = { housingRef: 30, ...(d.settings || {}) };
  if (d.settings.theme === 'light' && !d.settings.themePicked) delete d.settings.theme;
  d.settings.bankBanks ||= BANKS.filter((b) => b[0] !== 'outro').map((b) => b[0]);
  d.pendingBank ||= [];
  d.customCats ||= {}; d.incomes ||= []; d.bills ||= []; d.cards ||= []; d.payments ||= {}; d.settled ||= {};
  d.spending ||= {}; d.imported ||= {}; d.chat ||= []; d.goals ||= []; d.subs ||= []; d.learnedCats ||= {}; d.askedMissing ||= {};
  d.settings.secretary = { enabled: true, tray: true, startup: false, daysBefore: 2, ...(d.settings.secretary || {}) };
  d.reserve = { balance: 0, goal: 0, history: [], ...(d.reserve || {}) };
  d.cards.forEach((c) => { c.invoices ||= {}; });
  if (!d.household?.people?.length) {
    d.household = { people: [{ id: 'p1', name: d.profile.name || 'Você', color: PERSON_COLORS[0][0], daily: Number(d.settings.dailyBudget) || 0 }], split: 'renda', custom: {} };
  }
  delete d.settings.dailyBudget;
  const h = d.household;
  h.split ||= 'renda'; h.custom ||= {};
  const ids = new Set(h.people.map((p) => p.id));
  const p1 = h.people[0].id;
  d.incomes.forEach((i) => { if (!ids.has(i.owner)) i.owner = p1; });
  d.bills.forEach((b) => { if (!ids.has(b.payer)) b.payer = p1; b.scope ||= 'pessoal'; });
  d.cards.forEach((c) => { if (!ids.has(c.owner)) c.owner = p1; c.scope ||= 'pessoal'; });
  d.subs.forEach((s) => { if (!ids.has(s.payer)) s.payer = p1; s.scope ||= 'pessoal'; s.cycle ||= 'mensal'; s.pay ||= 'conta'; });
  return d;
}

// Cálculos
const invoiceOf = (c, m) => Number(c.invoices?.[m]) || 0;
const cardDigits = (c) => (c.last4 ? ` •${c.last4}` : '');
// Renda do mês. Diárias: a estimativa some nos meses que já têm as diárias reais do extrato
// (mês passado: vale o real; mês atual ou futuro: a estimativa completa o que ainda falta)
function incomeIn(i, m) {
  if (i.month) return i.month === m;
  if (i.start && m < i.start) return false;
  if (!i.daily) return true;
  const real = data.incomes.filter((x) => x.src === i.id && x.month === m);
  return !real.length || (m >= ymNow() && sum(real) < i.amount);
}
// Estimativa de diárias no mês atual: só o que ainda falta receber
const incomeAmount = (i, m) => (i.daily && !i.month ? Math.max(0, i.amount - sum(data.incomes.filter((x) => x.src === i.id && x.month === m))) : i.amount);
const incomesOf = (m, owner) => data.incomes.filter((i) => incomeIn(i, m) && (!owner || owner === 'casa' || i.owner === owner)).map((i) => (i.daily && !i.month ? { ...i, amount: incomeAmount(i, m), est: true } : i));
const isPaid = (m, id) => !!data.payments[m]?.[id];
const spendOf = (m, owner) => (data.spending[m] || []).filter((x) => !owner || owner === 'casa' || x.owner === owner);

// Conta vale no mês: só deste mês, ou fixa entre o início e o fim
const billActive = (b, m) => (b.month ? b.month === m : (!b.start || m >= b.start) && (!b.end || m <= b.end));
function billsOf(m) {
  const list = data.bills.filter((b) => billActive(b, m)).map((b) => ({ ...b, kind: 'bill' }));
  for (const c of data.cards) {
    const v = invoiceOf(c, m);
    if (v > 0) list.push({ id: 'card:' + c.id, cardId: c.id, name: 'Fatura ' + c.name + cardDigits(c), amount: v, day: c.dueDay, category: 'cartao', type: 'cartao', kind: 'card', payer: c.owner, scope: c.scope });
  }
  for (const s of data.subs) {
    if (s.pay === 'conta' && subChargesIn(s, m)) list.push({ id: 'sub:' + s.id, subId: s.id, name: s.name, amount: s.amount, day: s.day, category: 'assinaturas', type: 'fixa', kind: 'sub', payer: s.payer, scope: s.scope });
  }
  list.forEach((b) => { b.day = clampDay(b.day, m); b.paid = isPaid(m, b.id); });
  return list.sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));
}

function shares(m) {
  const ps = people(); const h = data.household; const out = {};
  const even = () => ps.forEach((p) => { out[p.id] = 1 / ps.length; });
  if (h.split === 'igual') even();
  else if (h.split === 'custom') {
    const tot = sum(ps, (p) => h.custom[p.id]);
    if (tot > 0) ps.forEach((p) => { out[p.id] = (Number(h.custom[p.id]) || 0) / tot; }); else even();
  } else {
    const inc = {}; ps.forEach((p) => { inc[p.id] = sum(incomesOf(m, p.id)); });
    const tot = sum(ps, (p) => inc[p.id]);
    if (tot > 0) ps.forEach((p) => { out[p.id] = inc[p.id] / tot; }); else even();
  }
  return out;
}

// Divisão
function division(m) {
  const house = billsOf(m).filter((b) => b.scope === 'casa');
  const total = sum(house);
  const sh = shares(m);
  const rows = people().map((p) => {
    const fair = total * sh[p.id];
    const paid = sum(house.filter((b) => b.payer === p.id));
    return { p, share: sh[p.id], fair, paid, bal: paid - fair };
  });
  const debt = rows.filter((r) => r.bal < -0.005).map((r) => ({ p: r.p, v: -r.bal }));
  const cred = rows.filter((r) => r.bal > 0.005).map((r) => ({ p: r.p, v: r.bal }));
  const transfers = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const v = Math.min(debt[i].v, cred[j].v);
    if (v >= 0.01) transfers.push({ from: debt[i].p, to: cred[j].p, amount: Math.round(v * 100) / 100 });
    debt[i].v -= v; cred[j].v -= v;
    if (debt[i].v < 0.005) i++;
    if (cred[j].v < 0.005) j++;
  }
  return { house, total, rows, transfers, shares: sh };
}

function summary(m, view = currentView()) {
  const all = billsOf(m);
  const multi = isMulti();
  const div = multi ? division(m) : null;
  let bills, personal, income, casa = 0, daily;
  if (!multi) {
    bills = personal = all; income = sum(incomesOf(m)); daily = people()[0].daily;
  } else if (view === 'casa') {
    bills = all; personal = all.filter((b) => b.scope !== 'casa');
    income = sum(incomesOf(m)); casa = div.total; daily = sum(people(), (p) => p.daily);
  } else {
    bills = all.filter((b) => b.payer === view);
    personal = bills.filter((b) => b.scope !== 'casa');
    income = sum(incomesOf(m, view)); casa = div.total * div.shares[view]; daily = personOf(view).daily;
  }
  const dailyBudget = Number(daily) || 0;
  const dailyActual = sum(spendOf(m, multi ? view : null));
  daily = Math.max(dailyBudget, dailyActual);
  const g = { fixa: 0, variavel: 0, cartao: 0 };
  personal.forEach((b) => { g[b.type] = (g[b.type] || 0) + b.amount; });
  const spent = casa + g.fixa + g.variavel + g.cartao + daily;
  return { m, view, multi, div, bills, personal, income, casa, ...g, daily, dailyBudget, dailyActual, spent, sobra: income - spent };
}

function visibleCards() {
  const v = currentView();
  if (!isMulti() || v === 'casa') return data.cards;
  return data.cards.filter((c) => c.owner === v || c.scope === 'casa');
}

function dueInfo(b, m) {
  if (b.paid) return { cls: 'ok', text: 'Paga' };
  const now = ymNow();
  if (m < now) return { cls: 'late', text: 'Atrasada' };
  if (m > now) return null;
  const diff = b.day - new Date().getDate();
  if (diff < 0) return { cls: 'late', text: 'Atrasada' };
  if (diff === 0) return { cls: 'soon', text: 'Vence hoje' };
  if (diff <= 3) return { cls: 'soon', text: diff === 1 ? 'Amanhã' : `Em ${diff} dias` };
  return null;
}
function alerts() {
  const m = ymNow();
  return summary(m).bills.map((b) => ({ b, info: dueInfo(b, m) })).filter((x) => x.info && x.info.cls !== 'ok');
}

// Persistência
let saving = Promise.resolve();
function persist() {
  const snapshot = JSON.parse(JSON.stringify(data));
  saving = saving.then(() => api.save(snapshot)).catch((e) => toast('Não consegui salvar: ' + e.message));
  return saving;
}
function commit() {
  if (lastUndo) { lastUndo = null; PrumoVoice.refreshChat(); }
  persist(); render(); syncSecretary();
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

function applyTheme() {
  const dark = (data?.settings.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  api.setTheme(dark).catch(() => {});
}
function pickTheme(theme) {
  if (theme === 'auto') { delete data.settings.theme; delete data.settings.themePicked; }
  else { data.settings.theme = theme; data.settings.themePicked = true; }
  applyTheme(); commit();
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (data?.settings.theme) return;
  applyTheme();
  if (data) render();
});

// Layout
const L = (single, multi) => (isMulti() ? multi : single);
const NAV = () => [['visao', 'Início', 'grid'], ['fluxo', 'Entradas e saídas', 'flow'], ['cartoes', 'Cartões', 'card'], ['casa', L('Minha casa', 'Nossa casa'), 'home'], ['reserva', L('Minha reserva', 'Nossa reserva'), 'safe'], ['metas', 'Metas', 'target'], ['previsor', 'Previsor', 'trend']];
const NAV2 = () => [['renda', L('Minha renda', 'Nossa renda'), 'income'], ['contas', L('Minhas contas', 'Contas da casa'), 'list'], ['config', 'Configurações', 'settings']];

function peoplePop() {
  const v = currentView();
  const it = (id, label, av) => `<button class="menu-item ${v === id ? 'on' : ''}" data-action="set-view" data-view="${id}">${av}<span style="flex:1">${esc(label)}</span>${v === id ? I.check : ''}</button>`;
  return `<div class="popover up">
    <div class="pop-label">Ver o painel de</div>
    ${people().map((p) => it(p.id, p.name, avatar(p, 24))).join('')}
    ${it('casa', 'Casa toda', `<div class="avatars">${people().slice(0, 3).map((p) => avatar(p, 20)).join('')}</div>`)}
    <div class="pop-sep"></div>
    <button class="menu-item" data-action="setup-people">${I.settings}Pessoas e divisão</button>
  </div>`;
}

function sidebar() {
  const item = ([id, label, icon]) => `<button class="nav-item ${ui.page === id ? 'active' : ''}" data-action="nav" data-page="${id}">${ui.page === id ? `<i class="plumb${ui.swing ? ' swing' : ''}" aria-hidden="true">${PLUMB_SVG}</i>` : ''}${I[icon]}<span>${label}</span></button>`;
  const multi = isMulti();
  const v = currentView();
  const me = v === 'casa' ? null : personOf(v);
  const name = me ? me.name : 'Casa toda';
  const theme = data.settings.theme || 'auto';
  const AUTO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path fill="currentColor" stroke="none" d="M12 4a8 8 0 0 1 0 16z"/></svg>';
  const security = store.encrypted ? `<span class="dot" style="background:var(--green)"></span>Protegido por senha` : `<span class="dot" style="background:#f59e0b"></span>Sem senha`;
  return `<aside class="sidebar">
    <div class="brand">${multi ? `<div class="avatars lg">${people().slice(0, 3).map((p) => avatar(p, 30)).join('')}</div>` : '<div class="brand-logo">P</div>'}<div><div class="brand-name">Prumo</div><div class="brand-sub">${multi ? `Finanças da casa · ${people().length} pessoas` : 'Finanças pessoais'}</div></div></div>
    <div class="nav-label">Seu dinheiro</div>${NAV().map(item).join('')}
    <div class="nav-label">Organizar</div>${NAV2().map(item).join('')}
    <div class="sidebar-spacer"></div>
    <div class="theme-row"><span class="lbl">${I.sun}Tema</span>
      <div class="seg"><button class="${theme === 'auto' ? 'on' : ''}" data-action="theme" data-theme="auto" title="Igual ao aparelho" aria-label="Igual ao aparelho">${AUTO_ICON}</button><button class="${theme === 'light' ? 'on' : ''}" data-action="theme" data-theme="light" title="Claro">${I.sun}</button><button class="${theme === 'dark' ? 'on' : ''}" data-action="theme" data-theme="dark" title="Escuro">${I.moon}</button></div></div>
    <div class="profile">
      ${multi ? `<button class="profile-switch" data-pop="people" title="Trocar de pessoa">` : '<div class="profile-switch">'}
        ${me ? avatar(me) : `<div class="avatars">${people().slice(0, 2).map((p) => avatar(p, 26)).join('')}</div>`}
        <div style="flex:1;min-width:0;text-align:left"><div class="profile-name">${esc(name)}</div><div class="profile-sub">${security}</div></div>
        ${multi ? I.chevD : ''}
      ${multi ? '</button>' : '</div>'}
      ${ui.pop === 'people' ? peoplePop() : ''}
      ${store.encrypted ? `<button class="icon-btn sm ghost" data-action="lock" title="Bloquear agora">${I.lock}</button>` : `<button class="icon-btn sm ghost" data-action="nav" data-page="config" title="Proteger com senha">${I.shield}</button>`}
    </div>
  </aside>`;
}

function topbar() {
  const n = alerts().length;
  const [y] = ymParts(ui.month);
  return `<div class="topbar">
    <button class="icon-btn ghost" data-action="month-prev" title="Mês anterior">${I.chevL}</button>
    <button class="icon-btn ghost" data-action="month-next" title="Próximo mês">${I.chevR}</button>
    <div style="position:relative">
      <button class="month-btn" data-pop="months"><span class="title">${monthName(ui.month)} <span class="year">${y}</span></span>${I.chevD}</button>
      ${ui.pop === 'months' ? monthsPop() : ''}
    </div>
    ${ui.month !== ymNow() ? `<button class="today-chip" data-action="month-today">Ir para o mês atual</button>` : ''}
    <div class="grow"></div>
    <div style="position:relative">
      <button class="icon-btn" data-pop="bell" title="Avisos">${I.bell}${n ? `<span class="badge">${n}</span>` : ''}</button>
      ${ui.pop === 'bell' ? bellPop() : ''}
    </div>
    <div class="split">
      <button class="btn btn-primary" data-action="add" data-kind="bill">${I.plus}Adicionar</button>
      <button class="btn btn-primary caret" data-pop="add" title="Mais opções">${I.chevD}</button>
      ${ui.pop === 'add' ? addPop() : ''}
    </div>
  </div>`;
}

// Faixa de meses
const STRIP = {
  fluxo: ['Sobra do mês', (m) => summary(m).sobra],
  cartoes: ['Total das faturas', (m) => sum(visibleCards(), (c) => invoiceOf(c, m))],
  casa: ['Custo de moradia', (m) => sum(housingFor(summary(m)).items, (x) => x.v)],
  renda: ['Renda do mês', (m) => sum(incomesOf(m, currentView()))],
  contas: ['Total de contas', (m) => sum(billsOf(m))],
};
function monthStrip() {
  const cfg = STRIP[ui.page];
  if (!cfg) return '';
  let start = ui.stripStart || addMonths(ui.month, -3);
  if (ui.month < start || ui.month > addMonths(start, 6)) start = addMonths(ui.month, -3);
  ui.stripStart = start;
  const rows = Array.from({ length: 7 }, (_, i) => { const m = addMonths(start, i); return { m, v: cfg[1](m) }; });
  const max = Math.max(...rows.map((r) => Math.abs(r.v)), 1);
  const now = ymNow();
  return `<section class="m-strip">
    <div class="m-strip-head"><span>${cfg[0]}</span><div class="cc-actions"><button class="icon-btn sm" data-action="strip-shift" data-d="-1" title="Meses anteriores">${I.chevL}</button><button class="icon-btn sm" data-action="strip-shift" data-d="1" title="Próximos meses">${I.chevR}</button></div></div>
    <div class="m-strip-row">${rows.map(({ m, v }) => `<button class="m-chip ${m === ui.month ? 'on' : ''}" data-action="set-month" data-month="${m}">
      <span class="m-name">${monthShort(m)}${m === now ? '<i></i>' : ''}</span><span class="m-val num ${v < 0 ? 'negc' : ''}">${money(v)}</span><span class="m-bar"><b class="${v < 0 ? 'neg' : ''}" style="width:${(Math.abs(v) / max) * 100}%"></b></span></button>`).join('')}</div>
  </section>`;
}

function monthsPop() {
  const y = ui.popYear || ymParts(ui.month)[0];
  return `<div class="popover left months-pop">
    <div class="months-head"><button class="icon-btn sm ghost" data-action="pop-year" data-d="-1">${I.chevL}</button><span>${y}</span><button class="icon-btn sm ghost" data-action="pop-year" data-d="1">${I.chevR}</button></div>
    <div class="months-grid">${MESES_C.map((mm, i) => { const ym = `${y}-${pad2(i + 1)}`; return `<button class="${ym === ui.month ? 'on' : ''}" data-action="set-month" data-month="${ym}">${mm}</button>`; }).join('')}</div>
  </div>`;
}
function bellPop() {
  const list = alerts();
  return `<div class="popover notif"><h4>Avisos de ${monthName(ymNow()).toLowerCase()}</h4>
    ${list.length ? list.map(({ b, info }) => `<div class="notif-item"><div><div>${esc(b.name)}</div><div class="when"><span class="tag ${info.cls}">${info.text}</span> <span class="muted">dia ${pad2(b.day)}</span></div></div><div class="num" style="font-weight:700">${money(b.amount)}</div></div>`).join('')
      : `<div class="empty-note">Nenhuma conta atrasada ou vencendo nos próximos dias.</div>`}
  </div>`;
}
function addPop() {
  const it = (kind, icon, label) => `<button class="menu-item" data-action="add" data-kind="${kind}">${I[icon]}${label}</button>`;
  return `<div class="popover">${it('bill', 'list', 'Nova conta')}${it('income', 'income', 'Nova renda')}${it('sub', 'repeat', 'Nova assinatura')}${it('card', 'card', 'Novo cartão')}${it('invoice', 'pencil', 'Lançar fatura')}${it('deposit', 'safe', 'Guardar na reserva')}<div class="pop-sep"></div><button class="menu-item" data-action="import-statement">${I.upload}Importar extrato do banco</button></div>`;
}

function sampleBanner() {
  if (!data.meta.sample) return '';
  return `<div class="banner">${I.info}<div class="grow"><b>Estes são dados de exemplo.</b> Explore à vontade e, quando quiser, comece com os seus números.</div>
    <button class="btn" data-action="sample-keep">Manter e editar</button><button class="btn btn-primary" data-action="sample-clear">Começar do zero</button></div>`;
}

// Painel
function cardSaldo(s) {
  const segs = s.multi ? [
    [s.view === 'casa' ? 'Contas da casa' : 'Sua parte da casa', s.casa, 'var(--navy)'],
    [s.view === 'casa' ? 'Contas pessoais' : 'Contas pessoais', s.fixa + s.variavel, 'var(--blue)'],
    ['Cartões pessoais', s.cartao, 'var(--sky)'],
    ['Dia a dia', s.daily, 'var(--gray-seg)'],
  ] : [
    ['Contas fixas', s.fixa, 'var(--navy)'],
    ['Variáveis', s.variavel, 'var(--blue)'],
    ['Cartões', s.cartao, 'var(--sky)'],
    ['Dia a dia', s.daily, 'var(--gray-seg)'],
  ];
  const livre = pct(s.sobra, s.income);
  let trend;
  if (!s.income) trend = `<div class="trend warn">${I.info}Cadastre sua renda</div><button class="link-btn" data-action="nav" data-page="renda">Vá em ${L('Minha renda', 'Nossa renda')} para começar</button>`;
  else if (s.sobra < 0) trend = `<div class="trend bad">${I.arrowDown}Gastos passam a renda</div><div class="label">faltam ${money(-s.sobra)} para fechar o mês</div>`;
  else trend = `<div class="trend ${livre < 10 ? 'warn' : ''}">${I.arrowUp}${fmtPct(livre)} da renda livre</div><div class="label">valor estimado após pagar todas as contas</div>`;

  const level = !s.income ? null : s.sobra < 0 ? ['fora', 'Fora do prumo'] : livre < 10 ? ['quase', 'Quase no prumo'] : ['ok', 'No prumo'];
  const plumb = level ? `<span class="plumb-tag ${level[0]}" title="${livre >= 10 ? 'Sobram 10% ou mais da renda' : 'O ideal é sobrar pelo menos 10% da renda'}"><i class="plumb-ico">${PLUMB_SVG}</i>${level[1]}</span>` : '';
  const bar = segs.filter(([, v]) => v > 0).map(([, v, c]) => `<span style="flex-grow:${v};background:${c}"></span>`).join('')
    + (s.sobra > 0 ? `<span style="flex-grow:${s.sobra};background:var(--green)"></span>` : '');
  const leg = segs.map(([l, v, c]) => `<div><div class="lab"><span class="dot" style="background:${c}"></span>${l}</div><div class="val num">− ${money(v)} <small>· ${fmtPct(pct(v, s.income))}</small></div></div>`).join('');
  return `<section class="card">
    <div class="card-head"><h3 class="card-title">Saldo previsto <span class="muted">· ${s.multi ? esc(viewName(s.view)) + ' · ' : ''}${monthLong(s.m).toLowerCase()}</span></h3>${plumb}<div class="illu">${ILLU.wallet}</div></div>
    <div class="saldo-row">${moneyBig(s.sobra, 'mb-xl')}<div class="saldo-note">${trend}</div></div>
    <div class="stack">${bar}</div>
    <div class="legend">
      <div><div class="lab">Renda do mês</div><div class="val num">${money(s.income)}<button class="icon-btn" data-action="nav" data-page="renda" title="Editar renda">${I.pencil}</button></div></div>
      ${leg}
      <div><div class="lab"><span class="dot" style="background:${s.sobra < 0 ? 'var(--red)' : 'var(--green)'}"></span><b>= Sobra</b></div><div class="val num ${s.sobra < 0 ? 'negc' : 'pos'}">${money(s.sobra)} <small>· ${fmtPct(livre)}</small></div></div>
    </div>
  </section>`;
}

// Assinaturas que já vêm dentro da fatura deste cartão
const subsInCard = (cardId, m) => sum(data.subs.filter((s) => s.pay === cardId && subChargesIn(s, m)), (s) => s.amount);
function billRow(b, m, compact = false) {
  const info = dueInfo(b, m);
  const inSubs = b.kind === 'card' && !compact ? subsInCard(b.cardId, m) : 0;
  return `<div class="bill-row ${b.paid ? 'paid' : ''}">
    <button class="check ${b.paid ? 'on' : ''}" data-action="toggle-paid" data-id="${esc(b.id)}" title="${b.paid ? 'Desmarcar' : 'Marcar como paga'}">${I.check}</button>
    <div class="name" ${b.kind === 'bill' ? `data-action="edit-bill" data-id="${esc(b.id)}" style="cursor:pointer"` : b.kind === 'sub' ? `data-action="edit-sub" data-id="${esc(b.subId)}" style="cursor:pointer"` : ''}>${esc(b.name)}${compact ? '' : `<div class="sub">dia ${pad2(b.day)} · ${catInfo(b.category).label}${isMulti() ? ` · ${b.scope === 'casa' ? 'casa' : 'pessoal'}${currentView() === 'casa' ? ` · ${pDot(personOf(b.payer))} ${esc(personOf(b.payer).name)}` : ''}` : ''}${inSubs ? ` · inclui ${money(inSubs)} em assinaturas` : ''}</div>`}</div>
    ${info && !b.paid ? `<span class="tag ${info.cls}">${info.text}</span>` : ''}
    <div class="amt num">${money(b.amount)}</div>
  </div>`;
}

function cardContas(s) {
  const m = s.m;
  const days = [...new Set(s.bills.map((b) => b.day))];
  const sel = days.includes(ui.day) ? ui.day : null;
  const shown = sel === null ? s.bills : s.bills.filter((b) => b.day === sel);
  const open = shown.filter((b) => !b.paid);
  const paidN = s.bills.filter((b) => b.paid).length;
  const chip = (d) => {
    const ofDay = s.bills.filter((b) => b.day === d);
    const done = ofDay.every((b) => b.paid);
    return `<button class="chip-day ${d === sel ? 'on' : ''} ${done && d !== sel ? 'done' : ''}" data-action="day" data-day="${d}">${pad2(d)}<span class="dots">${ofDay.slice(0, 5).map(() => '<i></i>').join('')}</span></button>`;
  };
  return `<section class="card bills-card">
    <div class="card-head"><div>
      <h3 class="card-title">Contas a pagar <span class="muted">· ${sel === null ? 'no mês' : 'dia ' + pad2(sel)}</span></h3>
      <div style="margin-top:12px">${moneyBig(sum(open), 'mb-lg')}</div>
      <div class="label" style="margin-top:8px">${open.length ? `${open.length} em aberto` : 'tudo pago'} · <b style="color:var(--text-2)">${paidN} de ${s.bills.length} pagas</b> no mês</div>
    </div><div class="illu">${ILLU.calendar}</div></div>
    ${s.bills.length ? `<div class="day-chips"><button class="chip-day all ${sel === null ? 'on' : ''}" data-action="day" data-day="">Todas</button>${days.map(chip).join('')}</div>
    <div class="bill-list" style="max-height:${sel === null ? 262 : 300}px">${shown.map((b) => billRow(b, m)).join('')}</div>`
    : `<div class="empty-note">Nenhuma conta neste mês. <br><br><button class="btn" data-action="add" data-kind="bill">${I.plus}Adicionar conta</button></div>`}
  </section>`;
}

function cardCategorias(s) {
  const groups = {};
  const add = (k, v) => { groups[k] = (groups[k] || 0) + v; };
  if (!s.multi) s.bills.forEach((b) => add(b.category, b.amount));
  else {
    const f = s.view === 'casa' ? 1 : s.div.shares[s.view];
    s.personal.forEach((b) => add(b.category, b.amount));
    s.div.house.forEach((b) => add(b.category, b.amount * f));
  }
  spendOf(s.m, s.multi ? s.view : null).forEach((x) => add(x.category, x.amount));
  if (s.daily - s.dailyActual > 0.005) add('diaadia', s.daily - s.dailyActual);
  const rows = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const total = s.spent;
  return `<section class="card">
    <div class="card-head"><div><h3 class="card-title">Gastos por categoria</h3>
      <div class="label" style="margin-top:14px">Total previsto no mês</div>
      <div style="margin-top:6px">${moneyBig(total, 'mb-lg')}</div></div><div class="illu">${ILLU.donut}</div></div>
    <div class="stack" style="margin-top:18px;height:22px;border-radius:8px">${rows.map(([k, v]) => `<span title="${catInfo(k).label}" style="flex-grow:${v};background:${catInfo(k).color};border-radius:4px"></span>`).join('')}</div>
    <div class="cat-list">${rows.length ? rows.map(([k, v]) => `<div class="cat-row">${catDot(k)}<span class="name">${catInfo(k).label}</span><span class="pct num">${fmtPct(pct(v, total))}</span><span class="amt num">${money(v)}</span></div>`).join('') : '<div class="empty-note">Sem gastos cadastrados.</div>'}</div>
  </section>`;
}

function ccHTML(c, m) {
  const inv = invoiceOf(c, m);
  const paid = isPaid(m, 'card:' + c.id);
  const [y, mm] = ymParts(m);
  const look = cardLook(c);
  const bank = bankOf(c);
  const showBank = bank && bank[0] !== 'outro' && bank[1] !== c.name;
  return `<div class="${look.cls}" style="${look.style}">
    <div class="cc-top"><div class="cc-id">${bankMark(bank)}<div>${showBank ? `<div class="cc-bank">${esc(bank[1])}</div>` : ''}<span class="cc-name">${esc(c.name)}</span></div></div><span class="cc-status">${paid ? 'Paga' : inv > 0 ? 'Aberta' : 'Sem fatura'}</span></div>
    <div class="cc-mid"><span class="cc-chip"></span><span class="cc-brand num ${c.last4 ? 'full' : ''}">${c.last4 ? `•••• •••• •••• ${esc(c.last4)}` : esc((c.name.split(' ').pop() || '').toUpperCase().slice(0, 10))}</span>${I.nfc}</div>
    <div class="cc-bottom"><div><div class="cc-k">Vence</div><div class="cc-v num">${pad2(clampDay(c.dueDay, m))}/${pad2(mm)}</div></div>
      <div style="text-align:right"><div class="cc-k">Limite livre</div><div class="cc-v num">${money(Math.max(0, (c.limit || 0) - inv))}</div></div></div>
  </div>`;
}

function cardCartoes() {
  const m = ui.month;
  const cards = visibleCards();
  if (!cards.length) {
    return `<section class="card"><div class="card-head"><h3 class="card-title">Cartões</h3><div class="illu">${ILLU.card}</div></div>
      <div class="empty-note">Nenhum cartão cadastrado.<br><br><button class="btn" data-action="add" data-kind="card">${I.plus}Adicionar cartão</button></div></section>`;
  }
  const idx = Math.min(ui.cardIdx, cards.length - 1);
  const c = cards[idx];
  const months = [m, addMonths(m, 1), addMonths(m, 2)];
  const vals = months.map((x) => invoiceOf(c, x));
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => ({ x: ((i + 0.5) / 3) * 100, y: 78 - (v / max) * 42 }));
  return `<section class="card">
    <div class="card-head"><div><h3 class="card-title">Cartões</h3>
      <div class="label" style="margin-top:14px">Fatura de ${monthName(m).toLowerCase()} · ${esc(c.name)}</div>
      <div style="margin-top:6px">${moneyBig(invoiceOf(c, m), 'mb-lg')}</div></div><div class="illu">${ILLU.card}</div></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px">
      <button class="btn" data-action="nav" data-page="cartoes">Ver faturas</button>
      <div class="cc-actions"><button class="icon-btn sm" data-action="card-prev" ${idx === 0 ? 'disabled style="opacity:.4"' : ''}>${I.chevL}</button><button class="icon-btn sm" data-action="card-next" ${idx >= cards.length - 1 ? 'disabled style="opacity:.4"' : ''}>${I.chevR}</button></div>
    </div>
    <div class="carousel"><div class="carousel-track" style="transform:translateX(calc(${-idx} * (82% + 12px)))">${cards.map((k) => ccHTML(k, m)).join('')}</div></div>
    <div class="inv-head">Próximas faturas</div>
    <div class="inv-chart">
      ${months.map((x, i) => `<div class="inv-col ${i === 0 ? 'on' : ''}"><div style="text-align:center;z-index:1"><div class="m">${monthShort(x)}</div>${i === 0 ? `<span class="st">${isPaid(x, 'card:' + c.id) ? 'Paga' : 'Atual'}</span>` : ''}</div>${i === 0 ? `<div class="fill" style="height:${100 - pts[0].y}%"></div>` : ''}<div class="v num">${money(vals[i])}</div></div>`).join('')}
      <svg class="inv-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="var(--text-3)" stroke-width="1.4" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/></svg>
      ${pts.map((p, i) => `<i class="inv-dot ${i === 0 ? 'on' : ''}" style="left:${p.x}%;top:${p.y}%"></i>`).join('')}
    </div>
  </section>`;
}

function housingIcon(name) {
  const n = name.toLowerCase();
  if (/alug|financ|presta/.test(n)) return I.key;
  if (/condom/.test(n)) return I.building;
  if (/luz|energia/.test(n)) return I.bolt;
  if (/internet|wi-?fi/.test(n)) return I.wifi;
  if (/água|agua|saneamento/.test(n)) return I.drop;
  if (/gás|gas/.test(n)) return I.flame;
  return I.home;
}

// Moradia
function housingFor(s) {
  const all = billsOf(s.m).filter((b) => b.category === 'moradia');
  if (!s.multi) return { items: all.map((b) => ({ b, v: b.amount })), base: s.income };
  const totalIncome = sum(incomesOf(s.m));
  if (s.view === 'casa' || ui.housingBase === 'casa') {
    const items = (s.view === 'casa' ? all : all.filter((b) => b.scope === 'casa' || b.payer === s.view)).map((b) => ({ b, v: b.amount }));
    return { items, base: totalIncome, casa: true };
  }
  const f = s.div.shares[s.view];
  const items = all.filter((b) => b.scope === 'casa' || b.payer === s.view).map((b) => ({ b, v: b.scope === 'casa' ? b.amount * f : b.amount, approx: b.scope === 'casa' }));
  return { items, base: s.income };
}

function cardMoradia(s, opts = {}) {
  const h = housingFor(s);
  const items = h.items;
  const total = sum(items, (x) => x.v);
  const p = pct(total, h.base);
  const ref = Number(data.settings.housingRef) || 30;
  const scale = ref * 2;
  const ok = p <= ref;
  const toggle = s.multi && s.view !== 'casa'
    ? `<div class="seg text" style="margin-top:16px"><button class="${ui.housingBase !== 'casa' ? 'on' : ''}" data-action="housing-base" data-base="meu">Só minha renda</button><button class="${ui.housingBase === 'casa' ? 'on' : ''}" data-action="housing-base" data-base="casa">Renda da casa</button></div>` : '';
  return `<section class="card" style="flex:1">
    <div class="card-head"><div><h3 class="card-title">Moradia</h3>
      <div class="label" style="margin-top:14px">${h.casa ? 'Quanto a casa gasta para morar' : s.multi ? `Quanto ${esc(personOf(s.view).name)} gasta para morar` : 'Quanto você gasta para morar'}</div>
      <div style="margin-top:6px">${moneyBig(total, 'mb-lg')}</div>
      <div class="pill-row"><span class="trend ${ok ? '' : 'warn'}" style="font-size:12.5px">${ok ? I.check : I.info}${fmtPct(p)} da ${h.casa ? 'renda da casa' : 'renda'}</span><span class="muted">referência: até ${ref}%</span></div>
    </div><div class="illu">${ILLU.house}</div></div>
    ${toggle}
    <div class="housing-bar"><div class="track"><div class="fill ${ok ? '' : 'over'}" style="width:${Math.min(p / scale, 1) * 100}%"></div></div><div class="mark" style="left:50%"><span>${ref}%</span></div></div>
    <div class="scale"><span>0%</span><span>${scale}% da renda</span></div>
    ${opts.noList ? '' : `<div class="subhead">O que entra na conta</div>
    ${items.length ? `<div class="mini-grid">${items.map(({ b, v, approx }) => `<div class="mini"><div class="mini-ic">${housingIcon(b.name)}</div><div style="min-width:0"><div class="k">${esc(b.name)}</div><div class="v num">${approx ? '≈ ' : ''}${money(v)}</div></div></div>`).join('')}</div>`
      : `<div class="empty-note">Cadastre contas com a categoria "Moradia" (aluguel, condomínio, luz...).</div>`}`}
  </section>`;
}

function reserveMonthly() {
  return sum(data.bills.filter((b) => b.category === 'reserva' && !b.month));
}
function cardReserva() {
  const r = data.reserve;
  const p = pct(r.balance, r.goal);
  const monthly = reserveMonthly();
  const left = Math.max(0, r.goal - r.balance);
  const eta = left > 0 && monthly > 0 ? Math.ceil(left / monthly) : null;
  return `<section class="card">
    <div class="reserve">
      <div class="grow">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <h3 class="card-title">${L('Minha reserva', 'Nossa reserva')}</h3>
          <div style="display:flex;gap:8px"><button class="btn" data-action="reserve-move" data-kind="withdraw">${I.arrowDown}Retirar</button><button class="btn" data-action="reserve-goal">${I.pencil}Meta</button><button class="btn btn-primary" data-action="reserve-move" data-kind="deposit">${I.plus}Guardar</button></div>
        </div>
        <p class="reserve-about">Para imprevistos. O ideal é guardar de 3 a 6 meses dos seus gastos.</p>
        <div style="display:flex;align-items:baseline;gap:14px;margin-top:10px;flex-wrap:wrap">${moneyBig(r.balance, 'mb-lg')}${r.goal ? `<span class="muted">de ${money(r.goal)} · <b style="color:var(--green)">${fmtPct(Math.min(p, 100))}</b></span>` : `<span class="muted">defina uma meta para acompanhar</span>`}</div>
        <div class="progress"><span style="width:${Math.min(p, 100)}%"></span></div>
        <div class="reserve-stats">
          <div><div class="label">Guardando por mês</div><div class="v num">${money(monthly)}</div></div>
          <div><div class="label">Falta para a meta</div><div class="v num">${money(left)}</div></div>
          <div><div class="label">Previsão</div><div class="v">${r.goal && left === 0 ? 'Meta atingida 🎉' : eta ? `${eta} ${eta === 1 ? 'mês' : 'meses'} (${monthShort(addMonths(ymNow(), eta))})` : '—'}</div></div>
        </div>
      </div>
      <div class="illu">${ILLU.piggy}</div>
    </div>
  </section>`;
}

// Divisão da casa
function cardDivisao(s) {
  const d = s.div;
  const m = s.m;
  const settled = !!data.settled[m];
  const head = d.rows.map((r) => `<div class="div-person"><div class="lab">${pDot(r.p)}${esc(r.p.name)} paga</div><div class="val num">${money(r.fair)}</div></div>`).join('');
  const bar = d.total > 0
    ? d.rows.map((r) => `<span style="flex-grow:${Math.max(r.share, 0.0001)};background:${r.p.color}">${r.share >= 0.08 ? (r.share * 100).toFixed(1).replace('.', ',') + '%' : ''}</span>`).join('')
    : '<span style="flex-grow:1;background:var(--surface-3)"></span>';
  const list = d.house.length
    ? d.house.map((b) => `<div class="cat-row"><span class="dot" style="background:${personOf(b.payer).color}" title="Paga: ${esc(personOf(b.payer).name)}"></span><span class="name">${esc(b.name)}<span class="muted" style="font-size:11.5px"> · ${esc(personOf(b.payer).name)}</span></span><span class="amt num">${money(b.amount)}</span></div>`).join('')
    : `<div class="empty-note">Nenhuma conta marcada como "da casa".<br>Ao criar uma conta, escolha <b>Da casa (dividida)</b>.</div>`;
  let foot;
  if (!d.transfers.length) foot = `<div class="settle"><span class="trend" style="font-size:12.5px">${I.check}Tudo equilibrado: ninguém precisa devolver nada.</span></div>`;
  else foot = d.transfers.map((t) => `<div class="settle ${settled ? 'done' : ''}">
      <div class="avatars">${avatar(t.from, 22)}</div><span class="muted">→</span><div class="avatars">${avatar(t.to, 22)}</div>
      <span class="grow"><b>${esc(t.from.name)}</b> devolve <b class="num">${money(t.amount)}</b> para <b>${esc(t.to.name)}</b> no Pix</span>
    </div>`).join('') + `<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn ${settled ? '' : 'btn-primary'}" data-action="settle">${settled ? `${I.check}Acerto feito · desfazer` : 'Marcar acerto como feito'}</button></div>`;
  return `<section class="card div-card">
    <div class="card-head"><div><h3 class="card-title">Divisão da casa</h3>
      <div class="label" style="margin-top:14px">Total das contas da casa</div>
      <div style="margin-top:6px">${moneyBig(d.total, 'mb-lg')}</div></div><div class="illu">${ILLU.split}</div></div>
    <div class="div-head">${head}</div>
    <div class="div-bar">${bar}</div>
    <div class="label" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">Dividido ${SPLIT_LABEL[data.household.split]}<button class="link-btn" data-action="setup-people">mudar regra</button></div>
    <div class="subhead">Quem paga cada conta</div>
    <div class="cat-list" style="margin-top:0;max-height:250px;overflow-y:auto">${list}</div>
    <div class="div-foot">${foot}</div>
  </section>`;
}

// Ordem dos blocos
const LAYOUT = {
  single: ['saldo', 'categorias', 'cartoes', 'contas', 'moradia', 'reserva', 'assinaturas'],
  multi: ['saldo', 'divisao', 'cartoes', 'contas', 'moradia', 'categorias', 'reserva', 'assinaturas'],
};
function layoutOrder(mode) {
  const def = LAYOUT[mode];
  let cur = data.settings.layout?.[mode];
  if (Array.isArray(cur) && !cur.includes('assinaturas')) cur = [...cur, 'assinaturas'];
  return Array.isArray(cur) && cur.length === def.length && def.every((k) => cur.includes(k)) ? [...cur] : [...def];
}

function pageVisao() {
  const s = summary(ui.month);
  const B = { saldo: () => cardSaldo(s), categorias: () => cardCategorias(s), cartoes: cardCartoes, contas: () => cardContas(s), moradia: () => cardMoradia(s), reserva: cardReserva, divisao: () => cardDivisao(s), assinaturas: cardAssinaturas };
  const o = layoutOrder(s.multi ? 'multi' : 'single').map((k) => `<div class="block" data-block="${k}"><button class="grip" data-grip title="Segure e arraste para mudar de lugar" aria-label="Mover bloco">${I.grip}</button>${B[k]()}</div>`);
  return `${bankBanner()}${sampleBanner()}
  <div class="dash">
    <div class="dash-left">${o[0]}<div class="dash-pair">${o[1]}${o[2]}</div></div>
    <div class="dash-right">${o[3]}${o[4]}</div>
  </div>
  <div class="dash-pair">${o[5]}${o[6]}</div>${s.multi ? o[7] : ''}`;
}

// Assinaturas
function visibleSubs() {
  const v = currentView();
  return !isMulti() || v === 'casa' ? data.subs : data.subs.filter((s) => s.payer === v || s.scope === 'casa');
}
const whenLabel = (n) => (n.days === 0 ? 'hoje' : n.days === 1 ? 'amanhã' : `em ${n.days} dias`);
function upcomingSubs() {
  return visibleSubs().filter(subActive).map((x) => ({ x, n: nextCharge(x) })).filter((u) => u.n).sort((a, b) => a.n.date - b.n.date);
}
function subNextRow({ x, n }) {
  const end = n ? `${pad2(n.date.getDate())}/${pad2(n.date.getMonth() + 1)} · ${whenLabel(n)}` : 'pausada';
  return `<button class="sub-row ${x.paused ? 'paused' : ''}" data-action="edit-sub" data-id="${esc(x.id)}" title="Editar">${subMark(x, 36)}
    <div class="grow"><div class="nm">${esc(x.name)}</div><div class="muted">${x.cycle === 'anual' ? 'anual · ' : ''}${esc(subPayLabel(x))}</div></div>
    <div class="sub-row-end"><div class="num amt">${money(x.amount)}</div><div class="muted">${end}</div></div></button>`;
}
function cardAssinaturas() {
  const list = visibleSubs();
  const active = list.filter(subActive);
  const monthly = sum(active, subMonthly);
  const onCard = sum(active.filter(subOnCard), subMonthly);
  const rows = [...upcomingSubs(), ...list.filter((x) => x.paused).map((x) => ({ x, n: null }))];
  return `<section class="card">
    <div class="card-head"><div><h3 class="card-title">Assinaturas <span class="muted">· ${active.length} ${active.length === 1 ? 'ativa' : 'ativas'}</span></h3>
      <div class="label" style="margin-top:14px">Custo por mês${monthly ? ` · ${money(monthly * 12)} por ano` : ''}</div>
      <div style="margin-top:6px">${moneyBig(monthly, 'mb-lg')}</div>
      ${onCard ? `<div class="label" style="margin-top:8px">${money(onCard)} já estão dentro das faturas</div>` : ''}</div>
      <button class="icon-btn" data-action="add" data-kind="sub" title="Nova assinatura">${I.plus}</button></div>
    ${rows.length ? `<div class="sub-list">${rows.map(subNextRow).join('')}</div>`
    : `<div class="empty-note">Streaming, música, nuvem, academia... cadastre aqui ou marque como assinatura ao importar o extrato.<br><br><button class="btn" data-action="add" data-kind="sub">${I.plus}Adicionar assinatura</button></div>`}
  </section>`;
}
const SERVICE_RE = [
  ['netflix', /netflix/], ['spotify', /spotify/], ['disney', /disney/], ['max', /\bhbo|\bmax\b/], ['primevideo', /prime ?video/],
  ['amazonprime', /amazon ?prime|amzn ?prime|prime ?amazon/], ['globoplay', /globoplay/], ['youtube', /youtube|google ?youtube/],
  ['deezer', /deezer/], ['icloud', /icloud|apple\.com/], ['googleone', /google ?one|google ?storage/], ['chatgpt', /openai|chatgpt/],
  ['m365', /microsoft|office ?365/], ['canva', /canva/], ['gamepass', /xbox|game ?pass/], ['psplus', /playstation|psn/],
  ['crunchyroll', /crunchyroll/], ['paramount', /paramount/], ['duolingo', /duolingo/], ['wellhub', /wellhub|gympass/],
  ['ifood', /ifood ?clube|clube ?ifood/], ['meli', /meli ?\+|meli ?plus/], ['uberone', /uber ?one/],
];
const SUB_EXTRA = /\b(adobe|smart ?fit|bluefit|selfit|academia|apple ?(com|one|music|tv)|itunes|amazon music|kindle unlimited|audible|tidal|telecine|mubi|dropbox|notion|github|claude ai|anthropic|midjourney|ea play|nintendo online|linkedin premium|tinder|bumble|headspace|calm|babbel|strava)\b/;
const guessService = (desc) => (SERVICE_RE.find(([, re]) => re.test(Statement.norm(desc))) || [])[0] || null;
function subFromImport(r, owner, pay) {
  const service = guessService(r.desc) || 'outro';
  const name = service === 'outro' ? cleanName(r.desc) : SERVICES.find((s) => s[0] === service)[1];
  let s = data.subs.find((x) => (service !== 'outro' ? x.service === service : x.name.toLowerCase() === name.toLowerCase()));
  if (!s) {
    s = { id: uid(), service, name, amount: Math.abs(r.amt), cycle: 'mensal', day: Number(r.date.slice(8)), pay, start: r.m, payer: owner, scope: 'pessoal' };
    if (service === 'outro') s.color = SUB_COLORS[data.subs.length % SUB_COLORS.length];
    data.subs.push(s);
  }
  if (s.pay === 'conta' && subChargesIn(s, r.m)) { setPaid(r.m, 'sub:' + s.id, true); s.seen = true; }
  return s;
}

// Arrastar
let drag = null;
function endDrag(drop) {
  if (!drag) return;
  const { key, target, block, ghost } = drag;
  drag = null;
  ghost.remove();
  block.classList.remove('dragging');
  document.body.classList.remove('is-dragging');
  document.querySelectorAll('.block.drop-over').forEach((el) => el.classList.remove('drop-over'));
  if (!drop || !target || target === key) return;
  const mode = isMulti() ? 'multi' : 'single';
  const order = layoutOrder(mode);
  const a = order.indexOf(key), b = order.indexOf(target);
  [order[a], order[b]] = [order[b], order[a]];
  data.settings.layout = { ...(data.settings.layout || {}), [mode]: order };
  commit();
}
document.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('[data-grip]');
  if (!g || e.button !== 0) return;
  e.preventDefault();
  const block = g.closest('.block');
  const r = block.getBoundingClientRect();
  const ghost = block.cloneNode(true);
  ghost.classList.add('block-ghost');
  Object.assign(ghost.style, { width: `${r.width}px`, height: `${r.height}px`, left: `${r.left}px`, top: `${r.top}px` });
  document.body.appendChild(ghost);
  block.classList.add('dragging');
  document.body.classList.add('is-dragging');
  drag = { key: block.dataset.block, block, ghost, dx: e.clientX - r.left, dy: e.clientY - r.top, target: null };
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.ghost.style.left = `${e.clientX - drag.dx}px`;
  drag.ghost.style.top = `${e.clientY - drag.dy}px`;
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.block');
  const t = over && over !== drag.block ? over : null;
  document.querySelectorAll('.block.drop-over').forEach((el) => { if (el !== t) el.classList.remove('drop-over'); });
  if (t) t.classList.add('drop-over');
  drag.target = t ? t.dataset.block : null;
  const main = $('.main'), box = main.getBoundingClientRect();
  if (e.clientY > box.bottom - 60) main.scrollTop += 18;
  else if (e.clientY < box.top + 60) main.scrollTop -= 18;
});
document.addEventListener('pointerup', () => endDrag(true));
document.addEventListener('pointercancel', () => endDrag(false));

// Previsor
function cardWeight(c, view, div) {
  if (!isMulti() || view === 'casa') return 1;
  if (c.scope === 'casa') return div.shares[view];
  return c.owner === view ? 1 : 0;
}
function invoiceHistory(c) {
  const now = ymNow();
  return [0, 1, 2, 3].map((i) => invoiceOf(c, addMonths(now, -i))).filter((v) => v > 0);
}
function dailyHistory(view) {
  return [1, 2, 3].map((i) => sum(spendOf(addMonths(ymNow(), -i), isMulti() ? view : null))).filter((v) => v > 0);
}
const avgOf = (vals) => (vals.length ? sum(vals, (x) => x) / vals.length : 0);

function forecast(view = currentView()) {
  const now = ymNow();
  const dailyAvg = avgOf(dailyHistory(view));
  return Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(now, i);
    const s = summary(m, view);
    let est = 0;
    if (i > 0) {
      for (const c of data.cards) {
        if (invoiceOf(c, m) > 0) continue;
        est += avgOf(invoiceHistory(c)) * cardWeight(c, view, s.div);
      }
      if (dailyAvg > s.daily) est += dailyAvg - s.daily;
    }
    const spent = s.spent + est;
    return { m, income: s.income, spent, est, sobra: s.income - spent };
  });
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const fmt1 = (v) => v.toFixed(1).replace('.', ',');

// Nota
function healthScore(rows, view = currentView()) {
  const m = ymNow();
  const s = summary(m, view);
  if (!s.income) return null;
  const sobraP = s.sobra / s.income;
  const h = housingFor(s);
  const housingP = h.base > 0 ? sum(h.items, (x) => x.v) / h.base : 0;
  const ref = (Number(data.settings.housingRef) || 30) / 100;
  const cardP = sum(data.cards, (c) => invoiceOf(c, m) * cardWeight(c, view, s.div)) / s.income;
  const cost = isMulti() ? summary(m, 'casa').spent : s.spent;
  const months = cost > 0 ? data.reserve.balance / cost : 0;
  const neg = rows.filter((r) => r.sobra < 0).length;
  const parts = [
    { label: 'Sobra do mês', max: 35, pts: 35 * clamp01(sobraP / 0.2), why: `${fmtPct(sobraP * 100)} da renda fica livre (ideal: 20% ou mais)` },
    { label: 'Moradia', max: 20, pts: 20 * clamp01((2 * ref - housingP) / ref), why: `${fmtPct(housingP * 100)} da renda (referência: até ${fmtPct(ref * 100)})` },
    { label: 'Cartões', max: 15, pts: 15 * clamp01((0.5 - cardP) / 0.3), why: `${fmtPct(cardP * 100)} da renda em faturas (ideal: até 20%)` },
    { label: 'Reserva', max: 20, pts: 20 * clamp01(months / 6), why: `cobre ${fmt1(months)} ${months >= 1 && months < 2 ? 'mês' : 'meses'} de gastos (ideal: 6)` },
    { label: 'Próximos meses', max: 10, pts: 10 * (1 - neg / 6), why: neg ? `${neg} de 6 meses no negativo` : 'nenhum mês no negativo' },
  ];
  const raw = Math.round(sum(parts, (p) => p.pts));
  const capped = neg > 0 && raw > 59;
  const total = capped ? 59 : raw;
  const band = total >= 80 ? ['Ótima', 'ok', 'check'] : total >= 60 ? ['Boa', 'ok', 'check'] : total >= 40 ? ['Atenção', 'soon', 'info'] : ['Crítica', 'late', 'info'];
  return { total, band, parts, capped };
}

// Dicas
function insights(rows, view = currentView()) {
  const m = ymNow();
  const s = summary(m, view);
  const out = [];
  const add = (lvl, text) => out.push({ lvl, text });
  const name = (x) => monthName(x).toLowerCase();

  const firstNeg = rows.find((r) => r.sobra < 0);
  if (firstNeg) add('bad', `Em <b>${name(firstNeg.m)}</b> a previsão fica negativa em <b>${money(-firstNeg.sobra)}</b>. Vale cortar ou adiar algum gasto antes desse mês.`);

  const late = billsOf(m).filter((b) => !b.paid && dueInfo(b, m)?.cls === 'late');
  if (late.length) add('bad', `${late.length === 1 ? `A conta <b>${esc(late[0].name)}</b> está atrasada` : `<b>${late.length} contas</b> estão atrasadas`}, somando <b>${money(sum(late))}</b>.`);

  const day = new Date().getDate();
  if (s.dailyBudget > 0 && s.dailyActual > 0 && day >= 5) {
    const projected = (s.dailyActual / day) * daysIn(m);
    if (projected > s.dailyBudget * 1.05) add('warn', `No ritmo atual, o dia a dia vai fechar em <b>${money(projected)}</b>, <b>${money(projected - s.dailyBudget)}</b> acima do planejado.`);
    else add('ok', `O dia a dia está dentro do planejado: no ritmo atual, fecha em <b>${money(projected)}</b> de ${money(s.dailyBudget)}.`);
  }

  const h = housingFor(s);
  const housing = sum(h.items, (x) => x.v);
  const ref = Number(data.settings.housingRef) || 30;
  if (h.base > 0 && pct(housing, h.base) > ref) add('warn', `A moradia consome <b>${fmtPct(pct(housing, h.base))}</b> da renda, acima da referência de ${ref}%. Para voltar a ela, seria preciso reduzir <b>${money(housing - (h.base * ref) / 100)}</b> por mês.`);

  const [next] = rows.slice(1);
  const curCards = sum(data.cards, (c) => invoiceOf(c, m) * cardWeight(c, view, s.div));
  const nextCards = sum(data.cards, (c) => invoiceOf(c, next.m) * cardWeight(c, view, s.div));
  if (curCards > 0 && nextCards > curCards * 1.2) add('warn', `As faturas de <b>${name(next.m)}</b> já somam <b>${money(nextCards)}</b>, ${fmtPct(pct(nextCards - curCards, curCards))} a mais que as deste mês.`);

  const r = data.reserve;
  const monthly = reserveMonthly();
  const left = Math.max(0, r.goal - r.balance);
  if (r.goal && left === 0) add('ok', 'Sua reserva já atingiu a meta.');
  else if (r.goal && monthly > 0) {
    const eta = Math.ceil(left / monthly), faster = Math.ceil(left / (monthly + 100));
    add('tip', `Guardando ${money(monthly)} por mês, a reserva chega à meta em <b>${eta} ${eta === 1 ? 'mês' : 'meses'}</b>.${eta > faster ? ` Com R$ 100 a mais por mês, seriam <b>${eta - faster} ${eta - faster === 1 ? 'mês' : 'meses'} a menos</b>.` : ''}`);
  } else if (!r.goal && s.sobra > 0) add('tip', 'Defina uma meta para a reserva e o Previsor mostra quando você chega lá.');
  else if (r.goal && s.sobra > 0) add('tip', `Sua reserva ainda não tem um valor mensal. Crie uma conta na categoria <b>Reserva</b> para guardar todo mês.`);

  const gv = goalsVerdict(rows);
  if (gv) add(gv.fits ? 'ok' : 'warn', gv.fits ? `Suas metas pedem <b>${money(gv.need)}</b> por mês, e isso cabe na sobra de todos os próximos meses.` : `Suas metas pedem <b>${money(gv.need)}</b> por mês, mas em <b>${name(gv.low.m)}</b> a sobra prevista é de <b>${money(gv.low.sobra)}</b>.`);

  const subs = sum(s.bills.filter((b) => b.category === 'assinaturas' && b.kind !== 'sub')) + sum(visibleSubs().filter(subActive), subMonthly);
  if (subs > 0 && s.income > 0) add('tip', `As assinaturas somam <b>${money(subs)}</b>, ${fmtPct(pct(subs, s.income))} da renda. Confira se você usa todas.`);

  if (!dailyHistory(view).length) add('tip', 'Com 2 ou 3 meses de extratos importados, o Previsor passa a considerar seus gastos reais do dia a dia.');
  const rank = { bad: 0, warn: 1, ok: 2, tip: 3 };
  return out.sort((a, b) => rank[a.lvl] - rank[b.lvl]).slice(0, 6);
}

function forecastChart(rows) {
  const vals = rows.map((r) => r.sobra);
  const hi = Math.max(0, ...vals), lo = Math.min(0, ...vals);
  const span = hi - lo || 1;
  const H = 270, padTop = hi > 0 ? 26 : 6, padBot = lo < 0 ? 26 : 6;
  const usable = H - padTop - padBot;
  const zero = padTop + (hi / span) * usable;
  const iLo = vals.indexOf(Math.min(...vals)), iHi = vals.indexOf(Math.max(...vals));
  const labeled = iLo === iHi || vals[iLo] === vals[iHi] ? new Set([0]) : new Set([iLo, iHi]);
  const cols = rows.map((r, i) => {
    const h = (Math.abs(r.sobra) / span) * usable;
    const neg = r.sobra < 0;
    const pos = neg ? `top:${zero}px;height:${h}px` : `bottom:${H - zero}px;height:${h}px`;
    const lab = neg ? `top:${zero + h + 5}px` : `bottom:${H - zero + h + 5}px`;
    return `<div class="fc-col">
      <div class="fc-plot"><i class="fc-bar ${neg ? 'neg' : ''}" style="${pos}"></i>${labeled.has(i) ? `<span class="fc-lab num" style="${lab}">${money(r.sobra)}</span>` : ''}</div>
      <span class="fc-m">${monthShort(r.m)}</span>
      <div class="fc-tip ${i >= 4 ? 'end' : ''}"><b>${monthLong(r.m)}</b>
        <div><span>Renda</span><span class="num">${money(r.income)}</span></div>
        <div><span>Gastos</span><span class="num">${money(r.spent)}</span></div>
        <div><span>Sobra</span><b class="num">${money(r.sobra)}</b></div>
        ${r.est > 0.005 ? `<small>inclui ${money(r.est)} estimados</small>` : ''}</div>
    </div>`;
  }).join('');
  return `<div class="fc-chart"><div class="fc-zero" style="top:${zero}px"></div>${cols}</div>`;
}

function pagePrevisor() {
  const view = currentView();
  const head = pageHead('Previsor', `Para onde suas finanças estão indo nos próximos 6 meses${isMulti() ? ` · ${esc(viewName(view))}` : ''}.`);
  const rows = forecast(view);
  const score = healthScore(rows, view);
  if (!score) {
    return `<section class="card">${head}<div class="empty-note">O Previsor precisa saber sua renda para começar.<br><br><button class="btn btn-primary" data-action="nav" data-page="renda">Cadastrar renda</button></div></section>`;
  }
  const total = sum(rows, (r) => r.sobra);
  const worst = rows.reduce((a, b) => (b.sobra < a.sobra ? b : a));
  const anyEst = rows.some((r) => r.est > 0.005);
  const ICON = { bad: 'info', warn: 'info', ok: 'check', tip: 'spark' };
  const LVL = { bad: 'Urgente', warn: 'Atenção', ok: 'Tudo certo', tip: 'Dica' };
  const list = insights(rows, view);
  return `<section class="card">${head}</section>
  <div class="fc-grid">
    <section class="card">
      <h3 class="card-title">Saúde financeira</h3>
      <div class="fc-score"><span class="fc-num num">${score.total}</span><span class="muted">de 100</span><span class="tag ${score.band[1]}">${score.band[0]}</span></div>
      ${score.capped ? '<div class="label" style="margin-top:8px">A nota fica limitada a 59 enquanto houver mês previsto no negativo.</div>' : ''}
      <div class="fc-parts">${score.parts.map((p) => `<div class="fc-part"><div class="fc-part-top"><span>${p.label}</span><span class="num">${Math.round(p.pts)}/${p.max}</span></div><div class="fc-track"><i style="width:${(p.pts / p.max) * 100}%"></i></div><div class="label">${p.why}</div></div>`).join('')}</div>
    </section>
    <section class="card">
      <div class="card-head"><div><h3 class="card-title">Sobra prevista por mês</h3>
        <div class="fc-stats"><div><div class="label">Somando os 6 meses</div><div style="margin-top:6px">${moneyBig(total, 'mb-lg')}</div></div>
        <div><div class="label">Mês mais apertado</div><div class="fc-worst">${monthName(worst.m)} <span class="num ${worst.sobra < 0 ? 'negc' : ''}">${money(worst.sobra)}</span></div></div></div></div></div>
      ${forecastChart(rows)}
    </section>
  </div>
  <section class="card"><div id="fc-chat-slot"></div></section>
  ${list.length ? `<section class="card"><h3 class="card-title">O que observar</h3><div class="fc-list">${list.map((x) => `<div class="fc-item"><span class="fc-ic ${x.lvl}">${I[ICON[x.lvl]]}</span><div><div class="fc-lvl">${LVL[x.lvl]}</div><div>${x.text}</div></div></div>`).join('')}</div></section>` : ''}
  <section class="card"><h3 class="card-title">Mês a mês</h3>
    <table class="table" style="margin-top:8px"><thead><tr><th>Mês</th><th class="r">Renda</th><th class="r">Gastos</th><th class="r">Sobra</th><th class="r">Parte estimada</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${monthLong(r.m)}</td><td class="r num">${money(r.income)}</td><td class="r num">${money(r.spent)}</td><td class="r amt num ${r.sobra < 0 ? 'negc' : ''}">${money(r.sobra)}</td><td class="r num muted">${r.est > 0.005 ? money(r.est) : '—'}</td></tr>`).join('')}
    </tbody></table>
    <p class="label" style="margin:12px 0 0">Previsão feita só com o que está no Prumo${anyEst ? '; onde ainda não há fatura lançada, usa a média das faturas recentes' : ''}. As dicas são de organização e não são recomendação de investimento.</p>
  </section>`;
}

// Páginas
const pageHead = (title, sub, actions = '') => `<div class="page-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div style="display:flex;gap:8px">${actions}</div></div>`;
const rowActions = (edit, del, id) => `<div class="actions"><button class="icon-btn sm ghost" data-action="${edit}" data-id="${esc(id)}" title="Editar">${I.pencil}</button><button class="icon-btn sm ghost" data-action="${del}" data-id="${esc(id)}" title="Excluir">${I.trash}</button></div>`;
const recurLabel = (x) => (x.days ? `${x.days} ${x.days === 1 ? 'diária' : 'diárias'} no extrato` : x.daily ? `Estimativa: ${money(x.rate)} por dia × ${x.perMonth} dias${x.est && x.amount < x.rate * x.perMonth - 0.01 ? ' (o que falta)' : ''}` :x.month ? `Só em ${monthShort(x.month)}` : 'Todo mês');

function pageFluxo() {
  const s = summary(ui.month);
  const v = s.view;
  const multiName = (x) => (isMulti() && v === 'casa' ? ` <span class="muted">· ${esc(personOf(x).name)}</span>` : '');
  const rows = [
    ...incomesOf(ui.month, v).map((i) => ({ day: clampDay(i.day, ui.month), name: esc(i.name) + multiName(i.owner), cat: 'Renda', amount: i.amount, income: true })),
    ...s.bills.map((b) => ({ day: b.day, name: esc(b.name) + multiName(b.payer), cat: catInfo(b.category).label, color: catInfo(b.category).color, amount: -b.amount, paid: b.paid })),
  ];
  // Acerto
  if (s.multi && v !== 'casa') {
    for (const t of s.div.transfers) {
      if (t.from.id === v) rows.push({ day: daysIn(ui.month), name: `Acerto da casa → ${esc(t.to.name)}`, cat: 'Acerto', color: t.to.color, amount: -t.amount, paid: !!data.settled[ui.month], transfer: true });
      if (t.to.id === v) rows.push({ day: daysIn(ui.month), name: `Acerto da casa ← ${esc(t.from.name)}`, cat: 'Acerto', amount: t.amount, income: true, transfer: true });
    }
  }
  for (const x of spendOf(ui.month, s.multi ? v : null)) {
    rows.push({ day: Number(x.date.slice(8)), name: esc(x.desc) + multiName(x.owner) + ` <button class="icon-btn sm ghost inline" data-action="del-spend" data-id="${esc(x.id)}" title="Remover este gasto">${I.x}</button>`, cat: catInfo(x.category).label, color: catInfo(x.category).color, amount: -x.amount, paid: true, spend: true });
  }
  rows.sort((a, b) => a.day - b.day || (b.income ? 1 : 0) - (a.income ? 1 : 0));
  const rest = s.daily - s.dailyActual;
  if (rest > 0.005) rows.push({ day: null, name: s.dailyActual ? `Dia a dia · restante do orçamento (já gastou ${money(s.dailyActual)} de ${money(s.dailyBudget)})` : 'Dia a dia (orçamento do mês)', cat: 'Dia a dia', color: CATS.diaadia.color, amount: -rest });
  let run = 0;
  return `<section class="card">${pageHead(`Fluxo de caixa · ${monthLong(ui.month)}${s.multi ? ` · ${esc(viewName(v))}` : ''}`, 'Entradas e saídas do mês em ordem de data, com o saldo acumulado.', `<button class="btn" data-action="import-statement">${I.upload}Importar extrato</button>`)}
    <div class="stat-row" style="margin-bottom:18px">
      <div class="card stat"><div class="label">Entradas</div><div class="v num pos">${money(s.income)}</div></div>
      <div class="card stat"><div class="label">Saídas previstas</div><div class="v num">${money(s.spent)}</div></div>
      <div class="card stat"><div class="label">Saldo do mês</div><div class="v num ${s.sobra < 0 ? 'negc' : 'pos'}">${money(s.sobra)}</div></div>
    </div>
    <table class="table"><thead><tr><th>Dia</th><th>Descrição</th><th>Categoria</th><th>Situação</th><th class="r">Valor</th><th class="r">Saldo</th></tr></thead><tbody>
      ${rows.map((r) => { run += r.amount; return `<tr class="${r.income ? 'income' : ''}"><td class="num">${r.day ? pad2(r.day) : '—'}</td><td>${r.name}</td><td>${r.income ? `<span class="cat-dot"><span class="dot" style="background:var(--green)"></span>${r.cat}</span>` : `<span class="cat-dot"><span class="dot" style="background:${r.color}"></span>${r.cat}</span>`}</td><td>${r.transfer ? `<span class="tag ${data.settled[ui.month] ? 'ok' : 'info'}">${data.settled[ui.month] ? 'Acertado' : 'Pix a fazer'}</span>` : r.income ? '<span class="tag ok">Entrada</span>' : r.day === null ? '<span class="tag info">Estimado</span>' : r.spend ? '<span class="tag neutral">Do extrato</span>' : r.paid ? '<span class="tag ok">Paga</span>' : '<span class="tag soon">A pagar</span>'}</td><td class="r amt num">${r.amount >= 0 ? '+ ' : '− '}${money(Math.abs(r.amount))}</td><td class="r num ${run < 0 ? 'negc' : ''}">${money(run)}</td></tr>`; }).join('') || `<tr><td colspan="6" class="empty-note">Nada lançado neste mês.</td></tr>`}
    </tbody></table></section>`;
}

function pageCartoes() {
  const months = Array.from({ length: 6 }, (_, i) => addMonths(ui.month, i));
  return `<section class="card">${pageHead('Cartões', 'Cadastre seus cartões e lance o valor das faturas de cada mês.', `<button class="btn btn-primary" data-action="add" data-kind="card">${I.plus}Novo cartão</button>`)}
    ${data.cards.length ? `<div class="cards-grid">${data.cards.map((c) => `<div>${ccHTML(c, ui.month)}<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><span class="muted cat-dot">${isMulti() ? `${pDot(personOf(c.owner))}${esc(personOf(c.owner).name)} · ${c.scope === 'casa' ? 'da casa' : 'pessoal'} · ` : ''}${c.last4 ? `Final ${esc(c.last4)} · ` : ''}Limite ${money(c.limit)}</span>${rowActions('edit-card', 'del-card', c.id)}</div></div>`).join('')}</div>` : '<div class="empty-note">Nenhum cartão ainda.</div>'}
  </section>
  ${data.cards.length ? `<section class="card">${pageHead('Faturas', 'Digite o valor e saia do campo para salvar. Faturas aparecem automaticamente em Contas a pagar.')}
    <table class="table"><thead><tr><th>Cartão</th>${months.map((m) => `<th class="r">${monthShort(m)}</th>`).join('')}</tr></thead><tbody>
    ${data.cards.map((c) => `<tr><td><b>${esc(c.name)}</b><div class="muted" style="font-size:12px">${c.last4 ? `final ${esc(c.last4)} · ` : ''}vence dia ${pad2(c.dueDay)}</div></td>${months.map((m) => `<td class="r"><input class="inv-input num" data-change="invoice" data-card="${esc(c.id)}" data-month="${m}" value="${moneyInput(invoiceOf(c, m) || '')}" placeholder="0,00" inputmode="decimal"></td>`).join('')}</tr>`).join('')}
    </tbody><tfoot><tr><td>Total</td>${months.map((m) => `<td class="r num">${money(sum(data.cards, (c) => invoiceOf(c, m)))}</td>`).join('')}</tr></tfoot></table></section>` : ''}`;
}

function pageCasa() {
  const s = summary(ui.month);
  const items = data.bills.filter((b) => b.category === 'moradia' && billActive(b, ui.month));
  return `<div class="dash-pair">${cardMoradia(s, { noList: true })}
    <section class="card">${pageHead('Moradia', `Tudo com a categoria Moradia em ${monthLong(ui.month).toLowerCase()}.`, `<button class="btn" data-action="housing-ref">Referência</button><button class="btn btn-primary" data-action="add" data-kind="bill" data-cat="moradia">${I.plus}Nova</button>`)}
      <table class="table"><thead><tr><th></th><th>Conta</th><th>Dia</th><th class="r">Valor</th><th></th></tr></thead><tbody>
      ${items.map((b) => `<tr><td style="width:44px"><div class="mini-ic">${housingIcon(b.name)}</div></td><td>${esc(b.name)}<div class="muted" style="font-size:12px">${TYPE_LABEL[b.type]} · ${recurLabel(b)}${isMulti() ? ` · ${b.scope === 'casa' ? 'da casa' : 'pessoal'} · paga: ${esc(personOf(b.payer).name)}` : ''}</div></td><td class="num">${pad2(b.day)}</td><td class="r amt num">${money(b.amount)}</td><td>${rowActions('edit-bill', 'del-bill', b.id)}</td></tr>`).join('') || `<tr><td colspan="5" class="empty-note">Nenhuma conta de moradia.</td></tr>`}
      </tbody></table></section></div>`;
}

function pageReserva() {
  const h = [...data.reserve.history].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `${cardReserva()}
  <section class="card">${pageHead('Movimentações', 'Depósitos e retiradas da reserva. Contas com a categoria "Reserva" marcadas como pagas entram aqui automaticamente.')}
    <table class="table"><thead><tr><th>Data</th><th>Descrição</th><th class="r">Valor</th></tr></thead><tbody>
    ${h.map((x) => `<tr class="${x.amount >= 0 ? 'income' : ''}"><td class="num">${new Date(x.date).toLocaleDateString('pt-BR')}</td><td>${esc(x.note || (x.amount >= 0 ? 'Depósito' : 'Retirada'))}</td><td class="r amt num ${x.amount < 0 ? 'negc' : ''}">${x.amount >= 0 ? '+ ' : '− '}${money(Math.abs(x.amount))}</td></tr>`).join('') || `<tr><td colspan="3" class="empty-note">Nenhuma movimentação ainda.</td></tr>`}
    </tbody></table></section>`;
}

function pageRenda() {
  const raw = incomesOf(ui.month);
  // diárias do extrato viram uma linha só por pessoa que pagou
  const list = raw.filter((i) => !i.src);
  const groups = new Map();
  raw.filter((i) => i.src).forEach((i) => { const g = groups.get(i.src) || { ...(data.incomes.find((x) => x.id === i.src) || i), id: i.src, amount: 0, days: 0, month: ui.month }; g.amount += i.amount; g.days++; g.day = Math.max(g.day || 1, i.day || 1); groups.set(i.src, g); });
  list.push(...groups.values());
  const multi = isMulti();
  const perPerson = multi ? ' · ' + people().map((p) => `${esc(p.name)}: <b>${money(sum(list.filter((i) => i.owner === p.id)))}</b>`).join(' · ') : '';
  return `<section class="card">${pageHead(L('Minha renda', 'Nossa renda'), `Salário e outras entradas. Total em ${monthLong(ui.month).toLowerCase()}: <b>${money(sum(list))}</b>${perPerson}`, `<button class="btn btn-primary" data-action="add" data-kind="income">${I.plus}Nova renda</button>`)}
    <table class="table"><thead><tr><th>Nome</th>${multi ? '<th>De quem</th>' : ''}<th>Dia</th><th>Recorrência</th><th class="r">Valor</th><th></th></tr></thead><tbody>
    ${list.map((i) => `<tr class="income"><td>${esc(i.name)}</td>${multi ? `<td><span class="cat-dot">${pDot(personOf(i.owner))}${esc(personOf(i.owner).name)}</span></td>` : ''}<td class="num">${pad2(i.day || 1)}</td><td>${recurLabel(i)}</td><td class="r amt num">${money(i.amount)}</td><td>${i.days ? '' : rowActions('edit-income', 'del-income', i.id)}</td></tr>`).join('') || `<tr><td colspan="6" class="empty-note">Nenhuma renda cadastrada.</td></tr>`}
    </tbody></table></section>`;
}

function pageContas() {
  const m = ui.month;
  const all = billsOf(m).filter((b) => b.kind === 'bill');
  const list = ui.billFilter === 'todas' ? all : all.filter((b) => b.category === ui.billFilter);
  const filter = `<select class="filter-select" data-change="bill-filter"><option value="todas">Todas as categorias</option>${catOptions().map(([k, l]) => `<option value="${esc(k)}" ${ui.billFilter === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const multi = isMulti();
  return `<section class="card">${pageHead(L('Minhas contas', 'Contas da casa'), `Contas de ${monthLong(m).toLowerCase()}. Faturas de cartão ficam em Cartões.`, `${filter}<button class="btn" data-action="import-statement">${I.upload}Importar extrato</button><button class="btn btn-primary" data-action="add" data-kind="bill">${I.plus}Nova conta</button>`)}
    <table class="table"><thead><tr><th style="width:40px">Paga</th><th>Conta</th><th>Categoria</th>${multi ? '<th>Quem paga</th><th>Divisão</th>' : ''}<th>Tipo</th><th>Dia</th><th>Recorrência</th><th class="r">Valor</th><th></th></tr></thead><tbody>
    ${list.map((b) => `<tr><td><button class="check ${b.paid ? 'on' : ''}" data-action="toggle-paid" data-id="${esc(b.id)}">${I.check}</button></td><td>${esc(b.name)}</td><td><span class="cat-dot">${catDot(b.category)}${catInfo(b.category).label}</span></td>${multi ? `<td><span class="cat-dot">${pDot(personOf(b.payer))}${esc(personOf(b.payer).name)}</span></td><td>${b.scope === 'casa' ? '<span class="tag info">Da casa</span>' : '<span class="tag neutral">Pessoal</span>'}</td>` : ''}<td>${TYPE_LABEL[b.type]}</td><td class="num">${pad2(b.day)}</td><td>${recurLabel(b)}</td><td class="r amt num">${money(b.amount)}</td><td>${rowActions('edit-bill', 'del-bill', b.id)}</td></tr>`).join('') || `<tr><td colspan="10" class="empty-note">Nenhuma conta aqui.</td></tr>`}
    </tbody><tfoot><tr><td colspan="${multi ? 8 : 6}">Total</td><td class="r num">${money(sum(list))}</td><td></td></tr></tfoot></table></section>`;
}

let backupInfo = null, backupFetched = false;
async function refreshBackup() { backupInfo = await api.backupInfo().catch(() => null); }
const dateBR = (ymd) => ymd.split('-').reverse().join('/');

function backupRows(row) {
  const b = backupInfo;
  if (!b) return row('Backup automático', 'Carregando...', '');
  const info = `Todo dia o Prumo guarda uma cópia sozinho e mantém as dos últimos 14 dias, mais uma por mês.<br>${b.last ? `Última cópia: <b>${dateBR(b.last)}</b> · ${b.count} ${b.count === 1 ? 'cópia guardada' : 'cópias guardadas'}.` : 'Nenhuma cópia ainda.'}<br>${api.mobile ? 'As cópias ficam dentro do app. Se trocar de celular, antes envie um arquivo para o computador.' : `Pasta: <b>${esc(b.folder)}</b>${b.custom ? '' : '<br>Para se proteger se o computador der problema, escolha uma pasta do OneDrive, do Google Drive ou um pendrive.'}`}${b.error ? `<br><span style="color:var(--red)">${esc(b.error)}</span>` : ''}`;
  return row('Backup automático', info, `<button class="btn" data-action="backup-now">Fazer agora</button><button class="btn" data-action="backup-pick">${I.folder}Escolher pasta</button>${b.custom ? '<button class="btn" data-action="backup-reset">Usar a padrão</button>' : ''}<button class="btn" data-action="backup-open">Abrir</button>`)
    + row('Voltar para uma cópia automática', 'Substitui os dados atuais pelos de um dia anterior.', `<button class="btn" data-action="backup-restore" ${b.count ? '' : 'disabled'}>${I.upload}Escolher dia</button>`);
}

function backupRestoreForm() {
  const list = backupInfo?.list || [];
  if (!list.length) return;
  formModal({
    title: 'Voltar para uma cópia automática',
    lead: 'Os dados atuais serão substituídos pelos do dia escolhido. Uma cópia deles fica guardada na pasta de dados. Se a cópia tiver senha, o Prumo vai pedir.',
    fields: [{ name: 'name', label: 'Cópia de qual dia?', type: 'select', value: list[0].name, options: list.map((x) => [x.name, dateBR(x.date)]) }],
    submit: 'Restaurar',
    danger: true,
    onSubmit: async (v) => {
      await saving;
      const r = await api.backupRestore(v.name);
      if (!r.ok) return r.error;
      location.reload();
    },
  });
}

// Metas
function monthsUntil(ym) {
  const [y, m] = ymParts(ym), [ny, nm] = ymParts(ymNow());
  return (y - ny) * 12 + (m - nm) + 1;
}
function goalInfo(g) {
  const left = Math.max(0, Math.round((g.target - g.saved) * 100) / 100);
  const n = g.date ? monthsUntil(g.date) : null;
  return { left, n, p: pct(g.saved, g.target), done: left === 0, late: left > 0 && n !== null && n <= 0, monthly: left > 0 && n > 0 ? left / n : 0 };
}
const goalsMonthly = () => sum(data.goals, (g) => goalInfo(g).monthly);

function goalsVerdict(rows) {
  const need = goalsMonthly();
  if (need <= 0 || !rows.some((r) => r.income > 0)) return null;
  const low = rows.reduce((a, b) => (b.sobra < a.sobra ? b : a));
  const fits = low.sobra >= need;
  return { need, low, fits };
}

function pageMetas() {
  const add = `<button class="btn btn-primary" data-action="goal-new">${I.plus}Nova meta</button>`;
  const head = pageHead('Metas', 'Junte dinheiro para o que você quer: uma viagem, um carro, a entrada da casa.', add);
  if (!data.goals.length) return `<section class="card">${head}<div class="empty-note">Nenhuma meta ainda.<br><br><button class="btn btn-primary" data-action="goal-new">${I.plus}Criar primeira meta</button></div></section>`;
  const saved = sum(data.goals, (g) => g.saved);
  const left = sum(data.goals, (g) => goalInfo(g).left);
  const v = goalsVerdict(forecast(currentView()));
  const cards = data.goals.map((g) => {
    const x = goalInfo(g);
    const recent = [...g.history].reverse().slice(0, 3);
    return `<section class="card goal">
      <div class="goal-top"><h3 class="card-title">${esc(g.name)}</h3>${x.done ? '<span class="tag ok">Atingida</span>' : x.late ? '<span class="tag late">Prazo passou</span>' : ''}<span class="grow"></span><button class="icon-btn sm ghost" data-action="goal-edit" data-id="${esc(g.id)}" title="Editar meta" aria-label="Editar meta">${I.pencil}</button></div>
      <div class="goal-val">${moneyBig(g.saved, 'mb-lg')}<span class="muted">de ${money(g.target)} · <b style="color:var(--green)">${fmtPct(Math.min(x.p, 100))}</b></span></div>
      <div class="progress"><span style="width:${Math.min(x.p, 100)}%"></span></div>
      <div class="reserve-stats">
        <div><div class="label">Falta</div><div class="v num">${money(x.left)}</div></div>
        <div><div class="label">Prazo</div><div class="v">${g.date ? monthShort(g.date) : 'Sem prazo'}</div></div>
        <div><div class="label">Guardar por mês</div><div class="v num">${x.monthly ? money(x.monthly) : '—'}</div></div>
      </div>
      ${recent.length ? `<div class="goal-log">${recent.map((h) => `<div><span>${dateBR(h.date.slice(0, 10))}${h.note ? ` · ${esc(h.note)}` : ''}</span><span class="num">${h.amount > 0 ? '+ ' : '− '}${money(Math.abs(h.amount))}</span></div>`).join('')}</div>` : ''}
      <div class="goal-btns"><button class="btn" data-action="goal-move" data-id="${esc(g.id)}" data-kind="withdraw" ${g.saved > 0 ? '' : 'disabled'}>${I.arrowDown}Retirar</button><button class="btn btn-primary" data-action="goal-move" data-id="${esc(g.id)}" data-kind="deposit">${I.plus}Guardar</button></div>
    </section>`;
  }).join('');
  return `<section class="card">${head}
    <div class="stat-row">
      <div class="card stat"><div class="label">Já guardado</div><div class="v num pos">${money(saved)}</div></div>
      <div class="card stat"><div class="label">Falta juntar</div><div class="v num">${money(left)}</div></div>
      <div class="card stat"><div class="label">Guardar por mês</div><div class="v num">${money(goalsMonthly())}</div></div>
    </div>
    ${v ? `<p class="goal-verdict ${v.fits ? 'ok' : 'bad'}">${v.fits ? `Cabe: até no mês mais apertado (${monthName(v.low.m).toLowerCase()}) a sobra prevista é de ${money(v.low.sobra)}.` : `Não cabe em todos os meses: em ${monthName(v.low.m).toLowerCase()} a sobra prevista é de ${money(v.low.sobra)}. Vale aumentar um prazo ou reduzir um gasto.`}</p>` : ''}
    <p class="label" style="margin:12px 0 0">O dinheiro das metas é só acompanhado aqui: o Prumo não move nada na sua conta.</p>
  </section>
  <div class="goal-grid">${cards}</div>`;
}

function goalForm(g) {
  formModal({
    title: g ? 'Editar meta' : 'Nova meta',
    lead: 'Com um prazo, o Prumo calcula quanto guardar por mês.',
    fields: [
      { name: 'name', label: 'Nome', required: true, value: g?.name || '', placeholder: 'Ex.: Viagem de férias' },
      [{ name: 'target', label: 'Quanto quer juntar (R$)', type: 'money', required: true, value: g?.target ?? '' }, { name: 'saved', label: 'Já tem guardado (R$)', type: 'money', value: g?.saved ?? '' }],
      { name: 'date', label: 'Até quando (opcional)', type: 'month', value: g?.date || '' },
    ],
    submit: g ? 'Salvar' : 'Criar meta',
    onSubmit: (v) => {
      if (!v.target) return 'Informe quanto quer juntar.';
      const date = /^\d{4}-\d{2}$/.test(v.date) ? v.date : '';
      if (g) Object.assign(g, { name: v.name.slice(0, 60), target: v.target, saved: v.saved, date });
      else data.goals.push({ id: uid(), name: v.name.slice(0, 60), target: v.target, saved: v.saved, date, history: [] });
      commit(); toast(g ? 'Meta atualizada' : 'Meta criada');
    },
    onDelete: g ? () => confirmModal('Excluir esta meta?', `"${esc(g.name)}" e o histórico dela serão apagados. Seu dinheiro não é afetado, porque o Prumo só acompanha.`, 'Excluir', () => { data.goals = data.goals.filter((x) => x !== g); commit(); toast('Meta excluída'); }) : undefined,
  });
}

function moveGoal(g, kind, amount, note) {
  const amt = kind === 'deposit' ? amount : -amount;
  g.saved = Math.round((g.saved + amt) * 100) / 100;
  g.history.push({ id: uid(), date: new Date().toISOString(), amount: amt, note });
}

function goalMove(g, kind) {
  const dep = kind === 'deposit';
  formModal({
    title: `${dep ? 'Guardar em' : 'Retirar de'} ${g.name}`,
    lead: `Guardado até agora: <b>${money(g.saved)}</b>`,
    fields: [{ name: 'amount', label: 'Valor (R$)', type: 'money', required: true }, { name: 'note', label: 'Descrição (opcional)', placeholder: dep ? 'Ex.: 13º salário' : 'Ex.: passagem' }],
    onSubmit: (v) => {
      if (!v.amount) return 'Informe um valor maior que zero.';
      if (!dep && v.amount > g.saved) return 'O valor é maior que o guardado nesta meta.';
      moveGoal(g, kind, v.amount, v.note);
      commit(); toast(dep ? 'Valor guardado' : 'Retirada registrada');
    },
  });
}

function pageConfig() {
  const row =(t, d, btns) => `<div class="settings-row"><div><div class="t">${t}</div><div class="d">${d}</div></div><div class="btns">${btns}</div></div>`;
  const ps = people();
  const multi = isMulti();
  const sh = shares(ui.month);
  return `<section class="card">${pageHead('Pessoas', multi ? `${ps.length} pessoas dividem a casa. Contas marcadas como "da casa" são divididas ${SPLIT_LABEL[data.household.split]}.` : 'Só você usa o Prumo. Se morar com alguém, inclua mais pessoas para dividir as contas da casa.', `<button class="btn btn-primary" data-action="setup-people">${I.settings}${multi ? 'Pessoas e divisão' : 'Incluir mais pessoas'}</button>`)}
    ${ps.map((p) => row(`<span class="cat-dot">${avatar(p, 26)} ${esc(p.name)}</span>`, `Dia a dia: <b>${money(p.daily)}</b>/mês${multi ? ` · assume <b>${(sh[p.id] * 100).toFixed(1).replace('.', ',')}%</b> das contas da casa em ${monthName(ui.month).toLowerCase()}` : ''}`, `<button class="btn" data-action="edit-person" data-id="${esc(p.id)}">${I.pencil}Editar</button>`)).join('')}
  </section>
  <section class="card">${pageHead('Preferências')}
    ${row('Referência de moradia', `Percentual máximo da renda que você quer gastar para morar. Atual: <b>${data.settings.housingRef}%</b>`, `<button class="btn" data-action="housing-ref">${I.pencil}Alterar</button>`)}
  </section>
  ${(() => {
    const sec = data.settings.secretary;
    const tog = (k) => `<button class="btn ${sec[k] ? 'btn-primary' : ''}" data-action="sec-toggle" data-key="${k}">${sec[k] ? `${I.check}Ligado` : 'Desligado'}</button>`;
    return `<section class="card">${pageHead('Secretário', api.mobile ? 'O Prumo manda uma notificação às 9h quando uma conta está para vencer ou atrasada.' : 'O Prumo avisa no canto da tela quando uma conta está para vencer ou atrasada — uma vez por dia.', `<button class="btn" data-action="sec-test">${I.bell}Testar aviso</button>`)}
      ${row('Avisos de vencimento', `Avisar ${sec.daysBefore === 0 ? 'no dia do vencimento' : `até <b>${sec.daysBefore} dia${sec.daysBefore > 1 ? 's' : ''} antes</b>`} do vencimento. <button class="link-btn" data-action="sec-days">mudar</button>${store.encrypted ? '<br>Como seus dados têm senha, o aviso não mostra nomes nem valores.' : ''}`, tog('enabled'))}
      ${api.mobile ? '' : `${row('Continuar na bandeja ao fechar', 'Fechar a janela deixa o Prumo no canto da barra de tarefas (perto do relógio), para os avisos continuarem.', tog('tray'))}
      ${row('Abrir junto com o Windows', 'O Prumo abre escondido quando você liga o computador, só para avisar das contas.', tog('startup'))}`}
    </section>`;
  })()}
  ${api.bankReader ? bankSettings(row) : ''}
  <section class="card">${pageHead('Segurança e backup', `Seus dados ficam só neste ${api.mobile ? 'celular' : 'computador'}, num arquivo que nenhum site ou servidor acessa.`)}
    ${store.encrypted
      ? row('Senha', 'Seus dados estão criptografados (AES-256). Sem a senha não dá para abrir — e ela não pode ser recuperada.', `<button class="btn" data-action="pw-change">Trocar senha</button><button class="btn btn-danger" data-action="pw-remove">Remover</button>`)
      : row('Senha', 'Proteja seus dados com uma senha. O arquivo passa a ser criptografado e o app pede a senha ao abrir.', `<button class="btn btn-primary" data-action="pw-set">${I.lock}Definir senha</button>`)}
    ${backupRows(row)}
    ${row(api.mobile ? 'Enviar para o computador' : 'Fazer backup', api.mobile ? 'Cria um arquivo com seus dados e abre as opções de envio (e-mail, Drive, WhatsApp...). No computador, use "Restaurar backup" com esse arquivo. Se você tiver senha, o arquivo também fica protegido por ela.' : 'Salva uma cópia dos seus dados num arquivo (pendrive, nuvem...). Para levar ao celular, envie esse arquivo para ele e use "Restaurar backup" no app. Se você tiver senha, o backup também fica protegido por ela.', `<button class="btn" data-action="export">${I.download}${api.mobile ? 'Enviar arquivo' : 'Salvar backup'}</button>`)}
    ${row('Restaurar backup', 'Substitui os dados atuais pelos de um arquivo de backup do Prumo.', `<button class="btn" data-action="import">${I.upload}Restaurar</button>`)}
    ${row('Pasta dos dados', 'Abre a pasta onde o Prumo guarda o arquivo de dados.', `<button class="btn" data-action="open-folder">${I.folder}Abrir pasta</button>`)}
    ${row('Começar do zero', 'Apaga todas as contas, rendas, cartões e a reserva e pergunta de novo quantas pessoas vão usar. Faça um backup antes.', `<button class="btn btn-danger" data-action="wipe">${I.trash}Apagar tudo</button>`)}
  </section>`;
}

const PAGES = { visao: pageVisao, fluxo: pageFluxo, cartoes: pageCartoes, casa: pageCasa, reserva: pageReserva, metas: pageMetas, previsor: pagePrevisor, renda: pageRenda, contas: pageContas, config: pageConfig };

// Render
let shown = { screen: '', page: '', pop: null };
const PLUMB_SVG = '<svg viewBox="0 0 10 22"><path d="M5 0v14" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="17.5" r="3.6" fill="currentColor"/></svg>';
function render() {
  if (ui.page !== 'config') backupFetched = false;
  else if (!backupFetched) { backupFetched = true; refreshBackup().then(() => { if (ui.page === 'config') render(); }); }
  const main = $('.main');
  const scroll = main ? main.scrollTop : 0;
  const focus = PrumoVoice.saveFocus();
  const screen = `${ui.page}|${ui.month}|${ui.view || ''}`;
  const entering = screen !== shown.screen;
  ui.swing = ui.page !== shown.page;
  $('#app').innerHTML = `${sidebar()}<main class="main${entering ? ' enter' : ''}">${topbar()}${monthStrip()}${PAGES[ui.page]()}</main>`;
  if (ui.pop && ui.pop !== shown.pop) { const p = $('.popover'); if (p) p.classList.add('in'); }
  shown = { screen, page: ui.page, pop: ui.pop };
  PrumoVoice.place(focus);
  $('.main').scrollTop = scroll;
  const strip = $('.m-strip-row'), chosen = strip && strip.querySelector('.on');
  if (chosen) strip.scrollLeft += chosen.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - chosen.offsetWidth) / 2;
}

// Modais
function closeModal() { const r = $('#modal-root'); r.innerHTML = ''; r.hidden = true; imp = null; }

function fieldHTML(f) {
  if (Array.isArray(f)) return `<div class="field-row">${f.map(fieldHTML).join('')}</div>`;
  const id = 'f_' + f.name;
  const v = f.value ?? '';
  if (f.type === 'checkbox') return `<div class="field check-field"><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}><label for="${id}">${esc(f.label)}</label></div>`;
  let input;
  if (f.type === 'select') input = `<select id="${id}" name="${f.name}">${f.options.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`;
  else if (f.type === 'money') input = `<input id="${id}" name="${f.name}" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${esc(typeof v === 'number' ? moneyInput(v) : v)}">`;
  else input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" autocomplete="off" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}>`;
  return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
}

function formModal({ title, lead, fields, submit = 'Salvar', danger = false, onSubmit, onDelete }) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-backdrop><form class="modal" id="mform" novalidate>
    <h3>${esc(title)}</h3>${lead ? `<p class="lead">${lead}</p>` : '<div style="height:14px"></div>'}
    ${fields.map(fieldHTML).join('')}
    <p class="form-error"></p>
    <div class="modal-actions">${onDelete ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="grow"></span>
      <button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(submit)}</button></div>
  </form></div>`;
  root.hidden = false;
  const form = $('#mform');
  const first = form.querySelector('input:not([type=checkbox]), select');
  if (first) setTimeout(() => first.focus(), 30);
  const conditional = fields.flat().filter((f) => f.showIf);
  const isShown = (f) => (typeof f.showIf === 'function' ? f.showIf(form) : form.elements[f.showIf[0]].value === f.showIf[1]);
  const syncConditional = (changed) => conditional.forEach((f) => {
    const el = form.elements[f.name];
    const wrap = el.closest('.field');
    const was = wrap.style.display !== 'none';
    const show = isShown(f);
    wrap.style.display = show ? '' : 'none';
    const row = wrap.closest('.field-row');
    if (row) row.style.display = [...row.querySelectorAll('.field')].some((x) => x.style.display !== 'none') ? '' : 'none';
    if (show && !was && changed && typeof f.showIf !== 'function') el.focus();
  });
  if (conditional.length) { syncConditional(false); form.addEventListener('change', () => syncConditional(true)); form.addEventListener('input', () => syncConditional(false)); }
  if (onDelete) form.querySelector('[data-del]').addEventListener('click', () => { closeModal(); onDelete(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vals = {};
    let err = null;
    for (const f of fields.flat()) {
      const el = form.elements[f.name];
      let v;
      if (f.type === 'checkbox') v = el.checked;
      else if (f.type === 'money') v = el.value.trim() === '' ? (f.required ? NaN : 0) : parseMoney(el.value);
      else if (f.type === 'number') v = el.value === '' ? NaN : Number(el.value);
      else v = el.value.trim();
      if (!err && f.required && (v === '' || (typeof v === 'number' && Number.isNaN(v)))) err = `Preencha "${f.label}".`;
      if (!err && f.type === 'money' && Number.isNaN(v)) err = `Valor inválido em "${f.label}". Use, por exemplo, 1.250,90`;
      if (!err && f.type === 'money' && v < 0) err = `"${f.label}" não pode ser negativo.`;
      if (!err && f.type === 'number' && !Number.isNaN(v) && ((f.min != null && v < f.min) || (f.max != null && v > f.max))) err = `"${f.label}" deve ficar entre ${f.min} e ${f.max}.`;
      vals[f.name] = v;
    }
    if (err) { form.querySelector('.form-error').textContent = err; return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const res = await onSubmit(vals);
    btn.disabled = false;
    if (typeof res === 'string') form.querySelector('.form-error').textContent = res;
    else closeModal();
  });
}

function confirmModal(title, text, okLabel, onOk) {
  formModal({ title, lead: text, fields: [], submit: okLabel, danger: true, onSubmit: () => { onOk(); } });
}

// Formulários
const defaultPerson = () => { const v = currentView(); return v === 'casa' ? people()[0].id : v; };
function whoFields(scope, payer, scopeLabel = 'Divisão', payerLabel = 'Quem paga') {
  if (!isMulti()) return [];
  return [[
    { name: 'scope', label: scopeLabel, type: 'select', options: [['casa', 'Da casa (dividida)'], ['pessoal', 'Pessoal (só de quem paga)']], value: scope },
    { name: 'payer', label: payerLabel, type: 'select', options: personOptions(), value: payer },
  ]];
}

function billForm(bill, preset = {}) {
  const b = bill || { name: preset.name || '', amount: preset.amount || '', day: preset.day || 10, category: preset.cat || 'outros', type: 'fixa', payer: defaultPerson(), scope: preset.cat === 'moradia' || currentView() === 'casa' ? 'casa' : 'pessoal' };
  formModal({
    title: bill ? 'Editar conta' : 'Nova conta',
    lead: isMulti() ? 'Contas <b>da casa</b> são divididas entre todos; quem paga recebe de volta a diferença no acerto do mês.' : '',
    fields: [
      { name: 'name', label: 'Nome', value: b.name, required: true, placeholder: 'Ex.: Aluguel' },
      [{ name: 'amount', label: 'Valor (R$)', type: 'money', value: b.amount, required: true }, { name: 'day', label: 'Dia do vencimento', type: 'number', min: 1, max: 31, value: b.day, required: true }],
      [{ name: 'category', label: 'Categoria', type: 'select', options: catOptions('Outros (escrever qual)'), value: b.category }, { name: 'type', label: 'Tipo', type: 'select', options: [['fixa', 'Fixa (mesmo valor)'], ['variavel', 'Variável (muda todo mês)']], value: b.type }],
      { name: 'customCat', label: 'Qual categoria?', placeholder: 'Ex.: Pet, Presentes, Viagem', hint: 'Fica salva para você usar de novo. Em branco, conta como "Outros".', showIf: ['category', 'outros'] },
      ...whoFields(b.scope, b.payer),
      { name: 'recurring', label: `Repete todo mês (desmarque para lançar só em ${monthLong(b.month || ui.month).toLowerCase()})`, type: 'checkbox', value: !b.month },
    ],
    onSubmit: (v) => {
      const obj = bill ? data.bills.find((x) => x.id === bill.id) : { id: uid() };
      let category = v.category;
      if (category === 'outros' && v.customCat) {
        const label = v.customCat.replace(/\s+/g, ' ').slice(0, 30);
        const builtIn = Object.entries(CATS).find(([k, c]) => !['cartao', 'diaadia'].includes(k) && c.label.toLowerCase() === label.toLowerCase());
        const existing = Object.entries(data.customCats).find(([, c]) => c.label.toLowerCase() === label.toLowerCase());
        if (builtIn) category = builtIn[0];
        else if (existing) category = existing[0];
        else {
          category = 'c_' + uid();
          data.customCats[category] = { label, color: CUSTOM_COLORS[Object.keys(data.customCats).length % CUSTOM_COLORS.length] };
        }
      }
      Object.assign(obj, { name: v.name, amount: v.amount, day: v.day, category, type: v.type });
      if (isMulti()) { obj.scope = v.scope; obj.payer = v.payer; } else if (!bill) { obj.scope = 'pessoal'; obj.payer = people()[0].id; }
      if (v.recurring) delete obj.month; else obj.month = bill?.month || ui.month;
      if (!bill) data.bills.push(obj);
      commit(); toast(bill ? 'Conta atualizada' : 'Conta adicionada');
    },
    onDelete: bill ? () => delBill(bill.id) : null,
  });
}
function delBill(id) {
  const b = data.bills.find((x) => x.id === id);
  if (!b) return;
  confirmModal('Excluir conta?', `"${esc(b.name)}" será removida de todos os meses.`, 'Excluir', () => {
    data.bills = data.bills.filter((x) => x.id !== id);
    Object.values(data.payments).forEach((p) => delete p[id]);
    commit(); toast('Conta excluída');
  });
}

function incomeForm(inc) {
  const i = inc || { name: '', amount: '', day: 5, owner: defaultPerson() };
  formModal({
    title: inc ? 'Editar renda' : 'Nova renda',
    fields: [
      isMulti()
        ? [{ name: 'name', label: 'Nome', value: i.name, required: true, placeholder: 'Ex.: Salário' }, { name: 'owner', label: 'De quem', type: 'select', options: personOptions(), value: i.owner }]
        : { name: 'name', label: 'Nome', value: i.name, required: true, placeholder: 'Ex.: Salário' },
      [{ name: 'amount', label: 'Valor líquido (R$)', type: 'money', value: i.amount, required: true }, { name: 'day', label: 'Dia em que cai', type: 'number', min: 1, max: 31, value: i.day || 5, required: true }],
      { name: 'recurring', label: `Repete todo mês (desmarque se for só em ${monthLong(i.month || ui.month).toLowerCase()})`, type: 'checkbox', value: !i.month },
    ],
    onSubmit: (v) => {
      const obj = inc ? data.incomes.find((x) => x.id === inc.id) : { id: uid() };
      Object.assign(obj, { name: v.name, amount: v.amount, day: v.day, owner: isMulti() ? v.owner : (obj.owner || people()[0].id) });
      if (v.recurring) delete obj.month; else obj.month = inc?.month || ui.month;
      if (!inc) data.incomes.push(obj);
      commit(); toast(inc ? 'Renda atualizada' : 'Renda adicionada');
    },
    onDelete: inc ? () => confirmModal('Excluir renda?', `"${esc(inc.name)}" será removida.`, 'Excluir', () => { data.incomes = data.incomes.filter((x) => x.id !== inc.id); commit(); }) : null,
  });
}

function cardForm(card) {
  const c = card || { name: '', bank: 'nubank', style: 'banco', dueDay: 10, limit: '', owner: defaultPerson(), scope: 'pessoal' };
  formModal({
    title: card ? 'Editar cartão' : 'Novo cartão',
    fields: [
      { name: 'bank', label: 'Banco', type: 'select', options: BANKS.map((b) => [b[0], b[1]]), value: c.bank || 'outro' },
      [{ name: 'name', label: 'Nome do cartão (opcional)', value: c.name, placeholder: 'Ex.: Ultravioleta, Black...', hint: 'Em branco, usa o nome do banco.' }, { name: 'last4', label: 'Últimos 4 dígitos (opcional)', value: c.last4 || '', placeholder: '1234', hint: 'Só para identificar o cartão.' }],
      [{ name: 'style', label: 'Cor', type: 'select', options: CARD_STYLES, value: c.style }, { name: 'dueDay', label: 'Dia do vencimento', type: 'number', min: 1, max: 31, value: c.dueDay, required: true }],
      [{ name: 'limit', label: 'Limite total (R$)', type: 'money', value: c.limit }, { name: 'invoice', label: `Fatura de ${monthName(ui.month).toLowerCase()} (R$)`, type: 'money', value: card ? invoiceOf(card, ui.month) : '' }],
      ...whoFields(c.scope, c.owner, 'A fatura é', 'Titular (quem paga)'),
    ],
    onSubmit: (v) => {
      const obj = card ? data.cards.find((x) => x.id === card.id) : { id: uid(), invoices: {} };
      const last4 = v.last4.replace(/\D/g, '');
      if (v.last4 && last4.length !== 4) return 'Digite exatamente os 4 últimos números do cartão (ou deixe em branco).';
      const bank = BANKS.find((b) => b[0] === v.bank);
      const name = v.name || (bank && bank[0] !== 'outro' ? bank[1] : '');
      if (!name) return 'Dê um nome ao cartão ou escolha o banco.';
      Object.assign(obj, { name, bank: v.bank, style: v.style, dueDay: v.dueDay, limit: v.limit || 0 });
      if (isMulti()) { obj.scope = v.scope; obj.owner = v.payer; } else if (!card) { obj.scope = 'pessoal'; obj.owner = people()[0].id; }
      if (last4) obj.last4 = last4; else delete obj.last4;
      if (v.invoice) obj.invoices[ui.month] = v.invoice; else delete obj.invoices[ui.month];
      if (!card) data.cards.push(obj);
      commit(); toast(card ? 'Cartão atualizado' : 'Cartão adicionado');
    },
    onDelete: card ? () => delCard(card.id) : null,
  });
}
function subForm(sub) {
  const x = sub || { service: 'netflix', name: '', amount: '', cycle: 'mensal', day: new Date().getDate(), month: ymParts(ymNow())[1], pay: data.cards[0]?.id || 'conta', payer: defaultPerson(), scope: 'pessoal' };
  const payOpts = [['conta', 'Pix, boleto ou débito em conta'], ...data.cards.map((c) => [c.id, `Cartão ${c.name}${cardDigits(c)}`])];
  formModal({
    title: sub ? 'Editar assinatura' : 'Nova assinatura',
    lead: 'No cartão, o valor já faz parte da fatura e não é somado de novo. No Pix, boleto ou débito, entra nas contas do mês.',
    fields: [
      { name: 'service', label: 'Serviço', type: 'select', options: SERVICES.map((s) => [s[0], s[1]]), value: x.service },
      { name: 'name', label: 'Nome', value: x.service === 'outro' ? x.name : '', placeholder: 'Ex.: Clube do livro', showIf: ['service', 'outro'] },
      [{ name: 'amount', label: 'Valor (R$)', type: 'money', value: x.amount, required: true }, { name: 'cycle', label: 'Cobrança', type: 'select', options: [['mensal', 'Todo mês'], ['anual', 'Uma vez por ano']], value: x.cycle }],
      [{ name: 'day', label: 'Dia da cobrança', type: 'number', min: 1, max: 31, value: x.day, required: true }, { name: 'month', label: 'Mês da cobrança', type: 'select', options: MESES.map((n, i) => [i + 1, n]), value: x.month || ymParts(ymNow())[1], showIf: ['cycle', 'anual'] }],
      { name: 'pay', label: 'Forma de pagamento', type: 'select', options: payOpts, value: data.cards.some((c) => c.id === x.pay) ? x.pay : 'conta' },
      ...whoFields(x.scope, x.payer),
      ...(sub ? [{ name: 'paused', label: 'Pausada (para de contar até você desmarcar)', type: 'checkbox', value: !!sub.paused }] : []),
    ],
    onSubmit: (v) => {
      const sv = SERVICES.find((s) => s[0] === v.service);
      const name = (v.service === 'outro' ? v.name : sv[1]).replace(/\s+/g, ' ').slice(0, 40);
      if (!name) return 'Dê um nome à assinatura.';
      if (!v.amount) return 'Informe o valor da assinatura.';
      const obj = sub ? data.subs.find((s) => s.id === sub.id) : { id: uid(), start: ymNow() };
      Object.assign(obj, { service: v.service, name, amount: v.amount, cycle: v.cycle, day: v.day, month: Number(v.month), pay: v.pay });
      if (v.paused) obj.paused = true; else delete obj.paused;
      if (v.service === 'outro' && !obj.color) obj.color = SUB_COLORS[data.subs.length % SUB_COLORS.length];
      if (isMulti()) { obj.scope = v.scope; obj.payer = v.payer; } else { obj.scope = 'pessoal'; obj.payer = people()[0].id; }
      if (!sub) data.subs.push(obj);
      commit(); toast(sub ? 'Assinatura atualizada' : 'Assinatura adicionada');
    },
    onDelete: sub ? () => delSub(sub.id) : null,
  });
}
function delSub(id) {
  const s = data.subs.find((x) => x.id === id);
  if (!s) return;
  confirmModal('Excluir assinatura?', `"${esc(s.name)}" deixa de aparecer em todos os meses. Para parar só por um tempo, use Pausar.`, 'Excluir', () => {
    data.subs = data.subs.filter((x) => x.id !== id);
    Object.values(data.payments).forEach((p) => delete p['sub:' + id]);
    commit(); toast('Assinatura excluída');
  });
}

function delCard(id) {
  const c = data.cards.find((x) => x.id === id);
  const subsHere = data.subs.filter((s) => s.pay === id).length;
  confirmModal('Excluir cartão?', `"${esc(c.name)}" e todas as faturas lançadas nele serão removidos.${subsHere ? ` ${subsHere === 1 ? 'A assinatura cobrada nele passa' : `As ${subsHere} assinaturas cobradas nele passam`} para Pix, boleto ou débito.` : ''}`, 'Excluir', () => {
    data.subs.forEach((s) => { if (s.pay === id) s.pay = 'conta'; });
    data.cards = data.cards.filter((x) => x.id !== id);
    Object.values(data.payments).forEach((p) => delete p['card:' + id]);
    ui.cardIdx = 0; commit(); toast('Cartão excluído');
  });
}

function invoiceForm() {
  if (!data.cards.length) { cardForm(); return; }
  formModal({
    title: 'Lançar fatura',
    fields: [
      { name: 'card', label: 'Cartão', type: 'select', options: data.cards.map((c) => [c.id, c.name]), value: (visibleCards()[ui.cardIdx] || data.cards[0]).id },
      [{ name: 'month', label: 'Mês da fatura', type: 'month', value: ui.month, required: true }, { name: 'amount', label: 'Valor (R$)', type: 'money', required: true }],
    ],
    onSubmit: (v) => {
      if (!/^\d{4}-\d{2}$/.test(v.month)) return 'Escolha o mês da fatura.';
      const c = data.cards.find((x) => x.id === v.card);
      c.invoices[v.month] = v.amount;
      commit(); toast('Fatura lançada');
    },
  });
}

function reserveMove(kind) {
  const dep = kind === 'deposit';
  formModal({
    title: dep ? 'Guardar na reserva' : 'Retirar da reserva',
    lead: `Saldo atual: <b>${money(data.reserve.balance)}</b>`,
    fields: [{ name: 'amount', label: 'Valor (R$)', type: 'money', required: true }, { name: 'note', label: 'Descrição (opcional)', placeholder: dep ? 'Ex.: 13º salário' : 'Ex.: conserto do carro' }],
    onSubmit: (v) => {
      if (!v.amount) return 'Informe um valor maior que zero.';
      if (!dep && v.amount > data.reserve.balance) return 'O valor é maior que o saldo da reserva.';
      const amt = dep ? v.amount : -v.amount;
      data.reserve.balance = Math.round((data.reserve.balance + amt) * 100) / 100;
      data.reserve.history.push({ id: uid(), date: new Date().toISOString(), amount: amt, note: v.note });
      commit(); toast(dep ? 'Valor guardado' : 'Retirada registrada');
    },
  });
}
function reserveGoal() {
  formModal({
    title: 'Meta da reserva',
    lead: 'Uma boa referência para reserva de emergência é de 6 meses dos seus gastos.',
    fields: [{ name: 'goal', label: 'Meta (R$)', type: 'money', value: data.reserve.goal }, { name: 'balance', label: 'Quanto você já tem guardado (R$)', type: 'money', value: data.reserve.balance }],
    onSubmit: (v) => { data.reserve.goal = v.goal; data.reserve.balance = v.balance; commit(); },
  });
}

function togglePaid(id) {
  setPaid(ui.month, id, !isPaid(ui.month, id));
  commit();
}
function setPaid(m, id, now) {
  data.payments[m] ||= {};
  if (!!data.payments[m][id] === now) return;
  if (now) data.payments[m][id] = true; else delete data.payments[m][id];
  const b = data.bills.find((x) => x.id === id);
  if (b && b.category === 'reserva') {
    const key = `${m}:${id}`;
    if (now) {
      data.reserve.balance = Math.round((data.reserve.balance + b.amount) * 100) / 100;
      data.reserve.history.push({ id: uid(), date: new Date().toISOString(), amount: b.amount, note: `${b.name} (${monthShort(m)})`, billKey: key });
    } else {
      const h = data.reserve.history.find((x) => x.billKey === key);
      if (h) {
        data.reserve.balance = Math.round((data.reserve.balance - h.amount) * 100) / 100;
        data.reserve.history = data.reserve.history.filter((x) => x !== h);
      }
    }
  }
}

// Importar extrato
let imp = null;
const IGNORE_RE = /(pagamento (de |da )?fatura|pagto fatura|pagamento recebido|transf(erencia)? entre contas|aplicacao|resgate|estorno)/;

async function importDropped(file) {
  if (!/\.(ofx|qfx|csv|txt|pdf)$/i.test(file.name)) { toast('Use um arquivo PDF, OFX ou CSV'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('Arquivo grande demais (máximo 5 MB).'); return; }
  const buf = new Uint8Array(await file.arrayBuffer());
  if (isPdf(buf, file.name)) { startImport({ ok: true, name: file.name, bytes: buf }); return; }
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf); // muitos bancos usam Windows-1252
  startImport({ ok: true, name: file.name, text });
}

// PDF
const isPdf = (bytes, name) => /\.pdf$/i.test(name || '') || (bytes && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
let pdfReady = null;
function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
}
async function pdfLines(bytes) {
  // o leitor roda na própria página, sem Worker separado
  pdfReady ||= loadScript('vendor/pdf.worker.min.js').then(() => loadScript('vendor/pdf.min.js'));
  await pdfReady;
  const pdf = await window.pdfjsLib.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
  const lines = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 40); p++) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent();
    const rows = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5], h = Math.abs(it.transform[3]) || 8;
      let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2, h * 0.35));
      if (!row) { row = { y, parts: [] }; rows.push(row); }
      row.parts.push({ x, w: it.width || it.str.length * h * 0.5, s: it.str, h });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.parts.sort((a, b) => a.x - b.x);
      let text = '', end = null;
      for (const pt of r.parts) {
        if (end !== null) text += pt.x - end > pt.h * 0.9 ? '  ' : pt.x - end > pt.h * 0.15 ? ' ' : '';
        text += pt.s; end = pt.x + pt.w;
      }
      lines.push(text);
    }
  }
  await pdf.destroy();
  return lines;
}

async function startImport(given) {
  ui.pop = null; render();
  const res = given || await api.pickStatement();
  if (!res.ok) { if (res.error) toast(res.error); return; }
  let parsed;
  if (res.bytes) {
    toast('Lendo o PDF...');
    try { parsed = Statement.parsePDFLines(await pdfLines(res.bytes)); } catch { parsed = { rows: [] }; }
    clearTimeout(toastTimer); $('#toast').hidden = true;
  } else {
    try { parsed = Statement.parse(res.text, res.name); } catch { parsed = { rows: [] }; }
  }
  if (!parsed.rows.length) {
    formModal({ title: 'Não reconheci esse extrato', lead: res.bytes ? 'Não encontrei lançamentos nesse PDF. Se ele for uma foto ou digitalização, não dá para ler: baixe o extrato em PDF pelo app ou site do banco, ou use <b>OFX</b> ou <b>CSV</b>.' : 'Use o extrato em <b>PDF</b>, <b>OFX</b> ou <b>CSV</b> que o app ou site do banco oferece em "Exportar extrato".', fields: [], submit: 'Entendi', onSubmit: () => {} });
    return;
  }
  const pos = parsed.rows.filter((r) => r.amount > 0);
  // muitas entradas de Pix/transferência = extrato de conta (ex.: quem recebe por dia), não fatura
  const incoming = pos.filter((r) => /\b(recebid[oa]|deposito|salario|pix|transferencia|ted|doc)\b/.test(Statement.norm(r.desc))).length;
  const invert = parsed.kind === 'PDF' ? parsed.card : parsed.kind === 'CSV' && pos.length / parsed.rows.length > 0.7 && incoming < pos.length * 0.3;
  const lastMonth = parsed.rows.map((r) => r.date.slice(0, 7)).sort().pop();
  imp = { name: res.name, kind: parsed.kind, rows: parsed.rows, invert, owner: defaultPerson(), cardId: data.cards[0]?.id || '', cardMonth: addMonths(lastMonth, 1) };
  suggestImport();
  renderImport();
}

// Mesmo lugar, valor parecido, em outro mês (no extrato ou já lançado antes)
const closeAmt = (a, b) => Math.abs(a - b) <= Math.max(2, Math.max(a, b) * 0.1);
const BOLETO_RE = /\b(boleto|debito automatico|deb aut|convenio)\b/;
const TRANSF_RE = /\b(pix|transferencia|ted|doc)\b/;
// Pago como conta (boleto, débito automático, ou Pix alto que não é compra do dia a dia)
const billLike = (r) => { const t = Statement.norm(r.desc); return BOLETO_RE.test(t) || (TRANSF_RE.test(t) && Math.abs(r.amount) >= 100 && !['transporte', 'alimentacao', 'compras', 'lazer', 'cuidados'].includes(r.cat)); };
function historyIndex(rows) {
  const idx = new Map();
  const add = (desc, amt, m) => { const k = Statement.merchantKey(desc || ''); if (k.length >= 3) { if (!idx.has(k)) idx.set(k, []); idx.get(k).push([m, Math.abs(amt)]); } };
  rows.forEach((x) => add(x.desc, x.amount, x.date.slice(0, 7)));
  for (const m in data.spending) data.spending[m].forEach((x) => add(x.desc, x.amount, m));
  data.bills.forEach((b) => { if (b.imported && b.month) add(b.name, b.amount, b.month); });
  return idx;
}
function repeatsMonthly(r, idx) {
  const k = Statement.merchantKey(r.desc), v = Math.abs(r.amount);
  if (k.length < 3 || Statement.isPerson(r.desc)) return false;
  return (idx.get(k) || []).some(([m, a]) => m !== r.m && closeAmt(a, v));
}
// Nome curto para a conta fixa
const cleanName = (desc) => { const k = Statement.merchantKey(desc); return k ? k.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40) : desc.slice(0, 40); };

function suggestImport() {
  const used = new Set(), hist = historyIndex(imp.rows);
  for (const r of imp.rows) {
    r.amt = imp.invert ? -r.amount : r.amount;
    r.m = r.date.slice(0, 7);
    r.dup = !!data.imported[r.key];
    r.cat = Statement.guessCategory(r.desc, data.learnedCats);
    r.match = null;
    const isIgnorable = IGNORE_RE.test(Statement.norm(r.desc));
    const service = guessService(r.desc) || (r.cat === 'assinaturas' || SUB_EXTRA.test(Statement.norm(r.desc)) ? 'outro' : null);
    const repeats = !r.dup && !isIgnorable && r.amt < 0 && repeatsMonthly(r, hist);
    const boleto = billLike(r);
    // repetição de compra só vira assinatura se não for de outra categoria (Uber, mercado...)
    const subRepeat = repeats && !boleto && !TRANSF_RE.test(Statement.norm(r.desc)) && ['outros', 'assinaturas'].includes(r.cat);
    // auto: o Prumo reconheceu sozinho
    r.auto = r.dup || isIgnorable || !!service || (repeats && boleto) || r.cat !== 'outros';
    if (imp.invert) { r.action = r.dup || isIgnorable ? 'ignorar' : service || subRepeat ? 'assinatura' : 'fatura'; continue; }
    if (r.amt < 0) {
      const v = -r.amt;
      const cands = billsOf(r.m).filter((b) => !b.paid && !used.has(r.m + b.id) && Math.abs(b.amount - v) <= Math.max(1, b.amount * 0.02))
        .map((b) => ({ b, sim: Statement.similar(r.desc, b.name), diff: Math.abs(b.amount - v) }))
        .filter((x) => x.sim || x.diff < 0.01)
        .sort((a, b) => (b.sim - a.sim) || a.diff - b.diff);
      if (cands[0]) { r.match = cands[0].b; used.add(r.m + r.match.id); r.auto = true; }
      r.action = r.dup ? 'ignorar' : r.match ? 'pay' : isIgnorable ? 'ignorar' : service ? 'assinatura' : repeats && boleto ? 'fixa' : subRepeat ? 'assinatura' : 'diaadia';
    } else {
      r.action = 'ignorar'; // entradas: salário etc. já estão cadastrados
    }
  }
  if (!imp.invert) markDaily(imp.rows);
  imp.missing = imp.invert ? [] : missingBills(imp.rows);
}

// Diárias: 3 ou mais entradas parecidas da mesma origem no mesmo mês (ex.: R$ 50 por dia trabalhado)
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
function markDaily(rows) {
  const groups = new Map();
  rows.forEach((r) => { r.daily = null; });
  for (const r of rows) {
    if (r.amt <= 0 || r.dup || IGNORE_RE.test(Statement.norm(r.desc))) continue;
    const k = Statement.merchantKey(r.desc);
    if (k.length < 3) continue;
    const g = k + '|' + r.m;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  const known = new Map(data.incomes.filter((i) => i.daily).map((i) => [i.key, i.rate]));
  for (const list of groups.values()) {
    const k = Statement.merchantKey(list[0].desc);
    if (known.has(k)) { // já reconhecida antes: vale mesmo com poucas entradas
      list.filter((r) => Math.abs(r.amt - known.get(k)) <= known.get(k) * 0.35).forEach((r) => { r.daily = k; r.action = 'renda'; r.auto = true; });
      continue;
    }
    if (list.length < 3) continue;
    const md = median(list.map((r) => r.amt));
    if (md < 10 || md > 1000) continue;
    const near = list.filter((r) => Math.abs(r.amt - md) <= md * 0.35);
    if (near.length < 3) continue;
    near.forEach((r) => { r.daily = Statement.merchantKey(r.desc); r.action = 'renda'; r.auto = true; });
  }
}

// Contas fixas que venceram dentro do período do extrato e não apareceram nele
function missingBills(rows) {
  const dates = rows.map((r) => r.date).sort();
  const from = dates[0], to = dates[dates.length - 1], out = [];
  const asked = data.askedMissing || {};
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = addMonths(m, 1)) {
    for (const b of billsOf(m)) {
      if (b.paid || b.kind === 'card' || (b.kind === 'bill' && b.month) || asked[m + '|' + b.id]) continue;
      const src = b.kind === 'sub' ? data.subs.find((s) => s.id === b.subId) : data.bills.find((x) => x.id === b.id);
      if (!src || !src.seen) continue; // só o que costuma vir no extrato
      const due = `${m}-${pad2(b.day)}`;
      if (due < from || due > to) continue;
      out.push({ m, id: b.id, kind: b.kind, subId: b.subId, name: b.name, amount: b.amount, due, answer: '' });
    }
  }
  return out;
}

function renderImport() {
  const multi = isMulti();
  const optsFor = (r) => {
    if (imp.invert) return r.amt < 0 ? [['fatura', 'Somar na fatura'], ['assinatura', 'Assinatura (soma na fatura)'], ['ignorar', 'Não registrar']] : [['fatura', 'Somar na fatura'], ['ignorar', 'Não registrar']];
    if (r.amt < 0) return [...(r.match ? [['pay', `É a conta "${r.match.name}" (dar como paga)`]] : []), ['diaadia', 'Compra do dia a dia'], ['fixa', 'Conta fixa (repete todo mês)'], ['assinatura', 'Assinatura (repete todo mês)'], ['conta', 'Conta paga só neste mês'], ['ignorar', 'Não registrar']];
    return [['renda', 'Dinheiro que entrou (renda extra)'], ['ignorar', 'Não registrar']];
  };
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const sel = (attrs, opts, v) => `<select ${attrs}>${opts.map(([k, l]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const cats = catOptions();
  const counts = { pay: 0, diaadia: 0, conta: 0, fixa: 0, renda: 0, fatura: 0, assinatura: 0, ignorar: 0 };
  imp.rows.forEach((r) => { counts[r.action]++; });
  counts.fixa = new Set(imp.rows.filter((r) => r.action === 'fixa').map((r) => Statement.merchantKey(r.desc))).size; // uma por lugar
  const cardTotal = -sum(imp.rows.filter((r) => r.action === 'fatura' || r.action === 'assinatura'), (r) => r.amt);
  const dates = imp.rows.map((r) => r.date).sort();
  const months = Array.from({ length: 4 }, (_, i) => addMonths(dates[dates.length - 1].slice(0, 7), i - 1));
  const cols = imp.invert ? 4 : 5;
  const row = (r, i) => `<tr class="imp-row ${r.action === 'ignorar' ? 'muted-row' : ''}"><td class="num imp-d">${r.date.slice(8)}/${r.date.slice(5, 7)}</td><td class="imp-desc">${esc(r.desc)}${r.dup ? ' <span class="tag neutral">já importado</span>' : ''}${r.daily && r.action === 'renda' ? ' <span class="tag ok">diária</span>' : ''}</td><td class="r amt num ${r.amt > 0 ? 'pos' : ''}">${r.amt > 0 ? '+ ' : '− '}${money(Math.abs(r.amt))}</td>
        <td class="imp-act">${sel(`class="filter-select" data-imp="action" data-i="${i}"`, optsFor(r), r.action)}</td>
        ${imp.invert ? '' : `<td class="imp-cat">${['diaadia', 'conta', 'fixa'].includes(r.action) ? sel(`class="filter-select" data-imp="cat" data-i="${i}"`, cats, r.cat) : r.action === 'assinatura' ? '<span class="muted">Assinaturas</span>' : '<span class="muted">—</span>'}</td>`}</tr>`;
  const withIdx = imp.rows.map((r, i) => [r, i]);
  const review = withIdx.filter(([r]) => !r.auto), auto = withIdx.filter(([r]) => r.auto);
  const section = (list, kind, title, hint) => (list.length ? `<tbody class="imp-sec ${kind}"><tr class="imp-sec-head"><td colspan="${cols}"><div class="imp-sec-title">${title}</div><div class="imp-sec-hint">${hint}</div></td></tr>
      ${list.map(([r, i]) => row(r, i)).join('')}</tbody>` : '');
  // Contas que não vieram no extrato (some se a pessoa ligar um lançamento a ela)
  const missing = (imp.missing || []).map((x, i) => [x, i]).filter(([x]) => !imp.rows.some((r) => r.action === 'pay' && r.match && r.match.id === x.id && r.m === x.m));
  const MISS_OPTS = [['', 'Escolha o que aconteceu'], ['paguei', 'Já paguei de outro jeito'], ['vou', 'Ainda vou pagar'], ['acabou', 'Acabou, não vem mais']];
  const missRow = ([x, i]) => `<tr class="imp-row"><td class="num imp-d">${x.due.slice(8)}/${x.due.slice(5, 7)}</td><td class="imp-desc"><b>${esc(x.name)}</b> não apareceu no extrato de ${monthLong(x.m).toLowerCase()}. O que aconteceu?</td><td class="r amt num">− ${money(x.amount)}</td>
        <td class="imp-act" ${imp.invert ? '' : 'colspan="2"'}>${sel(`class="filter-select" data-imp="miss" data-i="${i}"`, x.kind === 'sub' ? MISS_OPTS.map(([k, l]) => [k, k === 'acabou' ? 'Cancelei a assinatura' : l]) : MISS_OPTS, x.answer)}</td></tr>`;
  const missSection = missing.length ? `<tbody class="imp-sec miss"><tr class="imp-sec-head"><td colspan="${cols}"><div class="imp-sec-title">${I.info}Não apareceram no extrato <span class="muted">· ${missing.length}</span></div><div class="imp-sec-hint">Venceram nessas datas, mas não achei o pagamento. Se não escolher nada, continuam como estão.</div></td></tr>${missing.map(missRow).join('')}</tbody>` : '';
  const still = $('#impmodal') ? ' still' : ''; // redesenho da mesma janela: sem animar de novo
  $('#modal-root').innerHTML = `<div class="modal-backdrop${still}" data-backdrop><div class="modal wide${still}" id="impmodal">
    <h3>Importar extrato</h3>
    <p class="lead">${esc(imp.name)} · ${imp.kind} · ${imp.rows.length} lançamentos de ${new Date(dates[0] + 'T12:00').toLocaleDateString('pt-BR')} a ${new Date(dates[dates.length - 1] + 'T12:00').toLocaleDateString('pt-BR')}. Confira o que o Prumo sugeriu e ajuste se precisar.</p>
    <div class="imp-opts">
      <label class="field check-field"><input type="checkbox" data-imp="invert" ${imp.invert ? 'checked' : ''}><span>É extrato de <b>cartão de crédito</b> (compras aparecem como valores positivos)</span></label>
      ${multi && !imp.invert ? `<label class="imp-inline">Extrato de ${sel('data-imp="owner"', personOptions(), imp.owner)}</label>` : ''}
    </div>
    ${imp.invert ? `<div class="banner" style="margin-bottom:12px">${I.info}<div class="grow">Compras no cartão já entram no saldo pela <b>fatura</b>, então elas não viram gastos separados (contaria duas vezes). O Prumo soma as compras e lança como fatura:</div></div>
      <div class="imp-opts">${data.cards.length ? `<label class="imp-inline">Cartão ${sel('data-imp="card"', data.cards.map((c) => [c.id, c.name + cardDigits(c)]), imp.cardId)}</label><label class="imp-inline">Fatura de ${sel('data-imp="cardMonth"', months.map((m) => [m, monthLong(m)]), imp.cardMonth)}</label><b class="num">Total: ${money(cardTotal)}</b>` : '<span class="muted">Cadastre um cartão primeiro em Cartões.</span>'}</div>` : ''}
    <div class="imp-table"><table class="table"><thead><tr><th>Data</th><th>Descrição</th><th class="r">Valor</th><th>Como registrar</th>${imp.invert ? '' : '<th>Categoria</th>'}</tr></thead>
      ${section(review, 'review', `${I.info}Confira estes <span class="muted">· ${review.length}</span>`, 'O Prumo não reconheceu: escolha como registrar e a categoria. Ele lembra da sua escolha nas próximas vezes.')}
      ${section(auto, 'auto', `${I.check}O Prumo já entendeu <span class="muted">· ${auto.length}</span>`, 'Reconhecidos pelo nome do lugar, pelas contas cadastradas ou pelo que você escolheu antes. Dá para mudar se algo estiver errado.')}
      ${missSection}
    </table></div>
    <p class="form-error" id="imperr"></p>
    <div class="modal-actions"><span class="muted" style="font-size:12.5px">${imp.invert ? `${pl(counts.fatura + counts.assinatura, 'compra', 'compras')} na fatura${counts.assinatura ? ` (${pl(counts.assinatura, 'assinatura', 'assinaturas')})` : ''} · ${pl(counts.ignorar, 'não registrada', 'não registradas')}` : `${pl(counts.pay, 'conta dada como paga', 'contas dadas como pagas')} · ${pl(counts.diaadia, 'compra', 'compras')} do dia a dia · ${counts.fixa ? `${pl(counts.fixa, 'conta fixa', 'contas fixas')} · ` : ''}${pl(counts.assinatura, 'assinatura', 'assinaturas')} · ${pl(counts.conta, 'conta só deste mês', 'contas só deste mês')} · ${pl(counts.renda, 'entrada', 'entradas')} · ${pl(counts.ignorar, 'não registrado', 'não registrados')}`}</span><span class="grow"></span>
      <button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="button" class="btn btn-primary" data-imp-apply>Importar</button></div>
  </div></div>`;
  $('#modal-root').hidden = false;
}

// Aprendizado
function learnCategory(r) {
  const L = data.learnedCats;
  for (const key of Statement.learnKeys(r.desc)) {
    if (!key.startsWith('cnpj:') && key.replace(/[^a-z]/g, '').length < 3) continue;
    if (r.cat && r.cat !== 'outros') { delete L[key]; L[key] = r.cat; } else delete L[key]; // mais recente por último
  }
  const keys = Object.keys(L);
  if (keys.length > 3000) keys.slice(0, keys.length - 3000).forEach((k) => delete L[k]);
}

// Renda estimada de quem ganha por dia: valor da diária × dias por mês (pelo extrato)
function dailyIncome(key, st) {
  const all = st.rows.filter((r) => r.daily === key && r.action === 'renda');
  let rec = data.incomes.find((i) => i.daily && i.key === key && i.owner === st.owner);
  // só meses que já acabaram dizem quantos dias por mês (o mês atual ainda está pela metade)
  const done = all.filter((r) => r.m < ymNow());
  if (rec && !done.length) return rec;
  const mine = done.length ? done : all;
  const months = new Set(mine.map((r) => r.m));
  if (!rec) {
    rec = { id: uid(), name: 'Diárias · ' + cleanName(all[0].desc), daily: true, key, owner: st.owner, day: 28, start: all.map((r) => r.m).sort()[0] };
    data.incomes.push(rec);
  }
  const rate = Math.round(median(mine.map((r) => r.amt)) * 100) / 100;
  const perMonth = Math.max(1, Math.round(mine.length / months.size));
  Object.assign(rec, { rate, perMonth, amount: Math.round(rate * perMonth * 100) / 100 });
  return rec;
}

function applyImport() {
  const st = imp;
  const ok = st.rows.filter((r) => r.action !== 'ignorar');
  if (st.invert) {
    const card = data.cards.find((c) => c.id === st.cardId);
    if (!card) { $('#imperr').textContent = 'Escolha o cartão (ou cadastre um em Cartões).'; return; }
    const total = Math.round(-sum(ok, (r) => r.amt) * 100) / 100;
    if (total > 0) card.invoices[st.cardMonth] = total; else delete card.invoices[st.cardMonth];
    const subs = ok.filter((r) => r.action === 'assinatura').map((r) => subFromImport(r, card.owner, card.id));
    ok.forEach((r) => { data.imported[r.key] = true; });
    closeModal(); imp = null; commit();
    toast(`Fatura de ${monthName(st.cardMonth).toLowerCase()} do ${card.name}: ${money(total)}${subs.length ? ` · ${new Set(subs).size} ${new Set(subs).size === 1 ? 'assinatura' : 'assinaturas'}` : ''}`);
    return;
  }
  const c = { pay: 0, diaadia: 0, conta: 0, fixa: 0, renda: 0, assinatura: 0 };
  const fixas = new Map(); // uma conta fixa por lugar, mesmo vindo em vários meses
  for (const r of [...ok].sort((a, b) => a.date.localeCompare(b.date))) {
    const day = Number(r.date.slice(8));
    if (r.action === 'pay' && r.match) {
      setPaid(r.m, r.match.id, true);
      const o = r.match.kind === 'sub' ? data.subs.find((s) => s.id === r.match.subId) : data.bills.find((b) => b.id === r.match.id);
      if (o && !o.month) o.seen = true; // já veio no extrato: dá para perguntar quando faltar
    }
    else if (r.action === 'assinatura') subFromImport(r, st.owner, 'conta');
    else if (r.action === 'fixa') {
      const k = Statement.merchantKey(r.desc) || r.desc;
      let b = fixas.get(k);
      if (!b) {
        b = { id: uid(), name: cleanName(r.desc), amount: -r.amt, day, category: r.cat, type: 'fixa', start: r.m, payer: st.owner, scope: 'pessoal', imported: true, seen: true };
        data.bills.push(b); fixas.set(k, b); c.fixa++;
      } else b.amount = -r.amt; // valor mais recente
      setPaid(r.m, b.id, true);
    }
    if (['diaadia', 'conta', 'fixa'].includes(r.action)) learnCategory(r);
    if (r.action === 'diaadia') (data.spending[r.m] ||= []).push({ id: uid(), date: r.date, desc: r.desc.slice(0, 80), amount: -r.amt, category: r.cat, owner: st.owner, key: r.key });
    else if (r.action === 'conta') {
      const b = { id: uid(), name: r.desc.slice(0, 60), amount: -r.amt, day, category: r.cat, type: 'variavel', month: r.m, payer: st.owner, scope: 'pessoal', imported: true };
      data.bills.push(b); setPaid(r.m, b.id, true);
    } else if (r.action === 'renda' && r.daily) {
      const rec = dailyIncome(r.daily, st);
      data.incomes.push({ id: uid(), name: rec.name, amount: r.amt, day, month: r.m, owner: st.owner, src: rec.id });
    } else if (r.action === 'renda') data.incomes.push({ id: uid(), name: r.desc.slice(0, 60), amount: r.amt, day, month: r.m, owner: st.owner });
    if (r.action !== 'fixa') c[r.action]++;
    data.imported[r.key] = true;
  }
  // Respostas sobre contas que não vieram no extrato
  for (const x of st.missing || []) {
    if (!x.answer || st.rows.some((r) => r.action === 'pay' && r.match && r.match.id === x.id && r.m === x.m)) continue;
    data.askedMissing[x.m + '|' + x.id] = x.answer;
    if (x.answer === 'paguei') setPaid(x.m, x.id, true);
    else if (x.answer === 'acabou') {
      const obj = x.kind === 'sub' ? data.subs.find((s) => s.id === x.subId) : data.bills.find((b) => b.id === x.id);
      if (obj) obj.end = addMonths(x.m, -1); // vale até o mês anterior; histórico fica
    }
  }
  closeModal(); imp = null; commit();
  const parts = [[c.pay, 'conta paga', 'contas pagas'], [c.fixa, 'conta fixa nova', 'contas fixas novas'], [c.diaadia, 'compra', 'compras'], [c.assinatura, 'assinatura', 'assinaturas'], [c.conta, 'conta do mês', 'contas do mês'], [c.renda, 'entrada', 'entradas']].filter(([n]) => n).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
  toast(parts.length ? `Importado: ${parts.join(', ')}` : 'Nada foi registrado');
}

// Conversa
const CHAT_MAX = 300;
let lastUndo = null;
function chatLog(who, text, via, ok = true, attach) {
  data.chat.push({ who, text, via, ok, ts: Date.now(), ...(attach ? { attach } : {}) });
  if (data.chat.length > CHAT_MAX) data.chat.splice(0, data.chat.length - CHAT_MAX);
  persist();
  PrumoVoice.refreshChat();
}
function runCommand(text, via) {
  chatLog('me', text, via);
  const res = runVoice(text);
  if (res.undo) {
    const original = res.undo;
    const wrapped = () => {
      if (lastUndo !== wrapped) { toast('Não dá mais para desfazer: algo mudou depois disso'); return; }
      lastUndo = null;
      original();
      chatLog('app', 'Pronto, desfiz.');
    };
    res.undo = wrapped;
    lastUndo = wrapped;
  } else lastUndo = null;
  chatLog('app', res.msg, undefined, res.ok, res.attach);
  return res;
}

const plainText = (html) => new DOMParser().parseFromString(html, 'text/html').body.textContent;

function scoreAnswer(score) {
  const lost = score.parts.map((p) => ({ ...p, gap: p.max - p.pts })).filter((p) => p.gap >= 1).sort((a, b) => b.gap - a.gap).slice(0, 2);
  let msg = `Sua nota é ${score.total} de 100 (${score.band[0]}).`;
  if (lost.length) msg += ` O que mais pesa: ${lost.map((p) => `${p.label} (${Math.round(p.pts)}/${p.max}), ${p.why}`).join('; ')}.`;
  else msg += ' Todas as partes estão no máximo.';
  if (score.capped) msg += ' Ela fica limitada a 59 enquanto houver mês previsto no negativo.';
  return msg;
}

// Previsão
function forecastAnswer(c) {
  const view = currentView();
  const rows = forecast(view);
  const score = healthScore(rows, view);
  if (!score) return { ok: false, msg: 'Para prever, preciso saber sua renda. Cadastre em Minha renda.' };
  const say = (msg) => ({ ok: true, stay: true, msg });
  const name = (m) => monthName(m).toLowerCase();
  const start = c.rel ? 1 : c.month ? rows.findIndex((r) => Number(r.m.slice(5)) === c.month) : 0;
  const outside = { ok: false, msg: `Só consigo prever até ${name(rows[5].m)}, que são os próximos 6 meses.` };
  const worst = rows.reduce((a, b) => (b.sobra < a.sobra ? b : a));
  const best = rows.reduce((a, b) => (b.sobra > a.sobra ? b : a));
  const r = data.reserve;
  const left = Math.max(0, r.goal - r.balance);
  switch (c.what) {
    case 'month': {
      if (start < 0) return outside;
      const x = rows[start];
      return say(`Em ${name(x.m)}, a previsão é de ${money(x.income)} de renda e ${money(x.spent)} de gastos, ${x.sobra < 0 ? `faltando ${money(-x.sobra)}` : `sobrando ${money(x.sobra)}`}.${x.est > 0.005 ? ` Desse gasto, ${money(x.est)} são estimativa.` : ''}`);
    }
    case 'worst': return say(`O mês mais apertado é ${name(worst.m)}, com ${worst.sobra < 0 ? `falta de ${money(-worst.sobra)}` : `sobra de ${money(worst.sobra)}`}.`);
    case 'best': return say(`O mês com mais folga é ${name(best.m)}, com sobra de ${money(best.sobra)}.`);
    case 'total': return say(`Somando os próximos 6 meses, a previsão é de ${money(sum(rows, (x) => x.sobra))} de sobra.`);
    case 'why': return say(scoreAnswer(score));
    case 'tips': {
      const tips = insights(rows, view).slice(0, 3).map((x) => plainText(x.text));
      return say(tips.length ? tips.join(' ') : 'Por enquanto está tudo em ordem. Não tenho nada a apontar.');
    }
    case 'goals': {
      const v = goalsVerdict(rows);
      if (!data.goals.length) return say('Você ainda não tem metas. Crie uma na aba Metas.');
      if (!v) return say('Nenhuma meta com prazo em aberto, então não há valor mensal para calcular.');
      return say(`Suas metas pedem ${money(v.need)} por mês. ${v.fits ? 'Isso cabe na sobra de todos os próximos meses.' : `Não cabe em ${name(v.low.m)}, em que a sobra prevista é de ${money(v.low.sobra)}.`}`);
    }
    case 'negative': {
      const neg = rows.filter((x) => x.sobra < 0);
      if (!neg.length) return say('Não. Nenhum dos próximos 6 meses está previsto no negativo.');
      return say(`Sim, em ${neg.map((x) => `${name(x.m)} (faltando ${money(-x.sobra)})`).join(', ')}.`);
    }
    case 'goal': {
      if (!r.goal) return say(`Sua reserva tem ${money(r.balance)} e ainda não tem meta. Defina uma em Minha reserva.`);
      if (!left) return say('Sua reserva já atingiu a meta.');
      const monthly = reserveMonthly();
      if (monthly <= 0) return say(`Faltam ${money(left)} para a meta, mas ainda não há um valor guardado todo mês. Crie uma conta na categoria Reserva.`);
      const eta = Math.ceil(left / monthly);
      return say(`Guardando ${money(monthly)} por mês, você chega à meta em ${eta} ${eta === 1 ? 'mês' : 'meses'}. Faltam ${money(left)}.`);
    }
    case 'save': {
      const current = reserveMonthly();
      const monthly = c.extra ? current + c.amount : c.amount;
      const extra = monthly - current;
      const low = worst.sobra - extra;
      const eta = r.goal && left ? ` A reserva chegaria à meta em ${Math.ceil(left / monthly)} ${Math.ceil(left / monthly) === 1 ? 'mês' : 'meses'}.` : '';
      return say(`Guardando ${money(monthly)} por mês, o mês mais apertado (${name(worst.m)}) ficaria em ${money(low)}.${eta}${low < 0 ? ' Nesse valor, esse mês fica no negativo.' : ''}`);
    }
    case 'afford': {
      if (start < 0) return outside;
      const each = c.amount / c.parcels;
      const hit = rows.slice(start, start + c.parcels).map((x) => ({ ...x, after: x.sobra - each }));
      const low = hit.reduce((a, b) => (b.after < a.after ? b : a));
      const neg = hit.filter((x) => x.after < 0);
      const what = c.parcels > 1 ? `Em ${c.parcels}x de ${money(each)}` : `Gastando ${money(c.amount)} em ${name(hit[0].m)}`;
      const beyond = start + c.parcels > rows.length ? ` Só consigo calcular até ${name(rows[5].m)}.` : '';
      const already = low.sobra < 0 ? ` Esse mês já está previsto no negativo, mesmo sem essa compra.` : '';
      if (neg.length) return say(`Não cabe. ${what}, ${c.parcels > 1 ? name(low.m) : 'o mês'} ficaria com ${money(low.after)}${neg.length > 1 ? ` e ${neg.length} meses fechariam no negativo` : ''}.${already}${beyond}`);
      const tight = low.income > 0 && low.after < low.income * 0.1;
      return say(`Cabe${tight ? ', mas fica apertado' : ''}. ${what}, ${c.parcels > 1 ? `o mês mais justo é ${name(low.m)}, que ainda fecharia` : 'o mês ainda fecharia'} com ${money(low.after)}.${beyond}`);
    }
    default: return { ok: false, msg: 'Não entendi a pergunta.' };
  }
}

// Respostas
function chatReply(intent, text) {
  const say = (...options) => ({ ok: true, stay: true, msg: options[Math.floor(Math.random() * options.length)] });
  const exemplos = 'Posso lançar gastos ("gastei 30 no almoço"), marcar contas pagas, responder "como fica fevereiro?" ou receber seu extrato.';
  switch (intent) {
    case 'hello': {
      const period = text.toLowerCase().match(/bom dia|boa tarde|boa noite/);
      const open = period ? period[0][0].toUpperCase() + period[0].slice(1) : 'Olá';
      return say(`${open}! ${exemplos} É só pedir.`, `${open}! Como posso ajudar com suas finanças? ${exemplos}`);
    }
    case 'how': return say('Tudo certo por aqui! Quer ver como está o seu mês?', 'Tudo bem, obrigado por perguntar! Em que posso ajudar nas suas finanças?');
    case 'thanks': return say('Por nada! Se precisar, é só falar.', 'De nada! Estou aqui quando precisar.');
    case 'bye': return say('Até mais! Suas contas ficam guardadas aqui.', 'Tchau! Quando precisar, é só voltar.');
    case 'who': return say('Sou o Prumo, o assistente das suas finanças. Funciono só neste aparelho, sem internet, e entendo apenas dos assuntos do app.');
    case 'help': return say(`${exemplos} Também posso dizer quanto sobra, quais contas faltam e dar dicas para economizar.`);
    case 'praise': return say('Que bom que gostou! Obrigado.', 'Fico feliz em ajudar!');
    case 'insult': return say('Desculpe se não ajudei. Tente dizer de outro jeito, por exemplo: "gastei 30 no mercado" ou "quanto sobra este mês?".');
    case 'ack': return say('Certo. Se precisar, é só falar.', 'Combinado.');
    case 'yes': return say('Não tenho nada esperando sua confirmação. O que você quer fazer?');
    case 'no': return say('Tudo bem.');
    case 'out': return say('Só consigo falar das suas finanças. Pergunte, por exemplo, "quanto sobra este mês?" ou "posso gastar 200?".');
    case 'broke': {
      const s = summary(ui.month);
      const when = monthName(ui.month).toLowerCase();
      const tips = forecastAnswer({ what: 'tips' });
      const extra = tips.ok && !tips.msg.startsWith('Por enquanto') ? ` ${tips.msg}` : '';
      return say(`Sei que isso pesa, vamos olhar os números. A sobra prevista em ${when} é de ${money(s.sobra)}.${extra}`);
    }
    default: return say('Não entendi. Tente dizer de outro jeito.');
  }
}

function confirmLabel(c) {
  switch (c.type) {
    case 'spend': return `lançar um gasto de ${money(c.amount)} em "${c.desc}"`;
    case 'income': return `registrar uma entrada de ${money(c.amount)} ("${c.desc}")`;
    case 'pay': return `marcar "${c.bill.name}" como paga`;
    case 'unpay': return `deixar "${c.bill.name}" em aberto`;
    case 'reserve': return `${c.kind === 'deposit' ? 'guardar' : 'retirar'} ${money(c.amount)} ${c.kind === 'deposit' ? 'na' : 'da'} reserva`;
    case 'goalmove': return `${c.kind === 'deposit' ? 'guardar' : 'retirar'} ${money(c.amount)} ${c.kind === 'deposit' ? 'na' : 'da'} meta "${c.goal.name}"`;
    default: return 'fazer isso';
  }
}

let pendingCmd = null;
function runVoice(text) {
  let c = VoiceCommands.understand(text, { bills: billsOf(ui.month).map((b) => ({ id: b.id, name: b.name, paid: b.paid })), months: MESES, goals: data.goals.map((g) => ({ id: g.id, name: g.name, paid: false })) }, window.classifyIntent);
  const waiting = pendingCmd && pendingCmd.month === ui.month ? pendingCmd.cmd : null;
  pendingCmd = null;
  if (waiting && c.type === 'chat' && c.intent === 'yes') c = waiting;
  else if (waiting && c.type === 'chat' && c.intent === 'no') return { ok: true, stay: true, msg: 'Tudo bem, não fiz nada.' };
  const snap = JSON.stringify(data);
  const done = (msg) => {
    commit();
    return { ok: true, msg, undo: () => { const chat = data.chat; data = normalize(JSON.parse(snap)); data.chat = chat; commit(); toast('Pronto, desfiz'); } };
  };
  const when = monthName(ui.month).toLowerCase();
  const who = defaultPerson();
  const today = () => `${ui.month}-${pad2(ui.month === ymNow() ? Math.min(new Date().getDate(), daysIn(ui.month)) : 1)}`;
  switch (c.type) {
    case 'fc': return forecastAnswer(c);
    case 'chat': return chatReply(c.intent, text);
    case 'confirm':
      pendingCmd = { cmd: c.cmd, month: ui.month };
      return { ok: true, stay: true, msg: `Você quer ${confirmLabel(c.cmd)}? Responda "sim" ou "não".` };
    case 'hello': return { ok: true, stay: true, msg: 'Olá! Posso lançar gastos ("gastei 30 no almoço"), marcar contas pagas, responder "como fica fevereiro?" ou receber seu extrato. É só pedir.' };
    case 'statement': return { ok: true, stay: true, attach: 'statement', msg: 'Envie aqui o extrato do seu banco. Pode ser o PDF, OFX ou CSV que o app ou site do banco oferece em "Exportar extrato".' };
    case 'goalmove': {
      const g = data.goals.find((x) => x.id === c.goal.id);
      if (c.kind === 'withdraw' && c.amount > g.saved) return { ok: false, msg: `A meta "${g.name}" só tem ${money(g.saved)}.` };
      moveGoal(g, c.kind, c.amount, 'Por voz');
      return done(`${c.kind === 'deposit' ? 'Guardado' : 'Retirado'}: ${money(c.amount)}. A meta "${g.name}" agora tem ${money(g.saved)} de ${money(g.target)}.`);
    }
    case 'goalinfo': {
      const g = data.goals.find((x) => x.id === c.goal.id);
      const x = goalInfo(g);
      if (x.done) return { ok: true, stay: true, msg: `A meta "${g.name}" já foi atingida, com ${money(g.saved)} guardados.` };
      return { ok: true, stay: true, msg: `A meta "${g.name}" tem ${money(g.saved)} de ${money(g.target)}. Faltam ${money(x.left)}${x.monthly ? `, guardando ${money(x.monthly)} por mês até ${monthName(g.date).toLowerCase()}` : ''}.${x.late ? ' O prazo já passou.' : ''}` };
    }
    case 'nav': {
      if (c.page === 'previsor' && ui.page === 'previsor') {
        const score = healthScore(forecast());
        if (!score || !/nota|sa[uú]de/i.test(text)) return { ok: true, stay: true, msg: 'Você já está no Previsor.' };
        return { ok: true, stay: true, msg: scoreAnswer(score) };
      }
      ui.page = c.page; ui.pop = null; render();
      return { ok: true, msg: 'Pronto.', close: true };
    }
    case 'month': ui.month = c.dir === 0 ? ymNow() : c.month ? `${ymParts(ui.month)[0]}-${pad2(c.month)}` : addMonths(ui.month, c.dir); ui.day = null; render(); return { ok: true, msg: monthLong(ui.month), close: true };
    case 'theme': pickTheme(c.value); return { ok: true, msg: c.value === 'dark' ? 'Modo escuro ligado.' : 'Modo claro ligado.', close: true };
    case 'query': {
      const s = summary(ui.month);
      if (c.what === 'saldo') return { ok: true, stay: true, msg: `A sobra prevista em ${when} é de ${money(s.sobra)}.` };
      if (c.what === 'renda') return { ok: true, stay: true, msg: `A renda de ${when} é de ${money(s.income)}.` };
      if (c.what === 'gastos') return { ok: true, stay: true, msg: `Os gastos previstos em ${when} somam ${money(s.spent)}.` };
      if (c.what === 'reserva') return { ok: true, stay: true, msg: `A reserva tem ${money(data.reserve.balance)}${data.reserve.goal ? ` de uma meta de ${money(data.reserve.goal)}` : ''}.` };
      const open = billsOf(ui.month).filter((b) => !b.paid).sort((a, b) => a.day - b.day);
      if (!open.length) return { ok: true, stay: true, msg: `Nenhuma conta em aberto em ${when}.` };
      return { ok: true, stay: true, msg: `${open.length === 1 ? 'Falta 1 conta' : `Faltam ${open.length} contas`}, somando ${money(sum(open))}: ${open.slice(0, 5).map((b) => `${b.name} (dia ${pad2(b.day)})`).join(', ')}${open.length > 5 ? ' e outras' : ''}.` };
    }
    case 'pay':
      if (c.bill.paid) return { ok: true, stay: true, msg: `"${c.bill.name}" já estava paga.` };
      setPaid(ui.month, c.bill.id, true);
      return done(`"${c.bill.name}" marcada como paga em ${when}.`);
    case 'unpay':
      if (!c.bill.paid) return { ok: true, stay: true, msg: `"${c.bill.name}" já estava em aberto.` };
      setPaid(ui.month, c.bill.id, false);
      return done(`"${c.bill.name}" voltou a ficar em aberto.`);
    case 'spend': {
      const category = Statement.guessCategory(c.desc);
      (data.spending[ui.month] ||= []).push({ id: uid(), date: today(), desc: c.desc.slice(0, 80), amount: c.amount, category, owner: who });
      return done(`Gasto de ${money(c.amount)} em "${c.desc}" lançado em ${when}.`);
    }
    case 'income':
      data.incomes.push({ id: uid(), name: c.desc.slice(0, 60), amount: c.amount, day: Number(today().slice(8)), month: ui.month, owner: who });
      return done(`Entrada de ${money(c.amount)} ("${c.desc}") registrada em ${when}.`);
    case 'reserve': {
      const dep = c.kind === 'deposit';
      if (!dep && c.amount > data.reserve.balance) return { ok: false, msg: `A reserva só tem ${money(data.reserve.balance)}.` };
      const amt = dep ? c.amount : -c.amount;
      data.reserve.balance = Math.round((data.reserve.balance + amt) * 100) / 100;
      data.reserve.history.push({ id: uid(), date: new Date().toISOString(), amount: amt, note: 'Por voz' });
      return done(`${dep ? 'Guardado' : 'Retirado'}: ${money(c.amount)}. A reserva agora tem ${money(data.reserve.balance)}.`);
    }
    case 'newbill':
      billForm(null, { name: c.name, amount: c.amount, day: c.day });
      return { ok: true, msg: 'Confira os dados da conta.', close: true };
    case 'need':
      if (c.reason === 'valor') return { ok: false, msg: 'Faltou dizer o valor. Tente de novo com quanto foi.' };
      if (c.reason === 'qual') return { ok: false, msg: `Qual delas: ${c.options.join(' ou ')}?` };
      return { ok: false, msg: 'Não encontrei essa conta neste mês.' };
    default:
      return { ok: false, msg: ui.page === 'previsor' ? `Não entendi "${text}". Tente algo como "como fica fevereiro?" ou "posso gastar 500 este mês?".` : `Não entendi "${text}". Eu só falo das suas finanças, por exemplo "gastei 30 no mercado".` };
  }
}

document.addEventListener('change', (e) => {
  const el = e.target;
  if (!imp || !el.dataset.imp) return;
  const k = el.dataset.imp;
  if (k === 'invert') { imp.invert = el.checked; suggestImport(); }
  else if (k === 'owner') imp.owner = el.value;
  else if (k === 'card') imp.cardId = el.value;
  else if (k === 'cardMonth') imp.cardMonth = el.value;
  else if (k === 'action') imp.rows[el.dataset.i].action = el.value;
  else if (k === 'cat') imp.rows[el.dataset.i].cat = el.value;
  else if (k === 'miss') imp.missing[el.dataset.i].answer = el.value;
  const scroll = $('.imp-table')?.scrollTop || 0;
  renderImport();
  $('.imp-table').scrollTop = scroll;
});
document.addEventListener('click', (e) => { if (imp && e.target.closest('[data-imp-apply]')) applyImport(); });

// Secretário
function syncSecretary() {
  if (!data || !api.updateSecretary) return;
  const now = ymNow();
  const items = [];
  for (const m of [addMonths(now, -1), now, addMonths(now, 1)]) {
    for (const b of billsOf(m)) {
      if (b.paid) continue;
      items.push({ date: `${m}-${pad2(b.day)}`, name: isMulti() ? `${b.name} · ${personOf(b.payer).name}` : b.name, amount: b.amount });
    }
  }
  api.updateSecretary({ ...data.settings.secretary, items, generic: !!store.encrypted }).catch(() => {});
}

// Pessoas
function removePeople(ids) {
  const keep = people().find((p) => !ids.includes(p.id)).id;
  data.incomes.forEach((i) => { if (ids.includes(i.owner)) i.owner = keep; });
  data.bills.forEach((b) => { if (ids.includes(b.payer)) b.payer = keep; });
  data.cards.forEach((c) => { if (ids.includes(c.owner)) c.owner = keep; });
  data.subs.forEach((s) => { if (ids.includes(s.payer)) s.payer = keep; });
  data.household.people = people().filter((p) => !ids.includes(p.id));
  ids.forEach((id) => delete data.household.custom[id]);
}
const freeColor = () => (PERSON_COLORS.find(([c]) => !people().some((p) => p.color === c)) || PERSON_COLORS[people().length % PERSON_COLORS.length])[0];

function setupPeople(fresh) {
  const cur = fresh ? [] : people();
  const h = fresh ? { split: 'renda', custom: {} } : data.household;
  const count = (form) => Number(form.elements.count.value);
  const nameField = (i) => ({ name: 'name_' + i, label: i === 0 ? 'Seu nome' : `Pessoa ${i + 1}`, value: cur[i]?.name || '', placeholder: i === 0 ? 'Ex.: Ana' : 'Nome', showIf: (form) => count(form) > i });
  const pctField = (i) => ({ name: 'pct_' + i, label: `% de ${cur[i]?.name || (i === 0 ? 'você' : 'Pessoa ' + (i + 1))}`, type: 'number', min: 0, max: 100, value: cur[i] ? (h.custom[cur[i].id] ?? '') : '', showIf: (form) => count(form) > i && form.elements.split.value === 'custom' });
  const pairs = (fn) => { const out = []; for (let i = 0; i < MAX_PEOPLE; i += 2) out.push([fn(i), fn(i + 1)]); return out; };
  formModal({
    title: fresh ? 'Quem vai usar o Prumo?' : 'Pessoas e divisão',
    lead: 'Com <b>2 ou mais pessoas</b>, o Prumo divide as contas da casa e mostra quem devolve quanto para quem no fim do mês.' + (fresh ? '' : '<br>Se diminuir o número de pessoas, as contas e rendas de quem sair passam para a primeira pessoa.'),
    fields: [
      { name: 'count', label: 'Quantas pessoas?', type: 'select', options: Array.from({ length: MAX_PEOPLE }, (_, i) => [String(i + 1), i === 0 ? 'Só eu' : `${i + 1} pessoas`]), value: String(Math.max(1, cur.length)) },
      ...pairs(nameField),
      { name: 'split', label: 'Como dividir as contas da casa?', type: 'select', value: h.split, options: [['renda', 'Proporcional à renda (recomendado)'], ['igual', 'Partes iguais'], ['custom', 'Percentuais que vocês definirem']], hint: 'Proporcional: quem ganha mais paga uma parte maior, e todos ficam com a mesma % da renda comprometida.', showIf: (form) => count(form) > 1 },
      ...pairs(pctField),
    ],
    submit: fresh ? 'Começar' : 'Salvar',
    onSubmit: (v) => {
      const n = Number(v.count);
      const names = Array.from({ length: n }, (_, i) => (v['name_' + i] || '').replace(/\s+/g, ' ').slice(0, 24) || (i === 0 ? 'Você' : `Pessoa ${i + 1}`));
      if (n > 1 && v.split === 'custom') {
        const tot = names.reduce((a, _, i) => a + (Number.isNaN(v['pct_' + i]) ? 0 : v['pct_' + i]), 0);
        if (Math.abs(tot - 100) > 0.5) return `Os percentuais precisam somar 100% (agora somam ${Math.round(tot * 10) / 10}%).`;
      }
      if (fresh) {
        data = emptyData(names, n > 1 ? v.split : 'renda');
      } else {
        if (n < people().length) removePeople(people().slice(n).map((p) => p.id));
        names.forEach((name, i) => {
          if (people()[i]) people()[i].name = name;
          else people().push({ id: 'p' + uid(), name, color: freeColor(), daily: 0 });
        });
        data.household.split = n > 1 ? v.split : 'renda';
      }
      if (n > 1 && v.split === 'custom') { data.household.custom = {}; people().forEach((p, i) => { data.household.custom[p.id] = v['pct_' + i] || 0; }); }
      ui.view = null; ui.cardIdx = 0;
      if (fresh) ui.page = 'renda';
      commit();
      toast(fresh ? (n > 1 ? 'Pronto! Comece cadastrando a renda de cada um' : 'Pronto! Comece cadastrando sua renda') : 'Pessoas atualizadas');
    },
  });
}

function personForm(p) {
  formModal({
    title: isMulti() ? `Editar ${p.name}` : 'Seu perfil',
    fields: [
      { name: 'name', label: 'Nome', value: p.name, required: true },
      [{ name: 'color', label: 'Cor', type: 'select', options: PERSON_COLORS, value: p.color }, { name: 'daily', label: 'Dia a dia por mês (R$)', type: 'money', value: p.daily, hint: 'Gastos soltos: lanche, farmácia, Uber...' }],
    ],
    onSubmit: (v) => { Object.assign(p, { name: v.name.slice(0, 24), color: v.color, daily: v.daily }); commit(); },
    onDelete: isMulti() ? () => confirmModal(`Remover ${esc(p.name)}?`, 'As contas, rendas e cartões dessa pessoa passam para a outra primeira pessoa da lista.', 'Remover', () => { removePeople([p.id]); ui.view = null; commit(); }) : null,
  });
}

// Senha
async function refreshStore() { store = await api.status(); }
function pwSet() {
  formModal({
    title: 'Definir senha',
    lead: '<b>Importante:</b> se você esquecer a senha, não há como recuperar os dados. Anote em um lugar seguro.',
    fields: [{ name: 'next', label: 'Nova senha (mínimo 6 caracteres)', type: 'password', required: true }, { name: 'confirm', label: 'Repita a senha', type: 'password', required: true }],
    submit: 'Proteger dados',
    onSubmit: async (v) => {
      if (v.next !== v.confirm) return 'As senhas não são iguais.';
      const res = await api.setPassword({ current: null, next: v.next, data });
      if (!res.ok) return res.error;
      await refreshStore(); render(); toast('Dados protegidos com senha');
    },
  });
}
function pwChange() {
  formModal({
    title: 'Trocar senha',
    fields: [{ name: 'current', label: 'Senha atual', type: 'password', required: true }, { name: 'next', label: 'Nova senha (mínimo 6 caracteres)', type: 'password', required: true }, { name: 'confirm', label: 'Repita a nova senha', type: 'password', required: true }],
    onSubmit: async (v) => {
      if (v.next !== v.confirm) return 'As senhas novas não são iguais.';
      const res = await api.setPassword({ current: v.current, next: v.next, data });
      if (!res.ok) return res.error;
      await refreshStore(); render(); toast('Senha alterada');
    },
  });
}
function pwRemove() {
  formModal({
    title: 'Remover senha',
    lead: 'O arquivo de dados deixa de ser criptografado.',
    fields: [{ name: 'current', label: 'Senha atual', type: 'password', required: true }],
    submit: 'Remover senha', danger: true,
    onSubmit: async (v) => {
      const res = await api.setPassword({ current: v.current, next: null, data });
      if (!res.ok) return res.error;
      await refreshStore(); render(); toast('Senha removida');
    },
  });
}

// Ações
const ACTIONS = {
  'nav': (el) => { ui.page = el.dataset.page; $('.main') && ($('.main').scrollTop = 0); render(); const m = $('.main'); if (m) m.scrollTop = 0; },
  'month-prev': () => { ui.month = addMonths(ui.month, -1); ui.day = null; render(); },
  'month-next': () => { ui.month = addMonths(ui.month, 1); ui.day = null; render(); },
  'month-today': () => { ui.month = ymNow(); ui.day = null; render(); },
  'set-month': (el) => { ui.month = el.dataset.month; ui.pop = null; ui.day = null; render(); },
  'pop-year': (el) => { ui.popYear = (ui.popYear || ymParts(ui.month)[0]) + Number(el.dataset.d); render(); },
  'day': (el) => { ui.day = el.dataset.day === '' ? null : Number(el.dataset.day); render(); },
  'toggle-paid': (el) => togglePaid(el.dataset.id),
  'card-prev': () => { ui.cardIdx = Math.max(0, ui.cardIdx - 1); render(); },
  'card-next': () => { ui.cardIdx = Math.min(visibleCards().length - 1, ui.cardIdx + 1); render(); },
  'theme': (el) => pickTheme(el.dataset.theme),
  'bank-review': () => bankReview(),
  'bank-save': () => bankSave(),
  'bank-choose': () => bankChoose(),
  'bank-access': () => api.bankOpenSettings(),
  'bank-app-info': () => api.bankOpenAppInfo(),
  'add': (el) => {
    ui.pop = null; render();
    const k = el.dataset.kind;
    if (k === 'bill') billForm(null, { cat: el.dataset.cat });
    else if (k === 'income') incomeForm();
    else if (k === 'card') cardForm();
    else if (k === 'sub') subForm();
    else if (k === 'invoice') invoiceForm();
    else if (k === 'deposit') reserveMove('deposit');
  },
  'edit-bill': (el) => billForm(data.bills.find((x) => x.id === el.dataset.id)),
  'edit-sub': (el) => subForm(data.subs.find((x) => x.id === el.dataset.id)),
  'del-bill': (el) => delBill(el.dataset.id),
  'edit-income': (el) => incomeForm(data.incomes.find((x) => x.id === el.dataset.id)),
  'del-income': (el) => { const inc = data.incomes.find((x) => x.id === el.dataset.id); confirmModal('Excluir renda?', `"${esc(inc.name)}" será removida.`, 'Excluir', () => { data.incomes = data.incomes.filter((x) => x !== inc); commit(); }); },
  'edit-card': (el) => cardForm(data.cards.find((x) => x.id === el.dataset.id)),
  'del-card': (el) => delCard(el.dataset.id),
  'reserve-move': (el) => reserveMove(el.dataset.kind),
  'reserve-goal': () => reserveGoal(),
  'housing-ref': () => formModal({ title: 'Referência de moradia', lead: 'Uma regra comum é não passar de 30% da renda com moradia.', fields: [{ name: 'ref', label: 'Máximo da renda para moradia (%)', type: 'number', min: 5, max: 90, value: data.settings.housingRef, required: true }], onSubmit: (v) => { data.settings.housingRef = v.ref; commit(); } }),
  'edit-person': (el) => personForm(personOf(el.dataset.id)),
  'setup-people': () => { ui.pop = null; render(); setupPeople(false); },
  'set-view': (el) => { ui.view = el.dataset.view; ui.pop = null; ui.cardIdx = 0; ui.day = null; render(); },
  'settle': () => { data.settled[ui.month] = !data.settled[ui.month]; if (!data.settled[ui.month]) delete data.settled[ui.month]; commit(); },
  'housing-base': (el) => { ui.housingBase = el.dataset.base; render(); },
  'import-statement': () => startImport(),
  'voice': () => PrumoVoice.open((t) => runCommand(t, 'voz')),
  'strip-shift': (el) => { ui.stripStart = addMonths(ui.stripStart, Number(el.dataset.d)); const end = addMonths(ui.stripStart, 6); if (ui.month < ui.stripStart) ui.month = ui.stripStart; else if (ui.month > end) ui.month = end; ui.day = null; render(); },
  'del-spend': (el) => {
    const list = data.spending[ui.month] || [];
    const x = list.find((s) => s.id === el.dataset.id);
    if (!x) return;
    data.spending[ui.month] = list.filter((s) => s !== x);
    if (x.key) delete data.imported[x.key];
    commit(); toast('Gasto removido');
  },
  'sec-toggle': (el) => {
    const k = el.dataset.key;
    data.settings.secretary[k] = !data.settings.secretary[k];
    commit();
    if (k === 'startup') toast(data.settings.secretary.startup ? 'O Prumo vai abrir junto com o Windows (escondido, só para avisar)' : 'O Prumo não abre mais com o Windows');
  },
  'sec-days': () => formModal({ title: 'Avisar com quantos dias de antecedência?', fields: [{ name: 'd', label: 'Dias antes do vencimento', type: 'number', min: 0, max: 10, value: data.settings.secretary.daysBefore, required: true, hint: '0 = só no dia. Contas atrasadas também aparecem no aviso.' }], onSubmit: (v) => { data.settings.secretary.daysBefore = v.d; commit(); } }),
  'sec-test': async () => { await api.updateSecretary({ ...data.settings.secretary }); syncSecretary(); const r = await api.testSecretary(); toast(r.ok ? (api.mobile ? 'Aviso enviado. Ele chega em instantes.' : 'Aviso enviado — veja no canto da tela') : (api.mobile ? 'O celular não permitiu o aviso. Libere as notificações do Prumo.' : 'O Windows não permitiu o aviso. Confira as notificações do Windows.')); },
  'sample-keep': () => { data.meta.sample = false; commit(); },
  'sample-clear': () => setupPeople(true),
  'wipe': () => confirmModal('Apagar todos os dados?', 'Isso remove contas, rendas, cartões e reserva. Não dá para desfazer (a não ser com um backup). Na próxima tela você escolhe quem vai usar o Prumo.', 'Continuar', () => { setTimeout(() => setupPeople(true), 0); }),
  'pw-set': pwSet, 'pw-change': pwChange, 'pw-remove': pwRemove,
  'lock': async () => { await saving; await api.lock(); location.reload(); },
  'export': async () => { await saving; const r = await api.exportBackup(); if (r.ok) toast('Backup salvo'); else if (r.error) toast(r.error); },
  'import': () => confirmModal('Restaurar backup?', 'Os dados atuais serão substituídos pelos do arquivo escolhido. Uma cópia dos atuais fica guardada na pasta de dados.', 'Escolher arquivo', async () => {
    const r = await api.importBackup();
    if (r.ok) location.reload(); else if (r.error) toast(r.error);
  }),
  'open-folder': () => api.openFolder(),
  'backup-now': async () => { await saving; const r = await api.backupNow(); toast(r.ok ? 'Cópia feita' : r.error || 'Não consegui fazer a cópia'); await refreshBackup(); render(); },
  'backup-pick': async () => { await saving; const r = await api.backupPick(); if (r.error) toast(r.error); else if (r.ok) toast('Pasta dos backups alterada'); await refreshBackup(); render(); },
  'backup-reset': async () => { await api.backupReset(); toast('Voltou para a pasta padrão'); await refreshBackup(); render(); },
  'backup-open': () => api.backupOpen(),
  'backup-restore': () => backupRestoreForm(),
  'goal-new': () => goalForm(null),
  'goal-edit': (el) => goalForm(data.goals.find((g) => g.id === el.dataset.id)),
  'goal-move': (el) => goalMove(data.goals.find((g) => g.id === el.dataset.id), el.dataset.kind),
  'close-modal': closeModal,
};

document.addEventListener('click', (e) => {
  const popBtn = e.target.closest('[data-pop]');
  if (popBtn) {
    const p = popBtn.dataset.pop;
    ui.pop = ui.pop === p ? null : p;
    ui.popYear = null;
    render();
    return;
  }
  if (ui.pop && !e.target.closest('.popover')) { ui.pop = null; render(); }
  if (e.target.matches('[data-backdrop]')) { closeModal(); return; }
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled || !data && el.dataset.action !== 'close-modal') return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el, e);
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.change === 'invoice') {
    const v = el.value.trim() === '' ? 0 : parseMoney(el.value);
    if (Number.isNaN(v) || v < 0) { toast('Valor inválido'); el.value = moneyInput(invoiceOf(data.cards.find((c) => c.id === el.dataset.card), el.dataset.month) || ''); return; }
    const c = data.cards.find((x) => x.id === el.dataset.card);
    if (v) c.invoices[el.dataset.month] = v; else delete c.invoices[el.dataset.month];
    el.value = v ? moneyInput(v) : '';
    persist();
    const foot = el.closest('table').querySelector('tfoot');
    if (foot) {
      const months = [...el.closest('table').querySelectorAll('thead th')].slice(1).map((_, i) => addMonths(ui.month, i));
      foot.innerHTML = `<tr><td>Total</td>${months.map((m) => `<td class="r num">${money(sum(data.cards, (k) => invoiceOf(k, m)))}</td>`).join('')}</tr>`;
    }
  } else if (el.dataset.change === 'bill-filter') {
    ui.billFilter = el.value; render();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (drag) endDrag(false);
    else if (!$('#modal-root').hidden) closeModal();
    else if (PrumoVoice.isOpen()) PrumoVoice.close();
    else if (ui.pop) { ui.pop = null; render(); }
  }
  if (e.key === 'Enter' && e.target.classList.contains('inv-input')) e.target.blur();
});

// Inicialização
function showLock() {
  applyTheme();
  $('#app').innerHTML = `<div class="lock-screen"><form class="lock-card" id="lockform">
    <div class="illu">${ILLU.lock}</div><h2>Prumo está bloqueado</h2><p>Digite sua senha para abrir seus dados.</p>
    <input type="password" id="pw" placeholder="Senha" autocomplete="current-password"><p class="form-error" id="pwerr" style="margin:0 0 10px"></p>
    <button class="btn btn-primary" type="submit">Desbloquear</button></form></div>`;
  const pw = $('#pw');
  pw.focus();
  $('#lockform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Verificando...';
    const res = await api.unlock(pw.value);
    if (res.ok) { data = normalize(res.data); await refreshStore(); start(); return; }
    btn.disabled = false; btn.textContent = 'Desbloquear';
    $('#pwerr').textContent = 'Senha incorreta.'; pw.select();
  });
}

// Avisos dos bancos
let bankAccess = false, bankBusy = false, bankTimer = null;
const READ_BANKS = () => BANKS.filter((b) => b[0] !== 'outro');
const dateOf = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };

function invoiceMonth(card, date) {
  let m = date.slice(0, 7);
  for (let i = 0; i < 3; i++, m = addMonths(m, 1)) {
    const [y, mo] = ymParts(m);
    const closing = new Date(y, mo - 1, Math.min(card.dueDay || 1, daysIn(m)) - 7);
    if (date <= dateOf(closing.getTime())) return m;
  }
  return m;
}

async function syncBank() {
  if (!api.bankReader || !data || bankBusy) return;
  bankBusy = true;
  try {
    const access = await api.bankStatus();
    if (access !== bankAccess) { bankAccess = access; if (ui.page === 'config') render(); }
    const items = await api.bankInbox();
    if (!items.length) return;
    const known = new Set(data.pendingBank.map((p) => p.id));
    let added = 0;
    for (const n of items) {
      const parsed = BankParse.parse(n.title, n.text);
      if (parsed && !known.has(n.id)) { data.pendingBank.push({ id: n.id, bank: n.bank, date: dateOf(n.ts), ...parsed }); added++; }
    }
    if (added) await persist();
    await api.bankAck(items.map((i) => i.id));
    if (added && ui.page === 'visao') render();
  } catch (e) { console.error(e); } finally { bankBusy = false; }
}
function startBankSync() {
  if (!api.bankReader || bankTimer) return;
  api.bankSetBanks(data.settings.bankBanks).catch(() => {});
  syncBank();
  bankTimer = setInterval(() => { if (!document.hidden) syncBank(); }, 5000);
}

function bankBanner() {
  const n = data.pendingBank.length;
  if (!api.bankReader || !n) return '';
  return `<div class="banner">${I.info}<div class="grow"><b>${n} ${n === 1 ? 'lançamento' : 'lançamentos'} dos seus bancos</b> para confirmar.</div><button class="btn btn-primary" data-action="bank-review">Ver</button></div>`;
}

function bankSettings(row) {
  const n = data.settings.bankBanks.length;
  return `<section class="card">${pageHead('Lançamentos automáticos', 'O Prumo lê os avisos dos bancos escolhidos e separa compras, Pix e entradas. Nada é salvo antes de você confirmar.')}
    ${row('Ler avisos dos bancos', bankAccess ? 'Ligado. Os avisos ficam só neste celular.' : 'Desligado. Se o Android deixar a opção cinza, abra "Info do app", toque nos três pontinhos e em "Permitir configurações restritas". Depois volte e toque em Ativar.', bankAccess ? `<button class="btn" data-action="bank-access">${I.settings}Ajustes</button>` : `<button class="btn" data-action="bank-app-info">Info do app</button><button class="btn btn-primary" data-action="bank-access">Ativar</button>`)}
    ${row('Bancos lidos', `<b>${n} de ${READ_BANKS().length}</b> escolhidos.`, `<button class="btn" data-action="bank-choose">${I.pencil}Escolher</button>`)}
  </section>`;
}

function bankChoose() {
  formModal({
    title: 'Bancos lidos',
    lead: 'O Prumo só olha os avisos dos apps marcados.',
    fields: READ_BANKS().map((b) => ({ name: 'b_' + b[0], label: b[1], type: 'checkbox', value: data.settings.bankBanks.includes(b[0]) })),
    onSubmit: (v) => {
      data.settings.bankBanks = READ_BANKS().map((b) => b[0]).filter((k) => v['b_' + k]);
      api.bankSetBanks(data.settings.bankBanks).catch(() => {});
      commit();
    },
  });
}

function bankReview() {
  const options = (p) => {
    if (p.kind === 'in') return [['renda', 'Entrada de dinheiro'], ['ignorar', 'Ignorar']];
    return [['dia', 'Gasto do dia a dia'], ...data.cards.map((c) => [`card:${c.id}`, `Fatura ${c.name} · ${monthName(invoiceMonth(c, p.date)).toLowerCase()}`]), ['ignorar', 'Ignorar']];
  };
  const preferred = (p) => {
    if (p.kind !== 'buy' || p.credit === false) return options(p)[0][0];
    const card = data.cards.find((c) => c.bank === p.bank);
    return card ? `card:${card.id}` : 'dia';
  };
  const row = (p) => `<div class="bank-row" data-id="${esc(p.id)}">
    <div class="bank-row-top"><input class="bank-desc" maxlength="60" value="${esc(p.desc)}" aria-label="Descrição"><b class="num">${p.kind === 'in' ? '+ ' : '− '}${money(p.amount)}</b></div>
    <div class="bank-row-sub"><span class="muted">${esc(BANKS.find((b) => b[0] === p.bank)?.[1] || 'Banco')} · ${p.date.slice(8)}/${p.date.slice(5, 7)}</span>
      <select class="filter-select" aria-label="Onde lançar">${options(p).map(([v, l]) => `<option value="${esc(v)}" ${v === preferred(p) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
  </div>`;
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-backdrop><div class="modal"><h3>Confirmar lançamentos</h3>
    <p class="lead">Confira o que veio dos avisos dos bancos. Você pode mudar o nome e onde cada um entra.</p>
    <div class="bank-list">${data.pendingBank.map(row).join('')}</div>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal">Depois</button><button type="button" class="btn btn-primary" data-action="bank-save">Confirmar</button></div>
  </div></div>`;
  root.hidden = false;
}

function bankSave() {
  let saved = 0;
  $('#modal-root').querySelectorAll('.bank-row').forEach((el) => {
    const p = data.pendingBank.find((x) => x.id === el.dataset.id);
    if (!p) return;
    const dest = el.querySelector('select').value;
    const desc = el.querySelector('.bank-desc').value.trim() || p.desc;
    const m = p.date.slice(0, 7), who = defaultPerson();
    if (dest === 'dia') { (data.spending[m] ||= []).push({ id: uid(), date: p.date, desc, amount: p.amount, category: Statement.guessCategory(desc), owner: who }); saved++; }
    else if (dest === 'renda') { data.incomes.push({ id: uid(), name: desc, amount: p.amount, day: Number(p.date.slice(8)), month: m, owner: who }); saved++; }
    else if (dest.startsWith('card:')) {
      const card = data.cards.find((c) => c.id === dest.slice(5));
      if (!card) return;
      const inv = invoiceMonth(card, p.date);
      card.invoices[inv] = Math.round(((card.invoices[inv] || 0) + p.amount) * 100) / 100;
      saved++;
    }
    data.pendingBank = data.pendingBank.filter((x) => x !== p);
  });
  closeModal();
  commit();
  toast(saved === 1 ? '1 lançamento salvo' : `${saved} lançamentos salvos`);
}

let sharedHooked = false;
function start() {
  applyTheme(); render(); syncSecretary(); startBankSync();
  // Compartilhar
  if (api.onShared && !sharedHooked) { sharedHooked = true; api.onShared((res) => startImport(res)); }
  PrumoVoice.mountDock({
    handle: (t) => runCommand(t, 'texto'),
    getChat: () => data.chat,
    getUndo: () => lastUndo,
    onStatement: (file) => (file ? importDropped(file) : startImport()),
    clearChat: () => confirmModal('Apagar o histórico da conversa?', 'As mensagens somem, mas os gastos e pagamentos feitos pela conversa continuam.', 'Apagar', () => { data.chat = []; lastUndo = null; persist(); PrumoVoice.refreshChat(); }),
  });
}

async function boot() {
  try {
    store = await api.status();
    if (store.exists && store.encrypted && !store.unlocked) return showLock();
    let d = await api.load();
    if (!d) { d = api.mobile ? emptyData() : sampleData(); await api.save(d); store = await api.status(); }
    data = normalize(d);
    start();
  } catch (e) {
    $('#app').innerHTML = `<div class="lock-screen"><div class="lock-card"><h2>Não consegui abrir seus dados</h2><p>${esc(e.message)}</p><p>Há uma cópia de segurança (prumo-dados.json.bak) na pasta de dados.</p><button class="btn" data-action="open-folder" id="of">Abrir pasta de dados</button></div></div>`;
    $('#of').addEventListener('click', () => api.openFolder());
  }
}
boot().finally(async () => {
  const el = $('#splash');
  if (api.warmStart && await api.warmStart()) { el.remove(); applyTheme(); return; }
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  el.classList.add('go');
  await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 2350);
  el.classList.add('out');
  applyTheme();
  await wait(650);
  el.remove();
});
