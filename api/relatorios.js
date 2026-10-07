import { sql } from '../lib/db.js';
import { rota, erro } from '../lib/http.js';

export default rota(async ({ req, query }) => {
  if (req.method !== 'GET') throw erro(405, 'Método não permitido.');
  const ano = /^\d{4}$/.test(query.ano || '') ? Number(query.ano) : Number(new Date().getFullYear());
  const de = `${ano}-01-01`, ate = `${ano}-12-31`;

  const [meses, marcas, plataformas, status, totais] = await Promise.all([
    sql`SELECT m::int AS mes,
        COALESCE((SELECT sum(valor) FROM parcelas WHERE pago_em IS NOT NULL AND extract(year FROM pago_em) = ${ano} AND extract(month FROM pago_em) = m), 0) AS recebido,
        COALESCE((SELECT sum(valor) FROM parcelas WHERE extract(year FROM vencimento) = ${ano} AND extract(month FROM vencimento) = m), 0) AS previsto,
        COALESCE((SELECT sum(permuta_valor) FROM publis WHERE tipo_pagamento <> 'dinheiro' AND status <> 'cancelado'
          AND extract(year FROM COALESCE(permuta_recebida_em, inicio, criado_em::date)) = ${ano}
          AND extract(month FROM COALESCE(permuta_recebida_em, inicio, criado_em::date)) = m), 0) AS permutas,
        (SELECT count(*)::int FROM publis WHERE status <> 'cancelado' AND extract(year FROM COALESCE(inicio, criado_em::date)) = ${ano}
          AND extract(month FROM COALESCE(inicio, criado_em::date)) = m) AS campanhas
      FROM generate_series(1, 12) m ORDER BY m`,
    sql`SELECT p.marca, count(DISTINCT p.id)::int AS campanhas,
        COALESCE(sum(pa.valor), 0) AS dinheiro,
        COALESCE((SELECT sum(x.permuta_valor) FROM publis x WHERE x.marca_id IS NOT DISTINCT FROM p.marca_id AND x.marca = p.marca
          AND x.tipo_pagamento <> 'dinheiro' AND x.status <> 'cancelado'
          AND COALESCE(x.inicio, x.criado_em::date) BETWEEN ${de}::date AND ${ate}::date), 0) AS permutas
      FROM publis p LEFT JOIN parcelas pa ON pa.publi_id = p.id
      WHERE p.status <> 'cancelado' AND COALESCE(p.inicio, p.criado_em::date) BETWEEN ${de}::date AND ${ate}::date
      GROUP BY p.marca, p.marca_id ORDER BY dinheiro DESC, campanhas DESC LIMIT 12`,
    sql`SELECT e.rede AS plataforma, sum(e.quantidade)::int AS conteudos,
        sum(e.quantidade) FILTER (WHERE e.status = 'publicado')::int AS publicados
      FROM entregas e JOIN publis p ON p.id = e.publi_id
      WHERE p.status <> 'cancelado' AND COALESCE(e.data_postagem, p.inicio, p.criado_em::date) BETWEEN ${de}::date AND ${ate}::date
      GROUP BY e.rede ORDER BY conteudos DESC`,
    sql`SELECT status, count(*)::int AS qtd FROM publis
      WHERE COALESCE(inicio, criado_em::date) BETWEEN ${de}::date AND ${ate}::date GROUP BY status`,
    sql`SELECT
        COALESCE((SELECT sum(valor) FROM parcelas WHERE pago_em BETWEEN ${de}::date AND ${ate}::date), 0) AS recebido,
        COALESCE((SELECT sum(valor) FROM parcelas WHERE vencimento BETWEEN ${de}::date AND ${ate}::date), 0) AS previsto,
        COALESCE((SELECT sum(permuta_valor) FROM publis WHERE tipo_pagamento <> 'dinheiro' AND status <> 'cancelado'
          AND COALESCE(permuta_recebida_em, inicio, criado_em::date) BETWEEN ${de}::date AND ${ate}::date), 0) AS permutas,
        (SELECT count(*)::int FROM publis WHERE status <> 'cancelado' AND COALESCE(inicio, criado_em::date) BETWEEN ${de}::date AND ${ate}::date) AS campanhas`,
  ]);

  return { ano, meses, marcas, plataformas, status, totais: totais[0] };
});
