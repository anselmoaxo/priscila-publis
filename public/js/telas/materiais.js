import { api, casca, esc, icone, cabecalho, carregando, erroBloco, vazio, opcoes, toast, confirmar, TIPOS_MATERIAL, tipoMaterial, nomeCampanha, dataBR } from '../core.js';
import { modalMaterial } from '../formularios.js';

const st = { tipo: '', busca: '' };

export async function telaMateriais() {
  const main = casca('materiais');
  const acoes = `<button type="button" class="btn primario" data-novo>${icone('novo', 18)}Novo material</button>`;
  main.innerHTML = cabecalho({ titulo: 'Arquivos e materiais', acoes }) + carregando();
  let itens;
  try { itens = await api('materiais'); } catch (e) { main.innerHTML = cabecalho({ titulo: 'Arquivos e materiais', acoes }) + erroBloco(e.message); return; }
  main.innerHTML = cabecalho({ titulo: 'Arquivos e materiais', sub: 'Links para roteiros, referências, vídeos e contratos guardados no Drive, Dropbox ou Canva.', acoes })
    + (itens.length ? `<div class="barra-busca">
      <div class="busca">${icone('busca', 18)}<label for="busca" class="sr">Buscar</label><input id="busca" type="search" placeholder="Buscar material ou marca" value="${esc(st.busca)}"></div>
      <select id="f-tipo" aria-label="Tipo"><option value="">Todos os tipos</option>${opcoes(TIPOS_MATERIAL, st.tipo)}</select></div>
      <div id="lista" aria-live="polite"></div>`
      : vazio({ icone: 'arquivos', titulo: 'Nenhum material guardado', texto: 'Guarde aqui o link de cada arquivo importante e encontre tudo rápido quando a marca pedir.', acao: `<button type="button" class="btn primario" data-novo2>${icone('novo', 18)}Adicionar material</button>` }));
  const novo = () => modalMaterial({ aoSalvar: telaMateriais });
  main.querySelector('[data-novo]').onclick = novo;
  main.querySelector('[data-novo2]')?.addEventListener('click', novo);
  if (!itens.length) return;

  const desenhar = () => {
    const b = st.busca.toLowerCase();
    const vis = itens.filter((x) => (!st.tipo || x.tipo === st.tipo) && (!b || [x.titulo, x.marca, x.campanha_nome].filter(Boolean).join(' ').toLowerCase().includes(b)));
    const grupos = new Map();
    vis.forEach((x) => { const k = x.publi_id ? nomeCampanha({ nome: x.campanha_nome, marca: x.marca }) + (x.marca ? ` (${x.marca})` : '') : 'Sem campanha'; grupos.set(k, [...(grupos.get(k) || []), x]); });
    main.querySelector('#lista').innerHTML = vis.length ? [...grupos.entries()].map(([g, xs]) => `<section class="grupo-materiais"><h2>${esc(g)}</h2>
      <ul class="materiais">${xs.map((x) => `<li>
        <a class="material" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${icone('arquivos', 20)}
          <span><b>${esc(x.titulo)}</b><small>${esc(tipoMaterial(x.tipo))}, adicionado em ${dataBR(String(x.criado_em).slice(0, 10))}</small></span></a>
        <button type="button" class="icone-btn" data-edit="${x.id}" aria-label="Editar ${esc(x.titulo)}">${icone('editar', 16)}</button>
        <button type="button" class="icone-btn" data-del="${x.id}" aria-label="Excluir ${esc(x.titulo)}">${icone('lixo', 16)}</button>
      </li>`).join('')}</ul></section>`).join('') : vazio({ icone: 'busca', titulo: 'Nada encontrado', texto: 'Mude a busca ou o tipo.' });
    main.querySelectorAll('[data-edit]').forEach((b2) => { b2.onclick = () => modalMaterial({ material: itens.find((x) => x.id === +b2.dataset.edit), aoSalvar: telaMateriais }); });
    main.querySelectorAll('[data-del]').forEach((b2) => {
      b2.onclick = async () => {
        const x = itens.find((y) => y.id === +b2.dataset.del);
        if (!(await confirmar(`Excluir "${x.titulo}" da lista? O arquivo original continua onde está.`, { botao: 'Excluir', perigo: true }))) return;
        try { await api('materiais?id=' + x.id, { method: 'DELETE' }); toast('Material excluído.'); telaMateriais(); } catch (e) { toast(e.message, 'erro'); }
      };
    });
  };
  main.querySelector('#busca').oninput = (e) => { st.busca = e.target.value.trim(); desenhar(); };
  main.querySelector('#f-tipo').onchange = (e) => { st.tipo = e.target.value; desenhar(); };
  desenhar();
}
