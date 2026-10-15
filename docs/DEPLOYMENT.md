# Deploy de produção

O workflow `.github/workflows/deploy-production.yml` executa em cada push na
`main`, inclusive merges. Também pode ser iniciado em Actions → Deploy production
→ Run workflow, selecionando `main`. Uma execução de outra branch não publica.

## Ordem e bloqueios

1. O workflow reutilizável `ci.yml` executa actionlint, lint, estilos/e-mail,
   arquitetura, testes unitários e TypeScript/build. PRs também recebem esse CI,
   sem credenciais de produção.
2. O job de produção instala Supabase CLI **2.121.0** e Vercel CLI **64.2.0**,
   verifica os secrets e consulta somente `/v9/projects/orbit` para resolver o
   projeto e seu proprietário. Confere o vínculo com o repositório do deploy,
   grava `.vercel/project.json` e usa `vercel pull` para obter a configuração.
   As duas variáveis públicas de conexão vêm do environment Production do GitHub,
   pois a Vercel pode devolver `[SENSITIVE]` no pull. Valores legíveis que divirjam
   entre os provedores bloqueiam o deploy. A conexão precisa corresponder ao Supabase esperado.
3. `vercel build --prod` prepara o frontend antes de qualquer mudança no backend.
4. Depois de confirmar que o commit ainda é o atual da `main`, `supabase db push`
   aplica somente migrations pendentes, com uma prévia registrada no log.
5. `supabase functions deploy --use-api` publica todas as funções locais,
   preservando `verify_jwt` e import maps de `supabase/config.toml`.
6. Outra prévia confirma que não há migrations pendentes. As funções declaradas
   precisam estar `ACTIVE`, com a configuração JWT esperada.
7. Uma nova conferência do commit impede que um deploy antigo publique o frontend
   se a `main` avançou durante as etapas anteriores. Só então
   `vercel deploy --prebuilt --prod` publica o artefato já compilado.

Qualquer erro interrompe os próximos passos. Não há `continue-on-error` nem
publicação em `always()`. O grupo `orbit-production` serializa os deploys, sem
cancelar uma execução que esteja aplicando migrations. O GitHub mantém a execução
pendente mais recente; commits antigos são recusados pelas verificações adicionais.

`vercel.json` desativa deploys Git apenas para `main`, evitando uma publicação
paralela fora dessa sequência. As demais branches mantêm previews automáticos.
Previews podem precisar de um Supabase separado para funcionalidades cujo schema
ainda não existe em produção; eles não recebem credenciais administrativas do CI.

## Check central dos PRs

`Validações do PR`, no `ci.yml`, consolida o job `Qualidade e build` (actionlint,
lint, estilos/e-mail, arquitetura, testes e TypeScript/build), o status `Vercel`
e o check `Vercel Preview Comments`. O job roda mesmo quando o CI falha e só
aprova dependências com resultado `success`; cancelamentos e jobs pulados falham.
O preview é consultado no SHA da branch do PR, enquanto o CI testa o merge com a
base. A origem da Vercel também é conferida. Evidência ausente fica pendente por
até dez minutos de espera, e erro de API ou prazo excedido reprova o check.

A proteção da `main` exige esse check do GitHub Actions, branch atualizada e PR,
inclusive para administradores, sem obrigar aprovação de outra pessoa. Os checks
individuais existentes também permanecem obrigatórios: isso impede que uma
reexecução independente da Vercel com falha seja encoberta por um resultado
central aprovado anteriormente. Force push e exclusão da `main` ficam bloqueados.

Para adicionar validações sem editar a proteção no GitHub:

- Novas etapas/testes dentro de `quality` já participam automaticamente.
- Novos jobs do Actions devem entrar em `pr-validation.needs`; todos os resultados
  desse objeto são verificados, sem alterar o script. Workflows reutilizáveis podem
  ser chamados como jobs do CI e conectados da mesma forma.
- Novas integrações externas devem entrar em `requiredPrStatuses` ou
  `requiredPrChecks`, em `scripts/pr-validation-policy.ts`, com sua origem esperada.
  Integrações que reexecutam fora do CI devem manter também sua proteção direta.

Não use `continue-on-error` nas validações obrigatórias, não renomeie o check
central sem ajustar a proteção e não inclua o deploy de produção como dependência
do PR: ele acontece depois do merge. Se um preview for corrigido/reexecutado após
o check central falhar ou expirar, reexecute os jobs com falha do CI. O agregador
usa apenas o `GITHUB_TOKEN` de leitura, sem tokens do Supabase ou da Vercel.

## Credenciais e destinos

Destino Supabase: `twsfyqkagyvibsilulle`. Vercel: projeto `orbit` no time
`devigor1s-projects`. Domínio: `https://weorbit.com.br`.

Configure estes secrets no environment **Production** do GitHub, ou como secrets
do repositório. O environment deve aceitar deployments somente da branch `main`.

| Secret | Uso |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Autenticar a CLI para migrations e Edge Functions. |
| `VERCEL_TOKEN` | Token limitado ao projeto `orbit`: ler configuração, compilar e publicar. |

Crie o token da Vercel em Account → Tokens, selecionando o time
`devigor1s-projects` e somente o projeto `orbit`. Mantenha uma validade monitorada.
O workflow resolve os IDs pela API do próprio projeto e passa o vínculo local
para a CLI **64.2.0**. Não usa `vercel link --scope`, que tenta
consultar a conta e falha com tokens limitados a um projeto. A CLI lê o token
diretamente de `VERCEL_TOKEN`; não é necessário colocá-lo nos argumentos.
As credenciais não entram no repositório nem em variáveis `VITE_*`.
Os secrets são disponibilizados apenas nos passos que os utilizam. A CLI Supabase
fixada obtém a credencial temporária do banco pela API; não é necessário salvar a
senha permanente do PostgreSQL no workflow.

Configure também `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` como
**variables** no environment **Production** do GitHub. São valores públicos que
entram no bundle do navegador; use somente uma publishable key ou a chave `anon`
do Supabase esperado. O script recusa chaves administrativas e não copia outros
secrets do GitHub para o arquivo de build.

Mantenha esses mesmos valores na Vercel para previews/builds feitos por ela.
Ao rotacionar a chave pública, atualize os dois provedores. O workflow preenche
valores ausentes ou `[SENSITIVE]` do pull e recusa divergências visíveis.
SMTP, GitHub App e demais secrets das Edge Functions permanecem no Supabase:
o workflow não os substitui. A pasta `.vercel/` é ignorada pelo Git e não é
publicada como artifact do Actions.

## Recuperação

- Falha na validação/build: corrigir e fazer novo merge; o backend não foi alterado.
- Falha em migration: o frontend anterior permanece no ar. Conferir o histórico
  remoto e corrigir com uma nova migration; não editar uma migration já aplicada.
- Falha em Edge Function: funções anteriores podem já ter sido atualizadas.
  Corrigir e reexecutar o commit atual; o frontend continua bloqueado até o sucesso.
- Falha da Vercel: backend já pode estar atualizado. Reexecutar o commit atual
  reaplica somente migrations pendentes e republica as funções antes do frontend.
- Commit antigo recusado: acompanhar a execução mais recente da `main`, ou usar
  Run workflow na `main`. Não tentar publicar um SHA antigo.

Migrations, funções e frontend não formam uma única transação. Mudanças de backend
devem manter compatibilidade com o frontend anterior durante o deploy. Para
remoções ou mudanças incompatíveis, usar entregas separadas: expandir o contrato,
migrar consumidores e só depois remover o contrato antigo. Não há rollback
automático de banco, reset, seed, `--prune` ou exclusão de registros neste fluxo.
Deploys manuais por CLI ou dashboard devem respeitar a mesma ordem.

Referências: [Supabase CI/CD](https://supabase.com/docs/guides/deployment/managing-environments),
[Edge Functions no Actions](https://supabase.com/docs/guides/functions/examples/github-actions),
[Vercel no Actions](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel) e
[controle de deploys Git](https://vercel.com/docs/project-configuration/git-configuration),
[tokens por projeto](https://vercel.com/docs/accounts/access-tokens).
