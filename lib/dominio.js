import { sql } from './db.js';
import { texto } from './http.js';

export const STATUS_CAMPANHA = [
  'novo_contato', 'em_negociacao', 'briefing_recebido', 'em_producao', 'aguardando_envio',
  'aguardando_aprovacao', 'aprovado', 'agendado', 'publicado', 'concluido', 'cancelado',
];
export const STATUS_LABEL = {
  novo_contato: 'Novo contato', em_negociacao: 'Em negociação', briefing_recebido: 'Briefing recebido',
  em_producao: 'Em produção', aguardando_envio: 'Aguardando envio', aguardando_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado', agendado: 'Agendado', publicado: 'Publicado', concluido: 'Concluído', cancelado: 'Cancelado',
};
export const STATUS_ENTREGA = ['combinado', 'produzindo', 'aprovacao', 'publicado'];
export const TIPOS_TAREFA = ['receber_produto', 'briefing', 'gravacao', 'edicao', 'aprovacao', 'ajuste', 'agendamento', 'publicacao', 'comprovante', 'entrega', 'reuniao', 'outro'];
export const TIPOS_MATERIAL = ['briefing', 'referencia', 'roteiro', 'video', 'foto', 'contrato', 'comprovante', 'outro'];

// "today" in Brazil (SQL uses (now() AT TIME ZONE 'America/Sao_Paulo')::date inline)
export const hojeJS = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

export async function registrar(publiId, textoHist, tipo = 'auto') {
  if (!publiId || !textoHist) return;
  await sql`INSERT INTO historico (publi_id, texto, tipo) VALUES (${publiId}, ${String(textoHist).slice(0, 1000)}, ${tipo})`;
}

// Finds a brand by name (case-insensitive) or creates it. Returns { id, nome }.
export async function garantirMarca(nome) {
  const n = texto(nome, 200);
  if (!n) return null;
  const [m] = await sql`INSERT INTO marcas (nome) VALUES (${n})
    ON CONFLICT (lower(nome)) DO UPDATE SET nome = marcas.nome
    RETURNING id, nome`;
  return m;
}

export function url(v) {
  const s = texto(v, 1000);
  if (!s) return null;
  const comProtocolo = /^https?:\/\//i.test(s) ? s : 'https://' + s;
  try { const u = new URL(comProtocolo); return /^https?:$/.test(u.protocol) ? u.toString() : null; } catch { return null; }
}
