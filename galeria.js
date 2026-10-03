/* =====================================================================
   Galeria do ensaio
   - Mural estilo Pinterest em tela cheia: sem bordas, sem espaços, todas as fotos
   - Ao clicar: visualizador em carrossel com rolagem infinita
   ===================================================================== */
(function () {
  const mural = document.querySelector('.mural');
  if (!mural) return;

  /* ---------- fotos (lidas do HTML) ---------- */
  const fotos = Array.from(mural.querySelectorAll('.mural-item img')).map((img) => ({
    src: img.getAttribute('src'),
    alt: img.getAttribute('alt') || '',
    w: Number(img.getAttribute('width')) || 2,
    h: Number(img.getAttribute('height')) || 3,
  }));
  const total = fotos.length;
  if (!total) return;

  /* ---------- mural ---------- */
  function quantasColunas() {
    const l = window.innerWidth;
    return Math.min(l >= 1100 ? 4 : l >= 700 ? 3 : 2, total);
  }

  // Reparte as fotos pelas colunas deixando todas com quase a mesma altura
  function distribuir(n) {
    const r = fotos.map((f) => f.h / f.w);
    const col = new Array(total);
    const alt = new Array(n).fill(0);

    r.forEach((x, i) => {
      const c = alt.indexOf(Math.min.apply(null, alt));
      col[i] = c;
      alt[c] += x;
    });

    const folga = (a) => Math.max.apply(null, a) - Math.min.apply(null, a);
    let melhorou = true;
    let voltas = 0;
    while (melhorou && voltas++ < 100) {
      melhorou = false;
      for (let i = 0; i < total; i++) {
        // tenta mover a foto i para outra coluna
        for (let c = 0; c < n; c++) {
          if (c === col[i]) continue;
          const nova = alt.slice();
          nova[col[i]] -= r[i];
          nova[c] += r[i];
          if (folga(nova) < folga(alt) - 1e-9 && alt.filter(Boolean).length === n && nova.every((v) => v > 0)) {
            alt[col[i]] = nova[col[i]];
            alt[c] = nova[c];
            col[i] = c;
            melhorou = true;
          }
        }
        // tenta trocar a foto i com a foto j
        for (let j = i + 1; j < total; j++) {
          if (col[i] === col[j]) continue;
          const nova = alt.slice();
          nova[col[i]] += r[j] - r[i];
          nova[col[j]] += r[i] - r[j];
          if (folga(nova) < folga(alt) - 1e-9) {
            alt[col[i]] = nova[col[i]];
            alt[col[j]] = nova[col[j]];
            const t = col[i]; col[i] = col[j]; col[j] = t;
            melhorou = true;
          }
        }
      }
    }
    return { col, alt };
  }

  function montarMural() {
    const n = quantasColunas();
    const { col, alt } = distribuir(n);
    const media = alt.reduce((a, b) => a + b, 0) / n;

    mural.textContent = '';
    mural.classList.add('mural-js');

    const colunas = [];
    for (let i = 0; i < n; i++) {
      const coluna = document.createElement('div');
      coluna.className = 'mural-coluna';
      mural.appendChild(coluna);
      colunas.push(coluna);
    }

    fotos.forEach((foto, i) => {
      const c = col[i];
      const k = media / alt[c]; // ajuste fino para as colunas terminarem na mesma linha

      const figura = document.createElement('figure');
      figura.className = 'mural-item';
      figura.dataset.indice = String(i);
      figura.tabIndex = 0;
      figura.setAttribute('role', 'button');
      figura.setAttribute('aria-label', 'Ampliar: ' + foto.alt);
      figura.style.aspectRatio = (foto.w / (foto.h * k)).toFixed(4);

      const img = new Image();
      img.src = foto.src;
      img.alt = foto.alt;
      img.width = foto.w;
      img.height = foto.h;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;

      figura.appendChild(img);
      colunas[c].appendChild(figura);
    });
  }

  montarMural();

  let colunasAtuais = quantasColunas();
  let temporizador;
  window.addEventListener('resize', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      if (quantasColunas() !== colunasAtuais) {
        colunasAtuais = quantasColunas();
        montarMural();
      }
    }, 200);
  });

  /* ---------- visualizador em carrossel (rolagem infinita) ---------- */
  const visualizador = document.createElement('div');
  visualizador.className = 'visualizador';
  visualizador.setAttribute('role', 'dialog');
  visualizador.setAttribute('aria-modal', 'true');
  visualizador.setAttribute('aria-label', 'Visualizador de foto');
  visualizador.innerHTML =
    '<div class="vis-palco"></div>' +
    '<button class="vis-zona esq" type="button" aria-label="Foto anterior" tabindex="-1"></button>' +
    '<button class="vis-zona dir" type="button" aria-label="Próxima foto" tabindex="-1"></button>' +
    '<button class="vis-fechar" type="button" aria-label="Fechar">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
    '</button>';
  document.body.appendChild(visualizador);

  const palco = visualizador.querySelector('.vis-palco');
  const botaoFechar = visualizador.querySelector('.vis-fechar');

  let atual = 0;          // posição "virtual": cresce ou diminui sem limite, por isso é infinito
  let aberto = false;
  let origem = null;
  let quadro = 0;
  const slides = new Map(); // posição virtual -> elemento
  const estado = new Map(); // posição virtual -> {x, s, o, z} (o que está na tela agora)
  const reduzMovimento = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const indice = (p) => ((p % total) + total) % total;
  const aspecto = (p) => fotos[indice(p)].w / fotos[indice(p)].h;

  function medidas() {
    const L = window.innerWidth;
    const A = window.innerHeight;
    const aparece = Math.min(Math.max(L * 0.09, 22), 170); // quanto da foto vizinha aparece na borda
    const margem = L < 700 ? 12 : 24;
    return { L, aparece, maxW: L - 2 * aparece - 2 * margem, maxH: A * 0.88 };
  }

  const larguraDe = (p, m) => Math.min(m.maxW, m.maxH * aspecto(p));

  // onde cada foto deve ficar quando o carrossel está parado
  function alvoDe(p, m, centro) {
    const d = p - centro;
    if (d === 0) return { x: 0, s: 1, o: 1, z: 3 };

    const lado = d < 0 ? -1 : 1;
    let w = larguraDe(centro + lado, m) * 0.9;
    let x = lado * (m.L / 2 - m.aparece + w / 2);
    if (Math.abs(d) === 1) return { x: x, s: 0.9, o: 0.5, z: 2 };

    // fotos escondidas além das vizinhas: ficam enfileiradas, cada uma no seu lugar
    for (let k = 2; k <= Math.abs(d); k++) {
      const wk = larguraDe(centro + lado * k, m) * 0.8;
      x += lado * (w / 2 + 40 + wk / 2);
      w = wk;
    }
    return { x: x, s: 0.8, o: 0, z: 1 };
  }

  function aplicar(el, e) {
    // números arredondados: evita valores como 1e-14, que alguns navegadores não aceitam
    el.style.opacity = e.o.toFixed(3);
    el.style.zIndex = String(e.z);
    el.style.transform = 'translate(-50%, -50%) translateX(' + e.x.toFixed(2) + 'px) scale(' + e.s.toFixed(4) + ')';
  }

  function criarSlide(p) {
    const f = fotos[indice(p)];
    const el = document.createElement('div');
    el.className = 'vis-slide';
    const img = new Image();
    img.src = f.src;
    img.alt = f.alt;
    img.width = f.w;
    img.height = f.h;
    img.draggable = false;
    img.decoding = 'async';
    el.appendChild(img);
    palco.appendChild(el);
    slides.set(p, el);
    return el;
  }

  // Sempre existem 7 fotos no carrossel (3 de cada lado da atual). As de fora ficam invisíveis.
  const ALCANCE = 3;

  // Todas as fotos se movem juntas, do estado atual até o novo lugar.
  // Como andam no mesmo ritmo, uma nunca passa por cima da outra.
  function atualizar(animar) {
    const m = medidas();

    // fotos novas só entram nas pontas, enfileiradas ao lado da vizinha (que pode estar em movimento)
    for (let k = 0; k <= ALCANCE; k++) {
      const lados = k === 0 ? [0] : [-1, 1];
      lados.forEach((lado) => {
        const p = atual + lado * k;
        if (slides.has(p)) return;
        const el = criarSlide(p);
        el.style.width = larguraDe(p, m) + 'px';
        let inicio = alvoDe(p, m, atual);
        if (animar && k > 0) {
          const v = p - lado;
          const ev = estado.get(v);
          if (ev) {
            inicio = {
              x: ev.x + lado * ((larguraDe(v, m) * ev.s) / 2 + 40 + (larguraDe(p, m) * 0.8) / 2),
              s: 0.8, o: 0, z: 1,
            };
          }
        }
        estado.set(p, inicio);
        aplicar(el, inicio);
      });
    }

    // as que ficaram longe demais já estão invisíveis: saem
    slides.forEach((el, p) => {
      if (Math.abs(p - atual) > ALCANCE) { el.remove(); slides.delete(p); estado.delete(p); }
    });

    const alvos = new Map();
    const desde = new Map();
    slides.forEach((el, p) => {
      el.style.width = larguraDe(p, m) + 'px';
      alvos.set(p, alvoDe(p, m, atual));
      desde.set(p, Object.assign({}, estado.get(p)));
    });

    cancelAnimationFrame(quadro);

    const terminar = () => {
      slides.forEach((el, p) => {
        const a = alvos.get(p);
        estado.set(p, a);
        aplicar(el, a);
      });
    };

    if (!animar || reduzMovimento) { terminar(); return; }

    const inicio = performance.now();
    const duracao = 480;
    const passo = (agora) => {
      const t = Math.min((agora - inicio) / duracao, 1);
      const e = 1 - Math.pow(1 - t, 3); // começa rápido e desacelera no fim
      slides.forEach((el, p) => {
        const a = desde.get(p);
        const b = alvos.get(p);
        const cur = { x: a.x + (b.x - a.x) * e, s: a.s + (b.s - a.s) * e, o: a.o + (b.o - a.o) * e, z: b.z };
        estado.set(p, cur);
        aplicar(el, cur);
      });
      if (t < 1) quadro = requestAnimationFrame(passo);
      else terminar();
    };
    quadro = requestAnimationFrame(passo);
  }

  function abrir(i, elemento) {
    origem = elemento || null;
    atual = i;
    cancelAnimationFrame(quadro);
    slides.clear();
    estado.clear();
    palco.textContent = '';
    aberto = true;
    atualizar(false);
    visualizador.classList.add('aberto');
    document.documentElement.style.overflow = 'hidden';
    botaoFechar.focus({ preventScroll: true });
  }

  function fechar() {
    aberto = false;
    visualizador.classList.remove('aberto');
    document.documentElement.style.overflow = '';
    setTimeout(() => {
      if (!aberto) { cancelAnimationFrame(quadro); palco.textContent = ''; slides.clear(); estado.clear(); }
    }, 350);
    if (origem && origem.focus) origem.focus({ preventScroll: true });
  }

  function ir(passo) {
    if (!aberto) return;
    atual += passo; // sem limites: depois da última volta para a primeira, e assim por diante
    atualizar(true);
  }

  // abrir ao clicar (ou Enter/Espaço) numa foto do mural
  mural.addEventListener('click', (e) => {
    const figura = e.target.closest('.mural-item');
    if (figura) abrir(Number(figura.dataset.indice), figura);
  });
  mural.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const figura = e.target.closest('.mural-item');
    if (figura) { e.preventDefault(); abrir(Number(figura.dataset.indice), figura); }
  });

  // clicar ou tocar nas laterais troca a foto
  visualizador.querySelector('.vis-zona.esq').addEventListener('click', () => ir(-1));
  visualizador.querySelector('.vis-zona.dir').addEventListener('click', () => ir(1));
  botaoFechar.addEventListener('click', fechar);

  // teclado
  document.addEventListener('keydown', (e) => {
    if (!aberto) return;
    if (e.key === 'Escape') fechar();
    else if (e.key === 'ArrowRight') ir(1);
    else if (e.key === 'ArrowLeft') ir(-1);
  });

  // roda do mouse / trackpad
  let rodaLivre = true;
  visualizador.addEventListener('wheel', (e) => {
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!rodaLivre || Math.abs(d) < 8) return;
    rodaLivre = false;
    ir(d > 0 ? 1 : -1);
    setTimeout(() => { rodaLivre = true; }, 380);
  }, { passive: false });

  // deslizar o dedo: para os lados troca a foto, para baixo fecha
  let toqueX = 0;
  let toqueY = 0;
  visualizador.addEventListener('touchstart', (e) => {
    toqueX = e.changedTouches[0].clientX;
    toqueY = e.changedTouches[0].clientY;
  }, { passive: true });
  visualizador.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - toqueX;
    const dy = e.changedTouches[0].clientY - toqueY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) fechar();
  }, { passive: true });

  window.addEventListener('resize', () => { if (aberto) atualizar(false); });
})();
