# E-mails do Supabase Auth com Resend

Configuração parcial do ambiente hospedado. Declara o SMTP e as URLs do Auth; a stack local
continua usando Mailpit. A chave fica em `.env`, ignorado pelo Git, e não entra
no frontend. Os comandos abaixo carregam explicitamente as duas variáveis no
processo da CLI, pois `config diff/push` não as carregaram automaticamente do
arquivo neste ambiente.

## Estado aplicado — 09/10/2026

- SMTP ativo no projeto `twsfyqkagyvibsilulle` com remetente
  `Orbit <acesso@codedbyigor.com>`.
- Domínio `codedbyigor.com` já verificado; chave `Orbit Supabase Auth` com permissão
  **Sending access**, restrita a esse domínio. Nenhuma chave existente foi alterada.
- Sete propriedades SMTP aplicadas; `config diff` posterior confirmou zero
  diferenças declaradas. Confirmação de e-mail, URLs e demais regras preservadas.
- Conexão TLS na porta 465, autenticação SMTP e envio aceitos. O endereço de teste
  `delivered+orbit-smtp-20261009@resend.dev` registrou **Delivered** no Resend.
  Esse endereço simula entrega; não comprova recebimento em uma caixa real nem
  testa o cadastro completo no Supabase hospedado. Nenhum usuário foi criado.
- Evidência local: `test-results/resend-setup/smtp-delivered.jpg` (ignorada pelo Git).
- Site URL atualizado para `https://weorbit.com.br`; `/auth/confirm**` e `/login**`
  autorizados no domínio atual, no domínio anterior da Vercel e em
  127.0.0.1/localhost:5173. Aplicação por configuração parcial contendo somente
  essas duas propriedades, com zero divergências declaradas após o push.
  SMTP, confirmação obrigatória e política de senha foram preservados.

## Pré-requisitos

1. Acessar uma conta no Resend e adicionar um domínio próprio.
2. Publicar no provedor DNS os registros indicados pelo Resend e aguardar o estado
   **Verified**. Usar os valores fornecidos pela conta, sem inventar registros.
3. Criar uma API key com permissão **Sending access**, restrita ao domínio de envio.
4. Copiar `.env.example` para `.env` nesta pasta e preencher a chave e o remetente
   pertencente ao domínio verificado, por exemplo `acesso@seudominio.com.br`.

Não é necessário instalar o SDK do Resend na aplicação. O Supabase envia os e-mails
do Auth por `smtp.resend.com:465`, com usuário `resend`, a API key como senha e
nome de remetente `Orbit`.

## Aplicação

Na raiz do repositório, com a CLI autenticada na conta Supabase:

```powershell
$smtpEnvironment = Get-Content 'supabase/hosted/.env' -Raw | ConvertFrom-StringData
$env:RESEND_API_KEY = $smtpEnvironment.RESEND_API_KEY
$env:ORBIT_SMTP_SENDER_EMAIL = $smtpEnvironment.ORBIT_SMTP_SENDER_EMAIL
npx supabase config diff --workdir supabase/hosted --project-ref twsfyqkagyvibsilulle
npx supabase config push --workdir supabase/hosted --project-ref twsfyqkagyvibsilulle
Remove-Item Env:RESEND_API_KEY, Env:ORBIT_SMTP_SENDER_EMAIL
Remove-Variable smtpEnvironment
```

Revise o diff antes de aplicar. A configuração declara `[auth.email.smtp]`,
`auth.site_url` e `auth.additional_redirect_urls`; não desativa confirmação de
e-mail nem altera permissões ou provedores. `/auth/confirm**` recebe as novas
confirmações com `next` interno validado; `/login**` mantém a compatibilidade dos
links anteriores. Cadastro independente segue ao onboarding; convite segue ao aceite.
Não execute o push com campos vazios, domínio pendente ou uma chave de exemplo.
Nunca publique a saída de debug ou o conteúdo do arquivo `.env`.

## Verificação após ativação

- Conferir Authentication > Email > SMTP Settings no Supabase: SMTP ativo,
  host, porta, usuário e remetente corretos.
- Fazer um cadastro de teste com um endereço próprio autorizado e conferir o
  envio nos logs do Resend, o recebimento e o retorno da confirmação ao Orbit.
- Ao trocar o domínio público, atualizar Site URL, os retornos `/auth/confirm**`, `/login**` e
  `ORBIT_APP_URL`. A variável da função é aplicada por `supabase secrets set`;
  não precisa de novo deploy. Links já enviados continuam com a URL original.

O SMTP atende os e-mails do Supabase Auth. O envio de convites usa a API do Resend
na [função autenticada `send-invitation`](../functions/README.md), com os mesmos
segredos de envio e uma variável adicional `ORBIT_APP_URL` para o link de aceite.

Referências: [Resend com Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
e [endereços de teste do Resend](https://resend.com/docs/dashboard/emails/send-test-emails).
