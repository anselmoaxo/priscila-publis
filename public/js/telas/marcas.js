import { api, casca, esc, icone, brl, dataBR, selo, cabecalho, carregando, erroBloco, vazio, toast, confirmar, nomeCampanha, plural } from '../core.js';
import { modalMarca } from '../formularios.js';

let busca = '';

export async function telaMarcas() {
  const main = casca('marcas');
  const acoes = `<button type="button" class="btn primario" data-nova>${icone('novo', 18)}Nova marca ou contato</button>`;
  main.innerHTML = cabecalho({ titulo: 'Marcas e contatos', acoes }) + carregando();
  let marcas;
  try { marcas = await api('marcas'); } catch (e) { main.innerHTML = cabecalho({ titulo: 'Marcas e contatos', acoes }) + erroBloco(e.message); return; }
  main.innerHTML = cabecalho({ titulo: 'Marcas e contatos', sub: marcas.length ? plural(marcas.length, 'marca ou agência', 'marcas e agências') : '', acoes }) + (marcas.length ? `
    <div class="barra-busca"><div class="busca">${icone('busca', 18)}<label for="busca" class="sr">Buscar</label>
      <input id="busca" type="search" placeholder="Buscar por marca, pessoa ou e-mail" value="${esc(busca)}"></div></div>
    <div id="lista" aria-live="polite"></div>`
    : vazio({ icone: 'marcas', titulo: 'Nenhuma marca cadastrada', texto: 'As marcas das suas campanhas entram aqui automaticamente. Você também pode adicionar contatos antes de fechar uma parceria.', acao: `<button type="button" class="btn primario" data-nova2>${icone('novo', 18)}Adicionar marca</button>` }));
  const nova = () => modalMarca({ aoSalvar: (id) => { location.hash = '#/marcas/' + id; } });
  main.querySelector('[data-nova]').onclick = nova;
  main.querySelector('[data-nova2]')?.addEventListener('click', nova);
  if (!marcas.length) return;

  const desenhar = () => {
    const b = busca.toLowerCase();
    const vis = marcas.filter((m) => !b || [m.nome, m.contato_nome, m.email, m.instagram].filter(Boolean).join(' ').toLowerCase().includes(b));
    main.querySelector('#lista').innerHTML = vis.length ? `<ul class="cards-marca">${vis.map((m) => `<li><a class="card-marca" href="#/marcas/${m.id}">
        <span class="monograma" aria-hidden="true">${esc(m.nome.slice(0, 1).toUpperCase())}</span>
        <span class="card-marca-txt"><b>${esc(m.nome)}</b>
          <small>${m.tipo === 'agencia' ? 'Agência' : 'Marca'}${m.contato_nome ? `, fala com ${esc(m.contato_nome)}` : ''}</small>
          <small>${m.campanhas ? plural(m.campanhas, 'campanha', 'campanhas') + (m.ativas ? `, ${m.ativas} em andamento` : '') : 'Nenhuma campanha ainda'}</small></span>
      </a></li>`).join('')}</ul>` : vazio({ icone: 'busca', titulo: 'Nada encontrado', texto: 'Tente outro nome.' });
  };
  main.querySelector('#busca').oninput = (e) => { busca = e.target.value.trim(); desenhar(); };
  desenhar();
}

export async function telaMarca(id) {
  const main = casca('marcas');
  main.innerHTML = carregando();
  let m;
  try { m = await api('marcas?id=' + id); } catch (e) { main.innerHTML = erroBloco(e.message) + '<p><a class="btn" href="#/marcas">Voltar</a></p>'; return; }
  const zap = m.telefone ? m.telefone.replace(/\D/g, '').replace(/^55/, '') : '';
  main.innerHTML = cabecalho({
    titulo: esc(m.nome), voltar: { href: '#/marcas', label: 'Marcas e contatos' },
    sub: m.tipo === 'agencia' ? 'Agência' : 'Marca',
    acoes: `<button type="button" class="btn" data-editar>${icone('editar', 18)}Editar</button>
      <a class="btn primario" href="#/campanhas/nova">${icone('novo', 18)}Nova campanha</a>`,
  }) + `
  <div class="duas-colunas">
    <div class="col-principal">
      <section class="bloco">
        <div class="bloco-topo"><h2>Campanhas</h2></div>
        ${m.campanhas.length ? `<ul class="lista-camp-marca">${m.campanhas.map((p) => `<li><a href="#/campanhas/${p.id}">
          <span><b>${esc(nomeCampanha({ ...p, marca: m.nome }))}</b><small>${p.inicio ? 'desde ' + dataBR(p.inicio) : ''}</small></span>
          <span class="lcm-dir">${selo(p.status)}<small>${p.tipo_pagamento === 'permuta' ? 'Permuta' : brl(p.valor_dinheiro)}</small></span></a></li>`).join('')}</ul>`
          : '<p class="muted">Nenhuma campanha com essa marca ainda.</p>'}
      </section>
      <section class="bloco">
        <div class="bloco-topo"><h2>Observações e relacionamento</h2></div>
        ${m.observacoes ? `<div class="texto-longo">${esc(m.observacoes)}</div>` : '<p class="muted">Anote como o contato chegou, preferências da marca e combinados. Use "Editar".</p>'}
      </section>
    </div>
    <aside class="col-lateral">
      <section class="bloco">
        <div class="bloco-topo"><h2>Contato</h2></div>
        <ul class="contatos">
          ${m.contato_nome ? `<li>${icone('marcas', 16)}${esc(m.contato_nome)}</li>` : ''}
          ${m.email ? `<li>${icone('email', 16)}<a href="mailto:${esc(m.email)}">${esc(m.email)}</a></li>` : ''}
          ${m.telefone ? `<li>${icone('telefone', 16)}<a href="https://wa.me/55${esc(zap)}" target="_blank" rel="noopener noreferrer">${esc(m.telefone)}</a></li>` : ''}
          ${m.instagram ? `<li>${icone('instagram', 16)}<a href="https://instagram.com/${encodeURIComponent(m.instagram)}" target="_blank" rel="noopener noreferrer">@${esc(m.instagram)}</a></li>` : ''}
          ${m.site ? `<li>${icone('globo', 16)}<a href="${esc(m.site)}" target="_blank" rel="noopener noreferrer">${esc(m.site.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></li>` : ''}
        </ul>
        ${!m.contato_nome && !m.email && !m.telefone && !m.instagram && !m.site ? '<p class="muted">Sem dados de contato. Use "Editar" para adicionar.</p>' : ''}
        <p class="muted pequeno">${m.mostrar_portfolio ? 'Aparece no seu portfólio público.' : 'Não aparece no portfólio público.'}</p>
      </section>
      <button type="button" class="btn perigo largo" data-excluir>${icone('lixo', 18)}Excluir marca</button>
    </aside>
  </div>`;
  main.querySelector('[data-editar]').onclick = () => modalMarca({ marca: m, aoSalvar: () => telaMarca(id) });
  main.querySelector('[data-excluir]').onclick = async () => {
    if (!(await confirmar(`Excluir "${m.nome}" da sua lista de contatos?`, { titulo: 'Excluir marca', botao: 'Excluir', perigo: true }))) return;
    try { await api('marcas?id=' + id, { method: 'DELETE' }); toast('Marca excluída.'); location.hash = '#/marcas'; }
    catch (e) { toast(e.message, 'erro'); }
  };
}
