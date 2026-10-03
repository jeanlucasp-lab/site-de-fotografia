/* ===== Lupa: fecha ao clicar fora ou apertar Esc ===== */
const busca = document.querySelector('.busca');
if (busca) {
  const campo = busca.querySelector('input[type="search"]');

  busca.addEventListener('toggle', () => {
    if (busca.open && campo) campo.focus();
  });

  document.addEventListener('click', (e) => {
    if (busca.open && !busca.contains(e.target)) busca.removeAttribute('open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && busca.open) busca.removeAttribute('open');
  });
}

/* ===== Proteção das fotos: clique direito na foto mostra aviso ===== */
const aviso = document.createElement('div');
aviso.className = 'aviso-direitos';
aviso.setAttribute('role', 'status');
aviso.textContent = '© Todos os direitos reservados';
document.body.appendChild(aviso);

let temporizador;

document.addEventListener('contextmenu', (e) => {
  // só bloqueia o clique direito em cima das fotos; no resto do site o menu normal continua
  if (!e.target.closest('.foto, .tile img, .mural-item img, .visualizador')) return;

  e.preventDefault();

  const margem = 8;
  const x = Math.min(e.clientX, window.innerWidth - aviso.offsetWidth - margem);
  const y = Math.min(e.clientY, window.innerHeight - aviso.offsetHeight - margem);
  aviso.style.left = Math.max(margem, x) + 'px';
  aviso.style.top = Math.max(margem, y) + 'px';

  aviso.classList.add('visivel');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => aviso.classList.remove('visivel'), 2000);
});

// impede arrastar imagens para o desktop
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});

/* ===== Portfólio: a roda do mouse rola a faixa de fotos para os lados ===== */
document.querySelectorAll('.categorias').forEach((faixa) => {
  faixa.addEventListener('wheel', (e) => {
    // gesto lateral do trackpad já funciona sozinho
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    const max = faixa.scrollWidth - faixa.clientWidth;
    const indoParaDireita = e.deltaY > 0;
    const noFim = indoParaDireita && faixa.scrollLeft >= max - 1;
    const noInicio = !indoParaDireita && faixa.scrollLeft <= 0;

    // nas pontas, deixa a página continuar rolando normalmente
    if (noFim || noInicio) return;

    e.preventDefault();
    faixa.scrollLeft += e.deltaY;
  }, { passive: false });
});

/* ===== Formulário de orçamento ===== */
const formulario = document.querySelector('.orcamento form');
if (formulario) {
  const ddi = formulario.querySelector('#ddi');
  const telefone = formulario.querySelector('#telefone');

  // Brasil: máscara (17) 99999-9999. Outros países: só números.
  function formatarTelefone(valor) {
    let d = valor.replace(/\D/g, '');

    if (ddi.value !== '+55') return d.slice(0, 15);

    if (d.length > 11 && d.startsWith('55')) d = d.slice(2); // aceita colar com +55
    d = d.slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function atualizarTelefone() {
    const brasil = ddi.value === '+55';
    telefone.placeholder = brasil ? '(00) 00000-0000' : 'Número com código de área';
    telefone.value = formatarTelefone(telefone.value);

    const digitos = telefone.value.replace(/\D/g, '').length;
    const minimo = brasil ? 10 : 6;
    telefone.setCustomValidity(digitos >= minimo
      ? ''
      : (brasil ? 'Digite o DDD e o número do WhatsApp.' : 'Digite o número completo com código de área.'));
  }

  telefone.addEventListener('input', atualizarTelefone);
  ddi.addEventListener('change', atualizarTelefone);

  // monta o e-mail com acentos corretos
  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const campo = (id) => formulario.querySelector('#' + id).value.trim();

    const linhas = [
      ['Nome', campo('nome')],
      ['WhatsApp', ddi.value + ' ' + campo('telefone')],
      ['Local', campo('local')],
    ].filter(([, valor]) => valor);

    const corpo = linhas.map(([nome, valor]) => nome + ': ' + valor).join('\r\n');
    const assunto = 'Pedido de orçamento - ' + campo('nome');

    window.location.href = 'mailto:' + formulario.dataset.email +
      '?subject=' + encodeURIComponent(assunto) +
      '&body=' + encodeURIComponent(corpo);
  });
}

/* ===== Botão "Pedir orçamento" do início: desce até o fim da página, passando pelo portfólio ===== */
document.querySelectorAll('[data-rolar]').forEach((botao) => {
  botao.addEventListener('click', (e) => {
    const alvo = document.getElementById(botao.dataset.rolar);
    if (!alvo) return;
    e.preventDefault();

    const raiz = document.documentElement;
    const maximo = raiz.scrollHeight - window.innerHeight;
    const destino = Math.min(alvo.getBoundingClientRect().top + window.scrollY, maximo);
    const inicio = window.scrollY;
    const distancia = destino - inicio;
    if (Math.abs(distancia) < 4) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, destino);
      return;
    }

    // velocidade: cerca de 1000 px por segundo, entre 1,8 s e 4,5 s no total
    const VELOCIDADE = 1;      // px por milissegundo (aumente para ir mais rápido)
    const MINIMO = 1800;       // ms
    const MAXIMO = 4500;       // ms
    const duracao = Math.min(Math.max(Math.abs(distancia) / VELOCIDADE, MINIMO), MAXIMO);

    const eventos = ['wheel', 'touchstart', 'mousedown', 'keydown'];
    let cancelado = false;
    let t0 = null;

    const parar = () => { cancelado = true; };
    const terminar = () => {
      eventos.forEach((ev) => window.removeEventListener(ev, parar));
      raiz.style.scrollBehavior = '';
    };
    eventos.forEach((ev) => window.addEventListener(ev, parar, { passive: true }));
    raiz.style.scrollBehavior = 'auto'; // evita brigar com a rolagem suave do CSS

    // começa e termina devagar, com velocidade constante no meio
    const suave = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

    function passo(agora) {
      if (cancelado) { terminar(); return; }
      if (t0 === null) t0 = agora;
      const t = Math.min((agora - t0) / duracao, 1);
      window.scrollTo(0, inicio + distancia * suave(t));
      if (t < 1) requestAnimationFrame(passo);
      else terminar();
    }
    requestAnimationFrame(passo);
  });
});
