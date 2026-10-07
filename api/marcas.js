import { sql } from '../lib/db.js';
import { rota, erro, texto } from '../lib/http.js';
import { url } from '../lib/dominio.js';

function normalizar(b) {
  const nome = texto(b.nome, 200);
  if (!nome) throw erro(400, 'Informe o nome da marca ou empresa.');
  const email = texto(b.email, 200);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw erro(400, 'O e-mail não parece válido.');
  return {
    nome,
    tipo: ['marca', 'agencia'].includes(b.tipo) ? b.tipo : 'marca',
    contato_nome: texto(b.contato_nome, 200),
    email,
    telefone: texto(b.telefone, 40),
    instagram: (texto(b.instagram, 60) || '').replace(/^@+/, '') || null,
    site: url(b.site),
    observacoes: texto(b.observacoes, 8000),
    mostrar_portfolio: !!b.mostrar_portfolio,
  };
}

export default rota(async ({ req, body, query }) => {
  const id = query.id ? parseInt(query.id, 10) : null;

  if (req.method === 'GET') {
    if (id) {
      const [m] = await sql`SELECT * FROM marcas WHERE id = ${id}`;
      if (!m) throw erro(404, 'Marca não encontrada.');
      m.campanhas = await sql`
        SELECT p.id, p.nome, p.status, p.inicio, p.fim, p.tipo_pagamento, p.permuta_valor,
          COALESCE((SELECT sum(valor) FROM parcelas x WHERE x.publi_id = p.id), 0) AS valor_dinheiro
        FROM publis p WHERE p.marca_id = ${id} ORDER BY COALESCE(p.inicio, p.criado_em::date) DESC`;
      return m;
    }
    return sql`
      SELECT m.*, count(p.id)::int AS campanhas,
        count(p.id) FILTER (WHERE p.status NOT IN ('concluido','cancelado','publicado'))::int AS ativas,
        max(COALESCE(p.inicio, p.criado_em::date)) AS ultima
      FROM marcas m LEFT JOIN publis p ON p.marca_id = m.id
      GROUP BY m.id ORDER BY lower(m.nome)`;
  }

  if (req.method === 'POST') {
    const m = normalizar(body);
    const [dup] = await sql`SELECT id FROM marcas WHERE lower(nome) = lower(${m.nome})`;
    if (dup) throw erro(400, 'Já existe uma marca com esse nome.');
    const [r] = await sql`INSERT INTO marcas (nome, tipo, contato_nome, email, telefone, instagram, site, observacoes, mostrar_portfolio)
      VALUES (${m.nome}, ${m.tipo}, ${m.contato_nome}, ${m.email}, ${m.telefone}, ${m.instagram}, ${m.site}, ${m.observacoes}, ${m.mostrar_portfolio})
      RETURNING id`;
    return { id: r.id };
  }

  if (req.method === 'PUT') {
    if (!id) throw erro(400, 'Marca não informada.');
    const m = normalizar(body);
    const [dup] = await sql`SELECT id FROM marcas WHERE lower(nome) = lower(${m.nome}) AND id <> ${id}`;
    if (dup) throw erro(400, 'Já existe uma marca com esse nome.');
    const r = await sql`UPDATE marcas SET nome=${m.nome}, tipo=${m.tipo}, contato_nome=${m.contato_nome}, email=${m.email},
      telefone=${m.telefone}, instagram=${m.instagram}, site=${m.site}, observacoes=${m.observacoes}, mostrar_portfolio=${m.mostrar_portfolio}
      WHERE id=${id} RETURNING id`;
    if (!r.length) throw erro(404, 'Marca não encontrada.');
    await sql`UPDATE publis SET marca = ${m.nome} WHERE marca_id = ${id}`;
    return { id };
  }

  if (req.method === 'DELETE') {
    if (!id) throw erro(400, 'Marca não informada.');
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM publis WHERE marca_id = ${id}`;
    if (n > 0) throw erro(400, 'Essa marca tem campanhas. Exclua ou mude as campanhas antes de excluir a marca.');
    await sql`DELETE FROM marcas WHERE id = ${id}`;
    return { ok: true };
  }

  throw erro(405, 'Método não permitido.');
});
