import { sql } from '../lib/db.js';
import { rota, erro, texto } from '../lib/http.js';
import { TIPOS_MATERIAL, registrar, url } from '../lib/dominio.js';

export default rota(async ({ req, body, query }) => {
  const id = query.id ? parseInt(query.id, 10) : null;

  if (req.method === 'GET') {
    return sql`SELECT m.*, p.nome AS campanha_nome, p.marca
      FROM materiais m LEFT JOIN publis p ON p.id = m.publi_id
      ORDER BY m.criado_em DESC`;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const titulo = texto(body.titulo, 200);
    if (!titulo) throw erro(400, 'Dê um nome para o material.');
    const link = url(body.url);
    if (!link) throw erro(400, 'Cole um link válido (Google Drive, Dropbox, Canva…).');
    const tipo = TIPOS_MATERIAL.includes(body.tipo) ? body.tipo : 'outro';
    const publi = parseInt(body.publi_id, 10) > 0 ? parseInt(body.publi_id, 10) : null;
    if (req.method === 'PUT') {
      if (!id) throw erro(400, 'Material não informado.');
      const r = await sql`UPDATE materiais SET titulo=${titulo}, url=${link}, tipo=${tipo}, publi_id=${publi} WHERE id=${id} RETURNING id`;
      if (!r.length) throw erro(404, 'Material não encontrado.');
      return { id };
    }
    const [r] = await sql`INSERT INTO materiais (titulo, url, tipo, publi_id) VALUES (${titulo}, ${link}, ${tipo}, ${publi}) RETURNING id`;
    if (publi) await registrar(publi, `Material adicionado: ${titulo}`);
    return { id: r.id };
  }

  if (req.method === 'DELETE') {
    if (!id) throw erro(400, 'Material não informado.');
    await sql`DELETE FROM materiais WHERE id = ${id}`;
    return { ok: true };
  }

  throw erro(405, 'Método não permitido.');
});
