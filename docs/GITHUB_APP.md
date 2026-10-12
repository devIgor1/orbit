# Integração GitHub do Orbit

## O que está implementado

- Administradores usam **Configurações → GitHub → Conectar GitHub**. Autorizam a identidade no GitHub; instalações existentes aparecem no Orbit para escolha da conta/organização. Sem instalação, o fluxo segue automaticamente para a seleção dos repositórios no GitHub. O Orbit lista os repositórios com acesso administrativo e conecta somente os marcados em **Salvar seleção**, sem pedir URLs. Repositórios novos começam desmarcados. A conexão exige acesso administrativo aos repositórios, comprovado por OAuth e revalidado ao salvar.
- Cada projeto seleciona um repositório conectado. Na tarefa, a aba **Desenvolvimento** lista as branches e os PRs desse repositório para seleção direta. Cada tarefa aceita um vínculo; várias tarefas podem compartilhar um PR.
- Branches de trabalho excluem a branch padrão atual. PRs mostram número, título, status, branch e origem, incluindo forks. A lista inicia em abertos/rascunhos e permite consultar fechados/integrados ou todos. A seleção de um PR já integrado avisa sobre conclusão e comentário antes de vincular.
- Listas carregam 50 itens por página, com **Carregar mais opções**, **Atualizar opções** e filtro textual sobre as opções já carregadas. Não é necessário digitar nomes de branches ou números de PR. PRs cujo repositório de origem foi removido ficam indisponíveis para seleção.
- A aba **Desenvolvimento** mostra branch, PR, última sincronização, falhas e confirmação do comentário.
- Branch/rascunho → **Em andamento**; PR aberto e pronto → **Em revisão**; PR fechado sem merge → **Em andamento**; merge → **Concluído**.
- Após o merge, o App comenta com o título da tarefa e seu link no Orbit. Descrição e comentários internos da tarefa não são publicados. O repositório pode ser público: a interface informa o conteúdo que será publicado antes de vincular.
- Um PR já integrado, quando selecionado explicitamente, também conclui a tarefa e recebe o comentário. Ao vincular uma branch, PRs encerrados antes do vínculo são ignorados para não concluir trabalho novo a partir de um merge antigo. Branch com vários PRs candidatos exige selecionar o PR. Para forks, selecione o PR no repositório de destino.
- Alterações manuais de status são preservadas até a próxima transição de estado no GitHub. Remover o vínculo interrompe a automação e preserva comentários já enviados.

A integração exige migrations/funções publicadas, credenciais, agendamento e instalação do App. Não há credenciais GitHub no frontend.

## Estado do ambiente — 12/10/2026

O backend está configurado no projeto `twsfyqkagyvibsilulle`:

- GitHub App `weorbit-integration` cadastrado, com chave e identificadores conferidos pela API do GitHub.
- Cinco migrations `202610110001`–`202610110005`, `202610120001_github_account_connection`, `202610120002_github_connection_timeout`, `202610120003_github_installation_discovery` e `202610120004_github_repository_selection` aplicadas e registradas; três Edge Functions ativas e oito variáveis da integração publicadas.
- Frontend com conexão unificada e seleção de branches/PRs publicado. `github-api` ativa na versão 5, com descoberta de instalações e seleção explícita de repositórios. A importação automática da versão anterior foi bloqueada. A interface de seleção está em publicação; o fluxo anterior de descoberta foi validado em produção (`3ce19ba`). O primeiro erro 400 em **Conectar GitHub** era causado pelo frontend novo chamando a API antiga; a atualização do banco e da função corrigiu essa incompatibilidade.
- **Redirect on update** ativado no GitHub App. A seleção da conta/repositórios dispõe de 30 minutos; a etapa OAuth seguinte mantém validade de dez minutos. Uma tentativa que já expirou precisa começar novamente pelo Orbit.
- Vault e Cron configurados. Execução automática do worker confirmada com HTTP 200 e fila vazia.
- Webhook real validado por reenvio do ping do GitHub: assinatura presente, HTTP 200 e recebimento confirmado. O segredo foi aplicado ao App para corresponder ao Supabase.
- Chamadas sem autenticação à API, ao worker e ao webhook recusadas com HTTP 401.

**Verificado:** no fluxo publicado em `3ce19ba`, **Conectar GitHub** identificou automaticamente `devIgor1` e `orbitwe`. A escolha de `devIgor1` concluiu OAuth e reconectou 125 repositórios na empresa de origem, incluindo `devIgor1/orbit`. Esse comportamento anterior foi substituído pela seleção explícita; o usuário escolheu revisar os 125 pela interface. A organização `orbitwe` tem instalação ativa, mas nenhum repositório. A publicação Vercel foi confirmada antes da validação real.

**Pendente:** validar branches, sincronização e comentário com um PR real. A descoberta de instalações descrita abaixo elimina a dependência do botão **Save** para retomar contas já instaladas. Nenhum comentário em PR foi enviado nesta verificação.

As instruções abaixo também servem para configurar outro ambiente. Os passos de publicação do backend já foram executados no projeto indicado acima.

## 1. Cadastrar o GitHub App

Abra **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App** na conta ou organização que será dona da integração.

Preencha:

| Campo | Valor para o ambiente atual |
| --- | --- |
| GitHub App name | Um nome disponível, por exemplo `Orbit da sua empresa` |
| Homepage URL | `https://weorbit.com.br` |
| Callback URL / Redirect URI | `https://weorbit.com.br/settings/github/callback` |
| Expire user authorization tokens | Mantenha ativado |
| Request user authorization (OAuth) during installation | **Desmarcado** — o Orbit inicia OAuth para descobrir instalações e também no retorno de uma nova instalação, com estados de uso único |
| Enable Device Flow | Desmarcado |
| Setup URL | `https://weorbit.com.br/settings` |
| Redirect on update | **Ativado** — retomar a conexão ao atualizar os repositórios de uma instalação existente |
| Webhook Active | Ativado |
| Webhook URL | `https://twsfyqkagyvibsilulle.supabase.co/functions/v1/github-webhook` |
| Webhook secret | Um segredo aleatório exclusivo, que será também `GITHUB_WEBHOOK_SECRET` |
| SSL verification | Ativado |

Em **Repository permissions**, configure somente:

- **Contents: Read-only** — consultar branches e receber pushes.
- **Pull requests: Read & write** — consultar PRs e publicar o comentário de conclusão.
- **Metadata: Read-only** — obrigatório para identificar repositórios e verificar a permissão do usuário.

Em **Subscribe to events**, selecione **Pull request**, **Push** e **Repository**. Eventos de instalação e alteração dos repositórios da instalação são tratados pelo backend; o GitHub os disponibiliza para o App.

Em **Where can this GitHub App be installed?**, escolha **Any account** se outras empresas/organizações usarão o Orbit. Para um uso restrito à sua própria conta, **Only on this account** é suficiente.

Crie o App. Anote **App ID**, **Client ID** e o **slug** exibido em sua URL `https://github.com/apps/SLUG`. Em **Client secrets**, gere um novo segredo. Para a chave privada, acesse **Credentials → Key pairs → New key** (ou o link **generate a private key** do aviso de cadastro). Guarde o arquivo `.pem` e o segredo em local seguro; não envie esses valores pelo chat.

As URLs acima correspondem ao domínio/projeto já documentados no Orbit. Em outro ambiente, substitua todos os domínios e o project ref de forma consistente. Referências: [cadastro de GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app), [permissões do usuário](https://docs.github.com/en/rest/collaborators/collaborators#get-repository-permissions-for-a-user).

## 2. Preparar os segredos do Supabase

Na raiz do projeto:

```sh
mkdir -p .supabase
cp supabase/github.env.example supabase/.env.github.local
chmod 600 supabase/.env.github.local
```

O arquivo `.env.github.local` é ignorado pelo Git. Preencha-o no seu editor:

| Variável | Origem |
| --- | --- |
| `GITHUB_APP_ID` | App ID numérico |
| `GITHUB_APP_SLUG` | Slug do App, sem URL e sem `[bot]` |
| `GITHUB_CLIENT_ID` | Client ID do App |
| `GITHUB_CLIENT_SECRET` | Client secret gerado no GitHub |
| `GITHUB_PRIVATE_KEY_BASE64` | PEM em PKCS#8 convertido para Base64, conforme abaixo |
| `GITHUB_WEBHOOK_SECRET` | Mesmo segredo do campo Webhook secret |
| `GITHUB_WORKER_SECRET` | Outro segredo aleatório exclusivo para o worker |
| `ORBIT_APP_URL` | `https://weorbit.com.br` |

Para a chave privada, converta o PEM baixado do GitHub para PKCS#8. Substitua o caminho de entrada pelo arquivo real. Estes comandos são para macOS/Linux com OpenSSL:

```sh
openssl pkcs8 -topk8 -nocrypt -in '/caminho/da-chave-baixada.pem' -out .supabase/github-private-key.pkcs8.pem
openssl base64 -A -in .supabase/github-private-key.pkcs8.pem -out .supabase/github-private-key.base64
chmod 600 .supabase/github-private-key.pkcs8.pem .supabase/github-private-key.base64
```

Copie o conteúdo do arquivo `.supabase/github-private-key.base64` para `GITHUB_PRIVATE_KEY_BASE64`, em uma única linha. Não use Base64 do PEM PKCS#1 original: o runtime usa Web Crypto e exige PKCS#8.

Gere os dois segredos com seu gerenciador de senhas (ao menos 32 bytes aleatórios). `GITHUB_WORKER_SECRET` e `GITHUB_WEBHOOK_SECRET` devem ser diferentes. Nenhuma destas variáveis recebe prefixo `VITE_`.

## 3. Publicar banco e funções

Com a CLI Supabase autenticada, na raiz do Orbit:

```sh
npx supabase login
npx supabase link --project-ref twsfyqkagyvibsilulle
npx supabase db push --linked --dry-run
```

Confira as migrations pendentes. A integração usa `202610110001` a `202610110005`; o fluxo unificado acrescenta `202610120001_github_account_connection.sql`, `202610120002_github_connection_timeout.sql` e `202610120003_github_installation_discovery.sql` e `202610120004_github_repository_selection.sql`. Publique as migrations e a função `github-api` antes do frontend novo. Callbacks anteriores de instalação continuam compatíveis. A antiga ação `account-callback`, que importava tudo, foi bloqueada: frontends antigos precisam ser atualizados antes de conectar. Depois aplique e publique:

```sh
npx supabase db push --linked
npx supabase secrets set --env-file supabase/.env.github.local --project-ref twsfyqkagyvibsilulle
npx supabase functions deploy github-api --project-ref twsfyqkagyvibsilulle --use-api
npx supabase functions deploy github-webhook --project-ref twsfyqkagyvibsilulle --use-api
npx supabase functions deploy github-worker --project-ref twsfyqkagyvibsilulle --use-api
```

As três funções têm `verify_jwt = false` em `supabase/config.toml`, com autenticação própria: `github-api` valida a sessão pelo Supabase Auth; `github-webhook` verifica HMAC SHA-256 do corpo original; `github-worker` exige seu segredo exclusivo. Não habilite a verificação JWT do gateway no webhook ou worker.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo ambiente das Edge Functions. Não copie a chave administrativa para `.env.local` do Vite.

Publique também o frontend atualizado pelo fluxo habitual do projeto. A callback `/settings/github/callback` precisa estar disponível no domínio configurado, inclusive ao abrir diretamente a URL (a regra SPA da Vercel já atende esse caso).

## 4. Ativar a fila automática

No painel do projeto Supabase, abra **Vault** e crie dois segredos com estes nomes exatos:

| Nome no Vault | Valor |
| --- | --- |
| `orbit_github_worker_url` | `https://twsfyqkagyvibsilulle.supabase.co/functions/v1/github-worker` |
| `orbit_github_worker_secret` | Mesmo valor de `GITHUB_WORKER_SECRET` das Edge Functions |

Abra o **SQL Editor** e execute o conteúdo de [`supabase/github-schedule.sql`](../supabase/github-schedule.sql). Ele habilita `pg_cron` e `pg_net` e cria o job `orbit-github-worker` a cada minuto. Pode ser executado novamente sem duplicar o agendamento. A URL e o segredo são lidos do Vault em cada execução.

Sem esse job, o webhook aceita e agenda eventos, mas as tarefas permanecem aguardando sincronização. Confira a execução em **Cron → orbit-github-worker** e os resultados HTTP de `pg_net`: sucesso do SQL do cron sozinho não comprova sucesso da função.

O worker processa até dez vínculos por chamada. Webhooks antecipam a próxima consulta; uma reconciliação a cada dez minutos também recupera eventos perdidos. A latência depende da fila e dos limites do GitHub. PR integrado com comentário confirmado deixa de consumir consultas periódicas.

Referência: [agendamento de Edge Functions com Cron e Vault](https://supabase.com/docs/guides/functions/schedule-functions).

## 5. Conectar e validar de ponta a ponta

1. Entre no Orbit como administrador da empresa e vá a **Configurações → GitHub**.
2. Clique em **Conectar GitHub** e autorize sua identidade no GitHub. Se o App já estiver instalado, o Orbit lista as contas e organizações acessíveis. Clique em **Conectar** na conta desejada: a confirmação continua automaticamente até a lista de repositórios no Orbit, sem editar a instalação ou depender do botão **Save** do GitHub. Marque os repositórios desejados e clique em **Salvar seleção**.
3. Sem instalações acessíveis, o fluxo abre a instalação no GitHub. Para adicionar outra conta, use **Conectar outra conta ou organização**. Escolha a conta e autorize somente os repositórios desejados; nenhum programa é baixado. O retorno confirma o App, a identidade e o acesso administrativo e abre a seleção no Orbit. Somente os repositórios escolhidos são conectados em uma transação. Repositórios sem permissão administrativa são excluídos com aviso; se nenhum for elegível, há erro explícito. Em organizações que exigem aprovação, conclua a aprovação no GitHub e reinicie a conexão no Orbit.
4. Abra um projeto e escolha o repositório em **Desenvolvimento → Vincular**.
5. Abra uma tarefa, entre na aba **Desenvolvimento**, escolha **Branch** ou **Pull request** e selecione uma opção carregada do GitHub. Use o filtro textual, o status dos PRs e **Carregar mais opções** quando necessário. Clique em **Vincular à tarefa**. O backend confere novamente a referência antes de persistir; se ela foi removida ou perdeu acesso, o formulário mantém a seleção e mostra o erro.
6. Use uma tarefa e um PR de teste: confirme **Em andamento** no rascunho, **Em revisão** após marcar pronto e **Concluído** após o merge.
7. Confira o comentário do bot no PR e seu link de volta à tarefa. Clique em **Sincronizar** novamente: o comentário anterior deve ser reconhecido, sem um novo envio.
8. Feche outro PR sem merge e confirme que a tarefa continua **Em andamento** e sem comentário de conclusão.
9. Remova o acesso do App a um repositório e confirme o estado de indisponibilidade. Para retomar, devolva o acesso no GitHub e conecte novamente nas configurações do Orbit.

O comentário é enviado pela identidade do GitHub App. Não há criação de branches, aprovação, merge ou alteração de código por esta integração.

Para autorizar mais repositórios, ajuste a instalação nas configurações do GitHub e depois use **Conectar GitHub** no Orbit para escolher quais repositórios disponíveis deseja conectar. A reconexão de instalações existentes não exige mudanças no GitHub. **Redirect on update** continua ativado para retornos após mudanças durante uma nova instalação. A Setup URL existente `/settings` encaminha o retorno à callback; `/settings/github/callback` também pode ser usada como Setup URL. Não abra a instalação por um link externo esperando vinculá-la automaticamente: a conexão deve começar no Orbit para identificar a empresa e o usuário com segurança.

A descoberta consulta [`/user/installations`](https://docs.github.com/en/rest/apps/installations#list-app-installations-accessible-to-the-user-access-token) com o token OAuth do usuário; nunca expõe o diretório global de instalações do App. A escolha fica vinculada por dez minutos ao usuário/empresa e aos IDs confirmados pelo GitHub, com estado de uso único. Após a escolha, uma nova passagem OAuth revalida o acesso e permite descartar o primeiro token sem armazená-lo entre etapas. Uma autorização já concedida normalmente retorna sem nova tela de consentimento. Até mil instalações são paginadas com validação da contagem.

O ID recebido na Setup URL é apenas uma alegação: o servidor exige OAuth e consulta tanto a instalação do próprio App quanto `/user/installations/{id}/repositories`, usando o token do usuário. Somente as permissões `admin` confirmadas pelo GitHub permitem a importação. Tokens de usuário são descartados após a chamada, sem armazenamento no navegador ou no banco. Referências: [estado na URL de instalação](https://docs.github.com/en/apps/sharing-github-apps/sharing-your-github-app), [validação da Setup URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url), [repositórios acessíveis ao usuário](https://docs.github.com/en/rest/apps/installations#list-repositories-accessible-to-the-user-access-token).

### Revisar os repositórios já conectados

Em **Configurações → GitHub**, use **Revisar repositórios conectados** e escolha a conta. A lista distingue os repositórios já conectados dos novos, que começam desmarcados. Use a busca, marque os desejados ou **Limpar seleção** para refazer a escolha. Filtrar não muda a seleção; **Selecionar resultados** marca apenas os resultados atuais.

**Salvar seleção** mostra a quantidade selecionada e a quantidade que será desconectada. Repositórios em uso por projetos ficam marcados e bloqueados para preservar seus vínculos. Uma associação criada durante a escolha também é verificada no servidor e impede a remoção. Ao salvar, apenas conexões anteriores incluídas nessa revisão e desmarcadas são desativadas; outras instalações e conexões novas feitas em paralelo são preservadas. Nenhuma permissão de instalação é alterada no GitHub. Cancelar ou apenas abrir a lista não altera conexões.

A escolha tem dez minutos de validade, armazena somente hashes e IDs no servidor e passa novamente por OAuth antes da escrita. A API valida todos os IDs selecionados com as permissões atuais; qualquer perda de acesso recusa a operação inteira. Não há persistência de tokens GitHub no navegador ou banco.

## Recuperação e limites

- **Falha de consulta:** a região mostra erro, sem transformar a falha em uma lista vazia ou estado atualizado fictício.
- **Falha no comentário:** o merge continua confirmado e a tarefa permanece concluída. O comentário aparece com erro e recebe novas tentativas com intervalo crescente de até uma hora.
- **Resposta de envio incerta:** antes de reenviar, o worker procura um marcador estável em comentários do próprio bot. Recibos sobrevivem à remoção/recriação do vínculo. O GitHub não oferece chave de idempotência para comentários; a estratégia reconcilia tentativas, mas não promete entrega exatamente uma vez diante de toda falha distribuída possível.
- **Concorrência:** leases no PostgreSQL impedem dois workers de processarem simultaneamente o mesmo vínculo. Um vínculo não pode ser removido durante o processamento. Ao desconectar um repositório, uma chamada externa já em andamento pode terminar; novos trabalhos ficam bloqueados.
- **Branch reutilizada:** se houver múltiplos PRs candidatos, selecione o PR. O servidor vincula seu número e preserva a identidade do repositório de origem, inclusive em forks.
- **Listagem de branches/PRs:** exige sessão ativa e vínculo tarefa/projeto/repositório na mesma empresa. O servidor usa token de instalação restrito ao repositório, com permissões de leitura. Busca não envia tokens ao navegador. Falhas de atualização/paginação ficam visíveis e bloqueiam o envio até a recuperação; trocar repositório, tipo ou status não reaproveita uma seleção incompatível. Esta listagem requer publicar `github-api` e o frontend atualizado, sem nova migration ou credencial além da etapa de conexão unificada.
- **Resultados extensos:** a busca e a reconciliação percorrem até dez páginas de cem itens; ao exceder, há erro explícito, sem escolher silenciosamente um resultado ou publicar um comentário duplicado.
- **Conexão expirada:** volte às configurações e clique em **Conectar GitHub** novamente. A descoberta e a escolha no Orbit expiram em dez minutos. A seleção de repositórios para uma instalação nova no GitHub expira em 30 minutos; o retorno troca o estado e inicia OAuth com dez minutos de validade. Estados são de uso único, associados ao usuário/empresa e não são prorrogados retroativamente. Erros de callback não são reenviados automaticamente ao remontar a página, focar a janela ou reconectar a rede. A instalação só é confiável depois da verificação na API GitHub.
- **Importação extensa ou incompleta:** até mil repositórios por conexão, com paginação e validação da quantidade. Falhas interrompem toda a importação. Para contas maiores, selecione somente os repositórios necessários nas permissões do GitHub.
- **Rotação de credenciais:** atualize os segredos no Supabase. Se trocar o webhook secret, atualize também o GitHub; se trocar o worker secret, atualize também o Vault. Credenciais nunca são registradas nos logs.
- **Troca do repositório do projeto:** remova os vínculos das tarefas antes de alterar. A integridade é protegida por chaves estrangeiras no banco.

## Verificação local

```sh
npm ci
npm run db:start
npm run db:seed
npm run db:types
npm run lint
npm run typecheck
npm run check:styles
npm run check:architecture
npm test
npm run test:db
ORBIT_GITHUB_DB_TESTS=1 npm test -- tests/github-pipeline.test.ts
deno check --config supabase/functions/github-api/deno.json supabase/functions/github-api/index.ts supabase/functions/github-webhook/index.ts supabase/functions/github-worker/index.ts
npx playwright install chromium
npm run test:e2e -- tests/e2e/github.spec.ts tests/e2e/github-account.spec.ts tests/e2e/github-existing-installation.spec.ts tests/e2e/github-repository-choice.spec.ts tests/e2e/github-reference-selection.spec.ts tests/e2e/project-flow.spec.ts tests/e2e/navigation.spec.ts
npm run build
```

Se a porta 5173 estiver ocupada por outro projeto, execute os E2E com `ORBIT_E2E_PORT=5176 npm run test:e2e -- tests/e2e/github.spec.ts tests/e2e/project-flow.spec.ts tests/e2e/navigation.spec.ts` para iniciar um servidor isolado.

Os testes GitHub simulam somente as respostas externas e nunca publicam comentários reais. O teste opt-in `github-pipeline` executa o worker contra o Supabase local, simula perda de conexão após um POST aceito, confirma a recuperação e remove seus registros. Os testes SQL rodam em transações revertidas. `db:seed` escreve as variáveis públicas do Supabase **local** em `.env.local` e garante uma senha de demonstração compatível com a política atual. Não execute esse provisionador esperando manter `.env.local` apontado à produção.

Para experimentar a instalação e os webhooks em desenvolvimento, use um App separado e um endpoint HTTPS acessível pelo GitHub. O GitHub não entrega webhooks diretamente a `localhost`. Os testes locais e as checagens de tipos não substituem o roteiro com um PR real após a ativação.
