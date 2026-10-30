(() => {
  /* ---------- Onda de partículas ---------- */
  const cv = document.getElementById('field');
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1, mx = 0, my = 0, tmx = 0, tmy = 0;
  const COLS = 150, ROWS = 64;

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', size);
  let px = -9999, py = -9999, pPow = 0;
  addEventListener('pointermove', e => { tmx = (e.clientX / innerWidth - .5); tmy = (e.clientY / innerHeight - .5); const rr = cv.getBoundingClientRect(); px = e.clientX - rr.left; py = e.clientY - rr.top; });
  cv.parentElement.addEventListener('pointerleave', () => { px = py = -9999; });

  function height(x, z, t) {
    return Math.sin(x * 2.1 + t * .55) * .16
         + Math.sin(z * 3.3 - t * .4 + x * 1.2) * .11
         + Math.sin((x + z) * 4.6 + t * .8) * .045
         + Math.cos(x * 1.1 - z * 2.0 + t * .3) * .08;
  }

  function frame(ms) {
    const t = ms / 1000;
    mx += (tmx - mx) * .04; my += (tmy - my) * .04;
    ctx.clearRect(0, 0, W, H);
    const narrow = W < 640;
    const cx = W / 2, cy = H * (narrow ? .80 : .79);
    const scale = Math.min(W * (narrow ? .85 : .40), 620);
    const rotY = Math.sin(t * .08) * .12 + mx * .25;
    const tilt = .42 + my * .12;
    const cR = Math.cos(rotY), sR = Math.sin(rotY), cT = Math.cos(tilt), sT = Math.sin(tilt);
    const cam = 3.2;

    for (let j = 0; j < ROWS; j++) {
      const z0 = (j / (ROWS - 1) - .5) * 1.25;
      for (let i = 0; i < COLS; i++) {
        const x0 = (i / (COLS - 1) - .5) * 2.4;
        // envelope: borda orgânica, mais larga no centro
        const ex = x0 / 1.2, ez = z0 / .62;
        const edge = 1 - (ex * ex * .9 + ez * ez);
        if (edge <= 0) continue;
        let y0 = height(x0, z0, t) * (0.6 + edge * .6);
        // rotação Y
        let x = x0 * cR - z0 * sR, z = x0 * sR + z0 * cR, y = y0;
        // inclinação X
        const y2 = y * cT - z * sT, z2 = y * sT + z * cT;
        const p = cam / (cam + z2 + 1.2);
        let sx = cx + x * scale * p, sy = cy - y2 * scale * p;
        // empurra os pontos perto do cursor
        const ddx = sx - px, ddy = sy - py, d2 = ddx * ddx + ddy * ddy;
        let hot = 0;
        if (d2 < 16900) { const d = Math.sqrt(d2) || 1, f = 1 - d / 130; hot = f; sx += ddx / d * f * f * 46; sy += ddy / d * f * f * 46; }
        const depth = Math.min(1, Math.max(0, p - .55) * 2.2);
        // brilho pelas cristas
        const crest = Math.max(0, y0 * 3.2 + .35);
        let a = Math.min(1, edge * 1.6) * (.18 + depth * .55 + crest * .35);
        if (a < .03) continue;
        const r = (.45 + depth * .9) * (narrow ? .85 : 1);
        // vermelho nas cristas mais altas
        if (hot > .15) ctx.fillStyle = `rgba(240,70,62,${Math.min(1, a + hot)})`;
        else if (y0 > .19) ctx.fillStyle = `rgba(232,58,52,${Math.min(1, a * 1.2)})`;
        else ctx.fillStyle = `rgba(244,241,240,${a})`;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  size();
  requestAnimationFrame(frame);

  /* ---------- Cenas de partículas: coluna e coração ---------- */
  // mesma linguagem da onda do topo: pontos projetados em 3D, cursor empurra, cristas em vermelho
  function scene(el, draw) {
    const c = el.getContext('2d'), ptr = { x: -9999, y: -9999 };
    let w = 0, h = 0, on = false, raf = 0;
    function fit() {
      const d = Math.min(devicePixelRatio || 1, 2), r = el.getBoundingClientRect();
      w = r.width; h = r.height;
      el.width = Math.round(w * d); el.height = Math.round(h * d);
      c.setTransform(d, 0, 0, d, 0, 0);
    }
    function loop(ms) {
      c.clearRect(0, 0, w, h);
      draw(c, w, h, ms / 1000, ptr);
      if (on && !reduce) raf = requestAnimationFrame(loop);
    }
    addEventListener('resize', fit);
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; });
    el.addEventListener('pointerleave', () => { ptr.x = ptr.y = -9999; });
    // só anima enquanto está na tela
    new IntersectionObserver(([en]) => {
      on = en.isIntersecting; cancelAnimationFrame(raf);
      if (on) raf = requestAnimationFrame(loop);
    }).observe(el);
    fit();
  }
  // gira, projeta e desenha um ponto; cor 0 = branco, 1 = vermelho
  function plot(c, ptr, x, y, z, v, a, col) {
    const x1 = x * v.cR - z * v.sR, z1 = x * v.sR + z * v.cR;
    const y2 = y * v.cT - z1 * v.sT, z2 = y * v.sT + z1 * v.cT;
    const p = 3.2 / (3.2 + z2 + 1.2);
    let sx = v.cx + x1 * v.scale * p, sy = v.cy - y2 * v.scale * p;
    const ddx = sx - ptr.x, ddy = sy - ptr.y, d2 = ddx * ddx + ddy * ddy;
    let hot = 0;
    if (d2 < 10000) { const d = Math.sqrt(d2) || 1, f = 1 - d / 100; hot = f; sx += ddx / d * f * f * 34; sy += ddy / d * f * f * 34; }
    const depth = Math.min(1, Math.max(0, p - .55) * 2.2);
    a *= .25 + depth * .75;
    if (a < .03 && hot < .15) return;
    const r = .45 + depth * .9;
    if (hot > .15) c.fillStyle = `rgba(240,70,62,${Math.min(1, a + hot)})`;
    else if (col) c.fillStyle = `rgba(232,58,52,${Math.min(1, a * 1.2)})`;
    else c.fillStyle = `rgba(244,241,240,${Math.min(1, a)})`;
    c.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  function view(rotY, tilt, cx, cy, scale) {
    return { cR: Math.cos(rotY), sR: Math.sin(rotY), cT: Math.cos(tilt), sT: Math.sin(tilt), cx, cy, scale };
  }

  /* Coluna vertebral: 24 vértebras + sacro, com as curvas naturais */
  const spinePts = []; // [x, y, z, u, tipo] — tipo 0 osso, 1 disco, 2 medula
  (function build() {
    const N = 24, ring = (n, cx, cy, cz, rx, rz, k, u) => {
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; spinePts.push([cx + Math.cos(a) * rx, cy, cz + Math.sin(a) * rz, u, k]); }
    };
    let y = 0;
    for (let i = 0; i < N; i++) {
      const q = i / (N - 1), u = q * .86;
      const r = .055 + Math.pow(q, 1.2) * .085, hh = .022 + q * .03;
      // lordose cervical, cifose torácica, lordose lombar (frente = +z)
      const z = .07 * Math.cos(Math.PI * (q - .12) / .36);
      const n = Math.round(r * 230);
      // corpo da vértebra
      for (const dy of [-hh, -hh / 3, hh / 3, hh]) ring(n, 0, y + dy, z, r * 1.15, r, 0, u);
      ring(Math.round(n * .5), 0, y + hh, z, r * .55, r * .48, 0, u);
      ring(Math.round(n * .5), 0, y - hh, z, r * .55, r * .48, 0, u);
      // arco atrás do corpo
      for (let k = 0; k <= 12; k++) {
        const a = k / 12 * Math.PI;
        spinePts.push([Math.cos(a) * r * .8, y, z - r - Math.sin(a) * r * .9, u, 0]);
      }
      // processo espinhoso, inclinado para baixo
      const tail = i < 7 ? 1.9 : i < 19 ? 2.8 : 2.2, drop = i < 7 ? .4 : i < 19 ? 1.3 : .5;
      for (let k = 0; k <= 9; k++) {
        const f = k / 9;
        spinePts.push([0, y - f * r * drop, z - r * 1.8 - f * r * (tail - 1.8), u, 0]);
      }
      // processos transversos
      const wing = i < 7 ? 1.7 : i < 19 ? 2.1 : 2.4;
      for (let k = 0; k <= 7; k++) {
        const f = k / 7, x = r * (1 + f * (wing - 1));
        spinePts.push([x, y, z - r * (.9 + f * .5), u, 0], [-x, y, z - r * (.9 + f * .5), u, 0]);
      }
      // medula passando pelo canal
      for (let k = 0; k < 3; k++) spinePts.push([0, y - hh + k * hh, z - r * 1.4, u, 2]);
      // disco abaixo da vértebra
      const gap = hh * 1.3;
      if (i < N - 1) {
        ring(n, 0, y - hh - gap / 2, z, r * 1.12, r * .98, 1, u);
        spinePts.push([0, y - hh - gap / 2, z - r * 1.4, u, 2]);
      }
      y -= hh * 2 + gap;
    }
    // sacro e cóccix: segmentos fundidos que afinam e voltam para trás
    const zEnd = .07 * Math.cos(Math.PI * (1 - .12) / .36);
    for (let s = 0; s < 9; s++) {
      const f = s / 8, r = .14 * (1 - f * .8), u = .86 + f * .14;
      const z = zEnd - f * f * .22;
      ring(Math.round(r * 200) + 6, 0, y, z, r * (s < 5 ? 1.9 - f : 1), r * .7, 0, u);
      ring(Math.round(r * 120) + 4, 0, y - .02, z, r * (s < 5 ? 1.4 - f * .6 : .8), r * .5, 0, u);
      y -= .07 - f * .03;
    }
    // centraliza e normaliza a altura em 2.3 unidades (largura um pouco exagerada para ganhar presença)
    let lo = Infinity, hi = -Infinity;
    for (const p of spinePts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    const k = 2.3 / (hi - lo), mid = (hi + lo) / 2;
    for (const p of spinePts) { p[0] *= k * 1.35; p[1] = (p[1] - mid) * k; p[2] *= k * 1.35; }
  })();

  scene(document.getElementById('spine'), (c, w, h, t, ptr) => {
    const v = view(t * .22 + mx * .6, .08 + my * .1, w / 2, h / 2, Math.min(h * .54, w * 1.6));
    for (const [x0, y0, z0, u, kind] of spinePts) {
      // a coluna ondula devagar, como a superfície do topo
      const x = x0 * (1 + Math.sin(u * 9 - t * 1.6) * .05) + Math.sin(u * 5 - t * .9) * .04;
      const z = z0 + Math.cos(u * 4 - t * .7) * .025;
      // impulso nervoso descendo pela medula
      const sig = Math.pow(Math.max(0, Math.sin(u * 13 - t * 2.6)), 8);
      if (kind === 2) plot(c, ptr, x, y0, z, v, .25 + sig * 1.2, 1);
      else if (kind === 1) plot(c, ptr, x, y0, z, v, .35 + sig * .6, 1);
      else plot(c, ptr, x, y0, z, v, .55 + sig * .6, sig > .55);
    }
  });

  /* Coração anatômico: ventrículos, átrios, grandes vasos e coronárias */
  const heartPts = []; // [x, y, z, cx, cy, cz, parte, s] — parte 0 ventrículo, 1 átrio, 2 vaso, 3 coronária; c = centro para onde o ponto contrai
  (function build() {
    const norm = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const add = (p, c, part, s) => heartPts.push([...p, ...c, part, s]);
    // modelo de frente para +z e x = esquerda do paciente; inverte o z no fim
    // ventrículos: "ovo" inclinado com a ponta para baixo e para a esquerda do paciente
    const B = [.05, .22, .05], D = norm([.5, -1, .12]), U = norm(cross(D, [0, 0, 1])), W = cross(U, D);
    const egg = (phi, beta, out = 1) => {
      const ax = phi < Math.PI / 2 ? -Math.cos(phi) * .2 : -Math.cos(phi) * 1.12;
      const rad = .6 * out * Math.pow(Math.sin(phi), phi < Math.PI / 2 ? .5 : 1.05);
      const cu = Math.cos(beta) * rad, cw = Math.sin(beta) * rad * .8;
      const c = B.map((b, i) => b + D[i] * ax);
      return [c.map((v, i) => v + U[i] * cu + W[i] * cw), c, (ax + .2) / 1.32];
    };
    for (let j = 1; j < 48; j++) {
      const phi = j / 48 * Math.PI, n = Math.round(78 * Math.sin(phi)) + 6;
      for (let i = 0; i < n; i++) { const [p, c, s] = egg(phi, i / n * Math.PI * 2 + j * .3); add(p, c, 0, s); }
    }
    // coronárias sobre o músculo: sulco atrioventricular, interventricular anterior e posterior, diagonal
    const vessel = (n, f) => { for (let i = 0; i <= n; i++) { const [phi, beta] = f(i / n), [p, c, s] = egg(phi, beta, 1.035); add(p, c, 3, s); } };
    vessel(110, q => [1.62, q * Math.PI * 2]);
    vessel(70, q => [1.62 + q * 1.38, Math.PI / 2 - .25 + Math.sin(q * 9) * .05]);
    vessel(60, q => [1.62 + q * 1.25, -Math.PI / 2 + .25 + Math.sin(q * 8) * .05]);
    vessel(30, q => [1.9 + q * .7, Math.PI / 2 - .25 - q * .9]);
    vessel(24, q => [1.75 + q * .6, Math.PI / 2 + .5 + q * .7]);
    // átrios e aurículas
    const blob = (c, r, sy, n) => {
      for (let i = 0; i < n; i++) {
        const y = 1 - 2 * (i + .5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
        add([c[0] + Math.cos(a) * rr * r, c[1] + y * r * sy, c[2] + Math.sin(a) * rr * r], c, 1, 0);
      }
    };
    blob([-.5, .36, .08], .33, .95, 520);
    blob([-.3, .5, .32], .14, .8, 110);
    blob([.15, .42, -.35], .32, .85, 480);
    blob([.43, .4, .2], .13, .75, 100);
    // grandes vasos: curvas Catmull-Rom varridas por anéis
    const cr = (P, t) => {
      const m = P.length - 1, f = Math.min(m - 1e-6, t * m), i = Math.floor(f), u = f - i;
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(m, i + 2)];
      return p1.map((_, k) => .5 * (2 * p1[k] + (p2[k] - p0[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u * u * u));
    };
    const tube = (P, r0, r1, rings) => {
      for (let j = 0; j <= rings; j++) {
        const s = j / rings, c = cr(P, s), a1 = cr(P, Math.max(0, s - .01)), a2 = cr(P, Math.min(1, s + .01));
        const T = norm(a2.map((v, i) => v - a1[i])), N = norm(cross(T, Math.abs(T[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), N2 = cross(T, N);
        const r = r0 + (r1 - r0) * s, n = Math.max(8, Math.round(r * 130));
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + j * .37;
          add(c.map((v, k) => v + (N[k] * Math.cos(a) + N2[k] * Math.sin(a)) * r), c, 2, s);
        }
      }
    };
    // aorta: sobe, faz o arco por cima do tronco pulmonar e desce por trás
    tube([[-.05, .3, 0], [-.12, .75, .05], [-.05, 1.1, 0], [.15, 1.25, -.15], [.38, 1.1, -.35], [.42, .6, -.42], [.42, -.05, -.45]], .15, .13, 72);
    tube([[0, 1.17, -.05], [-.04, 1.4, -.04], [-.12, 1.62, -.02]], .06, .045, 14);
    tube([[.15, 1.24, -.15], [.14, 1.45, -.15], [.12, 1.64, -.15]], .05, .04, 14);
    tube([[.29, 1.18, -.26], [.33, 1.4, -.28], [.38, 1.6, -.3]], .055, .045, 14);
    // tronco pulmonar e artérias pulmonares
    tube([[.12, .35, .3], [.22, .65, .28], [.3, .88, .1], [.32, .92, -.05]], .13, .12, 30);
    tube([[.32, .92, -.05], [.55, .95, -.1], [.82, .88, -.15]], .09, .07, 18);
    tube([[.3, .9, -.05], [.05, .93, -.2], [-.35, .88, -.25], [-.62, .84, -.25]], .09, .07, 26);
    // veias cavas e pulmonares
    tube([[-.5, .55, -.02], [-.5, .95, -.05], [-.48, 1.35, -.05]], .1, .1, 24);
    tube([[-.42, -.02, -.12], [-.42, -.32, -.16], [-.4, -.58, -.2]], .1, .1, 14);
    tube([[.38, .48, -.42], [.72, .52, -.48]], .05, .05, 9);
    tube([[.38, .32, -.45], [.7, .28, -.52]], .05, .05, 9);
    // centraliza na vertical e vira para a câmera
    for (const p of heartPts) { p[1] -= .42; p[4] -= .42; p[2] = -p[2]; p[5] = -p[5]; }
  })();

  scene(document.getElementById('heart'), (c, w, h, t, ptr) => {
    const ph = (t % .95) / .95;
    // átrios contraem primeiro, depois os ventrículos, e o sangue sai pelos vasos
    const atr = Math.exp(-(((ph - .06) / .05) ** 2));
    const ven = Math.exp(-(((ph - .26) / .09) ** 2));
    const v = view(Math.sin(t * .4) * .55 + mx * .6, .1 + my * .1, w / 2, h / 2, Math.min(h * .52, w * .6));
    for (const [x, y, z, cx, cy, cz, part, s] of heartPts) {
      let k, a, col, lift = 0;
      if (part === 2) {
        // pulso de sangue correndo pelos vasos
        const flow = Math.exp(-(((s - (ph - .2) * 2.4) / .09) ** 2));
        k = 1 + ven * .1 + flow * .12; a = .3 + flow * .7; col = flow > .35;
      } else if (part === 1) {
        k = 1 - atr * .1; a = .42; col = 1;
      } else {
        // contração subindo da ponta até a base
        const wave = Math.exp(-(((s - (1 - (ph - .12) * 3)) / .1) ** 2));
        k = 1 - ven * (.05 + s * .07); lift = ven * s * .05;
        if (part === 3) { a = .8; col = 0; } else { a = .42 + wave * .5; col = wave < .45; }
      }
      plot(c, ptr, cx + (x - cx) * k, cy + (y - cy) * k + lift, cz + (z - cz) * k, v, a + ven * .15, col);
    }
  });

  /* ---------- Formulários ---------- */
  function wire(formId) {
    const f = document.getElementById(formId), inp = f.querySelector('input'), note = document.getElementById(formId + '-note');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const v = inp.value.trim();
      const isMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      const digits = v.replace(/\D/g, '');
      if (!isMail && !(digits.length >= 10 && digits.length <= 13)) {
        note.textContent = 'Digite um e-mail válido ou um WhatsApp com DDD, ex: (92) 99999-0000.';
        inp.focus(); return;
      }
      note.textContent = 'Formulário de demonstração: conecte ao WhatsApp ou CRM da Space para receber os contatos.';
    });
  }
  wire('lead'); wire('lead2');

  /* ---------- Formulário que abre o WhatsApp com nome, área e mensagem ---------- */
  const waForm = document.getElementById('wa-form'), waNote = document.getElementById('wa-form-note');
  waForm.addEventListener('submit', e => {
    e.preventDefault();
    const nome = waForm.nome.value.trim(), area = waForm.area.value, msg = waForm.mensagem.value.trim();
    waForm.nome.setAttribute('aria-invalid', !nome);
    waForm.area.setAttribute('aria-invalid', !area);
    if (!nome || !area) {
      waNote.textContent = !nome ? 'Digite seu nome.' : 'Escolha sua área.';
      (!nome ? waForm.nome : waForm.area).focus(); return;
    }
    const text = `Olá, Space! Meu nome é ${nome}.\nÁrea: ${area}` + (msg ? `\n\n${msg}` : '');
    window.open('https://wa.me/5592994332941?text=' + encodeURIComponent(text), '_blank', 'noopener');
    waNote.textContent = 'Abrimos o WhatsApp com a sua mensagem. É só tocar em enviar.';
  });

  /* ---------- Efeitos de rolagem e cards ---------- */
  const prog = document.getElementById('prog');
  const man = document.querySelector('.manifesto');
  const mp = man.querySelector('p');
  // separa o manifesto em palavras
  (function split(node, dim) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          const w = document.createElement('span'); w.className = 'w' + (dim ? ' d' : ''); w.textContent = t; frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) split(n, true);
    });
  })(mp, false);
  const words = [...mp.querySelectorAll('.w')];
  if (!reduce) man.classList.add('split');
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.setProperty('--p', max > 0 ? scrollY / max : 0);
    if (!reduce) {
      const r = mp.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
      const n = Math.round(k * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < n));
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  // holofote seguindo o mouse nos cards
  document.querySelectorAll('.svc').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  // botões magnéticos
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.cta, .nav .pill').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

})();
