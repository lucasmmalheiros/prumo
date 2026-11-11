'use strict';
// Roda dentro de um quadro separado: a biblioteca de voz exige permissões que a tela principal,
// onde ficam os dados financeiros, não concede. Aqui só entra áudio e só sai texto.
(function () {
  const reply = (m) => parent.postMessage(m, '*');
  let model = null, rec = null, rate = 48000;

  async function init() {
    const m = new Vosk.Model('prumo-model://vosk/pt.tar.gz');
    await new Promise((resolve, reject) => {
      m.on('load', (msg) => (msg.result ? resolve() : reject(new Error('model-load'))));
      m.on('error', (msg) => reject(new Error(String(msg.error))));
    });
    model = m;
    reply({ ev: 'ready' });
  }

  function stop() { if (rec) { try { rec.remove(); } catch {} rec = null; } }

  window.addEventListener('message', (e) => {
    if (e.source !== parent) return;
    const c = e.data || {};
    if (c.cmd === 'init') init().catch((err) => reply({ ev: 'error', msg: String(err && err.message) }));
    else if (c.cmd === 'start' && model) {
      stop();
      rate = c.rate;
      const r = new model.KaldiRecognizer(rate);
      r.on('result', (msg) => { if (rec === r) reply({ ev: 'final', text: (msg.result.text || '').trim() }); });
      r.on('partialresult', (msg) => { if (rec === r) reply({ ev: 'partial', text: (msg.result.partial || '').trim() }); });
      rec = r;
    } else if (c.cmd === 'audio' && rec) rec.acceptWaveformFloat(c.samples, rate);
    else if (c.cmd === 'stop') stop();
  });
})();
