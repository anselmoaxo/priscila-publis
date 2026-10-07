import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';
import { ensureSchema } from './db.js';

const COOKIE = 'pp_sessao';

function secret() {
  const s = process.env.JWT_SECRET
    || createHash('sha256').update('pp:' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || '')).digest('hex');
  return new TextEncoder().encode(s);
}

export async function criarSessao(res, user, lembrar) {
  const dias = lembrar ? 30 : 1;
  const token = await new SignJWT({ uid: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${dias}d`)
    .sign(secret());
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
  if (lembrar) parts.push(`Max-Age=${dias * 86400}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function encerrarSessao(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export async function lerSessao(req) {
  const raw = req.headers.cookie || '';
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m.slice(COOKIE.length + 1), secret());
    return payload;
  } catch {
    return null;
  }
}

export function erro(status, mensagem) {
  return Object.assign(new Error(mensagem), { status });
}

// Wraps a handler: schema, auth (unless publico), JSON errors.
export function rota(handler, { publico = false } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await ensureSchema();
      let sessao = null;
      if (!publico) {
        sessao = await lerSessao(req);
        if (!sessao) throw erro(401, 'Faça login para continuar.');
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const out = await handler({ req, res, body, sessao, query: req.query || {} });
      if (!res.headersSent) res.status(200).json(out ?? { ok: true });
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(e);
      res.status(status).json({ erro: status >= 500 && !e.status ? 'Erro interno. Tente de novo.' : e.message });
    }
  };
}

export function texto(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().slice(0, max);
  return s === '' ? null : s;
}

export function data(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function numero(v) {
  if (v === undefined || v === null || v === '') return 0;
  const s = String(v).trim();
  // '1500.50' (machine format) vs '1.500,50' (Brazilian format)
  const n = typeof v === 'number' ? v
    : /^-?\d+(\.\d+)?$/.test(s) ? Number(s)
    : Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
