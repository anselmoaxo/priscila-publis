import { sql } from '../lib/db.js';
import { rota, erro, data, texto } from '../lib/http.js';
import { STATUS_CAMPANHA, STATUS_LABEL, registrar, hojeJS } from '../lib/dominio.js';

const STATUS_ENTREGA = { combinado: 'Combinado', produzindo: 'Produzindo', aprovacao: 'Em aprovação', publicado: 'Publicado' };
const STATUS_TAREFA = ['pendente', 'fazendo', 'feita'];
const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default rota(async ({ req, body }) => {
  if (req.method !== 'POST') throw erro(405, 'Método não permitido.');
  const id = parseInt(body.id, 10);
  if (!id) throw erro(400, 'Item não informado.');

  if (body.acao === 'campanha_status') {
    if (!STATUS_CAMPANHA.includes(body.status)) throw erro(400, 'Status inválido.');
    const r = await sql`UPDATE publis SET status = ${body.status}, atualizado_em = now() WHERE id = ${id} RETURNING id`;
    if (!r.length) throw erro(404, 'Campanha não encontrada.');
    await registrar(id, `Status alterado para "${STATUS_LABEL[body.status]}"`);
    return { ok: true };
  }

  if (body.acao === 'nota') {
    const t = texto(body.texto, 1000);
    if (!t) throw erro(400, 'Escreva a atualização.');
    const [p] = await sql`SELECT id FROM publis WHERE id = ${id}`;
    if (!p) throw erro(404, 'Campanha não encontrada.');
    await registrar(id, t, 'nota');
    return { ok: true };
  }

  if (body.acao === 'entrega_status') {
    if (!STATUS_ENTREGA[body.status]) throw erro(400, 'Status inválido.');
    const [r] = await sql`UPDATE entregas SET status = ${body.status} WHERE id = ${id} RETURNING publi_id, rede, formato`;
    if (!r) throw erro(404, 'Entrega não encontrada.');
    await registrar(r.publi_id, `${r.rede} ${r.formato}: ${STATUS_ENTREGA[body.status]}`);
    return { ok: true };
  }

  if (body.acao === 'parcela_pago') {
    const pagoEm = body.pago ? (data(body.pago_em) || hojeJS()) : null;
    const [r] = await sql`UPDATE parcelas SET pago_em = ${pagoEm} WHERE id = ${id} RETURNING publi_id, numero, valor`;
    if (!r) throw erro(404, 'Parcela não encontrada.');
    await registrar(r.publi_id, pagoEm ? `Parcela ${r.numero} recebida (${brl(r.valor)})` : `Recebimento da parcela ${r.numero} desfeito`);
    return { ok: true, pago_em: pagoEm };
  }

  if (body.acao === 'permuta_recebida') {
    const em = body.recebida ? (data(body.em) || hojeJS()) : null;
    const r = await sql`UPDATE publis SET permuta_recebida_em = ${em} WHERE id = ${id} AND tipo_pagamento <> 'dinheiro' RETURNING id`;
    if (!r.length) throw erro(404, 'Permuta não encontrada.');
    await registrar(id, em ? 'Permuta recebida' : 'Recebimento da permuta desfeito');
    return { ok: true, em };
  }

  if (body.acao === 'tarefa_status') {
    if (!STATUS_TAREFA.includes(body.status)) throw erro(400, 'Status inválido.');
    const feita = body.status === 'feita' ? hojeJS() : null;
    const [r] = await sql`UPDATE tarefas SET status = ${body.status}, concluida_em = ${feita} WHERE id = ${id} RETURNING publi_id, titulo`;
    if (!r) throw erro(404, 'Tarefa não encontrada.');
    if (r.publi_id && feita) await registrar(r.publi_id, `Tarefa concluída: ${r.titulo}`);
    return { ok: true };
  }

  throw erro(400, 'Ação inválida.');
});
