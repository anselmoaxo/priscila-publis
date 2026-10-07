import { sql } from '../lib/db.js';
import { rota, erro, texto, data, numero } from '../lib/http.js';
import { STATUS_CAMPANHA, STATUS_ENTREGA, STATUS_LABEL, garantirMarca, hojeJS, url } from '../lib/dominio.js';

const TIPOS = ['dinheiro', 'permuta', 'misto'];

function normalizar(b) {
  const marca = texto(b.marca, 200);
  if (!marca) throw erro(400, 'Informe a marca.');
  const tipo = TIPOS.includes(b.tipo_pagamento) ? b.tipo_pagamento : 'dinheiro';
  const p = {
    nome: texto(b.nome, 200),
    marca,
    produto: texto(b.produto, 200),
    agencia: texto(b.agencia, 200),
    contato: texto(b.contato, 300),
    contrato_url: url(b.contrato_url),
    inicio: data(b.inicio),
    fim: data(b.fim),
    data_publicacao: data(b.data_publicacao),
    status: STATUS_CAMPANHA.includes(b.status) ? b.status : 'em_producao',
    briefing: texto(b.briefing, 20000),
    notas: texto(b.notas, 10000),
    links: (Array.isArray(b.links) ? b.links : []).slice(0, 30)
      .map((l) => ({ titulo: texto(l.titulo, 120) || '', url: url(l.url) }))
      .filter((l) => l.url),
    tipo_pagamento: tipo,
    forma_pagamento: tipo === 'permuta' ? null : texto(b.forma_pagamento, 50),
    permuta_descricao: tipo === 'dinheiro' ? null : texto(b.permuta_descricao, 500),
    permuta_valor: tipo === 'dinheiro' ? 0 : numero(b.permuta_valor),
    permuta_recebida_em: tipo === 'dinheiro' ? null : data(b.permuta_recebida_em),
    observacoes: texto(b.observacoes, 4000),
  };
  if (p.inicio && p.fim && p.fim < p.inicio) throw erro(400, 'A data de entrega não pode ser antes da data de início.');

  const entregas = (Array.isArray(b.entregas) ? b.entregas : []).slice(0, 100).map((e) => ({
    id: parseInt(e.id, 10) > 0 ? parseInt(e.id, 10) : null,
    rede: texto(e.rede, 50) || 'Instagram',
    formato: texto(e.formato, 50) || 'Reels',
    quantidade: Math.max(1, Math.min(999, parseInt(e.quantidade, 10) || 1)),
    data_postagem: data(e.data_postagem),
    status: STATUS_ENTREGA.includes(e.status) ? e.status : 'combinado',
  }));

  let parcelas = [];
  if (tipo !== 'permuta') {
    parcelas = (Array.isArray(b.parcelas) ? b.parcelas : []).slice(0, 60).map((x, i) => {
      const venc = data(x.vencimento);
      if (!venc) throw erro(400, `Informe o vencimento da parcela ${i + 1}.`);
      const valor = numero(x.valor);
      if (valor <= 0) throw erro(400, `Informe o valor da parcela ${i + 1}.`);
      return { id: parseInt(x.id, 10) > 0 ? parseInt(x.id, 10) : null, numero: i + 1, valor, vencimento: venc };
    });
    // Campaigns still in negotiation may not have a price yet.
    if (!parcelas.length && !['novo_contato', 'em_negociacao', 'cancelado'].includes(p.status)) {
      throw erro(400, 'Adicione pelo menos uma parcela em dinheiro, ou escolha "Permuta / brinde".');
    }
  }
  return { p, entregas, parcelas };
}

const col = (arr, k) => arr.map((x) => x[k]);

async function carregar(id) {
  const [publi] = await sql`SELECT * FROM publis WHERE id = ${id}`;
  if (!publi) throw erro(404, 'Campanha não encontrada.');
  const [entregas, parcelas, tarefas, materiais, historico, marca] = await Promise.all([
    sql`SELECT * FROM entregas WHERE publi_id = ${id} ORDER BY data_postagem NULLS LAST, id`,
    sql`SELECT * FROM parcelas WHERE publi_id = ${id} ORDER BY numero, id`,
    sql`SELECT * FROM tarefas WHERE publi_id = ${id} ORDER BY status = 'feita', prazo NULLS LAST, id`,
    sql`SELECT * FROM materiais WHERE publi_id = ${id} ORDER BY criado_em DESC`,
    sql`SELECT id, texto, tipo, criado_em FROM historico WHERE publi_id = ${id} ORDER BY criado_em DESC, id DESC LIMIT 60`,
    publi.marca_id ? sql`SELECT * FROM marcas WHERE id = ${publi.marca_id}` : Promise.resolve([]),
  ]);
  return { ...publi, entregas, parcelas, tarefas, materiais, historico, marca_info: marca[0] || null };
}

export default rota(async ({ req, body, query }) => {
  const id = query.id ? parseInt(query.id, 10) : null;
  const hoje = hojeJS();

  if (req.method === 'GET') {
    if (id) return carregar(id);
    return sql`
      SELECT p.id, p.nome, p.marca, p.marca_id, p.produto, p.agencia, p.inicio, p.fim, p.data_publicacao, p.status,
        p.tipo_pagamento, p.permuta_valor, p.permuta_recebida_em, p.atualizado_em,
        COALESCE(pa.total, 0) AS valor_dinheiro,
        COALESCE(pa.recebido, 0) AS recebido,
        COALESCE(pa.atrasado, 0) AS atrasado,
        COALESCE(en.qtd, 0)::int AS entregas,
        COALESCE(en.publicadas, 0)::int AS publicadas,
        COALESCE(en.plataformas, ARRAY[]::text[]) AS plataformas,
        COALESCE(en.formatos, ARRAY[]::text[]) AS formatos,
        COALESCE(ta.pendentes, 0)::int AS tarefas_pendentes,
        LEAST(en.proxima, ta.proxima,
          CASE WHEN p.status NOT IN ('publicado','concluido','cancelado') THEN p.fim END,
          CASE WHEN p.status NOT IN ('publicado','concluido','cancelado') THEN p.data_publicacao END) AS proximo_prazo
      FROM publis p
      LEFT JOIN (
        SELECT publi_id, sum(valor) total,
          sum(valor) FILTER (WHERE pago_em IS NOT NULL) recebido,
          sum(valor) FILTER (WHERE pago_em IS NULL AND vencimento < ${hoje}::date) atrasado
        FROM parcelas GROUP BY publi_id
      ) pa ON pa.publi_id = p.id
      LEFT JOIN (
        SELECT publi_id, count(*) qtd,
          count(*) FILTER (WHERE status = 'publicado') publicadas,
          min(data_postagem) FILTER (WHERE status <> 'publicado') proxima,
          array_agg(DISTINCT rede) plataformas,
          array_agg(DISTINCT formato) formatos
        FROM entregas GROUP BY publi_id
      ) en ON en.publi_id = p.id
      LEFT JOIN (
        SELECT publi_id, count(*) FILTER (WHERE status <> 'feita') pendentes,
          min(prazo) FILTER (WHERE status <> 'feita') proxima
        FROM tarefas WHERE publi_id IS NOT NULL GROUP BY publi_id
      ) ta ON ta.publi_id = p.id
      ORDER BY (p.status IN ('concluido','cancelado')), COALESCE(p.inicio, p.criado_em::date) DESC, p.id DESC`;
  }

  if (req.method === 'POST') {
    const { p, entregas: e, parcelas: pa } = normalizar(body);
    const m = await garantirMarca(p.marca);
    const [row] = await sql`
      WITH np AS (
        INSERT INTO publis (nome, marca, marca_id, produto, agencia, contato, contrato_url, inicio, fim, data_publicacao, status,
          briefing, notas, links, tipo_pagamento, forma_pagamento, permuta_descricao, permuta_valor, permuta_recebida_em, observacoes)
        VALUES (${p.nome}, ${m.nome}, ${m.id}, ${p.produto}, ${p.agencia}, ${p.contato}, ${p.contrato_url}, ${p.inicio}, ${p.fim},
          ${p.data_publicacao}, ${p.status}, ${p.briefing}, ${p.notas}, ${JSON.stringify(p.links)}::jsonb, ${p.tipo_pagamento},
          ${p.forma_pagamento}, ${p.permuta_descricao}, ${p.permuta_valor}, ${p.permuta_recebida_em}, ${p.observacoes})
        RETURNING id
      ), ne AS (
        INSERT INTO entregas (publi_id, rede, formato, quantidade, data_postagem, status)
        SELECT np.id, v.rede, v.formato, v.quantidade, v.data_postagem, v.status
        FROM np, unnest(${col(e, 'rede')}::text[], ${col(e, 'formato')}::text[], ${col(e, 'quantidade')}::int[],
          ${col(e, 'data_postagem')}::date[], ${col(e, 'status')}::text[]) AS v(rede, formato, quantidade, data_postagem, status)
      ), npa AS (
        INSERT INTO parcelas (publi_id, numero, valor, vencimento)
        SELECT np.id, v.numero, v.valor, v.vencimento
        FROM np, unnest(${col(pa, 'numero')}::int[], ${col(pa, 'valor')}::numeric[], ${col(pa, 'vencimento')}::date[])
          AS v(numero, valor, vencimento)
      ), nh AS (
        INSERT INTO historico (publi_id, texto) SELECT np.id, ${'Campanha criada como "' + STATUS_LABEL[p.status] + '"'} FROM np
      )
      SELECT id FROM np`;
    return { id: row.id };
  }

  if (req.method === 'PUT') {
    if (!id) throw erro(400, 'Campanha não informada.');
    const { p, entregas: e, parcelas: pa } = normalizar(body);
    const [antes] = await sql`SELECT id, status FROM publis WHERE id = ${id}`;
    if (!antes) throw erro(404, 'Campanha não encontrada.');
    const m = await garantirMarca(p.marca);
    const eOld = e.filter((x) => x.id), eNew = e.filter((x) => !x.id);
    const pOld = pa.filter((x) => x.id), pNew = pa.filter((x) => !x.id);
    await sql.transaction([
      sql`UPDATE publis SET nome=${p.nome}, marca=${m.nome}, marca_id=${m.id}, produto=${p.produto}, agencia=${p.agencia},
        contato=${p.contato}, contrato_url=${p.contrato_url}, inicio=${p.inicio}, fim=${p.fim}, data_publicacao=${p.data_publicacao},
        status=${p.status}, briefing=${p.briefing}, notas=${p.notas}, links=${JSON.stringify(p.links)}::jsonb,
        tipo_pagamento=${p.tipo_pagamento}, forma_pagamento=${p.forma_pagamento},
        permuta_descricao=${p.permuta_descricao}, permuta_valor=${p.permuta_valor}, permuta_recebida_em=${p.permuta_recebida_em},
        observacoes=${p.observacoes}, atualizado_em=now() WHERE id=${id}`,
      sql`DELETE FROM entregas WHERE publi_id=${id} AND NOT (id = ANY(${col(eOld, 'id')}::int[]))`,
      sql`UPDATE entregas t SET rede=v.rede, formato=v.formato, quantidade=v.quantidade, data_postagem=v.data_postagem, status=v.status
        FROM unnest(${col(eOld, 'id')}::int[], ${col(eOld, 'rede')}::text[], ${col(eOld, 'formato')}::text[],
          ${col(eOld, 'quantidade')}::int[], ${col(eOld, 'data_postagem')}::date[], ${col(eOld, 'status')}::text[])
          AS v(id, rede, formato, quantidade, data_postagem, status)
        WHERE t.id = v.id AND t.publi_id = ${id}`,
      sql`INSERT INTO entregas (publi_id, rede, formato, quantidade, data_postagem, status)
        SELECT ${id}, v.rede, v.formato, v.quantidade, v.data_postagem, v.status
        FROM unnest(${col(eNew, 'rede')}::text[], ${col(eNew, 'formato')}::text[], ${col(eNew, 'quantidade')}::int[],
          ${col(eNew, 'data_postagem')}::date[], ${col(eNew, 'status')}::text[]) AS v(rede, formato, quantidade, data_postagem, status)`,
      sql`DELETE FROM parcelas WHERE publi_id=${id} AND NOT (id = ANY(${col(pOld, 'id')}::int[]))`,
      sql`UPDATE parcelas t SET numero=v.numero, valor=v.valor, vencimento=v.vencimento
        FROM unnest(${col(pOld, 'id')}::int[], ${col(pOld, 'numero')}::int[], ${col(pOld, 'valor')}::numeric[], ${col(pOld, 'vencimento')}::date[])
          AS v(id, numero, valor, vencimento)
        WHERE t.id = v.id AND t.publi_id = ${id}`,
      sql`INSERT INTO parcelas (publi_id, numero, valor, vencimento)
        SELECT ${id}, v.numero, v.valor, v.vencimento
        FROM unnest(${col(pNew, 'numero')}::int[], ${col(pNew, 'valor')}::numeric[], ${col(pNew, 'vencimento')}::date[])
          AS v(numero, valor, vencimento)`,
      sql`INSERT INTO historico (publi_id, texto) VALUES (${id}, ${antes.status !== p.status
        ? `Status alterado para "${STATUS_LABEL[p.status]}"` : 'Dados da campanha atualizados'})`,
    ]);
    return { id };
  }

  if (req.method === 'DELETE') {
    if (!id) throw erro(400, 'Campanha não informada.');
    await sql`DELETE FROM publis WHERE id = ${id}`;
    return { ok: true };
  }

  throw erro(405, 'Método não permitido.');
});
