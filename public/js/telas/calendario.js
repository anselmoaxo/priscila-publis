import { api, casca, esc, icone, hoje, isoDe, dataDe, somarDias, somarMeses, DIAS, DIAS_LONGOS, MESES_LONGOS, EVENTOS, cabecalho, carregando, erroBloco, vazio, abrirModal, opcoes, nomeCampanha, plural } from '../core.js';
import { chipEvento, linhaEvento, ligarEventos } from '../eventos.js';
import { modalTarefa } from '../formularios.js';

const st = { modo: null, data: null, filtros: { marca: '', campanha: '', plataforma: '', tipo: '', situacao: 'todos' } };

function intervalo() {
  const d = dataDe(st.data);
  if (st.modo === 'semana') {
    const ini = somarDias(st.data, -d.getDay());
    return { de: ini, ate: somarDias(ini, 6) };
  }
  const primeiro = isoDe(new Date(d.getFullYear(), d.getMonth(), 1));
  const ultimo = isoDe(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  if (st.modo === 'lista') return { de: primeiro, ate: ultimo };
  const ini = somarDias(primeiro, -dataDe(primeiro).getDay());
  const fim = somarDias(ultimo, 6 - dataDe(ultimo).getDay());
  return { de: ini, ate: fim };
}

function tituloPeriodo() {
  const d = dataDe(st.data);
  if (st.modo === 'semana') {
    const { de, ate } = intervalo();
    const a = dataDe(de), b = dataDe(ate);
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} a ${b.getDate()} de ${MESES_LONGOS[b.getMonth()]}`
      : `${a.getDate()} de ${MESES_LONGOS[a.getMonth()]} a ${b.getDate()} de ${MESES_LONGOS[b.getMonth()]}`;
  }
  return `${MESES_LONGOS[d.getMonth()]} de ${d.getFullYear()}`;
}

const nomeDia = (iso) => { const d = dataDe(iso); return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}`; };

export async function telaCalendario(params = {}) {
  if (!st.modo) st.modo = matchMedia('(max-width: 720px)').matches ? 'lista' : 'mes';
  if (params.modo && ['mes', 'semana', 'lista'].includes(params.modo)) st.modo = params.modo;
  if (params.data && /^\d{4}-\d{2}-\d{2}$/.test(params.data)) st.data = params.data;
  if (!st.data) st.data = hoje();
  const main = casca('calendario');
  main.innerHTML = cabecalho({
    titulo: 'Calendário',
    acoes: `<button type="button" class="btn primario" data-novo>${icone('novo', 18)}Novo compromisso</button>`,
  }) + `<div id="cal" class="cal-corpo">${carregando()}</div>`;
  main.querySelector('[data-novo]').onclick = () => modalTarefa({ prazo: st.data === hoje() ? hoje() : st.data, tipo: 'gravacao', aoSalvar: () => telaCalendario() });
  await desenhar(main);
}

async function desenhar(main) {
  const box = main.querySelector('#cal');
  const { de, ate } = intervalo();
  let eventos;
  try { eventos = (await api(`agenda?de=${de}&ate=${ate}`)).eventos; }
  catch (e) { box.innerHTML = erroBloco(e.message); return; }

  const uniq = (f) => [...new Set(eventos.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const camps = [...new Map(eventos.filter((e) => e.publi_id).map((e) => [e.publi_id, nomeCampanha(e)])).entries()];
  const f = st.filtros;
  const visiveis = eventos.filter((e) => (!f.marca || e.marca === f.marca)
    && (!f.campanha || String(e.publi_id) === f.campanha)
    && (!f.plataforma || e.plataforma === f.plataforma)
    && (!f.tipo || e.tipo === f.tipo)
    && (f.situacao === 'todos' || (f.situacao === 'pendentes' ? !e.concluido : e.concluido)));
  const ativosFiltros = ['marca', 'campanha', 'plataforma', 'tipo'].filter((x) => f[x]).length + (f.situacao !== 'todos' ? 1 : 0);
  const hj = hoje();

  let corpo = '';
  if (st.modo === 'mes') {
    const dias = [];
    for (let d = de; d <= ate; d = somarDias(d, 1)) dias.push(d);
    const mesAtual = dataDe(st.data).getMonth();
    corpo = `<div class="mes" role="grid" aria-label="${esc(tituloPeriodo())}">
      <div class="mes-cab" role="row">${DIAS.map((n) => `<span role="columnheader">${n}</span>`).join('')}</div>
      <div class="mes-grade">${dias.map((d) => {
        const evs = visiveis.filter((e) => e.data === d);
        const dd = dataDe(d);
        return `<div class="mes-dia${dd.getMonth() !== mesAtual ? ' fora' : ''}${d === hj ? ' hoje' : ''}" role="gridcell">
          <button type="button" class="mes-num" data-dia="${d}" aria-label="${esc(nomeDia(d))}: ${plural(evs.length, 'compromisso', 'compromissos')}">${dd.getDate()}</button>
          <div class="mes-evs">${evs.slice(0, 3).map((e) => chipEvento(e, { compacto: true })).join('')}
            ${evs.length > 3 ? `<button type="button" class="ev-mais" data-dia="${d}">mais ${evs.length - 3}</button>` : ''}</div>
          <div class="mes-pontos" aria-hidden="true">${evs.slice(0, 4).map((e) => `<i class="pt ev-${e.tipo}"></i>`).join('')}</div>
        </div>`;
      }).join('')}</div></div>`;
  } else if (st.modo === 'semana') {
    const dias = Array.from({ length: 7 }, (_, i) => somarDias(de, i));
    corpo = `<div class="semana-grade">${dias.map((d) => {
      const evs = visiveis.filter((e) => e.data === d);
      const dd = dataDe(d);
      return `<section class="sem-dia${d === hj ? ' hoje' : ''}" aria-label="${esc(nomeDia(d))}">
        <button type="button" class="sem-topo" data-dia="${d}"><span>${DIAS[dd.getDay()]}</span><b>${dd.getDate()}</b></button>
        <div class="sem-evs">${evs.map((e) => chipEvento(e)).join('') || '<span class="sem-vazio">Livre</span>'}</div>
      </section>`;
    }).join('')}</div>`;
  } else {
    const dias = [...new Set(visiveis.map((e) => e.data))];
    corpo = dias.length ? `<div class="agenda-lista">${dias.map((d) => `<section class="agenda-dia${d === hj ? ' hoje' : ''}${d < hj ? ' passado' : ''}">
        <h3>${d === hj ? 'Hoje, ' : ''}${esc(nomeDia(d))}</h3>
        <div class="lista-evs">${visiveis.filter((e) => e.data === d).map(linhaEvento).join('')}</div></section>`).join('')}</div>`
      : vazio({ icone: 'calendario', titulo: ativosFiltros ? 'Nada com esses filtros' : 'Nada marcado neste mês', texto: ativosFiltros ? 'Tente limpar os filtros.' : 'Use "Novo compromisso" para marcar uma gravação, entrega ou publicação.' });
  }

  box.innerHTML = `
    <div class="cal-barra">
      <div class="cal-nav">
        <button type="button" class="icone-btn" data-nav="-1" aria-label="Período anterior">${icone('voltar')}</button>
        <h2 class="cal-titulo">${esc(tituloPeriodo())}</h2>
        <button type="button" class="icone-btn" data-nav="1" aria-label="Próximo período">${icone('avancar')}</button>
        <button type="button" class="btn pequeno" data-hoje>Hoje</button>
      </div>
      <div class="segmentado" role="group" aria-label="Modo de visualização">
        ${[['mes', 'Mês'], ['semana', 'Semana'], ['lista', 'Lista']].map(([v, l]) => `<button type="button" data-modo="${v}" aria-pressed="${st.modo === v}">${l}</button>`).join('')}
      </div>
    </div>
    <details class="filtros"${ativosFiltros ? ' open' : ''}>
      <summary>Filtros${ativosFiltros ? ` (${ativosFiltros})` : ''}</summary>
      <div class="filtros-grade">
        <div class="campo"><label for="f-marca">Marca</label><select id="f-marca" data-f="marca"><option value="">Todas</option>${opcoes(uniq((e) => e.marca).map((x) => [x, x]), f.marca)}</select></div>
        <div class="campo"><label for="f-camp">Campanha</label><select id="f-camp" data-f="campanha"><option value="">Todas</option>${opcoes(camps, f.campanha)}</select></div>
        <div class="campo"><label for="f-plat">Plataforma</label><select id="f-plat" data-f="plataforma"><option value="">Todas</option>${opcoes(uniq((e) => e.plataforma).map((x) => [x, x]), f.plataforma)}</select></div>
        <div class="campo"><label for="f-tipo">Tipo</label><select id="f-tipo" data-f="tipo"><option value="">Todos</option>${opcoes(Object.entries(EVENTOS).map(([k, v]) => [k, v.label]), f.tipo)}</select></div>
        <div class="campo"><label for="f-sit">Situação</label><select id="f-sit" data-f="situacao">${opcoes([['todos', 'Todos'], ['pendentes', 'Pendentes'], ['feitos', 'Feitos']], f.situacao)}</select></div>
        ${ativosFiltros ? '<button type="button" class="btn pequeno" data-limpar>Limpar filtros</button>' : ''}
      </div>
    </details>
    <ul class="legenda" aria-label="Legenda">${Object.entries(EVENTOS).map(([k, v]) => `<li class="ev-${k}">${icone(v.icone, 14)}${v.label}</li>`).join('')}</ul>
    ${corpo}`;

  box.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => {
    const n = Number(b.dataset.nav);
    st.data = st.modo === 'semana' ? somarDias(st.data, 7 * n) : somarMeses(st.data.slice(0, 8) + '01', n);
    desenhar(main);
  }; });
  box.querySelector('[data-hoje]').onclick = () => { st.data = hoje(); desenhar(main); };
  box.querySelectorAll('[data-modo]').forEach((b) => { b.onclick = () => { st.modo = b.dataset.modo; desenhar(main); }; });
  box.querySelectorAll('[data-f]').forEach((s) => { s.onchange = () => { st.filtros[s.dataset.f] = s.value; desenhar(main); }; });
  box.querySelector('[data-limpar]')?.addEventListener('click', () => { st.filtros = { marca: '', campanha: '', plataforma: '', tipo: '', situacao: 'todos' }; desenhar(main); });
  box.querySelectorAll('[data-dia]').forEach((b) => { b.onclick = () => abrirDia(b.dataset.dia, visiveis, main); });
  ligarEventos(box, eventos, () => desenhar(main));
}

function abrirDia(dia, eventos, main) {
  const evs = eventos.filter((e) => e.data === dia);
  const m = abrirModal({
    titulo: nomeDia(dia).replace(/^./, (c) => c.toUpperCase()), largura: 480,
    corpo: `${evs.length ? `<div class="lista-evs">${evs.map(linhaEvento).join('')}</div>` : '<p class="muted">Nenhum compromisso neste dia.</p>'}
      <div class="acoes-form"><button type="button" class="btn primario" data-add>${icone('novo', 18)}Adicionar neste dia</button></div>`,
  });
  m.el.querySelector('[data-add]').onclick = () => { m.fechar(); modalTarefa({ prazo: dia, tipo: 'gravacao', aoSalvar: () => desenhar(main) }); };
  ligarEventos(m.el, evs, () => { m.fechar(); desenhar(main); });
}
