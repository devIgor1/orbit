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

**Estado em 09/10/2026:** interface implementada e conectada ao Supabase hospedado,
publicada pelo usuário em `https://weorbit.com.br`. A instalação local
foi preservada. As seções 32 e 43 registram os domínios dos convites e
do Auth; a seção 22 documenta a configuração inicial da nuvem. O roadmap permanece
como referência de aceite.

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
| Autenticação | Cadastro com confirmação de e-mail, login, logout, restauração de sessão e tratamento de sessão expirada. |
| Empresas | Cadastro, seleção da empresa ativa e convites de colaboradores vinculados ao e-mail. |
| Visão geral | Projetos ativos, tarefas pendentes, atrasadas e concluídas; evolução semanal; atividades recentes. |
| Projetos | Busca, filtros, paginação, criação, edição e arquivamento. |
| Detalhes do projeto | Resumo, progresso, tarefas em lista e Kanban, responsáveis e prazos. |
| Detalhes da tarefa | Painel lateral com edição, comentários e histórico. |
| Equipe | Membros reais do workspace, busca, tarefas atribuídas e edição do próprio perfil. |
| Experiência compartilhada | Menu lateral, cabeçalhos, breadcrumbs, filtros, formulários e estados de consulta padronizados. |

Rotas previstas: `/` (landing pública), `/login`, `/signup`, `/auth/confirm`, `/onboarding`, `/companies`, `/dashboard`, `/projects`, `/projects/:projectId` e
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

## 23. DatePicker shadcn em todo o sistema — 08/10/2026

- Adicionados `Calendar`, `Popover` e `DatePicker` compartilhados em
  `src/components/ui`, adaptados do código oficial shadcn/ui Radix/new-york-v4.
  Dependências instaladas com npm: `@radix-ui/react-popover@1.2.0`,
  `react-day-picker@10.0.2` e `date-fns@4.4.0`. Stack principal preservada.
- Substituídos todos os inputs de data nativos: criação/edição de projetos e
  criação/edição de tarefas, incluindo o painel lateral. Formulários usam
  Controller do React Hook Form; nenhuma alteração em consultas, serviços ou banco.
- Calendário em português brasileiro, exibição `DD/MM/AAAA`, seletores de mês e
  ano, Hoje e Limpar data. Navegação vai de 1900 até vinte anos à frente, ampliada
  automaticamente para acomodar datas existentes fora desse intervalo.
  `src/lib/date-only.ts` mantém `YYYY-MM-DD` sem conversão UTC; campos vazios
  continuam convertidos em `null` pelas operações existentes de projeto/tarefa.
- Foco inicial no dia selecionado ou atual após ativação do portal Radix, setas
  para navegar, Enter para escolher e Escape para fechar só o calendário. Retorno
  de foco ao campo, rótulos acessíveis e bloqueio durante a mutação. A revisão no
  navegador identificou e corrigiu a disputa de foco entre o Popover e Dialog/Sheet;
  o teste de regressão cobre os dois contêineres em desktop e celular.
- Classes semânticas, dimensões, estados e animação na seção de primitivos do
  `globals.css`; movimento reduzido usa a regra global existente. O adaptador
  `src/lib/dom/popover-geometry.ts` fornece ao Radix os valores dos tokens de
  afastamento e colisão, sem definir espaçamentos de design em JavaScript.
- AGENTS e README documentam a obrigatoriedade do DatePicker shadcn. O check de
  arquitetura rejeita inputs nativos de data, mês, semana e data/hora no TSX.
- Lint, estilos, arquitetura, TypeScript e build aprovados. Os 48 testes
  unitários/integração passaram, incluindo datas em fusos distintos, ano bissexto,
  edição, payload ISO, limpeza e preservação do valor após erro. Quatro E2E novos
  passaram com os formulários reais em desktop/celular, em uma entrada exclusiva
  de testes fora do build e sem chamadas ao backend.
- Revisão visual de projetos e tarefas em desktop/celular; formulário de projeto
  autenticado também verificado em 1440, 768, 390 e 320 px, sem overflow ou erros
  JavaScript. Capturas dos E2E em `test-results`, ignoradas pelo Git. Não foram
  realizadas escritas de negócio na nuvem nem novas migrations; testes de banco
  não foram reexecutados nesta alteração de interface.

## 24. Identidade do login alinhada ao dashboard — 08/10/2026

- Login passou a compartilhar a paleta do workspace por meio do seletor
  `body:has(.app-shell,.login-page)` no CSS central. Painel de apresentação em
  grafite `#101113`, textos claros e detalhes em azul `#70baff`. Campos, estados
  de foco e ação principal usam o azul `#0868ce` e os neutros do dashboard.
- Tokens escuros agora são reutilizados pela sidebar e pelo painel do login.
  A logo do login é inteiramente branca, acompanhando a landing e a sidebar;
  o azul fica nos destaques e nas ações. Ícones dos benefícios, órbitas e moldura
  da prévia acompanham a identidade.
  Removidas declarações repetidas dos tokens do login nos breakpoints. Composição,
  conteúdo, autenticação e comportamento permanecem os mesmos.
- Revisão visual em 2560 × 960, 1440 × 1000, 820 × 1180 e 390 × 844, sem overflow
  ou erros JavaScript. Contrastes medidos: título/grafite 17,14:1, texto secundário
  9,22:1, legenda/moldura 7,57:1, texto secundário do formulário/branco 5,86:1 e
  branco/azul do botão 5,41:1. Medições pontuais, sem afirmar auditoria completa.
- Lint, estilos, arquitetura, TypeScript/build e 48 testes unitários/integração
  aprovados. Dois E2E existentes de teclado e acessibilidade do login passaram
  em desktop/celular. Capturas locais em `test-results/login-palette`, ignoradas
  pelo Git. Nenhuma dependência, consulta, contrato ou migration foi alterada.

## 25. Acabamento dos botões azuis — 08/10/2026

- Botões primários do login e workspace passam a usar degradê diagonal em três
  tons de azul, borda de luz interna e sombra suave. Hover reforça a iluminação;
  o estado pressionado reduz a sombra externa e adiciona profundidade interna.
  Foco visível e preferência por movimento reduzido continuam respeitados.
- Tokens `--button-primary-*` centralizam o acabamento no CSS. A regra usa o
  escopo compartilhado de login/workspace e também alcança diálogos e painéis em
  portal. Removido o degradê anterior restrito aos descendentes do AppShell.
  Controles desabilitados ficam sem sombra e não recebem o efeito de hover.
- Verificados login em desktop/celular, foco, hover, pressionamento, estado
  desabilitado e movimento reduzido. Dashboard autenticado e formulário em portal
  confirmaram o mesmo degradê, sem escritas de negócio. Cores do degradê mantêm
  contraste com branco de pelo menos 5,09:1 em repouso e 4,67:1 no hover.
- Lint, estilos, arquitetura, TypeScript/build, 48 testes unitários/integração e
  dois E2E existentes de login aprovados. Capturas em `test-results/blue-buttons`,
  ignoradas pelo Git. Nenhuma dependência ou regra de negócio foi alterada.

## 26. Select shadcn com Base UI em todo o sistema — 08/10/2026

- Substituído o select nativo compartilhado pelo código do
  [shadcn Base Select](https://ui.shadcn.com/docs/components/base/select),
  adaptado do registro `base-nova` para classes semânticas do Orbit. Instalado
  `@base-ui/react@1.8.0` via npm. `components.json` preserva a configuração dos
  demais primitivos; esta adaptação usa Base UI para todos os selects.
- Migrados período do dashboard, filtro de projetos, prioridade das tarefas,
  criação/edição de projetos e tarefas, responsável e etapa nos cards/tabelas.
  Mês e ano do calendário também usam o novo Select; a navegação mensal utiliza
  a API pública do DayPicker. Nenhum select nativo autoral permanece no TSX.
- `OptionsSelect` concentra opções tipadas, rótulos, valor e callback;
  `TaskStatusSelect` compartilha a alteração de etapa entre Kanban e lista.
  Formulários usam Controller/onValueChange, preservando valores vazios,
  validações, dados em erro e bloqueio durante envio. O status de uma tarefa
  permanece no último valor confirmado enquanto a atualização está pendente.
- `SelectLayer` integra o portal Base UI aos overlays Radix existentes. Adicionadas
  dependências diretas de `@radix-ui/react-dismissable-layer@1.1.20` e
  `@radix-ui/react-focus-scope@1.2.0`, já presentes transitivamente. A escolha e
  Escape fecham somente o select, preservando o calendário ou formulário pai.
- Cores, foco, seleção, estados desabilitados, dimensões e animação no CSS central.
  Os menus acompanham o campo, evitam colisões com a viewport e permitem rolagem.
  O adaptador de geometria existente lê tokens CSS para Radix e Base UI. AGENTS,
  README e check de arquitetura passam a exigir o padrão e rejeitar selects nativos.
- Lint, estilos, arquitetura, TypeScript/build e 51 testes unitários/integração
  aprovados. Dez E2E de formulários reais passaram em desktop/celular, cobrindo
  teclado, Escape em overlays aninhados, mês/ano, payloads, remoção do responsável,
  opção com nome longo e preservação após erro. Testes aguardam foco/abertura antes
  de enviar teclas; JSDOM usa ativação por teclado por não calcular geometria real.
- Revisão autenticada em 1440, 820, 390 e 320 px confirmou chamadas reais do
  dashboard e filtro de projetos, URL e seleção preservadas após reload, sem
  overflow horizontal nem erros JavaScript. Capturas em `test-results/base-select`
  e `test-results/select-live-review`, ignoradas pelo Git.
- Nenhuma alteração em contratos, consultas ou migrations. Não foram feitas
  escritas de negócio na nuvem. E2E de persistência e testes de banco local não
  foram reexecutados; submissões e falhas dos novos casos usam fixtures exclusivas
  de testes, fora do build de produção.

## 27. Favicon alinhado à logo — 09/10/2026

- `public/orbit.svg` usa os mesmos paths e círculos do ícone Lucide Orbit em
  `Brand`, substituindo o desenho antigo. Símbolo claro em fundo grafite, com
  cores correspondentes aos tokens `--on-inverse` e `--inverse` do workspace.
- Referência em `index.html` versionada com `?v=2` para invalidar o ícone antigo;
  `theme-color` acompanha o grafite da marca. Asset SVG estático, sem dependências
  novas nem mudanças nos estilos ou no comportamento das páginas.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Verificação no navegador
  confirmou SVG válido, resposta 200 e geometria idêntica à logo. Revisados 16,
  32 e 64 px; o build preserva o asset e sua referência. Captura em
  `test-results/favicon/preview.png`, ignorada pelo Git.

## 28. Cadastro de usuários, empresas e colaboradores — 09/10/2026

- Cadastro público em `/signup`, usando Supabase Auth, nome, e-mail, senha e
  confirmação de senha. Estado específico para confirmação por e-mail, erros
  explícitos, bloqueio de envio duplicado e preservação do formulário em falhas.
  Login e cadastro compartilham `AuthLayout`; CTAs da landing levam ao cadastro.
- `/companies` permite cadastrar a empresa pelo nome, abrir uma empresa existente
  ou aceitar convites. Empresas reutilizam `workspaces` e o Kanban existente;
  não há duplicação de projetos ou tarefas. Contas sem vínculo são encaminhadas
  ao onboarding, sem apresentar falta de vínculo como indisponibilidade do backend.
- `create_company` cria empresa, vínculo `admin` e preferência ativa na mesma
  transação. `profiles.active_workspace_id` persiste a seleção; `select_company`
  valida a associação. Usuários antigos continuam usando o primeiro vínculo até
  escolherem outro. A sidebar e Configurações oferecem acesso às empresas.
- Administradores encontram **Convidar colaborador** na página Equipe. O convite
  normaliza o e-mail, vale sete dias e gera um link para compartilhamento manual.
  Criá-lo novamente renova a validade do convite pendente; é possível cancelá-lo.
  O destinatário usa uma conta com o mesmo e-mail confirmado. Convites não enviam
  e-mails automaticamente; a interface explica o compartilhamento do link.
- RLS protege a lista de convites. RPCs privilegiadas verificam administrador,
  propriedade do e-mail em `auth.users`, validade e estado. Aceite bloqueia a linha,
  cria somente papel `member` e seleciona a empresa atomicamente; repetição pela
  mesma conta é idempotente. Nunca aceita papéis vindos de metadados editáveis.
- Query keys incluem identidade e empresa; a troca cancela e descarta consultas
  da empresa anterior. Os contratos de mutação exigem registro/identificador
  confirmado. Erros de consulta, permissão e mutação não viram listas vazias.
- Migrations `202610090001` e `202610090002` aplicadas no Supabase hospedado e
  local, sem reset/seed. Tipos gerados novamente a partir do schema hospedado.
  Configuração remota alterada somente para senha mínima de oito caracteres,
  Site URL `http://127.0.0.1:5173` e retornos `/login**` em 127.0.0.1/localhost.
  Confirmação por e-mail e demais configurações remotas foram preservadas.
- A configuração local também exige confirmação e autoriza 5174 para a suíte
  isolada `npm run test:onboarding`, que usa `.env.docker.local` e Mailpit local.
  A suíte padrão exclui esse arquivo e a suíte nova recusa backend remoto.
- Lint, TypeScript/build, estilos, arquitetura e lint SQL aprovados. Passaram
  69 testes unitários/integração e 45 testes de banco (34 novos de onboarding).
  O teste antigo de permissões agora compara a contagem real da empresa, em vez
  de exigir exatamente os seis projetos do seed em um banco com testes persistidos.
- Quatro E2E completos passaram em desktop/celular: cadastro e confirmação real,
  empresa, convite, aceite, tarefas no Kanban, conclusão persistida e visível ao
  administrador, troca/isolamento de empresas e convite revogado. A primeira
  execução expôs uma espera ausente no teste ao capturar a URL do projeto;
  corrigida a sincronização de navegação e reexecutados os cenários com sucesso.
  Seis E2E de regressão do login e landing também passaram.
- Revisão visual de cadastro, empresas e convites em 1440, 820, 390 e 320 px,
  sem overflow horizontal ou erros JavaScript. Login e consultas no backend
  hospedado confirmados, sem criar registros de negócio nele. Evidências em
  `test-results/registration-review` e capturas dos E2E locais, ignoradas pelo Git.
- Docker local recuperado preservando os diretórios de sockets com sufixos
  `.orbit-recovery-20261009-*`; volumes e dados existentes foram mantidos.

### Pendências externas

- Publicação do frontend e configuração do domínio público continuam pendentes.
  Ao publicar, ajustar Site URL e adicionar `https://SEU_DOMINIO/login**`.
- Recuperação de senha e promoção/remoção de
  colaboradores não integram esta entrega. A stack existente foi preservada.

## 29. Paleta neutra alinhada à marca — 09/10/2026

- Pesquisa nas referências de [composição](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)
  e [papéis das escalas](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
  do Radix Colors: base neutra, separação entre fundos, estados interativos,
  bordas e textos; cores semânticas independentes. A direção escolhida para o
  Orbit é grafite, branco suave e cinza quente, com cores próprias verificadas.
- Tokens de `:root` substituem os antigos verdes/azuis e as declarações duplicadas
  do workspace. Ações em `#292929`, fundo `#f7f7f5`, texto `#242321`, apoio
  `#66635e`, sidebar `#101113` e destaque escuro `#dedbd5`. Botões preservam um
  degradê discreto de carvão, com sombras neutras e estados de interação.
- Logo herda a cor do contexto, ficando monocromática também em Empresas.
  Campos, seletores, calendários, gráficos, avatares, login, cadastro, empresas
  e navegação compartilham a paleta. A landing mantém sua composição e paisagem,
  com destaques e foco em branco quente. Estados de sucesso, alerta e erro
  preservam verde, âmbar e vermelho; baixa prioridade usa um neutro semântico.
  Links de texto recebem sublinhado para não depender de cor como indicação.
- Quatro imagens em `public/product` recapturadas do workspace local real, sem
  editar pixels ou inserir registros. Essa prévia continua identificada como
  demonstração. O servidor temporário usa modo Docker/porta 5175, mantendo a
  aplicação principal e `.env.local` conectadas ao Supabase hospedado.
- Medições pontuais conforme [WCAG 2.2 — texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  e [elementos não textuais](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html):
  texto principal/fundo 14,64:1; secundário/branco 5,98:1; legenda/superfície suave
  4,58:1; texto no ponto mais claro do botão 10,21:1; foco/branco 7,54:1;
  borda do campo/branco 3,54:1. Rótulos de sucesso/erro/alerta superam 5:1 sobre
  suas superfícies. Não constitui auditoria WCAG completa.
- Revisão autenticada de empresas, dashboard, projetos e equipe em 1440, 820,
  390 e 320 px, sem overflow nem erros JavaScript. Login/cadastro revisados em
  desktop, tablet e celular; conferidos hover, foco e overlays de select/data.
  Evidências e medições em `test-results/neutral-palette`, ignoradas pelo Git.
- Lint, estilos, arquitetura, TypeScript/build e 69 testes unitários/integração
  aprovados. Os 14 E2E de landing, login, selects e calendários passaram em
  desktop/celular na execução final. Um caso de limpeza da data falhou na primeira
  rodada e passou na repetição isolada e na suíte completa, sem mudança de código.
  Nenhuma mudança nos contratos, dependências ou regras de negócio desta revisão;
  não foram realizadas escritas de negócio nem reexecutadas migrations.

## 30. SMTP Resend configurado — 09/10/2026

- Configuração parcial em `supabase/hosted/supabase/config.toml`: host
  `smtp.resend.com`, porta 465, usuário `resend` e nome do remetente `Orbit`.
  API key e endereço remetente vêm de variáveis em `.env`, ignorado pelo Git.
  O frontend não recebe credenciais SMTP; Mailpit continua sendo usado localmente.
- Após acesso e autorização do usuário, identificado `codedbyigor.com` já
  verificado. Criada a chave `Orbit Supabase Auth`, com permissão somente de envio
  restrita a esse domínio. Remetente `Orbit <acesso@codedbyigor.com>`.
- `config push` aplicou sete campos SMTP no projeto `twsfyqkagyvibsilulle`.
  Confirmação por e-mail, URLs, permissões e demais propriedades preservadas.
  `config diff` posterior confirmou zero diferenças nos campos declarados.
  Documentado o carregamento explícito das variáveis para a CLI.
- Teste real de conexão TLS e autenticação SMTP aprovado. Envio para o simulador
  oficial `delivered+orbit-smtp-20261009@resend.dev` aceito e marcado **Delivered**
  no Resend. Evidência em `test-results/resend-setup/smtp-delivered.jpg`.
  O teste não verifica uma caixa real nem o cadastro completo no backend hospedado;
  nenhum usuário/registro de negócio foi criado para essa validação.
- Esta alteração de configuração não adiciona envio automático dos convites.
  README e procedimento de manutenção atualizados; credenciais e cache da CLI
  protegidos pelo `.gitignore`. Nenhuma mudança no frontend ou no schema.

## 31. Envio de convites por e-mail — 09/10/2026

- **Equipe → Convidar colaborador** agora oferece **Enviar convite**, com a opção
  **Gerar só o link**. A lista permite reenviar, copiar, cancelar e consultar o
  estado persistido. Formulário, lista e coordenação estão em componentes separados.
  Os estilos novos seguem os tokens e o CSS central; interface mantém a paleta neutra.
- Função Supabase `send-invitation` (Deno/TypeScript) chama a API do Resend no
  backend para manter a chave fora do navegador. Gateway valida o JWT e a função
  consulta `auth.getUser`. O corpo aceita somente o identificador do convite;
  destinatário, identidade, remetente e URL vêm do banco/configuração do servidor.
- Mensagem em português com nome da pessoa, empresa, validade e link de aceite.
  Remetente `Nome, via Orbit <acesso@codedbyigor.com>` e Reply-To com o e-mail
  confirmado de quem enviou. Nomes são escapados no HTML e normalizados nos headers.
- Migration `202610090003` adiciona estado de envio ao convite e snapshots privados.
  RPCs de reserva/conclusão exclusivas de `service_role` validam administrador e
  confirmação de e-mail, recusam convites indisponíveis e serializam reservas.
  Intervalo de um minuto por convite e limite de 30 novos envios/hora por empresa.
- Falhas e respostas incertas mantêm a mensagem/chave de idempotência por até
  23 horas. Reenvio após sucesso cria outra tentativa. A UI só mostra sucesso
  após confirmação do Resend e do banco; falhas preservam o formulário e mostram
  o convite já criado para copiar ou reenviar. `sent` significa aceito para envio,
  sem promessa de leitura ou entrega em uma caixa real.
- Migration aplicada localmente e no Supabase hospedado, tipos regenerados da
  nuvem, três variáveis de servidor configuradas e função publicada com validação
  JWT ativa. Verificação remota confirmou 401 sem sessão e 403 para convite
  inexistente com sessão válida; nenhuma escrita de negócio ou envio na nuvem
  foi feito para essa verificação.
- O usuário confirmou que o frontend continua local. `ORBIT_APP_URL` permanece
  `http://127.0.0.1:5173`; publicar e trocar a URL é necessário para abrir o link em
  outros computadores. Não foi criada hospedagem nem assumido um domínio público.
- Lint, estilos, arquitetura, TypeScript/build, Deno check e lint SQL aprovados.
  Passaram 83 testes unitários/integração e 69 testes de banco, incluindo falhas de
  envio, resposta sem identificador, permissão, limite, snapshot e idempotência.
- Seis E2E passaram em desktop/celular, incluindo dois envios reais do backend
  local ao simulador oficial do Resend, persistência, recusa de reenvio imediato,
  aceite por conta confirmada e regressões de cadastro/empresa/Kanban. Todos os
  registros desses testes ficaram no Supabase local. O Resend exibiu Delivered
  simulado, nome via Orbit, Reply-To correto e link esperado. Evidências em
  `test-results/invitation-email`; suites de envio externo exigem opt-in explícito.

## 32. Domínio público conectado ao Auth e aos convites — 09/10/2026

- Usuário informou a publicação na Vercel em `https://orbit-ashen-six.vercel.app`.
  Atualizado o Site URL do Supabase e adicionado `/login**` à lista de retornos,
  mantendo os dois retornos locais existentes. O diff/push aplicou somente essas
  duas propriedades; SMTP e confirmação obrigatória foram preservados.
- `ORBIT_APP_URL` atualizado no servidor para o domínio público e no arquivo local
  ignorado. Valor remoto conferido pelo digest SHA-256. A função recebe a alteração
  sem novo deploy; não houve mudança de código, schema ou dados de negócio.
- Conferência posterior confirmou zero diferenças nos campos declarados do Auth.
  Requisições de verificação com token deliberadamente inválido retornaram 303 ao
  domínio público por padrão, ao `/login?next=...` público preservando o convite
  e ao retorno local autorizado. Nenhuma conta ou e-mail de teste foi criado.
- Landing, login, cadastro, empresas e equipe responderam HTTP 200 por URL direta.
  Formulários públicos conferidos no navegador; bundle publicado aponta ao projeto
  Supabase esperado e o preflight CORS da função aceita a origem pública.
  Link direto de convite exige login e preserva `next` até o cadastro, sem erros
  JavaScript observados. `git diff --check` aprovado para configuração/documentação.
- Documentação e exemplo de ambiente atualizados. E-mails já enviados mantêm seus
  links originais; reenvios após sucesso usam a URL nova. Snapshots de tentativas
  falhas/incertas conservam a URL original durante sua janela de idempotência.
- Validação desta entrega limitada à configuração, disponibilidade e redirecionamentos;
  não houve novo envio real nem criação de registros de produção para testes.

## 33. Identidade visual do e-mail de convite — 09/10/2026

- Template de convite redesenhado com cabeçalho grafite, marca Orbit, fundo claro,
  empresa em destaque, ação de aceite, destinatário, validade, instruções, link
  alternativo e contato por resposta. Versão em texto acompanha o HTML. Conteúdo
  variável permanece escapado; a mensagem continua identificando quem convidou.
- Aparência autoral exclusivamente em `src/styles/globals.css`, seção de e-mails.
  Template HTML contém classes semânticas; adaptador de build resolve tokens,
  incorpora CSS inline e converte o símbolo existente para PNG incorporado por CID.
  Sem CSS externo, scripts, flex/grid ou dependência de imagens remotas. Fontes
  da marca têm fallback sans-serif local; arredondamentos/degradê são melhorias
  progressivas sobre superfícies sólidas e tabelas fluidas.
- PostCSS e sharp adicionados somente ao desenvolvimento, junto ao jsdom já
  existente. Runtime da aplicação e da função não ganha dependências. Scripts
  `emails:build`, `emails:preview` e `check:emails` documentados; `check:styles`
  recusa artefato desatualizado. Fixtures e capturas ficam exclusivamente em testes.
- Migration `202610090004` persiste a versão do template no snapshot privado:
  existentes usam v1, novos usam v2. Retentativas preservam a versão e o payload
  legado, verificado por hash em teste, para manter a idempotência no Resend.
  Função com ambas as versões publicada antes da migration; ambas aplicadas no
  Supabase hospedado. Função ACTIVE, JWT ativo e chamada anônima recusada com 401.
  Tipos públicos regenerados para comparação e confirmados sem diferenças.
- Lint, estilos, artefato gerado, arquitetura, TypeScript/build, Deno check e SQL
  lint aprovados. Passaram 87 testes unitários/integração e 71 testes de banco,
  incluindo escape, versão legada, versão desconhecida e preservação no reenvio.
- E2E de convite passou no desktop com backend local: envio real ao simulador
  `resend.dev`, persistência, limite de reenvio e aceite. Resend registrou Delivered
  simulado e recebeu o novo HTML e PNG por CID. Nenhum dado de negócio de produção
  foi criado ou alterado por esse teste; SMTP de confirmação mantém seu modelo.
- Revisão visual em desktop e frames de teste de 390/320 px, com nomes/endereço
  longos e sem overflow horizontal. Evidências em `test-results/invitation-design`.
  Não foi feita auditoria de renderização em caixas reais do Gmail/Outlook.

## 34. Prévia do workspace acompanha a rolagem — 09/10/2026

- Removida a animação automática com tempo fixo da prévia principal da landing.
  Inclinação, aproximação e opacidade agora acompanham a posição do scroll, com
  suavização curta e reversão ao subir. Sem rolagem, a prévia permanece parada.
- Hook compartilhado observa o contêiner sem transformação e agrupa atualizações
  em `requestAnimationFrame`, sem renderizações React por frame. Adaptador DOM
  escreve somente o progresso calculado; aparência e transições seguem no CSS
  central. Redimensionamento e mudanças de layout recalculam a posição.
- Movimento reduzido mantém a imagem estática e totalmente visível, inclusive
  quando a preferência muda durante a visita. Impressão também mantém a prévia
  completa; listeners, observadores e frames são removidos no unmount.
- Lint, estilos, arquitetura e TypeScript/build aprovados; 87 testes unitários/
  integração passaram. Seis E2E novos verificam ausência de autoplay, avanço e
  retorno por scroll, movimento reduzido e resize para tablet em desktop/celular.
  Mais 28 E2E existentes da landing passaram; dois casos específicos de dispositivo
  foram pulados conforme a configuração existente. Navegação por teclado e
  âncoras preservadas, sem overflow horizontal nos tamanhos verificados.
- Conferência visual local no navegador sem erros JavaScript; evidência em
  `test-results/landing-preview-review/scroll-preview.png`. Alteração local,
  sem novo commit, push ou publicação nesta entrega.

## 35. Texto do seletor de empresa — 09/10/2026

- Cartão da sidebar reorganizado em duas linhas: símbolo e nome da empresa no
  cabeçalho, ação **Trocar ou cadastrar** abaixo ocupando a largura disponível,
  com seta à direita. A frase deixa de competir por espaço com o símbolo e o nome.
- Estilos no CSS central, mantendo os tokens existentes. Nome da empresa admite
  quebra quando necessário; o link mantém descrição acessível completa e destino
  `/companies`. O mesmo componente atende à sidebar e ao menu móvel.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Revisão no navegador
  confirmou a ação em uma única linha, sem overflow, e navegação por Enter até
  a página de empresas. Evidência em `test-results/workspace-switch-review/sidebar.png`.

## 36. Prévia do login legível e ajustada ao espaço — 09/10/2026

- Login e cadastro compartilham uma vitrine própria composta com `ProductPreview`.
  A captura original mantém a proporção e aparece completa. Nas telas largas,
  texto/benefícios e imagem ficam lado a lado; nas intermediárias, título e imagem
  se empilham. O painel de acesso permanece disponível ao lado.
- O espaço da imagem é uma região CSS com dimensões determinadas pelo grid e pela
  altura da janela. Unidades de container limitam a captura pela largura e altura
  realmente disponíveis, reservando espaço para toolbar e legenda. A imagem ocupa
  o espaço útil sem depender de um teto pequeno e fixo nem alongar a página.
  Celular mantém o cabeçalho compacto e prioridade para o formulário.
- Ação **Ampliar prévia** usa o Dialog compartilhado com imagem maior e área
  navegável por teclado. Escape fecha e devolve o foco ao botão; dados já digitados
  no formulário permanecem. Conteúdo exibido é a captura existente de demonstração,
  sem consultas ou alterações de negócio. Estilos autorais somente no CSS central.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Passaram 14 testes de
  login, redirecionamento e cadastro, seis E2E da prévia e quatro regressões da
  landing/login. Verificados 1280×720, 1440×900, 2560×1440, 2560×944, 820×1180 e
  formulário móvel em 390×844. Os cinco tamanhos com imagem não apresentam scroll
  de página nem corte da captura; ampliação, foco e preservação do formulário
  verificados. Evidências em `test-results/login-preview-review`.

## 37. Sidebar confortável em telas menores — 09/10/2026

- Sidebar mantém largura de 256 px no desktop, sem o estreitamento anterior em
  notebooks. Rodapé compartilhado agrupa guia, navegação auxiliar e perfil com
  espaçamentos explícitos, incluindo distância mínima da navegação principal.
- Nomes de empresa, usuário e cargo ficam em uma linha com reticências quando
  necessário, preservando o valor completo no atributo `title`. Rótulos podem
  quebrar somente entre palavras; removida a quebra arbitrária dos nomes.
- Em janelas de até 800 px de altura, o guia usa uma versão compacta com ícone e
  ação. Sidebar pode rolar em alturas menores; no menu móvel, somente o corpo do
  Sheet controla a rolagem. Botão de sair mantém área própria de 40 × 40 px.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Revisão da tela real
  em 1280×720, 1024×600, 820×1180, 390×844 e 320×568, sem overflow horizontal.
  Tab alcança o botão de sair e rola o conteúdo até ele nas janelas mais baixas;
  Escape fecha o menu móvel. Nenhuma alteração de dados de negócio foi necessária.
  Evidência em `test-results/sidebar-review/sidebar.png`.

## 38. Configurações úteis para quem usa o Orbit — 09/10/2026

- Substituída a tela de diagnóstico técnico por seções de perfil e empresa. Saem
  status do Supabase, banco, variáveis de ambiente e documentação de infraestrutura.
  As instruções de instalação continuam na documentação do projeto.
- Perfil mostra nome, cargo e e-mail de acesso reais; edição de nome e cargo usa
  o formulário e a mutação existentes. Empresa mostra o espaço ativo, papel do
  usuário e explicação das permissões, com atalhos para empresas e equipe.
- Administradores podem abrir a gestão existente de convites diretamente desta
  tela. Membros não recebem essa ação. Guia compartilhado abre no mesmo contexto;
  diálogos usam seus botões como triggers para restaurar foco ao fechar.
- Conteúdo dividido em componentes de feature com seção reutilizável, mantendo
  estilos exclusivamente no CSS central e removendo regras antigas sem uso.
  Carregamento e erro são explícitos; uma consulta malsucedida não exibe dados
  antigos como atuais. Sem novos contratos, dados fictícios ou mudanças de banco.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Passaram 12 testes de
  configurações, perfil, equipe e convites, incluindo permissão, consulta falha,
  edição recusada, preservação do formulário e sucesso confirmado pelo servidor.
- Conferência no navegador em 1280×720, 820×1180, 390×844 e 320×568 sem overflow
  horizontal. Perfil, convites e guia abrem; Escape fecha e devolve foco. Formulário
  cabe no celular de 320 px. Revisão utilizou apenas leitura dos dados reais, sem
  editar perfil ou enviar convites. Evidência em `test-results/settings-review`.
- Possíveis próximas entregas: recuperação/alteração de senha, preferências de
  notificações e aparência. São propostas de produto, não controles fictícios na UI.

## 39. Requisitos de senha no cadastro — 09/10/2026

- Cadastro exige pelo menos 8 caracteres, uma maiúscula, um número e um símbolo.
  Adotado o preset nativo `lower_upper_letters_digits_symbols` do Supabase, que
  também exige minúscula; os cinco critérios aparecem explicitamente no formulário.
  O limite anterior de 72 caracteres permanece. Senhas não são aparadas/truncadas.
- Política compartilhada entre schema Zod e checklist acessível, com marcação dos
  requisitos atendidos durante a digitação. Falhas impedem o envio, mantêm os dados
  e focam o campo inválido. Espaços, acentos e emojis não substituem um símbolo do
  conjunto aceito pelo servidor. Mensagem de `weak_password` explica os requisitos.
- Configurações local e hospedada versionadas. Política aplicada no projeto
  `twsfyqkagyvibsilulle` por configuração parcial contendo somente comprimento e
  requisitos de senha. O mínimo remoto já era 8; somente os requisitos mudaram.
  Leitura posterior confirmou ausência de divergências nos campos declarados.
  SMTP, confirmação de e-mail, URLs e demais propriedades remotas permaneceram.
  A stack local passa a adotar a política ao reiniciar com o config atualizado.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Passaram 28 testes de
  schema, cadastro, serviço e login, cobrindo limites, cada classe ausente, símbolos,
  falha do servidor e envio duplicado; dois E2E em desktop/celular confirmaram foco,
  checklist e bloqueio antes de qualquer chamada de cadastro. Nenhuma conta ou
  e-mail real foi criado nos testes. Capturas em `test-results/signup-password`.
- Interface revisada nas capturas, sem overflow horizontal. Alterações de frontend
  permanecem locais até o próximo commit/push; política do servidor já está ativa.

## 40. Mostrar e ocultar senha no cadastro — 09/10/2026

- Campos de senha e confirmação recebem ícones de olho independentes. Começam
  ocultos, alternam entre texto e senha sem modificar o valor e mantêm integração
  com React Hook Form/Zod. Durante o envio, os controles do cadastro ficam inativos.
- Extraído `PasswordInput` compartilhado em `components/ui`, também usado pelo
  login. Botões têm nome acessível específico, estado `aria-pressed`, vínculo ao
  campo e `type="button"`; não disparam o envio do formulário. Estilos reutilizados
  do CSS central, com alinhamento preservado no estado pressionado.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Nove testes de cadastro
  e login e quatro E2E em desktop/celular passaram, incluindo Tab, Enter e Espaço,
  independência dos campos, preservação dos valores e ausência de envio ao alternar.
  Capturas em `test-results/password-visibility`.

## 41. Confirmação de cadastro centralizada — 09/10/2026

- Ícone, título, mensagens e ação de login centralizados no estado de confirmação
  de e-mail. Ajuste restrito ao seletor existente no CSS central.
- Lint, estilos, arquitetura, TypeScript/build e cinco testes de cadastro aprovados.
  Revisão visual em desktop, tablet e celular confirmou alinhamento, ausência de
  overflow horizontal e navegação ao login por teclado. Resposta simulada somente
  na revisão isolada; nenhuma conta ou mensagem real criada. Capturas em
  `test-results/auth-confirmation-review`.

## 42. Convite aberto com outra conta — 09/10/2026

- Diagnóstico por consulta somente de leitura confirmou que o link informado
  pertencia a um destinatário diferente da conta conectada. O aviso vinha da
  comparação com os convites pendentes, antes de qualquer tentativa de aceite.
- Aviso identifica a conta atual e oferece **Entrar com outra conta**, preservando
  o convite no retorno do login e cadastro. Convites de outras empresas disponíveis
  para a sessão ficam identificados separadamente. Nenhum destinatário externo é
  exposto; as verificações de e-mail e permissão continuam no backend.
- Saída reutiliza o mesmo fluxo da página e mantém erros visíveis. Ações de empresa
  ficam bloqueadas durante a saída. O aviso não aparece durante a transição após
  um aceite confirmado, quando o convite já deixou a lista de pendentes.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Quinze testes de
  serviços, onboarding e troca de conta passaram, incluindo saída recusada,
  falha de consulta e preservação do destino. Quatro E2E com Supabase local passaram
  em desktop/celular: troca de conta, cadastro, confirmação, aceite, persistência
  no Kanban e bloqueio de convite cancelado. Revisão visual sem overflow horizontal;
  capturas em `test-results/invitation-account-review`. Sem escritas em produção.

## 43. Confirmação de e-mail e onboarding em etapas — 09/10/2026

- Causa do login transitório: cadastro enviava `/login` como retorno de confirmação
  e essa página exibia o formulário durante a restauração da sessão. Nova rota
  `/auth/confirm` aguarda o SDK, trata link inválido/expirado e só então navega.
  Login também aguarda a sessão e reconhece retornos antigos com `type=signup`.
- Cadastro independente segue para `/onboarding`: **Adicionar uma empresa →
  Convidar equipe**. Retornos de cadastro vindos de projetos/login não pulam essas
  etapas. Por escolha do usuário, cadastros por convite continuam em `/companies`
  com o identificador do convite, sem obrigar a criação de empresa própria.
- Etapas compostas por componentes de feature, indicador compartilhado e os
  formulários existentes com React Hook Form/Zod. Cabeçalho da conta e saída
  extraídos para reutilização com a página de empresas; estilos no CSS central.
- Empresa criada, papel de administrador e seleção ativa vêm da transação existente
  no Supabase. Etapa de equipe só aparece após releitura do workspace confirmado.
  Ao reabrir/recarregar o onboarding, a empresa persistida permite retomar a equipe.
  Convites usam os serviços reais existentes; podem ser enviados agora ou depois.
  Não houve mudança de schema nem armazenamento local de progresso de negócio.
- Ausência confirmada de empresa abre a etapa inicial; erro de consulta mostra
  erro/retry. Escritas recusadas preservam campos e não avançam. Ações de conclusão
  e saída aguardam convites em andamento. Mudança de etapa foca o título para
  leitura assistiva. Colaborador existente não recebe ações de administração.
- Supabase hospedado ainda apontava à URL anterior da Vercel. Site URL alterado
  para `https://weorbit.com.br`, com `/auth/confirm**` e `/login**` autorizados também
  no domínio anterior e em localhost/127.0.0.1:5173. Push parcial alterou só essas
  duas propriedades; leitura posterior confirmou zero diferenças. Nenhum segredo,
  SMTP, política de senha ou confirmação obrigatória foi alterado.
- Lint, tipos, estilos, arquitetura e build aprovados; 131 testes Vitest e seis E2E
  com Supabase/Mailpit locais passaram. Cobrem confirmação sem renderizar login,
  destino de convite, erros, criação de empresa, retomada, convites persistidos,
  conclusão por teclado e Kanban. Conferidos desktop, tablet, 390 px e 320 px sem
  overflow horizontal. Capturas em `test-results/onboarding-steps`.
- Frontend permanece local até commit/push. URLs do Auth já estão preparadas para
  a publicação. Referência: [redirecionamentos do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 44. Cabeçalho da landing no celular — 09/10/2026

- A ação do cabeçalho exibe **Acessar** até 600 px, em uma linha com a seta.
  O nome acessível permanece **Acessar workspace** e o destino continua `/login`.
  Removidos os limites de largura que forçavam a quebra do texto.
- Logo e ações não encolhem; botão e menu têm altura de 44 px, com área de toque
  de 44 × 44 px no menu. Estilos permanecem exclusivamente no CSS central.
- Lint, estilos, arquitetura e TypeScript/build aprovados. Sete E2E de acesso,
  navegação por seções, retorno ao início e foco do menu passaram; o caso exclusivo
  de menu móvel foi ignorado no desktop. Revisados dez tamanhos entre 320 e 1440 px,
  sem overflow ou quebra do botão, incluindo a transição entre 600 e 601 px.
  Capturas em `test-results/mobile-header-review`. Sem alterações de backend.

## 45. Gestão de acesso da equipe — 09/10/2026

- Em **Equipe**, administradores podem alterar o acesso entre **Administrador** e
  **Colaborador**, consultar as permissões de cada opção e remover pessoas da
  empresa. Cargo profissional continua independente do nível de acesso. Formulários
  usam React Hook Form/Zod, Select/Dialog compartilhados e estilos no CSS central.
- A confirmação da remoção apresenta a pessoa, empresa e quantidade de tarefas
  pendentes. O administrador escolhe outro membro ativo como responsável ou deixa
  essas tarefas sem atribuição. Conta, outras empresas, projetos, autores,
  comentários e tarefas concluídas são preservados. Responsáveis removidos continuam
  identificados no histórico; ao reabrir uma tarefa concluída, a atribuição inativa
  é removida. Novas atribuições exigem vínculo ativo no banco.
- Migrations `202610090005` a `202610090008` adicionam remoção lógica do vínculo,
  RPCs de prévia/alteração/remoção e histórico administrativo. A linha da empresa
  serializa mudanças concorrentes; nenhuma operação pode remover ou rebaixar o
  último administrador. Papel esperado e contagem de tarefas impedem confirmações
  baseadas em dados obsoletos. Falhas preservam a seleção e oferecem atualização.
- RLS e funções de convites/envio validam vínculos ativos. Remoção revoga convites
  pendentes do destinatário e limpa a empresa ativa quando necessário. Um convite
  novo permite retorno como Colaborador; um link antigo aceito não restaura acesso.
  Autoria, data, papel anterior/novo e destino das tarefas ficam no **Histórico de
  acessos**, com paginação e leitura exclusiva de administradores.
- O backend aplica a mudança em cada operação. Sessões abertas verificam o acesso
  a cada 15 segundos na aba ativa e ao recuperar foco; alterações descartam o cache
  privado do contexto anterior e a lista de empresas/convites, fecham painéis e
  retiram controles administrativos. A sessão global da conta permanece válida.
- As quatro migrations foram aplicadas no Supabase local e hospedado. A listagem
  confirmou versões sincronizadas e o lint do schema hospedado não encontrou erros.
  Tipos regenerados diretamente do projeto hospedado. Nenhum dado de negócio de
  produção foi usado como fixture ou removido para testar a funcionalidade.
- Lint, estilos, arquitetura e TypeScript/build aprovados. A suíte Vitest passou
  com 151 testes; os 20 casos de gestão/cache foram reexecutados após o ajuste final.
  O banco local passou em 108 testes e em duas disputas concorrentes de último
  administrador (rebaixamento e remoção). Os seis E2E de onboarding existentes
  também passaram. Os dois E2E de gestão passaram em desktop/celular, validando
  promoção/rebaixamento percebidos em outra sessão, remoção, transferência,
  comentário preservado, responsável histórico
  e confirmação por teclado. Layout revisado em desktop, tablet, 390 px e 320 px;
  capturas em `test-results/member-management-verified`.
- Frontend integrado ao fluxo de publicação por push para `main`. Suspensão,
  novos cargos e permissões específicas por projeto ficam como evolução futura,
  fora desta entrega.

## 46. Aviso antecipado de e-mail cadastrado — 09/10/2026

- Consulta agregada no Supabase hospedado confirmou **zero grupos de e-mails
  duplicados**. O problema relatado era a apresentação: o Auth pode responder a
  um cadastro repetido com HTTP 200 e um usuário ofuscado, sem identidades. O
  serviço agora recusa essa resposta e os códigos explícitos de conta existente,
  preservando o formulário e sem abrir a confirmação como sucesso.
- Conforme solicitado, o campo consulta o backend após 500 ms sem alterações em
  um e-mail válido. Mostra **Este e-mail já está cadastrado**, com link para entrar
  e o destino do convite preservado. Estados de consulta/conta existente bloqueiam
  um novo envio. Ao trocar o endereço, cancela a consulta anterior e ignora respostas
  atrasadas. Erros são visíveis, permitem nova tentativa e mantêm a validação final
  do Auth como proteção contra cadastros concorrentes.
- Cadastros pendentes de confirmação são diferenciados, com ação real para reenviar
  o link via `auth.resend`, sem substituir a senha ou criar outro usuário. A URL de
  confirmação preserva o onboarding ou convite. Reenvio possui estado de envio,
  erro e confirmação da solicitação; limites existentes do Auth continuam ativos.
- Migration `202610090009` aplicada localmente e no projeto hospedado. A nova RPC
  pública retorna somente `available`, `registered` ou `confirmation_pending`;
  não concede leitura de registros do Auth. Esse contrato permite intencionalmente
  identificar se o e-mail informado já tem cadastro para atender ao aviso público.
  Contadores privados limitam consultas por hash do IP encaminhado e globalmente,
  sem armazenar os endereços consultados. Tipos regenerados do projeto hospedado;
  lint dos schemas local e remoto aprovado. Documentação em `supabase/README.md`.
- Componentes e hooks separados; formulários React Hook Form/Zod e estilos
  compartilhados existentes, sem novo sistema visual. Normalização de e-mail é
  compartilhada pelo formulário e pela consulta. Testes cobrem ausência de consulta
  para endereço inválido, cancelamento/resposta fora de ordem, aviso anterior ao
  envio, falha de rede, limites, reenvio e resposta ofuscada de cadastro repetido.
- Vitest aprovado com 166 testes; lint, tipos/build, estilos e arquitetura
  aprovados. Testes de banco passaram em 124 casos. E2E com Supabase/Mailpit
  locais passaram nos seis fluxos de onboarding e nos quatro casos novos de
  cadastro em desktop/celular, incluindo preservação da senha original e do vínculo
  com a empresa. Os dois E2E de requisitos de senha também passaram. Capturas em
  `test-results/registration-email-verified` e
  `test-results/registration-email-mobile-final`.
- Frontend integrado ao fluxo de publicação por push para `main`. Referências:
  [cadastro no Supabase Auth](https://github.com/supabase/auth/blob/master/internal/api/signup.go)
  e [controle de acesso e requisições](https://supabase.com/docs/guides/api/securing-your-api).

## 47. Cadastro ajustado à altura da tela — 09/10/2026

- Removida a frase **Menos ruído. Mais criação.** do cadastro. `AuthLayout`
  recebe a variante semântica `signup`; o login mantém sua composição existente.
- Largura, título, espaçamentos e campos ajustados exclusivamente no CSS central.
  Requisitos de senha usam duas colunas no desktop e uma no celular. No celular,
  o cabeçalho da marca fica compacto para priorizar o formulário. Controles mantêm
  altura mínima de 44 px e os campos preservam fonte de 16 px.
- O formulário inicial cabe sem rolagem nos desktops verificados, incluindo
  2550×800 e 1280×720, nos tablets e em 390×844. Em telas mais baixas (375×667 e
  320×568), zoom ou avisos adicionais, a rolagem natural preserva o acesso ao
  conteúdo. Não há bloqueio de overflow do formulário; o painel escuro acompanha
  a rolagem no desktop para evitar a faixa branca inferior.
- Lint, estilos, arquitetura e TypeScript/build aprovados; 27 testes de formulário,
  consulta de e-mail, login e confirmação e 14 E2E existentes passaram. Revisão
  em dez tamanhos de tela, com validação vazia, foco e navegação ao login por
  teclado, sem overflow horizontal nem erros JavaScript. Capturas em
  `test-results/signup-layout-review`. Nenhuma conta criada ou alteração no backend.
- Frontend integrado ao fluxo de publicação por push para `main`.

## 48. GitHub App: repositórios, tarefas e merge — 11/10/2026

**Estado:** implementação local concluída e verificada. Cadastro/instalação do
GitHub App, credenciais, migrations hospedadas, deploy das funções, agendamento
e publicação do frontend ainda precisam ser aplicados conforme
[`docs/GITHUB_APP.md`](docs/GITHUB_APP.md). Nenhum comentário real foi publicado
durante a implementação; não houve push ou alteração no Supabase hospedado.

- Configurações ganham conexão de repositórios por OAuth, instalação do App e
  desconexão. A pessoa precisa administrar a empresa no Orbit e o repositório no
  GitHub. O backend valida identidade, permissão administrativa e instalação do
  App; o navegador nunca informa um installation ID confiável.
- Um repositório por projeto e um vínculo por tarefa neste primeiro escopo.
  A aba Desenvolvimento permite informar branch ou número do PR; branches
  descobrem seu PR automaticamente. Forks usam o número do PR de destino. PRs
  encerrados antes do vínculo da branch são ignorados; ambiguidades exigem PR
  explícito. Não são criados branches, commits, aprovações ou merges.
- Branch/rascunho coloca a tarefa em andamento; PR pronto coloca em revisão;
  fechamento sem merge mantém em andamento; merge conclui e agenda comentário
  com título e link da tarefa. Descrição e comentários internos não são publicados.
  O histórico identifica o Orbit como autor das mudanças automáticas.
- Migrations `202610110001`–`202610110005` adicionam repositórios, vínculo ao
  projeto, vínculo à tarefa, RLS, constraints compostas e RPCs. Estados OAuth,
  recibos de comentários, entregas de webhook e jobs ficam no schema privado.
  Tipos TypeScript regenerados do banco local; a stack existente foi mantida.
- `github-api` valida a sessão pelo Auth e usa estado OAuth de uso único, com
  validade de dez minutos, vinculado à pessoa/empresa/repositório. O retorno
  preserva o contexto mesmo que seja necessário fazer login e remove o código
  da barra de endereço. Credenciais e tokens GitHub ficam somente no backend.
- `github-webhook` verifica HMAC do corpo original e registra a entrega de forma
  idempotente. `github-worker` consulta o estado atual no GitHub, serializa cada
  vínculo por lease e retoma falhas com espera crescente. Webhooks não aplicam
  diretamente um status antigo; um merge confirmado não pode ser revertido.
- A fila processa até dez vínculos por execução, com Cron a cada minuto e
  reconciliação periódica dos vínculos ativos. `supabase/github-schedule.sql`
  usa segredos do Vault e pode ser reaplicado sem criar jobs duplicados.
  Comentários confirmados deixam de consumir consultas periódicas.
- Antes de reenviar um comentário de resultado incerto, o worker procura seu
  marcador em comentários do próprio bot. Recibos sobrevivem ao unlink/relink.
  A API GitHub não oferece idempotency key para comentários: há reconciliação,
  sem promessa de entrega exatamente uma vez em toda falha distribuída possível.
- Reutilizados Button, Input, OptionsSelect/Controller, estados de consulta e
  estruturas de página. Aparência exclusivamente no `globals.css`, com revisão
  de desktop, tablet e celular e navegação por teclado.
- A verificação identificou e corrigiu um loop de `<Navigate>` durante o
  carregamento lazy do login: seu estado agora é estável. O seed local garante
  todos os grupos da política de senha. `ORBIT_E2E_PORT` permite iniciar os E2E
  em uma porta exclusiva, sem reutilizar o servidor de outro projeto; o teste
  existente de status espera a opção estar visível antes da navegação por teclado.

### Verificações executadas

- Lint, TypeScript/build, estilos, artefato de e-mail e arquitetura aprovados.
- Deno check aprovado para as três funções e locks das dependências gerados.
- 188 testes unitários/contratos passaram. O teste opt-in `github-pipeline` fica
  pulado na suíte padrão e foi executado separadamente com sucesso contra o
  Supabase local: merge, perda de resposta após POST aceito, recuperação sem novo
  POST e reconhecimento do recibo após remover/recriar o vínculo.
- 162 testes de banco passaram, incluindo 38 novos sobre GitHub: permissões,
  RLS, OAuth, jobs, status, auditoria, replay, falhas e revogação da instalação.
- 18 E2E de GitHub, navegação e persistência de projetos/tarefas passaram em
  desktop e celular. O cenário de merge também inspecionou tablet em 820×1180.
  Capturas locais em `test-results/github-*`; respostas GitHub são simuladas
  exclusivamente nos testes. Login, projetos e tarefas usam o Supabase local.
- Script de agendamento executado duas vezes em transação local e revertido:
  um único job foi produzido; nenhum agendamento ou segredo de teste permaneceu.
- Falta a validação externa com OAuth, webhook e PR reais após a configuração
  do App. O guia registra os campos, permissões, segredos, publicação e roteiro
  de aceite dessa etapa.

## 49. Configuração do GitHub App no Supabase hospedado — 11/10/2026

**Estado:** backend publicado e verificado no projeto `twsfyqkagyvibsilulle`.
Esta etapa atualiza o estado de publicação registrado na seção 48. O frontend
ainda precisa ser publicado; instalação, conexão OAuth e PR real estão pendentes.

- App `weorbit-integration` cadastrado pelo usuário. Chave convertida para
  PKCS#8/Base64 e validada por assinatura local e autenticação real no GitHub.
  App ID, Client ID, slug, permissões e eventos conferidos. Credenciais locais
  permanecem em arquivos ignorados pelo Git, com permissão 600; nenhum valor
  secreto foi exibido nos logs ou incluído na documentação.
- As cinco migrations foram verificadas contra o banco hospedado em transação
  revertida e depois aplicadas em uma transação pela Management API, preservando
  as versões e os SQLs originais no histórico `supabase_migrations`.
- Oito variáveis da integração publicadas; domínio canônico definido como
  `https://weorbit.com.br`. Funções `github-api`, `github-webhook` e `github-worker`
  publicadas pela CLI com `--use-api`; três funções confirmadas ativas, versão 1,
  com autenticação própria e `verify_jwt = false`.
- Vault configurado com URL e segredo do worker. `pg_cron` e `pg_net` habilitados;
  job `orbit-github-worker` ativo a cada minuto. Execução automática observada
  com sucesso no Cron e resposta HTTP 200 do worker, sem timeout e com fila vazia.
- RLS das três tabelas públicas confirmada; leitura anônima e escrita direta
  por membros recusadas. RPCs de recebimento, vínculo e processamento reservadas
  ao serviço. API, webhook e worker recusam chamadas sem autenticação (401);
  worker autenticado retorna 200.
- O primeiro reenvio real do ping mostrou ausência de assinatura no GitHub.
  Aplicado ao App o segredo já publicado no Supabase; novo reenvio trouxe
  assinatura SHA-256, resposta HTTP 200 e confirmação de recebimento.
- O bundle publicado do site ainda não contém a rota GitHub. Nenhuma instalação
  do App ou tarefa vinculada existia nesta verificação; nenhum comentário real
  foi enviado. Restam publicação do frontend, seleção de repositórios pelo usuário
  e validação completa de OAuth, sincronização de um PR e comentário após merge.

## 50. Conexão GitHub em um único fluxo — 11/10/2026

**Estado:** alteração implementada e validada localmente. Para publicação, aplicar
`202610120001_github_account_connection.sql` e atualizar `github-api` antes do
frontend. Nenhuma configuração ou dado de produção foi alterado nesta etapa.

- Configurações passa a oferecer **Conectar GitHub**, sem formulário de URL nem
  instalação em aba separada. A pessoa escolhe conta/organização e repositórios
  no GitHub, confirma a autorização e retorna com os repositórios disponíveis.
  A instalação exigida pelo GitHub é a concessão de acesso, sem baixar software.
- A Setup URL já cadastrada (`/settings`) continua funcionando e encaminha o
  retorno à callback. OAuth é iniciado automaticamente pelo Orbit. Permanecem
  desmarcados OAuth durante a instalação e Device Flow; **Redirect on update**
  precisa estar ativado para atualizar uma instalação existente. Não há novos
  segredos. O guia de cadastro/publicação foi atualizado.
- O backend valida a instalação do próprio App e consulta os repositórios usando
  o token OAuth da pessoa. Importa somente os autorizados com permissão `admin`.
  IDs de instalação recebidos pelo navegador não constituem prova de acesso.
  Repositórios não elegíveis são informados, e nenhuma seleção elegível resulta
  em erro explícito. O consentimento informa que os repositórios ficarão
  disponíveis à empresa que iniciou a conexão.
- Estados privados vinculam usuário/empresa, expiram em dez minutos e são trocados
  entre seleção de repositórios e OAuth. A importação tem paginação, limite de mil
  repositórios e gravação atômica com nova checagem de acesso à empresa. Tokens
  GitHub não são persistidos. Callbacks antigas permanecem compatíveis durante
  a atualização. Tipos regenerados do Supabase local.
- Cancelamento, solicitação aguardando aprovação da organização, estado expirado,
  instalação forjada, acesso insuficiente e falha de escrita recebem tratamento
  explícito. A conexão pode ser reiniciada nas configurações.
- Lint, estilos/e-mail, arquitetura, TypeScript/build e Deno check aprovados.
  Vitest: 202 testes passaram, com um teste opt-in não executado nesta etapa.
  PostgreSQL: 183 testes passaram, incluindo 21 novos de autorização, expiração,
  replay, revogação de acesso e rollback da importação inteira.
- Os dez E2E existentes de GitHub e quatro novos passaram em desktop/celular,
  cobrindo o fluxo completo com respostas GitHub simuladas, retorno após login,
  cancelamento e aprovação pendente. Navegação por teclado e layout sem overflow
  conferidos em desktop, tablet e celular. Capturas em
  `test-results/github-account-*`. A validação com consentimento GitHub e PR
  reais permanece como aceite após publicação; nenhum comentário foi enviado.

## 51. Seleção de branches e PRs na tarefa — 11/10/2026

**Estado:** implementado e validado localmente. Publicar `github-api` e frontend
junto com a conexão da seção 50. Esta seleção não exige migration adicional;
a migration da conexão de conta continua pendente no ambiente hospedado.

- A aba Desenvolvimento lista branches e pull requests do repositório associado
  ao projeto. O vínculo usa seleção direta, com paginação de 50 opções, atualização
  da lista e filtro textual das opções carregadas. PRs podem ser filtrados por
  abertos/rascunhos, fechados/integrados ou todos.
- Opções identificam número, título e status do PR. A seleção mostra branch de
  origem, destino e repositório do fork. PRs com origem removida ficam indisponíveis;
  selecionar um PR já integrado informa a conclusão e o comentário que a
  sincronização produzirá após o vínculo.
- O backend verifica usuário, empresa, tarefa, projeto e repositório ativo antes
  de consultar o GitHub. Listagem e validação usam token de instalação com leitura,
  limitado ao repositório. A identidade e a branch padrão atuais são consultadas
  no GitHub; a branch padrão é excluída e o vínculo revalida a escolha antes da
  escrita. As permissões também são verificadas pela RPC de persistência.
- Consultas distinguem carregamento, ausência de opções e falhas, inclusive em
  atualização e paginação. Uma falha bloqueia o vínculo até recuperação. Cache
  inclui usuário, empresa, tarefa, repositório, tipo e filtro; mudanças de contexto
  limpam a seleção. Os seletores compartilhados preservam navegação por teclado
  e o CSS permanece centralizado em `globals.css`.
- Lint, estilos/e-mail, arquitetura, TypeScript/build e Deno check aprovados.
  Vitest: 223 testes passaram; um teste opt-in não foi executado nesta etapa.
  Os dez E2E existentes de vínculo e seis novos de seleção passaram em desktop
  e celular. Revisão visual incluiu tablet e celular de 320 px, conteúdo longo,
  teclado, paginação, forks, mudança de filtro e recuperação de erros.
- Testes de contrato cobrem autorização, paginação, dados inválidos, revogação,
  branch removida e mudança da branch padrão entre listagem e vínculo. GitHub
  é simulado apenas nos testes; login, projetos e tarefas dos E2E usam o Supabase
  local. A validação com repositório e PR reais permanece pendente após publicação.

## 52. Correção da publicação da conexão GitHub — 12/10/2026

**Estado:** backend atualizado em produção; início da conexão validado na sessão
real do Orbit. Esta etapa substitui as pendências de publicação das seções 50 e 51.

- O frontend novo já estava publicado, mas `github-api` permanecia na versão 1
  e a migration da conexão de conta não existia no Supabase hospedado. A API
  rejeitava a ação `connect-account` com HTTP 400 antes de iniciar o fluxo.
- `202610120001_github_account_connection.sql` foi validada em transação revertida
  contra o projeto `twsfyqkagyvibsilulle`, aplicada e registrada em uma transação
  única no histórico de migrations. O cache do PostgREST foi recarregado.
- `github-api` publicada pela CLI com `--use-api` e confirmada ativa na versão 2.
  Autenticação própria preservada; chamadas sem sessão retornam HTTP 401.
  As quatro novas RPCs permitem execução somente ao serviço entre os papéis
  da aplicação verificados: `authenticated` foi recusado e `service_role` aceito.
- Na sessão autenticada do usuário, **Conectar GitHub** criou o estado de conexão
  e redirecionou à seleção de conta/organização do GitHub. A seleção foi deixada
  aberta para o usuário. Nenhuma permissão de repositório foi concedida pelo agente.
- Não houve alteração de código ou credenciais nesta correção. Os testes da
  implementação estão registrados nas seções anteriores. Concluir OAuth,
  importar repositórios e validar sincronização/comentário em PR real continuam
  pendentes; nenhuma task ou PR foi alterado nesta verificação.

## 53. Recuperação da conexão GitHub expirada — 12/10/2026

**Estado:** correção validada localmente e backend publicado. Frontend desta
entrega inclui a mensagem específica e a proteção contra reenvio de callbacks.

- O retorno real ocorreu às 00h20 (America/Sao_Paulo), após expiração do estado
  às 00h13. O erro `INVALID_REQUEST` foi confirmado nos logs da API; nenhum
  repositório havia sido importado. O usuário informou que escolheu `orbitwe`.
- A nova migration `202610120002_github_connection_timeout.sql` permite 30 minutos
  para escolher conta e repositórios. A etapa seguinte, OAuth, mantém dez minutos,
  estado rotacionado, uso único e vínculo ao usuário/empresa. Estados antigos
  expirados não são reativados. Permissões e assinaturas das RPCs foram preservadas.
- Falhas de estado nos retornos recebem `GITHUB_STATE_INVALID` e orientam iniciar
  novamente nas configurações. Falhas de permissão continuam distintas. Um teste
  de navegador revelou reenvio após remontagem da callback com erro; desativados
  reenvios por remontagem, foco e reconexão para essa operação de uso único.
- **Redirect on update** ativado e salvo no GitHub App, para instalações existentes
  voltarem ao Orbit. A API do GitHub confirmou a instalação ativa em `orbitwe`,
  com leitura de conteúdo e escrita em PRs. Nenhuma permissão foi ampliada.
- Migration validada em transação revertida e aplicada com histórico atômico no
  Supabase hospedado. `github-api` confirmada ativa na versão 3.
- Lint, estilos/e-mail, arquitetura, TypeScript/build e Deno check aprovados.
  Suíte unitária: 224 testes passaram e um opt-in ficou pulado; o teste adicional
  de remontagem/foco/reconexão passou separadamente. PostgreSQL: 185 testes passaram.
  Seis E2E em desktop/celular passaram, cobrindo OAuth, cancelamento, aprovação
  pendente, erro de expiração e reinício com estado novo sem repetir a callback.
- Correção enviada na `main` (`a9cb81f`) e publicação Vercel confirmada. Na
  verificação real, `orbitwe` estava sem repositórios. O usuário escolheu conectar
  `devIgor1`; OAuth concluído e importação confirmada de 125 repositórios já
  autorizados no GitHub para uma única empresa, incluindo `devIgor1/orbit`.
- Uma instalação já existente mantém Save desabilitado quando não há mudanças
  de repositórios. Nesta validação foi retomada a URL de retorno com estado novo
  e o ID observado da instalação escolhida, preservando OAuth e validações de
  acesso do backend. Uma ação de retomada na interface permanece como melhoria
  para esse caso. Não houve alteração das permissões ou dos repositórios da
  instalação, e nenhum comentário em PR foi publicado.


## 54. Retomada automática de instalações existentes — 12/10/2026

**Estado:** publicado e validado em produção. Migration aplicada, `github-api`
ativa na versão 4 e frontend `3ce19ba` publicado pela Vercel.

- **Conectar GitHub** começa por OAuth e consulta as instalações acessíveis ao
  usuário. O Orbit mostra as contas/organizações já instaladas para escolha;
  a seleção segue diretamente para confirmação e importação, sem abrir as
  configurações da instalação nem depender de alterações nos repositórios.
- Sem instalações, o retorno inicia automaticamente a instalação no GitHub. A
  escolha também oferece conectar outra conta/organização. Callbacks e ações
  anteriores continuam disponíveis durante a atualização.
- A migration `202610120003_github_installation_discovery.sql` guarda somente
  hashes de estados e IDs confirmados, vinculados por dez minutos ao usuário
  e à empresa. Escolha e consumo são atômicos, de uso único, com nova checagem
  do papel administrativo. As RPCs são exclusivas do serviço. A seleção exige
  um ID oferecido pelo GitHub; uma nova passagem OAuth revalida o acesso antes
  da importação, sem armazenar tokens entre etapas.
- A descoberta pagina até mil instalações e recusa respostas incompletas,
  falhas ou dados de outro App. A importação existente continua verificando
  instalação, suspensão, permissões e administração de cada repositório.
- Interface reutiliza painéis, botões e linhas de empresas existentes, com
  estilos em `globals.css`, navegação por teclado e bloqueio de envios duplicados.
  Revisão visual feita em desktop, tablet e celular, incluindo nome longo.
- Lint, estilos/e-mail, arquitetura, tipos/build e Deno check aprovados. Vitest:
  239 testes passaram e um opt-in ficou pulado. PostgreSQL: 210 testes passaram.
  Os 14 E2E de conexão passaram em desktop/celular: instalações existentes com
  uma ou várias contas, primeira instalação, outra conta, cancelamento, aprovação
  pendente, estados expirados e proteção contra reenvio.
- Migration validada em transação revertida no Supabase hospedado, depois aplicada
  com histórico atômico. Nenhuma credencial ou permissão nova é necessária.
- Na validação real, **Conectar GitHub** listou `devIgor1` e `orbitwe` sem abrir
  as configurações da instalação. Escolher `devIgor1` concluiu a autorização e
  reconectou os 125 repositórios existentes na empresa `teste`. Foram usados
  somente os botões normais do produto, sem editar permissões, repositórios ou
  URLs de callback. Evidências visuais locais registram a escolha e o sucesso.


## 55. Seleção explícita dos repositórios da empresa — 12/10/2026

**Estado:** publicado, validado localmente e conferido em produção. Migration
aplicada, `github-api` ativa na versão 5 e frontend `9ddca0a` publicado pela Vercel.
O usuário escolheu revisar os 125
repositórios importados antes pela interface, sem remoção automática nesta entrega.

- Após escolher a conta, o Orbit mostra os repositórios disponíveis. Novos
  repositórios começam desmarcados; os já conectados aparecem marcados para revisão.
  Busca preserva a seleção, e as ações permitem marcar os resultados ou limpar
  a seleção. O botão **Salvar seleção** informa quantos serão mantidos e removidos.
- Preparar a lista não conecta nem desconecta repositórios. A escolha fica em
  estado privado, rotacionado, com uso único e validade de dez minutos. Uma nova
  autorização revalida o App, usuário e permissões atuais antes da escrita.
  Somente os IDs explicitamente escolhidos são persistidos. Tokens não são
  armazenados no banco ou navegador. A ação antiga de importação total foi bloqueada.
- **Revisar repositórios conectados** abre o mesmo fluxo para corrigir a seleção
  anterior. Desmarcar conexões revisadas as desativa ao salvar. Repositórios em
  uso por projetos são mantidos; o servidor também recusa uma remoção se um
  vínculo surgiu durante a escolha. Outras instalações e conexões adicionadas
  em paralelo permanecem fora da remoção. Toda a escrita é atômica.
- Checkbox compartilhado com Base UI, nomes acessíveis, busca e ações por teclado.
  Aparência em `globals.css`. Revisão visual em desktop e celular de 320 px.
- Lint, estilos/e-mail, arquitetura, tipos/build e Deno check aprovados. Vitest:
  251 testes passaram e um opt-in ficou pulado. PostgreSQL: 235 testes passaram.
  Os 18 E2E de conexão/seleção passaram em desktop e celular, cobrindo escolha
  parcial, ausência de pré-seleção para novos repos, revisão dos existentes,
  proteção de projetos, busca, teclado e erro sem sucesso artificial.
- Migration `202610120004_github_repository_selection.sql` validada em transação
  revertida no Supabase hospedado, aplicada e registrada atomicamente. Nenhuma
  credencial, URL ou permissão do GitHub App foi alterada.
- Na validação real, **Revisar repositórios conectados** listou as contas e abriu
  os 125 repositórios de `devIgor1`, preservando os existentes marcados e bloqueando
  a remoção de `devIgor1/advanced-react`, em uso por um projeto. A seleção ficou
  aberta para o usuário; nenhuma escolha foi salva em seu lugar. A escrita parcial
  e as proteções foram verificadas nos testes locais, sem remover conexões reais.

## 56. PR vinculado diretamente à tarefa — 13/10/2026

**Estado:** implementação local. Publicação pendente: aplicar as migrations
`202610130001` e `202610130002`, publicar `github-api` e depois o frontend.

- Retirada a configuração de repositório da página do projeto. A aba
  **Desenvolvimento** da tarefa permite escolher **Repositório do PR** e
  **Pull request**, com botão **Vincular PR à tarefa**. A autorização dos
  repositórios continua nas configurações da empresa. Tarefas do mesmo projeto
  podem escolher repositórios diferentes; cada tarefa mantém um vínculo.
- Trocar repositório ou status limpa a seleção do PR. Paginação, filtro, aviso
  de PR integrado, bloqueio de envios duplicados e preservação de escolhas em
  falhas reutilizam os componentes existentes. Estilos permanecem no CSS central;
  removidas as regras do painel de repositório do projeto.
- Listagem e escrita validam membro ativo, tarefa e repositório na mesma empresa.
  A RPC revalida permissões e conexão sob bloqueio. Novas FKs ligam diretamente
  o repositório e a combinação empresa/projeto/tarefa. Seleção de repositórios
  passa a proteger os usados pelas tarefas, inclusive em alterações concorrentes.
- Vínculos e branches antigos, histórico, fila e recibos são preservados. A tabela
  e a RPC de associação de projeto ficam apenas para compatibilidade com clientes
  antigos e deixam de restringir tarefas. A remoção de vínculo continua acessível
  mesmo quando o repositório perde acesso; falhas de escrita ficam visíveis.
- Tipos do schema público regenerados com o gerador oficial Postgres Meta a partir
  das migrations aplicadas no banco de teste. A stack da aplicação não mudou.
- Lint, estilos/e-mail, arquitetura, TypeScript/build, Deno check das três funções
  e `git diff --check` aprovados. Vitest: 260 testes passaram; o teste opt-in de
  pipeline Supabase permaneceu pulado.
- As 23 migrations foram aplicadas em PostgreSQL 18 isolado, com os contratos de
  Auth necessários aos testes. Passaram 129 asserções pgTAP de GitHub, incluindo
  18 novas sobre vínculo direto, dois repositórios no mesmo projeto, permissões,
  FKs, remoção e preservação de outras tarefas. O Supabase padrão usa PostgreSQL
  17; seus E2E autenticados e o pipeline completo não foram executados porque o
  Docker local falhou ao iniciar. Nenhum banco ou credencial de produção mudou.
- Seis testes de navegador isolados passaram em desktop/celular, com inspeção
  adicional em tablet e 320 px, nomes longos, teclado, paginação, reload, forks,
  filtros e recuperação de erro. Usam o componente real com respostas simuladas
  exclusivamente no teste; não são validação de OAuth/PR real. Capturas em
  `test-results/task-pr-final`. A revisão final corrigiu apenas a execução dos
  testes: gravações de traces fora da pasta ignorada acionavam recargas do Vite.

## 57. Validação completa de tarefa → PR — 13/10/2026

**Estado:** fluxo validado em ambiente local isolado. A publicação indicada na
seção 56 e a validação com OAuth/PR real continuam pendentes.

- Novo E2E opt-in percorre conexão e consentimento, escolha dos repositórios,
  criação de projeto/tarefa e vínculo de PR pela interface. Auth, PostgREST,
  handlers da API/webhook, worker e banco executam operações reais; somente o
  GitHub externo é simulado. O projeto não recebe associação de repositório.
- Verificados rascunho, revisão, fechamento sem merge, reabertura e merge,
  persistência após reload, atualização automática da tela sem reload, histórico,
  título e link do comentário. A resposta perdida após aceitar um comentário
  é recuperada sem novo envio, inclusive com workers concorrentes e recriação
  do vínculo. Tarefas do mesmo projeto usam repositórios diferentes.
- Verificadas sessão ausente, assinatura inválida, falha de acesso, revogação,
  bloqueio da retirada de repositório em uso e remoção do vínculo indisponível
  sem afetar outra tarefa. Escritas recusadas não produzem sucesso fictício.
- Docker confirmou novamente a falha de inicialização no socket de inferência.
  A execução usou Auth 2.197.0, PostgREST 16.4 e PostgreSQL 18.3 nativos, com as
  23 migrations. A única adaptação do Auth para Windows foi retirar a opção
  Unix SO_REUSEPORT do listener. Os handlers TypeScript rodaram em Node; o
  Edge Runtime e o PostgreSQL 17 padrão não foram executados nesta rodada.
- Vitest: **261 testes aprovados, sem pulos**, incluindo o pipeline antes opt-in.
  pgTAP: **253 asserções aprovadas** em banco separado, com Auth real e seed.
  Lint, estilos/e-mails, arquitetura, TypeScript/build e Deno check aprovados.
- **46 cenários distintos de navegador validados** em desktop/celular. Na
  rodada ampla, 45 passaram e um teste de teclado falhou por enviar teclas
  antes de o popup receber foco. O teste passou a aguardar o placeholder inicial
  e a opção final focados: três repetições em cada dispositivo passaram. A rodada
  adicional confirmou também o polling automático nos quatro E2E de backend real.
  Não foi necessária correção funcional no produto nesta etapa.
- Roteiro reproduzível em `docs/GITHUB_TESTS.md`; servidor e fixtures somente em
  `tests/support`. O adaptador de configuração recusa backend remoto e mantém
  credenciais administrativas fora do Vite. Evidências em
  `test-results/full-flow-tools`, `test-results/full-flow-browser-final`,
  `test-results/full-flow-browser-confirmed` e
  `test-results/full-flow-keyboard-confirmed`. Produção e PRs reais não alterados.

## 58. Correção da prévia ao arrastar tarefas — 13/10/2026

**Estado:** corrigido e validado localmente; publicação pendente.

- O arraste passa a fornecer ao navegador uma cópia isolada do card, com as
  dimensões medidas e o deslocamento do ponteiro preservados. O adaptador
  compartilhado `native-drag-preview.ts` remove IDs, desativa interação e limpa
  o clone antes da próxima pintura, no cancelamento e na desmontagem.
- A origem fica atenuada e a coluna de destino recebe destaque. O hook do quadro
  aceita apenas o tipo de arraste interno e a tarefa em curso. Mesma coluna,
  conteúdo externo e escrita pendente não geram outra atualização. Aparência
  permanece em `globals.css`; o adaptador define somente geometria medida.
- A mudança continua dependendo da confirmação do backend. Falhas mantêm o status
  confirmado, mostram erro e permitem nova tentativa. O seletor compartilhado
  continua oferecendo a alteração por teclado e no celular.
- Sete cenários E2E passaram com Auth, PostgREST e PostgreSQL locais: prévia,
  persistência/reload, cancelamento e descartes inválidos, escrita recusada e
  recuperação, bloqueio durante escrita, tablet e seletor em desktop/celular.
  Inspecionadas capturas em 1280, 900 e 320 px. Cinco testes de mouse são
  intencionalmente pulados no projeto mobile; não se afirma suporte a toque.
- O teste instrumenta o `setDragImage` nativo sem substituí-lo e confirma que o
  elemento contém somente o card, com dimensões e offsets corretos. A captura de
  página mostra origem/destino; não captura a imagem de arraste do SO.
- Build/TypeScript, estilos/e-mail, arquitetura e lint aprovados. Vitest:
  **261 testes aprovados** com dois workers; a primeira execução concorrente com
  o navegador excedeu timeouts em testes existentes de formulários/equipe.
  TypeScript e lint dos novos E2E também passaram. Roteiro em
  `docs/TASK_DRAG_TESTS.md`; evidências em `test-results/task-drag-verified` e
  `test-results/task-drag-tablet`. Nenhuma alteração em produção.

## Validação do PR #1 — 14/10/2026

- A escolha inicial oferece a conta pessoal autenticada. A seleção de repositórios
  inclui aqueles em que o usuário possui escrita, mantendo a instalação de cada
  proprietário e revalidando o acesso antes de salvar.
- A revisão corrigiu a conversão de falhas de instalações de colaboradores em
  listas vazias. Suspensão, revogação, limite excedido, resposta incompleta e falha
  do GitHub impedem a escrita e permanecem erros visíveis.
- Lint, estilos/e-mails, arquitetura, TypeScript/build e Deno check aprovados.
  Vitest: 268 testes passaram e um teste integrado opt-in permaneceu pulado.
  PostgreSQL 18.3 isolado: 255 asserções pgTAP passaram com Auth e seed locais,
  incluindo permissões e seleção entre instalações. Seis cenários Playwright de
  seleção de PR passaram em desktop/celular, incluindo teclado e falha de acesso.
- Docker indisponível nesta rodada. A execução integrada adicional foi bloqueada
  pela revisão automática de aprovação; não se declara validação OAuth real.
  No checkout Windows, o artefato de e-mail foi normalizado para LF, sem mudança
  de conteúdo versionado, antes de executar seu check.
- A publicação requer, nesta ordem, as migrations `202610130001`, `202610130002`
  e `202610140001`, a função `github-api` e o frontend. As três migrations foram
  verificadas em transação revertida no Supabase hospedado; as RPCs mantêm acesso
  exclusivo de `service_role`, recusando `anon` e `authenticated`.

## 59. Repositório do GitHub por projeto — 15/10/2026

**Estado:** implementação local. Publicação pendente: aplicar a migration
`202610150005`, publicar `github-api` e depois o frontend.

- Reverte a decisão da seção 56 a pedido do produto: cada projeto tem o próprio
  repositório. O card **Repositório do GitHub** na página do projeto mostra o
  repositório e, para administradores, permite escolher, trocar ou remover entre
  os conectados à empresa. Membros apenas visualizam.
- A aba **Desenvolvimento** deixa de oferecer **Repositório do PR** e lista PRs
  somente do repositório do projeto. Sem repositório ou com ele desconectado, a
  aba informa o estado e leva ao projeto. Vínculos anteriores são preservados.
- `link_task_github` e a API (`taskRepository`) recusam outro repositório com
  `GITHUB_PROJECT_REPOSITORY_REQUIRED`. Nova RPC `clear_project_github_repository`
  (administrador). A revisão das conexões protege repositórios usados por projetos.
- Vitest, lint, estilos, arquitetura e TypeScript aprovados. pgTAP completo com
  seed no Supabase local (PostgreSQL 17). Playwright: seleção de PR, configurações
  e o fluxo completo opt-in (Auth, API, worker e banco reais) em desktop/celular.

## 60. Central de notificações — 14/10/2026

**Estado:** implementada na branch `codex/notifications`; migrations validadas em
Supabase isolado. Publicação no ambiente hospedado pendente.

- Sino no cabeçalho com contador confirmado de não lidas, painel responsivo,
  filtros, histórico paginado e leitura individual ou em lote. A abertura de um
  aviso marca a leitura no backend e abre a tarefa pelo parâmetro da URL, inclusive
  quando outra tarefa do mesmo projeto já havia sido acessada.
- Migrations `202610150001` a `202610150003` registram atribuição, comentário e
  mudança de status na transação original. Destinatários são o novo responsável
  ou criador/responsável, conforme o evento, excluindo autor e membros removidos.
  Uma pessoa com dois papéis recebe apenas um aviso por evento.
- Tabela protegida por RLS e RPCs que verificam destinatário e vínculo ativo.
  Escritas diretas ficam bloqueadas; leitura individual exige o registro afetado.
  Leitura em lote usa o snapshot do servidor para preservar eventos posteriores.
- Supabase Broadcast em canal privado por usuário/workspace transporta somente
  sinal de invalidação, sem dados de negócio. A consulta sempre revalida acesso.
  Reconexão, foco e consulta periódica recuperam avisos pendentes; erros de rede,
  autorização e escrita permanecem visíveis. O e-mail mantém seu fluxo existente.
- Componentes, hooks, serviços e validações separados em `features/notifications`;
  aparência centralizada na seção 13 de `globals.css`. Realtime habilitado na
  configuração local e incluído no comando `db:start`. Tipos regenerados.
- Vitest: 301 testes passaram, um integrado opt-in pulado. PostgreSQL/Supabase
  isolado: 292 asserções pgTAP aprovadas. Playwright com Auth, banco e Realtime
  reais: sete cenários aprovados em 1280, 900 e 320 px; duas repetições do teste
  de autorização de canal foram intencionalmente puladas nos outros viewports.
  Capturas inspecionadas em `test-results/notifications`. A falha de escrita
  é simulada exclusivamente no teste; demais fluxos usam o backend local real.
- Documentação de contratos, instalação e testes em `docs/NOTIFICATIONS.md`.
  Build/TypeScript, lint, estilos/e-mails, arquitetura e tipagem adicional dos
  novos testes e configuração Playwright aprovados; `git diff --check` aprovado.
  A implementação preserva as alterações anteriores e os arquivos do PDF;
  não aplica migrations no banco de uso diário nem publica em produção.

## 61. Convites recebidos no sino — 14/10/2026

**Estado:** implementado e validado em checkout isolado na branch
`codex/invitation-notifications`; publicação registrada no PR correspondente.

- A lista global de convites do e-mail confirmado passa a integrar o sino, inclusive
  quando outra empresa está ativa. Reutiliza `my_invitations` e a tela de aceitação;
  convites pendentes anteriores também aparecem, sem recriar registros ou e-mails.
- O contador soma atividades não lidas e convites pendentes, diferenciando as duas
  quantidades no nome acessível. O filtro e a leitura em lote afetam as atividades;
  convites permanecem até aceitação, cancelamento ou expiração. Prévia de três
  convites com acesso à lista completa, mantendo o padrão visual central.
- A migration `202610150004` adiciona Broadcast privado por destinatário confirmado,
  independente da associação ao workspace. O payload é vazio e a RPC revalida
  autorização a cada consulta. Nenhum contrato público ou tipo gerado é alterado.
- A conexão compartilha um adaptador com as notificações de tarefas. As duas
  features usam o mesmo cliente Supabase. Consultas se recuperam após reconexão,
  foco ou intervalo de 60 segundos; falhas permanecem visíveis e não viram vazio.
- Implementação e testes ficam fora do checkout original, preservando a branch,
  o índice, as alterações não commitadas e os arquivos do PDF.
- Validação: 299 testes unitários aprovados, um opt-in ignorado; 310 asserções SQL
  aprovadas em Supabase local isolado; 11 E2E aprovados, com quatro repetições de
  autorização/recuperação puladas nos outros viewports. O navegador confirmou
  recebimento entre empresas, sincronização em duas abas, cancelamento, aceitação,
  convites anteriores à conexão e bloqueio do canal de outra conta. Nenhum e-mail
  real foi enviado. Capturas em 1280, 900 e 320 px inspecionadas.
- Lint, estilos/e-mails, arquitetura, TypeScript/build, tipagem adicional dos novos
  testes e `git diff --check` aprovados. Preflight da migration no Supabase hospedado
  executado com rollback, sem alterar dados de negócio.
