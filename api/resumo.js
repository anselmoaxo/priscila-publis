import { sql } from '../lib/db.js';
import { rota, erro } from '../lib/http.js';

export default rota(async ({ req }) => {
  if (req.method !== 'GET') throw erro(405, 'Método não permitido.');
  const [k] = await sql`
    SELECT
      (SELECT COALESCE(sum(valor),0) FROM parcelas WHERE pago_em IS NULL) AS aberto,
      (SELECT count(*)::int FROM parcelas WHERE pago_em IS NULL) AS aberto_qtd,
      (SELECT COALESCE(sum(valor),0) FROM parcelas WHERE pago_em IS NULL AND vencimento < (now() AT TIME ZONE 'America/Sao_Paulo')::date) AS atrasado,
      (SELECT count(*)::int FROM parcelas WHERE pago_em IS NULL AND vencimento < (now() AT TIME ZONE 'America/Sao_Paulo')::date) AS atrasado_qtd,
      (SELECT COALESCE(sum(valor),0) FROM parcelas WHERE date_trunc('month', pago_em) = date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)) AS recebido_mes,
      (SELECT count(*)::int FROM parcelas WHERE date_trunc('month', pago_em) = date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)) AS recebido_mes_qtd,
      (SELECT COALESCE(sum(permuta_valor),0) FROM publis WHERE tipo_pagamento <> 'dinheiro'
         AND date_trunc('month', COALESCE(permuta_recebida_em, inicio, criado_em::date)) = date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)) AS permuta_mes,
      (SELECT count(*)::int FROM publis WHERE tipo_pagamento <> 'dinheiro'
         AND date_trunc('month', COALESCE(permuta_recebida_em, inicio, criado_em::date)) = date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)) AS permuta_mes_qtd`;

  const entregas = await sql`
    SELECT e.id, e.publi_id, e.rede, e.formato, e.quantidade, e.data_postagem, e.status, p.marca, p.tipo_pagamento
    FROM entregas e JOIN publis p ON p.id = e.publi_id
    WHERE e.status <> 'publicado'
    ORDER BY e.data_postagem NULLS LAST, e.id
    LIMIT 8`;

  const receber = await sql`
    SELECT pa.id, pa.publi_id, pa.valor, pa.vencimento, pa.numero, p.marca,
      (SELECT count(*) FROM parcelas x WHERE x.publi_id = pa.publi_id)::int AS total_parcelas
    FROM parcelas pa JOIN publis p ON p.id = pa.publi_id
    WHERE pa.pago_em IS NULL
    ORDER BY pa.vencimento
    LIMIT 6`;

  return { kpis: k, entregas, receber };
});
