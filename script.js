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
