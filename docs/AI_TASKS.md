# Criação de tarefas com IA

Na página de um projeto, **Criar com IA** abre um formulário para descrever uma
tarefa. O botão **Criar tarefa com IA** autoriza sua criação imediata. O servidor
usa `gpt-6-luna` na Responses API e grava somente depois de validar a resposta.
Pedidos vagos ou fora do escopo retornam uma pergunta; o usuário complementa o
texto e envia novamente. A tarefa confirmada pode ser aberta no painel existente.

Esta entrega integra a IA dentro do Orbit. Não publica um MCP nem conecta contas
externas do ChatGPT. O modelo é fixado no backend, sem seleção pelo navegador.

## Configuração

1. Aplique as migrations `202610160002_ai_task_requests.sql` e
   `202610160003_ai_task_creation.sql` após as migrations existentes.
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
- Somente duas ferramentas são expostas: `create_task` e `request_clarification`.
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

O limite inicial é de **10 tentativas em 10 minutos e 100 em 24 horas por usuário**,
compartilhado entre projetos e empresas. A cota é reservada antes da chamada ao
modelo e conta tentativas malsucedidas. O timeout do provedor é 30 segundos, o
limite de saída é 1.600 tokens e `reasoning.effort` é `none`.

O ledger privado armazena identidade, projeto, hash do pedido/fuso, controle da
tentativa e resultado confirmado. Não armazena o pedido original ou a resposta
bruta do provedor. Os helpers privilegiados manipulam somente esse ledger; a
inserção da tarefa continua executada com as permissões do usuário.

Repetir o mesmo pedido no formulário reutiliza `requestId`; o hash impede trocar
o texto com a mesma chave. Chamadas concorrentes ficam serializadas. Uma concessão
de 90 segundos permite recuperar execução interrompida; respostas atrasadas de
uma tentativa anterior não podem gravar. Se o HTTP cair depois do commit, repetir
o pedido recupera a tarefa existente sem chamar o modelo novamente. Acesso atual
é revalidado também nessa recuperação.

Editar o pedido ou escolher **Criar outra** inicia uma solicitação diferente.
A proteção é por solicitação, não uma deduplicação semântica de tarefas. O ID fica
no estado de interação: recarregar a página inicia outro pedido. Depois de uma
interrupção com recarga, confira a lista antes de solicitar a mesma tarefa.

## Verificação

- `npm run check:ai`: tipagem Deno do endpoint e adaptadores reais.
- `npm test`: contratos, autenticação, limites, erros do modelo, preservação do
  formulário, invalidação do cache, reenvios e envios duplicados.
- `npm run test:db`: inclui `supabase/tests/ai_tasks.test.sql`, com RLS adicional,
  isolamento, revogação, autoria, datas, histórico, quota e idempotência.
- `tests/e2e/ai-task.spec.ts`: fixture isolada da interface com respostas
  interceptadas, teclado e layouts desktop/celular; não consome créditos.

Referências: [modelo](https://developers.openai.com/api/docs/models/gpt-6-luna),
[function calling](https://developers.openai.com/api/docs/guides/function-calling),
[secrets das funções](https://supabase.com/docs/guides/functions/secrets),
[runtime nativo local](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).
