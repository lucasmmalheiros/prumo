'use strict';
// Comandos
(function () {
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const WORDS = {
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
    onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
    cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400,
    quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
  };
  const CURRENCY = new Set(['reais', 'real', 'conto', 'contos', 'pila', 'pilas', 'pau', 'paus', 'mango', 'mangos', 'prata', 'pratas']);
  const DIGITS = /^\d[\d.]*(,\d{1,2})?$/;

  function digitValue(t) {
    if (/^\d+\.\d{1,2}$/.test(t)) return Number(t);
    return Number(t.replace(/\./g, '').replace(',', '.'));
  }
  const isNum = (t) => t === 'mil' || t in WORDS || DIGITS.test(t);

  function tokenize(text) {
    const raw = String(text).trim().split(/\s+/).map((t) => t.replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, '').replace(/^r\$/i, '')).filter(Boolean);
    return { raw, toks: raw.map(norm) };
  }

  function findSpans(t) {
    const spans = [];
    let i = 0;
    while (i < t.length) {
      if (!isNum(t[i])) { i++; continue; }
      let j = i, total = 0, cur = 0, last = i, prev = 0;
      while (j < t.length) {
        const w = t[j];
        if (w === 'e' && j > i && j + 1 < t.length && isNum(t[j + 1])) { j++; continue; }
        if (!isNum(w)) break;
        if (w === 'mil') { total += (cur || 1) * 1000; cur = 0; prev = 0; }
        else if (w in WORDS) {
          if (prev && WORDS[w] >= prev) break;
          cur += WORDS[w]; prev = WORDS[w];
        } else {
          if (j > i) break;
          cur = digitValue(w); prev = 0;
        }
        last = j; j++;
      }
      spans.push({ start: i, end: last, value: total + cur });
      i = last + 1;
    }
    return spans;
  }

  // Valores
  function extract(t) {
    const spans = findSpans(t);
    const used = new Set();
    const mark = (a, b) => { for (let k = a; k <= b; k++) used.add(k); };
    let day = null;
    const rest = [];
    for (const s of spans) {
      if (t[s.start - 1] === 'dia' && s.value >= 1 && s.value <= 31 && day === null) { day = s.value; mark(s.start - 1, s.end); } else rest.push(s);
    }
    let amount = null;
    const withCur = rest.find((s) => CURRENCY.has(t[s.end + 1]));
    if (withCur) {
      amount = withCur.value;
      let end = withCur.end + 1;
      const next = rest[rest.indexOf(withCur) + 1];
      const joined = next && next.start === end + 2 && ['e', 'com'].includes(t[end + 1]);
      if (joined && next.value < 100 && (t[next.end + 1] === 'centavos' || t[end + 1] === 'e')) {
        amount += next.value / 100;
        end = t[next.end + 1] === 'centavos' ? next.end + 1 : next.end;
      }
      mark(withCur.start, end);
    } else {
      const real = rest.filter((s) => !(s.start === s.end && (t[s.start] === 'um' || t[s.start] === 'uma')));
      const s = real[real.length - 1];
      if (s) {
        amount = s.value;
        let start = s.start;
        const before = real[real.length - 2];
        if (before && s.value < 100 && before.end + 2 === s.start && t[before.end + 1] === 'e') { amount = before.value + s.value / 100; start = before.start; }
        mark(start, s.end);
      }
    }
    return { amount: amount === null ? null : Math.round(amount * 100) / 100, day, used };
  }

  const PREP = new Set(['no', 'na', 'nos', 'nas', 'em', 'de', 'do', 'da', 'dos', 'das', 'com', 'pro', 'pra', 'para']);
  const NOISE = new Set(['eu', 'o', 'a', 'os', 'as', 'um', 'uma', 'por', 'hoje', 'ontem', 'agora', 'gastei', 'gasto', 'comprei', 'compra', 'paguei', 'torrei', 'almocei', 'jantei', 'abasteci', 'pedi', 'recebi', 'ganhei', 'entrou', 'caiu', 'adicionar', 'adiciona', 'lancar', 'lanca', 'reais', 'real', 'deu', 'foi', 'foram', 'saiu', 'sairam', 'custou', 'ficou', 'pingou', 'ai', 'la', 'aqui', 'anota', 'anotar', 'coloca', 'colocar', 'bota', 'botar', 'registra', 'registrar', 'mete', 'meti', 'poe', 'me', 'mim', 'pagou', 'pagaram', 'deram', 'consegui', 'num', 'numa', 'prumo', 'oi', 'ola', 'opa', 'tive', 'fiz', 'acabei', 'gastar', 'favor', 'viu', 'valeu', 'obrigado']);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function describe(tk, used, fallback) {
    const idx = tk.toks.map((_, i) => i).filter((i) => !used.has(i));
    const p = idx.findIndex((i) => PREP.has(tk.toks[i]));
    const after = p >= 0 ? idx.slice(p + 1).filter((i) => !NOISE.has(tk.toks[i])) : [];
    while (after.length && PREP.has(tk.toks[after[after.length - 1]])) after.pop();
    const pick = after.length ? after : idx.filter((i) => !NOISE.has(tk.toks[i]) && !PREP.has(tk.toks[i]));
    const out = pick.map((i) => tk.raw[i]).join(' ').toLowerCase();
    return out ? cap(out) : fallback;
  }

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }

  const BILL_STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'conta', 'contas', 'boleto', 'fatura', 'cartao', 'mensalidade']);
  const sameWord = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && lev(a, b) <= 1);

  // Contas
  function findBill(toks, bills, wantPaid) {
    const scored = bills.map((b) => {
      const words = norm(b.name).split(/[^a-z0-9]+/).filter((w) => w && !BILL_STOP.has(w));
      const hit = words.filter((w) => toks.some((t) => sameWord(t, w))).length;
      return { b, score: words.length ? hit / words.length : 0 };
    }).filter((x) => x.score >= 0.5);
    if (!scored.length) return {};
    const pref = scored.filter((x) => x.b.paid === wantPaid);
    const pool = pref.length ? pref : scored;
    const top = Math.max(...pool.map((x) => x.score));
    const best = pool.filter((x) => x.score === top);
    if (best.length > 1) return { options: best.slice(0, 4).map((x) => x.b.name) };
    return { bill: best[0].b };
  }

  const NAV = [
    [/\b(visao geral|inicio|painel|resumo|tela inicial)\b/, 'visao'],
    [/\b(previsor|previsao|previsoes|saude financeira)\b/, 'previsor'],
    [/\bfluxo\b/, 'fluxo'],
    [/\bcart(ao|oes)\b/, 'cartoes'],
    [/\breserva\b/, 'reserva'],
    [/\bmetas\b/, 'metas'],
    [/\brenda\b/, 'renda'],
    [/\bconfigurac|\bajustes\b/, 'config'],
    [/\bcontas\b/, 'contas'],
    [/\b(casa|moradia)\b/, 'casa'],
  ];

  function monthRefs(t, months) {
    const idx = (months || []).findIndex((m) => new RegExp(`\\b${norm(m)}\\b`).test(t));
    return { month: idx >= 0 ? idx + 1 : undefined, rel: /\b(proximo mes|mes que vem|mes seguinte)\b/.test(t) ? 1 : undefined };
  }

  function affordQuestion(tk, t, month, rel, saving) {
    const drop = new Set();
    let parcels = 1;
    for (const s of findSpans(tk.toks)) {
      if (!['vezes', 'parcelas', 'x'].includes(tk.toks[s.end + 1])) continue;
      parcels = s.value;
      for (let k = s.start; k <= s.end + 1; k++) drop.add(k);
    }
    tk.toks.forEach((w, i) => { const m = w.match(/^(\d{1,2})x$/); if (m) { parcels = Number(m[1]); drop.add(i); } });
    const { amount } = extract(tk.toks.filter((_, i) => !drop.has(i)));
    if (!amount) return { type: 'need', reason: 'valor' };
    if (saving) return { type: 'fc', what: 'save', amount, extra: /\ba mais\b/.test(t) };
    return { type: 'fc', what: 'afford', amount, parcels: Math.max(1, parcels), month, rel };
  }

  // Previsão
  function forecastIntent(tk, t, months) {
    const { month, rel } = monthRefs(t, months);

    if (/\b(posso|consigo|da pra|da para|cabe|e se)\b/.test(t)) {
      const saving = /\bguard\w*\b/.test(t);
      if (saving || /\b(gast\w*|compr\w*|parcel\w*|pagar|pago)\b/.test(t)) return affordQuestion(tk, t, month, rel, saving);
    }
    if (/\b(pior mes|mes mais (apertado|dificil|critico|complicado))\b/.test(t)) return { type: 'fc', what: 'worst' };
    if (/\b(melhor mes|mes mais (folgado|tranquilo))\b/.test(t)) return { type: 'fc', what: 'best' };
    if (/\bnota\b/.test(t) && /\b(por que|porque|melhorar|subir|aumentar|puxa|pesa)\b/.test(t)) return { type: 'fc', what: 'why' };
    if (/\b(dica|dicas|conselho|conselhos|sugestao|sugestoes)\b/.test(t) || /\bo que (eu )?(posso|devo|preciso) (melhorar|mudar|fazer)\b/.test(t)) return { type: 'fc', what: 'tips' };
    if (/\bmetas\b/.test(t) && /\b(quanto|como|cabe|consigo|vou)\b/.test(t)) return { type: 'fc', what: 'goals' };
    if (/\b(quando|quanto tempo)\b/.test(t) && /\b(meta|reserva)\b/.test(t)) return { type: 'fc', what: 'goal' };
    if (/\b(negativo|vermelho|devendo)\b/.test(t)) return { type: 'fc', what: 'negative' };
    if (/\b(proximos( \w+)? meses|semestre)\b/.test(t) && /\b(sobr\w*|previs\w*|fica\w*|vou ter)\b/.test(t)) return { type: 'fc', what: 'total' };
    if ((month || rel) && (/\b(sobr\w*|previs\w*|como fica|como vai|vou ter|vai ter|fica|ficar)\b/.test(t) || /^e (em|no|para|pra)\b/.test(t))) return { type: 'fc', what: 'month', month, rel };
    return null;
  }

  function parse(text, ctx = {}) {
    const tk = tokenize(text);
    const t = tk.toks.join(' ');
    if (!t) return { type: 'unknown' };
    const bills = ctx.bills || [];

    if (/^(oi|ola|opa|e ai|eai|bom dia|boa tarde|boa noite|tudo bem|(oi|ola) tudo bem|ajuda|o que voce (faz|sabe fazer)|como funciona)$/.test(t)) return { type: 'hello' };
    if (/\b(extratos?|ofx)\b/.test(t)) return { type: 'statement' };

    // Metas
    if (ctx.goals && ctx.goals.length && !/\breserva\b/.test(t) && !/\b(posso|consigo|da pra|da para|e se)\b/.test(t)) {
      const hit = findBill(tk.toks, ctx.goals, false).bill;
      if (hit) {
        const dep = /\b(guard\w*|deposit\w*|coloc\w*|bot\w*|adicion\w*|junt\w*)\b/.test(t);
        const wit = /\b(retir\w*|tir\w*|saque\w*|saca\w*|usei)\b/.test(t);
        if (dep || wit) {
          const { amount } = extract(tk.toks);
          return amount ? { type: 'goalmove', kind: wit ? 'withdraw' : 'deposit', goal: hit, amount } : { type: 'need', reason: 'valor' };
        }
        if (/\b(quanto|quando|como|falta|meta)\b/.test(t)) return { type: 'goalinfo', goal: hit };
      }
    }

    const fc = forecastIntent(tk, t, ctx.months);
    if (fc) return fc;

    if (/^(quanto|qual|quais|como (esta|estao)|o que (vence|falta)|tem conta)/.test(t)) {
      if (/saude|previs|nota/.test(t)) return { type: 'nav', page: 'previsor' };
      if (/reserva|guardad/.test(t)) return { type: 'query', what: 'reserva' };
      if (/vence|pagar|falta|contas|boleto/.test(t)) return { type: 'query', what: 'contas' };
      if (/renda|ganho|recebo|salario/.test(t)) return { type: 'query', what: 'renda' };
      if (/gast/.test(t)) return { type: 'query', what: 'gastos' };
      if (/sobr|saldo/.test(t)) return { type: 'query', what: 'saldo' };
      return { type: 'unknown' };
    }

    const theme = t.match(/\b(modo|tema) (escuro|claro)\b/);
    if (theme) return { type: 'theme', value: theme[2] === 'escuro' ? 'dark' : 'light' };

    if (/\b(proximo mes|mes que vem|mes seguinte)\b/.test(t)) return { type: 'month', dir: 1 };
    if (/\b(mes passado|mes anterior)\b/.test(t)) return { type: 'month', dir: -1 };
    if (/\b(mes atual|este mes|esse mes)\b/.test(t)) return { type: 'month', dir: 0 };

    const { amount, day, used } = extract(tk.toks);

    if (/\breserva\b/.test(t)) {
      const dep = /\b(guard\w*|deposit\w*|coloc\w*|poe|por|bot\w*|adicion\w*)\b/.test(t);
      const wit = /\b(retir\w*|tir\w*|saque\w*|saca\w*|sacar|usei|usar)\b/.test(t);
      if (dep || wit) return amount ? { type: 'reserve', kind: wit ? 'withdraw' : 'deposit', amount } : { type: 'need', reason: 'valor' };
    }

    const nb = t.match(/\b(nova conta|novo boleto|(adiciona\w*|cria\w*|cadastra\w*|lanca\w*) (uma |a )?(nova )?conta)\b/);
    if (nb) {
      const at = tk.toks.indexOf('conta') >= 0 ? tk.toks.indexOf('conta') : tk.toks.indexOf('boleto');
      const words = tk.toks.map((w, i) => i).filter((i) => i > at && !used.has(i) && !(i === at + 1 && PREP.has(tk.toks[i])) && !['chamada', 'reais', 'vencimento', 'vence', 'que'].includes(tk.toks[i]) && !(PREP.has(tk.toks[i]) && i > at + 1));
      return { type: 'newbill', name: cap(words.map((i) => tk.raw[i]).join(' ').toLowerCase()), amount: amount || '', day: day || undefined };
    }

    if (/\b(recebi|ganhei|entrou|caiu)\b/.test(t)) {
      return amount ? { type: 'income', amount, desc: describe(tk, used, 'Entrada') } : { type: 'need', reason: 'valor' };
    }

    if (/\b(desmarca\w*|nao paguei|deixa\w* em aberto)\b/.test(t)) {
      const f = findBill(tk.toks, bills, true);
      if (f.bill) return { type: 'unpay', bill: f.bill };
      return f.options ? { type: 'need', reason: 'qual', options: f.options } : { type: 'need', reason: 'conta' };
    }

    const payVerb = /\b(paguei|pagar|paga|pago|quitei|quitar|marca\w*|baixa)\b/.test(t);
    if (payVerb) {
      const f = findBill(tk.toks, bills, false);
      if (f.bill) return { type: 'pay', bill: f.bill };
      if (f.options) return { type: 'need', reason: 'qual', options: f.options };
      if (!amount) return { type: 'need', reason: 'conta' };
    }

    if (payVerb || /\b(gastei|comprei|torrei|almocei|jantei|abasteci|pedi)\b/.test(t)) {
      return amount ? { type: 'spend', amount, desc: describe(tk, used, 'Gasto por voz') } : { type: 'need', reason: 'valor' };
    }

    if (ctx.months && !amount) {
      const idx = ctx.months.findIndex((m) => new RegExp(`\\b${norm(m)}\\b`).test(t));
      if (idx >= 0) return { type: 'month', dir: 1, month: idx + 1 };
    }

    for (const [re, page] of NAV) if (re.test(t)) return { type: 'nav', page };
    return { type: 'unknown' };
  }

  // Modelo
  const CONVERSA = new Set(['hello', 'how', 'thanks', 'bye', 'who', 'help', 'praise', 'insult', 'ack', 'yes', 'no', 'out', 'broke']);
  const ALTERA_INTENT = new Set(['spend', 'income', 'pay', 'unpay', 'reserve_deposit', 'reserve_withdraw']);
  const ALTERA_REGRA = new Set(['spend', 'income', 'pay', 'unpay', 'reserve', 'goalmove']);
  const ALTERA_CMD = new Set(['spend', 'income', 'pay', 'unpay', 'reserve']);
  const MINIMO = 0.55;
  const CERTEZA = 0.9;
  const PEDIDO_CLARO = /\b(lanc\w*|anot\w*|registr\w*|coloc\w*|bot\w*|mete|meti|poe|adicion\w*|inclu\w*|gastei|paguei|comprei|torrei|pedi|peguei|abasteci|acabei|tive|fiz|deu|saiu|foi|foram|custou|ficou|recebi|ganhei|entrou|caiu|pingou|chegou|depositaram|pagaram|deram|mandaram|transferiram|consegui|guard\w*|deposit\w*|separ\w*|jog\w*|manda|tir\w*|retir\w*|saqu\w*|saca\w*|resgat\w*|usei|precisei|larguei|queimei|soltei|deixei|mandei)\b/;
  const SO_INTENCAO = /\b(vou|vai|irei|preciso|tenho que|sem|quero|queria|deveria|pretendo|amanha|depois)\b/;
  const VERBO_NAV = /\b(abr\w*|vai|ir|va|mostra\w*|ver|volta\w*|entra\w*|muda\w*|troca\w*|lev\w*|acess\w*|tela|pagina|aba)\b/;
  const NOME_NOVA_CONTA = new Set(['nova', 'novo', 'conta', 'contas', 'boleto', 'fixa', 'despesa', 'cria', 'criar', 'cadastra', 'cadastrar', 'adiciona', 'adicionar', 'inclui', 'quero', 'tenho', 'apareceu', 'assinei', 'assinatura', 'comecei', 'vou', 'comecar', 'agora', 'pago', 'pagar', 'fiz', 'todo', 'mes', 'mensal', 'chamada', 'vence', 'reais', 'real', 'oi', 'ola', 'prumo']);

  function billCommand(type, tk, bills, wantPaid) {
    const f = findBill(tk.toks, bills, wantPaid);
    if (f.bill) return { type, bill: f.bill };
    return f.options ? { type: 'need', reason: 'qual', options: f.options } : { type: 'need', reason: 'conta' };
  }

  function fromIntent(intent, tk, t, ctx) {
    const { amount, day, used } = extract(tk.toks);
    const { month, rel } = monthRefs(t, ctx.months);
    const valued = (cmd) => (amount ? cmd : { type: 'need', reason: 'valor' });
    if (intent.startsWith('q_')) return { type: 'query', what: intent.slice(2) };
    if (intent === 'fc_month') return { type: 'fc', what: 'month', month, rel: month ? undefined : 1 };
    if (intent === 'fc_afford') return affordQuestion(tk, t, month, rel, false);
    if (intent.startsWith('fc_')) return { type: 'fc', what: intent.slice(3) };
    switch (intent) {
      case 'spend': return valued({ type: 'spend', amount, desc: describe(tk, used, 'Gasto') });
      case 'income': return valued({ type: 'income', amount, desc: describe(tk, used, 'Entrada') });
      case 'reserve_deposit': return valued({ type: 'reserve', kind: 'deposit', amount });
      case 'reserve_withdraw': return valued({ type: 'reserve', kind: 'withdraw', amount });
      case 'pay': return billCommand('pay', tk, ctx.bills || [], false);
      case 'unpay': return billCommand('unpay', tk, ctx.bills || [], true);
      case 'statement': return { type: 'statement' };
      case 'newbill': {
        const words = tk.toks.map((_, i) => i).filter((i) => !used.has(i) && !NOME_NOVA_CONTA.has(tk.toks[i]) && !PREP.has(tk.toks[i]) && !NOISE.has(tk.toks[i]));
        return { type: 'newbill', name: cap(words.map((i) => tk.raw[i]).join(' ').toLowerCase()), amount: amount || '', day: day || undefined };
      }
      case 'nav':
        for (const [re, page] of NAV) if (re.test(t)) return { type: 'nav', page };
        return null;
      default: return null;
    }
  }

  function understand(text, ctx = {}, classify) {
    const rule = parse(text, ctx);
    if (!classify) return rule;
    const tk = tokenize(text);
    const t = tk.toks.join(' ');
    if (!t) return rule;
    const { intent, p } = classify(text);
    const rulesGaveUp = rule.type === 'unknown' || rule.type === 'hello' || (rule.type === 'need' && rule.reason !== 'qual')
      || (rule.type === 'month' && rule.month && tk.toks.length > 1 && !VERBO_NAV.test(t));
    const citouTela = rule.type === 'nav' && tk.toks.length > 2 && !VERBO_NAV.test(t);
    const semRegra = citouTela ? { type: 'unknown' } : rule;
    if (!rulesGaveUp && !citouTela) {
      const duvida = ALTERA_REGRA.has(rule.type) && (SO_INTENCAO.test(t) || (p >= CERTEZA && !ALTERA_INTENT.has(intent) && intent !== 'newbill'));
      return duvida ? { type: 'confirm', cmd: rule } : rule;
    }
    if (p < MINIMO) return semRegra;
    if (CONVERSA.has(intent)) return { type: 'chat', intent };
    const cmd = fromIntent(intent, tk, t, ctx);
    if (!cmd) return semRegra;
    if (!ALTERA_CMD.has(cmd.type)) return cmd;
    const direto = cmd.type !== 'pay' && cmd.type !== 'unpay' && p >= CERTEZA && PEDIDO_CLARO.test(t) && !SO_INTENCAO.test(t);
    return direto ? cmd : { type: 'confirm', cmd };
  }

  const VoiceCommands = { parse, understand };
  if (typeof module !== 'undefined' && module.exports) module.exports = VoiceCommands;
  else window.VoiceCommands = VoiceCommands;
})();
