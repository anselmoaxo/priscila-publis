import { api, casca, esc, icone, brl, dataBR, quando, hoje, trilha, selo, STATUS, STATUS_ENTREGA, PLATAFORMAS, FORMATOS, TIPO_PAGAMENTO, cabecalho, carregando, erroBloco, vazio, opcoes, toast, confirmar, abrirModal, nomeCampanha, tipoTarefa, tipoMaterial, lista, limparCache, plural } from '../core.js';
import { modalTarefa, modalMaterial } from '../formularios.js';

const linkSeguro = (u) => (u && /^https?:\/\//i.test(u) ? u : null);

export async function telaCampanhaDetalhe(id) {
  const main = casca('campanhas');
  main.innerHTML = carregando();
  let p;
  try { p = await api('publis?id=' + id); } catch (e) { main.innerHTML = erroBloco(e.message) + '<p><a class="btn" href="#/campanhas">Voltar para campanhas</a></p>'; return; }
  const hj = hoje();
  const recarregar = () => telaCampanhaDetalhe(id);
  const links = lista(p.links);
  const m = p.marca_info;
  const total = p.parcelas.reduce((s, x) => s + Number(x.valor), 0);
  const recebido = p.parcelas.filter((x) => x.pago_em).reduce((s, x) => s + Number(x.valor), 0);
  const fechada = ['publicado', 'concluido', 'cancelado'].includes(p.status);

  // Próximo prazo: o primeiro compromisso pendente da campanha.
  const prazos = [
    ...p.entregas.filter((e) => e.status !== 'publicado' && e.data_postagem).map((e) => ({ data: e.data_postagem, txt: `Publicar ${e.quantidade} ${e.formato} no ${e.rede}` })),
    ...p.tarefas.filter((t) => t.status !== 'feita' && t.prazo).map((t) => ({ data: t.prazo, txt: t.titulo })),
    ...(!fechada && p.fim ? [{ data: p.fim, txt: 'Entrega para a marca' }] : []),
    ...(!fechada && p.data_publicacao ? [{ data: p.data_publicacao, txt: 'Publicação prevista' }] : []),
  ].sort((a, b) => a.data.localeCompare(b.data));
  const prox = prazos[0];

  const contatoMarca = m ? [
    m.contato_nome ? `<li>${icone('marcas', 16)}${esc(m.contato_nome)}</li>` : '',
    m.email ? `<li>${icone('email', 16)}<a href="mailto:${esc(m.email)}">${esc(m.email)}</a></li>` : '',
    m.telefone ? `<li>${icone('telefone', 16)}<a href="https://wa.me/55${esc(m.telefone.replace(/\D/g, '').replace(/^55/, ''))}" target="_blank" rel="noopener noreferrer">${esc(m.telefone)}</a></li>` : '',
    m.instagram ? `<li>${icone('instagram', 16)}<a href="https://instagram.com/${encodeURIComponent(m.instagram)}" target="_blank" rel="noopener noreferrer">@${esc(m.instagram)}</a></li>` : '',
    m.site ? `<li>${icone('globo', 16)}<a href="${esc(m.site)}" target="_blank" rel="noopener noreferrer">${esc(m.site.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></li>` : '',
  ].join('') : '';

  main.innerHTML = cabecalho({
    titulo: esc(nomeCampanha(p)),
    voltar: { href: '#/campanhas', label: 'Campanhas' },
    sub: `${m ? `<a href="#/marcas/${m.id}">${esc(p.marca)}</a>` : esc(p.marca)}${p.produto ? `, ${esc(p.produto)}` : ''}${p.agencia ? `, via ${esc(p.agencia)}` : ''}`,
    acoes: `<a class="btn" href="#/campanhas/${p.id}/editar">${icone('editar', 18)}Editar</a>
      <button type="button" class="btn" data-add-tarefa>${icone('novo', 18)}Tarefa</button>`,
  }) + `
  <section class="bloco status-bloco">
    <div class="status-linha">
      <div class="status-trilha">${trilha(p.status)}</div>
      <div class="campo status-select"><label for="mudar-status">Atualizar status</label>
        <select id="mudar-status">${opcoes(STATUS.map((s) => [s.id, s.label]), p.status)}</select></div>
    </div>
    ${prox ? `<div class="proximo${prox.data < hj ? ' atrasado' : ''}">${icone('relogio', 20)}
      <div><small>${prox.data < hj ? 'Prazo vencido' : 'Próximo prazo'}</small><b>${esc(prox.txt)}</b></div>
      <span class="proximo-data">${esc(quando(prox.data))}<small>${dataBR(prox.data)}</small></span></div>` : ''}
    <dl class="datas-camp">
      <div><dt>Início</dt><dd>${dataBR(p.inicio)}</dd></div>
      <div><dt>Entrega para a marca</dt><dd>${dataBR(p.fim)}</dd></div>
      <div><dt>Publicação prevista</dt><dd>${dataBR(p.data_publicacao)}</dd></div>
    </dl>
  </section>

  <div class="duas-colunas">
    <div class="col-principal">
      <section class="bloco">
        <div class="bloco-topo"><h2>Entregas</h2><button type="button" class="btn pequeno" data-add-entrega>${icone('novo', 16)}Adicionar entrega</button></div>
        ${p.entregas.length ? p.entregas.map((e) => {
          const idx = STATUS_ENTREGA.findIndex((s) => s.id === e.status);
          return `<div class="entrega">
            <div class="entrega-topo"><b>${e.quantidade} ${esc(e.formato)} no ${esc(e.rede)}</b><span class="muted">${e.data_postagem ? 'publicar ' + esc(quando(e.data_postagem).toLowerCase()) + ` (${dataBR(e.data_postagem)})` : 'sem data'}</span></div>
            <div class="passos" role="group" aria-label="Status da entrega">${STATUS_ENTREGA.map((s, j) =>
              `<button type="button" class="passo${j < idx ? ' feito' : ''}" aria-pressed="${j === idx}" data-entrega="${e.id}" data-status="${s.id}">${s.label}</button>`).join('')}</div>
          </div>`;
        }).join('') : vazio({ icone: 'megafone', titulo: 'Nenhuma entrega cadastrada', texto: 'Adicione o que vai ser publicado: plataforma, formato e data.' })}
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Tarefas</h2><button type="button" class="btn pequeno" data-add-tarefa>${icone('novo', 16)}Nova tarefa</button></div>
        ${p.tarefas.length ? `<ul class="tarefas">${p.tarefas.map((t) => linhaTarefa(t, hj)).join('')}</ul>`
          : '<p class="muted">Sem tarefas. Ex.: receber produto, gravar, enviar para aprovação.</p>'}
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Briefing</h2>${p.briefing ? '' : `<a class="btn pequeno" href="#/campanhas/${p.id}/editar">Adicionar briefing</a>`}</div>
        ${p.briefing ? `<div class="texto-longo">${esc(p.briefing)}</div>` : '<p class="muted">Nenhum briefing salvo ainda.</p>'}
        ${p.observacoes ? `<h3 class="sub-titulo">Observações</h3><div class="texto-longo">${esc(p.observacoes)}</div>` : ''}
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Histórico</h2></div>
        <form class="nova-nota" id="form-nota">
          <label for="nota" class="sr">Registrar atualização</label>
          <input id="nota" placeholder="Registrar uma atualização (ex.: marca pediu ajuste no roteiro)" maxlength="1000">
          <button type="submit" class="btn pequeno">Registrar</button>
        </form>
        ${p.historico.length ? `<ol class="linha-tempo">${p.historico.map((h) => `<li class="${h.tipo === 'nota' ? 'nota' : ''}">
          <span>${esc(h.texto)}</span><time datetime="${esc(h.criado_em)}">${esc(new Date(h.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }))}</time></li>`).join('')}</ol>`
          : '<p class="muted">As mudanças de status e pagamentos aparecem aqui.</p>'}
      </section>
    </div>

    <aside class="col-lateral">
      <section class="bloco">
        <div class="bloco-topo"><h2>Pagamento</h2><span class="selo fase-neutra">${esc(TIPO_PAGAMENTO[p.tipo_pagamento])}</span></div>
        ${p.tipo_pagamento !== 'permuta' ? (p.parcelas.length ? `<dl class="numeros mini">
            <div><dt>Combinado</dt><dd>${brl(total)}</dd></div><div><dt>Recebido</dt><dd>${brl(recebido)}</dd></div></dl>
          <ul class="parcelas">${p.parcelas.map((x) => {
            const atrasada = !x.pago_em && x.vencimento < hj;
            return `<li><div><b>${x.numero}/${p.parcelas.length}: ${brl(x.valor)}</b><small class="${atrasada ? 'txt-atraso' : ''}">${x.pago_em ? 'Recebido em ' + dataBR(x.pago_em) : (atrasada ? 'Venceu em ' : 'Vence em ') + dataBR(x.vencimento)}</small></div>
              <button type="button" class="btn pequeno${x.pago_em ? ' ok-btn' : ''}" data-parcela="${x.id}" data-pago="${x.pago_em ? '1' : ''}">${x.pago_em ? 'Recebido' : 'Marcar recebido'}</button></li>`;
          }).join('')}</ul>` : '<p class="muted">Valor ainda não combinado.</p>') : ''}
        ${p.tipo_pagamento !== 'dinheiro' ? `<div class="permuta-info"><b>Permuta</b><span>${esc(p.permuta_descricao) || 'Sem descrição'}</span>
          <small>Valor estimado ${brl(p.permuta_valor)}${p.permuta_recebida_em ? `, recebida em ${dataBR(p.permuta_recebida_em)}` : ''}</small>
          <button type="button" class="btn pequeno" data-permuta>${p.permuta_recebida_em ? 'Desfazer recebimento' : 'Marcar como recebida'}</button></div>` : ''}
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Arquivos e links</h2><button type="button" class="btn pequeno" data-add-material>${icone('novo', 16)}Material</button></div>
        <ul class="links">
          ${linkSeguro(p.contrato_url) ? `<li><a href="${esc(p.contrato_url)}" target="_blank" rel="noopener noreferrer">${icone('nota', 18)}<span>Contrato</span></a></li>` : ''}
          ${links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${icone('link', 18)}<span>${esc(l.titulo || l.url.replace(/^https?:\/\//, ''))}</span></a></li>`).join('')}
          ${p.materiais.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${icone('arquivos', 18)}<span>${esc(x.titulo)}<small>${esc(tipoMaterial(x.tipo))}</small></span></a></li>`).join('')}
        </ul>
        ${!links.length && !p.materiais.length && !linkSeguro(p.contrato_url) ? '<p class="muted">Guarde aqui links de roteiro, referências, vídeos e contrato.</p>' : ''}
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Contatos</h2>${m ? `<a class="link-forte" href="#/marcas/${m.id}">Ver marca</a>` : ''}</div>
        ${p.contato ? `<p><span class="muted">Responsável na campanha:</span><br>${esc(p.contato)}</p>` : ''}
        ${contatoMarca ? `<ul class="contatos">${contatoMarca}</ul>` : (p.contato ? '' : `<p class="muted">Sem contato cadastrado. ${m ? `<a href="#/marcas/${m.id}">Adicionar na marca</a>.` : ''}</p>`)}
      </section>

      <section class="bloco notas-privadas">
        <div class="bloco-topo"><h2>Notas privadas</h2><span class="muted">${icone('olho', 14)} só você vê</span></div>
        ${p.notas ? `<div class="texto-longo">${esc(p.notas)}</div>` : `<p class="muted">Nada anotado. <a href="#/campanhas/${p.id}/editar">Escrever nota</a></p>`}
      </section>

      <button type="button" class="btn perigo largo" data-excluir>${icone('lixo', 18)}Excluir campanha</button>
    </aside>
  </div>`;

  const acao = async (body, msgOk) => {
    try { await api('acoes', { method: 'POST', body }); if (msgOk) toast(msgOk); recarregar(); }
    catch (e) { toast(e.message, 'erro'); }
  };
  main.querySelector('#mudar-status').onchange = (e) => acao({ acao: 'campanha_status', id: p.id, status: e.target.value }, 'Status atualizado.');
  main.querySelectorAll('[data-entrega]').forEach((b) => { b.onclick = () => acao({ acao: 'entrega_status', id: +b.dataset.entrega, status: b.dataset.status }, 'Entrega atualizada.'); });
  main.querySelectorAll('[data-parcela]').forEach((b) => { b.onclick = () => acao({ acao: 'parcela_pago', id: +b.dataset.parcela, pago: !b.dataset.pago }, b.dataset.pago ? 'Recebimento desfeito.' : 'Parcela marcada como recebida.'); });
  main.querySelector('[data-permuta]')?.addEventListener('click', () => acao({ acao: 'permuta_recebida', id: p.id, recebida: !p.permuta_recebida_em }, p.permuta_recebida_em ? 'Recebimento desfeito.' : 'Permuta marcada como recebida.'));
  main.querySelectorAll('[data-tarefa-ok]').forEach((c) => { c.onchange = () => acao({ acao: 'tarefa_status', id: +c.dataset.tarefaOk, status: c.checked ? 'feita' : 'pendente' }, c.checked ? 'Tarefa concluída.' : 'Tarefa reaberta.'); });
  main.querySelectorAll('[data-tarefa-edit]').forEach((b) => { b.onclick = () => modalTarefa({ tarefa: p.tarefas.find((t) => t.id === +b.dataset.tarefaEdit), aoSalvar: recarregar }); });
  main.querySelectorAll('[data-add-tarefa]').forEach((b) => { b.onclick = () => modalTarefa({ publi_id: p.id, prazo: hj, aoSalvar: recarregar }); });
  main.querySelector('[data-add-material]').onclick = () => modalMaterial({ publi_id: p.id, aoSalvar: recarregar });
  main.querySelector('[data-add-entrega]').onclick = () => modalEntrega(p, recarregar);
  main.querySelector('#form-nota').onsubmit = async (e) => {
    e.preventDefault();
    const inp = main.querySelector('#nota');
    if (!inp.value.trim()) { inp.focus(); return; }
    await acao({ acao: 'nota', id: p.id, texto: inp.value }, 'Atualização registrada.');
  };
  main.querySelector('[data-excluir]').onclick = async () => {
    if (!(await confirmar(`Excluir "${nomeCampanha(p)}"? Entregas, parcelas, tarefas, materiais e histórico desta campanha também serão apagados.`, { titulo: 'Excluir campanha', botao: 'Excluir campanha', perigo: true }))) return;
    try { await api('publis?id=' + p.id, { method: 'DELETE' }); limparCache(); toast('Campanha excluída.'); location.hash = '#/campanhas'; }
    catch (e) { toast(e.message, 'erro'); }
  };
}

function linhaTarefa(t, hj) {
  const atrasada = t.status !== 'feita' && t.prazo && t.prazo < hj;
  return `<li class="tarefa${t.status === 'feita' ? ' feita' : ''}${atrasada ? ' atrasada' : ''}">
    <input type="checkbox" id="tk-${t.id}" data-tarefa-ok="${t.id}" ${t.status === 'feita' ? 'checked' : ''}>
    <label for="tk-${t.id}"><b>${esc(t.titulo)}</b><small>${esc(tipoTarefa(t.tipo))}${t.prazo ? `, ${atrasada ? 'venceu ' : ''}${esc(quando(t.prazo).toLowerCase())}` : ''}${t.prioridade === 'alta' ? ', prioridade alta' : ''}</small></label>
    <button type="button" class="icone-btn" data-tarefa-edit="${t.id}" aria-label="Editar tarefa ${esc(t.titulo)}">${icone('editar', 16)}</button>
  </li>`;
}

function modalEntrega(p, aoSalvar) {
  const m = abrirModal({
    titulo: 'Adicionar entrega', largura: 480,
    corpo: `<form class="form-col" novalidate><div data-msg></div>
      <div class="grade-2">
        <div class="campo"><label for="ne-rede">Plataforma</label><select id="ne-rede" name="rede">${opcoes(PLATAFORMAS.map((x) => [x, x]), 'Instagram')}</select></div>
        <div class="campo"><label for="ne-form">Formato</label><select id="ne-form" name="formato">${opcoes(FORMATOS.map((x) => [x, x]), 'Reels')}</select></div>
      </div>
      <div class="grade-2">
        <div class="campo"><label for="ne-qtd">Quantidade</label><input id="ne-qtd" name="quantidade" type="number" min="1" value="1"></div>
        <div class="campo"><label for="ne-data">Publicar em</label><input id="ne-data" name="data_postagem" type="date" value="${p.data_publicacao || ''}"></div>
      </div>
      <div class="acoes-form"><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn primario">Adicionar entrega</button></div></form>`,
  });
  const form = m.el.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const nova = { ...Object.fromEntries(new FormData(form)), status: 'combinado' };
    const body = { ...p, links: lista(p.links), entregas: [...p.entregas, nova], parcelas: p.parcelas.map((x) => ({ id: x.id, valor: x.valor, vencimento: x.vencimento })) };
    try { await api('publis?id=' + p.id, { method: 'PUT', body }); m.fechar(); toast('Entrega adicionada.'); aoSalvar(); }
    catch (err) { form.querySelector('[data-msg]').innerHTML = erroBloco(err.message); }
  };
}

export { selo, plural };
