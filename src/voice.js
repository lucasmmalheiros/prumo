'use strict';
// Conversa
(function () {
  const IDLE_UNLOAD_MS = 5 * 60 * 1000;
  const SILENCE_MS = 20 * 1000;
  const RING_SIZE = 150;

  // Reconhecedor
  let engineFrame = null, engineReady = null, engineWaiter = null, engineCb = null, unloadTimer = null;
  const post = (m, transfer) => engineFrame.contentWindow.postMessage(m, '*', transfer || []);

  function unloadEngine() {
    if (engineFrame) engineFrame.remove();
    engineFrame = null; engineReady = null; engineCb = null;
  }

  window.addEventListener('message', (e) => {
    if (!engineFrame || e.source !== engineFrame.contentWindow) return;
    const m = e.data || {};
    if (m.ev === 'ready') engineWaiter.resolve();
    else if (m.ev === 'error') { engineWaiter.reject(new Error(m.msg)); unloadEngine(); }
    else if (m.ev === 'partial' && engineCb) engineCb.partial(m.text);
    else if (m.ev === 'final' && engineCb) engineCb.final(m.text);
  });

  function getEngine() {
    clearTimeout(unloadTimer);
    if (!engineReady) {
      engineReady = new Promise((resolve, reject) => {
        engineWaiter = { resolve, reject };
        engineFrame = document.createElement('iframe');
        engineFrame.src = 'voice-engine.html';
        engineFrame.hidden = true;
        engineFrame.onload = () => post({ cmd: 'init' });
        document.body.appendChild(engineFrame);
      });
    }
    return engineReady;
  }

  function scheduleUnload() {
    clearTimeout(unloadTimer);
    unloadTimer = setTimeout(unloadEngine, IDLE_UNLOAD_MS);
  }

  // Anel
  const HOLE = 0.5;
  function ringEdge(ctx, cx, cy, r, amp, t, spin) {
    const N = 180;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const w = 0.5 * Math.sin(5 * a + t * 1.5 * spin) + 0.3 * Math.sin(8 * a - t * 1.0 * spin) + 0.2 * Math.sin(12 * a + t * 2.2 * spin);
      const rr = r + amp * w;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function drawRing(ctx, cx, cy, R, amp, t, spin, color, alpha) {
    ctx.beginPath();
    ringEdge(ctx, cx, cy, R, amp, t, spin);
    ringEdge(ctx, cx, cy, R * HOLE, amp * 0.55, t + 1.7, -spin);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill('evenodd');
  }

  // Sessão
  let s = null;
  const el = (id) => document.getElementById(id);

  function setStatus(text, bad) {
    if (!s) return;
    const st = el('v-status');
    st.textContent = text;
    st.classList.toggle('bad', !!bad);
  }
  function setText(text) { if (s) el('v-text').textContent = text; }

  function setBusy(on) {
    if (s) s.busy = on;
    const fab = document.querySelector('.voice-fab');
    if (!fab) return;
    fab.classList.toggle('on', on);
    const label = on ? 'Parar de ouvir' : 'Falar';
    fab.title = label;
    fab.setAttribute('aria-label', label);
  }

  function stopListening() {
    if (!s) return;
    s.listening = false; s.target = 0;
    clearTimeout(s.silence);
    if (!s.audio) return;
    const a = s.audio;
    s.audio = null;
    try { a.processor.disconnect(); a.source.disconnect(); } catch {}
    a.stream.getTracks().forEach((tr) => tr.stop());
    engineCb = null;
    if (engineFrame) post({ cmd: 'stop' });
    a.ctx.close();
    scheduleUnload();
  }

  function endWith(message, autoHide) {
    if (!s) return;
    stopListening();
    setBusy(false);
    s.hold = true;
    setText('');
    setStatus(message, true);
    if (autoHide) s.autoClose = setTimeout(endVoice, 5000);
  }

  function armSilence() {
    clearTimeout(s.silence);
    s.silence = setTimeout(() => endWith('Não ouvi nada. Toque no microfone para tentar de novo.', true), SILENCE_MS);
  }

  function onFinal(text) {
    if (!s || !text) return;
    setText('');
    let res;
    try { res = s.handle(text); } catch (e) { console.error(e); res = { ok: false, msg: 'Algo deu errado. Tente de novo.' }; }
    if (!s) return;
    if (res.ok || res.close) { endVoice(); return; }
    s.hold = true;
    setStatus('Pode tentar de novo');
    armSilence();
  }

  async function listen() {
    const session = s;
    if (!session) return;
    clearTimeout(session.autoClose);
    session.hold = false;
    setBusy(true);
    setStatus('Preparando o microfone...');
    setText('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      if (s !== session) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      setStatus('Carregando o reconhecimento de voz...');
      await getEngine();
      if (s !== session) { stream.getTracks().forEach((tr) => tr.stop()); scheduleUnload(); return; }
      const ctx = new AudioContext();
      await ctx.resume();
      engineCb = {
        final: onFinal,
        partial: (p) => {
          if (!p || s !== session || !session.listening) return;
          if (session.hold) { session.hold = false; setStatus('Ouvindo...'); }
          setText(p);
          armSilence();
        },
      };
      post({ cmd: 'start', rate: ctx.sampleRate });
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!session.listening || !engineFrame) return;
        const samples = new Float32Array(e.inputBuffer.getChannelData(0));
        post({ cmd: 'audio', samples }, [samples.buffer]);
      };
      source.connect(analyser);
      source.connect(processor);
      processor.connect(ctx.destination);
      session.audio = { ctx, stream, source, analyser, processor, buf: new Float32Array(analyser.fftSize) };
      session.listening = true;
      setStatus('Pode falar');
      armSilence();
    } catch (e) {
      console.error('voz:', e);
      if (s !== session) return;
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      const noMic = e && (e.name === 'NotFoundError' || e.name === 'NotReadableError');
      endWith(denied ? (window.prumo.mobile ? 'O microfone está bloqueado. Libere nas permissões do Prumo, nas configurações do celular.' : 'O microfone está bloqueado. Libere em Configurações do Windows > Privacidade e segurança > Microfone.') : noMic ? 'Nenhum microfone disponível. Confira se ele está conectado e livre.' : 'O reconhecimento de voz não carregou.');
    }
  }

  function frame(now) {
    if (!s) return;
    const t = now / 1000;
    if (s.audio && s.listening) {
      s.audio.analyser.getFloatTimeDomainData(s.audio.buf);
      let e = 0;
      for (const v of s.audio.buf) e += v * v;
      s.target = Math.min(1, Math.sqrt(e / s.audio.buf.length) * 7);
      const speaking = s.target > 0.08;
      if (speaking !== s.speaking) { s.speaking = speaking; if (!s.hold) setStatus(speaking ? 'Ouvindo...' : 'Pode falar'); }
    }
    s.level += (s.target - s.level) * (s.target > s.level ? 0.35 : 0.09);
    const { ctx, size, color } = s;
    const c = size / 2;
    ctx.clearRect(0, 0, size, size);
    const R = size * 0.25 * (1 + s.level * 0.35);
    const amp = R * (0.04 + s.level * 0.08);
    const speed = s.reduce ? 0.15 : 1;
    drawRing(ctx, c, c, R * 1.22, amp * 1.5, t * speed + 2.1, -1, color, 0.14 + s.level * 0.12);
    drawRing(ctx, c, c, R * 1.1, amp * 1.25, t * speed + 0.9, 1, color, 0.26 + s.level * 0.14);
    drawRing(ctx, c, c, R, amp, t * speed, 1, color, 1);
    s.raf = requestAnimationFrame(frame);
  }

  function startVoice(handle) {
    const canvas = el('v-ring');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = RING_SIZE * dpr;
    canvas.style.width = canvas.style.height = `${RING_SIZE}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s = {
      handle, ctx, size: RING_SIZE, level: 0, target: 0, listening: false, speaking: false, busy: false, hold: false,
      color: '#4f86ff',
      reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
    el('cmd-voice').hidden = false;
    const msgs = el('cmd-msgs');
    msgs.scrollTop = msgs.scrollHeight;
    s.raf = requestAnimationFrame(frame);
    listen();
  }

  function endVoice() {
    if (!s) return;
    stopListening();
    setBusy(false);
    cancelAnimationFrame(s.raf);
    clearTimeout(s.autoClose);
    s = null;
    scheduleUnload();
    el('cmd-voice').hidden = true;
    const msgs = el('cmd-msgs');
    msgs.scrollTop = msgs.scrollHeight;
  }

  // Janela
  let refreshChat = () => {};
  let openChat = () => {};
  let closeChat = () => {};
  let chatIsOpen = () => false;
  let dockEl = null;
  let inline = false;
  const CHAT_TITLE = 'Conversa com o Prumo', INLINE_TITLE = 'Converse com o Previsor';
  const PLACEHOLDER = 'Escreva aqui, ex.: paguei o aluguel', INLINE_PLACEHOLDER = 'Pergunte algo, ex.: posso gastar 500 em janeiro?';
  const SUGGESTIONS = ['Como fica o mês que vem?', 'Qual o mês mais apertado?', 'Por que minha nota é essa?', 'Posso gastar R$ 500 este mês?', 'Me dá uma dica'];

  function saveFocus() {
    const input = el('cmd-input');
    return input && document.activeElement === input ? { start: input.selectionStart, end: input.selectionEnd } : null;
  }

  function place(focus) {
    const dock = dockEl;
    if (!dock) return;
    const slot = el('fc-chat-slot');
    if (slot) {
      if (dock.parentNode !== slot) slot.appendChild(dock);
      if (!inline) {
        inline = true;
        openChat();
        dock.classList.add('inline');
        el('cmd-chat-title').textContent = INLINE_TITLE;
        el('cmd-input').placeholder = INLINE_PLACEHOLDER;
      }
      const msgs = el('cmd-msgs');
      msgs.scrollTop = msgs.scrollHeight;
    } else if (inline) {
      inline = false;
      document.body.appendChild(dock);
      dock.classList.remove('inline');
      el('cmd-chat-title').textContent = CHAT_TITLE;
      el('cmd-input').placeholder = PLACEHOLDER;
      closeChat();
      return;
    }
    if (focus) {
      const input = el('cmd-input');
      input.focus();
      input.setSelectionRange(focus.start, focus.end);
    }
  }

  // Microfone
  function open(handle) {
    openChat();
    if (s && s.busy) endVoice();
    else if (s) listen();
    else startVoice(handle);
  }

  function mountDock({ handle, getChat, getUndo, clearChat, onStatement }) {
    if (dockEl) return;
    const dock = dockEl = document.createElement('div');
    dock.id = 'cmd-dock';
    dock.className = 'cmd-dock';
    dock.innerHTML = `<div class="cmd-chat" id="cmd-chat" hidden>
        <div class="cmd-chat-head"><span id="cmd-chat-title">${CHAT_TITLE}</span><span class="cmd-chat-tools">
          <button type="button" class="icon-btn sm ghost" id="cmd-clear" title="Apagar histórico" aria-label="Apagar histórico">${window.ICONS.trash}</button>
          <button type="button" class="icon-btn sm ghost" id="cmd-chat-x" title="Fechar" aria-label="Fechar">${window.ICONS.x}</button>
        </span></div>
        <div class="cmd-msgs" id="cmd-msgs"></div>
        <div class="cmd-voice" id="cmd-voice" hidden>
          <canvas id="v-ring"></canvas>
          <div class="v-status" id="v-status" aria-live="polite"></div>
          <div class="v-text" id="v-text"></div>
        </div>
      </div>
      <div class="cmd-reply" id="cmd-reply" hidden></div>
      <div class="cmd-suggest" id="cmd-suggest"></div>
      <form class="cmd-row" id="cmd-form">
        <input id="cmd-input" type="text" maxlength="200" autocomplete="off" placeholder="${PLACEHOLDER}" aria-label="Escreva sua mensagem">
        <button type="button" class="voice-fab" data-action="voice" title="Falar" aria-label="Falar">${window.ICONS.mic}</button>
      </form>`;
    document.body.appendChild(dock);
    const reply = dock.querySelector('#cmd-reply'), input = dock.querySelector('#cmd-input');
    let timer = null;
    const hide = () => { clearTimeout(timer); reply.hidden = true; reply.textContent = ''; };
    const chat = dock.querySelector('#cmd-chat'), msgs = dock.querySelector('#cmd-msgs');

    const stamp = (ts) => {
      const d = new Date(ts);
      const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
    };
    const statementDrop = () => {
      const zone = document.createElement('button');
      zone.type = 'button';
      zone.className = 'cmd-drop';
      zone.innerHTML = `${window.ICONS.upload}<span><b>Enviar extrato</b><small>Clique para escolher ou arraste o arquivo aqui</small></span>`;
      zone.addEventListener('click', () => onStatement());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('over'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('over');
        const file = e.dataTransfer.files[0];
        if (file) onStatement(file);
      });
      return zone;
    };
    const drawChat = () => {
      if (chat.hidden) return;
      msgs.textContent = '';
      const list = getChat();
      if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'cmd-empty';
        empty.textContent = 'Escreva ou fale do seu jeito, como "gastei 30 reais no almoço" ou "quais contas faltam pagar?". As mensagens ficam guardadas aqui.';
        msgs.appendChild(empty);
      }
      list.forEach((m, i) => {
        const row = document.createElement('div');
        row.className = `cmd-row-msg ${m.who}`;
        const bubble = document.createElement('div');
        bubble.className = `cmd-b ${m.ok === false ? 'bad' : ''}`;
        bubble.textContent = m.text;
        const meta = document.createElement('div');
        meta.className = 'cmd-meta';
        if (m.via === 'voz') meta.innerHTML = window.ICONS.mic;
        meta.appendChild(document.createTextNode(`${m.via === 'voz' ? 'por voz · ' : ''}${stamp(m.ts)}`));
        row.append(bubble);
        if (m.attach === 'statement') row.appendChild(statementDrop());
        row.appendChild(meta);
        if (i === list.length - 1 && m.who === 'app' && getUndo()) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'link-btn'; b.textContent = 'Desfazer';
          b.addEventListener('click', () => getUndo() && getUndo()());
          meta.appendChild(b);
        }
        msgs.appendChild(row);
      });
      msgs.scrollTop = msgs.scrollHeight;
    };
    refreshChat = drawChat;
    chatIsOpen = () => !chat.hidden;
    openChat = () => { if (chat.hidden) { hide(); chat.hidden = false; dock.classList.add('open'); drawChat(); } };
    closeChat = () => {
      endVoice();
      if (inline) return;
      chat.hidden = true;
      dock.classList.remove('open');
    };
    dock.querySelector('#cmd-chat-x').addEventListener('click', () => closeChat());
    dock.querySelector('#cmd-clear').addEventListener('click', clearChat);
    input.addEventListener('focus', () => openChat());
    input.addEventListener('click', () => openChat());
    document.addEventListener('pointerdown', (e) => {
      if (inline || chat.hidden || dock.contains(e.target) || e.target.closest('#modal-root')) return;
      closeChat();
    });
    const suggest = dock.querySelector('#cmd-suggest');
    SUGGESTIONS.forEach((text) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cmd-chip'; b.textContent = text;
      b.addEventListener('click', () => { input.value = text; dock.querySelector('#cmd-form').requestSubmit(); });
      suggest.appendChild(b);
    });
    const show = (res) => {
      hide();
      const msg = document.createElement('span');
      msg.className = `cmd-msg ${res.ok ? 'ok' : 'bad'}`;
      msg.textContent = res.msg;
      reply.appendChild(msg);
      const addBtn = (label, cls, fn) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = cls; b.textContent = label;
        b.addEventListener('click', fn);
        reply.appendChild(b);
      };
      if (res.undo) addBtn('Desfazer', 'link-btn', () => { hide(); res.undo(); });
      addBtn('×', 'cmd-close', hide);
      reply.hidden = false;
      if (res.ok && !res.stay) timer = setTimeout(hide, 9000);
    };
    dock.querySelector('#cmd-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      let res;
      try { res = handle(text); } catch (err) { console.error(err); res = { ok: false, msg: 'Algo deu errado. Tente de novo.' }; }
      if (res.ok) input.value = '';
      if (res.attach) openChat();
      else if (res.close) hide();
      else if (chat.hidden) show(res);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      input.value = ''; hide(); closeChat(); input.blur();
    });
    place();
  }

  window.PrumoVoice = {
    open, mountDock, saveFocus, place,
    close: () => closeChat(),
    isOpen: () => (inline ? !!s : chatIsOpen()),
    isListening: () => !!(s && s.busy),
    refreshChat: () => refreshChat(),
  };
})();
