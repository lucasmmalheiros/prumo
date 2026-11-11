'use strict';
// Treino
// Uso: node tools/train-intent.js [avaliacao.json]
const fs = require('fs');
const path = require('path');
const Intent = require('../src/intent.js');
const { SLOTS, T } = require('./intent-data.js');

const PER_CLASS = 1400, EPOCHS = 14, LR = 0.35, L2 = 2e-6;

let seed = 20261110;
function rnd() { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (a) => a[Math.floor(rnd() * a.length)];

function expand(tpl) {
  let s = tpl;
  const inner = /\(([^()]*)\)/;
  while (inner.test(s)) s = s.replace(inner, (_, body) => pick(body.split('|')));
  return s.replace(/\$([AIMBSN])/g, (_, k) => pick(SLOTS[k])).replace(/\s+/g, ' ').trim();
}

// Variações
function typo(s) {
  if (s.length < 5) return s;
  const i = 1 + Math.floor(rnd() * (s.length - 2));
  const r = rnd();
  if (r < 0.4) return s.slice(0, i) + s.slice(i + 1);
  if (r < 0.7) return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
  return s.slice(0, i) + s[i] + s.slice(i);
}
const SLANG = [[/\bvoce\b/g, ['vc', 'c', 'ce', 'tu']], [/\bestou\b/g, ['to', 'tou']], [/\bpara\b/g, ['pra', 'p']], [/\bporque\b/g, ['pq']], [/\bpor que\b/g, ['pq']], [/\bnao\b/g, ['n', 'nn']], [/\bquanto\b/g, ['qnto', 'qnt', 'qto']], [/\besta\b/g, ['ta']], [/\bmuito\b/g, ['mt', 'mto']], [/\bque\b/g, ['q']], [/\bo que\b/g, ['oq', 'o q']], [/\btambem\b/g, ['tb', 'tbm']], [/\bmesmo\b/g, ['msm']], [/\btudo\b/g, ['td']], [/\bdemais\b/g, ['dms']], [/\bhoje\b/g, ['hj']], [/\baqui\b/g, ['aq']], [/\bpor favor\b/g, ['pfv', 'pf']], [/\bcom voce\b/g, ['ctg', 'cvc']], [/\bcomo\b/g, ['cm']], [/\bdinheiro\b/g, ['grana']], [/\bde\b/g, ['d']]];
const slang = (s) => SLANG.reduce((acc, [re, v]) => (rnd() < 0.3 ? acc.replace(re, pick(v)) : acc), s);
const PRE = ['oi ', 'ola ', 'ei ', 'prumo ', 'por favor ', 'cara ', 'bom dia ', 'boa tarde ', 'opa ', 'e ai ', 'entao ', 'me ve ', 'me fala ', 'me diz ', 'queria saber ', 'gostaria de saber ', 'preciso saber '];
const POST = [' por favor', ' ai', ' pra mim', ' obrigado', ' prumo', ' hoje', ' agora', ' viu', ' valeu'];
const CHAT = new Set(['hello', 'how', 'thanks', 'bye', 'who', 'help', 'praise', 'insult', 'ack', 'yes', 'no', 'out', 'broke']);
const ASKS = /^(q_|fc_)/;

function sample(cls) {
  let s = expand(pick(T[cls]));
  if (!CHAT.has(cls)) {
    const r = rnd();
    if (r < 0.14) s = pick(ASKS.test(cls) ? PRE : PRE.slice(0, 11)) + s;
    else if (r < 0.26) s += pick(POST);
  }
  s = slang(s);
  if (rnd() < 0.12) s = typo(s);
  return s;
}

const classes = Object.keys(T);
const n = classes.length;
const data = [];
for (let c = 0; c < n; c++) {
  const seen = new Set();
  for (let tries = 0; seen.size < PER_CLASS && tries < PER_CLASS * 40; tries++) seen.add(sample(classes[c]));
  // Balanceamento
  const list = [...seen];
  for (let i = 0; i < PER_CLASS; i++) { const s = list[i % list.length]; data.push([Intent.features(s), c]); }
  console.log(classes[c].padEnd(18), 'frases distintas:', list.length);
}

const DIM = Intent.DIM;
const W = new Float64Array(DIM * n);
const G = new Float64Array(DIM * n).fill(1e-8);
const score = new Float64Array(n);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } };

for (let e = 0; e < EPOCHS; e++) {
  shuffle(data);
  let loss = 0, hits = 0;
  for (const [x, y] of data) {
    score.fill(0);
    for (const [i, v] of x) for (let c = 0; c < n; c++) score[c] += W[i * n + c] * v;
    const top = Math.max(...score);
    let total = 0;
    for (let c = 0; c < n; c++) { score[c] = Math.exp(score[c] - top); total += score[c]; }
    let best = 0;
    for (let c = 0; c < n; c++) { score[c] /= total; if (score[c] > score[best]) best = c; }
    if (best === y) hits++;
    loss -= Math.log(score[y] + 1e-12);
    for (const [i, v] of x) {
      for (let c = 0; c < n; c++) {
        const k = i * n + c;
        const g = (score[c] - (c === y ? 1 : 0)) * v + L2 * W[k];
        G[k] += g * g;
        W[k] -= (LR / Math.sqrt(G[k])) * g;
      }
    }
  }
  console.log(`rodada ${e + 1}/${EPOCHS}  erro ${(loss / data.length).toFixed(4)}  acerto no treino ${((hits / data.length) * 100).toFixed(2)}%`);
}

let max = 0;
for (const v of W) if (Math.abs(v) > max) max = Math.abs(v);
const scale = max / 127;
const q = Buffer.alloc(W.length);
for (let i = 0; i < W.length; i++) q.writeInt8(Math.round(W[i] / scale), i);
const model = { classes, scale, weights: q.toString('base64') };
const out = path.join(__dirname, '..', 'src', 'intent-model.js');
fs.writeFileSync(out, `// Gerado por tools/train-intent.js. Não edite.\nwindow.IntentModel = ${JSON.stringify(model)};\n`);
console.log('modelo gravado:', (fs.statSync(out).size / 1024 / 1024).toFixed(2), 'MB');

const evalFile = process.argv[2];
if (evalFile) {
  const predict = Intent.predictor(model);
  const set = JSON.parse(fs.readFileSync(evalFile, 'utf8'));
  let ok = 0;
  for (const [s, exp] of set) {
    const r = predict(s);
    if (r.intent === exp) ok++;
    else console.log(`  ERROU "${s}" esperado ${exp}, disse ${r.intent} (${r.p.toFixed(2)})`);
  }
  console.log(`avaliação: ${ok}/${set.length} = ${((ok / set.length) * 100).toFixed(1)}%`);
}
