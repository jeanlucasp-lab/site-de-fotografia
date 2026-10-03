/* =====================================================================
   Galeria do ensaio: mural estilo Pinterest + visualizador de fotos
   + rolagem infinita
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
  if (!fotos.length) return;

  const repetir = mural.dataset.repetir !== 'false'; // false = para quando acabarem as fotos
  const lote = fotos.length;                          // quantas fotos entram a cada carga
  const sentinela = document.querySelector('.mural-fim');

  /* ---------- mural em colunas (as fotos entram na coluna mais baixa) ---------- */
  let colunas = [];
  let alturas = [];
  let adicionadas = 0;

  function quantasColunas() {
    const l = window.innerWidth;
    return l <= 560 ? 2 : l <= 900 ? 3 : 4;
  }

  function montar(total) {
    mural.textContent = '';
    mural.classList.add('mural-js');
    const n = quantasColunas();
    colunas = [];
    for (let i = 0; i < n; i++) {
      const coluna = document.createElement('div');
      coluna.className = 'mural-coluna';
      mural.appendChild(coluna);
      colunas.push(coluna);
    }
    alturas = new Array(n).fill(0);
    adicionadas = 0;
    adicionar(total);
  }

  function adicionar(qtd) {
    for (let k = 0; k < qtd; k++) {
      if (!repetir && adicionadas >= fotos.length) return false;

      const indice = adicionadas % fotos.length;
      const foto = fotos[indice];
      const menor = alturas.indexOf(Math.min.apply(null, alturas));

      const figura = document.createElement('figure');
      figura.className = 'mural-item';
      figura.dataset.indice = String(indice);
      figura.tabIndex = 0;
      figura.setAttribute('role', 'button');
      figura.setAttribute('aria-label', 'Ampliar: ' + foto.alt);

      const img = new Image();
      img.src = foto.src;
      img.alt = foto.alt;
      img.width = foto.w;
      img.height = foto.h;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;

      figura.appendChild(img);
      colunas[menor].appendChild(figura);
      alturas[menor] += foto.h / foto.w + 0.04;
      adicionadas++;
    }
    return true;
  }

  /* ---------- rolagem infinita ---------- */
  let observador = null;

  function carregarMais() {
    // adiciona fotos enquanto o fim da página estiver perto da tela
    let guarda = 0;
    while (sentinela && sentinela.getBoundingClientRect().top < window.innerHeight + 900 && guarda < 6) {
      if (!adicionar(lote)) {
        if (observador) observador.disconnect();
        return;
      }
      guarda++;
    }
  }

  if (sentinela && 'IntersectionObserver' in window) {
    observador = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) {
        carregarMais();
        // reobserva para disparar de novo se o fim ainda estiver perto
        observador.unobserve(sentinela);
        observador.observe(sentinela);
      }
    }, { rootMargin: '900px 0px' });
    observador.observe(sentinela);
  }

  montar(lote);

  let colunasAtuais = quantasColunas();
  let temporizador;
  window.addEventListener('resize', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      if (quantasColunas() !== colunasAtuais) {
        colunasAtuais = quantasColunas();
        montar(Math.max(adicionadas, lote));
      }
    }, 200);
  });

  /* ---------- visualizador de foto (sem setas) ---------- */
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
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>' +
    '</button>';
  document.body.appendChild(visualizador);

  const palco = visualizador.querySelector('.vis-palco');
  const botaoFechar = visualizador.querySelector('.vis-fechar');

  let indiceAtual = 0;
  let imagemAtual = null;
  let ocupado = false;
  let origem = null;

  function criarImagem(indice) {
    const foto = fotos[indice];
    const img = new Image();
    img.src = foto.src;
    img.alt = foto.alt;
    img.draggable = false;
    return img;
  }

  function preCarregar(indice) {
    const i = (indice + fotos.length) % fotos.length;
    new Image().src = fotos[i].src;
  }

  function abrir(indice, elemento) {
    origem = elemento || null;
    indiceAtual = indice;
    palco.textContent = '';
    imagemAtual = criarImagem(indice);
    palco.appendChild(imagemAtual);

    visualizador.classList.add('aberto');
    document.documentElement.style.overflow = 'hidden';

    if (imagemAtual.animate) {
      imagemAtual.animate(
        [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 260, easing: 'ease-out' }
      );
    }
    preCarregar(indice + 1);
    preCarregar(indice - 1);
    botaoFechar.focus({ preventScroll: true });
  }

  function fechar() {
    visualizador.classList.remove('aberto');
    document.documentElement.style.overflow = '';
    ocupado = false;
    setTimeout(() => { if (!visualizador.classList.contains('aberto')) palco.textContent = ''; }, 300);
    if (origem && origem.focus) origem.focus({ preventScroll: true });
  }

  // passa para a foto seguinte (+1) ou anterior (-1) com animação
  function ir(passo) {
    if (ocupado || fotos.length < 2 || !visualizador.classList.contains('aberto')) return;
    ocupado = true;

    const sentido = passo > 0 ? 1 : -1;
    indiceAtual = (indiceAtual + passo + fotos.length) % fotos.length;

    const velha = imagemAtual;
    const nova = criarImagem(indiceAtual);
    nova.style.opacity = '0';
    palco.appendChild(nova);
    imagemAtual = nova;

    const iniciar = () => {
      const deslocamento = window.innerWidth * 0.6;
      const opcoes = { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' };
      nova.style.opacity = '';

      if (!nova.animate) { velha.remove(); ocupado = false; return; }

      velha.animate(
        [{ transform: 'translateX(0)', opacity: 1 },
         { transform: 'translateX(' + (-sentido * deslocamento) + 'px)', opacity: 0 }],
        opcoes
      );
      const animacao = nova.animate(
        [{ transform: 'translateX(' + (sentido * deslocamento) + 'px)', opacity: 0 },
         { transform: 'translateX(0)', opacity: 1 }],
        opcoes
      );
      animacao.onfinish = () => {
        velha.remove();
        nova.getAnimations().forEach((a) => a.cancel());
        ocupado = false;
      };
    };

    // espera a imagem estar pronta para a animação não "piscar"
    if (nova.decode) nova.decode().then(iniciar, iniciar);
    else iniciar();

    preCarregar(indiceAtual + sentido);
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

  // toque ou clique nas laterais da tela
  visualizador.querySelector('.vis-zona.esq').addEventListener('click', () => ir(-1));
  visualizador.querySelector('.vis-zona.dir').addEventListener('click', () => ir(1));
  botaoFechar.addEventListener('click', fechar);

  // teclado
  document.addEventListener('keydown', (e) => {
    if (!visualizador.classList.contains('aberto')) return;
    if (e.key === 'Escape') fechar();
    else if (e.key === 'ArrowRight') ir(1);
    else if (e.key === 'ArrowLeft') ir(-1);
  });

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
})();
