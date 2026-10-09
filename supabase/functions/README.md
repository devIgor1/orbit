# Convites por e-mail

`send-invitation` envia um convite existente pelo Resend. Aceita somente POST com
`{ "invitationId": "UUID" }` e o JWT do usuário autenticado. Gateway JWT e
`auth.getUser` validam a sessão; os campos de identidade, remetente, destinatário
e link nunca são aceitos do navegador.

## Configuração e publicação

A função usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` fornecidos pelo runtime,
além de três variáveis configuradas em `supabase/hosted/.env`:

- `RESEND_API_KEY`: chave com permissão de envio pelo domínio verificado.
- `ORBIT_SMTP_SENDER_EMAIL`: `acesso@codedbyigor.com` neste ambiente.
- `ORBIT_APP_URL`: `http://127.0.0.1:5173` para o desenvolvimento atual. Para
  convidados em outros computadores, publicar o frontend e trocar por sua URL HTTPS.

Na raiz do repositório, após revisar/aplicar as migrations:

```powershell
npx supabase secrets set --env-file supabase/hosted/.env --project-ref twsfyqkagyvibsilulle
npx supabase functions deploy send-invitation --project-ref twsfyqkagyvibsilulle --use-api
npx deno check --config supabase/functions/send-invitation/deno.json supabase/functions/send-invitation/index.ts
```

As credenciais ficam no backend e nos arquivos locais ignorados pelo Git. Nunca
adicione prefixo `VITE_` nem registre conteúdo das variáveis. O remetente exibido é
`Nome da pessoa, via Orbit`; respostas usam o e-mail confirmado do administrador
no Auth. A mensagem contém empresa, destinatário, validade e link de aceite.

## Permissões e falhas

- `prepare_invitation_email` e `finish_invitation_email` aceitam somente
  `service_role`. A reserva verifica no banco se a identidade autenticada ainda é
  administradora da empresa e tem e-mail confirmado; recusa convites encerrados.
- Cada convite permite uma tentativa por minuto. A empresa pode iniciar até 30
  envios por hora. Locks por convite/empresa serializam reservas concorrentes.
- A tabela privada `invitation_email_jobs` mantém um snapshot da mensagem. Falhas
  ou resultados incertos reutilizam o mesmo job por até 23 horas, dentro da janela
  de idempotência de 24 horas do Resend. Um reenvio após sucesso cria outro job.
- `email_status` e timestamps no convite são somente leitura para o navegador.
  Sucesso depende do identificador retornado pelo Resend e da confirmação no banco.
  `sent` indica envio aceito pelo provedor, não leitura ou entrega na caixa postal.
  Não há webhook de acompanhamento de bounces nesta versão.
- Falhas mostram erro, preservam o endereço digitado e mantêm o convite disponível
  para copiar o link ou tentar reenviar. Atualizar a lista consulta o estado real.
- O link não concede acesso sozinho: o destinatário entra/cria sua conta, confirma
  o mesmo endereço e aceita o convite. O papel concedido continua sendo `member`.

## Testes locais

`npm run test:onboarding` mantém os testes de cadastro/links no Supabase local e
pula os envios externos por padrão. Os testes unitários simulam falhas e os testes
SQL usam transações revertidas; nenhuma suíte aponta ao banco hospedado.

Para testar a integração real com o Resend, crie `.supabase/invitation-functions.env`
com as três variáveis acima e `ORBIT_APP_URL=http://127.0.0.1:5174`. Então execute:

```powershell
npx supabase functions serve send-invitation --env-file .supabase/invitation-functions.env
```

Em outro terminal:

```powershell
$env:ORBIT_EMAIL_E2E = '1'
npm run test:onboarding -- --output=test-results/invitation-email
Remove-Item Env:ORBIT_EMAIL_E2E
```

Esse opt-in envia dois convites para endereços `delivered+...@resend.dev`, o
simulador oficial de entrega do Resend, consumindo a cota de envio. Usuários,
empresas e aceite continuam exclusivamente no Supabase local; confirmações de
conta são lidas no Mailpit. A suíte verifica desktop/celular, envio, persistência,
intervalo entre reenvios e aceite. Não testa caixas postais de pessoas reais.

Referências: [autenticação das funções](https://supabase.com/docs/guides/functions/auth),
[envio no Resend](https://resend.com/docs/api-reference/emails/send-email) e
[idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys).
