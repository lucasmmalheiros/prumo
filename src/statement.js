'use strict';
// Extratos
(function (root) {
  const pad2 = (n) => String(n).padStart(2, '0');

  function parseAmount(s) {
    if (s == null) return NaN;
    let t = String(s).trim().replace(/R\$|\s| /g, '');
    let neg = false;
    if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
    if (t.endsWith('-')) { neg = true; t = t.slice(0, -1); }
    if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^[-+]?\d+,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
    const n = Number(t);
    if (!Number.isFinite(n)) return NaN;
    return Math.round((neg ? -n : n) * 100) / 100;
  }

  function parseDate(s) {
    const t = String(s || '').trim();
    let m;
    if ((m = t.match(/^(\d{4})(\d{2})(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;                // OFX 20261105...
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
    if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
      const y = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${y}-${pad2(m[2])}-${pad2(m[1])}`;
    }
    return null;
  }

  function parseOFX(text) {
    const rows = [];
    const blocks = text.split(/<STMTTRN>/i).slice(1);
    for (const b of blocks) {
      const body = b.split(/<\/STMTTRN>/i)[0];
      const tag = (name) => { const m = body.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i')); return m ? m[1].trim() : ''; };
      const amount = parseAmount(tag('TRNAMT').replace(',', '.'));
      const date = parseDate(tag('DTPOSTED'));
      const desc = [tag('NAME'), tag('MEMO')].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' — ') || 'Sem descrição';
      if (date && Number.isFinite(amount)) rows.push({ date, desc: decodeEntities(desc), amount, ref: tag('FITID') });
    }
    return rows;
  }
  const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  function splitCSV(line, sep) {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === sep && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  }
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  function parseCSV(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const first = lines.slice(0, 5).join('\n');
    const sep = [';', '\t', ','].map((s) => [s, first.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    let hi = 0, header = null;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const cells = splitCSV(lines[i], sep).map(norm);
      if (cells.some((c) => /^(data|date|dt)/.test(c)) && cells.some((c) => /(valor|amount|value|quantia|credito|debito|entrada|saida)/.test(c))) { hi = i; header = cells; break; }
    }
    let iDate, iDesc, iAmt, iIn = -1, iOut = -1;
    if (header) {
      iDate = header.findIndex((c) => /^(data|date|dt)/.test(c));
      iIn = header.findIndex((c) => /(entrada|credito|credit)/.test(c) && !/data/.test(c));
      iOut = header.findIndex((c) => /(saida|debito|debit)/.test(c) && !/data/.test(c));
      iAmt = header.findIndex((c) => /(valor|amount|value|quantia)/.test(c));
      iDesc = header.findIndex((c) => /(descri|histor|lancamento|title|titulo|estabelecimento|memo|detalhe|identifica)/.test(c) && !/^(data|date)/.test(c));
      if (iDesc === -1) iDesc = header.findIndex((c, i) => i !== iDate && i !== iAmt);
    } else {
      const cells = splitCSV(lines[0], sep);
      iDate = cells.findIndex((c) => parseDate(c));
      iAmt = cells.findIndex((c, i) => i !== iDate && Number.isFinite(parseAmount(c)) && /\d/.test(c));
      iDesc = cells.findIndex((c, i) => i !== iDate && i !== iAmt);
      hi = -1;
    }
    if (iDate < 0 || (iAmt < 0 && iIn < 0 && iOut < 0)) return [];
    const rows = [];
    for (let i = hi + 1; i < lines.length; i++) {
      const c = splitCSV(lines[i], sep);
      const date = parseDate(c[iDate]);
      let amount;
      if (iIn >= 0 || iOut >= 0) {
        const inV = iIn >= 0 ? parseAmount(c[iIn]) : NaN, outV = iOut >= 0 ? parseAmount(c[iOut]) : NaN;
        amount = Number.isFinite(inV) && inV !== 0 ? Math.abs(inV) : Number.isFinite(outV) ? -Math.abs(outV) : parseAmount(c[iAmt]);
      } else amount = parseAmount(c[iAmt]);
      const desc = (c[iDesc] || '').replace(/\s+/g, ' ').trim() || 'Sem descrição';
      if (date && Number.isFinite(amount) && amount !== 0 && !/^saldo/i.test(desc)) rows.push({ date, desc, amount });
    }
    return rows;
  }

  function parse(text, name = '') {
    const isOFX = /<OFX>|OFXHEADER|<STMTTRN>/i.test(text) || /\.(ofx|qfx)$/i.test(name);
    const rows = isOFX ? parseOFX(text) : parseCSV(text);
    rows.forEach((r) => { r.key = `${r.date}|${r.amount.toFixed(2)}|${norm(r.desc).slice(0, 40)}`; });
    return { kind: isOFX ? 'OFX' : 'CSV', rows };
  }

  // Categorias
  const RULES = [
    ['impostos', /(iptu|ipva|darf|detran|licenciamento|multa|cartorio|receita federal)/],
    ['dividas', /(emprestimo|consignado|renegocia|acordo|parcela acordo)/],
    ['moradia', /(aluguel|condom|enel|light|cemig|copel|celesc|coelba|energia|sabesp|cedae|copasa|saneamento|agua|comgas|naturgy|ultragaz)/],
    ['assinaturas', /(netflix|spotify|disney|prime video|amazon prime|hbo|max |globoplay|youtube|deezer|apple\.com|icloud|google|microsoft|chatgpt|openai|crunchyroll|paramount|vivo|claro|tim |oi )/],
    ['pets', /(petz|cobasi|petlove|pet ?shop|veterin|racao)/],
    ['compras', /(shopee|shein|aliexpress|amazon|mercado ?livre|magalu|magazine luiza|americanas|casas bahia|renner|riachuelo|zara|centauro|netshoes|kabum)/],
    ['alimentacao', /(ifood|rappi|mercado|supermerc|atacad|assai|carrefour|extra |pao de acucar|padaria|restaur|lanchon|burger|mcdonald|pizza|acougue|hortifruti|zaffari|oxxo)/],
    ['transporte', /(uber|99 ?app|99pop|cabify|posto|shell|ipiranga|petrobras|combust|estaciona|sem parar|veloe|conectcar|metro|bilhete|onibus|pedagio)/],
    ['saude', /(farmac|drogaria|droga ?raia|drogasil|pague menos|hospital|clinica|laborat|unimed|amil|bradesco saude|sulamerica|dentist|academia|smart ?fit|bluefit|gympass|wellhub)/],
    ['cuidados', /(barbear|salao|cabelei|manicure|estetica|boticario|natura|sephora|perfum|cosmetic)/],
    ['lazer', /(cinema|ingresso|sympla|show|bar |cervej|steam|playstation|xbox|nintendo|viagem|hotel|airbnb|booking|decolar)/],
    ['educacao', /(escola|faculdade|curso|udemy|alura|livraria|livro|mensalidade)/],
  ];
  function guessCategory(desc) {
    const t = ' ' + norm(desc) + ' ';
    const hit = RULES.find(([, re]) => re.test(t));
    return hit ? hit[0] : 'outros';
  }

  function similar(a, b) {
    const wa = new Set(norm(a).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    const wb = norm(b).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    return wb.some((w) => wa.has(w) || [...wa].some((x) => x.startsWith(w) || w.startsWith(x)));
  }

  const api = { parse, parseAmount, parseDate, guessCategory, similar, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Statement = api;
})(typeof window !== 'undefined' ? window : globalThis);
