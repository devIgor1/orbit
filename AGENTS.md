# AGENTS.md — Orbit

## 1. Escopo e objetivo

Estas instruções se aplicam a todo o projeto a partir desta raiz.
Leia também `PLANO_DE_IMPLEMENTACAO.md` antes de iniciar uma entrega.

O Orbit é uma plataforma de gestão de projetos para equipes criativas. O objetivo é
entregar interfaces elegantes, componentes reutilizáveis e operações integradas a
um backend real, com identidade visual consistente.

## 2. Stack de referência

- React, Vite e TypeScript em modo estrito.
- shadcn/ui e Tailwind CSS v4 para a interface.
- React Router para navegação e TanStack Query para estado remoto.
- Supabase Auth e PostgreSQL como backend.
- React Hook Form e Zod para formulários e validação.

Adote as versões e os comandos efetivamente configurados no projeto. Mudanças de
stack devem ser registradas no plano junto com sua justificativa.

## 3. Regras obrigatórias de estilização

**`src/styles/globals.css` é a ÚNICA fonte de verdade dos estilos autorais.**

1. Defina nesse arquivo todos os tokens e regras de aparência: cores, tipografia,
   espaçamentos, bordas, dimensões de design, sombras, estados e animações.
2. Configure o shadcn com variáveis CSS e `tailwind.css` apontando para esse arquivo.
3. Use o Tailwind dentro do CSS, com `@theme inline`, `@apply` e CSS nativo conforme
   adequado. Os componentes TSX devem referenciar classes semânticas.
4. Não espalhe utilitários Tailwind de aparência ou layout pelo TSX. Classes como
   `ui-button`, `page-header` e `task-card` terão suas regras no `globals.css`.
5. Não crie CSS Modules, Sass, CSS-in-JS, arquivos CSS por componente, blocos
   `<style>` ou objetos JavaScript contendo estilos visuais.
6. Não use `style={{ ... }}`, props de aparência com valores literais ou valores
   arbitrários para criar um sistema visual paralelo.
7. Variantes devem selecionar classes semânticas ou atributos `data-*`; a aparência
   de cada variante continua definida no CSS central.
8. Adapte componentes gerados pelo shadcn antes de usá-los. Preserve composição,
   comportamento, estados e acessibilidade ao centralizar suas regras visuais.
9. Importe `globals.css` uma única vez na entrada da aplicação. Imports de CSS de
   infraestrutura, como Tailwind, ficam centralizados nesse arquivo.
10. Cores e aparência dos gráficos devem consumir os mesmos tokens do sistema.

### Coordenadas calculadas em runtime

Overlays, gráficos e drag-and-drop podem gerar coordenadas, dimensões medidas e
transformações para funcionar. Esses valores técnicos devem ficar isolados em
adaptadores compartilhados, com uso documentado. Essa permissão não inclui cores,
fontes, espaçamentos de design, sombras nem valores visuais hardcoded. Referências
a tokens CSS existentes são permitidas quando a API da biblioteca exigir uma prop.

### Organização do CSS

Mantenha índice e seções claras para tema, tokens, base, primitivos, layout e
padrões de features. Agrupe estados e responsividade com seus componentes. Use
seletores delimitados, reutilize padrões e remova regras mortas ou duplicadas.

O CSS central tem uma responsabilidade única: o sistema visual. Seu crescimento
deve ser tratado com reutilização e organização interna, preservando a fonte única.

## 4. SEMPRE componentizar para reutilização

- Reutilize componentes existentes antes de criar novos.
- Mantenha primitivos shadcn em `src/components/ui`.
- Mantenha estrutura de páginas em `src/components/layout` e padrões transversais
  em `src/components/shared`.
- Mantenha componentes específicos dentro da feature correspondente.
- Extraia cabeçalhos, filtros, tabelas, cards, painéis, campos e estados repetidos.
- Componentes compartilhados recebem dados e callbacks; não fazem consultas de
  negócio nem dependem de uma página específica.
- Use props tipadas e variantes com significado claro.
- Evite componentes genéricos com dezenas de flags ou abstrações sem uso concreto.
- Toda ação visível precisa executar um comportamento real ou comunicar seu estado
  indisponível; botões decorativos não representam funcionalidades entregues.

## 5. JAMAIS criar arquivos monolíticos

- Cada arquivo deve ter uma responsabilidade clara e um motivo principal de mudança.
- Páginas compõem componentes e coordenam estados de tela.
- Componentes cuidam da apresentação e das interações locais.
- Hooks coordenam consultas, mutações e comportamentos reutilizáveis.
- Serviços encapsulam integração com o backend.
- Schemas e tipos descrevem contratos; utilitários têm escopo e nomes específicos.
- Não concentre UI, consultas, validação, transformação de dados e regras de
  negócio no mesmo arquivo.
- Use aproximadamente 200 linhas como referência para arquivos TS/TSX. Ao se
  aproximar de 250 linhas, revise e extraia responsabilidades antes de acrescentar
  mais comportamento. Estar abaixo desse número não garante boa separação.
- Tipos gerados e lockfiles seguem suas ferramentas; o CSS único segue a organização
  da seção 3. Migrations e testes também devem ter escopo delimitado.
- Prefira nomes específicos a arquivos genéricos como `helpers.ts` ou serviços que
  agreguem operações de todos os domínios.

## 6. Backend como fonte de verdade

**SEMPRE utilize dados de negócio vindos do backend.**

- Projetos, tarefas, membros, comentários, histórico e indicadores vêm do Supabase.
- Dados de demonstração serão inseridos por seed no banco e consultados pela API.
- Não use arrays mockados, geração aleatória, JSON local ou `localStorage` como
  substitutos do backend no fluxo da aplicação.
- Estado local pode guardar formulários em edição, filtros e estado de interação.
  O armazenamento de sessão é responsabilidade do SDK de autenticação.
- Textos de interface, rótulos de status e configuração de navegação são metadados
  de apresentação, não registros fictícios de negócio.
- Cache de consultas contém somente respostas reais e deve ser invalidado após
  alterações confirmadas. Inclua identidade, workspace e filtros nas query keys.
- Limpe dados privados do cache na troca de sessão.
- O backend valida permissões, vínculos, valores e regras de negócio. Validação
  frontend complementa essa proteção e melhora a experiência do formulário.
- Confirme o registro efetivamente afetado antes de tratar uma mutação como sucesso.
- Atualize os tipos gerados quando o schema mudar; não mantenha contratos duplicados
  que possam divergir silenciosamente.

## 7. NUNCA mascarar erros de backend

- Diferencie carregamento, sucesso, sucesso vazio, erro e acesso negado.
- Renderize EmptyState somente após resposta bem-sucedida sem registros.
- Renderize ErrorState para falhas de rede, autenticação, autorização ou contrato,
  com mensagem adequada ao caso e ação possível.
- Não use `catch` para devolver `[]`, `0`, objetos fictícios ou sucesso artificial.
- Não use `data ?? []` ou equivalentes como meio de esconder uma consulta com erro
  ou ainda pendente. Trate explicitamente o estado antes de consumir os dados.
- Valores zero, nulos e listas vazias só são dados válidos quando previstos no
  contrato e confirmados pela resposta do backend.
- Não ignore erros retornados pelo SDK, mesmo quando não forem lançados como exceção.
- Não trate zero registros afetados por uma escrita como confirmação de sucesso.
- Em erro de atualização, evidencie a falha; não apresente cache antigo como dado
  atualizado. Na primeira versão, a região afetada deve mostrar o estado de erro.
- Preserve os valores digitados quando um formulário falhar.
- Confirmações visuais e notificações de sucesso dependem de sucesso do backend.
- Prévias de interação, como um arraste, são temporárias. Em falha, restaure o
  último estado confirmado e exiba o erro; não persista sucesso fictício no cache.
- Mensagens devem ser úteis e seguras. Registre contexto técnico sem expor tokens,
  credenciais ou dados sensíveis na interface ou nos logs.
- Mocks e falhas simuladas são permitidos exclusivamente no ambiente de testes.

## 8. Identidade visual e padronização

- Use os mesmos Button, Input, Select, DatePicker, Dialog, Sheet, DataTable e StatusBadge em
  todo o sistema, com variantes documentadas.
- Todo Select deve usar os primitivos shadcn Base UI de `src/components/ui/select.tsx`.
  Para listas simples, reutilize `OptionsSelect`; formulários usam Controller e
  `onValueChange`. Não adicione selects nativos, inclusive nos calendários.
- Todo seletor de data deve usar o DatePicker compartilhado do shadcn (Calendar +
  Popover em `src/components/ui`), inclusive em filtros e formulários novos.
  Não use inputs nativos `date`, `datetime-local`, `month` ou `week`. Exiba datas
  em português brasileiro e preserve o contrato de data sem horário do backend.
- Padronize PageHeader, FilterBar, MetricCard, EmptyState, ErrorState e LoadingState.
- Preserve escala tipográfica, espaçamentos, densidade, raios e hierarquia de ações.
- Novas páginas devem combinar padrões existentes antes de criar novos padrões.
- Use uma biblioteca de ícones e tamanhos definidos pelo sistema visual.
- Datas, números, nomes de status e textos de ações seguem os mesmos formatadores
  e convenções. Interface em português brasileiro; identificadores de código em inglês.
- Uma mudança de padrão visual deve ser feita no componente/tokens compartilhados
  e verificada nas páginas consumidoras.

## 9. Acessibilidade e experiência

- Use HTML semântico, labels associados e nomes acessíveis em botões de ícone.
- Garanta foco visível, ordem de tabulação e gerenciamento de foco em overlays.
- Toda ação essencial deve funcionar por teclado, incluindo alteração de status.
- Não dependa exclusivamente de cor, hover ou drag-and-drop para comunicar ou agir.
- Respeite `prefers-reduced-motion` e mantenha contraste legível.
- Verifique layouts em celular, tablet e desktop, incluindo conteúdo longo.
- Defina estados loading, empty, error, disabled e success para cada fluxo aplicável.
- Evite envios duplicados durante uma mutação em andamento.

## 10. Qualidade e manutenção

- Use TypeScript estrito; evite `any`, casts que escondem problemas e desativação
  de regras de lint sem justificativa específica.
- Separe estado remoto de estado de interface e mantenha dependências unidirecionais.
- Use migrations para alterações de banco e RLS para autorização por workspace.
- Chaves secretas e `service_role` nunca entram no bundle do frontend. Variáveis
  públicas de conexão devem ser descritas em `.env.example`.
- Teste fluxos e falhas relevantes: persistência, permissão, escrita recusada,
  consulta vazia e indisponibilidade do backend.
- Evite testes que apenas reproduzam detalhes triviais de implementação.
- Execute os checks pertinentes à alteração; antes da entrega, valide lint,
  tipos, estilos, arquitetura, testes críticos e build conforme scripts disponíveis.
- Não declare uma verificação aprovada sem executá-la; registre bloqueios reais.
- Atualize a documentação quando contratos, estrutura ou comandos mudarem.

## 11. Critérios de conclusão de uma entrega

Uma funcionalidade está concluída quando:

1. Cumpre o fluxo e os critérios de aceite do plano.
2. Usa os componentes e tokens oficiais do projeto.
3. Possui responsabilidades separadas e componentes reutilizáveis.
4. Lê e grava dados reais no backend, quando aplicável.
5. Trata explicitamente sucesso, vazio, carregamento e erro.
6. Funciona nos tamanhos de tela relevantes e por teclado.
7. Tem suas verificações pertinentes executadas e resultados registrados.
