import { api, casca, estado, esc, icone, brl, avatar, hoje, somarDias, dataDe, DIAS, DIAS_LONGOS, MESES_LONGOS, quando, trilha, vazio, carregando, erroBloco, nomeCampanha, plural } from '../core.js';
import { chipEvento, linhaEvento, ligarEventos } from '../eventos.js';
import { modalTarefa, modalMarca } from '../formularios.js';

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export async function telaInicio() {
  const main = casca('inicio');
  main.innerHTML = carregando();
  const hj = hoje();
  let r, agenda;
  try {
    [r, agenda] = await Promise.all([api('resumo'), api(`agenda?de=${hj}&ate=${somarDias(hj, 13)}`)]);
  } catch (e) { main.innerHTML = erroBloco(e.message); return; }
  const eventos = agenda.eventos;
  const k = r.kpis;
  const d = dataDe(hj);
  const primeiro = (estado.usuario?.nome || '').split(' ')[0];
  const novo = k.ativas_qtd === 0 && !r.atividade.length;

  const semana = Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(hj, i);
    const evs = eventos.filter((e) => e.data === dia);
    const dd = dataDe(dia);
    return `<li class="dia${i === 0 ? ' hoje' : ''}">
      <a class="dia-topo" href="#/calendario?modo=semana&data=${dia}" aria-label="${DIAS_LONGOS[dd.getDay()]}, ${dd.getDate()} de ${MESES_LONGOS[dd.getMonth()]}: ${plural(evs.length, 'compromisso', 'compromissos')}">
        <span>${i === 0 ? 'hoje' : DIAS[dd.getDay()]}</span><b>${dd.getDate()}</b></a>
      <div class="dia-evs">${evs.slice(0, 3).map((e) => chipEvento(e, { compacto: true })).join('')}
        ${evs.length > 3 ? `<a class="ev-mais" href="#/calendario?modo=semana&data=${dia}">mais ${evs.length - 3}</a>` : ''}</div>
    </li>`;
  }).join('');

  const pendentes = eventos.filter((e) => !e.concluido).slice(0, 7);
  const atencao = [
    ...r.atrasadas.map((a) => ({ ...a, motivo: 'atrasada' })),
    ...r.aprovacao.map((a) => ({ ...a, motivo: 'aprovacao' })),
  ];

  main.innerHTML = `
    <header class="ola">
      <div class="ola-texto">${avatar(estado.usuario, 56)}
        <div><p class="sub">${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}</p>
        <h1>${saudacao()}${primeiro ? ', ' + esc(primeiro) : ''}</h1></div></div>
      <div class="atalhos">
        <a class="btn primario" href="#/campanhas/nova">${icone('novo', 18)}Nova campanha</a>
        <button type="button" class="btn" data-nova-tarefa>${icone('tarefas', 18)}Nova tarefa</button>
        <button type="button" class="btn" data-novo-contato>${icone('marcas', 18)}Novo contato</button>
      </div>
    </header>

    ${novo ? `<section class="boas-vindas">
      <h2>Comece cadastrando uma campanha</h2>
      <p>Coloque a marca, o que você vai entregar e as datas. A partir daí o calendário, os prazos e o financeiro se montam sozinhos.</p>
      <a class="btn primario" href="#/campanhas/nova">${icone('novo', 18)}Cadastrar primeira campanha</a>
    </section>` : ''}

    <section class="bloco semana" aria-labelledby="t-semana">
      <div class="bloco-topo"><h2 id="t-semana">Sua semana</h2><a class="link-forte" href="#/calendario">Abrir calendário</a></div>
      <ol class="semana-dias">${semana}</ol>
    </section>

    <div class="duas-colunas">
      <div class="col-principal">
        ${atencao.length ? `<section class="bloco atencao" aria-labelledby="t-atencao">
          <div class="bloco-topo"><h2 id="t-atencao">Precisa da sua atenção</h2></div>
          <ul class="lista-simples">${atencao.map((a) => `<li><a href="${a.publi_id ? '#/campanhas/' + a.publi_id : '#/tarefas'}" class="item-atencao ${a.motivo}">
            <span class="ponto" aria-hidden="true"></span>
            <span><b>${esc(a.titulo || 'Campanha')}</b><small>${esc(a.marca || 'Sem campanha')}: ${a.motivo === 'atrasada'
              ? `prazo era ${esc(quando(a.data).toLowerCase())}` : 'aguardando aprovação da marca'}</small></span></a></li>`).join('')}</ul>
        </section>` : ''}

        <section class="bloco" aria-labelledby="t-prazos">
          <div class="bloco-topo"><h2 id="t-prazos">Próximos prazos</h2><span class="muted">próximas 2 semanas</span></div>
          ${pendentes.length ? `<div class="lista-evs">${pendentes.map((e) => `<div class="prazo-linha"><span class="prazo-quando${e.data === hj ? ' hoje' : ''}">${esc(quando(e.data))}</span>${linhaEvento(e)}</div>`).join('')}</div>`
            : vazio({ icone: 'calendario', titulo: 'Nada marcado para os próximos dias', texto: 'Quando você adicionar datas de gravação, entrega ou publicação, elas aparecem aqui.' })}
        </section>

        <section class="bloco" aria-labelledby="t-ativas">
          <div class="bloco-topo"><h2 id="t-ativas">Campanhas em andamento</h2><a class="link-forte" href="#/campanhas">Ver todas</a></div>
          ${r.ativas.length ? `<ul class="ativas">${r.ativas.map((p) => `<li><a href="#/campanhas/${p.id}" class="ativa">
              <div class="ativa-topo"><b>${esc(nomeCampanha(p))}</b><span class="muted">${esc(p.marca)}</span></div>
              ${trilha(p.status)}
              <div class="ativa-pe muted">${p.entregas ? `${p.publicadas} de ${plural(p.entregas, 'conteúdo publicado', 'conteúdos publicados')}` : 'Sem entregas cadastradas'}${p.fim ? `, entrega ${esc(quando(p.fim).toLowerCase())}` : ''}</div>
            </a></li>`).join('')}</ul>`
            : vazio({ icone: 'campanhas', titulo: 'Nenhuma campanha em produção agora', texto: k.negociacao_qtd ? `Você tem ${plural(k.negociacao_qtd, 'campanha', 'campanhas')} em negociação.` : 'Cadastre uma campanha para acompanhar as etapas por aqui.' })}
        </section>
      </div>

      <aside class="col-lateral">
        <section class="bloco dinheiro" aria-labelledby="t-din">
          <div class="bloco-topo"><h2 id="t-din">Dinheiro</h2><a class="link-forte" href="#/relatorios/receber">Contas a receber</a></div>
          <dl class="numeros">
            <div><dt>A receber</dt><dd>${brl(k.aberto)}</dd><small>${plural(k.aberto_qtd, 'parcela em aberto', 'parcelas em aberto')}</small></div>
            <div><dt>Recebido no mês</dt><dd>${brl(k.recebido_mes)}</dd></div>
            <div><dt>Permutas no mês</dt><dd>${brl(k.permuta_mes)}</dd><small>valor estimado</small></div>
            ${Number(k.atrasado) > 0 ? `<div class="atrasado"><dt>Atrasado</dt><dd>${brl(k.atrasado)}</dd><small>${plural(k.atrasado_qtd, 'parcela vencida', 'parcelas vencidas')}</small></div>` : ''}
          </dl>
        </section>
        <section class="bloco" aria-labelledby="t-ativ">
          <div class="bloco-topo"><h2 id="t-ativ">Atividade recente</h2></div>
          ${r.atividade.length ? `<ol class="atividade">${r.atividade.map((a) => `<li>
            <a href="#/campanhas/${a.publi_id}"><span>${esc(a.texto)}</span><small>${esc(a.marca)}, ${esc(quando(String(a.criado_em).slice(0, 10)).toLowerCase())}</small></a></li>`).join('')}</ol>`
            : '<p class="muted">As atualizações das suas campanhas aparecem aqui.</p>'}
        </section>
      </aside>
    </div>`;

  ligarEventos(main, eventos, telaInicio);
  main.querySelector('[data-nova-tarefa]').onclick = () => modalTarefa({ prazo: hj, aoSalvar: telaInicio });
  main.querySelector('[data-novo-contato]').onclick = () => modalMarca({ aoSalvar: (id) => { location.hash = '#/marcas/' + id; } });
}
