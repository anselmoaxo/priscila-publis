import { api, casca, esc, icone, hoje, somarDias, quando, dataBR, cabecalho, carregando, erroBloco, vazio, opcoes, toast, tipoTarefa, nomeCampanha, statusEntrega, STATUS_ENTREGA, somarMeses } from '../core.js';
import { modalTarefa } from '../formularios.js';

const st = { aba: 'tarefas', campanha: '', prioridade: '', mostrarFeitas: false };

export async function telaTarefas() {
  const main = casca('tarefas');
  main.innerHTML = cabecalho({
    titulo: 'Entregas e tarefas',
    acoes: `<button type="button" class="btn primario" data-nova>${icone('novo', 18)}Nova tarefa</button>`,
  }) + `<div class="segmentado abas" role="tablist" aria-label="Visualização">
      <button type="button" role="tab" data-aba="tarefas" aria-selected="${st.aba === 'tarefas'}">Tarefas</button>
      <button type="button" role="tab" data-aba="conteudos" aria-selected="${st.aba === 'conteudos'}">Conteúdos a publicar</button>
    </div><div id="corpo">${carregando()}</div>`;
  main.querySelector('[data-nova]').onclick = () => modalTarefa({ prazo: hoje(), aoSalvar: telaTarefas });
  main.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => { st.aba = b.dataset.aba; telaTarefas(); }; });
  const corpo = main.querySelector('#corpo');
  try {
    if (st.aba === 'tarefas') await desenharTarefas(corpo);
    else await desenharConteudos(corpo);
  } catch (e) { corpo.innerHTML = erroBloco(e.message); }
}

async function desenharTarefas(corpo) {
  const todas = await api('tarefas');
  const hj = hoje(), em7 = somarDias(hj, 7);
  const camps = [...new Map(todas.filter((t) => t.publi_id).map((t) => [String(t.publi_id), nomeCampanha({ nome: t.campanha_nome, marca: t.marca })])).entries()];
  const filtradas = todas.filter((t) => (!st.campanha || (st.campanha === 'sem' ? !t.publi_id : String(t.publi_id) === st.campanha))
    && (!st.prioridade || t.prioridade === st.prioridade));
  const abertas = filtradas.filter((t) => t.status !== 'feita');
  const grupos = [
    ['Atrasadas', abertas.filter((t) => t.prazo && t.prazo < hj), 'atrasada'],
    ['Hoje', abertas.filter((t) => t.prazo === hj), 'hoje'],
    ['Próximos 7 dias', abertas.filter((t) => t.prazo > hj && t.prazo <= em7), ''],
    ['Mais adiante', abertas.filter((t) => t.prazo > em7), ''],
    ['Sem prazo', abertas.filter((t) => !t.prazo), ''],
  ].filter((g) => g[1].length);
  const feitas = filtradas.filter((t) => t.status === 'feita');

  if (!todas.length) {
    corpo.innerHTML = vazio({
      icone: 'tarefas', titulo: 'Nenhuma tarefa ainda',
      texto: 'Anote os passos de cada publi: receber produto, gravar, editar, enviar para aprovação, publicar.',
      acao: `<button type="button" class="btn primario" data-nova2>${icone('novo', 18)}Criar primeira tarefa</button>`,
    });
    corpo.querySelector('[data-nova2]').onclick = () => modalTarefa({ prazo: hoje(), aoSalvar: telaTarefas });
    return;
  }

  corpo.innerHTML = `
    <div class="barra-busca">
      <select id="f-camp" aria-label="Campanha"><option value="">Todas as campanhas</option><option value="sem"${st.campanha === 'sem' ? ' selected' : ''}>Sem campanha</option>${opcoes(camps, st.campanha)}</select>
      <select id="f-prio" aria-label="Prioridade"><option value="">Qualquer prioridade</option>${opcoes([['alta', 'Prioridade alta'], ['normal', 'Prioridade normal'], ['baixa', 'Prioridade baixa']], st.prioridade)}</select>
    </div>
    ${grupos.length ? grupos.map(([titulo, lst, cls]) => `<section class="grupo-tarefas ${cls}">
      <h2>${titulo} <span class="conta">${lst.length}</span></h2>
      <ul class="tarefas">${lst.map((t) => linha(t, hj)).join('')}</ul></section>`).join('')
      : `<p class="tudo-feito">${icone('aprovar', 22)}Tudo em dia por aqui.</p>`}
    ${feitas.length ? `<section class="grupo-tarefas feitas">
      <button type="button" class="link-forte" data-feitas aria-expanded="${st.mostrarFeitas}">${st.mostrarFeitas ? 'Esconder' : 'Mostrar'} concluídas (${feitas.length})</button>
      ${st.mostrarFeitas ? `<ul class="tarefas">${feitas.map((t) => linha(t, hj)).join('')}</ul>` : ''}</section>` : ''}`;

  corpo.querySelector('#f-camp').onchange = (e) => { st.campanha = e.target.value; desenharTarefas(corpo); };
  corpo.querySelector('#f-prio').onchange = (e) => { st.prioridade = e.target.value; desenharTarefas(corpo); };
  corpo.querySelector('[data-feitas]')?.addEventListener('click', () => { st.mostrarFeitas = !st.mostrarFeitas; desenharTarefas(corpo); });
  corpo.querySelectorAll('[data-ok]').forEach((c) => {
    c.onchange = async () => {
      try {
        await api('acoes', { method: 'POST', body: { acao: 'tarefa_status', id: +c.dataset.ok, status: c.checked ? 'feita' : 'pendente' } });
        toast(c.checked ? 'Tarefa concluída.' : 'Tarefa reaberta.');
        desenharTarefas(corpo);
      } catch (e) { toast(e.message, 'erro'); c.checked = !c.checked; }
    };
  });
  corpo.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => modalTarefa({ tarefa: todas.find((t) => t.id === +b.dataset.edit), aoSalvar: () => desenharTarefas(corpo) }); });
}

function linha(t, hj) {
  const atrasada = t.status !== 'feita' && t.prazo && t.prazo < hj;
  const breve = !atrasada && t.status !== 'feita' && t.prazo && t.prazo <= somarDias(hj, 2);
  return `<li class="tarefa${t.status === 'feita' ? ' feita' : ''}${atrasada ? ' atrasada' : ''}${breve ? ' breve' : ''}">
    <input type="checkbox" id="tk-${t.id}" data-ok="${t.id}" ${t.status === 'feita' ? 'checked' : ''}>
    <label for="tk-${t.id}"><b>${esc(t.titulo)}</b>
      <small>${esc(tipoTarefa(t.tipo))}${t.prazo ? `, ${esc(quando(t.prazo).toLowerCase())}${t.hora ? ' às ' + esc(t.hora) : ''}` : ''}${t.status === 'fazendo' ? ', em andamento' : ''}</small></label>
    <span class="tarefa-meta">${t.prioridade === 'alta' ? '<span class="selo fase-aprovacao">Alta</span>' : ''}
      ${t.publi_id ? `<a class="tag" href="#/campanhas/${t.publi_id}">${esc(t.marca || 'Campanha')}</a>` : ''}</span>
    <button type="button" class="icone-btn" data-edit="${t.id}" aria-label="Editar tarefa ${esc(t.titulo)}">${icone('editar', 16)}</button>
  </li>`;
}

async function desenharConteudos(corpo) {
  const hj = hoje();
  const { eventos } = await api(`agenda?de=${somarMeses(hj, -2)}&ate=${somarMeses(hj, 6)}`);
  const conteudos = eventos.filter((e) => e.origem === 'entrega');
  const pend = conteudos.filter((e) => !e.concluido);
  const feitos = conteudos.filter((e) => e.concluido).reverse().slice(0, 15);
  if (!conteudos.length) {
    corpo.innerHTML = vazio({ icone: 'megafone', titulo: 'Nenhum conteúdo com data', texto: 'As entregas das campanhas (Reels, Stories, vídeos) com data de publicação aparecem aqui.', acao: '<a class="btn" href="#/campanhas">Ir para campanhas</a>' });
    return;
  }
  const item = (e) => `<li class="conteudo-linha${!e.concluido && e.data < hj ? ' atrasada' : ''}">
    <div class="conteudo-data"><b>${e.data.slice(8, 10)}/${e.data.slice(5, 7)}</b><small>${esc(quando(e.data))}</small></div>
    <div class="conteudo-txt"><b>${esc(e.titulo)} no ${esc(e.plataforma)}</b><a href="#/campanhas/${e.publi_id}">${esc(e.marca)}${e.campanha ? ': ' + esc(e.campanha) : ''}</a></div>
    <label class="sr" for="cs-${e.origem_id}">Status</label>
    <select id="cs-${e.origem_id}" data-entrega="${e.origem_id}">${opcoes(STATUS_ENTREGA.map((s) => [s.id, s.label]), e.status)}</select>
  </li>`;
  corpo.innerHTML = `
    <section class="grupo-tarefas"><h2>A publicar <span class="conta">${pend.length}</span></h2>
      ${pend.length ? `<ul class="conteudos">${pend.map(item).join('')}</ul>` : `<p class="tudo-feito">${icone('aprovar', 22)}Tudo publicado.</p>`}</section>
    ${feitos.length ? `<section class="grupo-tarefas feitas"><h2>Publicados recentemente</h2><ul class="conteudos">${feitos.map(item).join('')}</ul></section>` : ''}`;
  corpo.querySelectorAll('[data-entrega]').forEach((s) => {
    s.onchange = async () => {
      try { await api('acoes', { method: 'POST', body: { acao: 'entrega_status', id: +s.dataset.entrega, status: s.value } }); toast(`Status: ${statusEntrega(s.value)}.`); desenharConteudos(corpo); }
      catch (e) { toast(e.message, 'erro'); }
    };
  });
}

export { dataBR };
