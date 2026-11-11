'use strict';
// Ilustrações e ícones

window.ILLU = {
  wallet: `<svg viewBox="0 0 120 110" aria-hidden="true">
    <defs>
      <linearGradient id="w-bill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ee0a1"/><stop offset="1" stop-color="#22a35a"/></linearGradient>
      <linearGradient id="w-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f4b"/><stop offset="1" stop-color="#14171d"/></linearGradient>
      <linearGradient id="w-flap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b515e"/><stop offset="1" stop-color="#262a33"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="100" rx="44" ry="6" fill="#000" opacity=".12"/>
    <g transform="rotate(-14 60 40)">
      <rect x="28" y="14" width="66" height="34" rx="4" fill="url(#w-bill)"/>
      <rect x="34" y="19" width="54" height="24" rx="3" fill="none" stroke="#e9fff1" stroke-opacity=".6"/>
      <circle cx="61" cy="31" r="6" fill="#e9fff1" opacity=".55"/>
    </g>
    <g transform="rotate(-6 60 40)">
      <rect x="24" y="22" width="66" height="34" rx="4" fill="url(#w-bill)"/>
      <text x="73" y="36" font-size="9" font-weight="800" fill="#0f6b37" font-family="Segoe UI, sans-serif">100</text>
    </g>
    <rect x="16" y="36" width="88" height="60" rx="12" fill="url(#w-body)"/>
    <rect x="16" y="36" width="88" height="60" rx="12" fill="none" stroke="#5b6270" stroke-opacity=".5"/>
    <path d="M70 52h30a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H70a8 8 0 0 1-8-8v-10a8 8 0 0 1 8-8z" fill="url(#w-flap)"/>
    <circle cx="76" cy="65" r="5" fill="#c9ced8"/><circle cx="76" cy="65" r="2.2" fill="#8a909c"/>
    <path d="M22 44h56" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>
  </svg>`,

  calendar: `<svg viewBox="0 0 120 110" aria-hidden="true">
    <defs>
      <linearGradient id="c-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b8cff"/><stop offset="1" stop-color="#2156e8"/></linearGradient>
      <linearGradient id="c-coin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd76a"/><stop offset="1" stop-color="#e59a12"/></linearGradient>
    </defs>
    <ellipse cx="62" cy="101" rx="42" ry="5" fill="#000" opacity=".1"/>
    <g transform="rotate(6 64 54)">
      <rect x="30" y="18" width="74" height="76" rx="10" fill="#fff" stroke="#dfe5ef"/>
      <path d="M30 28a10 10 0 0 1 10-10h54a10 10 0 0 1 10 10v12H30z" fill="url(#c-top)"/>
      <rect x="44" y="11" width="6" height="15" rx="3" fill="#9aa5b8"/><rect x="84" y="11" width="6" height="15" rx="3" fill="#9aa5b8"/>
      <g fill="#d6deeb">
        <rect x="38" y="48" width="12" height="9" rx="2"/><rect x="54" y="48" width="12" height="9" rx="2"/><rect x="70" y="48" width="12" height="9" rx="2" fill="#2f6bff"/><rect x="86" y="48" width="12" height="9" rx="2"/>
        <rect x="38" y="62" width="12" height="9" rx="2"/><rect x="54" y="62" width="12" height="9" rx="2"/><rect x="70" y="62" width="12" height="9" rx="2"/><rect x="86" y="62" width="12" height="9" rx="2"/>
        <rect x="38" y="76" width="12" height="9" rx="2"/><rect x="54" y="76" width="12" height="9" rx="2"/>
      </g>
    </g>
    <circle cx="30" cy="80" r="17" fill="url(#c-coin)"/>
    <circle cx="30" cy="80" r="12.5" fill="none" stroke="#fff3c4" stroke-opacity=".8" stroke-width="1.5"/>
    <text x="30" y="85" text-anchor="middle" font-size="12" font-weight="800" fill="#9a5b00" font-family="Segoe UI, sans-serif">R$</text>
  </svg>`,

  card: `<svg viewBox="0 0 120 100" aria-hidden="true">
    <defs>
      <linearGradient id="k-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d93ff"/><stop offset="1" stop-color="#1747d6"/></linearGradient>
      <linearGradient id="k-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#d99a1a"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="88" rx="44" ry="5" fill="#000" opacity=".1"/>
    <g transform="rotate(-18 60 50)">
      <rect x="14" y="26" width="92" height="56" rx="9" fill="#0f2f8f"/>
      <rect x="14" y="22" width="92" height="56" rx="9" fill="url(#k-a)"/>
      <rect x="26" y="38" width="18" height="13" rx="3" fill="url(#k-b)"/>
      <path d="M14 34h92" stroke="#fff" stroke-opacity=".15" stroke-width="7"/>
      <rect x="26" y="62" width="40" height="4" rx="2" fill="#fff" opacity=".55"/>
    </g>
  </svg>`,

  house: `<svg viewBox="0 0 120 110" aria-hidden="true">
    <defs>
      <linearGradient id="h-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a6b"/><stop offset="1" stop-color="#e2562f"/></linearGradient>
      <linearGradient id="h-wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe6f1"/></linearGradient>
      <linearGradient id="h-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#0f8f80"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="102" rx="46" ry="5" fill="#000" opacity=".1"/>
    <rect x="80" y="20" width="11" height="26" rx="2" fill="#b9543a"/>
    <path d="M22 58h76v36a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6z" fill="url(#h-wall)" stroke="#d3dbe8"/>
    <path d="M56.8 13.6 10.4 53.5A4 4 0 0 0 13 60.5h94a4 4 0 0 0 2.6-7L63.2 13.6a5 5 0 0 0-6.4 0z" fill="url(#h-roof)"/>
    <circle cx="60" cy="42" r="7" fill="#fff5ec"/>
    <rect x="50" y="71" width="20" height="29" rx="3" fill="url(#h-door)"/><circle cx="65" cy="86" r="1.7" fill="#fff"/>
    <rect x="30" y="70" width="13" height="13" rx="2.5" fill="#a7d3ff"/><rect x="77" y="70" width="13" height="13" rx="2.5" fill="#a7d3ff"/>
  </svg>`,

  donut: `<svg viewBox="0 0 120 110" aria-hidden="true">
    <defs><linearGradient id="d-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6ebf3"/></linearGradient></defs>
    <ellipse cx="60" cy="100" rx="38" ry="5" fill="#000" opacity=".1"/>
    <g transform="translate(60 54)">
      <circle r="38" fill="#2f6bff"/>
      <path d="M0 0 0-38A38 38 0 0 1 36.1-11.7Z" fill="#f59e0b"/>
      <path d="M0 0 36.1-11.7A38 38 0 0 1 22.3 30.7Z" fill="#ec4899"/>
      <path d="M0 0 22.3 30.7A38 38 0 0 1-15.5 34.7Z" fill="#8b5cf6"/>
      <path d="M0 0-15.5 34.7A38 38 0 0 1-35.6 13.3Z" fill="#16a34a"/>
      <circle r="19" fill="url(#d-c)"/>
      <text y="5" text-anchor="middle" font-size="13" font-weight="800" fill="#1f2937" font-family="Segoe UI, sans-serif">%</text>
    </g>
  </svg>`,

  piggy: `<svg viewBox="0 0 130 110" aria-hidden="true">
    <defs>
      <linearGradient id="p-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3cf"/><stop offset="1" stop-color="#f06292"/></linearGradient>
      <linearGradient id="p-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe082"/><stop offset="1" stop-color="#f0a417"/></linearGradient>
    </defs>
    <ellipse cx="64" cy="100" rx="44" ry="5" fill="#000" opacity=".1"/>
    <circle cx="70" cy="14" r="11" fill="url(#p-c)"/><text x="70" y="18" text-anchor="middle" font-size="9" font-weight="800" fill="#9a5b00" font-family="Segoe UI, sans-serif">R$</text>
    <ellipse cx="62" cy="62" rx="42" ry="32" fill="url(#p-b)"/>
    <path d="M40 34 34 18l18 10z" fill="#f48fb1"/>
    <rect x="34" y="84" width="11" height="14" rx="4" fill="#ec6f9b"/><rect x="74" y="84" width="11" height="14" rx="4" fill="#ec6f9b"/>
    <ellipse cx="102" cy="64" rx="10" ry="12" fill="#f48fb1"/><circle cx="99" cy="61" r="2" fill="#b83b6c"/><circle cx="105" cy="61" r="2" fill="#b83b6c"/>
    <circle cx="84" cy="50" r="3.2" fill="#3b1d2a"/>
    <rect x="52" y="34" width="22" height="4" rx="2" fill="#b83b6c" opacity=".7"/>
    <path d="M20 58c-8-2-10 8-3 9" fill="none" stroke="#f06292" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  split: `<svg viewBox="0 0 120 110" aria-hidden="true">
    <defs>
      <linearGradient id="s-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ea0ff"/><stop offset="1" stop-color="#1f4fd1"/></linearGradient>
      <linearGradient id="s-pink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fab"/><stop offset="1" stop-color="#e11d48"/></linearGradient>
      <linearGradient id="s-coin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd76a"/><stop offset="1" stop-color="#e59a12"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="102" rx="42" ry="5" fill="#000" opacity=".1"/>
    <g transform="rotate(-8 36 54)">
      <path d="M16 18a5 5 0 0 1 5-5h35v78l-6.5-6-6.5 6-6.5-6-6.5 6-7-6-7 6z" fill="url(#s-blue)"/>
      <g fill="#fff" opacity=".75"><rect x="24" y="27" width="24" height="4" rx="2"/><rect x="24" y="39" width="18" height="4" rx="2"/><rect x="24" y="51" width="24" height="4" rx="2"/><rect x="24" y="63" width="14" height="4" rx="2"/></g>
    </g>
    <g transform="rotate(8 84 54)">
      <path d="M64 13h35a5 5 0 0 1 5 5v73l-7-6-7 6-6.5-6-6.5 6-6.5-6-6.5 6z" fill="url(#s-pink)"/>
      <g fill="#fff" opacity=".75"><rect x="72" y="27" width="24" height="4" rx="2"/><rect x="78" y="39" width="18" height="4" rx="2"/><rect x="72" y="51" width="24" height="4" rx="2"/><rect x="82" y="63" width="14" height="4" rx="2"/></g>
    </g>
    <circle cx="60" cy="80" r="17" fill="url(#s-coin)" stroke="#fff" stroke-width="2.5"/>
    <text x="60" y="85" text-anchor="middle" font-size="12" font-weight="800" fill="#9a5b00" font-family="Segoe UI, sans-serif">R$</text>
  </svg>`,

  lock: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id="l-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d93ff"/><stop offset="1" stop-color="#1f4fd1"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="108" rx="36" ry="5" fill="#000" opacity=".1"/>
    <path d="M38 52V40a22 22 0 0 1 44 0v12" fill="none" stroke="#9aa5b8" stroke-width="10" stroke-linecap="round"/>
    <rect x="24" y="50" width="72" height="54" rx="14" fill="url(#l-b)"/>
    <circle cx="60" cy="72" r="7" fill="#fff"/><rect x="57" y="74" width="6" height="15" rx="3" fill="#fff"/>
  </svg>`,
};

const ic = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

window.ICONS = {
  grid: ic('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  flow: ic('<path d="M4 8h14l-3-3M20 16H6l3 3"/>'),
  card: ic('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>'),
  home: ic('<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>'),
  building: ic('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>'),
  safe: ic('<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="12" cy="12.5" r="3"/><path d="M12 9.5v-1M7 20v1M17 20v1"/>'),
  target: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  income: ic('<rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v5M18 10v5"/>'),
  list: ic('<path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
  settings: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: ic('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  bell: ic('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  chevL: ic('<path d="m15 18-6-6 6-6"/>'),
  chevR: ic('<path d="m9 18 6-6-6-6"/>'),
  chevD: ic('<path d="m6 9 6 6 6-6"/>'),
  check: ic('<path d="M20 6 9 17l-5-5"/>'),
  pencil: ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: ic('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  key: ic('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2M15 8l2 2M17 6l2 2"/>'),
  bolt: ic('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'),
  wifi: ic('<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r=".8" fill="currentColor"/>'),
  drop: ic('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  flame: ic('<path d="M12 22a7 7 0 0 0 7-7c0-5-7-12-7-12S5 10 5 15a7 7 0 0 0 7 7z"/>'),
  lock: ic('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  shield: ic('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  download: ic('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
  upload: ic('<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>'),
  folder: ic('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  arrowUp: ic('<path d="M7 17 17 7M8 7h9v9"/>'),
  arrowDown: ic('<path d="M7 7l10 10M17 8v9H8"/>'),
  x: ic('<path d="M18 6 6 18M6 6l12 12"/>'),
  info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  nfc: ic('<path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17"/>'),
  trend: ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  spark: ic('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
  mic: ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>'),
  calendar: ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  repeat: ic('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  grip: '<svg viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/><circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/><circle cx="2.5" cy="13.5" r="1.5"/><circle cx="7.5" cy="13.5" r="1.5"/></svg>',
};
