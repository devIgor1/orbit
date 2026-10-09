# Orbit

Um workspace para equipes criativas, com interface em português, projetos,
Kanban, tarefas, comentários, equipe e indicadores conectados ao Supabase.

## Executar

Requisitos: Node.js 24 LTS e npm. Com Supabase hospedado, Docker não é necessário
para executar o frontend.

Copie `.env.example` para `.env.local` e preencha a URL e a chave pública do projeto
Supabase. Aplique as migrations no backend; a interface permite criar a conta e
cadastrar a primeira empresa. Depois execute:

```powershell
npm ci
npm run dev
```

Na configuração hospedada deste ambiente, a senha inicial do administrador fica
em `.cloud-credentials.json`, ignorado pelo Git. Esse arquivo não acompanha clones
do repositório. A conexão anterior do Docker foi preservada em `.env.docker.local`,
também ignorado; esse arquivo não é carregado no modo de desenvolvimento padrão.

### Desenvolvimento com banco local (opcional)

Para executar uma instância Supabase local, também é necessário Docker em execução:

```powershell
npm ci
npm run db:start
npm run db:seed
npm run dev
```

Abra http://127.0.0.1:5173. A conta de demonstração é provisionada pelo Auth;
as credenciais ficam em `.demo-credentials.json`, criado localmente e ignorado
pelo Git. O provisionamento grava as variáveis públicas em `.env.local`.
Nunca copie a senha ou credenciais administrativas para variáveis `VITE_*`.

O seed contém um estúdio com quatro pessoas, seis projetos e 48 tarefas.
Os registros estão no PostgreSQL e são consultados pela mesma API da aplicação.
O Supabase local utiliza portas 55521–55524 e não altera outros projetos Docker.
Veja [as instruções do backend](supabase/README.md) para migrations, RLS e métricas.

Para usar um Supabase hospedado, aplique as migrations de `supabase/migrations`,
configure os e-mails de confirmação, copie `.env.example` para `.env.local`
e preencha as duas variáveis públicas. O provisionador de demonstração aceita
somente a instância local. Configuração ausente, falhas de rede e respostas
inválidas são apresentadas explicitamente na interface.

### Publicação na Vercel

Ambiente publicado: [Orbit](https://weorbit.com.br/).

Importe o repositório na Vercel e configure `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` com os valores públicos do projeto hospedado.
`vercel.json` define Vite, o comando `npm run build`, a saída `dist` e o fallback
das rotas para `index.html`. Mudanças nas variáveis exigem um novo build/deploy.
Nunca use uma chave administrativa em variáveis `VITE_*`.

Depois de obter a URL publicada, configure o Site URL e os redirecionamentos
permitidos em Supabase Auth. Publicar o frontend não transfere dados nem aplica
migrations automaticamente; veja [a preparação do backend](supabase/README.md#hospedagem).
Use outro projeto Supabase para testes que alteram dados.

## Interface

- **Landing pública (`/`):** apresentação, recursos, etapas de uso, tour com capturas
  reais, perguntas frequentes e acesso ao login. Funciona sem sessão ou consultas
  de dados privados; o workspace continua protegido nas suas rotas.
- **Visão geral:** métricas, evolução por período, distribuição, projetos e atividade.
- **Projetos:** busca e filtros pela URL, cards/lista e paginação no backend.
- **Projeto:** edição e arquivamento, tarefas em Kanban/lista e alteração de status.
- **Tarefa:** criação, responsável, prioridade, prazo, edição, comentários e histórico.
- **Equipe:** busca de membros, carga de trabalho, edição do próprio perfil e gestão de acessos por administradores.
- **Cadastro (`/signup`):** nome, e-mail e senha com pelo menos 8 caracteres, uma
  maiúscula, uma minúscula, um número e um símbolo. Requisitos exibidos durante a
  digitação e exigidos pelo Supabase Auth; confirmação de conta por e-mail.
- **Primeiro acesso (`/onboarding`):** etapas para adicionar uma empresa e convidar
  a equipe, com progresso baseado na empresa persistida no backend.
- **Empresas (`/companies`):** criar uma empresa, escolher a empresa ativa e aceitar convites.
- **Colaboradores:** administradores criam e cancelam convites na página Equipe.
- **Login:** autenticação real, restauração de sessão, logout e sessão expirada.
- **Configurações:** perfil e e-mail de acesso, edição de nome/cargo, empresa ativa,
  permissões, acesso às empresas/equipe, gestão de convites para administradores
  e guia do Orbit.

Use `Ctrl+K` / `⌘K` para buscar projetos. O Kanban permite arrastar no desktop;
cada tarefa também tem um seletor de etapa operável por teclado e em celular.
Diálogos e painéis gerenciam foco, fechamento com Escape e bloqueio durante envio.
Permissões são aplicadas pelo banco; apenas administradores gerenciam projetos.

### Gestão de membros

Em **Equipe**, administradores usam o botão de ações de cada pessoa para alterar
seu acesso entre Administrador e Colaborador ou removê-la da empresa. A confirmação
mostra empresa, pessoa e quantidade de tarefas pendentes; é possível transferi-las
para outro membro ativo ou deixá-las sem responsável. O último administrador não
pode ser removido ou rebaixado. Alterações concorrentes são serializadas no banco;
se papel ou contagem de tarefas mudarem desde a abertura, é necessário atualizar
os dados e confirmar novamente.

A remoção encerra o vínculo ativo, preservando a conta, outras empresas, autoria,
comentários e tarefas concluídas. A atribuição de tarefas concluídas continua
visível como histórica; ao reabri-las, o responsável removido é desassociado.
Novas atribuições aceitam apenas pessoas ativas. Um novo convite válido permite
retornar como Colaborador, sem recuperar permissões administrativas anteriores.
Convites já aceitos não restauram um acesso removido.

**Histórico de acessos**, disponível para administradores, registra quem alterou
ou removeu o acesso, quando, o papel anterior/novo e o destino das tarefas.
O backend aplica as permissões em cada operação, inclusive com sessão já aberta.
O workspace verifica alterações de acesso a cada 15 segundos enquanto a aba está
ativa e ao recuperar o foco; mudanças descartam o cache privado anterior e fecham
os painéis do contexto antigo. Nenhuma sessão global da conta é encerrada.

Validação local: `npm run test:db`, `npm run test:members:concurrency` e
`npm run test:onboarding -- tests/e2e/member-management.spec.ts`. Esses testes
usam somente o Supabase local; a suíte de concorrência cria e remove suas próprias
fixtures no container `supabase_db_orbit`.

### Cadastro e empresas

1. Acesse `/signup`, cadastre seu nome, e-mail e senha e confirme o e-mail recebido.
2. O retorno `/auth/confirm` aguarda a sessão e encaminha ao `/onboarding`, sem
   exibir o formulário de login. Na primeira etapa, cadastre a empresa; somente
   após confirmação do backend é aberta a etapa de equipe. Recarregar o onboarding
   retoma os convites da empresa já criada.
3. Na etapa **Convidar equipe**, informe o e-mail da pessoa e clique em
   **Enviar convite**. O e-mail identifica você e a empresa; respostas chegam ao
   seu endereço. Também é possível **Gerar só o link**, copiar, reenviar ou cancelar.
   **Ir para o workspace** conclui o fluxo; os convites podem ficar para depois,
   em **Equipe → Convidar colaborador**.
4. A pessoa entra ou cria sua conta com o mesmo e-mail, confirma o endereço e aceita
   o convite. Cadastros originados em convites preservam esse destino em `/companies`,
   sem exigir uma empresa própria. Ela pode criar/editar tarefas, usar o Kanban e comentar nos projetos da empresa.

Convites duram sete dias. Criar novamente um convite pendente para o mesmo endereço
renova sua validade; convites cancelados ou vencidos não concedem acesso. Todos
concedem o papel de colaborador (`member`), sem permissão de administrar projetos ou convites.
O menu com o nome da empresa permite trocar de espaço; a escolha persiste no banco.
O resultado do envio fica salvo no backend. Em falha, o convite permanece disponível
para reenviar ou copiar o link, sem mostrar sucesso artificial. Reenvios respeitam
um intervalo mínimo de um minuto; a empresa pode iniciar até 30 envios por hora.
Consulte a [função de convites](supabase/functions/README.md) para configuração e testes.
O e-mail de convite segue a identidade do Orbit, com marca incorporada, paleta
grafite, empresa em destaque, ação de aceite e alternativa em texto. O HTML é
gerado a partir do CSS central; `npm run emails:preview` cria prévias de teste.
O endereço de retorno dos novos convites é `https://orbit-ashen-six.vercel.app`,
configurado em `ORBIT_APP_URL` no servidor. E-mails enviados antes dessa alteração
continuam com o link antigo; reenvie os convites que já haviam sido enviados.

**E-mails de cadastro:** o Resend está configurado no Supabase hospedado com o
remetente `Orbit <acesso@codedbyigor.com>`. A chave tem acesso somente de envio pelo
domínio verificado e fica fora do frontend/Git. Configuração remota conferida e
teste SMTP aceito, com entrega simulada registrada pelo Resend. Consulte a
[configuração e as instruções de manutenção](supabase/hosted/README.md).
A confirmação de e-mail continua obrigatória.
O Site URL usa `https://weorbit.com.br`. `/auth/confirm**` e `/login**` estão
autorizados nesse domínio, na URL anterior da Vercel e em localhost/127.0.0.1:5173.
O primeiro recebe as novas confirmações; o segundo preserva links anteriores.
O destino é validado no frontend e links expirados exibem opções de recuperação.

Para testar o fluxo completo sem enviar e-mails externos, inicie o Supabase local,
aplique `npx supabase db push --local`, preencha `.env.docker.local` com as duas
variáveis públicas apontando à API `http://127.0.0.1:55521` e execute
`npm run test:onboarding`. O teste abre o Vite em 5174, cria contas no banco local,
lê os links de confirmação no Mailpit local (55524), valida convites e o Kanban em
desktop/celular. Não executa contra o backend hospedado. A suíte padrão de E2E
exclui esses cenários; ambos os ambientes conservam os dados após o teste.

Todos os seletores de data usam `DatePicker` de `src/components/ui`, composto por
[Calendar](https://ui.shadcn.com/docs/components/radix/calendar) e
[Popover](https://ui.shadcn.com/docs/components/radix/popover) do shadcn. Criação e
edição de projetos e tarefas oferecem calendário em português, seleção de mês/ano,
Hoje e Limpar data. A interface exibe `DD/MM/AAAA`; os formulários mantêm `YYYY-MM-DD`
sem conversão UTC e os serviços existentes convertem o campo vazio em `null`.
Setas navegam pelos dias, Enter seleciona e Escape fecha o calendário e devolve
o foco ao campo. O controle fica desabilitado durante o envio.

Todos os selects usam o [Select shadcn com Base UI](https://ui.shadcn.com/docs/components/base/select),
adaptado do registro `base-nova`. Isso inclui período do dashboard, filtros,
formulários, etapa das tarefas no Kanban/lista e mês/ano do calendário.
`OptionsSelect` recebe opções tipadas, `value` e `onValueChange`; formulários usam
`Controller` e mantêm os contratos existentes. “Sem responsável” continua sendo
o valor vazio, convertido pelo serviço. Setas, busca por digitação, Home/End,
Enter e Escape são tratados pela biblioteca; rótulos e foco permanecem acessíveis.
`TaskStatusSelect` reutiliza o padrão em cards e tabelas, mantendo o último status
confirmado até o backend concluir a atualização.

## Sistema visual e arquitetura

React 19, Vite 8, TypeScript estrito, React Router, TanStack Query, Supabase,
React Hook Form, Zod, Recharts, Lucide, Tailwind v4 e primitivos shadcn/Base UI e Radix
adaptados. As versões exatas estão no `package-lock.json`.

`src/styles/globals.css` é a única fonte de estilos autorais, incluindo fontes
locais DM Sans/Plus Jakarta Sans, tokens, estados e responsividade.
`components.json` aponta para o mesmo arquivo. TSX utiliza classes semânticas.

Login, cadastro, empresas e workspace compartilham grafite, branco suave e cinzas
quentes. A logo é monocromática, clara sobre fundos escuros e escura sobre branco.
O painel do login usa os mesmos tokens escuros da sidebar. A landing usa a variação
escura da identidade, com detalhes em branco quente.

Botões primários usam um degradê discreto em carvão, brilho interno e sombra neutra.
O acabamento é compartilhado por autenticação, empresas, workspace e formulários em portal, com
estados de hover, pressionado, foco e desabilitado. As regras e os tokens
`--button-primary-*` ficam exclusivamente em `globals.css`.

Os principais tokens compartilhados são:

| Papel | Cor |
| --- | --- |
| Ações principais | Carvão `#292929` |
| Fundo do workspace | Branco suave `#f7f7f5` |
| Texto principal | Grafite quente `#242321` |
| Texto secundário | Cinza quente `#66635e` |
| Destaques sobre grafite | Branco quente `#dedbd5` |
| Painel do login e sidebar | Grafite `#101113` |

São cores originais do Orbit. A organização semântica usa como referência a
[composição de paletas](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)
e os [papéis da escala](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
do Radix Colors, sem copiar uma escala pronta. Tokens centralizados definem
superfícies, texto, hover, foco, estados e cores dos gráficos. Status combinam cor
com texto ou ícone. A marca e o `theme-color` acompanham a identidade; as capturas
em `public/product` são regeneradas a partir do produto real com
`scripts/capture-product.mjs` para refletir a paleta.

As referências de acessibilidade são os critérios WCAG 2.2 de
[contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
e [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
A entrega de paleta registrada na seção 17 do plano passou por lint, tipos/build, verificações de estilos e
arquitetura, 32 testes em sete arquivos e 19 E2E; um caso de menu exclusivo de
celular foi omitido no desktop. Os pares de tokens medidos incluem branco sobre
a cor principal (6,80:1), texto sobre o fundo (10,97:1) e foco no tema claro
(4,77:1). Os resultados completos estão na seção 17 do plano de implementação.
A revisão das sete rotas, incluindo landing e login, em desktop e celular, com
amostra adicional em tablet, não identificou overflow horizontal da página, erros
de execução ou alertas inesperados. Foram registradas 18 capturas de telas e uma
captura adicional de foco do CTA em `docs/screenshots/palette`, sem escritas de
negócio durante o QA.
As medições de contraste cobrem os textos CSS verificados; não constituem uma
auditoria WCAG completa. Esses resultados antecedem a reformulação da landing
registrada na seção 18 do plano.

A revisão atual, na seção 29, aplica a identidade monocromática ao sistema:
carvão nas ações, branco suave nas superfícies e cinzas quentes nos apoios.
O contraste medido é 10,21:1 no trecho mais claro do botão, 5,98:1 no texto
secundário e 7,54:1 no foco sobre branco. Verde, âmbar e vermelho continuam
comunicando estados. Links de texto têm sublinhado, sem depender de uma cor viva.

A escala tipográfica compartilhada usa tokens `--font-size-*` em `rem`: legendas
de 12 px, rótulos e textos secundários de 14 px, corpo e campos de 16 px e textos
de destaque de 18 px, considerando o tamanho padrão do navegador. As telas menores
reorganizam controles e conteúdo para preservar essa leitura. Diálogos e painéis
mantêm o cabeçalho visível enquanto o corpo rola.

- `src/components/ui`: Button (`default`, `outline`, `ghost`, `secondary`,
  `destructive`; tamanhos `default`, `sm`, `icon`), Input, Select, Textarea,
  Dialog, Sheet, Avatar, Badge e Progress.
- `src/components/layout`: shell, navegação, cabeçalhos e busca.
- `src/components/shared`: métricas, estados de consulta, tabelas e gráficos.
- `src/features`: apresentação, schemas, hooks e serviços por domínio.
- `src/lib`: cliente/tipos Supabase, mensagens seguras e cache remoto.

O adaptador `src/components/shared/chart-geometry.ts` lê dimensões do tema
para APIs do Recharts; a biblioteca controla apenas coordenadas e posicionamento.
`src/lib/dom/popover-geometry.ts` resolve os tokens CSS de afastamento e borda
para o posicionamento e a prevenção de colisões do Radix e do Base UI. O calendário usa
`react-day-picker` e `date-fns`, sem estilos próprios fora do CSS central.
`Progress` utiliza o elemento HTML nativo. Nenhum componente define estilos inline.

`SelectLayer` integra o portal Base UI à pilha de foco e fechamento dos Dialog,
Sheet e Popover Radix existentes. Assim, Escape fecha primeiro o select e a escolha
de uma opção mantém o formulário aberto. O calendário de um mês navega pelo
`goToMonth` público do DayPicker, sem simular eventos de selects nativos.

As tabelas desta entrega usam HTML semântico e a paginação/filtros dos serviços.
O arraste usa Drag and Drop nativo, com seletor de status como alternativa acessível.
TanStack Table e dnd-kit ficam reservados para ordenação avançada e gestos de toque;
essa simplificação e o escopo entregue estão registrados no plano.

## Verificação

```powershell
npm run lint
npm run typecheck
npm run check:styles
npm run check:architecture
npm run test
npm run test:db
npx playwright install chromium
npm run test:e2e
npm run build
```

Resultado em 08/10/2026: lint, tipos, estilos, arquitetura e build aprovados;
32 testes unitários/integração, 11 testes de banco e 8 testes E2E aprovados.
Layout revisado em 1440px, 820px e 390px. Capturas em `docs/screenshots`.

As verificações de estilo/arquitetura analisam AST, imports, classes e o contrato
do CSS central. Testes unitários cobrem falhas, contratos, sessão e preservação
de formulários. Testes de banco verificam RLS e vínculos. E2E usa exclusivamente
o backend local para escrita e verifica persistência depois do reload, teclado,
desktop e celular. Screenshots ficam em `test-results`.

O teste `npx playwright test tests/e2e/date-picker.spec.ts` usa uma entrada isolada
em `tests/fixtures`, com os formulários reais em Dialog/Sheet. Verifica teclado,
foco, seleção, remoção e formato enviado em desktop/celular, sem autenticação nem
escritas no backend. Essa entrada não faz parte do build de produção. O check de
arquitetura rejeita inputs de data e selects nativos para manter o padrão shadcn.
`npx playwright test tests/e2e/date-picker.spec.ts tests/e2e/select.spec.ts` também
verifica os valores dos selects, remoção do responsável, opções longas e
preservação dos campos em erro. As fixtures e falhas simuladas são exclusivas
dos testes; não substituem as consultas reais da aplicação.

Para atualizar os contratos após alterar migrations: `npm run db:types`.
Não altere manualmente `src/lib/supabase/database.generated.ts`.

Formatação: configuração Prettier em `.prettierrc.json`; execute
`npx prettier --write caminho/do/arquivo` nos arquivos alterados.
Para atualizar as capturas com a conta local: `node scripts/capture-preview.mjs`.
Para atualizar os assets da landing com o workspace local:
`node scripts/capture-product.mjs`. O script valida o ambiente e o perfil de
demonstração antes de gravar as quatro imagens em `public/product`.

### Dashboard e navegação do workspace

O painel combina navegação lateral escura, superfícies claras e ações em carvão.
A saudação usa a mesma paisagem da landing, seguida por uma faixa comparativa de
indicadores. Projetos ativos aparecem em cartões com descrição e prazo; evolução,
distribuição e atividade ocupam regiões separadas. Os valores continuam vindos
do Supabase, com erro, carregamento e vazio tratados explicitamente.

O seletor de período altera as conclusões e a série temporal. Projetos ativos,
pendências, atrasos e distribuição representam o estado atual do workspace.
A listagem mostra até quatro projetos ativos, ordenados pela criação mais recente;
“Ver todos” abre a listagem filtrada. Atividade apresenta os últimos eventos
consultados, sem afirmar transmissão em tempo real.

Login, cadastro, empresas e workspace herdam a paleta de `:root` no CSS central,
incluindo diálogos e painéis em portal. A navegação mobile usa o Sheet existente
abaixo de 900 px. Os componentes da visão geral ficam na feature de dashboard.
Não há novas dependências, consultas, contratos ou migrations nesta alteração.

Capturas reproduzíveis: `node scripts/capture-workspace-redesign.mjs`, usando apenas
a conta e o Supabase locais. Evidências em `docs/screenshots/dashboard-redesign`;
o script também verifica overflow e erros de execução.

### Landing page

Componentes em `src/features/landing/components`, compostos por
`src/pages/landing-page.tsx`. A composição atual adapta o código original da
[Inference Landing Page do Aceternity UI](https://ui.aceternity.com/pages/inference-landing-page)
obtido pelo registry autenticado com autorização do usuário. O comando oficial
`pnpm dlx shadcn@latest add @aceternity/inference-landing-page` foi executado em
uma pasta temporária; os componentes usados foram adaptados para Vite, os
primitivos do Orbit e classes semânticas. O projeto continua com npm e ganhou
somente `motion` como dependência de execução. Não há token no código/bundle.
O tema preto e papel do template é delimitado à landing e ao portal do
menu mobile; os destaques acompanham os neutros compartilhados descritos acima. Todos os estilos
continuam na seção 09 de `globals.css`.

Hero, recursos, canvas, chamada final e rodapé derivam dos arquivos oficiais.
Textos e destinos foram adaptados às funcionalidades reais do Orbit. O tour com
capturas reais e a FAQ complementam a apresentação; seções específicas de GPUs,
catálogo de modelos e cobrança por tokens não integram esta plataforma de projetos.

A imagem atual é o asset original `beautiful-landscape.webp` da Aceternity, salvo
em `public/images/aceternity-landscape.webp` (1672 × 941, cerca de 68 KiB).
O hero usa as camadas da paisagem e entradas escalonadas de palavras, com a
captura real do dashboard entrando em perspectiva. O fundo anterior gerado com
ImageGen permanece como histórico e não é carregado pela landing atual.

Recursos tem quatro abas — Projetos, Tarefas, Equipe e Visão geral — abaixo de
uma paisagem com cartão branco central, reproduzindo a composição do template.
O recorte da imagem, o cartão e a descrição mudam juntos; as ilustrações mostram
capacidades, sem inventar contagens de negócio. Setas, Home/End e Tab funcionam.
O canvas permite arrastar nove cartões e ligar quatro entradas ao projeto.
Conexões completas ativam quatro saídas; há alternativa por teclado, conexão de
tudo, reinício e lista por toque no celular. Toda interação é uma demonstração
local identificada, sem gravar dados no workspace. O CTA aplica o dither original
com revelação pela posição do cursor. Os acessos ao workspace levam a `/login`.

O menu mobile usa o Sheet compartilhado, com Escape e retorno de foco. O cabeçalho
permanece visível ao rolar, ganha sombra e indica a seção atual com `aria-current`.
Títulos, abas, painéis de apresentação, canvas, tour, perguntas e CTA entram uma
única vez; elementos já visíveis na abertura não ficam ocultos.
As âncoras têm rolagem suave via CSS somente na landing e quando a preferência é
`prefers-reduced-motion: no-preference`; links diretos com fragmentos permanecem
disponíveis. O foco e a navegação por âncoras revelam o conteúdo de destino.
Sem `IntersectionObserver`, o conteúdo permanece visível. Ativar movimento
reduzido revela todos os elementos e interrompe a observação, sem ocultá-los
novamente ao desativar a preferência. Os hooks em `src/features/landing/hooks`
controlam o comportamento; a aparência permanece no CSS central.

Movimento reduzido desativa as entradas, fluxos animados e transições decorativas.
O logo do login permite voltar à página pública.
Capturas são material de apresentação, identificadas como demonstração; não
substituem dados do backend nas telas da aplicação. Não há cadastro público,
contratação ou promessa de funcionalidades fora do escopo atual.

Os adaptadores em `src/lib/dom` escrevem apenas posições medidas do cursor e dos
cartões e escala calculada do canvas. Dimensões iniciais, cores, tipografia e
animações continuam no CSS central. Fonte, escopo e verificações desta importação
estão registrados na seção 20 do plano; entregas anteriores permanecem históricas.

## Apresentação do login

O painel esquerdo de `/login` combina a mensagem da marca, uma captura real do
Kanban e três benefícios do produto. Em telas largas, texto e benefícios ficam ao
lado da captura; em desktops menores, a composição é vertical. No celular, a
apresentação é compacta para manter o formulário acessível.

O fundo grafite, os textos claros e os detalhes em branco quente seguem a identidade do
dashboard. O formulário usa as mesmas cores de ação, bordas e foco dos campos do
workspace. Logo, ícones, moldura da captura e órbitas usam os tokens compartilhados.
A substituição do verde/dourado está registrada na seção 24 do plano.

`LoginStory` e `LoginBenefits` ficam em `src/features/auth/components`.
`ProductPreview`, reutilizado pela landing e pelo login, fica em
`src/components/shared`. Toda a aparência permanece em `globals.css`.

Verificação em 08/10/2026: lint, tipos/build, estilos e arquitetura aprovados;
dois testes E2E de navegação do login por teclado aprovados em desktop e celular.
Revisão visual em 1440×900, 1920×1080, 2560×960 e 390×844, com capturas
`login-*.png` em `docs/screenshots`. Nenhuma mudança no fluxo de autenticação.

## Apresentação em dois minutos

1. Entre com a conta local e apresente a visão geral e o filtro de período.
2. Abra Projetos, alterne entre cards/lista e encontre uma criação do estúdio.
3. Abra o projeto, crie uma tarefa e atribua uma pessoa.
4. Altere a etapa pelo seletor, recarregue e confira a persistência.
5. Abra a tarefa, publique um comentário e consulte o histórico.
6. Volte ao dashboard para conferir os indicadores e apresente Equipe.

Esta entrega roda localmente. Publicação na Vercel e em Supabase hospedado
continua pendente; nenhum deploy público foi realizado.

Referências: [Tailwind com Vite](https://tailwindcss.com/docs/installation/using-vite),
[shadcn manual](https://ui.shadcn.com/docs/installation/manual),
[cliente Supabase](https://supabase.com/docs/reference/javascript/initializing).
