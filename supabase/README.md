# Backend do Orbit

O frontend consulta Supabase Auth, Data API e funções SQL reais. Os dados de
demonstração são persistidos no PostgreSQL; não há fixtures no fluxo da aplicação.

## Inicialização local (opcional, com Docker)

Com Docker e Node instalados, na raiz do projeto:

```powershell
npx supabase start -x realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor
node supabase/provision-demo.mjs
npm run db:types
npx supabase test db
npm run dev
```

O provisionador aceita exclusivamente a instância local do Orbit na porta 55521.
Ele cria quatro contas pelo Auth Admin API, insere o seed e grava `.env.local` com
as variáveis públicas. E-mail e senha aleatória ficam em `.demo-credentials.json`,
ignorado pelo Git. Nenhuma senha ou chave administrativa é incluída no frontend.
O comando é idempotente enquanto os dados e o arquivo de credenciais forem mantidos.

Portas: API 55521, PostgreSQL 55522, Studio 55523, e-mail local 55524. O projeto
Docker `orbit` é independente de outras instâncias Supabase. Para interromper
somente esta instância: `npx supabase stop` executado nesta pasta de projeto.

## Indicadores e acesso

- Projetos ativos: status `active` no workspace.
- Tarefas pendentes: todos os status diferentes de `done`.
- Atrasadas: prazo anterior à data atual em `America/Sao_Paulo`, exceto concluídas.
- Concluídas: status `done` e conclusão dentro do período escolhido.
- Evolução: criação e conclusão por dia no período (7, 30 ou até 90 dias).
- Distribuição: todas as tarefas do workspace por etapa, incluindo valores zero.
- Carga por membro: tarefas atribuídas não concluídas; o total concluído é separado.
- Progresso sem tarefas: a UI deve apresentar explicitamente ausência de tarefas.

A sessão seleciona o primeiro vínculo do usuário por `workspace_members.created_at`
(com desempate por `workspace_id`). Esta versão não contém seletor de múltiplos
workspaces. A escolha é resolvida por consulta real após a autenticação.

RLS restringe leituras ao workspace, criação/edição de projetos a administradores,
edição de perfil ao próprio usuário e tarefas/comentários a membros. Chaves
estrangeiras compostas impedem vínculos entre workspaces. Atividades são gravadas
por triggers na transação; timestamps de conclusão também são calculados no banco.

## Hospedagem

O Supabase hospedado atende o frontend diretamente, sem Docker no computador do
desenvolvedor ou na Vercel. Com a CLI autenticada, vincule o projeto e confira as
migrations antes de aplicá-las:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push --linked --dry-run --skip-vault
npx supabase db push --linked --skip-vault
npx supabase migration list --linked
```

Esses comandos aplicam a estrutura e registram o histórico de migrations. Eles não
copiam os registros nem as contas do banco local. O seed exige os quatro e-mails
descritos no provisionador e é exclusivo da demonstração local; não execute
`npm run db:seed` para configurar a nuvem, pois ele também sobrescreve `.env.local`.

Crie a conta pelo Supabase Auth Admin ou pelo painel Authentication. O trigger cria
seu perfil. Crie o workspace e o vínculo em `workspace_members` com papel `admin`
por uma operação administrativa; as políticas impedem que o navegador crie esses
vínculos. Essa primeira configuração já foi concluída no projeto hospedado deste
ambiente. A senha gerada foi gravada somente em `.cloud-credentials.json`, ignorado
pelo Git; chaves administrativas foram usadas apenas em memória.

Configure a URL e a chave pública em `.env.local` para desenvolvimento e nas
variáveis da Vercel para publicação. Defina o Site URL e os redirecionamentos em
Authentication depois de conhecer o domínio publicado. O login atual usa senha;
fluxos de convite, confirmação e recuperação por e-mail exigem configuração e
validação próprias antes de serem oferecidos na interface.

Para conferir os tipos do projeto vinculado sem depender do Docker, no PowerShell:

```powershell
$remoteDatabaseTypes = npx supabase gen types typescript --linked --schema public
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar os tipos; arquivo anterior preservado.' }
$remoteDatabaseTypes | Set-Content -Encoding utf8 src/lib/supabase/database.generated.ts
```

Os testes de banco, as capturas de demonstração e os E2E autenticados existentes
continuam restritos ao ambiente local. Não aponte testes de escrita para produção.

`database.generated.ts` deve ser regenerado do schema após cada migration. O arquivo
`database.types.ts` contém aliases de domínio derivados dos tipos gerados. O RPC do
dashboard retorna JSON e é validado por Zod no serviço antes de chegar à interface.
O comando `npm run db:types` grava a saída da CLI nesse arquivo. No PowerShell, uma
alternativa explícita em UTF-8 é `npx supabase gen types typescript --local | Set-Content -Encoding utf8 src/lib/supabase/database.generated.ts`.
O RPC do diretório também é validado, incluindo nulidade de avatar e cargo. A API de
introspecção do PostgreSQL não informa a nulidade de colunas retornadas por função;
os aliases desses campos herdam o contrato da tabela `profiles` gerada.
