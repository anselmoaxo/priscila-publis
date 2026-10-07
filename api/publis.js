import { sql } from '../lib/db.js';
import { rota, erro, texto, data, numero } from '../lib/http.js';

const TIPOS = ['dinheiro', 'permuta', 'misto'];
const STATUS = ['combinado', 'produzindo', 'aprovacao', 'publicado'];

function normalizar(b) {
  const marca = texto(b.marca, 200);
  if (!marca) throw erro(400, 'Informe a marca.');
  const tipo = TIPOS.includes(b.tipo_pagamento) ? b.tipo_pagamento : 'dinheiro';
  const p = {
    marca,
    agencia: texto(b.agencia, 200),
    contato: texto(b.contato, 300),
    contrato_url: texto(b.contrato_url, 1000),
    inicio: data(b.inicio),
    fim: data(b.fim),
    tipo_pagamento: tipo,
    forma_pagamento: tipo === 'permuta' ? null : texto(b.forma_pagamento, 50),
    permuta_descricao: tipo === 'dinheiro' ? null : texto(b.permuta_descricao, 500),
    permuta_valor: tipo === 'dinheiro' ? 0 : numero(b.permuta_valor),
    permuta_recebida_em: tipo === 'dinheiro' ? null : data(b.permuta_recebida_em),
    observacoes: texto(b.observacoes, 4000),
  };
  if (p.inicio && p.fim && p.fim < p.inicio) throw erro(400, 'A data final não pode ser antes da inicial.');

  const entregas = (Array.isArray(b.entregas) ? b.entregas : []).slice(0, 100).map((e) => ({
    id: parseInt(e.id, 10) > 0 ? parseInt(e.id, 10) : null,
    rede: texto(e.rede, 50) || 'Instagram',
    formato: texto(e.formato, 50) || 'Reels',
    quantidade: Math.max(1, Math.min(999, parseInt(e.quantidade, 10) || 1)),
    data_postagem: data(e.data_postagem),
    status: STATUS.includes(e.status) ? e.status : 'combinado',
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
    if (!parcelas.length) throw erro(400, 'Adicione pelo menos uma parcela em dinheiro.');
  }
  return { p, entregas, parcelas };
}

const col = (arr, k) => arr.map((x) => x[k]);

async function carregar(id) {
  const [publi] = await sql`SELECT * FROM publis WHERE id = ${id}`;
  if (!publi) throw erro(404, 'Publi não encontrada.');
  publi.entregas = await sql`SELECT * FROM entregas WHERE publi_id = ${id} ORDER BY data_postagem NULLS LAST, id`;
  publi.parcelas = await sql`SELECT * FROM parcelas WHERE publi_id = ${id} ORDER BY numero, id`;
  return publi;
}

export default rota(async ({ req, body, query }) => {
  const id = query.id ? parseInt(query.id, 10) : null;

  if (req.method === 'GET') {
    if (id) return carregar(id);
    return sql`
      SELECT p.id, p.marca, p.agencia, p.inicio, p.fim, p.tipo_pagamento, p.permuta_valor, p.permuta_recebida_em,
        COALESCE(pa.total, 0) AS valor_dinheiro,
        COALESCE(pa.recebido, 0) AS recebido,
        COALESCE(pa.atrasado, 0) AS atrasado,
        COALESCE(en.qtd, 0) AS entregas,
        COALESCE(en.publicadas, 0) AS publicadas,
        en.proxima
      FROM publis p
      LEFT JOIN (
        SELECT publi_id, sum(valor) total,
          sum(valor) FILTER (WHERE pago_em IS NOT NULL) recebido,
          sum(valor) FILTER (WHERE pago_em IS NULL AND vencimento < (now() AT TIME ZONE 'America/Sao_Paulo')::date) atrasado
        FROM parcelas GROUP BY publi_id
      ) pa ON pa.publi_id = p.id
      LEFT JOIN (
        SELECT publi_id, count(*) qtd,
          count(*) FILTER (WHERE status = 'publicado') publicadas,
          min(data_postagem) FILTER (WHERE status <> 'publicado') proxima
        FROM entregas GROUP BY publi_id
      ) en ON en.publi_id = p.id
      ORDER BY COALESCE(p.inicio, p.criado_em::date) DESC, p.id DESC`;
  }

  if (req.method === 'POST') {
    const { p, entregas: e, parcelas: pa } = normalizar(body);
    const [row] = await sql`
      WITH np AS (
        INSERT INTO publis (marca, agencia, contato, contrato_url, inicio, fim, tipo_pagamento, forma_pagamento,
          permuta_descricao, permuta_valor, permuta_recebida_em, observacoes)
        VALUES (${p.marca}, ${p.agencia}, ${p.contato}, ${p.contrato_url}, ${p.inicio}, ${p.fim}, ${p.tipo_pagamento},
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
      )
      SELECT id FROM np`;
    return { id: row.id };
  }

  if (req.method === 'PUT') {
    if (!id) throw erro(400, 'Publi não informada.');
    const { p, entregas: e, parcelas: pa } = normalizar(body);
    const [existe] = await sql`SELECT id FROM publis WHERE id = ${id}`;
    if (!existe) throw erro(404, 'Publi não encontrada.');
    const eOld = e.filter((x) => x.id), eNew = e.filter((x) => !x.id);
    const pOld = pa.filter((x) => x.id), pNew = pa.filter((x) => !x.id);
    await sql.transaction([
      sql`UPDATE publis SET marca=${p.marca}, agencia=${p.agencia}, contato=${p.contato}, contrato_url=${p.contrato_url},
        inicio=${p.inicio}, fim=${p.fim}, tipo_pagamento=${p.tipo_pagamento}, forma_pagamento=${p.forma_pagamento},
        permuta_descricao=${p.permuta_descricao}, permuta_valor=${p.permuta_valor}, permuta_recebida_em=${p.permuta_recebida_em},
        observacoes=${p.observacoes} WHERE id=${id}`,
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
    ]);
    return { id };
  }

  if (req.method === 'DELETE') {
    if (!id) throw erro(400, 'Publi não informada.');
    await sql`DELETE FROM publis WHERE id = ${id}`;
    return { ok: true };
  }

  throw erro(405, 'Método não permitido.');
});
