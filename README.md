# Agenda de publis

Sistema para uma creator UGC organizar campanhas, entregas, tarefas, marcas, materiais e recebimentos, com portfólio público opcional.

- Frontend: `public/` (HTML, CSS e JS puros em módulos, rotas por hash). Telas em `public/js/telas/`.
- API: `api/` (funções Node da Vercel) + `lib/`.
- Banco: Neon Postgres (`DATABASE_URL`). As tabelas e migrações são criadas automaticamente na primeira chamada (`lib/db.js`), sempre de forma aditiva.
- Contas: multiusuário. Campanhas, marcas, tarefas e materiais têm `usuario_id`, e toda consulta da API filtra pela conta da sessão (entregas, parcelas e histórico seguem a campanha). Dados de antes do multiusuário ficam com a primeira conta.
- Cadastro: a primeira conta é criada sem convite. As próximas precisam do código em `CODIGO_CONVITE`; sem essa variável, o cadastro fica fechado. Sessão em cookie assinado (`JWT_SECRET`).
- Portfólio público: `/portfolio/<endereço>`, escolhido em Configurações → Portfólio. `/portfolio` sem endereço continua mostrando a primeira conta. Só dados marcados como públicos; nunca valores, briefings ou notas.

Deploy: Vercel, projeto `priscila-publis`.
