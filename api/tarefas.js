import { sql } from '../lib/db.js';
import { rota, erro, texto, data } from '../lib/http.js';
import { TIPOS_TAREFA, registrar, hojeJS, publiDaConta } from '../lib/dominio.js';

function normalizar(b) {
  const titulo = texto(b.titulo, 200);
  if (!titulo) throw erro(400, 'Dê um título para a tarefa.');
  const hora = texto(b.hora, 5);
  return {
    titulo,
    tipo: TIPOS_TAREFA.includes(b.tipo) ? b.tipo : 'outro',
    prazo: data(b.prazo),
    hora: hora && /^\d{2}:\d{2}$/.test(hora) ? hora : null,
    status: ['pendente', 'fazendo', 'feita'].includes(b.status) ? b.status : 'pendente',
    prioridade: ['baixa', 'normal', 'alta'].includes(b.prioridade) ? b.prioridade : 'normal',
    publi_id: parseInt(b.publi_id, 10) > 0 ? parseInt(b.publi_id, 10) : null,
    observacoes: texto(b.observacoes, 4000),
  };
}

export default rota(async ({ req, body, query, uid }) => {
  const id = query.id ? parseInt(query.id, 10) : null;

  if (req.method === 'GET') {
    const publi = query.publi_id ? parseInt(query.publi_id, 10) : null;
    return sql`
      SELECT t.*, p.nome AS campanha_nome, p.marca
      FROM tarefas t LEFT JOIN publis p ON p.id = t.publi_id
      WHERE t.usuario_id = ${uid} AND (${publi}::int IS NULL OR t.publi_id = ${publi}::int)
      ORDER BY t.status = 'feita', t.prazo NULLS LAST, CASE t.prioridade WHEN 'alta' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.id`;
  }

  if (req.method === 'POST') {
    const t = normalizar(body);
    if (t.publi_id && !await publiDaConta(t.publi_id, uid)) throw erro(400, 'Campanha não encontrada.');
    const [r] = await sql`INSERT INTO tarefas (usuario_id, titulo, tipo, prazo, hora, status, prioridade, publi_id, observacoes, concluida_em)
      VALUES (${uid}, ${t.titulo}, ${t.tipo}, ${t.prazo}, ${t.hora}, ${t.status}, ${t.prioridade}, ${t.publi_id}, ${t.observacoes},
        ${t.status === 'feita' ? hojeJS() : null})
      RETURNING id`;
    if (t.publi_id) await registrar(t.publi_id, `Tarefa adicionada: ${t.titulo}`);
    return { id: r.id };
  }

  if (req.method === 'PUT') {
    if (!id) throw erro(400, 'Tarefa não informada.');
    const t = normalizar(body);
    if (t.publi_id && !await publiDaConta(t.publi_id, uid)) throw erro(400, 'Campanha não encontrada.');
    const r = await sql`UPDATE tarefas SET titulo=${t.titulo}, tipo=${t.tipo}, prazo=${t.prazo}, hora=${t.hora}, status=${t.status},
        prioridade=${t.prioridade}, publi_id=${t.publi_id}, observacoes=${t.observacoes},
        concluida_em = CASE WHEN ${t.status} = 'feita' THEN COALESCE(concluida_em, ${hojeJS()}::date) ELSE NULL END
      WHERE id=${id} AND usuario_id=${uid} RETURNING id`;
    if (!r.length) throw erro(404, 'Tarefa não encontrada.');
    return { id };
  }

  if (req.method === 'DELETE') {
    if (!id) throw erro(400, 'Tarefa não informada.');
    await sql`DELETE FROM tarefas WHERE id = ${id} AND usuario_id = ${uid}`;
    return { ok: true };
  }

  throw erro(405, 'Método não permitido.');
});
