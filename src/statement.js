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
      // Descrição antes de identificador
      for (const re of [/(descri|histor)/, /(estabelecimento|title|titulo|lancamento|memo|detalhe)/, /identifica/]) {
        iDesc = header.findIndex((c) => re.test(c) && !/^(data|date)/.test(c));
        if (iDesc !== -1) break;
      }
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
  const Merchants = typeof module !== 'undefined' && module.exports ? require('./merchants.js') : root.PrumoMerchants;

  // Nome do estabelecimento
  const BOILER = /^(compra (no|com|de) (debito|credito|cartao)( via [a-z]+)?|compra|transferencia (enviada|recebida)( pelo pix)?|transf (enviada|recebida)|pix (enviado|recebido)|pagamento (de boleto )?(efetuado|realizado)?|pagto|pag|pg|debito automatico|deb aut|debito|credito|ted|doc|envio|recebimento)\b[\s\-:*]*/;
  function merchantKey(desc) {
    let t = norm(desc).replace(/[•*]/g, ' ');
    for (let i = 0; i < 3; i++) t = t.replace(BOILER, '').replace(/^(para|de|em|no|na)\s+/, '');
    t = t.split(/\s+-\s+/)[0].replace(/\b(ltda|eireli|me|epp|s ?a|cia|comercio|servicos|com)\b/g, ' ').replace(/[^a-z& ]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t.slice(0, 32);
  }

  // learned: { nome do estabelecimento: categoria } aprendido com o que a pessoa escolheu antes
  function guessCategory(desc, learned) {
    const key = merchantKey(desc);
    if (learned && key && learned[key]) return learned[key];
    const found = Merchants ? Merchants.find(desc) : null;
    if (found) return found;
    const t = ' ' + norm(desc) + ' ';
    const hit = RULES.find(([, re]) => re.test(t));
    return hit ? hit[0] : 'outros';
  }

  // PDF
  const MES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  const MONEY = /([-−+]\s?)?(R\$\s?)?([-−]\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})(\s?[DC](?![a-zà-ú])|-(?!\d))?/gi;
  const SKIP = /(saldo|total d|^total|resumo|limite|pagamento minimo|valor minimo|vencimento|pagina \d|ouvidoria|central de (atendimento|relacionamento)|cnpj|taxa de juros|custo efetivo|\bcet\b|encargos (de|do)|proxima fatura|fatura anterior|periodo|emitido em|extrato gerado|movimentacoes|lancamentos futuros|tem alguma duvida)/;

  function pdfDate(s, refYear, refMonth) {
    let m;
    const t = norm(s);
    if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/))) {
      const mo = Number(m[2]);
      let y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : refYear;
      if (!m[3] && refMonth && mo > refMonth + 1) y -= 1;
      if (mo < 1 || mo > 12 || Number(m[1]) < 1 || Number(m[1]) > 31) return null;
      return { date: `${y}-${pad2(mo)}-${pad2(m[1])}`, len: m[0].length };
    }
    if ((m = t.match(/^(\d{1,2})(?: de)? (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:(?: de)? (\d{4}))?\b/))) {
      const mo = MES[m[2]];
      let y = m[3] ? Number(m[3]) : refYear;
      if (!m[3] && refMonth && mo > refMonth + 1) y -= 1;
      return { date: `${y}-${pad2(mo)}-${pad2(m[1])}`, len: m[0].length };
    }
    return null;
  }

  // lines: texto de cada linha do PDF, na ordem da página
  function parsePDFLines(lines) {
    const all = norm(lines.join(' \n '));
    const cardScore = (all.match(/fatura|pagamento minimo|limite (total|disponivel)|cartao de credito|compras parceladas/g) || []).length;
    const bankScore = (all.match(/saldo (inicial|final|do dia|anterior|em conta)|extrato (de conta|da conta)|conta corrente|total de (entradas|saidas)/g) || []).length;
    const card = cardScore > bankScore;
    // ano e mês de referência
    const full = [...all.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b|\b(\d{1,2}) (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]* (?:de )?(20\d{2})\b/g)]
      .map((m) => (m[3] ? [Number(m[3]), Number(m[2])] : [Number(m[6]), MES[m[5]]])).filter(([, mo]) => mo >= 1 && mo <= 12).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const ref = full.length ? full[full.length - 1] : [new Date().getFullYear(), new Date().getMonth() + 1];
    const items = [];
    let cur = null, section = 0;
    for (const raw of lines) {
      let line = String(raw).replace(/\s+/g, ' ').trim();
      if (!line) continue;
      const d = pdfDate(line, ref[0], ref[1]);
      if (d) { cur = d.date; line = line.slice(d.len).trim(); }
      const n = norm(line);
      if (/^(total de )?(entradas|creditos|recebimentos)\b/.test(n)) section = 1;
      else if (/^(total de )?(saidas|debitos|pagamentos e transferencias)\b/.test(n)) section = -1;
      if (!line || SKIP.test(n)) continue;
      const money = [...line.matchAll(MONEY)];
      if (!money.length) { if (/[a-zà-ú]{3}/i.test(line)) items.push({ type: 'text', text: line, date: cur }); continue; }
      if (/\b(usd|us\$|eur|cotacao)\b/i.test(line) && money.length > 1) money.splice(1);
      const tok = money.length >= 2 ? money[money.length - 2] : money[0];
      const value = parseAmount(tok[4]);
      const explicit = /[-−]/.test((tok[1] || '') + (tok[3] || '')) || /^-$|D/i.test((tok[5] || '').trim()) ? -1 : /\+/.test(tok[1] || '') || /C/i.test((tok[5] || '').trim()) ? 1 : 0;
      let desc = line;
      for (const m of money) desc = desc.replace(m[0], ' ');
      desc = desc.replace(/\s+/g, ' ').replace(/^[\s\-–•|:]+|[\s\-–•|:]+$/g, '').trim();
      items.push({ type: 'tx', date: cur, value, explicit, section, desc });
    }
    // Descrição em mais de uma linha
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type !== 'text') continue;
      const next = items[i + 1], prev = items[i - 1];
      if (next && next.type === 'tx' && (next.desc.replace(/[^a-z]/gi, '').length < 4)) next.desc = (it.text + ' ' + next.desc).trim();
      else if (prev && prev.type === 'tx' && !prev.joined) { prev.desc = `${prev.desc} - ${it.text}`; prev.joined = true; }
    }
    const rows = [];
    for (const it of items) {
      if (it.type !== 'tx' || !it.date || !it.value || it.desc.replace(/[^a-z]/gi, '').length < 3) continue;
      const t = norm(it.desc);
      let sign = it.explicit;
      if (card) {
        if (!sign) sign = /(pagamento|estorno|credito|reembolso|cashback|desconto)/.test(t) ? -1 : 1;
      } else if (!sign) {
        if (it.section) sign = it.section;
        else sign = /(recebid|deposito|estorno|reembolso|salario|rendimento|resgate|credito em conta|devolucao)/.test(t) ? 1 : -1;
      }
      rows.push({ date: it.date, desc: it.desc.slice(0, 160), amount: Math.round(sign * it.value * 100) / 100 });
    }
    rows.forEach((r) => { r.key = `${r.date}|${r.amount.toFixed(2)}|${norm(r.desc).slice(0, 40)}`; });
    return { kind: 'PDF', rows, card };
  }

  function similar(a, b) {
    const wa = new Set(norm(a).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    const wb = norm(b).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    return wb.some((w) => wa.has(w) || [...wa].some((x) => x.startsWith(w) || w.startsWith(x)));
  }

  const api = { parse, parsePDFLines, parseAmount, parseDate, guessCategory, merchantKey, similar, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Statement = api;
})(typeof window !== 'undefined' ? window : globalThis);
