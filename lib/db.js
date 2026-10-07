import * as neonPkg from '@neondatabase/serverless';

const { neon } = neonPkg;
// Keep DATE as 'YYYY-MM-DD' (avoid timezone shifts) and NUMERIC as number.
try {
  neonPkg.types?.setTypeParser?.(1082, (v) => v);
  neonPkg.types?.setTypeParser?.(1700, (v) => (v === null ? null : Number(v)));
} catch { /* client normalizes as fallback */ }

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = url ? neon(url) : null;

let ready = null;

export function ensureSchema() {
  if (!sql) throw Object.assign(new Error('Banco de dados não configurado (DATABASE_URL).'), { status: 500 });
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS publis (
        id SERIAL PRIMARY KEY,
        marca TEXT NOT NULL,
        agencia TEXT,
        contato TEXT,
        contrato_url TEXT,
        inicio DATE,
        fim DATE,
        tipo_pagamento TEXT NOT NULL DEFAULT 'dinheiro' CHECK (tipo_pagamento IN ('dinheiro','permuta','misto')),
        forma_pagamento TEXT,
        permuta_descricao TEXT,
        permuta_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
        permuta_recebida_em DATE,
        observacoes TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS entregas (
        id SERIAL PRIMARY KEY,
        publi_id INTEGER NOT NULL REFERENCES publis(id) ON DELETE CASCADE,
        rede TEXT NOT NULL,
        formato TEXT NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 1,
        data_postagem DATE,
        status TEXT NOT NULL DEFAULT 'combinado' CHECK (status IN ('combinado','produzindo','aprovacao','publicado'))
      )`;
      await sql`CREATE TABLE IF NOT EXISTS parcelas (
        id SERIAL PRIMARY KEY,
        publi_id INTEGER NOT NULL REFERENCES publis(id) ON DELETE CASCADE,
        numero INTEGER NOT NULL DEFAULT 1,
        valor NUMERIC(12,2) NOT NULL,
        vencimento DATE NOT NULL,
        pago_em DATE
      )`;
      await sql`CREATE INDEX IF NOT EXISTS entregas_publi_idx ON entregas(publi_id)`;
      await sql`CREATE INDEX IF NOT EXISTS parcelas_publi_idx ON parcelas(publi_id)`;
      await sql`CREATE INDEX IF NOT EXISTS parcelas_venc_idx ON parcelas(vencimento)`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}
