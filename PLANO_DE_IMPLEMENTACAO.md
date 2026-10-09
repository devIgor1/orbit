# Orbit — Plano de implementação

## 1. Objetivo

Construir uma plataforma de gestão de projetos para agências e estúdios criativos,
com acabamento visual premium, interfaces administrativas reutilizáveis e um fluxo
completo conectado a um backend real.

A demonstração principal será: entrar no workspace, criar um projeto, cadastrar uma
tarefa, atribuir um responsável, mover a tarefa no Kanban e conferir os indicadores
atualizados. As alterações deverão continuar presentes após recarregar a página.

**Premissa de produto:** este plano adota o Orbit, a plataforma SaaS sugerida na
conversa, como projeto de referência.

**Raiz do projeto:** `orbit/`. O arquivo de instruções será `orbit/AGENTS.md`.

**Estado em 08/10/2026:** interface implementada e conectada ao Supabase hospedado.
A instalação local foi preservada. A publicação do frontend continua pendente;
a seção 22 registra a configuração da nuvem e suas verificações. O roadmap
permanece como referência de aceite.

## 2. Requisitos obrigatórios

1. Usar shadcn/ui e Tailwind CSS para construir o sistema visual.
2. Concentrar todos os estilos autorais em `src/styles/globals.css`.
3. Componentizar elementos e padrões para reutilização entre páginas.
4. Manter arquivos com responsabilidade única, evitando páginas, componentes,
   hooks e serviços monolíticos.
5. Consumir dados de negócio exclusivamente do backend.
6. Exibir erros reais de integração, sem substituí-los por mocks, listas vazias,
   números zero ou mensagens de sucesso.
7. Padronizar componentes, interações e estados em todo o sistema.
8. Entregar navegação responsiva, acessível por teclado e coerente visualmente.

## 3. Escopo da primeira versão

| Área | Entrega |
| --- | --- |
| Autenticação | Login, logout, restauração de sessão e tratamento de sessão expirada. |
| Visão geral | Projetos ativos, tarefas pendentes, atrasadas e concluídas; evolução semanal; atividades recentes. |
| Projetos | Busca, filtros, paginação, criação, edição e arquivamento. |
| Detalhes do projeto | Resumo, progresso, tarefas em lista e Kanban, responsáveis e prazos. |
| Detalhes da tarefa | Painel lateral com edição, comentários e histórico. |
| Equipe | Membros reais do workspace, busca, tarefas atribuídas e edição do próprio perfil. |
| Experiência compartilhada | Menu lateral, cabeçalhos, breadcrumbs, filtros, formulários e estados de consulta padronizados. |

Rotas previstas: `/` (landing pública), `/login`, `/dashboard`, `/projects`, `/projects/:projectId` e
`/team`. O painel da tarefa pertence ao contexto de seu projeto.

O Kanban permite mover tarefas entre etapas. A versão inicial usa ordenação estável
por criação e identificador dentro de cada etapa, simplificando a persistência.

## 4. Stack proposta

| Camada | Tecnologia e responsabilidade |
| --- | --- |
| Aplicação | React, TypeScript em modo estrito e Vite. |
| Navegação | React Router, incluindo filtros compartilháveis pela URL. |
| Interface | shadcn/ui, Tailwind CSS v4 e Lucide. |
| Dados remotos | TanStack Query para consultas, mutações, cache e invalidação. |
| Formulários | React Hook Form e Zod. |
| Tabelas | TanStack Table para controlar ordenação, filtros e paginação do backend. |
| Gráficos | Recharts por meio de componentes compartilhados. |
| Kanban | dnd-kit, com alternativa de alteração de status por teclado/formulário. |
| Backend | Supabase Auth, PostgreSQL, Data API e funções SQL quando necessário. |
| Verificação | ESLint, TypeScript, Vitest, Testing Library, Playwright e testes de banco. |
| Publicação | Frontend estático na Vercel e backend no Supabase. |

As versões compatíveis serão verificadas no bootstrap e fixadas no lockfile. O
Supabase fornece o backend real e permite concentrar a implementação na interface.

### Preparação do ambiente

- Configurar Node.js LTS, npm e o ambiente local do Supabase com Docker.
- Disponibilizar um projeto Supabase hospedado para a demonstração pública.
- Documentar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.example`.
- Manter credenciais administrativas apenas no ambiente de provisionamento.
- Provisionar contas de demonstração pelo Auth e executar o seed no banco.
- Configuração ausente deve produzir um erro de configuração identificável.

## 5. Arquitetura e organização

```text
orbit/
├── AGENTS.md
├── PLANO_DE_IMPLEMENTACAO.md
├── README.md
├── components.json
├── .env.example
├── src/
│   ├── app/                 # Router, providers e composição da aplicação
│   ├── pages/               # Composição das rotas
│   ├── components/
│   │   ├── ui/              # Primitivos shadcn adaptados ao padrão visual
│   │   ├── layout/          # AppShell, Sidebar, Header e PageHeader
│   │   └── shared/          # DataTable, filtros, métricas e estados
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── tasks/
│   │   └── team/
│   ├── lib/
│   │   ├── supabase/        # Cliente e tipos gerados do banco
│   │   ├── errors/          # Classificação e mensagens de erro
│   │   └── query/           # QueryClient e convenções de cache
│   └── styles/
│       └── globals.css     # Única fonte de estilos autorais
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
├── scripts/                # Verificações de arquitetura e provisionamento
└── tests/
    └── e2e/
```

Cada feature terá componentes, serviços, hooks e schemas separados conforme a
necessidade. Criar os arquivos junto com suas responsabilidades concretas.

Fluxo de dependências:

`Página → componente de feature → hook de consulta/mutação → serviço → Supabase`

Os componentes de `ui` e `shared` recebem dados e callbacks por props. Eles não
consultam o banco nem importam páginas ou regras de uma feature específica.

As páginas coordenam os estados de consulta e compõem os componentes. Consultas,
validação, transformação de respostas e regras de negócio ficam em suas camadas.

## 6. Contrato visual: shadcn + Tailwind + globals.css

### Fonte única de estilos

`globals.css` conterá tokens e regras visuais: cores, tipografia, escala de
espaçamento, dimensões recorrentes, bordas, sombras, estados, animações e
responsividade. Será importado uma vez pelo ponto de entrada da aplicação.

- Configurar `components.json` com `tailwind.css` apontando para esse arquivo e
  `cssVariables: true`.
- Definir tokens semânticos e seu mapeamento para Tailwind com `@theme inline`.
- Compor utilitários Tailwind dentro do CSS, usando `@apply` quando apropriado.
- Usar classes semânticas no TSX, como `ui-button`, `page-header` e `task-card`.
- Usar props de variantes e atributos `data-*` para representar estados.
- Adaptar as classes geradas pelo shadcn para esse contrato, preservando seu
  comportamento e sua acessibilidade.
- Proibir CSS Modules, CSS-in-JS, folhas CSS por componente, estilos inline de
  aparência e combinações de utilitários visuais espalhadas pelo TSX.

O comportamento padrão do gerador shadcn inclui utilitários nos componentes. A
adaptação para classes semânticas faz parte da instalação de cada componente.

### Layout calculado por bibliotecas

Bibliotecas de overlays, gráficos e drag-and-drop podem calcular coordenadas,
dimensões medidas e transformações em runtime. Esses valores técnicos serão
isolados nos adaptadores compartilhados e documentados; não poderão definir cores,
tipografia, espaçamento de design ou outros valores de identidade visual.

Toda configuração visual de gráficos referenciará tokens do `globals.css`.
Bibliotecas que injetem temas ou regras visuais próprias deverão ser adaptadas a
esse contrato antes de serem utilizadas.

### Organização do CSS único

Organizar o arquivo com índice e seções delimitadas, respeitando a ordem de imports
do CSS e as camadas do Tailwind:

1. Imports de infraestrutura e declarações de tema.
2. Tokens semânticos e mapeamento de escalas.
3. Estilos base e tipografia.
4. Primitivos de interface.
5. Layout e padrões compartilhados.
6. Padrões específicos de features, com seletores delimitados.
7. Estados, responsividade e redução de movimento, agrupados por componente.

O tamanho desse arquivo será controlado pela reutilização de tokens e padrões,
remoção de regras mortas e eliminação de duplicações. O limite orientativo de
linhas dos arquivos TS/TSX não se aplica ao CSS centralizado.

### Direção de arte

- Tema claro com fundo marfim `#f7f8f4`, texto `#233d37` e verde petróleo `#16665c`
  nas ações e na marca. Mel `#e6bb6c` como destaque complementar; superfícies
  escuras `#183f36` no painel do login e na chamada final da landing.
- Fonte sans-serif consistente e números tabulares nos indicadores.
- Escala de espaçamento previsível e densidade adequada às tabelas.
- Bordas sutis, raios padronizados e animações curtas.
- Estados de prioridade e status comunicados por texto, ícone e cor.
- Mesmos padrões de formulário, filtro e painel lateral em todas as páginas.

## 7. Backend e integridade dos dados

### Modelo mínimo

| Entidade | Informações principais |
| --- | --- |
| `profiles` | Usuário do Auth, nome e avatar opcional. |
| `workspaces` | Nome e identificação do espaço de trabalho. |
| `workspace_members` | Workspace, usuário e papel `admin` ou `member`. |
| `projects` | Workspace, título, descrição, status, prazo e criador. |
| `tasks` | Workspace, projeto, título, descrição, status, prioridade, prazo e responsável. |
| `task_comments` | Workspace, tarefa, autor, texto e data. |
| `activity_events` | Workspace, entidade, ação, autor e data gerados no backend. |

UUIDs, datas de criação/atualização, valores permitidos, chaves estrangeiras e
restrições serão definidos no banco. A tarefa deverá pertencer ao workspace de seu
projeto, e seu responsável deverá ser membro desse mesmo workspace. Aplicar
restrições compostas ou validações transacionais para garantir esses vínculos.

### Permissões e contratos

- Ativar RLS e conceder apenas as operações necessárias em todas as tabelas expostas.
- Permitir acesso somente a workspaces dos quais o usuário é membro.
- Administradores gerenciam projetos; membros trabalham nas tarefas e comentários.
- Usuários editam seu próprio perfil; o diretório mostra apenas colegas autorizados.
- Histórico de atividade é escrito no backend na mesma transação da operação.
- Proteger a tabela de membros contra autoatribuição de papel administrativo.
- Views de indicadores devem respeitar RLS, usando `security_invoker` quando cabível.
- Funções privilegiadas terão escopo mínimo, `search_path` fixado e permissões explícitas.
- Consultas retornarão os campos necessários, com filtros e paginação no backend.
- Mutações deverão retornar o registro afetado; zero registros afetados não significa sucesso.
- Gerar tipos TypeScript a partir do schema e validar contratos de entrada/saída
  nas fronteiras em que isso for necessário, especialmente RPCs e formulários.

### Indicadores

O backend calculará os totais e as séries do dashboard, considerando o workspace e
o período consultado. O frontend formatará os resultados.

Documentar o significado de cada indicador. Por exemplo: tarefas atrasadas são
tarefas com prazo anterior ao instante de referência e status diferente de
concluído. Progresso sem tarefas será um estado explicitamente definido no contrato.

### Dados de demonstração

Criar um seed reproduzível com projetos de identidade visual, campanhas e sites,
distribuindo tarefas por diferentes prazos, responsáveis e etapas. Os registros
serão persistidos no PostgreSQL e consumidos pelas mesmas consultas da aplicação.

O seed de negócio será associado a usuários reais previamente provisionados no
Supabase Auth. Credenciais administrativas e senhas não serão versionadas.

## 8. Estados de interface e tratamento de erros

| Situação | Comportamento esperado |
| --- | --- |
| Consulta pendente | Skeleton ou indicador de carregamento acessível. |
| Sucesso com registros | Renderizar os dados retornados pelo backend. |
| Sucesso sem registros | EmptyState com mensagem contextual e ação aplicável. |
| Falha de consulta | ErrorState com mensagem útil e ação de tentar novamente. |
| Falha em atualização de consulta | Evidenciar o erro na região afetada; não apresentar cache antigo como resultado atualizado. |
| Falha de mutação | Preservar o formulário, informar o erro e manter o último estado confirmado. |
| Sessão expirada | Solicitar nova autenticação. |
| Acesso negado | Exibir estado de permissão insuficiente. |
| Resposta fora do contrato | Tratar como erro de integração identificável. |

Nunca converter uma falha em `[]`, `0`, um objeto fictício ou uma resposta de
sucesso. Valores realmente vazios ou zero são válidos quando confirmados por uma
resposta bem-sucedida e compatível com o contrato.

O cache do TanStack Query guarda respostas reais. Suas chaves incluirão usuário,
workspace e filtros relevantes; o cache será limpo na troca de sessão. Mutações
confirmadas invalidarão as consultas de detalhes, listagens e indicadores afetadas.

Na primeira versão, o sucesso visual de uma mutação dependerá da confirmação do
backend. O arraste pode mostrar uma prévia temporária; em falha, a tarefa retorna à
posição confirmada e o erro é apresentado. O formulário continua disponível para
nova tentativa sem perder os valores digitados.

## 9. Roadmap por ondas

### Onda 0 — Contrato do projeto

**Entregas:** adicionar `AGENTS.md` na raiz e registrar este plano.

**Aceite:** requisitos de estilos, componentização, tamanho/responsabilidade dos
arquivos, backend e consistência visual estão explícitos e verificáveis.

### Onda 1 — Fundação e sistema visual

**Dependência:** onda 0.

**Entregas:**

- Inicializar React, Vite, TypeScript estrito e roteamento.
- Configurar Tailwind, shadcn, aliases, formatação e lint.
- Criar `globals.css` com tokens e estrutura de seções.
- Criar AppShell, PageHeader, Button, Input, Select, Dialog, Sheet e StatusBadge.
- Criar LoadingState, EmptyState e ErrorState reutilizáveis.
- Implementar as verificações `check:styles` e `check:architecture`.

**Aceite:** shell responsivo, navegação por teclado e componentes básicos com
identidade consistente; nenhum estilo autoral fora de `globals.css`.

### Onda 2 — Backend, autenticação e integração-base

**Dependência:** onda 1; ambiente Supabase preparado.

**Entregas:**

- Criar migrations, constraints, índices, políticas RLS e seed.
- Provisionar contas demonstrativas e gerar tipos do banco.
- Implementar login, logout, proteção de rotas e resolução do workspace.
- Criar cliente Supabase, QueryClient, tratamento de erros e serviços iniciais.
- Testar permissões entre usuários de workspaces diferentes.

**Aceite:** login real; seed consultável pela API; usuário sem vínculo não acessa
dados de outro workspace; falha de conexão aparece como erro na interface.

### Onda 3 — Fluxo principal de projetos e tarefas

**Dependência:** onda 2.

**Entregas:**

- Listagem de projetos com filtros, paginação, cadastro, edição e arquivamento.
- Página de projeto composta por cabeçalho, resumo, filtros e lista/Kanban.
- Cadastro e edição de tarefas, atribuição de responsável e alteração de status.
- Painel lateral com comentários e histórico persistidos.
- Invalidação de cache após sucesso e tratamento explícito das falhas de escrita.

**Aceite:** criar projeto e tarefa, alterar status e recarregar conserva os dados;
uma escrita recusada nunca produz confirmação de sucesso nem alteração persistente
na interface. A alteração de status também funciona por teclado.

### Onda 4 — Dashboard e equipe

**Dependência:** onda 3 e contratos de agregação do backend.

**Entregas:**

- Cards de métricas, gráfico de evolução, distribuição por etapa e atividade recente.
- Filtro de período integrado às consultas.
- Diretório da equipe, carga de tarefas e edição do próprio perfil.
- Reutilização dos padrões de cabeçalhos, tabelas, filtros, badges e estados.

**Aceite:** indicadores conferem com os registros do banco; concluir uma tarefa
atualiza as consultas afetadas; uma falha de indicadores aparece na região correta.

### Onda 5 — Acabamento, verificação e apresentação

**Dependência:** onda 4.

**Entregas:**

- Revisar layouts em celular, tablet e desktop, incluindo textos e listas extensos.
- Revisar foco, labels, contraste, navegação por teclado e movimento reduzido.
- Executar verificações estáticas, testes críticos e build de produção.
- Publicar frontend e backend, configurar variáveis e reescrita de rotas da SPA.
- Validar login, links diretos e recarregamento na versão publicada.
- Preparar README, screenshots e roteiro de demonstração de dois minutos.

**Aceite:** fluxo principal validado no deploy, navegação consistente, nenhuma
requisição fracassada mascarada e instruções de execução reproduzíveis.

## 10. Verificações de qualidade

Scripts previstos, a serem criados durante a implementação:

| Comando | Verificação |
| --- | --- |
| `npm run lint` | Padrões, imports e regras de componentes/hooks. |
| `npm run typecheck` | Contratos e TypeScript estrito. |
| `npm run check:styles` | CSS autoral único, classes semânticas e ausência de estilos visuais inline/CSS-in-JS. |
| `npm run check:architecture` | Fronteiras de imports e sinalização de arquivos TS/TSX extensos. |
| `npm run test` | Regras relevantes de validação e integração de estados/mutações. |
| `npm run test:db` | Integridade relacional e permissões, usando o Supabase local. |
| `npm run test:e2e` | Fluxos críticos no navegador. |
| `npm run build` | Geração da versão de produção. |

As verificações de estilos e arquitetura deverão usar análise adequada de AST,
imports e nomes de classes. As exceções técnicas de posicionamento serão
documentadas por adaptador, sem permissões genéricas para estilos locais. A revisão
manual complementará a checagem automática de responsabilidades e coerência visual.

### Cenários essenciais

1. Login, criação de projeto/tarefa, atualização de status e persistência após reload.
2. Erro de consulta apresenta ErrorState, sem registros fictícios nem estado vazio.
3. Erro de gravação preserva a edição e não exibe sucesso.
4. Consulta bem-sucedida sem registros apresenta EmptyState.
5. Sessão expirada e acesso indevido são tratados corretamente.
6. Políticas impedem leitura/escrita entre workspaces e vínculos inconsistentes.
7. Dashboard, detalhes e listagens refletem uma mutação confirmada.
8. Navegação principal, formulário e alteração de status funcionam por teclado.

Fluxos de sucesso ponta a ponta utilizarão o backend local com seed. Simulações de
rede serão restritas aos testes de falha, permitindo reproduzir indisponibilidade e
erros de contrato de forma determinística.

## 11. Organização para a semana da entrevista

Estimativa de cinco dias focados, condicionada à disponibilidade dos ambientes:

| Dia | Foco |
| --- | --- |
| 1 | Fundação visual, configuração do ambiente e início da integração com o banco. |
| 2 | Concluir autenticação/permissões e entregar o fluxo de projetos. |
| 3 | Tarefas, Kanban, painel lateral e persistência. |
| 4 | Dashboard, equipe e integração dos componentes compartilhados. |
| 5 | Verificação, acabamento responsivo, deploy e preparação da apresentação. |

Os critérios de aceite determinam a conclusão das ondas. A passagem de um dia no
cronograma não substitui a verificação de uma entrega.

## 12. Roteiro da demonstração

1. Apresentar a visão geral e explicar a organização visual.
2. Abrir um projeto e mostrar a reutilização de filtros, badges e painéis.
3. Criar uma tarefa, atribuir um membro e mudar sua etapa.
4. Mostrar atualização dos indicadores e persistência após recarregar.
5. Demonstrar um estado de erro controlado e explicar a integração com o backend.
6. Apresentar brevemente `AGENTS.md`, arquitetura por features e sistema de tokens.

## Referências técnicas

- Tailwind: https://tailwindcss.com/docs/functions-and-directives
- shadcn/ui: https://ui.shadcn.com/docs/theming
- Supabase/RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Radix Colors — composição de paletas: https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette
- Radix Colors — papéis da escala: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- WCAG 2.2 — contraste de texto: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2 — contraste não textual: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

## 13. Entrega visual — 08/10/2026

- Fundação React/Vite/TypeScript estrito, Tailwind v4 e primitivos shadcn/Radix
  adaptados ao CSS central. Fontes locais DM Sans e Plus Jakarta Sans.
- Shell responsivo, menu mobile, busca por teclado, diálogos e painéis acessíveis.
- Telas de login, dashboard, projetos, projeto/Kanban, tarefa, equipe e configuração.
- Supabase local isolado, autenticação, RLS, migrations, tipos gerados e seed
  persistido com 6 projetos, 48 tarefas e 4 pessoas.
- CRUD de projetos/tarefas, responsáveis, comentários, histórico, perfil e indicadores
  ligados ao backend; estados de consulta e erros explícitos.
- Lint, tipos, estilos, arquitetura e build aprovados. Executados com sucesso
  32 testes unitários/integração, 11 testes de banco e 8 E2E em desktop/celular.
- Layout revisado em 1440px, 820px e 390px; capturas salvas em `docs/screenshots`.

### Decisões desta entrega

- A rota auxiliar `/settings` torna a configuração/estado da conexão acessível.
- O workspace selecionado é o primeiro vínculo autorizado do usuário, ordenado por
  criação e UUID. Troca entre múltiplos workspaces permanece fora desta versão.
- Tabelas usam HTML semântico reutilizável, filtros e paginação do backend.
  Ordenação avançada com TanStack Table fica para uma evolução.
- O Kanban usa arraste nativo no desktop; seletores de etapa funcionam por teclado
  e no celular. Gestos com dnd-kit ficam para uma evolução. A ordem segue criação/UUID.
- Filtragem de tarefas ocorre sobre as tarefas reais do projeto já consultadas;
  filtros e paginação de projetos são executados no Supabase.
- As rotas são carregadas sob demanda e as fontes utilizam o subconjunto latino.
- Não houve publicação pública. Aceites relativos a Vercel, Supabase hospedado,
  URLs publicadas e ambiente de produção permanecem pendentes.

## 14. Landing page — 08/10/2026

Registro da primeira versão. A composição atual está documentada na seção 18.

- Rota `/` pública, fora do AppShell, apresentando o produto sem sessão e sem
  consultas aos registros privados do workspace. Rotas de trabalho preservam a proteção.
- Composição baseada nas referências Tailark Quartz aprovadas: Hero Section 3,
  Bento 1, How It Works 1, Features Carousel 1, FAQs 1, Call to Action 1 e Footer 1.
  Implementação própria, adaptada aos componentes e tokens existentes.
- Seções de apresentação, recursos, fluxo em três etapas, tour do Kanban/equipe/
  dashboard, FAQ, chamada final e rodapé. CTAs levam ao login existente.
- Componentes separados em `src/features/landing/components`; todos os estilos
  autorais continuam em `src/styles/globals.css`, agora com seção própria da landing.
- Capturas reais do ambiente local em `public/product`, identificadas como material
  de demonstração. Atualização reproduzível por `scripts/capture-product.mjs`.
- Menu mobile reutiliza Sheet/Radix com trigger e restauração de foco; FAQ nativo,
  carrossel manual com anúncio acessível e respeito ao movimento reduzido.
- Navegação por âncoras, links diretos às seções e retorno ao topo pelo logo.
  O logo do login retorna à landing. Nenhuma mudança de schema ou dependências.
- Verificações: lint, tipos, estilos, arquitetura e build aprovados; 32 testes
  unitários/integração e 21 E2E aplicáveis aprovados (13 da landing e 8 existentes,
  com reexecução dos cenários cujas esperas foram corrigidas). Caso de menu mobile
  omitido no desktop. Capturas finais em 1440px, 820px e 390px em `docs/screenshots`.
- Publicação pública continua pendente; a entrega está disponível no servidor local.
- Ilustração do CTA animada automaticamente via CSS: satélites em trajetórias
  elípticas, oscilação das órbitas e flutuação do núcleo. Componente
  `OrbitIllustration` sem controle de pausa, com animações desativadas quando há
  preferência por movimento reduzido.
- Animação validada em 1440px e 390px: trajetórias,
  ausência de movimento com `prefers-reduced-motion` e layout sem overflow.
  Lint, tipos/build, estilos e arquitetura aprovados após a alteração.
- Efeitos de scroll verificados com 23 cenários E2E aprovados em desktop/celular
  e um caso exclusivo de menu mobile omitido no desktop: âncoras suaves, posição
  abaixo do header, seção ativa, entradas únicas, teclado e mudança de preferência
  de movimento em runtime. Verificações estáticas e build também aprovados.

### Navegação e entrada das seções ao rolar

- Títulos de seção, cards de recursos, etapas, tour, perguntas e CTA aparecem uma
  única vez ao entrar na área visível. Elementos inicialmente visíveis não passam
  pelo estado oculto. O hook `use-scroll-reveal` controla apenas atributos;
  transições e estados visuais permanecem em `globals.css`.
- Rolagem suave das âncoras definida em CSS, limitada à landing e à preferência
  `prefers-reduced-motion: no-preference`. Links diretos com fragmentos, navegação
  do menu mobile e retorno ao topo continuam disponíveis.
- O cabeçalho ganha sombra ao rolar e acompanha a seção atual por `aria-current`,
  tanto na navegação desktop quanto no menu mobile.
- Foco por teclado e navegação por âncoras revelam o conteúdo de destino.
  Sem `IntersectionObserver`, o conteúdo permanece visível. Ativar movimento
  reduzido revela todos os alvos e desconecta o observer, sem voltar a ocultá-los
  ao retornar à preferência anterior.

## 15. Painel de apresentação do login — 08/10/2026

- Espaço esquerdo reorganizado com mensagem da marca, captura real do Kanban
  identificada como demonstração e benefícios de projetos, tarefas e colaboração.
- Composição lado a lado em telas largas, vertical em desktops menores e compacta
  no celular, preservando acesso ao formulário de autenticação.
- Componentes `LoginStory` e `LoginBenefits` na feature de autenticação;
  `ProductPreview` promovido a componente compartilhado com a landing.
- Estilos centralizados na seção de autenticação de `globals.css`, com órbitas
  decorativas ao fundo. Fluxo de login e integração com o backend preservados.
- Lint, tipos/build, estilos e arquitetura aprovados. Dois E2E de teclado no login
  aprovados. Revisão visual em 1440×900, 1920×1080, 2560×960 e 390×844, sem
  overflow; capturas em `docs/screenshots/login-*.png`.
- Revisão de legibilidade: textos de apoio em 15–16 px, títulos dos benefícios em
  14–16 px e descrições em 13–14 px. Na paleta utilizada nesta etapa, anterior à
  seção 17, o painel tinha contraste de 5,78:1 para textos secundários e 8,15:1
  para títulos; órbitas atenuadas ao fundo.
  Revisão visual em desktop, telas largas, tablet e celular sem corte de textos
  ou overflow horizontal. Lint, tipos/build, estilos e arquitetura aprovados.

## 16. Tipografia em todo o sistema — 08/10/2026

- Escala compartilhada em `rem`, centralizada nos tokens `--font-size-*` de
  `globals.css`: legendas de 12 px, rótulos/textos secundários de 14 px, corpo e
  campos de 16 px, destaques de 18 px e títulos progressivos. Os valores em pixels
  consideram o tamanho padrão do navegador.
- Aplicação no login, landing, dashboard, projetos, Kanban, equipe, configurações,
  menus, tabelas e formulários. Botões, campos, gráficos e espaçamentos ajustados
  para acomodar a nova escala, preservando a leitura no celular.
- Nomes longos na sidebar podem quebrar linha; filtros e ações se reorganizam.
  Diálogos e painéis rolam pelo corpo, mantendo o cabeçalho e o fechamento visíveis.
- Revisão das sete telas principais em 1440×1000, 820×1180 e 390×844, sem overflow
  horizontal da página. Kanban e tabelas preservam sua rolagem local. Capturas em
  `docs/screenshots/typography`; quatro imagens de demonstração em `public/product`
  atualizadas com a nova tipografia.
- Diálogos de projeto, tarefa, perfil e busca verificados em desktop e celular,
  incluindo navegação por teclado e foco visível ao circular pelo painel de tarefa.
- Lint, tipos/build, estilos e arquitetura aprovados; 32 testes unitários/integração
  e 29 E2E de navegação, landing e scroll aprovados. Um caso exclusivo de menu mobile
  omitido no desktop. Esta alteração não modifica o backend nem registros de negócio.

## 17. Paleta verde petróleo e marfim — 08/10/2026

- Identidade composta por verde petróleo `#16665c` nas ações e na marca, fundo
  marfim `#f7f8f4`, texto principal `#233d37` e mel `#e6bb6c` como destaque.
  Login e CTA usam superfícies escuras `#183f36` com seus próprios tokens de texto.
- Cores originais do Orbit, com referência à estrutura semântica do Radix Colors
  para fundos, superfícies, bordas, estados interativos e texto. A paleta não é
  uma cópia de uma escala Radix nem depende de instalar Radix Colors.
- Aparência centralizada em `src/styles/globals.css`: tokens de hover, foco,
  seleção, feedback, status e gráficos aplicados aos componentes compartilhados.
  Cor continua acompanhada de texto ou ícone nos estados de negócio.
- Marca e metadado `theme-color` acompanham a identidade. A entrega inclui a
  recaptura dos quatro assets de demonstração em `public/product`, usando o
  produto conectado ao backend local e `scripts/capture-product.mjs`.
- Referências para revisão de contraste: WCAG 2.2, critérios 1.4.3 (texto) e
  1.4.11 (elementos não textuais), conforme os links da seção de referências.
- Lint, verificação de estilos, arquitetura, TypeScript e build aprovados;
  32 testes em sete arquivos e 19 E2E aprovados. Um caso de menu exclusivo de
  celular foi omitido no desktop.
- Revisão das sete rotas em 1440 × 1000 e 390 × 844, com amostra adicional de
  landing, login, dashboard e projetos em 820 × 1180, sem overflow horizontal da
  página, erros de execução ou alertas inesperados e sem escritas de negócio.
  Evidências em `docs/screenshots/palette`: 18 capturas de telas e uma captura
  adicional do foco no CTA (`landing-cta-focus.png`).
- Contrastes principais confirmados abaixo. As medições cobrem os textos CSS
  verificados e os pares de tokens avaliados, sem constituir auditoria WCAG completa.

| Par avaliado | Contraste |
| --- | --- |
| Branco / cor principal | 6,80:1 |
| Texto principal / fundo | 10,97:1 |
| Texto secundário / superfície suave | 4,95:1 |
| Corpo de texto / superfície escura do login | 8,70:1 |
| Foco no tema claro | 4,77:1 |
| Foco mel / superfície escura | 6,48:1 |

## 18. Landing escura com recursos interativos — 08/10/2026

- Direção visual inspirada na [Inference Landing Page do Aceternity UI](https://ui.aceternity.com/pages/inference-landing-page)
  e no [preview público](https://ui.aceternity.com/page-preview/inference-landing-page):
  hero central amplo sobre imagem, dashboard claro em destaque e recursos em abas.
  Implementação original React/CSS, sem copiar código Pro nem adicionar dependências.
- Tema escuro delimitado à landing e ao portal do menu mobile. Login, workspace
  e backend preservados; todos os estilos continuam centralizados em `globals.css`.
- Montanhas decorativas originais geradas com ImageGen em
  `public/images/orbit-mountains.png` (1672 × 941, aproximadamente 1,94 MiB).
  Prompt completo em `docs/hero-image-prompt.txt`; imagem reutilizada no hero e CTA.
- Recursos organizados em quatro abas com capturas reais do produto, três
  benefícios por recurso, relações ARIA e navegação por setas, Home/End e Tab.
  Os painéis inativos permanecem ocultos e fora da navegação por teclado.
- Fluxo Organizar, Distribuir e Acompanhar explorável por três botões com
  `aria-pressed`, explicação anunciada e diagrama de processo. O conteúdo é
  metadado de apresentação, sem consultas ou dados de negócio inventados.
- Cabeçalho persistente, seção ativa, âncoras suaves e entradas únicas preservados.
  Entrada do dashboard em perspectiva feita em CSS; movimento reduzido mantém
  conteúdo visível e desativa as animações de entrada e orbitais.
- Tour manual, FAQ nativa, CTA com imagem e órbitas e rodapé com acesso ao login.
  Menu mobile mantém gerenciamento de foco, Escape e navegação entre seções.
- Lint, tipos/build, estilos e arquitetura aprovados; 32 testes em sete arquivos,
  27 E2E da landing e seis E2E de navegação aprovados em desktop/celular. Um caso
  de menu exclusivo de celular foi omitido no desktop. O teste de abas desktop
  atingiu o timeout de 30 s na execução com oito workers e passou na reexecução
  isolada em 2,7 s.
- Layout e capturas revisados em 1440 × 1000, 820 × 1180 e 390 × 844, sem overflow.
  Evidências em `docs/screenshots/landing-inference`. Ajustados os tokens do portal
  do menu mobile, a extensão do gradiente escuro no hero mobile e o tamanho da nota
  de apoio. Contraste conferido sobre os pixels da imagem com seu recorte e
  gradiente: nota mobile de 14 px com mínimo de 4,67:1; título e links do menu
  com 15,36:1. Login e dashboard preservam a paleta clara e a rolagem padrão,
  sem overflow nos três tamanhos; formulário de login integralmente acessível.

## 19. Cabeçalhos de seção com contexto — 08/10/2026

- Substituídos os pequenos rótulos em caixa alta por marcações numeradas laterais:
  “Um lugar para criar”, “O caminho da entrega”, “Seu dia no Orbit” e “Antes de entrar”.
  A composição coloca a marcação à direita no desktop/tablet e abaixo do texto no
  celular, com separação por um traço e sem o tratamento dourado repetido.
- `LandingSectionHeading` reúne título, descrição, marcação e controles opcionais
  do tour. Números decorativos usam `aria-hidden`; títulos, âncoras e comportamento
  de revelação permanecem acessíveis. Aparência centralizada em `globals.css`.
- A área de perguntas passa a apresentar “Acesso, rotina e equipe. Vamos aos
  detalhes.”, com descrição concreta e perguntas abaixo do cabeçalho. Removido o
  rótulo redundante acima da chamada final.
- Lint, tipos/build, estilos e arquitetura aprovados. Os três arquivos E2E da
  landing passaram com 27 testes aprovados e um skip de menu mobile no desktop,
  sem reexecuções e sem alterações nos testes.
- Revisão visual em 1440, 820 e 390 px, sem cortes, colisões ou overflow. Rótulos
  de 16 px no desktop/tablet e 14 px no celular, com contraste de 15,36–16,88:1.
  Recortes em `docs/screenshots/landing-labels`; nenhuma consulta privada ou
  alteração de dados de negócio.

## 20. Importação autenticada do template Aceternity — 08/10/2026

- Após autorização do usuário, executado `pnpm dlx shadcn@latest add
  @aceternity/inference-landing-page` em diretório temporário, com o token apenas
  no ambiente do processo e no header Authorization enviado ao registry oficial.
  CLI concluiu a importação dos 12 componentes; a definição da página também
  foi recebida no item do registry. Nenhuma credencial integra código ou bundle.
- Origem: `https://ui.aceternity.com/registry/inference-landing-page.json`.
  SHA-256 do item recebido:
  `793D79348D0DD22B7F3CDEE07C4B5676593772ED12EEA10B9486682757812CD0`.
- Hero, Features, Workflows, CTA e Footer foram adaptados do código recebido.
  Estrutura, cartões, geometria das conexões, camadas da imagem, dither e efeitos
  foram preservados; classes utilitárias e estilos de aparência migrados para
  `globals.css`, componentes grandes divididos e ícones alinhados ao Lucide.
- Conteúdo reescrito para projetos, tarefas e equipe; preservados login, rotas,
  Supabase, dados reais, tour e FAQ. Seções comerciais/de infraestrutura da
  plataforma de inferência do template não foram apresentadas como recursos do Orbit.
- Canvas mantém nove cartões, quatro entradas e quatro saídas: arraste de cartões,
  cabos elásticos, conexões por teclado, rejeição de entrada incompatível, Escape,
  reinício, conexão completa e versão mobile por toque. Estado exclusivamente
  demonstrativo, identificado na interface, sem leituras ou escritas de negócio.
- Asset original de paisagem salvo em `public/images/aceternity-landscape.webp`
  (1672 × 941, 69.130 bytes), reutilizado no hero, recursos e CTA. O arquivo
  anterior gerado por ImageGen não é mais carregado pela página.
- `motion@14.0.0` instalado com npm para a física dos cabos e do cursor.
  Coordenadas medidas isoladas em `src/lib/dom`; dimensões de design no CSS.
  Nenhuma dependência pnpm ou lockfile pnpm foi adicionada ao projeto.
- Layout revisado em 1440 × 1000, 820 × 1180 e 390 × 844, sem overflow ou
  erros de execução. Abaixo de 1024 px, o canvas usa os controles por toque para
  preservar legibilidade e tamanho dos alvos. Login conserva sua paleta original.
  Capturas finais em `docs/screenshots/aceternity-source`.
- Contraste medido sobre os pixels compostos da foto: título do CTA com mínimos
  de 8,28:1 no desktop, 8,12:1 no tablet e 5,80:1 no celular após ajuste do
  gradiente; título do hero acima de 14,83:1 e nota acima de 10,18:1. Na amostra de
  77 textos de recursos, canvas e rodapé, nenhum resultado abaixo de 4,5:1.
  Essas medições pontuais não constituem auditoria WCAG completa.
- 32 testes unitários/integração aprovados; E2E da landing e navegação com
  34 aprovados e dois skips esperados (menu mobile no desktop e arraste no celular).
  Quatro falhas iniciais foram repetidas com sucesso: duas navegações móveis
  interrompidas por HMR e duas verificações que detectaram controles atenuados
  junto aos cartões em espera, corrigidos sem relaxar as asserções.
- Lint, verificação de estilos, arquitetura, TypeScript e build finais aprovados
  após os ajustes de contraste, portas, faísca e breakpoint. Cursor do CTA validado
  também no preview de produção: mola acompanha o mouse, movimento reduzido aplica
  a posição imediatamente, toque não ativa o efeito e a saída restaura o estado.
- Verificação por padrão de credencial sem ocorrências em fonte, documentação,
  assets, bundle e configurações, nem na fonte/configuração da importação temporária.
  A remoção do diretório temporário foi bloqueada pela revisão automática
  (`blocked by policy`); ele permanece fora do projeto, no Temp do usuário.

## 21. Reestruturação visual do dashboard — 08/10/2026

- Nova composição com sidebar grafite, superfícies claras neutras e ações azuis.
  Hero com a paisagem original da landing, saudação do perfil e acesso aos projetos.
  Indicadores em faixa comparativa, cartões de projetos com contexto e prazo,
  evolução do período e coluna de etapas/atividade. Tipografia e espaçamentos
  revisados para priorizar leitura e hierarquia de trabalho.
- Navegação compartilhada atualizada em Projetos, Equipe, detalhes e Configurações.
  Tokens delimitados ao AppShell e seus portais; todos os estilos continuam em
  `globals.css`. Regras antigas do dashboard removidas; nenhuma dependência nova.
- `DashboardProjectCard` recebe o projeto real; consultas, permissões e contratos
  continuam nas camadas existentes. Projetos ativos mostram até quatro registros
  recentes, com acesso à listagem filtrada. Atividade usa a consulta existente;
  removida a indicação “ao vivo”, que não correspondia a uma assinatura realtime.
- Indicadores distinguem estado atual (ativos, pendentes e atrasados) de conclusões
  no período escolhido. A série usa os dias retornados pelo backend; distribuição
  mostra o total real de tarefas. Falhas ocultam as regiões afetadas e permitem
  nova consulta, mantendo os projetos independentes acessíveis.
- Revisados dashboard, menu mobile e criação de projeto em 1440 × 1050,
  820 × 1180 e 390 × 844, sem overflow após correção do header móvel.
  Projetos, Equipe e Configurações revisados em desktop; navegação e projeto
  existente também verificados nos testes mobile. Evidências em
  `docs/screenshots/dashboard-redesign`; assets reais de `public/product` atualizados.
- Contrastes dos pares principais: texto/fundo 14,04:1; texto secundário/superfície
  5,86:1; branco/azul primário 5,41:1; texto secundário/sidebar 9,22:1; badge ativo
  6,64:1. Medições pontuais, sem afirmar auditoria WCAG completa.
- 32 testes unitários/integração aprovados; 10 E2E de dashboard e navegação passaram,
  incluindo comparação dos indicadores com a resposta real, troca de período,
  projeto após reload, indisponibilidade simulada e recuperação. Regressão da
  landing com 13 casos aprovados e um skip previsto para menu mobile no desktop.
- Lint, TypeScript/build, estilos e arquitetura finais aprovados após os ajustes
  responsivos. Capturas atualizadas com dados reais; nenhuma falha JavaScript
  encontrada durante a revisão do dashboard, diálogos e páginas consumidoras.
- Ambiente local recuperado para a revisão: Docker estava parado e falhava ao
  recriar sockets. Diretórios temporários `Docker/run` e `docker-secrets-engine`
  foram preservados com sufixos `.orbit-recovery-20261008` (e `-2`) antes de recriação.
  Supabase iniciou com os dados existentes; não houve reset ou escrita de negócio
  nesta entrega. Servidor Vite disponível em `http://127.0.0.1:5173`.

## 22. Conexão com Supabase hospedado — 08/10/2026

- `.env.local` configurado com a URL e a chave pública fornecidas pelo usuário;
  conexão Docker anterior preservada em `.env.docker.local`, ambos ignorados pelo
  Git. O frontend em desenvolvimento passa a consultar o backend hospedado.
- Projeto `twsfyqkagyvibsilulle` vinculado pela CLI já autenticada. Aplicadas as
  migrations `202610080001`, `202610080002` e `202610080003`, após dry run. O histórico
  remoto confirma as três versões, sem seed, reset ou alteração do banco local.
- Conta escolhida pelo usuário provisionada no Auth, perfil Igor Moraes Rocha e
  workspace Orbit com vínculo de administrador. Senha gerada salva somente em
  `.cloud-credentials.json`, ignorado pelo Git; nenhuma chave administrativa
  persistida no frontend. Projetos e tarefas locais não foram transferidos.
- Login pela API pública, vínculo de administrador, indicadores e diretório da
  equipe confirmados. O backend retorna um membro, zero projetos e zero tarefas.
  Acesso anônimo ao workspace recusado pelo banco. Tipos regenerados diretamente
  do schema remoto, sem Docker.
- `vercel.json` preparado para Vite, build, saída `dist` e fallback de rotas da SPA.
  README e instruções do backend distinguem a execução hospedada do fluxo local.
  Publicação na Vercel e configuração do domínio do Auth permanecem pendentes.
- Lint, verificações de estilos e arquitetura, 32 testes unitários/integração e
  TypeScript/build aprovados. Revisão autenticada no navegador confirmou login,
  restauração de sessão após reload, dashboard, projetos, equipe, configurações,
  menu mobile, logout e proteção de rotas. Todas as requisições de Auth/Data API
  usaram o projeto hospedado, sem erros JavaScript ou escritas de negócio durante
  a revisão. A primeira execução usou um título incorreto na asserção da página
  de configurações; corrigida a asserção, a revisão completa passou.
  Evidências locais em `test-results/cloud-connection`, ignoradas pelo Git.
