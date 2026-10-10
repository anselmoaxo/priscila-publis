-- Prazos abertos que vencem até hoje + $1 dias (inclui os atrasados).
-- Mesmas regras da agenda e da visão geral do app. Sempre devolve 1 linha.
WITH hoje AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d),
itens AS (
  SELECT 'entrega' AS tipo, e.data_postagem AS data, NULL::text AS hora,
    e.rede || ' · ' || e.quantidade || ' ' || e.formato AS titulo,
    p.id AS publi_id, p.nome AS campanha, p.marca, NULL::numeric AS valor
  FROM entregas e JOIN publis p ON p.id = e.publi_id
  WHERE e.status <> 'publicado' AND p.status NOT IN ('cancelado','concluido')
    AND e.data_postagem <= (SELECT d FROM hoje) + $1::int
  UNION ALL
  SELECT 'prazo_marca', p.fim, NULL, 'Entrega para a marca', p.id, p.nome, p.marca, NULL
  FROM publis p
  WHERE p.status NOT IN ('aprovado','agendado','publicado','concluido','cancelado')
    AND p.fim <= (SELECT d FROM hoje) + $1::int
  UNION ALL
  SELECT 'publicacao', p.data_publicacao, NULL, 'Publicação prevista', p.id, p.nome, p.marca, NULL
  FROM publis p
  WHERE p.status NOT IN ('publicado','concluido','cancelado')
    AND p.data_publicacao <= (SELECT d FROM hoje) + $1::int
  UNION ALL
  SELECT 'tarefa', t.prazo, t.hora, t.titulo, p.id, p.nome, p.marca, NULL
  FROM tarefas t LEFT JOIN publis p ON p.id = t.publi_id
  WHERE t.status <> 'feita' AND (p.id IS NULL OR p.status NOT IN ('cancelado','concluido'))
    AND t.prazo <= (SELECT d FROM hoje) + $1::int
  UNION ALL
  SELECT 'recebimento', pa.vencimento, NULL,
    'Recebimento ' || pa.numero || '/' || (SELECT count(*) FROM parcelas x WHERE x.publi_id = pa.publi_id),
    p.id, p.nome, p.marca, pa.valor
  FROM parcelas pa JOIN publis p ON p.id = pa.publi_id
  WHERE pa.pago_em IS NULL AND p.status <> 'cancelado'
    AND pa.vencimento <= (SELECT d FROM hoje) + $1::int
)
SELECT
  to_char((SELECT d FROM hoje), 'YYYY-MM-DD') AS hoje,
  (SELECT json_build_object('nome', u.nome, 'email', u.email, 'whatsapp', u.whatsapp)
     FROM usuarios u ORDER BY u.id LIMIT 1) AS perfil,
  COALESCE((SELECT json_agg(json_build_object(
      'tipo', i.tipo, 'data', to_char(i.data, 'YYYY-MM-DD'), 'hora', i.hora, 'titulo', i.titulo,
      'publi_id', i.publi_id, 'campanha', i.campanha, 'marca', i.marca, 'valor', i.valor,
      'dias', i.data - (SELECT d FROM hoje))
    ORDER BY i.data, i.hora NULLS LAST, i.marca)
    FROM itens i), '[]'::json) AS itens;
