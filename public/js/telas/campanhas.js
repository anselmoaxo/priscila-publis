import { api, casca, esc, icone, brl, quando, dataBR, trilha, selo, STATUS, ATIVOS, cabecalho, carregando, erroBloco, vazio, opcoes, nomeCampanha, plural, lista } from '../core.js';

const st = { grupo: 'ativas', busca: '', plataforma: '', marca: '' };
const GRUPOS = [
  ['ativas', 'Em andamento', (p) => ATIVOS.includes(p.status)],
  ['negociacao', 'Negociação', (p) => ['novo_contato', 'em_negociacao'].includes(p.status)],
  ['feitas', 'Publicadas e concluídas', (p) => ['publicado', 'concluido'].includes(p.status)],
  ['canceladas', 'Canceladas', (p) => p.status === 'cancelado'],
  ['todas', 'Todas', () => true],
];

export async function telaCampanhas() {
  const main = casca('campanhas');
  main.innerHTML = cabecalho({ titulo: 'Campanhas', acoes: `<a class="btn primario" href="#/campanhas/nova">${icone('novo', 18)}Nova campanha</a>` }) + carregando();
  let todas;
  try { todas = await api('publis'); } catch (e) { main.innerHTML += erroBloco(e.message); return; }
  if (!todas.length) {
    main.innerHTML = cabecalho({ titulo: 'Campanhas' }) + vazio({
      icone: 'campanhas', titulo: 'Nenhuma campanha ainda',
      texto: 'Cadastre a primeira para acompanhar briefing, entregas, prazos e pagamento num lugar só.',
      acao: `<a class="btn primario" href="#/campanhas/nova">${icone('novo', 18)}Cadastrar campanha</a>`,
    });
    return;
  }
  const plataformas = [...new Set(todas.flatMap((p) => lista(p.plataformas)))].filter(Boolean).sort();
  const marcas = [...new Set(todas.map((p) => p.marca))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  main.innerHTML = cabecalho({ titulo: 'Campanhas', acoes: `<a class="btn primario" href="#/campanhas/nova">${icone('novo', 18)}Nova campanha</a>` }) + `
    <div class="barra-busca">
      <div class="busca">${icone('busca', 18)}<label for="busca" class="sr">Buscar campanha</label>
        <input id="busca" type="search" placeholder="Buscar por campanha, marca ou produto" value="${esc(st.busca)}"></div>
      <select id="f-plat" aria-label="Plataforma"><option value="">Todas as plataformas</option>${opcoes(plataformas.map((x) => [x, x]), st.plataforma)}</select>
      <select id="f-marca" aria-label="Marca"><option value="">Todas as marcas</option>${opcoes(marcas.map((x) => [x, x]), st.marca)}</select>
    </div>
    <div class="abas-rolagem"><div class="pilulas" role="group" aria-label="Situação">${GRUPOS.map(([id, l, f]) =>
      `<button type="button" class="pilula" data-g="${id}" aria-pressed="${st.grupo === id}">${l} <span class="conta">${todas.filter(f).length}</span></button>`).join('')}</div></div>
    <div id="lista-camp" aria-live="polite"></div>`;

  const desenhar = () => {
    const [, , filtro] = GRUPOS.find((g) => g[0] === st.grupo);
    const b = st.busca.toLowerCase();
    const vis = todas.filter(filtro)
      .filter((p) => !st.plataforma || lista(p.plataformas).includes(st.plataforma))
      .filter((p) => !st.marca || p.marca === st.marca)
      .filter((p) => !b || [p.nome, p.marca, p.produto, p.agencia].filter(Boolean).join(' ').toLowerCase().includes(b));
    main.querySelector('#lista-camp').innerHTML = vis.length ? `<ul class="cards-camp">${vis.map(card).join('')}</ul>`
      : vazio({ icone: 'busca', titulo: 'Nenhuma campanha encontrada', texto: 'Mude a busca ou os filtros.' });
    main.querySelectorAll('[data-g]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.g === st.grupo)));
  };
  main.querySelectorAll('[data-g]').forEach((x) => { x.onclick = () => { st.grupo = x.dataset.g; desenhar(); }; });
  main.querySelector('#busca').oninput = (e) => { st.busca = e.target.value.trim(); desenhar(); };
  main.querySelector('#f-plat').onchange = (e) => { st.plataforma = e.target.value; desenhar(); };
  main.querySelector('#f-marca').onchange = (e) => { st.marca = e.target.value; desenhar(); };
  desenhar();
}

function card(p) {
  const atrasado = p.proximo_prazo && p.proximo_prazo < new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const valor = p.tipo_pagamento === 'permuta' ? `Permuta de ${brl(p.permuta_valor)}`
    : Number(p.valor_dinheiro) ? brl(p.valor_dinheiro) + (p.tipo_pagamento === 'misto' ? ' + permuta' : '') : 'Valor a combinar';
  return `<li><a class="card-camp" href="#/campanhas/${p.id}">
    <div class="card-camp-topo"><div><h3>${esc(nomeCampanha(p))}</h3><p class="muted">${esc(p.marca)}${p.produto ? `, ${esc(p.produto)}` : ''}</p></div>${selo(p.status)}</div>
    ${trilha(p.status, { rotulo: false })}
    <div class="card-camp-pe">
      <span class="plats">${lista(p.plataformas).map((x) => `<span class="tag">${esc(x)}</span>`).join('') || '<span class="muted">Sem entregas</span>'}</span>
      ${p.proximo_prazo ? `<span class="prazo${atrasado ? ' atrasado' : ''}">${icone('relogio', 15)}${atrasado ? 'Atrasado: ' : ''}${esc(quando(p.proximo_prazo))}</span>` : ''}
    </div>
    <div class="card-camp-valor"><span>${esc(valor)}</span>${p.entregas ? `<span class="muted">${p.publicadas}/${p.entregas} publicados</span>` : ''}</div>
  </a></li>`;
}

export const STATUS_OPCOES = STATUS.map((s) => [s.id, s.label]);
export { dataBR, plural };
