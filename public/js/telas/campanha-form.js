import { api, casca, esc, icone, brl, hoje, somarMeses, paraNumero, moedaInput, opcoes, cabecalho, carregando, erroBloco, toast, STATUS, STATUS_ENTREGA, PLATAFORMAS, FORMATOS, lista, limparCache } from '../core.js';

export async function telaCampanhaForm(id) {
  const main = casca('campanhas');
  main.innerHTML = carregando();
  let p, marcas = [];
  try {
    [p, marcas] = await Promise.all([
      id ? api('publis?id=' + id) : Promise.resolve(null),
      api('marcas').catch(() => []),
    ]);
  } catch (e) { main.innerHTML = erroBloco(e.message); return; }
  p = p || {
    nome: '', marca: '', produto: '', agencia: '', contato: '', contrato_url: '', status: 'briefing_recebido',
    inicio: hoje(), fim: '', data_publicacao: '', briefing: '', notas: '', links: [], observacoes: '',
    tipo_pagamento: 'dinheiro', forma_pagamento: 'Pix', permuta_descricao: '', permuta_valor: 0, permuta_recebida_em: '',
    entregas: [{ rede: 'Instagram', formato: 'Reels', quantidade: 1, data_postagem: '', status: 'combinado' }], parcelas: [],
  };
  const st = {
    tipo: p.tipo_pagamento,
    entregas: p.entregas.map((e) => ({ ...e })),
    parcelas: p.parcelas.map((x) => ({ ...x })),
    links: lista(p.links).map((l) => ({ ...l })),
  };
  const volta = id ? '#/campanhas/' + id : '#/campanhas';
  const opts = (arr, atual) => opcoes((arr.includes(atual) || !atual ? arr : [atual, ...arr]).map((x) => [x, x]), atual);

  main.innerHTML = cabecalho({ titulo: id ? 'Editar campanha' : 'Nova campanha', voltar: { href: volta, label: id ? 'Campanha' : 'Campanhas' } }) + `
  <form id="form" class="form-camp" novalidate>
    <section class="bloco">
      <h2>Sobre a campanha</h2>
      <div class="grade">
        <div class="campo"><label for="marca">Marca <span class="obrig">obrigatório</span></label>
          <input id="marca" list="lista-marcas" required value="${esc(p.marca)}" placeholder="Nome da marca" autocomplete="off">
          <datalist id="lista-marcas">${marcas.map((m) => `<option value="${esc(m.nome)}">`).join('')}</datalist></div>
        <div class="campo"><label for="nome">Nome da campanha</label><input id="nome" value="${esc(p.nome)}" placeholder="Ex.: Lançamento linha verão"></div>
        <div class="campo"><label for="produto">Produto ou serviço</label><input id="produto" value="${esc(p.produto)}"></div>
        <div class="campo"><label for="agencia">Agência (se houver)</label><input id="agencia" value="${esc(p.agencia)}"></div>
        <div class="campo"><label for="contato">Responsável pelo contato</label><input id="contato" value="${esc(p.contato)}" placeholder="Nome, e-mail ou WhatsApp"></div>
        <div class="campo"><label for="status">Status</label><select id="status">${opcoes(STATUS.map((s) => [s.id, s.label]), p.status)}</select></div>
      </div>
    </section>

    <section class="bloco">
      <h2>Datas</h2>
      <div class="grade">
        <div class="campo"><label for="inicio">Início</label><input id="inicio" type="date" value="${p.inicio || ''}"></div>
        <div class="campo"><label for="fim">Entrega para a marca</label><input id="fim" type="date" value="${p.fim || ''}"></div>
        <div class="campo"><label for="data_publicacao">Publicação prevista</label><input id="data_publicacao" type="date" value="${p.data_publicacao || ''}"></div>
      </div>
    </section>

    <section class="bloco">
      <div class="bloco-topo"><h2>Entregas</h2><span class="muted">o que vai ser publicado, onde e quando</span></div>
      <div id="entregas" class="pilha"></div>
      <button type="button" class="btn tracejado" id="add-entrega">${icone('novo', 18)}Adicionar entrega</button>
    </section>

    <section class="bloco">
      <h2>Briefing e orientações da marca</h2>
      <div class="campo"><label for="briefing" class="sr">Briefing</label>
        <textarea id="briefing" rows="7" placeholder="Cole aqui o briefing: mensagens-chave, o que pode e o que não pode, hashtags, @ da marca, cupom…">${esc(p.briefing)}</textarea></div>
    </section>

    <section class="bloco">
      <h2>Links importantes</h2>
      <div class="campo"><label for="contrato_url">Contrato</label><input id="contrato_url" inputmode="url" value="${esc(p.contrato_url)}" placeholder="https://"></div>
      <div id="links" class="pilha"></div>
      <button type="button" class="btn tracejado" id="add-link">${icone('link', 18)}Adicionar link</button>
    </section>

    <section class="bloco">
      <h2>Pagamento</h2>
      <div class="segmentado" role="group" aria-label="Forma de pagamento">
        <button type="button" data-tipo="dinheiro">Dinheiro</button>
        <button type="button" data-tipo="permuta">Permuta / brinde</button>
        <button type="button" data-tipo="misto">Dinheiro + permuta</button>
      </div>
      <div id="sec-dinheiro" class="pilha">
        <div class="grade grade-4">
          <div class="campo"><label for="g-valor">Valor combinado</label><input id="g-valor" inputmode="decimal" placeholder="0,00" value="${moedaInput(p.parcelas.reduce((s, x) => s + Number(x.valor), 0))}"></div>
          <div class="campo"><label for="g-n">Parcelas</label><select id="g-n">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${i + 1 === (p.parcelas.length || 1) ? ' selected' : ''}>${i + 1}x</option>`).join('')}</select></div>
          <div class="campo"><label for="g-venc">1º vencimento</label><input id="g-venc" type="date" value="${p.parcelas[0]?.vencimento || ''}"></div>
          <div class="campo"><label for="forma_pagamento">Forma</label><select id="forma_pagamento">${opts(['Pix', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro'], p.forma_pagamento || 'Pix')}</select></div>
        </div>
        <button type="button" class="btn pequeno" id="gerar">Gerar parcelas</button>
        <div id="parcelas" class="parcelas-caixa"></div>
      </div>
      <div id="sec-permuta" class="grade permuta-caixa">
        <div class="campo"><label for="permuta_descricao">O que vai receber</label><input id="permuta_descricao" value="${esc(p.permuta_descricao)}" placeholder="Ex.: kit com 3 produtos"></div>
        <div class="campo"><label for="permuta_valor">Valor estimado</label><input id="permuta_valor" inputmode="decimal" value="${moedaInput(p.permuta_valor)}" placeholder="0,00"></div>
        <div class="campo"><label for="permuta_recebida_em">Recebido em</label><input id="permuta_recebida_em" type="date" value="${p.permuta_recebida_em || ''}"></div>
      </div>
    </section>

    <section class="bloco">
      <h2>Anotações</h2>
      <div class="grade grade-2c">
        <div class="campo"><label for="observacoes">Observações</label><textarea id="observacoes" rows="4" placeholder="Combinados gerais da campanha">${esc(p.observacoes)}</textarea></div>
        <div class="campo"><label for="notas">Notas privadas ${icone('olho', 14)}<span class="muted" style="font-weight:400">só você vê</span></label>
          <textarea id="notas" rows="4" placeholder="Impressões, o que negociar na próxima…">${esc(p.notas)}</textarea></div>
      </div>
    </section>

    <div id="msg"></div>
    <div class="acoes-form fixas">
      <a class="btn" href="${volta}">Cancelar</a>
      <button type="submit" class="btn primario">${id ? 'Salvar alterações' : 'Salvar campanha'}</button>
    </div>
  </form>`;

  const $ = (s) => main.querySelector(s);
  const renderEntregas = () => {
    $('#entregas').innerHTML = st.entregas.map((e, i) => `
      <fieldset class="linha-entrega" data-i="${i}"><legend class="sr">Entrega ${i + 1}</legend>
        <div class="campo"><label for="e-rede-${i}">Plataforma</label><select id="e-rede-${i}" data-k="rede">${opts(PLATAFORMAS, e.rede)}</select></div>
        <div class="campo"><label for="e-form-${i}">Formato</label><select id="e-form-${i}" data-k="formato">${opts(FORMATOS, e.formato)}</select></div>
        <div class="campo estreito"><label for="e-qtd-${i}">Qtd.</label><input id="e-qtd-${i}" data-k="quantidade" type="number" min="1" value="${e.quantidade}"></div>
        <div class="campo"><label for="e-data-${i}">Publicar em</label><input id="e-data-${i}" data-k="data_postagem" type="date" value="${e.data_postagem || ''}"></div>
        <div class="campo"><label for="e-st-${i}">Status</label><select id="e-st-${i}" data-k="status">${opcoes(STATUS_ENTREGA.map((s) => [s.id, s.label]), e.status)}</select></div>
        <button type="button" class="icone-btn remover" data-rm-entrega="${i}" aria-label="Remover entrega ${i + 1}">${icone('lixo', 18)}</button>
      </fieldset>`).join('') || '<p class="muted">Nenhuma entrega ainda.</p>';
  };
  const renderLinks = () => {
    $('#links').innerHTML = st.links.map((l, i) => `<div class="linha-link" data-li="${i}">
        <div class="campo"><label for="l-t-${i}">Nome do link</label><input id="l-t-${i}" data-lk="titulo" value="${esc(l.titulo)}" placeholder="Ex.: Pasta no Drive"></div>
        <div class="campo"><label for="l-u-${i}">Endereço</label><input id="l-u-${i}" data-lk="url" inputmode="url" value="${esc(l.url)}" placeholder="https://"></div>
        <button type="button" class="icone-btn remover" data-rm-link="${i}" aria-label="Remover link ${i + 1}">${icone('lixo', 18)}</button></div>`).join('');
  };
  const renderParcelas = () => {
    const total = st.parcelas.reduce((s, x) => s + paraNumero(x.valor), 0);
    $('#parcelas').innerHTML = st.parcelas.length ? st.parcelas.map((x, i) => `
      <div class="linha-parcela" data-pi="${i}">
        <span class="lp-nome">Parcela ${i + 1}${x.pago_em ? ' <span class="selo fase-feito">Paga</span>' : ''}</span>
        <div class="campo"><label for="pv-${i}" class="sr">Vencimento da parcela ${i + 1}</label><input id="pv-${i}" type="date" data-pk="vencimento" value="${x.vencimento || ''}"></div>
        <div class="campo"><label for="pr-${i}" class="sr">Valor da parcela ${i + 1}</label><input id="pr-${i}" inputmode="decimal" data-pk="valor" value="${moedaInput(paraNumero(x.valor))}"></div>
        <button type="button" class="icone-btn remover" data-rm-parcela="${i}" aria-label="Remover parcela ${i + 1}">${icone('lixo', 18)}</button>
      </div>`).join('') + `<div class="total-linha"><span>Total em dinheiro</span><b id="total-parcelas">${brl(total)}</b></div>`
      : '<p class="muted">Informe o valor e toque em "Gerar parcelas". Em negociação, pode deixar em branco.</p>';
  };
  const renderTipo = () => {
    main.querySelectorAll('[data-tipo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === st.tipo)));
    $('#sec-dinheiro').classList.toggle('hidden', st.tipo === 'permuta');
    $('#sec-permuta').classList.toggle('hidden', st.tipo === 'dinheiro');
  };
  renderEntregas(); renderLinks(); renderParcelas(); renderTipo();

  main.querySelectorAll('[data-tipo]').forEach((b) => { b.onclick = () => { st.tipo = b.dataset.tipo; renderTipo(); }; });
  $('#add-entrega').onclick = () => {
    const u = st.entregas[st.entregas.length - 1];
    st.entregas.push({ rede: u?.rede || 'Instagram', formato: 'Stories', quantidade: 1, data_postagem: u?.data_postagem || '', status: 'combinado' });
    renderEntregas();
    $(`#e-rede-${st.entregas.length - 1}`).focus();
  };
  $('#add-link').onclick = () => { st.links.push({ titulo: '', url: '' }); renderLinks(); $(`#l-t-${st.links.length - 1}`).focus(); };
  $('#entregas').addEventListener('input', (ev) => { const k = ev.target.dataset.k, box = ev.target.closest('[data-i]'); if (k && box) st.entregas[+box.dataset.i][k] = ev.target.value; });
  $('#entregas').addEventListener('click', (ev) => { const b = ev.target.closest('[data-rm-entrega]'); if (b) { st.entregas.splice(+b.dataset.rmEntrega, 1); renderEntregas(); } });
  $('#links').addEventListener('input', (ev) => { const k = ev.target.dataset.lk, box = ev.target.closest('[data-li]'); if (k && box) st.links[+box.dataset.li][k] = ev.target.value; });
  $('#links').addEventListener('click', (ev) => { const b = ev.target.closest('[data-rm-link]'); if (b) { st.links.splice(+b.dataset.rmLink, 1); renderLinks(); } });
  $('#gerar').onclick = () => {
    const total = paraNumero($('#g-valor').value);
    const n = Number($('#g-n').value);
    const venc = $('#g-venc').value || $('#fim').value || hoje();
    if (total <= 0) { toast('Informe o valor combinado.', 'erro'); $('#g-valor').focus(); return; }
    const cents = Math.round(total * 100), base = Math.floor(cents / n), antigas = st.parcelas;
    st.parcelas = Array.from({ length: n }, (_, i) => ({ id: antigas[i]?.id, pago_em: antigas[i]?.pago_em, valor: (i === n - 1 ? cents - base * (n - 1) : base) / 100, vencimento: somarMeses(venc, i) }));
    renderParcelas();
  };
  $('#parcelas').addEventListener('input', (ev) => {
    const k = ev.target.dataset.pk, row = ev.target.closest('[data-pi]');
    if (!k || !row) return;
    st.parcelas[+row.dataset.pi][k] = ev.target.value;
    if (k === 'valor') $('#total-parcelas').textContent = brl(st.parcelas.reduce((s, x) => s + paraNumero(x.valor), 0));
  });
  $('#parcelas').addEventListener('click', (ev) => { const b = ev.target.closest('[data-rm-parcela]'); if (b) { st.parcelas.splice(+b.dataset.rmParcela, 1); renderParcelas(); } });

  $('#form').onsubmit = async (ev) => {
    ev.preventDefault();
    const v = (k) => $('#' + k).value;
    const msg = $('#msg');
    if (!v('marca').trim()) { msg.innerHTML = erroBloco('Informe a marca.'); $('#marca').focus(); return; }
    if (st.tipo !== 'permuta' && !st.parcelas.length && paraNumero(v('g-valor')) > 0) $('#gerar').click();
    const btn = ev.target.querySelector('[type=submit]');
    const body = {
      nome: v('nome'), marca: v('marca'), produto: v('produto'), agencia: v('agencia'), contato: v('contato'), status: v('status'),
      inicio: v('inicio'), fim: v('fim'), data_publicacao: v('data_publicacao'), briefing: v('briefing'), contrato_url: v('contrato_url'),
      links: st.links.filter((l) => l.url.trim()), tipo_pagamento: st.tipo, forma_pagamento: v('forma_pagamento'),
      permuta_descricao: v('permuta_descricao'), permuta_valor: paraNumero(v('permuta_valor')), permuta_recebida_em: v('permuta_recebida_em'),
      observacoes: v('observacoes'), notas: v('notas'),
      entregas: st.entregas.map((e) => ({ id: e.id, rede: e.rede, formato: e.formato, quantidade: Number(e.quantidade) || 1, data_postagem: e.data_postagem, status: e.status })),
      parcelas: st.parcelas.map((x) => ({ id: x.id, valor: paraNumero(x.valor), vencimento: x.vencimento })),
    };
    btn.disabled = true; msg.innerHTML = '';
    try {
      const r = await api(id ? 'publis?id=' + id : 'publis', { method: id ? 'PUT' : 'POST', body });
      limparCache();
      toast(id ? 'Alterações salvas.' : 'Campanha salva.');
      location.hash = '#/campanhas/' + r.id;
    } catch (e) {
      msg.innerHTML = erroBloco(e.message);
      msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.disabled = false;
    }
  };
}
