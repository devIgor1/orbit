# Criação de tarefas com IA

Na página de um projeto, **Criar com IA** abre um formulário para descrever uma
tarefa. O botão **Criar tarefa com IA** autoriza sua criação imediata. O servidor
usa `gpt-6-luna` na Responses API e grava somente depois de validar a resposta.
Pedidos vagos recebem uma orientação fixa para completar os dados. Pedidos fora
do escopo são recusados sem criar tarefa. O texto permanece no formulário para
revisão. A tarefa confirmada pode ser aberta no painel existente.

Esta entrega integra a IA dentro do Orbit. Não publica um MCP nem conecta contas
externas do ChatGPT. O modelo é fixado no backend, sem seleção pelo navegador.

## Configuração

1. Aplique as migrations em ordem, incluindo `202610160002_ai_task_requests.sql`,
   `202610160003_ai_task_creation.sql`, `202610160004_ai_task_workspace_quota.sql`
   e `202610160005_ai_task_rejections.sql`.
2. No projeto Supabase, em **Edge Functions > Secrets**, cadastre
   `OPENAI_API_KEY` com uma chave do projeto OpenAI autorizado a usar `gpt-6-luna`.
   Não coloque o valor no Git, em variáveis `VITE_*`, no frontend, em prompts,
   em logs ou no corpo do PR. A chave não é enviada a quem usa o Orbit.
3. Publique `create-ai-task`. O pipeline de produção já aplica migrations e
   publica todas as funções antes do frontend, após merge na `main`.
4. Confira o fluxo com uma conta membro e um projeto de teste autorizado. Sem o
   segredo, a interface informa que a integração ainda precisa ser ativada.

A função lê `SUPABASE_URL` e `SUPABASE_ANON_KEY` do runtime Supabase. A chave
pública identifica o projeto; a autorização das operações depende do JWT do
usuário. **A função não usa `service_role`.** `verify_jwt = false` desliga apenas
a verificação legada do gateway: o handler exige Bearer e chama `auth.getUser`
antes de qualquer consulta de contexto ou chamada à OpenAI.

Para desenvolvimento, use somente o Supabase local. Guarde a chave em
`.supabase/ai-functions.env`, separado das variáveis públicas do Vite:

```dotenv
OPENAI_API_KEY=sua_chave_aqui
```

O diretório `.supabase/` é ignorado pelo Git e bloqueado pelo servidor Vite,
inclusive em imports `?raw`. Arquivos de credenciais locais e outros arquivos
`.env` também são bloqueados. Não coloque segredos em `public/` nem os importe
no código. Após salvar ou trocar a chave, reinicie o processo da função:

```sh
npx supabase functions serve create-ai-task --env-file .supabase/ai-functions.env
```

Não execute os testes de escrita contra o Supabase hospedado. Os testes de
provedor usam respostas simuladas; chamadas reais à OpenAI consomem créditos e
devem usar dados próprios de teste.

### Teste antes do merge

O frontend precisa apontar para o Supabase **local**, com as migrations desta
branch aplicadas. Subir apenas o Vite usando a conexão hospedada não disponibiliza
o backend novo. Com Docker funcionando, use `npm run db:start`,
`npm run db:seed` e o comando de `functions serve` acima. O provisionador grava
somente a URL/chave pública em `.env.local`; o login de demonstração fica em
`.demo-credentials.json`, ignorado pelo Git e bloqueado pelo Vite.

Como alternativa, o Supabase CLI 2.121.0 oferece runtime nativo experimental em
Linux, inclusive no Ubuntu/WSL. Use um diretório local separado, com cópias do
código dentro dele: o runtime recusa funções cujos links simbólicos escapem da
raiz. Preserve as migrations, habilite `edge_runtime` na configuração local e
inicie com `SUPABASE_EXPERIMENTAL_STACK=1` e `supabase start --runtime native`.
Nunca use `db push --linked` nem publique secrets remotos para este teste.

No ambiente Ubuntu/WSL preparado para esta entrega, Auth, PostgREST, PostgreSQL
17, Realtime e Edge Runtime são serviços reais. Os 33 testes SQL passaram também
nesse stack. Uma chamada real à OpenAI criou uma tarefa e o reenvio recuperou o
mesmo registro; chamadas anônimas e a projeto sem acesso foram recusadas.

## Contratos e permissões

- Entrada: `requestId`, `workspaceId`, `projectId`, `prompt` (10–3.000 caracteres)
  e fuso IANA. Campos adicionais, como autor, modelo ou chave, são recusados.
- O projeto fica fixo na página aberta. O servidor busca seu título e até 200
  membros ativos pelo cliente autenticado. Se o contexto ultrapassar esse limite,
  retorna erro explícito; não trunca silenciosamente a equipe.
- O modelo recebe apenas pedido, data atual, fuso, título/ID do projeto e
  nomes/IDs de membros. Não recebe tokens, chaves, e-mails, comentários nem o
  histórico do projeto. `store: false` desabilita o armazenamento da resposta
  pela Responses API; não representa uma promessa de retenção zero do provedor.
- As instruções privilegiadas são fixas. `reference_context` (projeto, membros e
  data) e `task_request` são serializados como dados em mensagens `user`; nenhum
  nome, título ou prompt é interpolado em mensagens `developer` ou `instructions`.
- Somente três ferramentas são expostas: `create_task`, `request_clarification`
  e `reject_request`. Recusas e esclarecimentos aceitam apenas motivos enumerados;
  as mensagens vêm do código do Orbit, sem resposta livre escrita pelo modelo.
  Respostas incompletas, múltiplas chamadas, ferramentas desconhecidas, datas
  inválidas ou responsáveis fora do contexto são recusados. Zod valida de novo
  os argumentos, mesmo com schema estrito na OpenAI.
- Toda tarefa começa em `todo`. Prioridade padrão `medium`; responsável e prazo
  podem ficar vazios. Título: 3–160 caracteres, descrição: até 5.000.
- A RPC de criação é **SECURITY INVOKER**. Preserva RLS, grants de colunas e
  triggers de vínculos ativos, inclusive se uma política nova restringir escrita.
  `created_by` vem de `auth.uid()`. Administradores e colaboradores mantêm as
  permissões que já possuem para criar tarefas; cargo profissional não concede
  acesso. Revogação, empresa/projeto na lixeira e atribuição inválida bloqueiam a
  operação, mesmo que ocorram enquanto o modelo está respondendo.
- Tarefa, histórico e resultado idempotente são confirmados na mesma transação.
  Nenhum sucesso depende apenas da resposta do modelo. O cache é invalidado
  depois da confirmação, com identidade e workspace nas chaves.

## Uso, reenvio e recuperação

Os limites são cumulativos, em janelas móveis:

| Escopo | Em 10 minutos | Em 24 horas |
| --- | ---: | ---: |
| Usuário, somando suas empresas e projetos | 10 | 100 |
| Empresa (`workspace`), somando membros e projetos | 50 | 500 |

A cota é reservada no PostgreSQL antes da chamada ao modelo. Locks transacionais
por usuário e depois por empresa impedem ultrapassar a cota com chamadas simultâneas.
Falhas, recusas e esclarecimentos contam como tentativas; chamadas bloqueadas antes
da reserva não contam nem chegam à OpenAI. Excesso da empresa retorna HTTP 429 com
`AI_WORKSPACE_RATE_LIMITED`. O cadastro manual continua disponível.

Os valores são fixos na função `prepare_ai_task_request`; alterações devem passar
por uma nova migration e testes. São limites de tentativas, não de dólares. O
timeout do provedor é 30 segundos, o limite de saída é 1.600 tokens e
`reasoning.effort` é `none`.

Na migração, tentativas antigas continuam contando para o usuário, mas ficam com
`workspace_id` nulo porque a empresa não era registrada. A cota por empresa começa
a contabilizar as novas reservas; após 24 horas não há tentativas anteriores na
janela. Nenhum histórico recebe uma empresa presumida.

O ledger privado armazena identidade, projeto, hash do pedido/fuso, controle da
tentativa e resultado confirmado. Não armazena o pedido original ou a resposta
bruta do provedor. Os helpers privilegiados manipulam somente esse ledger; a
inserção da tarefa continua executada com as permissões do usuário.

Repetir o mesmo pedido no formulário reutiliza `requestId`; o hash impede trocar
o texto com a mesma chave. Chamadas concorrentes ficam serializadas. Uma concessão
de 90 segundos permite recuperar execução interrompida; respostas atrasadas de
uma tentativa anterior não podem gravar. Se o HTTP cair depois do commit, repetir
o pedido recupera o resultado existente (tarefa, esclarecimento ou recusa) sem
chamar o modelo ou consumir nova cota, mesmo se o limite foi atingido depois.
Acesso atual é revalidado também nessa recuperação.

Editar o pedido ou escolher **Criar outra** inicia uma solicitação diferente.
A proteção é por solicitação, não uma deduplicação semântica de tarefas. O ID fica
no estado de interação: recarregar a página inicia outro pedido. Depois de uma
interrupção com recarga, confira a lista antes de solicitar a mesma tarefa.

## Escopo e limites das proteções

Perguntas gerais e pedidos para executar o trabalho são `out_of_scope`; consultas,
alterações, exclusões e outro projeto são `unsupported_action`; tentativas de mudar
regras, assumir outro papel ou obter segredos são `instruction_override`. Pedidos
mistos também devem ser recusados. Falta de detalhes, várias tarefas ou ambiguidade
de responsável/data recebem esclarecimento com motivo fixo.

A classificação semântica depende do modelo e pode errar. Separar instruções dos
dados reduz ataques de prompt, mas não os elimina. Uma primeira tentativa fora do
escopo ainda consome tokens para ser classificada. As cotas, os tamanhos máximos e
as permissões são controles determinísticos do backend e independem dessa decisão.

O modelo não recebe ferramentas para executar SQL, consultar arbitrariamente o
banco ou editar/excluir registros. A RPC usa SQL fixo com parâmetros e RLS. Termos
como SQL injection são permitidos em uma tarefa legítima; não se usa uma lista de
palavras proibidas como barreira de segurança.

## Verificação

- `npm run check:ai`: tipagem Deno do endpoint e adaptadores reais.
- `npm test`: contratos, autenticação, limites, erros do modelo, preservação do
  formulário, invalidação do cache, reenvios e envios duplicados.
- `npm run test:db`: inclui `supabase/tests/ai_tasks.test.sql`, com RLS adicional,
  isolamento, revogação, autoria, datas, histórico, quota e idempotência. Os novos
  `ai_task_rejections.test.sql` e `ai_task_workspace_quota.test.sql` cobrem recusas,
  consumo após falha, janelas, isolamento entre empresas e agregação entre membros.
- `npm run test:ai:concurrency`: dois usuários em projetos diferentes disputam a
  última vaga das cotas de 10 minutos e 24 horas. Padrão: Docker local
  `supabase_db_orbit`. Para PostgreSQL nativo local, configure `ORBIT_AI_TEST_DB_PORT`
  e opcionalmente `ORBIT_AI_TEST_PSQL`; credenciais locais via `PGPASSWORD`/pgpass,
  nunca no repositório. O host é sempre `127.0.0.1`.
- O CI executa os três arquivos SQL de IA e o teste de concorrência em Supabase
  local, sem secrets hospedados e sem chamadas à OpenAI.
- `tests/e2e/ai-task.spec.ts`: fixture isolada da interface com respostas
  interceptadas, teclado, recusa e limite da empresa em desktop/celular; não consome
  créditos. Testes simulados verificam o contrato e a aplicação das decisões, não
  medem a precisão de classificação do modelo real.
- `tests/task-title-safety.test.tsx` e `tests/ai-task-dialog.test.tsx`: títulos com
  `<b>` e `<img onerror=…>` permanecem texto no quadro, lista, detalhe, notificação
  e confirmação. A busca de tarefas filtra os mesmos componentes do quadro/lista.
  Esta versão não implementa exportação CSV/PDF. Guardar tags como texto no banco
  não implica interpretá-las como HTML; novos destinos devem preservar essa regra.

Para comparar relatos de testes, registre a URL do frontend, a URL do backend e a
versão publicada da função, sem tokens. Um preview do frontend pode apontar para
um backend de outra versão. No novo backend, esclarecimentos de solicitações novas
usam mensagens fixas; resultados antigos do ledger podem conter mensagens geradas
antes desta mudança. Não confunda reenvio idempotente com uma nova avaliação.

Referências: [modelo](https://developers.openai.com/api/docs/models/gpt-6-luna),
[function calling](https://developers.openai.com/api/docs/guides/function-calling),
[secrets das funções](https://supabase.com/docs/guides/functions/secrets),
[runtime nativo local](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).
