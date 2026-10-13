# Teste completo de tarefa → PR

O teste opt-in `tests/e2e/github-full-flow.spec.ts` usa o login real, os handlers
da API/webhook, o worker e as migrations do Orbit. Somente as respostas externas
do GitHub e a tela de consentimento OAuth são simuladas. Não cria PRs, faz merges
nem publica comentários no GitHub real.

O servidor de teste aceita apenas o Supabase local em `127.0.0.1:55521`, escuta em
`127.0.0.1:55530` e bloqueia destinos externos inesperados. Os controles de teste
existem somente em `tests/support`; não fazem parte do frontend ou das funções
publicadas. Use um banco local isolado: o worker processa sua fila de vínculos.

## Executar com Supabase local

Prepare o banco com todas as migrations e as contas do seed:

```powershell
npm run db:start
npm run db:seed
```

O provisionador grava `.env.local` apontando ao ambiente local, conforme descrito
em [GITHUB_APP.md](GITHUB_APP.md). Preserve uma configuração existente antes de
provisionar um ambiente novo.

No primeiro terminal, a partir da raiz do projeto, execute com Node 24:

```powershell
node --experimental-transform-types tests/support/github-flow-server.ts
```

Em outro terminal, também na raiz:

```powershell
$localBackend = npx supabase status -o json | ConvertFrom-Json
$env:VITE_SUPABASE_URL = 'http://127.0.0.1:55530'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = $localBackend.ANON_KEY
$env:ORBIT_E2E_PORT = '5178'
$env:ORBIT_GITHUB_FLOW_TESTS = '1'
npm run test:e2e -- tests/e2e/github-full-flow.spec.ts --workers=1
```

Execute com um worker: os cenários compartilham a instalação e os estados do
GitHub simulado. Os projetos criados por esse teste são removidos após cada caso.
Os dois repositórios de teste permanecem no workspace local para novas rodadas.

O teste de recuperação do worker também pode ser executado separadamente:

```powershell
$env:ORBIT_GITHUB_DB_TESTS = '1'
npm test -- tests/github-pipeline.test.ts
```

## Cobertura

- Login, descoberta de instalação, consentimento e escolha explícita de repositórios.
- Criação de projeto e tarefa pela interface e vínculo de PR sem associação do projeto.
- Rascunho → revisão → fechado sem merge → reaberto → integrado, com status e histórico persistidos.
- Atualização automática da tela e do status da tarefa sem recarregar a página.
- Comentário aceito pelo GitHub com resposta perdida, recuperação por reconciliação,
  dois workers concorrentes e recriação do vínculo sem novo comentário.
- Tarefas do mesmo projeto em repositórios diferentes; revisão dos repositórios
  identifica e bloqueia a remoção daqueles em uso.
- API sem sessão, assinatura de webhook inválida, indisponibilidade do GitHub,
  revogação de acesso e remoção do vínculo sem afetar a outra tarefa.
- Interface em desktop e celular, com verificações adicionais de teclado,
  paginação, filtros, persistência após reload e falhas nos testes adjacentes.

## Backend nativo alternativo

Quando o Docker não estiver disponível, `ORBIT_LOCAL_SUPABASE_CONFIG` pode apontar
para um JSON local ignorado pelo Git, com `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`
e `credentialsPath`. A URL deve ser exatamente `http://127.0.0.1:55521` e o arquivo
de credenciais deve conter `email` e `password` de uma conta local. Nos E2E, também
é obrigatório definir explicitamente `VITE_SUPABASE_URL` para o backend local.
As chaves administrativas nunca são variáveis `VITE_*`.

A rodada de 13/10/2026 usou PostgreSQL 18.3, PostgREST 16.4 e Supabase Auth 2.197.0
em processos locais, com 23 migrations aplicadas. A compilação Windows do Auth
teve somente o listener TCP adaptado para não usar `SO_REUSEPORT` do Unix.
Os handlers TypeScript foram executados no servidor Node de teste; a verificação
de tipos das funções Deno foi executada separadamente. O Supabase padrão do
projeto usa PostgreSQL 17 e Edge Runtime: esta rodada não equivale a um deploy
nesse ambiente nem a uma validação de OAuth, webhooks e PRs reais.

As asserções SQL usam pgTAP e transações revertidas em um banco separado dos E2E,
com o seed exigido por `permissions.test.sql`. Evidências da rodada ficam em
`test-results/full-flow-tools` e `test-results/full-flow-browser-*`, ignorados pelo Git.
