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
      await sql`ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS foto TEXT,
        ADD COLUMN IF NOT EXISTS instagram TEXT,
        ADD COLUMN IF NOT EXISTS tiktok TEXT,
        ADD COLUMN IF NOT EXISTS whatsapp TEXT`;
      await sql`ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS nichos TEXT,
        ADD COLUMN IF NOT EXISTS portfolio_publico BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS portfolio JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`CREATE TABLE IF NOT EXISTS marcas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'marca',
        contato_nome TEXT,
        email TEXT,
        telefone TEXT,
        instagram TEXT,
        site TEXT,
        observacoes TEXT,
        mostrar_portfolio BOOLEAN NOT NULL DEFAULT false,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS marcas_nome_idx ON marcas (lower(nome))`;
      await sql`ALTER TABLE publis
        ADD COLUMN IF NOT EXISTS nome TEXT,
        ADD COLUMN IF NOT EXISTS produto TEXT,
        ADD COLUMN IF NOT EXISTS marca_id INTEGER REFERENCES marcas(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS data_publicacao DATE,
        ADD COLUMN IF NOT EXISTS briefing TEXT,
        ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS notas TEXT,
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'em_producao',
        ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()`;
      // Existing campaigns: create their brand records once.
      await sql`INSERT INTO marcas (nome)
        SELECT DISTINCT ON (lower(marca)) marca FROM publis WHERE marca_id IS NULL
        ON CONFLICT (lower(nome)) DO NOTHING`;
      await sql`UPDATE publis p SET marca_id = m.id FROM marcas m
        WHERE p.marca_id IS NULL AND lower(m.nome) = lower(p.marca)`;
      await sql`CREATE TABLE IF NOT EXISTS tarefas (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'outro',
        prazo DATE,
        hora TEXT,
        status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','fazendo','feita')),
        prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta')),
        publi_id INTEGER REFERENCES publis(id) ON DELETE CASCADE,
        observacoes TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
        concluida_em DATE
      )`;
      await sql`CREATE TABLE IF NOT EXISTS materiais (
        id SERIAL PRIMARY KEY,
        publi_id INTEGER REFERENCES publis(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        url TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'outro',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS historico (
        id SERIAL PRIMARY KEY,
        publi_id INTEGER NOT NULL REFERENCES publis(id) ON DELETE CASCADE,
        texto TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'auto',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS tarefas_prazo_idx ON tarefas(prazo)`;
      await sql`CREATE INDEX IF NOT EXISTS historico_publi_idx ON historico(publi_id, criado_em DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS entregas_publi_idx ON entregas(publi_id)`;
      await sql`CREATE INDEX IF NOT EXISTS parcelas_publi_idx ON parcelas(publi_id)`;
      await sql`CREATE INDEX IF NOT EXISTS parcelas_venc_idx ON parcelas(vencimento)`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}
