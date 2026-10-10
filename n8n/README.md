# Resumo diário de prazos (n8n)

Workflow que, todo dia às 8h (horário de Brasília), lê o banco do app e envia um resumo do que vence nos próximos 7 dias, mais o que já está atrasado, por e-mail e por WhatsApp (Evolution API).

- `publis-resumo-diario.json`: o workflow para importar no n8n.
- `publis-aviso-vespera.json`: aviso curto, todo dia às 18h, com as entregas que vencem no dia seguinte.
- `publis-a-vencer.sql`: a consulta usada no nó "Buscar prazos" (cópia para referência).

## O que entra no resumo

Só prazos em aberto, com as mesmas regras da agenda e da visão geral do app:

| Tipo | Origem | Considerado concluído quando |
| --- | --- | --- |
| Postagem | `entregas.data_postagem` | status `publicado` |
| Entrega para a marca | `publis.fim` | campanha aprovada, agendada, publicada ou concluída |
| Publicação prevista | `publis.data_publicacao` | campanha publicada ou concluída |
| Tarefa | `tarefas.prazo` | status `feita` |
| Recebimento | `parcelas.vencimento` | `pago_em` preenchido |

Campanhas canceladas ficam de fora. Os itens são agrupados em Atrasados, Hoje, Amanhã e Próximos dias.

## Como instalar

1. No n8n: **Workflows → Import from file** e escolha `publis-resumo-diario.json`.
2. Crie as três credenciais e selecione-as nos nós:
   - **Postgres** (nó "Buscar prazos"): os dados do `DATABASE_URL` do Neon. Host `ep-....neon.tech`, porta 5432, banco, usuário e senha, **SSL: require**. Dá para usar um usuário só de leitura.
   - **SMTP** (nó "Enviar e-mail"): o servidor de e-mail que vai enviar (Gmail com senha de app, Brevo, etc.).
   - **Header Auth** (nó "Enviar WhatsApp"): nome `apikey`, valor = a API key da sua Evolution API.
3. Ajuste o nó **Configuração**:
   - `dias`: janela de aviso (padrão 7).
   - `email_de`: remetente, ex. `Agenda de publis <voce@dominio.com>`.
   - `email_para`: destinatário. Vazio = e-mail do perfil no app.
   - `whatsapp_numeros`: número com DDI e DDD (`5511999998888`), vários separados por vírgula, ou o id de um grupo (`...@g.us`). Vazio = WhatsApp do perfil no app (números com 10 ou 11 dígitos ganham o `55` automaticamente).
   - `evolution_url` e `evolution_instancia`: endereço da sua Evolution API e o nome da instância conectada.
   - `app_url`: endereço do app, usado nos links do e-mail.
   - `enviar_quando_vazio`: `true` para receber a mensagem mesmo quando não houver nada vencendo.
4. Clique em **Test workflow** (gatilho "Testar agora") para conferir e depois ative o workflow.

O fuso do workflow já vem como `America/Sao_Paulo` (Settings do workflow). O envio de WhatsApp usa o endpoint da Evolution API v2 `POST /message/sendText/{instancia}` com `{ number, text }`. Na v1 o corpo é `{ number, textMessage: { text } }`: troque o JSON Body do nó se for o seu caso.

## Aviso na véspera da entrega

`publis-aviso-vespera.json` é um segundo workflow, importado e configurado do mesmo jeito (pode reaproveitar as três credenciais). Ele roda às 18h e só envia mensagem quando existe postagem, entrega para a marca ou publicação prevista vencendo amanhã. Nos outros dias não manda nada.

- `dias` no nó Configuração: com quantos dias de antecedência avisar (1 = véspera, 2 = dois dias antes).
- Para mudar o horário, edite o nó "Todo dia às 18h".
