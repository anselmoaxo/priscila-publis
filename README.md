# Agenda de publis

Sistema para uma creator UGC organizar campanhas, entregas, tarefas, marcas, materiais e recebimentos, com portfólio público opcional.

- Frontend: `public/` (HTML, CSS e JS puros em módulos, rotas por hash). Telas em `public/js/telas/`.
- API: `api/` (funções Node da Vercel) + `lib/`.
- Banco: Neon Postgres (`DATABASE_URL`). As tabelas e migrações são criadas automaticamente na primeira chamada (`lib/db.js`), sempre de forma aditiva.
- Login: usuária única; o primeiro acesso cria a conta. Sessão em cookie assinado (`JWT_SECRET`).
- Portfólio público: `/portfolio` (só dados marcados como públicos; nunca valores, briefings ou notas).

Deploy: Vercel, projeto `priscila-publis`.
