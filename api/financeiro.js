import { sql } from '../lib/db.js';
import { rota, erro, data } from '../lib/http.js';

// Parcelas + permutas within a date range (defaults to current month), plus totals.
export default rota(async ({ req, query }) => {
  if (req.method !== 'GET') throw erro(405, 'Método não permitido.');
  const de = data(query.de);
  const ate = data(query.ate);

  const linhas = await sql`
    SELECT * FROM (
      SELECT 'parcela' AS tipo, pa.id, pa.publi_id, p.marca, pa.vencimento AS data, pa.valor,
        pa.numero, (SELECT count(*) FROM parcelas x WHERE x.publi_id = pa.publi_id)::int AS total_parcelas,
        pa.pago_em AS quitado_em,
        CASE WHEN pa.pago_em IS NOT NULL THEN 'pago'
             WHEN pa.vencimento < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN 'atrasado'
             ELSE 'aberto' END AS situacao,
        NULL::text AS descricao
      FROM parcelas pa JOIN publis p ON p.id = pa.publi_id
      UNION ALL
      SELECT 'permuta', p.id, p.id, p.marca, COALESCE(p.permuta_recebida_em, p.inicio, p.criado_em::date), p.permuta_valor,
        NULL, NULL, p.permuta_recebida_em,
        CASE WHEN p.permuta_recebida_em IS NOT NULL THEN 'permuta_recebida' ELSE 'permuta_pendente' END,
        p.permuta_descricao
      FROM publis p WHERE p.tipo_pagamento <> 'dinheiro'
    ) t
    WHERE (${de}::date IS NULL OR t.data >= ${de}::date)
      AND (${ate}::date IS NULL OR t.data <= ${ate}::date)
    ORDER BY t.data, t.marca`;

  const [atraso] = await sql`
    SELECT COALESCE(sum(valor), 0) AS valor, count(*)::int AS qtd
    FROM parcelas WHERE pago_em IS NULL AND vencimento < (now() AT TIME ZONE 'America/Sao_Paulo')::date`;

  return { linhas, atrasadoGeral: atraso };
});
