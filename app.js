const area = document.getElementById('game-area');
const playerEl = document.getElementById('player');
const beyonceEl = document.getElementById('beyonce');
const mensajeFlotante = document.getElementById('mensaje-flotante');
const overEl = document.getElementById('gameover');
const victoriaEl = document.getElementById('victoria');
const escenaEl = document.getElementById('escena');
const escenaTexto = document.getElementById('escenaTexto');
const clipCamina = document.getElementById('clipCamina');
const clipCorre = document.getElementById('clipCorre');
const fotoGameover = document.getElementById('fotoGameover');

[clipCamina, clipCorre].forEach((v) => v.addEventListener('loadeddata', () => { v.dataset.ok = 'si'; }));

let meta = 60;
let introActiva = false, introTimer = null;
let jugando = false, inicio = 0;
let nivel = 0;
let escudo = false;
let congeladaHasta = 0;
let bailaHasta = 0;
let duracionQuehacer = 4, duracionBaile = 5;
let mensajeTimeout = null;

let ANCHO = 560;
let TAM = 48;

const player = { x: 256, y: 480, velocidad: 5 };
const beyonce = { x: 256, y: 0, base: 2, velocidad: 2 };
const teclas = {};

const frasesAleatorias = ['¡Rascacasuelas!', '¡Come cuando hay!'];
let frasesUsadas = [];

const fondos = [
  { nombre: 'Gris claro', color: '#e9ecef' },
  { nombre: 'Rosa',       color: '#ffd6e8' },
  { nombre: 'Menta',      color: '#d4f5e2' },
  { nombre: 'Noche',      color: '#2b2d42' },
  { nombre: 'Dorado',     color: '#f6e27a' }
];
const selectFondo = document.getElementById('fondo');
fondos.forEach((f, i) => {
  const op = document.createElement('option');
  op.value = i; op.textContent = f.nombre;
  selectFondo.appendChild(op);
});
area.style.backgroundColor = fondos[0].color;

const dialogos = [
  { quien: 'Paola',  texto: 'Dale gracias a Beyoncé, porque por ella estás donde estás.' },
  { quien: 'Karina', texto: 'Ay, estás bien equivocada.' },
  { quien: 'Paola',  texto: '¡Karina, noooo!' },
  { quien: 'Karina', texto: 'Pss, ¿qué tiene? Ni la conozco y ni quiero.' },
  { quien: 'Paola',  texto: '¡Karina, nooooo! Beyoncé vendrá por ti.' },
  { quien: 'Karina', texto: 'Pss, que venga. La pongo a hacer el quehacer.' }
];

const poderes = [
  { id: 'escoba', emoji: '🧹', primero: 8000, espera: 12000, 
    frase: 'Cómo te llegas a atrever, gata igualada, si yo cuerpo, rostro, actitud y carisma 💅',
    usado: false,
    alRecoger: (t) => { congeladaHasta = t + duracionQuehacer * 1000; } },
    
  { id: 'microfono', emoji: '🎤', primero: 25000, espera: 14000,
    frase: '¡Paola loba, loba!',
    usado: false,
    alRecoger: (t) => {
      bailaHasta = t + duracionBaile * 1000;
      if (cancion.readyState >= 2) { cancion.currentTime = 0; cancion.play().catch(() => {}); }
    } },
    
  { id: 'escudo', emoji: '🛡️', primero: 42000, espera: 16000,
    frase: '¡Nadaqueverienta!',
    usado: false,
    alRecoger: () => { escudo = true; } }
];

poderes.forEach((p) => {
  p.tam = 34; p.x = 0; p.y = 0; p.activa = false; p.apareceEn = 0; p.desapareceEn = 0;
  p.el = document.createElement('div');
  p.el.className = 'item';
  p.el.textContent = p.emoji;
  area.appendChild(p.el);
});

function cargarImagen(base, alCargar, alFallar) {
  const exts = ['jpg', 'png', 'jpeg', 'webp', 'JPG', 'PNG', 'JPEG'];
  let i = 0;
  (function probar() {
    if (i >= exts.length) { if (alFallar) alFallar(); return; }
    const src = base + '.' + exts[i++];
    const img = new Image();
    img.onload = () => alCargar(src);
    img.onerror = probar;
    img.src = src;
  })();
}
cargarImagen('beyonce',
  (src) => { beyonceEl.style.backgroundImage = 'url(' + src + ')'; },
  () => { beyonceEl.textContent = '👩‍🎤'; });

const cancion = new Audio('cancion.mp3');
cancion.preload = 'auto';

const risa = new Audio('risa-paola.mp3');
risa.preload = 'auto';

let risaLista = false, ultimaRisa = 0;
risa.addEventListener('canplay', () => { risaLista = true; });

function reirPaola() {
  const ahora = Date.now();
  if (!document.getElementById('risaOn').checked || ahora - ultimaRisa < 1000) return;
  ultimaRisa = ahora;
  
  if (risaLista || risa.readyState >= 2) {
    risa.volume = 1;
    risa.currentTime = 0;
    risa.play().catch(() => {});
  } else {
    risaSintetica();
  }
}

function risaSintetica() {
  prepararAudio();
  audioCtx.resume();
  const vol = 0.9;
  for (let i = 0; i < 5; i++) {
    const t = audioCtx.currentTime + i * 0.13;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 520 - i * 45;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.11);
  }
}

const fotos = { Karina: { src: '', ok: false }, Paola: { src: '', ok: false } };
Object.keys(fotos).forEach((nombre) => {
  cargarImagen(nombre.toLowerCase(), (src) => {
    fotos[nombre].src = src; fotos[nombre].ok = true;
    if (nombre === 'Karina') {
      playerEl.style.backgroundImage = 'url(' + src + ')';
      playerEl.classList.add('foto');
      
      cargarImagen('karina-derrota', 
        (srcDerrota) => { fotoGameover.innerHTML = '<img src="' + srcDerrota + '" alt="Karina triste">'; },
        () => { fotoGameover.innerHTML = '<img src="' + src + '" alt="Karina">'; } 
      );
    }
  });
});

function etiqueta(quien, texto, esRisa = false) {
  const f = fotos[quien];
  const foto = f && f.ok ? '<img class="avatar" src="' + f.src + '"> ' : '';
  return foto + '<b>' + quien + ':</b> ' + texto;
}

function calcularLimites() {
  const rect = area.getBoundingClientRect();
  const borde = 8; 
  ANCHO = rect.width - borde; 
}
window.addEventListener('resize', calcularLimites);

function posicionar() {
  playerEl.style.left = player.x + 'px';
  playerEl.style.top = player.y + 'px';
  beyonceEl.style.left = beyonce.x + 'px';
  beyonceEl.style.top = beyonce.y + 'px';
  poderes.forEach((p) => { p.el.style.left = p.x + 'px'; p.el.style.top = p.y + 'px'; });
}

function cerca(a, b, tamB) {
  return Math.abs(a.x - b.x) < tamB - 5 && Math.abs(a.y - b.y) < tamB - 5;
}

function mostrarMensaje(quien, texto, ms = 3000) {
  clearTimeout(mensajeTimeout);
  mensajeFlotante.style.display = 'block';
  mensajeFlotante.innerHTML = etiqueta(quien, texto);
  
  mensajeFlotante.style.animation = 'none';
  mensajeFlotante.offsetHeight;
  mensajeFlotante.style.animation = 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  mensajeTimeout = setTimeout(() => {
    mensajeFlotante.style.display = 'none';
  }, ms);
}

function mover() {
  const vel = player.velocidad * (Date.now() < bailaHasta ? 1.5 : 1);
  if (teclas['ArrowLeft']  || teclas['a']) player.x -= vel;
  if (teclas['ArrowRight'] || teclas['d']) player.x += vel;
  if (teclas['ArrowUp']    || teclas['w']) player.y -= vel;
  if (teclas['ArrowDown']  || teclas['s']) player.y += vel;
  
  player.x = Math.max(0, Math.min(ANCHO - TAM, player.x));
  player.y = Math.max(0, Math.min(ANCHO - TAM, player.y));

  if (Date.now() < congeladaHasta) return;
  const dx = player.x - beyonce.x, dy = player.y - beyonce.y;
  const d = Math.hypot(dx, dy) || 1;
  beyonce.x += (dx / d) * beyonce.velocidad;
  beyonce.y += (dy / d) * beyonce.velocidad;
}

function manejarPoder(p) {
  if (p.usado) return; 

  const ahora = Date.now();
  if (!p.activa && ahora >= p.apareceEn) {
    if (p.puede && !p.puede()) { p.apareceEn = ahora + 3000; return; }
    p.x = Math.random() * (ANCHO - p.tam);
    p.y = Math.random() * (ANCHO - p.tam);
    p.activa = true;
    p.desapareceEn = ahora + 7000;
    p.el.style.display = 'block';
  }
  if (p.activa) {
    const recogido = cerca(player, p, TAM);
    if (recogido) {
      p.alRecoger(ahora);
      p.usado = true;
      
      mostrarMensaje('Karina', p.frase, 4000);
      reirPaola();
    }
    if (recogido || ahora >= p.desapareceEn) {
      p.activa = false;
      p.el.style.display = 'none';
      if (!p.usado) {
        p.apareceEn = ahora + p.espera;
      }
    }
  }
}

let avisoPaolaMostrado = false;
let lobaMayaMostrada = false;

function manejarDialogo(seg) {
  if (seg >= meta - 20 && !avisoPaolaMostrado) {
    avisoPaolaMostrado = true;
    mostrarMensaje('Paola', '¡Karina, ya casi escapas! ¡No te dejes atrapar!', 4000);
  }
  
  if (seg >= meta - 10 && !lobaMayaMostrada) {
    lobaMayaMostrada = true;
    setTimeout(() => {
      mostrarMensaje('Karina', '🐺 ¡Modo LOBA MAYA APOCALÍPTICA! 🐺', 4000);
    }, 500);
  }
}

function bucle() {
  if (!jugando) return;
  mover();
  const seg = Math.floor((Date.now() - inicio) / 1000);
  if (seg >= meta) { ganar(seg); return; }

  if (frasesUsadas.length < frasesAleatorias.length && Math.random() < 0.005) {
    const fraseNueva = frasesAleatorias.find(f => !frasesUsadas.includes(f));
    if (fraseNueva) {
      frasesUsadas.push(fraseNueva);
      mostrarMensaje('Karina', fraseNueva, 4000);
    }
  }

  const n = Math.floor(seg / 15);
  if (n > nivel) {
    nivel = n;
  }
  beyonce.velocidad = beyonce.base + nivel * 0.4;

  poderes.forEach(manejarPoder);
  manejarDialogo(seg);

  if (bailaHasta !== 0 && Date.now() >= bailaHasta) {
    bailaHasta = 0; cancion.pause();
  }
  playerEl.classList.toggle('bailando', Date.now() < bailaHasta);
  playerEl.classList.toggle('escudo', escudo);
  beyonceEl.classList.toggle('limpiando', Date.now() < congeladaHasta);
  manejarCanto();
  posicionar();

  if (cerca(player, beyonce, TAM)) {
    if (escudo) {
      escudo = false;
      beyonce.x = player.x < 200 ? 360 : 0;
      beyonce.y = player.y < 200 ? 360 : 0;
      
      mostrarMensaje('Karina', '¡Ay, no! ¡Casi me atrapas, mugrosa! 💅', 5000);
      reirPaola();
    } else { perder(seg); return; }
  }
  requestAnimationFrame(bucle);
}

function perder(seg) {
  jugando = false;
  cancion.pause(); limpiarCanto();
  
  setTimeout(() => {
    alert('beyonce te atrapo');
    overEl.style.display = 'flex';
  }, 30);
}

function iniciar() {
  for (let k in teclas) teclas[k] = false;
  
  setTimeout(() => {
    calcularLimites();
    player.x = (ANCHO - TAM) / 2; 
    player.y = ANCHO - TAM - 20;
    beyonce.x = (ANCHO - TAM) / 2; 
    beyonce.y = 0;
    
    nivel = 0; escudo = false; congeladaHasta = 0; bailaHasta = 0;
    mensajeFlotante.style.display = 'none';
    overEl.style.display = 'none';
    victoriaEl.style.display = 'none';
    clipCamina.pause();
    limpiarCanto();
    inicio = Date.now();
    
    avisoPaolaMostrado = false;
    lobaMayaMostrada = false;
    frasesUsadas = [];
    
    poderes.forEach((p) => {
      p.activa = false; 
      p.usado = false; 
      p.el.style.display = 'none';
      p.apareceEn = inicio + p.primero;
    });
    
    jugando = true;
    posicionar();
    requestAnimationFrame(bucle);
  }, 10);
}

const paolaEl = document.getElementById('paolaCanta');
const notas = [];
const simbolos = ['♪', '♫', '♬', '🎵'];
let ultimaNota = 0, paolaVisible = false;

function manejarCanto() {
  const ahora = Date.now();
  const cantando = ahora < bailaHasta;

  if (cantando && !paolaVisible) {
    paolaVisible = true;
    paolaEl.innerHTML = (fotos.Paola.ok
      ? '<img src="' + fotos.Paola.src + '">'
      : '<span class="emoji">🎤</span>') + '<small>🎤 ¡Elmo Suarez!</small>';
    paolaEl.style.display = 'block';
  }
  if (!cantando && paolaVisible) { paolaVisible = false; paolaEl.style.display = 'none'; }

  if (cantando && ahora - ultimaNota > 300) {
    ultimaNota = ahora;
    const el = document.createElement('div');
    el.className = 'nota';
    el.textContent = simbolos[Math.floor(Math.random() * simbolos.length)];
    area.appendChild(el);
    notas.push({ el: el, x: ANCHO - 45, y: ANCHO - 70 });
  }

  for (let i = notas.length - 1; i >= 0; i--) {
    const n = notas[i];
    const dx = beyonce.x + TAM / 2 - n.x, dy = beyonce.y + TAM / 2 - n.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 24) {
      n.el.remove(); notas.splice(i, 1);
      beyonceEl.classList.add('golpeada');
      setTimeout(() => beyonceEl.classList.remove('golpeada'), 200);
      continue;
    }
    n.x += (dx / d) * 7; n.y += (dy / d) * 7;
    n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px';
  }
}

function limpiarCanto() {
  notas.forEach((n) => n.el.remove());
  notas.length = 0;
  paolaVisible = false;
  paolaEl.style.display = 'none';
}

function usarClip(v) { return v.dataset.ok === 'si' && document.getElementById('verClips').checked; }

function terminarIntro() {
  if (!introActiva) return;
  introActiva = false;
  clearTimeout(introTimer);
  clipCorre.pause(); clipCorre.style.display = 'none';
  escenaEl.style.display = 'none';
  iniciar();
}

function intro() {
  if (introActiva || jugando) return;
  introActiva = true;
  overEl.style.display = 'none'; victoriaEl.style.display = 'none';
  escenaEl.style.display = 'flex';
  let i = 0;
  (function siguiente() {
    if (!introActiva) return;
    if (i < dialogos.length) {
      escenaTexto.innerHTML = etiqueta(dialogos[i].quien, dialogos[i].texto);
      i++;
      introTimer = setTimeout(siguiente, 2800);
      return;
    }
    if (!usarClip(clipCorre)) { terminarIntro(); return; }
    escenaTexto.innerHTML = '<b>¡CORRE, KARINA!</b> ';
    clipCorre.style.display = 'block';
    clipCorre.currentTime = 0;
    clipCorre.play().catch(() => {});
    clipCorre.onended = terminarIntro;
    introTimer = setTimeout(terminarIntro, 4500);
  })();
}

function ganar(seg) {
  jugando = false;
  cancion.pause(); limpiarCanto();
  document.getElementById('vicTiempo').textContent = seg;
  victoriaEl.style.display = 'flex';
  if (usarClip(clipCamina)) {
    clipCamina.style.display = 'block';
    clipCamina.currentTime = 0;
    clipCamina.play().catch(() => {});
  }
}

window.addEventListener('keydown', (ev) => {
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  teclas[k] = true;
  if (k.startsWith('Arrow')) ev.preventDefault();
});
window.addEventListener('keyup', (ev) => {
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  teclas[k] = false;
});
document.getElementById('btnIniciar').addEventListener('click', intro);
document.getElementById('btnSaltar').addEventListener('click', terminarIntro);
document.getElementById('btnJugarOtra').addEventListener('click', () => { if (!jugando) iniciar(); });
document.getElementById('btnReintentar').addEventListener('click', () => { if (!jugando) iniciar(); });

const panelToggle = document.getElementById('panel-toggle');
const panel = document.getElementById('panel');
panelToggle.addEventListener('click', () => {
  const abierto = panel.classList.toggle('abierto');
  panelToggle.classList.toggle('abierto', abierto);
  panelToggle.setAttribute('aria-expanded', abierto);
});

function ligarSlider(id, etiqueta, alCambiar) {
  document.getElementById(id).addEventListener('input', (ev) => {
    const v = Number(ev.target.value);
    document.getElementById(etiqueta).textContent = v;
    alCambiar(v);
  });
}
ligarSlider('velJugador', 'valJugador', (v) => { player.velocidad = v; });
ligarSlider('velBeyonce', 'valBeyonce', (v) => { beyonce.base = v; });
ligarSlider('duracionQuehacer', 'valQuehacer', (v) => { duracionQuehacer = v; });
ligarSlider('metaTiempo', 'valMeta', (v) => { meta = v; });
ligarSlider('duracionBaile', 'valBaile', (v) => { duracionBaile = v; });
selectFondo.addEventListener('change', (ev) => {
  area.style.backgroundColor = fondos[ev.target.value].color;
});

let audioCtx = null, ganancia = null;
function prepararAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  ganancia = audioCtx.createGain();
  ganancia.connect(audioCtx.destination);
}

posicionar();