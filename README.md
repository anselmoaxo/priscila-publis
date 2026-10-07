# Priscila · Publis

Sistema para controlar as publis (parcerias), entregas e contas a receber — dinheiro e permutas.

- Frontend: `public/` (HTML/CSS/JS puro, rotas por hash)
- API: `api/` (funções Node da Vercel) + `lib/`
- Banco: Neon Postgres (`DATABASE_URL`); as tabelas são criadas automaticamente na primeira chamada
- Login: usuária única; o primeiro acesso cria a conta. Sessão em cookie assinado (`JWT_SECRET`)

Deploy: Vercel, projeto `priscila-publis`.
