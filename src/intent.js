'use strict';
// Classificador
(function () {
  const BITS = 14;
  const DIM = 1 << BITS;
  const NUMBER_WORDS = new Set(['dois', 'duas', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa', 'cem', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos', 'mil']);

  function clean(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/r\$/g, ' ').replace(/[^a-z0-9\s]/g, ' ')
      .replace(/([a-z])\1{2,}/g, '$1') // "oiiii" vira "oi"
      .split(/\s+/).filter(Boolean)
      .map((w) => (/\d/.test(w) ? w.replace(/\d+/g, '#') : NUMBER_WORDS.has(w) ? '#' : w));
  }

  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }

  function features(text) {
    const words = clean(text);
    const acc = new Map();
    const add = (key, weight) => {
      const h = hash(key);
      const idx = h & (DIM - 1);
      const sign = h >>> 31 ? 1 : -1;
      acc.set(idx, (acc.get(idx) || 0) + sign * weight);
    };
    add('__vies__', 0.5);
    add(`__tam${Math.min(words.length, 6)}__`, 0.5);
    words.forEach((w, i) => {
      add(`p:${w}`, 1);
      if (i) add(`b:${words[i - 1]} ${w}`, 1);
      const padded = `<${w}>`;
      for (let n = 3; n <= 5; n++) for (let k = 0; k + n <= padded.length; k++) add(`c:${padded.slice(k, k + n)}`, 0.35);
    });
    let norm = 0;
    for (const v of acc.values()) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return [...acc].map(([i, v]) => [i, v / norm]);
  }

  function decode(b64) {
    if (typeof Buffer !== 'undefined') return new Int8Array(Buffer.from(b64, 'base64'));
    const bin = atob(b64);
    const out = new Int8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) << 24 >> 24;
    return out;
  }

  function predictor(model) {
    const weights = decode(model.weights);
    const n = model.classes.length;
    return (text) => {
      const score = new Float64Array(n);
      for (const [i, v] of features(text)) for (let c = 0; c < n; c++) score[c] += weights[i * n + c] * model.scale * v;
      const top = Math.max(...score);
      let total = 0;
      const probs = Array.from(score, (s) => { const p = Math.exp(s - top); total += p; return p; });
      let best = 0;
      probs.forEach((p, c) => { if (p > probs[best]) best = c; });
      return { intent: model.classes[best], p: probs[best] / total };
    };
  }

  const Intent = { DIM, clean, features, predictor };
  if (typeof module !== 'undefined' && module.exports) module.exports = Intent;
  else {
    window.Intent = Intent;
    window.classifyIntent = window.IntentModel ? predictor(window.IntentModel) : null;
  }
})();
