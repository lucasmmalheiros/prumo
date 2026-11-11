'use strict';
// Entende o texto de um aviso de banco: compra, Pix enviado ou dinheiro recebido.
// Na dúvida devolve null: propaganda, compra recusada e lembretes não viram lançamento.
(function (root) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const IGNORAR = /oferta|promoc|cashback|ganhe|aproveite|emprestimo|consignado|pre-?\s?aprovad|recusad|negad|nao aprovad|nao autoriz|bloquead|estorn|cancelad|devolvid|desfeit|codigo|token|senha|agendad|agendamento|tentativa|lembrete|investi|rendeu|rendimento|parcele|antecip|sorteio|premio|convide|desconto|pagamento.{0,30}recebido|(pagamento|pagou|paga).{0,20}fatura|fatura.{0,25}(fechou|fechada|vence|disponivel|paga|aberta)/;
  const ENTRADA = /\b(recebeu|recebido|recebida|caiu na|te enviou|te mandou|te transferiu|deposito (recebido|realizado|efetuado)|salario)\b/;
  const SAIDA = /pix (enviado|realizado|efetuado|feito|de saida)|voce (enviou|transferiu|pagou|fez um pix)|transferencia (enviada|realizada|efetuada)|pagamento (realizado|efetuado|aprovado|confirmado|de boleto)|boleto pago/;
  const COMPRA = /\bcompr(a|ou)\b|transacao (aprovada|realizada)|debito (aprovado|realizado|de r)|voce gastou/;
  const VALOR = /R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i;
  const CORTE = /\s+(?:foi|foram|às|as\s+\d|no\s+cart[aã]o|(?:com|para)\s+(?:o|seu)\s+cart[aã]o|final\s+\d|hoje|ontem|aprovad[ao]|\d{1,2}\/\d{1,2}|via|limite|saldo|por\s+pix)\b|[.;!](?:\s|$)/i;
  const NOME_RUIM = /^(\d|cart[aã]o|sua\b|seu\b|conta\b|pix\b|transfer|r\$|valor\b|uma?\b)/i;

  function valor(texto) {
    const m = String(texto).match(VALOR);
    if (!m) return null;
    const bruto = m[1];
    const numero = /,/.test(bruto) ? Number(bruto.replace(/\./g, '').replace(',', '.')) : /\.\d{3}$/.test(bruto) ? Number(bruto.replace(/\./g, '')) : Number(bruto);
    return numero > 0 ? { numero, fim: m.index + m[0].length, inicio: m.index } : null;
  }

  function limpar(trecho) {
    if (!trecho) return '';
    const nome = trecho.split(CORTE)[0].replace(/[\s,:\-]+$/, '').trim();
    if (!nome || nome.length < 2 || NOME_RUIM.test(nome)) return '';
    const curto = nome.slice(0, 60);
    return curto === curto.toUpperCase() ? curto.toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase()) : curto;
  }

  function primeiroNome(tentativas) {
    for (const t of tentativas) {
      const nome = t && limpar(t[1]);
      if (nome) return nome;
    }
    return '';
  }

  function parse(titulo, corpo) {
    const texto = String(corpo || '').replace(/\s+/g, ' ').trim();
    const tudo = `${titulo || ''}. ${texto}`;
    const t = norm(tudo);
    if (IGNORAR.test(t)) return null;
    const v = valor(texto) || valor(tudo);
    if (!v) return null;
    const origem = valor(texto) ? texto : tudo;
    const antes = origem.slice(0, v.inicio), depois = origem.slice(v.fim);
    const credit = /credito/.test(t) ? true : /debito/.test(t) ? false : null;

    if (ENTRADA.test(t)) {
      const desc = primeiroNome([depois.match(/\b(?:de|do|da|por)\s+(.+)/i), antes.match(/^(.+?)\s+(?:te\s+)?(?:enviou|mandou|transferiu)/i)]);
      return { kind: 'in', amount: v.numero, desc: desc || 'Dinheiro recebido', credit: null };
    }
    if (SAIDA.test(t)) {
      const desc = primeiroNome([depois.match(/\bpara\s+(.+)/i), antes.match(/\bpara\s+(.+)/i)]);
      return { kind: 'out', amount: v.numero, desc: desc || 'Pagamento', credit: null };
    }
    if (COMPRA.test(t)) {
      const desc = primeiroNome([depois.match(/\b(?:em|no|na)\s+(.+)/i), antes.match(/\b(?:em|no|na)\s+(.+?)\s*(?:de|no\s+valor|:)?\s*$/i), depois.match(/\bde\s+(.+)/i)]);
      return { kind: 'buy', amount: v.numero, desc: desc || 'Compra', credit };
    }
    return null;
  }

  const api = { parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BankParse = api;
})(typeof window !== 'undefined' ? window : globalThis);
