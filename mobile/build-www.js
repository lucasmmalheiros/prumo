'use strict';
// Build da pasta www
const fs = require('fs');
const path = require('path');

const here = __dirname;
const src = path.join(here, '..', 'src');
const www = path.join(here, 'www');

function patch(file, pairs) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    if (!text.includes(from)) throw new Error(`Trecho não encontrado em ${path.basename(file)}: ${from}`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
}

fs.rmSync(www, { recursive: true, force: true });
fs.cpSync(src, www, { recursive: true });
fs.mkdirSync(path.join(www, 'models'), { recursive: true });
// Modelo de voz
fs.copyFileSync(path.join(here, '..', 'models', 'vosk-pt.tar.gz'), path.join(www, 'models', 'vosk-pt.tgz'));
fs.mkdirSync(path.join(www, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(here, 'node_modules', 'scrypt-js', 'scrypt.js'), path.join(www, 'vendor', 'scrypt.js'));
fs.copyFileSync(path.join(here, 'web', 'prumo-mobile.js'), path.join(www, 'prumo-mobile.js'));
fs.copyFileSync(path.join(here, 'web', 'mobile.css'), path.join(www, 'mobile.css'));

// Ponte do Capacitor
patch(path.join(www, 'index.html'), [
  ["script-src 'self';", "script-src 'self' 'unsafe-inline'; connect-src 'self';"],
  ['content="width=device-width, initial-scale=1"', 'content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"'],
  ['<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="styles.css">\n  <link rel="stylesheet" href="mobile.css">'],
  ['<script src="illustrations.js"></script>', '<script src="vendor/scrypt.js"></script>\n  <script src="prumo-mobile.js"></script>\n  <script src="illustrations.js"></script>'],
]);
patch(path.join(www, 'voice-engine.html'), [
  ["script-src 'self' 'unsafe-eval'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'"],
  ['connect-src blob: data: prumo-model:', 'connect-src blob: data: https://localhost'],
]);
patch(path.join(www, 'voice-engine.js'), [
  ["new Vosk.Model('prumo-model://vosk/pt.tar.gz')", "new Vosk.Model(new URL('models/vosk-pt.tgz', document.baseURI).href)"],
]);
console.log('www pronta');
