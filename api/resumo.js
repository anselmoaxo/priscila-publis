import { sql } from '../lib/db.js';
import { rota, erro } from '../lib/http.js';
import { hojeJS } from '../lib/dominio.js';

export default rota(async ({ req }) => {
  if (req.method !== 'GET') throw erro(405, 'Método não permitido.');
  const hoje = hojeJS();
  const mes = hoje.slice(0, 7) + '-01';

  const [kpisRows, ativas, aprovacao, atrasadas, atividade] = await Promise.all([
    sql`SELECT
      (SELECT COALESCE(sum(valor),0) FROM parcelas WHERE pago_em IS NULL) AS aberto,
      (SELECT count(*)::int FROM parcelas WHERE pago_em IS NULL) AS aberto_qtd,
      (SELECT COALESCE(sum(valor),0) FROM parcelas WHERE pago_em IS NULL AND vencimento < ${hoje}::date) AS atrasado,
      (SELECT count(*)::int FROM parcelas WHERE pago_em IS NULL AND vencimento < ${hoje}::date) AS atrasado_qtd,
      (SELECT COALESCE(sum(valor),0) FROM parcelas WHERE date_trunc('month', pago_em) = ${mes}::date) AS recebido_mes,
      (SELECT COALESCE(sum(permuta_valor),0) FROM publis WHERE tipo_pagamento <> 'dinheiro' AND status <> 'cancelado'
         AND date_trunc('month', COALESCE(permuta_recebida_em, inicio, criado_em::date)) = ${mes}::date) AS permuta_mes,
      (SELECT count(*)::int FROM publis WHERE status NOT IN ('publicado','concluido','cancelado')) AS ativas_qtd,
      (SELECT count(*)::int FROM publis WHERE status IN ('novo_contato','em_negociacao')) AS negociacao_qtd`,
    sql`SELECT p.id, p.nome, p.marca, p.status, p.fim, p.data_publicacao,
        (SELECT count(*)::int FROM entregas e WHERE e.publi_id = p.id) AS entregas,
        (SELECT count(*)::int FROM entregas e WHERE e.publi_id = p.id AND e.status = 'publicado') AS publicadas,
        (SELECT array_agg(DISTINCT rede) FROM entregas e WHERE e.publi_id = p.id) AS plataformas
      FROM publis p WHERE p.status NOT IN ('publicado','concluido','cancelado','novo_contato','em_negociacao')
      ORDER BY p.fim NULLS LAST, p.id LIMIT 6`,
    sql`SELECT * FROM (
        SELECT 'campanha' AS origem, p.id, p.id AS publi_id, p.nome AS titulo, p.marca, p.atualizado_em::date AS desde
        FROM publis p WHERE p.status = 'aguardando_aprovacao'
        UNION ALL
        SELECT 'entrega', e.id, p.id, e.rede || ' ' || e.quantidade || ' ' || e.formato, p.marca, e.data_postagem
        FROM entregas e JOIN publis p ON p.id = e.publi_id
        WHERE e.status = 'aprovacao' AND p.status NOT IN ('cancelado','concluido')
      ) a ORDER BY desde NULLS LAST LIMIT 8`,
    sql`SELECT * FROM (
        SELECT 'tarefa' AS origem, t.id, t.publi_id, t.titulo, p.marca, t.prazo AS data
        FROM tarefas t LEFT JOIN publis p ON p.id = t.publi_id
        WHERE t.status <> 'feita' AND t.prazo < ${hoje}::date
        UNION ALL
        SELECT 'entrega', e.id, p.id, e.rede || ' ' || e.quantidade || ' ' || e.formato, p.marca, e.data_postagem
        FROM entregas e JOIN publis p ON p.id = e.publi_id
        WHERE e.status <> 'publicado' AND e.data_postagem < ${hoje}::date AND p.status NOT IN ('cancelado','concluido')
        UNION ALL
        SELECT 'campanha', p.id, p.id, 'Entrega para a marca', p.marca, p.fim
        FROM publis p WHERE p.fim < ${hoje}::date
          AND p.status IN ('novo_contato','em_negociacao','briefing_recebido','em_producao','aguardando_envio')
      ) a ORDER BY data LIMIT 10`,
    sql`SELECT h.id, h.texto, h.tipo, h.criado_em, p.id AS publi_id, p.nome, p.marca
      FROM historico h JOIN publis p ON p.id = h.publi_id
      ORDER BY h.criado_em DESC, h.id DESC LIMIT 8`,
  ]);

  return { hoje, kpis: kpisRows[0], ativas, aprovacao, atrasadas, atividade };
});
