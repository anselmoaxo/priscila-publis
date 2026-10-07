import { api, casca, esc, icone, brl, dataBR, hoje, somarMeses, MESES, statusInfo, STATUS, cabecalho, carregando, erroBloco, vazio, opcoes, toast } from '../core.js';

const st = { ano: Number(hoje().slice(0, 4)), periodo: 'mes', filtro: 'todas' };

function abas(ativa) {
  return `<div class="segmentado abas" role="tablist" aria-label="Relatórios">
    <a role="tab" href="#/relatorios" aria-selected="${ativa === 'resumo'}">Resumo do ano</a>
    <a role="tab" href="#/relatorios/receber" aria-selected="${ativa === 'receber'}">Contas a receber</a></div>`;
}

export async function telaRelatorios() {
  const main = casca('relatorios');
  main.innerHTML = cabecalho({ titulo: 'Relatórios' }) + abas('resumo') + carregando();
  let r;
  try { r = await api('relatorios?ano=' + st.ano); } catch (e) { main.innerHTML = cabecalho({ titulo: 'Relatórios' }) + abas('resumo') + erroBloco(e.message); return; }
  const t = r.totais;
  const max = Math.max(1, ...r.meses.map((m) => Math.max(Number(m.previsto), Number(m.recebido), Number(m.permutas))));
  const anoAtual = Number(hoje().slice(0, 4));
  const anos = [anoAtual + 1, anoAtual, anoAtual - 1, anoAtual - 2].map((a) => [a, String(a)]);
  const totalStatus = r.status.reduce((s, x) => s + x.qtd, 0);
  const maxPlat = Math.max(1, ...r.plataformas.map((p) => p.conteudos));

  main.innerHTML = cabecalho({
    titulo: 'Relatórios',
    acoes: `<label for="ano" class="sr">Ano</label><select id="ano" class="entrada-pilula">${opcoes(anos, st.ano)}</select>`,
  }) + abas('resumo') + `
  <dl class="numeros grandes">
    <div><dt>Recebido em ${r.ano}</dt><dd>${brl(t.recebido)}</dd></div>
    <div><dt>Previsto no ano</dt><dd>${brl(t.previsto)}</dd><small>soma das parcelas com vencimento em ${r.ano}</small></div>
    <div><dt>Permutas</dt><dd>${brl(t.permutas)}</dd><small>valor estimado, fora do dinheiro</small></div>
    <div><dt>Campanhas</dt><dd>${t.campanhas}</dd><small>sem contar canceladas</small></div>
  </dl>

  <section class="bloco">
    <div class="bloco-topo"><h2>Mês a mês</h2>
      <ul class="legenda-barras" aria-hidden="true"><li class="lb-prev">Previsto</li><li class="lb-rec">Recebido</li><li class="lb-perm">Permutas</li></ul></div>
    <div class="barras" aria-hidden="true">${r.meses.map((m) => `<div class="barra-mes" title="${MESES[m.mes - 1]}: previsto ${brl(m.previsto)}, recebido ${brl(m.recebido)}, permutas ${brl(m.permutas)}">
      <div class="barra-pilha">
        <span class="b-prev" style="height:${(Number(m.previsto) / max) * 100}%"></span>
        <span class="b-rec" style="height:${(Number(m.recebido) / max) * 100}%"></span>
        <span class="b-perm" style="height:${(Number(m.permutas) / max) * 100}%"></span>
      </div><small>${MESES[m.mes - 1]}</small></div>`).join('')}</div>
    <details class="tabela-detalhe"><summary>Ver valores em tabela</summary>
      <div class="rolagem"><table class="tabela"><thead><tr><th>Mês</th><th class="dir">Previsto</th><th class="dir">Recebido</th><th class="dir">Permutas</th><th class="dir">Campanhas</th></tr></thead>
      <tbody>${r.meses.map((m) => `<tr><td data-l="Mês">${MESES[m.mes - 1]}</td><td class="dir" data-l="Previsto">${brl(m.previsto)}</td><td class="dir" data-l="Recebido">${brl(m.recebido)}</td><td class="dir" data-l="Permutas">${brl(m.permutas)}</td><td class="dir" data-l="Campanhas">${m.campanhas}</td></tr>`).join('')}</tbody></table></div>
    </details>
  </section>

  <div class="duas-colunas">
    <section class="bloco col-principal">
      <div class="bloco-topo"><h2>Por marca</h2></div>
      ${r.marcas.length ? `<div class="rolagem"><table class="tabela cartoes-movel"><thead><tr><th>Marca</th><th class="dir">Campanhas</th><th class="dir">Dinheiro</th><th class="dir">Permutas</th></tr></thead>
        <tbody>${r.marcas.map((m) => `<tr><td data-l="Marca"><b>${esc(m.marca)}</b></td><td class="dir" data-l="Campanhas">${m.campanhas}</td><td class="dir" data-l="Dinheiro">${brl(m.dinheiro)}</td><td class="dir" data-l="Permutas">${brl(m.permutas)}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">Sem campanhas neste ano.</p>'}
    </section>
    <div class="col-lateral">
      <section class="bloco">
        <div class="bloco-topo"><h2>Conteúdos por plataforma</h2></div>
        ${r.plataformas.length ? `<ul class="barras-h">${r.plataformas.map((p) => `<li><span class="bh-rot">${esc(p.plataforma)}</span>
          <span class="bh-trilho"><span style="width:${(p.conteudos / maxPlat) * 100}%"></span></span><span class="bh-num">${p.publicados || 0}/${p.conteudos}</span></li>`).join('')}</ul>
          <p class="muted pequeno">publicados / combinados</p>` : '<p class="muted">Sem entregas neste ano.</p>'}
      </section>
      <section class="bloco">
        <div class="bloco-topo"><h2>Campanhas por etapa</h2></div>
        ${totalStatus ? `<ul class="status-contagem">${STATUS.filter((s) => r.status.find((x) => x.status === s.id)).map((s) => {
          const q = r.status.find((x) => x.status === s.id).qtd;
          return `<li><span class="selo fase-${statusInfo(s.id).fase}">${s.label}</span><b>${q}</b></li>`;
        }).join('')}</ul>` : '<p class="muted">Sem campanhas neste ano.</p>'}
      </section>
    </div>
  </div>`;
  main.querySelector('#ano').onchange = (e) => { st.ano = Number(e.target.value); telaRelatorios(); };
}

function intervalo(per) {
  const h = hoje(), y = Number(h.slice(0, 4)), m = Number(h.slice(5, 7));
  const fimMes = (iso) => { const [yy, mm] = iso.split('-').map(Number); return `${yy}-${String(mm).padStart(2, '0')}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}`; };
  const ini = `${y}-${String(m).padStart(2, '0')}-01`;
  if (per === 'mes') return { de: ini, ate: fimMes(ini) };
  if (per === 'proximo') { const d = somarMeses(ini, 1); return { de: d, ate: fimMes(d) }; }
  if (per === 'anterior') { const d = somarMeses(ini, -1); return { de: d, ate: fimMes(d) }; }
  if (per === 'ano') return { de: `${y}-01-01`, ate: `${y}-12-31` };
  return { de: '', ate: '' };
}
const SITUACAO = { pago: ['Pago', 'feito'], aberto: ['Em aberto', 'pronto'], atrasado: ['Atrasado', 'atraso'], permuta_recebida: ['Permuta recebida', 'aprovacao'], permuta_pendente: ['Permuta a receber', 'neutra'] };

export async function telaReceber() {
  const main = casca('relatorios');
  main.innerHTML = cabecalho({ titulo: 'Relatórios' }) + abas('receber') + carregando();
  const { de, ate } = intervalo(st.periodo);
  let d;
  try { d = await api(`financeiro?de=${de}&ate=${ate}`); } catch (e) { main.innerHTML = cabecalho({ titulo: 'Relatórios' }) + abas('receber') + erroBloco(e.message); return; }
  const { linhas, atrasadoGeral } = d;
  const soma = (f) => linhas.filter(f).reduce((s, l) => s + Number(l.valor), 0);
  const regras = { todas: () => true, aberto: (l) => l.situacao === 'aberto', atrasadas: (l) => l.situacao === 'atrasado', pagas: (l) => l.situacao === 'pago', permutas: (l) => l.tipo === 'permuta' };
  const vis = linhas.filter(regras[st.filtro]);
  const periodos = [['mes', 'Este mês'], ['proximo', 'Próximo mês'], ['anterior', 'Mês passado'], ['ano', 'Este ano'], ['tudo', 'Tudo']];

  main.innerHTML = cabecalho({
    titulo: 'Relatórios',
    acoes: `<label for="periodo" class="sr">Período</label><select id="periodo" class="entrada-pilula">${opcoes(periodos, st.periodo)}</select>
      <button type="button" class="btn" id="exportar"${vis.length ? '' : ' disabled'}>${icone('baixar', 18)}Exportar planilha</button>`,
  }) + abas('receber') + `
  <dl class="numeros grandes">
    <div><dt>Em aberto</dt><dd>${brl(soma((l) => l.situacao === 'aberto' || l.situacao === 'atrasado'))}</dd><small>dinheiro, no período</small></div>
    <div class="${Number(atrasadoGeral.valor) ? 'atrasado' : ''}"><dt>Atrasado</dt><dd>${brl(atrasadoGeral.valor)}</dd><small>${atrasadoGeral.qtd} parcela(s), qualquer período</small></div>
    <div><dt>Recebido</dt><dd>${brl(soma((l) => l.situacao === 'pago'))}</dd><small>no período</small></div>
    <div><dt>Permutas</dt><dd>${brl(soma((l) => l.tipo === 'permuta'))}</dd><small>valor estimado, separado do dinheiro</small></div>
  </dl>
  <section class="bloco">
    <div class="abas-rolagem"><div class="pilulas" role="group" aria-label="Filtro">${[['todas', 'Todas'], ['aberto', 'Em aberto'], ['atrasadas', 'Atrasadas'], ['pagas', 'Pagas'], ['permutas', 'Permutas']]
      .map(([v, l]) => `<button type="button" class="pilula" data-f="${v}" aria-pressed="${v === st.filtro}">${l}</button>`).join('')}</div></div>
    ${vis.length ? `<div class="rolagem"><table class="tabela cartoes-movel"><thead><tr><th>Data</th><th>Marca</th><th>Parcela</th><th>Tipo</th><th class="dir">Valor</th><th>Situação</th><th><span class="sr">Ação</span></th></tr></thead>
      <tbody>${vis.map((l) => `<tr>
        <td data-l="Data">${dataBR(l.data)}</td>
        <td data-l="Marca"><a href="#/campanhas/${l.publi_id}"><b>${esc(l.marca)}</b></a>${l.descricao ? `<small class="muted bloco-txt">${esc(l.descricao)}</small>` : ''}</td>
        <td data-l="Parcela">${l.tipo === 'parcela' ? `${l.numero}/${l.total_parcelas}` : '—'}</td>
        <td data-l="Tipo">${l.tipo === 'parcela' ? 'Dinheiro' : 'Permuta'}</td>
        <td class="dir" data-l="Valor"><b>${brl(l.valor)}</b></td>
        <td data-l="Situação"><span class="selo fase-${SITUACAO[l.situacao][1]}">${SITUACAO[l.situacao][0]}</span></td>
        <td class="dir acao-celula"><button type="button" class="btn pequeno" data-${l.tipo === 'parcela' ? 'pagar' : 'permuta'}="${l.id}" data-pago="${l.quitado_em ? '1' : ''}">${l.quitado_em ? 'Desfazer' : 'Recebi'}</button></td>
      </tr>`).join('')}</tbody></table></div>`
      : vazio({ icone: 'moeda', titulo: 'Nada neste período', texto: st.filtro !== 'todas' ? 'Tente outro filtro ou período.' : 'Quando uma campanha tiver parcelas ou permuta com data neste período, ela aparece aqui.' })}
  </section>`;

  main.querySelector('#periodo').onchange = (e) => { st.periodo = e.target.value; telaReceber(); };
  main.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { st.filtro = b.dataset.f; telaReceber(); }; });
  const acao = async (body, msg) => { try { await api('acoes', { method: 'POST', body }); toast(msg); telaReceber(); } catch (e) { toast(e.message, 'erro'); } };
  main.querySelectorAll('[data-pagar]').forEach((b) => { b.onclick = () => acao({ acao: 'parcela_pago', id: +b.dataset.pagar, pago: !b.dataset.pago }, b.dataset.pago ? 'Recebimento desfeito.' : 'Marcado como recebido.'); });
  main.querySelectorAll('[data-permuta]').forEach((b) => { b.onclick = () => acao({ acao: 'permuta_recebida', id: +b.dataset.permuta, recebida: !b.dataset.pago }, b.dataset.pago ? 'Recebimento desfeito.' : 'Permuta marcada como recebida.'); });
  main.querySelector('#exportar').onclick = () => {
    const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [['Data', 'Marca', 'Parcela', 'Tipo', 'Valor', 'Situação', 'Quitado em', 'Descrição'].map(cel).join(';')]
      .concat(vis.map((l) => [dataBR(l.data), l.marca, l.tipo === 'parcela' ? `${l.numero}/${l.total_parcelas}` : '', l.tipo === 'parcela' ? 'Dinheiro' : 'Permuta',
        Number(l.valor).toFixed(2).replace('.', ','), SITUACAO[l.situacao][0], l.quitado_em ? dataBR(l.quitado_em) : '', l.descricao || ''].map(cel).join(';')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `contas-a-receber-${st.periodo}-${hoje()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Planilha baixada.');
  };
}
