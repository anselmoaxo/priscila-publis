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

export default rota(async ({ req, body, query }) => {
  const [u] = await sql`SELECT id, nome, foto, bio, nichos, instagram, tiktok, whatsapp, portfolio_publico, portfolio
    FROM usuarios ORDER BY id LIMIT 1`;

  if (req.method === 'GET' && !query.editar) {
    if (!u || !u.portfolio_publico) throw erro(404, 'Este portfólio não está disponível.');
    const marcas = await sql`SELECT nome FROM marcas WHERE mostrar_portfolio ORDER BY lower(nome)`;
    return publico(u, marcas);
  }

  const sessao = await lerSessao(req);
  if (!sessao || !u || String(sessao.uid) !== String(u.id)) throw erro(401, 'Faça login para continuar.');

  if (req.method === 'GET') {
    const marcas = await sql`SELECT id, nome, mostrar_portfolio FROM marcas ORDER BY lower(nome)`;
    return { publicado: u.portfolio_publico, bio: u.bio || '', nichos: u.nichos || '', portfolio: u.portfolio || {}, marcas };
  }

  if (req.method === 'PUT') {
    const p = normalizar(body.portfolio || {});
    const marcasIds = (Array.isArray(body.marcas) ? body.marcas : []).map((x) => parseInt(x, 10)).filter((x) => x > 0);
    await sql.transaction([
      sql`UPDATE usuarios SET portfolio_publico = ${!!body.publicado}, bio = ${texto(body.bio, 1200)},
        nichos = ${texto(body.nichos, 300)}, portfolio = ${JSON.stringify(p)}::jsonb WHERE id = ${u.id}`,
      sql`UPDATE marcas SET mostrar_portfolio = (id = ANY(${marcasIds}::int[]))`,
    ]);
    return { ok: true };
  }

  throw erro(405, 'Método não permitido.');
}, { publico: true });
