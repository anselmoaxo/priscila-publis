import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.js';
import { rota, erro, criarSessao, encerrarSessao, lerSessao, texto } from '../lib/http.js';

// Simple per-instance throttle for failed logins.
const falhas = new Map();
function bloqueado(chave) {
  const f = falhas.get(chave);
  return f && f.n >= 5 && Date.now() - f.t < 10 * 60 * 1000;
}
function registrarFalha(chave) {
  const f = falhas.get(chave) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 10 * 60 * 1000) { f.n = 0; f.t = Date.now(); }
  f.n += 1;
  falhas.set(chave, f);
}

export default rota(async ({ req, res, body }) => {
  if (req.method === 'GET') {
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM usuarios`;
    const sessao = await lerSessao(req);
    if (!sessao) return { logado: false, precisaCadastro: n === 0 };
    const [u] = await sql`SELECT id, nome, email, foto, instagram, tiktok, whatsapp FROM usuarios WHERE id = ${sessao.uid}`;
    if (!u) { encerrarSessao(res); return { logado: false, precisaCadastro: n === 0 }; }
    return { logado: true, usuario: u };
  }

  if (req.method !== 'POST') throw erro(405, 'Método não permitido.');
  const acao = body.acao;

  if (acao === 'logout') { encerrarSessao(res); return { ok: true }; }

  if (acao === 'cadastro') {
    const email = (texto(body.email, 200) || '').toLowerCase();
    const senha = String(body.senha || '');
    const nome = texto(body.nome, 100) || '';
    if (!/^\S+@\S+\.\S+$/.test(email)) throw erro(400, 'Informe um e-mail válido.');
    if (senha.length < 8) throw erro(400, 'A senha precisa ter pelo menos 8 caracteres.');
    const hash = await bcrypt.hash(senha, 10);
    // Only allowed while there is no user yet (single-user system).
    const rows = await sql`INSERT INTO usuarios (nome, email, senha_hash)
      SELECT ${nome}, ${email}, ${hash}
      WHERE NOT EXISTS (SELECT 1 FROM usuarios)
      RETURNING id, nome, email`;
    if (!rows.length) throw erro(403, 'O acesso já foi criado. Faça login.');
    await criarSessao(res, rows[0], true);
    return { ok: true, usuario: rows[0] };
  }

  if (acao === 'login') {
    const email = (texto(body.email, 200) || '').toLowerCase();
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0];
    const chave = email + '|' + ip;
    if (bloqueado(chave)) throw erro(429, 'Muitas tentativas. Aguarde alguns minutos.');
    const [u] = await sql`SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ${email}`;
    const ok = u && await bcrypt.compare(String(body.senha || ''), u.senha_hash);
    if (!ok) { registrarFalha(chave); throw erro(401, 'E-mail ou senha incorretos.'); }
    falhas.delete(chave);
    await criarSessao(res, u, !!body.lembrar);
    return { ok: true, usuario: { id: u.id, nome: u.nome, email: u.email } };
  }

  if (acao === 'senha') {
    const sessao = await lerSessao(req);
    if (!sessao) throw erro(401, 'Faça login para continuar.');
    const [u] = await sql`SELECT id, senha_hash FROM usuarios WHERE id = ${sessao.uid}`;
    if (!u || !await bcrypt.compare(String(body.atual || ''), u.senha_hash)) throw erro(400, 'Senha atual incorreta.');
    const nova = String(body.nova || '');
    if (nova.length < 8) throw erro(400, 'A nova senha precisa ter pelo menos 8 caracteres.');
    await sql`UPDATE usuarios SET senha_hash = ${await bcrypt.hash(nova, 10)} WHERE id = ${u.id}`;
    return { ok: true };
  }

  if (acao === 'perfil') {
    const sessao = await lerSessao(req);
    if (!sessao) throw erro(401, 'Faça login para continuar.');
    const nome = texto(body.nome, 100) || '';
    const email = (texto(body.email, 200) || '').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw erro(400, 'Informe um e-mail válido.');
    const arroba = (v) => { const s = texto(v, 60); return s ? s.replace(/^@+/, '').replace(/[^\w.]/g, '') || null : null; };
    let foto = body.foto ?? null;
    if (foto !== null) {
      foto = String(foto);
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(foto)) throw erro(400, 'Formato de foto inválido.');
      if (foto.length > 400000) throw erro(400, 'A foto ficou grande demais. Tente outra imagem.');
    }
    const [dup] = await sql`SELECT 1 FROM usuarios WHERE email = ${email} AND id <> ${sessao.uid}`;
    if (dup) throw erro(400, 'Esse e-mail já está em uso.');
    const [u] = await sql`UPDATE usuarios SET nome = ${nome}, email = ${email}, foto = ${foto},
        instagram = ${arroba(body.instagram)}, tiktok = ${arroba(body.tiktok)}, whatsapp = ${texto(body.whatsapp, 30)}
      WHERE id = ${sessao.uid}
      RETURNING id, nome, email, foto, instagram, tiktok, whatsapp`;
    return { ok: true, usuario: u };
  }

  throw erro(400, 'Ação inválida.');
}, { publico: true });
