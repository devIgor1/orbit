# Notificações no Orbit

O sino no cabeçalho mostra as notificações não lidas do usuário no workspace ativo.
O painel permite consultar todas ou somente não lidas, carregar páginas anteriores,
marcar uma ou todas como lidas e abrir a tarefa relacionada. A leitura persiste no
backend e sincroniza entre abas. O histórico começa após a instalação das migrations;
atividades antigas não são convertidas em avisos.

## Convites para a conta

O sino também consulta os convites pendentes do e-mail confirmado da conta, mesmo
quando o usuário está em outra empresa. Eles aparecem em “Convites para você”,
com o nome da empresa, validade e acesso à tela existente de aceitação. Convites
já enviados aparecem na próxima consulta; não há backfill, reenvio de e-mail nem
necessidade de pertencer à empresa para receber o aviso.

O contador soma **atividades não lidas do workspace + convites pendentes da conta**.
O nome acessível do sino diferencia as duas quantidades. Abrir um convite não o
aceita. Filtros e “Marcar todas como lidas”, na seção de atividades, não descartam
convites: eles saem após aceitação, cancelamento ou expiração. A prévia mostra até
três convites e oferece a lista completa quando houver mais.

A migration `202610150004_invitation_notifications.sql` envia um sinal sem dados de negócio pelo
canal privado `invitations:<user_id>` quando a criação, renovação, cancelamento,
aceitação ou exclusão altera a lista. Somente contas com o e-mail confirmado
recebem o sinal. A RPC existente `my_invitations` revalida e-mail, status e validade
e não concede acesso aos projetos da empresa convidante. Seu contrato público
não mudou; os tipos gerados permanecem válidos.

O sino e a tela de empresas compartilham a consulta por identidade e atualizam ao
assinar/reconectar, voltar ao foco e a cada 60 segundos. Isso também remove convites
que expiram sem uma escrita no banco. Erros de consulta e conexão são exibidos.
O Supabase pode acrescentar o ID técnico da mensagem ao payload vazio enviado pelo
trigger. Os canais de tarefas e convites reutilizam o mesmo cliente/WebSocket do Supabase.
Não há nova Edge Function. Aplicar a migration antes de publicar o frontend.

Testes adicionais: `tests/invitation-notifications.test.tsx`,
`supabase/tests/invitation_notifications.test.sql` e
`tests/e2e/invitation-notifications.spec.ts` (incluído em `npm run test:notifications`).

## Eventos e destinatários

| Evento confirmado | Quem recebe |
| --- | --- |
| Criação de tarefa com responsável ou troca de responsável | Novo responsável |
| Novo comentário | Criador e responsável atual da tarefa |
| Alteração de status | Criador e responsável atual da tarefa |

O autor da ação é excluído. Uma pessoa com os dois papéis recebe uma notificação por
evento. Membros removidos não recebem novos avisos nem consultam os existentes.
Salvar a mesma atribuição/status não gera outro aviso. Edições de título, descrição
ou prazo não notificam nesta versão. Operações sem usuário autenticado usam o nome
“Orbit”; na criação, o criador da tarefa identifica o autor. A exclusão da tarefa
remove suas notificações. Os nomes, título e etapa registrados retratam o evento.

## Persistência, autorização e entrega

- `202610150001_notifications.sql`: tabela, índices, RLS e RPCs de listagem/leitura.
- `202610150002_notification_events.sql`: triggers de tarefas e comentários;
  gravam os avisos na mesma transação da operação original.
- `202610150003_notification_realtime.sql`: Broadcast privado e autorização por
  destinatário e vínculo ativo no workspace.

O cliente não insere, edita livremente nem exclui notificações. As RPCs verificam
usuário e vínculo a cada chamada, inclusive após revogação de acesso. A leitura
individual exige um registro pertencente ao destinatário; inexistência não é sucesso.
A operação em lote retorna a quantidade afetada e aceita zero como no-op idempotente.
Seu limite temporal vem do snapshot do servidor, preservando avisos posteriores.

A listagem retorna 20 registros por página, com cursor composto por data e ID. O
contador inclui todas as não lidas do destinatário no workspace, independentemente
da página. Não há contagem derivada apenas dos itens carregados.

O canal `notifications:<workspace_id>:<user_id>` recebe somente `inbox_changed` com
payload vazio. O cliente então consulta os dados autorizados. Não há conteúdo de
tarefa/comentário no socket nem permissão adicionada para clientes enviarem mensagens.
Isso também evita expor conteúdo a um canal cuja autorização foi obtida antes da
remoção do membro. A política deve coexistir apenas com outras políticas restritas
de Realtime; políticas permissivas genéricas no mesmo schema não devem ser adicionadas.

A interface consulta novamente após assinatura/reconexão, foco e a cada 60 segundos.
Falha no socket aparece no painel, com ação para reconectar. Falha de consulta ou
escrita mostra erro explícito, sem transformar falha em zero avisos ou leitura
confirmada. Ao trocar usuário/workspace, o canal anterior é removido e o cache segue
as regras de isolamento do aplicativo. O painel e a navegação funcionam por teclado.

Referências: [Broadcast](https://supabase.com/docs/guides/realtime/broadcast) e
[autorização de Realtime](https://supabase.com/docs/guides/realtime/authorization).

## Instalação

As três migrations devem ser aplicadas, na ordem, antes de publicar o frontend.
Os tipos de `database.generated.ts` foram gerados a partir do schema migrado.
Não há Edge Function nova, segredo adicional ou envio de e-mail nessa entrega.

No Supabase local, `supabase/config.toml` habilita Realtime e `npm run db:start`
mantém esse serviço. Uma stack já iniciada sem Realtime precisa ser reiniciada
para incorporar a configuração. Use `supabase migration up --local` para aplicar
as migrations pendentes; não é necessário resetar o banco nem executar seed em
um banco existente. No hospedado, publicar as migrations e conferir o serviço
Realtime faz parte de uma publicação separada.

## Validação

- `npm test -- --maxWorkers=2`: contratos, erros, estado de leitura, teclado,
  invalidação e ciclo de vida do canal.
- `supabase/tests/notifications.test.sql`: eventos, destinatários, deduplicação,
  RLS, revogação, paginação e confirmação das escritas. Executar com as demais
  suítes SQL em um Supabase local de testes.
- `npm run test:notifications`: testes com Auth, PostgreSQL, PostgREST e Realtime
  reais, em 1280, 900 e 320 px. Incluem duas abas, três eventos, leitura persistente,
  navegação entre tarefas do mesmo projeto, paginação, erro de escrita e recusa
  de assinatura do canal de outro usuário. Somente a escrita recusada é simulada.

Os E2E usam exclusivamente um Supabase isolado em `http://127.0.0.1:55621` e Vite
na porta 5187; recusam hosts remotos e não usam o `.env` para escolher o backend.
Prepare essa stack com as migrations do repositório e contas locais confirmadas
`marina@orbit.local` e `rafael@orbit.local`, com a mesma senha exclusiva de testes.
Defina `ORBIT_NOTIFICATION_TEST_CONFIG` como o caminho do JSON obtido por
`supabase status --workdir <ambiente-isolado> -o json`. Na mesma pasta, crie
`credentials.json` com `{ "password": "<senha-local>" }`. Esses arquivos ficam
fora do repositório. Os testes criam workspaces próprios e removem seus dados ao
terminar; não devem ser executados contra dados de uso diário.

As capturas são gravadas em `test-results/notifications`. A suíte padrão de E2E
exclui esses testes, pois precisam dessa configuração isolada explícita.
