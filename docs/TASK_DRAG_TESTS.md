# Testes de arraste de tarefas

`tests/e2e/task-drag.spec.ts` valida o quadro com Auth, PostgREST e banco locais.
Cria projetos e tarefas pela interface e remove os projetos de teste ao terminar.
A falha de escrita é simulada somente no teste; os demais cenários gravam no banco.

Com o Supabase local iniciado, migrations aplicadas e contas do seed disponíveis:

```powershell
$taskBackend = npx supabase status -o json | ConvertFrom-Json
$env:VITE_SUPABASE_URL = 'http://127.0.0.1:55521'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = $taskBackend.ANON_KEY
$env:ORBIT_E2E_PORT = '5178'
$env:ORBIT_TASK_DRAG_E2E = '1'
npm run test:e2e -- tests/e2e/task-drag.spec.ts --workers=1
```

O seed fornece `.demo-credentials.json`. O adaptador `tests/support/local-backend.ts`
recusa bancos remotos e também aceita a configuração nativa explícita documentada
em [GITHUB_TESTS.md](GITHUB_TESTS.md). Não altere a conexão de produção para rodar
estes testes; as variáveis acima valem apenas para o processo local.

São sete cenários executados: prévia limitada ao card e persistência; cancelamento,
mesma coluna e conteúdo externo; falha e nova tentativa; bloqueio durante a escrita;
arraste no layout de tablet; seletor por teclado em desktop e em celular de 320 px.
Os cinco cenários de mouse são pulados no projeto mobile, que usa Chromium com
emulação de dispositivo. Não há cobertura de arraste por toque ou Safari.

O teste da prévia observa o elemento passado ao `setDragImage` nativo e verifica
isolamento, dimensões, posição do ponteiro e remoção do clone. A captura de página
registra origem e destino; ela não inclui a imagem de arraste do sistema operacional.
