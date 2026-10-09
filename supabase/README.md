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

A empresa é representada por `workspaces`. A sessão lê `profiles.active_workspace_id`,
alterado exclusivamente pelas RPCs de criação, seleção e aceite de convite. Para
contas anteriores sem preferência, usa o primeiro vínculo por criação/UUID.
Sem vínculo, a aplicação direciona para `/companies`. A seleção continua sujeita
à consulta do vínculo real e às políticas RLS.

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
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase migration list --linked
```

Esses comandos aplicam a estrutura e registram o histórico de migrations. Eles não
copiam os registros nem as contas do banco local. O seed exige os quatro e-mails
descritos no provisionador e é exclusivo da demonstração local; não execute
`npm run db:seed` para configurar a nuvem, pois ele também sobrescreve `.env.local`.

Novas contas usam `/signup`; o trigger existente cria o perfil. Após confirmar o
e-mail, `create_company` cria empresa, vínculo administrativo e preferência ativa
em uma transação. `select_company` só aceita empresas com vínculo real. Escritas
diretas em membros ou no campo de empresa ativa continuam proibidas ao frontend.
O administrador original deste ambiente permanece disponível; sua senha inicial
está em `.cloud-credentials.json`, ignorado pelo Git.

Configure a URL e a chave pública em `.env.local` para desenvolvimento e nas
variáveis da Vercel para publicação. O Site URL hospedado está configurado como
`https://weorbit.com.br`, com retornos `/auth/confirm**` e `/login**` autorizados,
mantendo também a URL anterior da Vercel e os retornos locais. Ao trocar
o domínio, atualize as URLs do Auth e `ORBIT_APP_URL`. O retorno de confirmação
usa `/auth/confirm?next=...`, aguarda a sessão do SDK e encaminha ao onboarding de
empresa/equipe ou ao aceite de um convite, com destino interno validado. O SMTP Resend está ativo para
confirmar contas externas, com remetente `Orbit <acesso@codedbyigor.com>` e chave
limitada ao envio pelo domínio verificado. A configuração e sua validação estão em
[`hosted/README.md`](hosted/README.md). O arquivo separado preserva o Mailpit local.
Nunca desative a confirmação para contornar essa limitação: o aceite dos convites
depende da propriedade do e-mail confirmada por `auth.users.email_confirmed_at`.

### Convites e isolamento

`workspace_invitations` guarda e-mail normalizado, empresa, validade, autor e estado.
RLS permite leitura ao administrador da empresa e ao destinatário confirmado.
`invite_collaborator` e `revoke_invitation` exigem administrador; `my_invitations`
expõe somente convites próprios pendentes/válidos e o nome da empresa, sem abrir
seus projetos. `accept_invitation` bloqueia a linha, verifica e-mail, estado e prazo,
cria vínculo `member` e seleciona a empresa atomicamente. Repetir o aceite da mesma
conta é idempotente. Papéis nunca vêm de metadados editáveis do usuário.
As funções privilegiadas usam `search_path` vazio e permissões explícitas.

Convites podem ser enviados por e-mail pela função autenticada `send-invitation`
ou compartilhados por link. A mensagem identifica quem convidou e usa seu endereço
confirmado como Reply-To. RPCs restritas ao servidor verificam permissões, reservam
envios com limite e persistem seus resultados; snapshots privados permitem retries
idempotentes. Consulte [`functions/README.md`](functions/README.md).
Recuperação de senha permanece fora deste fluxo. A gestão de membros está descrita abaixo.
Os 34 cenários de `company_onboarding.test.sql` criam os
próprios registros e os desfazem ao final; não dependem do seed.

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

## Gestão de acesso de membros

As migrations `202610090005` a `202610090008` adicionam `removed_at` ao vínculo,
auditoria em `workspace_member_events` e RPCs administrativas. `member_management_details`
retorna a prévia autoritativa; `change_member_role` e `remove_workspace_member`
exigem administrador ativo, papel esperado e, na remoção, a contagem de tarefas
pendentes confirmada pelo usuário. A linha da empresa serializa essas operações
antes da releitura de permissões e da proteção do último administrador.

Remover marca o vínculo como inativo, transfere/desassocia tarefas pendentes,
limpa a preferência de empresa ativa quando aplicável e revoga convites pendentes
para esse destinatário. Tudo ocorre na mesma transação do registro de auditoria.
RLS e funções de envio consideram somente vínculos ativos. O aceite de um novo
convite restaura o vínculo como `member`; links antigos aceitos não permitem reentrada.

Chaves estrangeiras existentes preservam autores e responsáveis históricos.
Triggers verificam e bloqueiam vínculos ativos para autores e novas atribuições;
uma tarefa concluída mantém o responsável removido e fica sem responsável ao
ser reaberta. `team_directory` exclui removidos por padrão e aceita `include_removed`
para resolver nomes no histórico dos projetos, somente por membros ativos.
O histórico de acesso tem leitura exclusiva de administradores e não aceita
escritas diretas do frontend. Os tipos devem ser regenerados após as migrations.

`member_management.test.sql` cobre autorização, último administrador, prévias
obsoletas, transferência, preservação de autoria e comentários, isolamento,
reabertura de tarefas e reinvitação. `npm run test:members:concurrency` verifica
duas tentativas simultâneas de rebaixamento/remoção no banco Docker local.

## Verificação antecipada do e-mail

`202610090009_registration_email.sql` adiciona a RPC pública
`check_registration_email(candidate_email)`. O retorno é somente um enum:
`available`, `registered` ou `confirmation_pending`. A consulta normaliza espaços
nas extremidades e maiúsculas, compara exatamente o endereço e ignora contas SSO
separadas e registros apagados. Não retorna nomes, IDs, hashes de senha ou listas
de usuários; acesso direto a `auth.users` continua fechado ao cliente.

O endpoint permite identificar a existência do endereço para atender ao aviso do
cadastro, inclusive antes de autenticar. A tabela privada `registration_email_limits`
limita a 40 consultas por minuto por hash do IP encaminhado pelo gateway e 1200
globais por minuto. A ausência do cabeçalho usa um bucket compartilhado; a cota
global também se aplica a cabeçalhos variados. Contadores são atômicos, não guardam
os e-mails pesquisados nem IPs em texto e são limpos após um dia de inatividade na
próxima consulta. Erros usam `PT429` para limite e `22023` para entrada inválida.

O reenvio usa `auth.resend` e os limites de envio já existentes do Auth, preservando
o retorno `/auth/confirm` e o destino de convites. A prévia de disponibilidade não
substitui a proteção do Auth: um cadastro concorrente continua recusado no envio.
Testes SQL cobrem os três estados, normalização, isolamento e limites; E2E locais
usam Mailpit para confirmar o reenvio sem enviar mensagens externas.
