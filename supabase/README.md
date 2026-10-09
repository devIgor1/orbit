# Backend local do Orbit

O frontend consulta Supabase Auth, Data API e funções SQL reais. Os dados de
demonstração são persistidos no PostgreSQL; não há fixtures no fluxo da aplicação.

## Inicialização

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

Aplique as migrations no projeto Supabase escolhido e provisione usuários reais
pelo Auth. O seed exige os quatro e-mails descritos no provisionador; adapte-o a
contas autorizadas para seu ambiente. Configure apenas URL e chave pública no
frontend. A rotina de provisionamento local não deve ser executada contra produção.

`database.generated.ts` deve ser regenerado do schema após cada migration. O arquivo
`database.types.ts` contém aliases de domínio derivados dos tipos gerados. O RPC do
dashboard retorna JSON e é validado por Zod no serviço antes de chegar à interface.
O comando `npm run db:types` grava a saída da CLI nesse arquivo. No PowerShell, uma
alternativa explícita em UTF-8 é `npx supabase gen types typescript --local | Set-Content -Encoding utf8 src/lib/supabase/database.generated.ts`.
O RPC do diretório também é validado, incluindo nulidade de avatar e cargo. A API de
introspecção do PostgreSQL não informa a nulidade de colunas retornadas por função;
os aliases desses campos herdam o contrato da tabela `profiles` gerada.
