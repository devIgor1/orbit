import path from 'node:path'
import ts from 'typescript'
import { importsOf, location, report, root, sourceFiles } from './source-files.mjs'

const violations = []
const files = await sourceFiles()

for (const file of files) {
  const { relative, text, ast } = file
  if (!/database\.(?:types|generated)\.ts$/.test(relative) && text.trimEnd().split(/\r?\n/).length > 250) {
    violations.push(`${relative}: excede 250 linhas; extraia uma responsabilidade.`)
  }
  const shared = /^src\/components\/(?:ui|shared)\//.test(relative)
  const service = /\/services\//.test(relative)
  const schema = /\/schemas\//.test(relative)
  const hook = /\/hooks\//.test(relative)
  const page = relative.startsWith('src/pages/')
  for (const { value, node } of importsOf(ast)) {
    const resolved = value.startsWith('@/') ? `src/${value.slice(2)}` : value.startsWith('.')
      ? path.relative(root, path.resolve(path.dirname(file.filename), value)).replaceAll('\\', '/') : value
    const fail = (message) => violations.push(`${location(file, node)}: ${message} (${value})`)
    const bindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined
    const configurationOnly = bindings && ts.isNamedImports(bindings) && bindings.elements.every((binding) => (binding.propertyName ?? binding.name).text === 'isSupabaseConfigured')
    if (shared && (/^src\/(?:features|pages|app)\//.test(resolved) || resolved === '@supabase/supabase-js' || resolved === '@tanstack/react-query' || resolved.startsWith('src/lib/supabase/'))) {
      fail('ui/shared devem receber dados e callbacks por props')
    }
    if ((service || schema) && (/^src\/(?:pages|components|app)\//.test(resolved) || /\/(?:components|hooks)\//.test(resolved) || resolved === 'react')) {
      fail('serviços e schemas não podem depender da apresentação')
    }
    if (hook && (/^src\/(?:pages|app)\//.test(resolved) || /\/components\//.test(resolved))) {
      fail('hooks não podem depender da apresentação')
    }
    if (page && (resolved.startsWith('src/lib/supabase/') && !resolved.endsWith('database.types') && !configurationOnly || /\/services\//.test(resolved) || resolved === '@supabase/supabase-js')) {
      fail('páginas devem acessar o backend por hooks')
    }
    if (relative.startsWith('src/features/') && resolved.startsWith('src/pages/')) {
      fail('features não podem importar páginas')
    }
  }
  function visit(node) {
    if (ts.isPropertyAccessExpression(node) && node.expression.getText(ast) === 'localStorage') {
      violations.push(`${location(file, node)}: localStorage não pode substituir o backend.`)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}

report(violations, 'Arquitetura')
