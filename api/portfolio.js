import { sql } from '../lib/db.js';
import { rota, erro, texto, lerSessao } from '../lib/http.js';
import { url } from '../lib/dominio.js';

const PLATAFORMAS = ['Instagram', 'TikTok', 'YouTube', 'Kwai', 'Pinterest', 'Blog', 'Outro'];

function normalizar(b) {
  const lista = (v, n) => (Array.isArray(v) ? v : []).slice(0, n);
  return {
    titulo: texto(b.titulo, 120),
    cidade: texto(b.cidade, 80),
    plataformas: lista(b.plataformas, 10).filter((p) => PLATAFORMAS.includes(p)),
    metricas: lista(b.metricas, 8).map((m) => ({ rotulo: texto(m.rotulo, 60), valor: texto(m.valor, 30) })).filter((m) => m.rotulo && m.valor),
    trabalhos: lista(b.trabalhos, 12).map((t) => ({ titulo: texto(t.titulo, 120), marca: texto(t.marca, 80), url: url(t.url) })).filter((t) => t.titulo),
    contato_email: (() => { const e = texto(b.contato_email, 200); return e && /^\S+@\S+\.\S+$/.test(e) ? e : null; })(),
    mostrar_whatsapp: !!b.mostrar_whatsapp,
    mostrar_redes: b.mostrar_redes !== false,
  };
}

// Public data only: never values, briefings, notes or private contacts.
function publico(u, marcas) {
  const p = u.portfolio || {};
  return {
    nome: u.nome, foto: u.foto, bio: u.bio,
    nichos: (u.nichos || '').split(',').map((s) => s.trim()).filter(Boolean),
    titulo: p.titulo || null, cidade: p.cidade || null,
    plataformas: p.plataformas || [],
    metricas: p.metricas || [],
    trabalhos: p.trabalhos || [],
    marcas: marcas.map((m) => m.nome),
    instagram: p.mostrar_redes !== false ? u.instagram : null,
    tiktok: p.mostrar_redes !== false ? u.tiktok : null,
    contato_email: p.contato_email || null,
    whatsapp: p.mostrar_whatsapp ? u.whatsapp : null,
  };
}

// Lowercase letters, digits and hyphens: "Priscila Souza" -> "priscila-souza".
function slugDe(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export default rota(async ({ req, body, query }) => {
  if (req.method === 'GET' && !query.editar) {
    // /portfolio/<slug>; plain /portfolio keeps showing the first account (the original link).
    const slug = slugDe(query.u);
    const [u] = slug
      ? await sql`SELECT id, nome, foto, bio, nichos, instagram, tiktok, whatsapp, portfolio_publico, portfolio
          FROM usuarios WHERE lower(slug) = ${slug}`
      : await sql`SELECT id, nome, foto, bio, nichos, instagram, tiktok, whatsapp, portfolio_publico, portfolio
          FROM usuarios ORDER BY id LIMIT 1`;
    if (!u || !u.portfolio_publico) throw erro(404, 'Este portfólio não está disponível.');
    const marcas = await sql`SELECT nome FROM marcas WHERE usuario_id = ${u.id} AND mostrar_portfolio ORDER BY lower(nome)`;
    return publico(u, marcas);
  }

  const sessao = await lerSessao(req);
  const [u] = sessao ? await sql`SELECT id, nome, slug, bio, nichos, portfolio_publico, portfolio
    FROM usuarios WHERE id = ${sessao.uid}` : [];
  if (!u) throw erro(401, 'Faça login para continuar.');

  if (req.method === 'GET') {
    const marcas = await sql`SELECT id, nome, mostrar_portfolio FROM marcas WHERE usuario_id = ${u.id} ORDER BY lower(nome)`;
    return { publicado: u.portfolio_publico, slug: u.slug || '', sugestao_slug: slugDe(u.nome), bio: u.bio || '', nichos: u.nichos || '', portfolio: u.portfolio || {}, marcas };
  }

  if (req.method === 'PUT') {
    const p = normalizar(body.portfolio || {});
    const marcasIds = (Array.isArray(body.marcas) ? body.marcas : []).map((x) => parseInt(x, 10)).filter((x) => x > 0);
    const slug = slugDe(body.slug) || null;
    if (slug && slug.length < 3) throw erro(400, 'O endereço do portfólio precisa ter pelo menos 3 letras ou números.');
    if (body.publicado && !slug) throw erro(400, 'Escolha o endereço do seu portfólio antes de publicar.');
    if (slug) {
      const [dup] = await sql`SELECT 1 FROM usuarios WHERE lower(slug) = ${slug} AND id <> ${u.id}`;
      if (dup) throw erro(400, 'Esse endereço já está em uso. Escolha outro.');
    }
    await sql.transaction([
      sql`UPDATE usuarios SET portfolio_publico = ${!!body.publicado}, slug = ${slug}, bio = ${texto(body.bio, 1200)},
        nichos = ${texto(body.nichos, 300)}, portfolio = ${JSON.stringify(p)}::jsonb WHERE id = ${u.id}`,
      sql`UPDATE marcas SET mostrar_portfolio = (id = ANY(${marcasIds}::int[])) WHERE usuario_id = ${u.id}`,
    ]);
    return { ok: true, slug };
  }

  throw erro(405, 'Método não permitido.');
}, { publico: true });
