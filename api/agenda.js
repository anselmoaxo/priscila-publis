import { sql } from '../lib/db.js';
import { rota, erro, data } from '../lib/http.js';

// Everything with a date, normalized into calendar events.
export default rota(async ({ req, query }) => {
  if (req.method !== 'GET') throw erro(405, 'Método não permitido.');
  const de = data(query.de);
  const ate = data(query.ate);
  if (!de || !ate) throw erro(400, 'Informe o período.');

  const eventos = await sql`
    SELECT * FROM (
      SELECT 'entrega-' || e.id AS id, 'publicacao' AS tipo, e.data_postagem AS data, NULL::text AS hora,
        e.quantidade || ' ' || e.formato AS titulo, e.rede AS plataforma, e.status, (e.status = 'publicado') AS concluido,
        p.id AS publi_id, p.nome AS campanha, p.marca, p.status AS campanha_status, 'entrega' AS origem, e.id AS origem_id, NULL::numeric AS valor
      FROM entregas e JOIN publis p ON p.id = e.publi_id
      WHERE e.data_postagem BETWEEN ${de}::date AND ${ate}::date AND p.status <> 'cancelado'
      UNION ALL
      SELECT 'prazo-' || p.id, 'entrega', p.fim, NULL, 'Entrega para a marca', NULL, p.status,
        p.status IN ('aprovado','agendado','publicado','concluido'),
        p.id, p.nome, p.marca, p.status, 'campanha', p.id, NULL
      FROM publis p WHERE p.fim BETWEEN ${de}::date AND ${ate}::date AND p.status <> 'cancelado'
      UNION ALL
      SELECT 'pub-' || p.id, 'publicacao', p.data_publicacao, NULL, 'Publicação prevista', NULL, p.status,
        p.status IN ('publicado','concluido'),
        p.id, p.nome, p.marca, p.status, 'campanha', p.id, NULL
      FROM publis p WHERE p.data_publicacao BETWEEN ${de}::date AND ${ate}::date AND p.status <> 'cancelado'
      UNION ALL
      SELECT 'tarefa-' || t.id,
        CASE t.tipo WHEN 'gravacao' THEN 'gravacao' WHEN 'aprovacao' THEN 'aprovacao'
          WHEN 'publicacao' THEN 'publicacao' WHEN 'agendamento' THEN 'publicacao'
          WHEN 'entrega' THEN 'entrega' ELSE 'tarefa' END,
        t.prazo, t.hora, t.titulo, NULL, t.status, (t.status = 'feita'),
        p.id, p.nome, p.marca, p.status, 'tarefa', t.id, NULL
      FROM tarefas t LEFT JOIN publis p ON p.id = t.publi_id
      WHERE t.prazo BETWEEN ${de}::date AND ${ate}::date
      UNION ALL
      SELECT 'parcela-' || pa.id, 'pagamento', pa.vencimento, NULL,
        'Recebimento ' || pa.numero || '/' || (SELECT count(*) FROM parcelas x WHERE x.publi_id = pa.publi_id),
        NULL, CASE WHEN pa.pago_em IS NOT NULL THEN 'pago' ELSE 'aberto' END, (pa.pago_em IS NOT NULL),
        p.id, p.nome, p.marca, p.status, 'parcela', pa.id, pa.valor
      FROM parcelas pa JOIN publis p ON p.id = pa.publi_id
      WHERE pa.vencimento BETWEEN ${de}::date AND ${ate}::date
    ) ev
    ORDER BY data, hora NULLS LAST, tipo, marca`;

  return { eventos };
});
