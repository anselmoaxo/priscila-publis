import { sql } from '../lib/db.js';
import { rota, erro, data } from '../lib/http.js';

const STATUS = ['combinado', 'produzindo', 'aprovacao', 'publicado'];
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

export default rota(async ({ req, body }) => {
  if (req.method !== 'POST') throw erro(405, 'Método não permitido.');
  const id = parseInt(body.id, 10);
  if (!id) throw erro(400, 'Item não informado.');

  if (body.acao === 'entrega_status') {
    if (!STATUS.includes(body.status)) throw erro(400, 'Status inválido.');
    const r = await sql`UPDATE entregas SET status = ${body.status} WHERE id = ${id} RETURNING id`;
    if (!r.length) throw erro(404, 'Entrega não encontrada.');
    return { ok: true };
  }

  if (body.acao === 'parcela_pago') {
    const pagoEm = body.pago ? (data(body.pago_em) || hoje()) : null;
    const r = await sql`UPDATE parcelas SET pago_em = ${pagoEm} WHERE id = ${id} RETURNING id`;
    if (!r.length) throw erro(404, 'Parcela não encontrada.');
    return { ok: true, pago_em: pagoEm };
  }

  if (body.acao === 'permuta_recebida') {
    const em = body.recebida ? (data(body.em) || hoje()) : null;
    const r = await sql`UPDATE publis SET permuta_recebida_em = ${em} WHERE id = ${id} AND tipo_pagamento <> 'dinheiro' RETURNING id`;
    if (!r.length) throw erro(404, 'Permuta não encontrada.');
    return { ok: true, em };
  }

  throw erro(400, 'Ação inválida.');
});
