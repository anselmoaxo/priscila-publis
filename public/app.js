// Priscila · Publis — single-page app (hash routes)
const app = document.getElementById('app');
let usuario = null;

// ---------- utilidades ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dataBR = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—');
const dataCurta = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '—');
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const somarMeses = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
};
const paraNumero = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v || '').trim().replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : 0;
};
const moedaInput = (n) => (n ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

const STATUS = [
  { id: 'combinado', label: 'Combinado' },
  { id: 'produzindo', label: 'Produzindo' },
  { id: 'aprovacao', label: 'Em aprovação' },
  { id: 'publicado', label: 'Publicado' },
];
const statusLabel = (id) => (STATUS.find((s) => s.id === id) || STATUS[0]).label;
const SITUACAO = { pago: 'Pago', aberto: 'Em aberto', atrasado: 'Atrasado', permuta_recebida: 'Permuta recebida', permuta_pendente: 'Permuta a receber' };
const TIPO_LABEL = { dinheiro: 'Dinheiro', permuta: 'Permuta / brinde', misto: 'Dinheiro + permuta' };
const REDES = ['Instagram', 'TikTok', 'YouTube', 'Kwai', 'Pinterest', 'Blog', 'Outro'];
const FORMATOS = ['Reels', 'Stories', 'Feed', 'Carrossel', 'Vídeo', 'Live', 'Post no blog', 'Outro'];

async function api(path, opts = {}) {
  const res = await fetch('/api/' + path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  let data = {};
  try {
    // Normalize midnight-UTC timestamps to plain dates.
    data = JSON.parse(await res.text(), (k, v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T00:00:00(\.0+)?Z$/.test(v) ? v.slice(0, 10) : v));
  } catch { /* sem corpo */ }
  if (res.status === 401 && path !== 'auth') { usuario = null; location.hash = '#/login'; throw new Error(data.erro || 'Sessão expirada.'); }
  if (!res.ok) throw new Error(data.erro || 'Algo deu errado. Tente de novo.');
  return data;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

const ICON_MAIS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const ICON_LIXO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';

function topo(ativo) {
  const item = (href, id, label) => `<a href="${href}" class="${ativo === id ? 'ativo' : ''}">${label}</a>`;
  return `<header class="topo">
    <a class="logo" href="#/painel">Priscila <span>· Publis</span></a>
    <nav class="menu" aria-label="Menu principal">
      ${item('#/painel', 'painel', 'Painel')}
      ${item('#/publis', 'publis', 'Publis')}
      ${item('#/financeiro', 'financeiro', 'Contas a receber')}
      ${item('#/conta', 'conta', 'Minha conta')}
      <button type="button" id="sair">Sair</button>
    </nav>
  </header>`;
}

function montar(ativo, conteudo, estreito = false) {
  app.innerHTML = topo(ativo) + `<main class="${estreito ? 'estreito' : ''}">${conteudo}</main>`;
  document.getElementById('sair').onclick = async () => {
    await api('auth', { method: 'POST', body: { acao: 'logout' } }).catch(() => {});
    usuario = null; location.hash = '#/login';
  };
  window.scrollTo(0, 0);
}

// ---------- login ----------
async function telaLogin() {
  let precisaCadastro = false;
  try { const s = await api('auth'); if (s.logado) { usuario = s.usuario; location.hash = '#/painel'; return; } precisaCadastro = s.precisaCadastro; }
  catch (e) { app.innerHTML = `<main><div class="alerta">${esc(e.message)}</div></main>`; return; }

  app.innerHTML = `<div class="login-wrap">
    <header class="topo"><span class="logo">Priscila <span>· Publis</span></span><span class="muted" style="font-size:14px">Área restrita</span></header>
    <div class="login-main"><div class="login-grid">
      <div class="login-texto">
        <div class="etiqueta">Beleza real, parcerias organizadas</div>
        <h1>Suas publis, entregas e recebimentos num lugar só.</h1>
        <p>Cadastre cada parceria, acompanhe os prazos de entrega e saiba quanto tem a receber — em dinheiro e em permutas.</p>
      </div>
      <form class="login-card" id="form-login" novalidate>
        <h2 style="font-size:28px">${precisaCadastro ? 'Criar seu acesso' : 'Entrar'}</h2>
        ${precisaCadastro ? '<p class="muted" style="margin:0">Primeiro acesso: escolha o e-mail e a senha que você vai usar.</p>' : ''}
        <div id="msg"></div>
        ${precisaCadastro ? `<div class="campo"><label for="nome">Seu nome</label><input id="nome" autocomplete="name" value="Priscila"></div>` : ''}
        <div class="campo"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" placeholder="voce@email.com" required></div>
        <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="${precisaCadastro ? 'new-password' : 'current-password'}" placeholder="${precisaCadastro ? 'Mínimo 8 caracteres' : '••••••••'}" required></div>
        ${precisaCadastro ? '' : '<label class="check"><input type="checkbox" id="lembrar" checked> Manter conectada neste aparelho</label>'}
        <button class="btn primario" type="submit">${precisaCadastro ? 'Criar acesso e entrar' : 'Entrar'}</button>
      </form>
    </div></div>
  </div>`;

  document.getElementById('form-login').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type=submit]');
    const msg = document.getElementById('msg');
    btn.disabled = true; msg.innerHTML = '';
    try {
      const body = {
        acao: precisaCadastro ? 'cadastro' : 'login',
        email: document.getElementById('email').value,
        senha: document.getElementById('senha').value,
        nome: document.getElementById('nome')?.value,
        lembrar: document.getElementById('lembrar')?.checked,
      };
      const r = await api('auth', { method: 'POST', body });
      usuario = r.usuario;
      location.hash = '#/painel';
    } catch (e) {
      msg.innerHTML = `<div class="alerta" role="alert">${esc(e.message)}</div>`;
      btn.disabled = false;
    }
  };
}

// ---------- painel ----------
async function telaPainel() {
  montar('painel', '<div class="carregando">Carregando…</div>');
  const { kpis: k, entregas, receber } = await api('resumo');
  const agora = new Date();
  const primeiroNome = (usuario?.nome || '').split(' ')[0];
  const hj = hoje();

  const entregasHtml = entregas.length ? entregas.map((e) => `
    <a class="lista-item" href="#/publis/${e.publi_id}">
      <div class="data-box">${e.data_postagem ? `<b>${e.data_postagem.slice(8, 10)}</b><small>${MESES[Number(e.data_postagem.slice(5, 7)) - 1]}</small>` : '<b>—</b><small>sem data</small>'}</div>
      <div class="meio"><div class="titulo">${esc(e.marca)}${e.tipo_pagamento === 'permuta' ? ' <span class="muted" style="font-weight:500">(permuta)</span>' : ''}</div>
        <div class="det">${esc(e.rede)} · ${e.quantidade} ${esc(e.formato)}</div></div>
      <span class="selo s-${e.status}">${statusLabel(e.status)}</span>
    </a>`).join('') : '<div class="vazio">Nenhuma entrega pendente.</div>';

  const receberHtml = receber.length ? receber.map((r) => {
    const atrasada = r.vencimento < hj;
    return `<a class="lista-item" href="#/publis/${r.publi_id}" style="justify-content:space-between">
      <div class="meio"><div class="titulo">${esc(r.marca)}${r.total_parcelas > 1 ? ` · ${r.numero}/${r.total_parcelas}` : ''}</div>
        <div class="det" style="color:${atrasada ? 'var(--vermelho)' : ''}">${atrasada ? 'Venceu em' : 'Vence'} ${dataCurta(r.vencimento)}</div></div>
      <div class="num" style="font-weight:600">${brl(r.valor)}</div>
    </a>`;
  }).join('') : '<div class="vazio">Nada a receber no momento.</div>';

  montar('painel', `
    <div class="cabeca">
      <div><div class="sub">${MESES_LONGOS[agora.getMonth()]} de ${agora.getFullYear()}</div><h1>Oi${primeiroNome ? ', ' + esc(primeiroNome) : ''}</h1></div>
      <a class="btn primario" href="#/publis/nova">${ICON_MAIS} Nova publi</a>
    </div>
    <div class="kpis">
      <div class="kpi k-rosa"><div class="rotulo">A receber (dinheiro)</div><div class="valor">${brl(k.aberto)}</div><div class="det">${k.aberto_qtd} parcela${k.aberto_qtd === 1 ? '' : 's'} em aberto</div></div>
      <div class="kpi k-verde"><div class="rotulo">Recebido no mês</div><div class="valor">${brl(k.recebido_mes)}</div><div class="det">${k.recebido_mes_qtd} pagamento${k.recebido_mes_qtd === 1 ? '' : 's'}</div></div>
      <div class="kpi k-lilas"><div class="rotulo">Permutas no mês</div><div class="valor">${brl(k.permuta_mes)}</div><div class="det">valor estimado · ${k.permuta_mes_qtd} parceria${k.permuta_mes_qtd === 1 ? '' : 's'}</div></div>
      <div class="kpi k-laranja"><div class="rotulo">Atrasado</div><div class="valor">${brl(k.atrasado)}</div><div class="det">${k.atrasado_qtd} parcela${k.atrasado_qtd === 1 ? '' : 's'} vencida${k.atrasado_qtd === 1 ? '' : 's'}</div></div>
    </div>
    <div class="colunas">
      <section class="caixa col-larga" style="gap:8px">
        <div class="caixa-topo"><h2>Próximas entregas</h2><a href="#/publis" style="font-size:14px;font-weight:600">Ver publis</a></div>
        <div>${entregasHtml}</div>
      </section>
      <section class="caixa col-estreita" style="gap:8px">
        <div class="caixa-topo"><h2>A receber</h2><a href="#/financeiro" style="font-size:14px;font-weight:600">Financeiro</a></div>
        <div>${receberHtml}</div>
      </section>
    </div>`);
}

// ---------- lista de publis ----------
let filtroPublis = 'andamento';
async function telaPublis() {
  montar('publis', '<div class="carregando">Carregando…</div>');
  const todas = await api('publis');
  let busca = '';

  const render = () => {
    const filtros = [['andamento', 'Em andamento'], ['concluidas', 'Concluídas'], ['todas', 'Todas']];
    const lista = todas.filter((p) => {
      const concluida = Number(p.entregas) > 0 && Number(p.publicadas) === Number(p.entregas)
        && Number(p.recebido) >= Number(p.valor_dinheiro)
        && (p.tipo_pagamento === 'dinheiro' || p.permuta_recebida_em);
      if (filtroPublis === 'andamento' && concluida) return false;
      if (filtroPublis === 'concluidas' && !concluida) return false;
      return !busca || (p.marca + ' ' + (p.agencia || '')).toLowerCase().includes(busca);
    });
    const linhas = lista.map((p) => `<tr>
      <td><a href="#/publis/${p.id}">${esc(p.marca)}</a>${p.agencia ? `<div class="muted" style="font-size:13px">${esc(p.agencia)}</div>` : ''}</td>
      <td class="num">${p.inicio || p.fim ? `${dataCurta(p.inicio)} a ${dataBR(p.fim)}` : '—'}</td>
      <td><span class="selo ${p.tipo_pagamento === 'dinheiro' ? 's-aberto' : 's-permuta'}">${TIPO_LABEL[p.tipo_pagamento]}</span></td>
      <td class="num">${p.publicadas} de ${p.entregas}</td>
      <td class="dir num">${p.tipo_pagamento === 'permuta' ? '—' : brl(p.valor_dinheiro)}${Number(p.atrasado) > 0 ? `<div style="font-size:13px;color:var(--vermelho)">${brl(p.atrasado)} atrasado</div>` : ''}</td>
      <td class="dir num">${Number(p.permuta_valor) ? brl(p.permuta_valor) : '—'}</td>
    </tr>`).join('');
    document.getElementById('conteudo').innerHTML = lista.length
      ? `<div class="rolagem"><table><thead><tr><th>Marca</th><th>Período</th><th>Pagamento</th><th>Publicadas</th><th class="dir">Dinheiro</th><th class="dir">Permuta</th></tr></thead><tbody>${linhas}</tbody></table></div>`
      : `<div class="vazio">${todas.length ? 'Nenhuma publi neste filtro.' : 'Você ainda não cadastrou nenhuma publi.'}</div>`;
    document.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === filtroPublis)));
    return filtros;
  };

  montar('publis', `
    <div class="cabeca"><h1>Publis</h1><a class="btn primario" href="#/publis/nova">${ICON_MAIS} Nova publi</a></div>
    <section class="caixa">
      <div class="caixa-topo">
        <div class="pilulas" role="group" aria-label="Filtro">
          <button type="button" class="pilula" data-filtro="andamento">Em andamento</button>
          <button type="button" class="pilula" data-filtro="concluidas">Concluídas</button>
          <button type="button" class="pilula" data-filtro="todas">Todas</button>
        </div>
        <div class="campo" style="flex:0 1 280px"><label for="busca" class="hidden">Buscar</label><input id="busca" type="search" placeholder="Buscar marca ou agência"></div>
      </div>
      <div id="conteudo"></div>
    </section>`);
  document.querySelectorAll('[data-filtro]').forEach((b) => { b.onclick = () => { filtroPublis = b.dataset.filtro; render(); }; });
  document.getElementById('busca').oninput = (e) => { busca = e.target.value.trim().toLowerCase(); render(); };
  render();
}

// ---------- formulário (nova / editar) ----------
async function telaForm(id) {
  montar('publis', '<div class="carregando">Carregando…</div>', true);
  const p = id ? await api('publis?id=' + id) : {
    marca: '', agencia: '', contato: '', contrato_url: '', inicio: hoje(), fim: '', tipo_pagamento: 'dinheiro',
    forma_pagamento: 'Pix', permuta_descricao: '', permuta_valor: 0, permuta_recebida_em: '', observacoes: '',
    entregas: [{ rede: 'Instagram', formato: 'Reels', quantidade: 1, data_postagem: '', status: 'combinado' }],
    parcelas: [],
  };
  const st = { tipo: p.tipo_pagamento, entregas: p.entregas.map((e) => ({ ...e })), parcelas: p.parcelas.map((x) => ({ ...x })) };

  const opts = (lista, atual) => {
    const l = lista.includes(atual) || !atual ? lista : [atual, ...lista];
    return l.map((o) => `<option${o === atual ? ' selected' : ''}>${esc(o)}</option>`).join('');
  };

  const renderEntregas = () => {
    document.getElementById('entregas').innerHTML = st.entregas.map((e, i) => `
      <div class="bloco entrega" data-i="${i}">
        <div class="campo"><label for="e-rede-${i}">Rede</label><select id="e-rede-${i}" data-k="rede">${opts(REDES, e.rede)}</select></div>
        <div class="campo"><label for="e-form-${i}">Formato</label><select id="e-form-${i}" data-k="formato">${opts(FORMATOS, e.formato)}</select></div>
        <div class="campo"><label for="e-qtd-${i}">Quantidade</label><input id="e-qtd-${i}" data-k="quantidade" type="number" min="1" value="${e.quantidade}"></div>
        <div class="campo"><label for="e-data-${i}">Data de postagem</label><input id="e-data-${i}" data-k="data_postagem" type="date" value="${e.data_postagem || ''}"></div>
        <div class="campo"><label for="e-st-${i}">Status</label><select id="e-st-${i}" data-k="status">${STATUS.map((s) => `<option value="${s.id}"${s.id === e.status ? ' selected' : ''}>${s.label}</option>`).join('')}</select></div>
        <div style="display:flex;justify-content:flex-end"><button type="button" class="icone-btn" data-rm-entrega="${i}" aria-label="Remover entrega ${i + 1}">${ICON_LIXO}</button></div>
      </div>`).join('') || '<p class="muted" style="margin:0">Nenhuma entrega adicionada.</p>';
  };

  const renderParcelas = () => {
    const total = st.parcelas.reduce((s, x) => s + paraNumero(x.valor), 0);
    document.getElementById('parcelas').innerHTML = st.parcelas.length ? `
      ${st.parcelas.map((x, i) => `
        <div class="parcela-linha" data-pi="${i}">
          <div style="font-weight:600">Parcela ${i + 1}${x.pago_em ? ' <span class="selo s-pago" style="font-size:12px;padding:3px 8px">Paga</span>' : ''}</div>
          <div><label for="pv-${i}" class="hidden">Vencimento da parcela ${i + 1}</label><input id="pv-${i}" type="date" data-pk="vencimento" value="${x.vencimento || ''}"></div>
          <div><label for="pr-${i}" class="hidden">Valor da parcela ${i + 1}</label><input id="pr-${i}" inputmode="decimal" data-pk="valor" value="${moedaInput(paraNumero(x.valor))}" placeholder="0,00"></div>
          <button type="button" class="icone-btn" data-rm-parcela="${i}" aria-label="Remover parcela ${i + 1}">${ICON_LIXO}</button>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding-top:10px;font-weight:600"><span>Total em dinheiro</span><span class="num" id="total-parcelas">${brl(total)}</span></div>`
      : '<p class="muted" style="margin:0">Informe o valor e gere as parcelas acima.</p>';
  };

  const renderTipo = () => {
    document.querySelectorAll('[data-tipo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === st.tipo)));
    document.getElementById('sec-dinheiro').classList.toggle('hidden', st.tipo === 'permuta');
    document.getElementById('sec-permuta').classList.toggle('hidden', st.tipo === 'dinheiro');
  };

  const totalAtual = p.parcelas.reduce((s, x) => s + Number(x.valor), 0);
  montar('publis', `
    <div><a class="voltar" href="${id ? '#/publis/' + id : '#/publis'}">← Voltar</a><h1>${id ? 'Editar publi' : 'Nova publi'}</h1></div>
    <form id="form" novalidate style="display:flex;flex-direction:column;gap:24px">
      <section class="caixa"><h2>Marca e contato</h2>
        <div class="grade">
          <div class="campo"><label for="marca">Marca *</label><input id="marca" required value="${esc(p.marca)}" placeholder="Nome da marca"></div>
          <div class="campo"><label for="agencia">Agência (opcional)</label><input id="agencia" value="${esc(p.agencia)}" placeholder="Se veio por agência"></div>
          <div class="campo"><label for="contato">Contato</label><input id="contato" value="${esc(p.contato)}" placeholder="Nome, e-mail ou WhatsApp"></div>
          <div class="campo"><label for="contrato_url">Link do contrato</label><input id="contrato_url" type="url" value="${esc(p.contrato_url)}" placeholder="https://"></div>
        </div>
      </section>

      <section class="caixa">
        <div class="caixa-topo"><h2>Entregas</h2>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
            <div class="campo"><label for="inicio">De</label><input id="inicio" type="date" value="${p.inicio || ''}"></div>
            <div class="campo"><label for="fim">Até</label><input id="fim" type="date" value="${p.fim || ''}"></div>
          </div>
        </div>
        <div id="entregas" style="display:flex;flex-direction:column;gap:12px"></div>
        <button type="button" class="btn tracejado" id="add-entrega" style="align-self:flex-start">+ Adicionar entrega</button>
      </section>

      <section class="caixa"><h2>Pagamento</h2>
        <div class="pilulas" role="group" aria-label="Tipo de pagamento">
          <button type="button" class="pilula" data-tipo="dinheiro">Dinheiro</button>
          <button type="button" class="pilula" data-tipo="permuta">Permuta / brinde</button>
          <button type="button" class="pilula" data-tipo="misto">Dinheiro + permuta</button>
        </div>
        <div id="sec-dinheiro" style="display:flex;flex-direction:column;gap:14px">
          <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));align-items:end">
            <div class="campo"><label for="g-valor">Valor total</label><input id="g-valor" inputmode="decimal" placeholder="0,00" value="${moedaInput(totalAtual)}"></div>
            <div class="campo"><label for="g-n">Parcelas</label><select id="g-n">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${i + 1 === (p.parcelas.length || 1) ? ' selected' : ''}>${i + 1}x</option>`).join('')}</select></div>
            <div class="campo"><label for="g-venc">1º vencimento</label><input id="g-venc" type="date" value="${p.parcelas[0]?.vencimento || ''}"></div>
            <div class="campo"><label for="forma_pagamento">Forma</label><select id="forma_pagamento">${opts(['Pix', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro'], p.forma_pagamento || 'Pix')}</select></div>
          </div>
          <button type="button" class="btn pequeno" id="gerar" style="align-self:flex-start">Gerar parcelas</button>
          <div id="parcelas" style="border-radius:14px;background:#FBF7F8;padding:8px 16px 14px"></div>
        </div>
        <div id="sec-permuta" class="bloco lilas" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          <div class="campo"><label for="permuta_descricao">O que vai receber</label><input id="permuta_descricao" value="${esc(p.permuta_descricao)}" placeholder="Ex.: kit de skincare, 3 produtos"></div>
          <div class="campo"><label for="permuta_valor">Valor estimado</label><input id="permuta_valor" inputmode="decimal" value="${moedaInput(p.permuta_valor)}" placeholder="0,00"></div>
          <div class="campo"><label for="permuta_recebida_em">Recebido em</label><input id="permuta_recebida_em" type="date" value="${p.permuta_recebida_em || ''}"></div>
        </div>
      </section>

      <section class="caixa"><div class="campo"><label for="observacoes" style="font-family:var(--display);font-size:21px">Observações</label>
        <textarea id="observacoes" rows="3" placeholder="Briefing, hashtags obrigatórias, cupom da marca…">${esc(p.observacoes)}</textarea></div></section>

      <div id="msg"></div>
      <div class="linha-acao">
        <a class="btn" href="${id ? '#/publis/' + id : '#/publis'}">Cancelar</a>
        <button type="submit" class="btn primario">Salvar publi</button>
      </div>
    </form>`, true);

  renderEntregas(); renderParcelas(); renderTipo();

  document.querySelectorAll('[data-tipo]').forEach((b) => { b.onclick = () => { st.tipo = b.dataset.tipo; renderTipo(); }; });
  document.getElementById('add-entrega').onclick = () => {
    const ult = st.entregas[st.entregas.length - 1];
    st.entregas.push({ rede: ult?.rede || 'Instagram', formato: 'Stories', quantidade: 1, data_postagem: ult?.data_postagem || '', status: 'combinado' });
    renderEntregas();
  };
  const ent = document.getElementById('entregas');
  ent.addEventListener('input', (ev) => {
    const k = ev.target.dataset.k; const box = ev.target.closest('[data-i]');
    if (k && box) st.entregas[Number(box.dataset.i)][k] = ev.target.value;
  });
  ent.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-rm-entrega]');
    if (b) { st.entregas.splice(Number(b.dataset.rmEntrega), 1); renderEntregas(); }
  });

  document.getElementById('gerar').onclick = () => {
    const total = paraNumero(document.getElementById('g-valor').value);
    const n = Number(document.getElementById('g-n').value);
    const venc = document.getElementById('g-venc').value || document.getElementById('fim').value || hoje();
    if (total <= 0) { toast('Informe o valor total.'); document.getElementById('g-valor').focus(); return; }
    const cents = Math.round(total * 100);
    const base = Math.floor(cents / n);
    const antigas = st.parcelas;
    st.parcelas = Array.from({ length: n }, (_, i) => ({
      id: antigas[i]?.id, pago_em: antigas[i]?.pago_em,
      valor: (i === n - 1 ? cents - base * (n - 1) : base) / 100,
      vencimento: somarMeses(venc, i),
    }));
    renderParcelas();
  };
  const par = document.getElementById('parcelas');
  par.addEventListener('input', (ev) => {
    const k = ev.target.dataset.pk; const row = ev.target.closest('[data-pi]');
    if (!k || !row) return;
    st.parcelas[Number(row.dataset.pi)][k] = ev.target.value;
    if (k === 'valor') document.getElementById('total-parcelas').textContent = brl(st.parcelas.reduce((s, x) => s + paraNumero(x.valor), 0));
  });
  par.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-rm-parcela]');
    if (b) { st.parcelas.splice(Number(b.dataset.rmParcela), 1); renderParcelas(); }
  });

  document.getElementById('form').onsubmit = async (ev) => {
    ev.preventDefault();
    const msg = document.getElementById('msg');
    const btn = ev.target.querySelector('button[type=submit]');
    const v = (k) => document.getElementById(k).value;
    if (st.tipo !== 'permuta' && !st.parcelas.length) {
      // Convenience: generate a single installment from the total if the user forgot.
      if (paraNumero(v('g-valor')) > 0) document.getElementById('gerar').click();
    }
    const body = {
      marca: v('marca'), agencia: v('agencia'), contato: v('contato'), contrato_url: v('contrato_url'),
      inicio: v('inicio'), fim: v('fim'), tipo_pagamento: st.tipo, forma_pagamento: v('forma_pagamento'),
      permuta_descricao: v('permuta_descricao'), permuta_valor: paraNumero(v('permuta_valor')), permuta_recebida_em: v('permuta_recebida_em'),
      observacoes: v('observacoes'),
      entregas: st.entregas.map((e) => ({ id: e.id, rede: e.rede, formato: e.formato, quantidade: Number(e.quantidade) || 1, data_postagem: e.data_postagem, status: e.status })),
      parcelas: st.parcelas.map((x) => ({ id: x.id, valor: paraNumero(x.valor), vencimento: x.vencimento })),
    };
    btn.disabled = true; msg.innerHTML = '';
    try {
      const r = await api(id ? 'publis?id=' + id : 'publis', { method: id ? 'PUT' : 'POST', body });
      toast('Publi salva.');
      location.hash = '#/publis/' + r.id;
    } catch (e) {
      msg.innerHTML = `<div class="alerta" role="alert">${esc(e.message)}</div>`;
      msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.disabled = false;
    }
  };
}

// ---------- detalhe ----------
async function telaDetalhe(id) {
  montar('publis', '<div class="carregando">Carregando…</div>');
  const p = await api('publis?id=' + id);
  const hj = hoje();
  const totalDinheiro = p.parcelas.reduce((s, x) => s + Number(x.valor), 0);
  const recebido = p.parcelas.filter((x) => x.pago_em).reduce((s, x) => s + Number(x.valor), 0);
  const feitas = p.entregas.filter((e) => e.status === 'publicado').length;
  const periodo = p.inicio || p.fim ? `${dataBR(p.inicio)} a ${dataBR(p.fim)}` : 'Sem período definido';
  const link = p.contrato_url && /^https?:\/\//i.test(p.contrato_url) ? p.contrato_url : null;

  montar('publis', `
    <div class="cabeca">
      <div style="display:flex;flex-direction:column;gap:8px">
        <a class="voltar" href="#/publis">← Publis</a>
        <h1>${esc(p.marca)}</h1>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="selo s-aberto">${periodo}</span><span class="selo s-permuta">${TIPO_LABEL[p.tipo_pagamento]}</span></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn perigo" id="excluir">Excluir</button>
        <a class="btn" href="#/publis/${p.id}/editar">Editar</a>
        ${link ? `<a class="btn primario" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir contrato</a>` : ''}
      </div>
    </div>
    <div class="kpis">
      ${p.tipo_pagamento !== 'permuta' ? `<div class="kpi k-rosa"><div class="rotulo">Total em dinheiro</div><div class="valor">${brl(totalDinheiro)}</div></div>
      <div class="kpi k-verde"><div class="rotulo">Já recebido</div><div class="valor">${brl(recebido)}</div></div>` : ''}
      ${p.tipo_pagamento !== 'dinheiro' ? `<div class="kpi k-lilas"><div class="rotulo">Permuta (estimado)</div><div class="valor">${brl(p.permuta_valor)}</div></div>` : ''}
      <div class="kpi k-cinza"><div class="rotulo">Entregas publicadas</div><div class="valor">${feitas} de ${p.entregas.length}</div></div>
    </div>
    <div class="colunas">
      <section class="caixa col-larga" style="gap:14px">
        <h2>Entregas</h2>
        ${p.entregas.length ? '<p class="muted" style="margin:-6px 0 0;font-size:14px">Toque numa etapa para atualizar o status.</p>' : ''}
        ${p.entregas.map((e) => {
          const idx = STATUS.findIndex((s) => s.id === e.status);
          return `<div style="padding:16px;border-radius:14px;background:#FBF7F8;display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div style="font-weight:600">${esc(e.rede)} · ${e.quantidade} ${esc(e.formato)}</div>
              <div class="muted" style="font-size:14px">${e.data_postagem ? 'Postar em ' + dataBR(e.data_postagem) : 'Sem data'}</div>
            </div>
            <div class="pilulas" role="group" aria-label="Status">
              ${STATUS.map((s, j) => `<button type="button" class="pilula${j < idx ? ' feito' : ''}" aria-pressed="${j === idx}" data-entrega="${e.id}" data-status="${s.id}">${s.label}</button>`).join('')}
            </div>
          </div>`;
        }).join('') || '<div class="vazio">Nenhuma entrega cadastrada.</div>'}
        ${p.observacoes ? `<div style="border-top:1px solid var(--rosa-linha);padding-top:14px"><div class="rot" style="margin-bottom:6px">Observações</div><div style="white-space:pre-line">${esc(p.observacoes)}</div></div>` : ''}
      </section>
      <div class="col-estreita">
        ${p.tipo_pagamento !== 'permuta' ? `<section class="caixa" style="gap:6px"><h2>Parcelas</h2>
          ${p.parcelas.map((x) => {
            const atrasada = !x.pago_em && x.vencimento < hj;
            return `<div class="lista-item" style="justify-content:space-between">
              <div class="meio"><div class="titulo" style="white-space:nowrap">${x.numero}/${p.parcelas.length} · <span class="num">${brl(x.valor)}</span></div>
                <div class="det" style="color:${atrasada ? 'var(--vermelho)' : ''}">${x.pago_em ? 'Pago em ' + dataBR(x.pago_em) : (atrasada ? 'Venceu em ' : 'Vence ') + dataBR(x.vencimento)}${p.forma_pagamento ? ' · ' + esc(p.forma_pagamento) : ''}</div></div>
              <button type="button" class="btn pequeno" data-parcela="${x.id}" data-pago="${x.pago_em ? '1' : ''}" style="${x.pago_em ? 'background:var(--verde-bg);color:var(--verde);border-color:#BFDCCB' : 'color:var(--rosa-escuro)'}">${x.pago_em ? 'Pago ✓' : 'Marcar como pago'}</button>
            </div>`;
          }).join('')}</section>` : ''}
        ${p.tipo_pagamento !== 'dinheiro' ? `<section class="caixa lilas" style="gap:8px"><h2>Permuta</h2>
          <div>${esc(p.permuta_descricao) || '<span class="muted">Sem descrição</span>'}</div>
          <div style="font-size:14px;color:var(--lilas)">Valor estimado ${brl(p.permuta_valor)}${p.permuta_recebida_em ? ' · recebido em ' + dataBR(p.permuta_recebida_em) : ''}</div>
          <button type="button" class="btn pequeno" id="permuta-toggle" style="align-self:flex-start">${p.permuta_recebida_em ? 'Desmarcar recebimento' : 'Marcar como recebida'}</button>
        </section>` : ''}
        <section class="caixa" style="gap:8px"><h2>Contato</h2>
          ${p.agencia ? `<div><span class="muted">Agência:</span> ${esc(p.agencia)}</div>` : ''}
          <div>${esc(p.contato) || '<span class="muted">Sem contato cadastrado</span>'}</div>
          ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="font-weight:600">Ver contrato</a>` : ''}
        </section>
      </div>
    </div>`);

  document.querySelectorAll('[data-entrega]').forEach((b) => {
    b.onclick = async () => {
      try { await api('acoes', { method: 'POST', body: { acao: 'entrega_status', id: Number(b.dataset.entrega), status: b.dataset.status } }); telaDetalhe(id); }
      catch (e) { toast(e.message); }
    };
  });
  document.querySelectorAll('[data-parcela]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      try { await api('acoes', { method: 'POST', body: { acao: 'parcela_pago', id: Number(b.dataset.parcela), pago: !b.dataset.pago } }); telaDetalhe(id); }
      catch (e) { toast(e.message); b.disabled = false; }
    };
  });
  const pt = document.getElementById('permuta-toggle');
  if (pt) pt.onclick = async () => {
    try { await api('acoes', { method: 'POST', body: { acao: 'permuta_recebida', id: p.id, recebida: !p.permuta_recebida_em } }); telaDetalhe(id); }
    catch (e) { toast(e.message); }
  };
  document.getElementById('excluir').onclick = async () => {
    if (!confirm(`Excluir a publi "${p.marca}"? As entregas e parcelas dela também serão apagadas.`)) return;
    try { await api('publis?id=' + p.id, { method: 'DELETE' }); toast('Publi excluída.'); location.hash = '#/publis'; }
    catch (e) { toast(e.message); }
  };
}

// ---------- financeiro ----------
let finPeriodo = 'mes';
let finFiltro = 'todas';
function intervalo(per) {
  const h = hoje();
  const y = Number(h.slice(0, 4)), m = Number(h.slice(5, 7));
  const fimMes = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10);
  const ini = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}-01`;
  if (per === 'mes') return { de: ini(y, m), ate: fimMes(y, m) };
  if (per === 'proximo') { const d = somarMeses(ini(y, m), 1); return { de: d, ate: fimMes(Number(d.slice(0, 4)), Number(d.slice(5, 7))) }; }
  if (per === 'anterior') { const d = somarMeses(ini(y, m), -1); return { de: d, ate: fimMes(Number(d.slice(0, 4)), Number(d.slice(5, 7))) }; }
  if (per === 'ano') return { de: `${y}-01-01`, ate: `${y}-12-31` };
  return { de: '', ate: '' };
}

async function telaFinanceiro() {
  montar('financeiro', '<div class="carregando">Carregando…</div>');
  const { de, ate } = intervalo(finPeriodo);
  const { linhas, atrasadoGeral } = await api(`financeiro?de=${de}&ate=${ate}`);
  const soma = (f) => linhas.filter(f).reduce((s, l) => s + Number(l.valor), 0);
  const aberto = soma((l) => l.situacao === 'aberto' || l.situacao === 'atrasado');
  const recebido = soma((l) => l.situacao === 'pago');
  const permutas = soma((l) => l.tipo === 'permuta');
  const regras = {
    todas: () => true, aberto: (l) => l.situacao === 'aberto', atrasadas: (l) => l.situacao === 'atrasado',
    pagas: (l) => l.situacao === 'pago', permutas: (l) => l.tipo === 'permuta',
  };
  const visiveis = linhas.filter(regras[finFiltro]);
  const periodos = [['mes', 'Este mês'], ['proximo', 'Próximo mês'], ['anterior', 'Mês passado'], ['ano', 'Este ano'], ['tudo', 'Tudo']];

  montar('financeiro', `
    <div class="cabeca"><h1>Contas a receber</h1>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <label for="periodo" class="rot">Período</label>
        <select id="periodo" class="entrada" style="width:auto;border-radius:999px">${periodos.map(([v, l]) => `<option value="${v}"${v === finPeriodo ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <button type="button" class="btn" id="exportar">Exportar planilha</button>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi k-rosa"><div class="rotulo">Em aberto (dinheiro)</div><div class="valor">${brl(aberto)}</div><div class="det">no período</div></div>
      <div class="kpi k-laranja"><div class="rotulo">Atrasado</div><div class="valor">${brl(atrasadoGeral.valor)}</div><div class="det">${atrasadoGeral.qtd} parcela${atrasadoGeral.qtd === 1 ? '' : 's'} · todos os períodos</div></div>
      <div class="kpi k-verde"><div class="rotulo">Recebido</div><div class="valor">${brl(recebido)}</div><div class="det">no período</div></div>
      <div class="kpi k-lilas"><div class="rotulo">Permutas (estimado)</div><div class="valor">${brl(permutas)}</div><div class="det">fora do total em dinheiro</div></div>
    </div>
    <section class="caixa">
      <div class="pilulas" role="group" aria-label="Filtro">
        ${[['todas', 'Todas'], ['aberto', 'Em aberto'], ['atrasadas', 'Atrasadas'], ['pagas', 'Pagas'], ['permutas', 'Permutas']]
          .map(([v, l]) => `<button type="button" class="pilula" data-f="${v}" aria-pressed="${v === finFiltro}">${l}</button>`).join('')}
      </div>
      ${visiveis.length ? `<div class="rolagem"><table>
        <thead><tr><th>Data</th><th>Marca</th><th>Parcela</th><th>Tipo</th><th class="dir">Valor</th><th>Situação</th><th></th></tr></thead>
        <tbody>${visiveis.map((l) => `<tr>
          <td class="num">${dataBR(l.data)}</td>
          <td><a href="#/publis/${l.publi_id}">${esc(l.marca)}</a>${l.descricao ? `<div class="muted" style="font-size:13px">${esc(l.descricao)}</div>` : ''}</td>
          <td class="muted">${l.tipo === 'parcela' ? `${l.numero}/${l.total_parcelas}` : '—'}</td>
          <td>${l.tipo === 'parcela' ? 'Dinheiro' : 'Permuta'}</td>
          <td class="dir num" style="font-weight:600">${brl(l.valor)}</td>
          <td><span class="selo s-${l.situacao}">${SITUACAO[l.situacao]}</span></td>
          <td class="dir">${l.tipo === 'parcela'
            ? `<button type="button" class="btn pequeno" data-pagar="${l.id}" data-pago="${l.quitado_em ? '1' : ''}">${l.quitado_em ? 'Desfazer' : 'Recebi'}</button>`
            : `<button type="button" class="btn pequeno" data-permuta="${l.id}" data-pago="${l.quitado_em ? '1' : ''}">${l.quitado_em ? 'Desfazer' : 'Recebi'}</button>`}</td>
        </tr>`).join('')}</tbody></table></div>`
        : `<div class="vazio">Nada neste período${finFiltro !== 'todas' ? ' e filtro' : ''}.</div>`}
    </section>`);

  document.getElementById('periodo').onchange = (e) => { finPeriodo = e.target.value; telaFinanceiro(); };
  document.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { finFiltro = b.dataset.f; telaFinanceiro(); }; });
  document.querySelectorAll('[data-pagar]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      try { await api('acoes', { method: 'POST', body: { acao: 'parcela_pago', id: Number(b.dataset.pagar), pago: !b.dataset.pago } }); telaFinanceiro(); }
      catch (e) { toast(e.message); b.disabled = false; }
    };
  });
  document.querySelectorAll('[data-permuta]').forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      try { await api('acoes', { method: 'POST', body: { acao: 'permuta_recebida', id: Number(b.dataset.permuta), recebida: !b.dataset.pago } }); telaFinanceiro(); }
      catch (e) { toast(e.message); b.disabled = false; }
    };
  });
  document.getElementById('exportar').onclick = () => {
    const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhasCsv = [['Data', 'Marca', 'Parcela', 'Tipo', 'Valor', 'Situação', 'Quitado em', 'Descrição'].map(cel).join(';')]
      .concat(visiveis.map((l) => [dataBR(l.data), l.marca, l.tipo === 'parcela' ? `${l.numero}/${l.total_parcelas}` : '', l.tipo === 'parcela' ? 'Dinheiro' : 'Permuta',
        Number(l.valor).toFixed(2).replace('.', ','), SITUACAO[l.situacao], l.quitado_em ? dataBR(l.quitado_em) : '', l.descricao || ''].map(cel).join(';')));
    const blob = new Blob(['﻿' + linhasCsv.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contas-a-receber-${finPeriodo}-${hoje()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
}

// ---------- conta ----------
function telaConta() {
  montar('conta', `
    <h1>Minha conta</h1>
    <section class="caixa" style="max-width:480px">
      <div><div class="rot">E-mail de acesso</div><div class="muted">${esc(usuario?.email)}</div></div>
      <form id="form-senha" style="display:flex;flex-direction:column;gap:14px" novalidate>
        <h2>Alterar senha</h2>
        <div id="msg"></div>
        <div class="campo"><label for="atual">Senha atual</label><input id="atual" type="password" autocomplete="current-password"></div>
        <div class="campo"><label for="nova">Nova senha</label><input id="nova" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></div>
        <button type="submit" class="btn primario" style="align-self:flex-start">Salvar nova senha</button>
      </form>
    </section>`, true);
  document.getElementById('form-senha').onsubmit = async (ev) => {
    ev.preventDefault();
    const msg = document.getElementById('msg');
    try {
      await api('auth', { method: 'POST', body: { acao: 'senha', atual: document.getElementById('atual').value, nova: document.getElementById('nova').value } });
      msg.innerHTML = '<div class="ok" role="status">Senha alterada.</div>';
      ev.target.reset();
    } catch (e) { msg.innerHTML = `<div class="alerta" role="alert">${esc(e.message)}</div>`; }
  };
}

// ---------- rotas ----------
async function rotear() {
  const h = location.hash.replace(/^#/, '') || '/painel';
  if (h === '/login') return telaLogin();
  if (!usuario) {
    try { const s = await api('auth'); if (!s.logado) { location.hash = '#/login'; return; } usuario = s.usuario; }
    catch (e) { app.innerHTML = `<main><div class="alerta">${esc(e.message)}</div></main>`; return; }
  }
  try {
    let m;
    if (h === '/painel') return await telaPainel();
    if (h === '/publis') return await telaPublis();
    if (h === '/publis/nova') return await telaForm(null);
    if ((m = h.match(/^\/publis\/(\d+)\/editar$/))) return await telaForm(Number(m[1]));
    if ((m = h.match(/^\/publis\/(\d+)$/))) return await telaDetalhe(Number(m[1]));
    if (h === '/financeiro') return await telaFinanceiro();
    if (h === '/conta') return telaConta();
    location.hash = '#/painel';
  } catch (e) {
    if (usuario) montar('', `<div class="alerta" role="alert">${esc(e.message)}</div><a class="btn" href="#/painel" style="align-self:flex-start">Voltar ao painel</a>`);
  }
}
window.addEventListener('hashchange', rotear);
rotear();
