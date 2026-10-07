import { api, abrirModal, esc, icone, EVENTOS, brl, dataBR, quando, statusEntrega, toast, nomeCampanha } from './core.js';
import { modalTarefa } from './formularios.js';

export const tituloEvento = (e) => (e.origem === 'parcela' && e.valor ? `${e.titulo} (${brl(e.valor)})` : e.titulo);

export function chipEvento(e, { compacto = false } = {}) {
  const t = EVENTOS[e.tipo] || EVENTOS.tarefa;
  return `<button type="button" class="ev ev-${e.tipo}${e.concluido ? ' feito' : ''}" data-evento="${esc(e.id)}"
    aria-label="${esc(t.label)}: ${esc(tituloEvento(e))}${e.marca ? ', ' + esc(e.marca) : ''}${e.concluido ? ' (concluído)' : ''}">
    ${icone(t.icone, 14)}<span>${compacto ? esc(e.marca || e.titulo) : esc(e.marca ? `${e.marca}: ${e.titulo}` : e.titulo)}</span></button>`;
}

export function linhaEvento(e) {
  const t = EVENTOS[e.tipo] || EVENTOS.tarefa;
  return `<button type="button" class="linha-ev${e.concluido ? ' feito' : ''}" data-evento="${esc(e.id)}">
    <span class="ev-icone ev-${e.tipo}">${icone(t.icone, 18)}</span>
    <span class="linha-ev-texto"><b>${esc(tituloEvento(e))}</b>
      <small>${esc(t.label)}${e.marca ? ' para ' + esc(e.marca) : ''}${e.plataforma ? ' no ' + esc(e.plataforma) : ''}${e.hora ? ', às ' + esc(e.hora) : ''}</small></span>
    ${e.concluido ? '<span class="selo fase-feito">Feito</span>' : ''}
  </button>`;
}

// Liga cliques em [data-evento] dentro de `raiz` para abrir o detalhe.
export function ligarEventos(raiz, eventos, aoMudar) {
  // Replaces any previous handler (containers are reused between renders).
  if (raiz._evClique) raiz.removeEventListener('click', raiz._evClique);
  raiz._evClique = (ev) => {
    const b = ev.target.closest('[data-evento]');
    if (!b) return;
    const e = eventos.find((x) => x.id === b.dataset.evento);
    if (e) abrirEvento(e, aoMudar);
  };
  raiz.addEventListener('click', raiz._evClique);
}

export function abrirEvento(e, aoMudar) {
  const t = EVENTOS[e.tipo] || EVENTOS.tarefa;
  let acao = '';
  if (e.origem === 'entrega' && !e.concluido) acao = '<button type="button" class="btn primario" data-acao="publicar">Marcar como publicado</button>';
  if (e.origem === 'parcela') acao = `<button type="button" class="btn primario" data-acao="pagar">${e.concluido ? 'Desfazer recebimento' : 'Marcar como recebido'}</button>`;
  if (e.origem === 'tarefa') acao = `<button type="button" class="btn" data-acao="editar">Editar</button>
    <button type="button" class="btn primario" data-acao="concluir">${e.concluido ? 'Reabrir tarefa' : 'Marcar como feita'}</button>`;
  const status = e.origem === 'entrega' ? statusEntrega(e.status)
    : e.origem === 'parcela' ? (e.concluido ? 'Recebido' : 'Em aberto')
      : e.origem === 'tarefa' ? ({ pendente: 'A fazer', fazendo: 'Fazendo', feita: 'Feita' }[e.status] || '') : '';
  const m = abrirModal({
    titulo: tituloEvento(e), largura: 460,
    corpo: `<div class="ev-detalhe">
      <div class="ev-tipo ev-${e.tipo}">${icone(t.icone, 18)}${esc(t.label)}</div>
      <dl class="dl">
        <div><dt>Data</dt><dd>${dataBR(e.data)} (${esc(quando(e.data).toLowerCase())})${e.hora ? ', às ' + esc(e.hora) : ''}</dd></div>
        ${e.marca ? `<div><dt>Marca</dt><dd>${esc(e.marca)}</dd></div>` : ''}
        ${e.publi_id ? `<div><dt>Campanha</dt><dd>${esc(nomeCampanha(e))}</dd></div>` : ''}
        ${e.plataforma ? `<div><dt>Plataforma</dt><dd>${esc(e.plataforma)}</dd></div>` : ''}
        ${status ? `<div><dt>Status</dt><dd>${esc(status)}</dd></div>` : ''}
      </dl>
      <div class="acoes-form">${e.publi_id ? `<a class="btn" href="#/campanhas/${e.publi_id}" data-fechar>Abrir campanha</a>` : ''}${acao}</div>
    </div>`,
  });
  m.el.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    b.disabled = true;
    try {
      if (b.dataset.acao === 'publicar') { await api('acoes', { method: 'POST', body: { acao: 'entrega_status', id: e.origem_id, status: 'publicado' } }); toast('Marcado como publicado.'); }
      if (b.dataset.acao === 'pagar') { await api('acoes', { method: 'POST', body: { acao: 'parcela_pago', id: e.origem_id, pago: !e.concluido } }); toast(e.concluido ? 'Recebimento desfeito.' : 'Marcado como recebido.'); }
      if (b.dataset.acao === 'concluir') { await api('acoes', { method: 'POST', body: { acao: 'tarefa_status', id: e.origem_id, status: e.concluido ? 'pendente' : 'feita' } }); toast(e.concluido ? 'Tarefa reaberta.' : 'Tarefa concluída.'); }
      if (b.dataset.acao === 'editar') {
        const lista = await api('tarefas');
        const tarefa = lista.find((x) => x.id === e.origem_id);
        m.fechar();
        if (tarefa) modalTarefa({ tarefa, aoSalvar: aoMudar });
        return;
      }
      m.fechar(); aoMudar?.();
    } catch (err) { toast(err.message, 'erro'); b.disabled = false; }
  });
}
