// Núcleo: utilidades, API, ícones, casca (navegação), modais e avisos.
export const estado = { usuario: null };

// ---------- formatação ----------
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const dataBR = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—');
export const dataCurta = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '—');
export const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
export const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dataDe = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const somarDias = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
export const somarMeses = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimo));
  return isoDe(alvo);
};
export const diasAte = (iso) => Math.round((dataDe(iso) - dataDe(hoje())) / 86400000);
export function quando(iso) {
  if (!iso) return 'Sem data';
  const n = diasAte(iso);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  if (n < 0) return `${-n} dias atrás`;
  if (n < 7) return DIAS_LONGOS[dataDe(iso).getDay()].replace('-feira', '');
  return dataCurta(iso);
}
export const paraNumero = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v || '').trim().replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : 0;
};
export const moedaInput = (n) => (Number(n) ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
export const lista = (v) => (Array.isArray(v) ? v : (typeof v === 'string' && v.startsWith('[') ? JSON.parse(v) : []));
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------- vocabulário ----------
export const STATUS = [
  { id: 'novo_contato', label: 'Novo contato', fase: 'negociacao' },
  { id: 'em_negociacao', label: 'Em negociação', fase: 'negociacao' },
  { id: 'briefing_recebido', label: 'Briefing recebido', fase: 'producao' },
  { id: 'em_producao', label: 'Em produção', fase: 'producao' },
  { id: 'aguardando_envio', label: 'Aguardando envio', fase: 'producao' },
  { id: 'aguardando_aprovacao', label: 'Aguardando aprovação', fase: 'aprovacao' },
  { id: 'aprovado', label: 'Aprovado', fase: 'pronto' },
  { id: 'agendado', label: 'Agendado', fase: 'pronto' },
  { id: 'publicado', label: 'Publicado', fase: 'feito' },
  { id: 'concluido', label: 'Concluído', fase: 'feito' },
  { id: 'cancelado', label: 'Cancelado', fase: 'cancelado' },
];
export const statusInfo = (id) => STATUS.find((s) => s.id === id) || STATUS[3];
export const ETAPAS = STATUS.filter((s) => s.id !== 'cancelado');
export const ATIVOS = ['briefing_recebido', 'em_producao', 'aguardando_envio', 'aguardando_aprovacao', 'aprovado', 'agendado'];

export const STATUS_ENTREGA = [
  { id: 'combinado', label: 'Combinado' }, { id: 'produzindo', label: 'Produzindo' },
  { id: 'aprovacao', label: 'Em aprovação' }, { id: 'publicado', label: 'Publicado' },
];
export const statusEntrega = (id) => (STATUS_ENTREGA.find((s) => s.id === id) || STATUS_ENTREGA[0]).label;

export const TIPOS_TAREFA = [
  ['receber_produto', 'Receber produto'], ['briefing', 'Estudar briefing'], ['gravacao', 'Gravar vídeo'],
  ['edicao', 'Editar conteúdo'], ['aprovacao', 'Enviar para aprovação'], ['ajuste', 'Ajustar conteúdo'],
  ['agendamento', 'Agendar publicação'], ['publicacao', 'Publicar'], ['comprovante', 'Enviar comprovante ou relatório'],
  ['entrega', 'Entregar para a marca'], ['reuniao', 'Reunião'], ['outro', 'Outro'],
];
export const tipoTarefa = (id) => (TIPOS_TAREFA.find((t) => t[0] === id) || TIPOS_TAREFA[11])[1];

export const EVENTOS = {
  gravacao: { label: 'Gravação', icone: 'camera' },
  entrega: { label: 'Entrega', icone: 'enviar' },
  aprovacao: { label: 'Aprovação', icone: 'aprovar' },
  publicacao: { label: 'Publicação', icone: 'megafone' },
  pagamento: { label: 'Recebimento', icone: 'moeda' },
  tarefa: { label: 'Tarefa', icone: 'circulo' },
};
export const PLATAFORMAS = ['Instagram', 'TikTok', 'YouTube', 'Blog', 'Kwai', 'Pinterest', 'Outro'];
export const FORMATOS = ['Reels', 'Stories', 'Vídeo UGC', 'Foto', 'Carrossel', 'Review', 'Feed', 'Vídeo', 'Live', 'Post no blog', 'Outro'];
export const TIPOS_MATERIAL = [
  ['briefing', 'Briefing'], ['referencia', 'Referência'], ['roteiro', 'Roteiro'], ['video', 'Vídeo'],
  ['foto', 'Foto'], ['contrato', 'Contrato'], ['comprovante', 'Comprovante'], ['outro', 'Outro'],
];
export const tipoMaterial = (id) => (TIPOS_MATERIAL.find((t) => t[0] === id) || TIPOS_MATERIAL[7])[1];
export const TIPO_PAGAMENTO = { dinheiro: 'Dinheiro', permuta: 'Permuta / brinde', misto: 'Dinheiro + permuta' };
export const nomeCampanha = (p) => p.nome || p.campanha || `Campanha ${p.marca || ''}`.trim();

// ---------- ícones (traço, 24px) ----------
const P = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  calendario: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  campanhas: '<path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
  marcas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>',
  tarefas: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m8 12 3 3 5-6"/>',
  arquivos: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  relatorios: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>',
  mais: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  novo: '<path d="M12 5v14M5 12h14"/>',
  camera: '<rect x="2.5" y="6.5" width="13" height="11" rx="2"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/>',
  enviar: '<path d="M21 3 10 14"/><path d="M21 3 14.5 21l-4.5-7-7-4.5L21 3Z"/>',
  aprovar: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  megafone: '<path d="M3 10v4h3l7 4V6L6 10H3Z"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/>',
  moeda: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 3 5.6 1.4 5.6 4.3 0 1.3-1.2 2.1-2.8 2.1-1.3 0-2.4-.6-2.9-1.5M12 6v1.8M12 16.2V18"/>',
  circulo: '<circle cx="12" cy="12" r="8"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  avancar: '<path d="M9 5l7 7-7 7"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  lixo: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  editar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>',
  telefone: '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.6 6.6l1.4-2.3 4.5 1.8V19a1.5 1.5 0 0 1-1.5 1.5C10.8 20.5 3.5 13.2 3.5 5A1.5 1.5 0 0 1 5 3.5Z"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9"/>',
  olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  nota: '<path d="M5 3.5h10l4 4V20.5H5Z"/><path d="M14.5 3.5v4.5H19M8.5 12h7M8.5 16h5"/>',
  baixar: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
};
export const icone = (nome, tam = 20, extra = '') =>
  `<svg class="ic" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[nome] || P.circulo}</svg>`;

// ---------- API ----------
export async function api(caminho, opts = {}) {
  let res;
  try {
    res = await fetch('/api/' + caminho, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('Sem conexão com a internet. Verifique e tente de novo.');
  }
  let dados = {};
  try {
    dados = JSON.parse(await res.text(), (k, v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T00:00:00(\.0+)?Z$/.test(v) ? v.slice(0, 10) : v));
  } catch { /* sem corpo */ }
  if (res.status === 401 && !opts.semRedirecionar) {
    estado.usuario = null;
    location.hash = '#/login';
    throw new Error(dados.erro || 'Sua sessão expirou. Entre de novo.');
  }
  if (!res.ok) throw new Error(dados.erro || 'Algo deu errado. Tente de novo.');
  return dados;
}

// ---------- avisos ----------
export function toast(msg, tipo = 'ok') {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast toast-' + tipo;
  t.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------- modais (dialog nativo: foco preso, Esc fecha) ----------
export function abrirModal({ titulo, corpo, largura = 560, aoFechar }) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  d.style.setProperty('--largura', largura + 'px');
  d.setAttribute('aria-labelledby', 'modal-titulo');
  d.innerHTML = `<div class="modal-topo"><h2 id="modal-titulo">${esc(titulo)}</h2>
    <button type="button" class="icone-btn" data-fechar aria-label="Fechar">${icone('fechar')}</button></div>
    <div class="modal-corpo">${corpo}</div>`;
  document.body.appendChild(d);
  const fechar = () => { if (d.open) d.close(); };
  d.addEventListener('close', () => { d.remove(); aoFechar?.(); });
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-fechar]')) fechar(); });
  d.showModal();
  const primeiro = d.querySelector('.modal-corpo input:not([type=hidden]), .modal-corpo select, .modal-corpo textarea');
  if (primeiro && matchMedia('(pointer: fine)').matches) primeiro.focus();
  return { el: d, fechar };
}

export function confirmar(mensagem, { titulo = 'Tem certeza?', botao = 'Confirmar', perigo = false } = {}) {
  return new Promise((ok) => {
    let resposta = false;
    const m = abrirModal({
      titulo, largura: 420,
      corpo: `<p class="modal-texto">${esc(mensagem)}</p>
        <div class="acoes-form"><button type="button" class="btn" data-fechar>Cancelar</button>
        <button type="button" class="btn ${perigo ? 'perigo-cheio' : 'primario'}" data-sim>${esc(botao)}</button></div>`,
      aoFechar: () => ok(resposta),
    });
    m.el.querySelector('[data-sim]').onclick = () => { resposta = true; m.fechar(); };
  });
}

// ---------- pedaços de interface ----------
export function avatar(u, tam = 40) {
  const nome = (u?.nome || u?.email || '?').trim();
  const iniciais = nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return u?.foto
    ? `<img class="avatar" src="${esc(u.foto)}" alt="" width="${tam}" height="${tam}" style="width:${tam}px;height:${tam}px">`
    : `<span class="avatar avatar-vazio" aria-hidden="true" style="width:${tam}px;height:${tam}px;font-size:${Math.round(tam * 0.38)}px">${esc(iniciais)}</span>`;
}

export const selo = (id) => { const s = statusInfo(id); return `<span class="selo fase-${s.fase}">${esc(s.label)}</span>`; };

// Barra em segmentos (como nos Stories): uma fatia por etapa até "Concluído".
export function trilha(statusId, { rotulo = true } = {}) {
  if (statusId === 'cancelado') return `<div class="trilha cancelada" role="img" aria-label="Campanha cancelada"><span></span></div>`;
  const idx = ETAPAS.findIndex((s) => s.id === statusId);
  const segs = ETAPAS.map((s, i) => `<span class="${i < idx ? 'cheio' : i === idx ? 'atual' : ''}"></span>`).join('');
  return `<div class="trilha-bloco">${rotulo ? `<div class="trilha-legenda"><span>${esc(statusInfo(statusId).label)}</span><span class="muted">etapa ${idx + 1} de ${ETAPAS.length}</span></div>` : ''}
    <div class="trilha" role="img" aria-label="Etapa ${idx + 1} de ${ETAPAS.length}: ${esc(statusInfo(statusId).label)}">${segs}</div></div>`;
}

export function vazio({ icone: ic = 'circulo', titulo, texto, acao = '' }) {
  return `<div class="vazio">${icone(ic, 28)}<h3>${esc(titulo)}</h3>${texto ? `<p>${esc(texto)}</p>` : ''}${acao}</div>`;
}
export const carregando = () => '<div class="carregando" role="status"><span class="spinner" aria-hidden="true"></span>Carregando…</div>';
export const erroBloco = (msg) => `<div class="alerta" role="alert">${icone('alerta')}<span>${esc(msg)}</span></div>`;
export const opcoes = (pares, atual) => pares.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(atual ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('');

// ---------- casca ----------
const NAV = [
  { id: 'inicio', href: '#/inicio', label: 'Visão geral', icone: 'inicio', inferior: true },
  { id: 'calendario', href: '#/calendario', label: 'Calendário', icone: 'calendario', inferior: true },
  { id: 'campanhas', href: '#/campanhas', label: 'Campanhas', icone: 'campanhas', inferior: true },
  { id: 'marcas', href: '#/marcas', label: 'Marcas e contatos', icone: 'marcas' },
  { id: 'tarefas', href: '#/tarefas', label: 'Entregas', icone: 'tarefas', inferior: true },
  { id: 'materiais', href: '#/materiais', label: 'Arquivos e materiais', icone: 'arquivos' },
  { id: 'relatorios', href: '#/relatorios', label: 'Relatórios', icone: 'relatorios' },
  { id: 'configuracoes', href: '#/configuracoes', label: 'Configurações', icone: 'config' },
];

export function casca(ativo) {
  const u = estado.usuario;
  let app = document.getElementById('casca');
  if (!app) {
    document.getElementById('app').innerHTML = `
      <a class="pular" href="#conteudo">Pular para o conteúdo</a>
      <div id="casca" class="casca">
        <aside class="lateral" aria-label="Navegação">
          <a class="marca-app" href="#/inicio"><span class="marca-nome"></span><span class="marca-sub">agenda de publis</span></a>
          <nav class="nav-lateral" aria-label="Principal"></nav>
          <div class="lateral-pe">
            <a class="perfil-mini" href="#/configuracoes"></a>
            <button type="button" class="link-sair" data-sair>${icone('sair', 18)}Sair</button>
          </div>
        </aside>
        <div class="topo-movel">
          <a class="marca-app" href="#/inicio"><span class="marca-nome"></span></a>
          <a class="perfil-movel" href="#/configuracoes" aria-label="Configurações e perfil"></a>
        </div>
        <main id="conteudo" class="conteudo" tabindex="-1"></main>
        <nav class="nav-inferior" aria-label="Principal"></nav>
      </div>`;
    app = document.getElementById('casca');
    app.addEventListener('click', async (e) => {
      if (e.target.closest('[data-sair]')) {
        await api('auth', { method: 'POST', body: { acao: 'logout' } }).catch(() => {});
        estado.usuario = null;
        location.hash = '#/login';
      }
      if (e.target.closest('[data-mais]')) abrirMais();
    });
  }
  const primeiro = (u?.nome || '').split(' ')[0] || 'Minha';
  app.querySelectorAll('.marca-nome').forEach((el) => { el.textContent = primeiro; });
  app.querySelector('.nav-lateral').innerHTML = NAV.map((n) =>
    `<a href="${n.href}" class="${n.id === ativo ? 'ativo' : ''}"${n.id === ativo ? ' aria-current="page"' : ''}>${icone(n.icone)}<span>${n.label}</span></a>`).join('');
  app.querySelector('.perfil-mini').innerHTML = `${avatar(u, 36)}<span><b>${esc(u?.nome || 'Meu perfil')}</b><small>Perfil e portfólio</small></span>`;
  app.querySelector('.perfil-movel').innerHTML = avatar(u, 34);
  const noMais = !NAV.find((n) => n.id === ativo)?.inferior;
  app.querySelector('.nav-inferior').innerHTML = NAV.filter((n) => n.inferior).map((n) =>
    `<a href="${n.href}" class="${n.id === ativo ? 'ativo' : ''}"${n.id === ativo ? ' aria-current="page"' : ''}>${icone(n.icone, 22)}<span>${n.id === 'inicio' ? 'Início' : n.label}</span></a>`).join('')
    + `<button type="button" data-mais class="${noMais && ativo ? 'ativo' : ''}">${icone('mais', 22)}<span>Mais</span></button>`;
  const main = document.getElementById('conteudo');
  window.scrollTo(0, 0);
  return main;
}

function abrirMais() {
  const m = abrirModal({
    titulo: 'Mais opções', largura: 420,
    corpo: `<nav class="mais-lista" aria-label="Mais opções">${NAV.filter((n) => !n.inferior).map((n) =>
      `<a href="${n.href}" data-fechar>${icone(n.icone)}<span>${n.label}</span></a>`).join('')}
      <button type="button" data-sair-mais>${icone('sair')}<span>Sair</span></button></nav>`,
  });
  m.el.classList.add('folha');
  m.el.querySelector('[data-sair-mais]').onclick = async () => {
    m.fechar();
    await api('auth', { method: 'POST', body: { acao: 'logout' } }).catch(() => {});
    estado.usuario = null;
    location.hash = '#/login';
  };
}

export function cabecalho({ titulo, sub = '', acoes = '', voltar = '' }) {
  return `<header class="cabeca">
    <div class="cabeca-texto">${voltar ? `<a class="voltar" href="${voltar.href}">${icone('voltar', 16)}${esc(voltar.label)}</a>` : ''}
      <h1>${titulo}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
    ${acoes ? `<div class="cabeca-acoes">${acoes}</div>` : ''}
  </header>`;
}

// Campanhas para selects (cache curto)
let cacheCampanhas = null;
export async function campanhasParaSelect(forcar = false) {
  if (!cacheCampanhas || forcar) cacheCampanhas = await api('publis');
  return cacheCampanhas;
}
export const limparCache = () => { cacheCampanhas = null; };
