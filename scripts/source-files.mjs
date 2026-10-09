import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

export const root = process.cwd()

export async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const groups = await Promise.all(entries.map(async (entry) => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(filename) : [filename]
  }))
  return groups.flat()
}

export async function sourceFiles() {
  const filenames = await walk(path.join(root, 'src'))
  return Promise.all(filenames.filter((name) => /\.[cm]?[jt]sx?$/.test(name)).map(async (filename) => {
    const text = await readFile(filename, 'utf8')
    return {
      filename,
      relative: path.relative(root, filename).replaceAll('\\', '/'),
      text,
      ast: ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true),
    }
  }))
}

export function importsOf(ast) {
  const imports = []
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ value: node.moduleSpecifier.text, node })
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      imports.push({ value: node.arguments[0].text, node })
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return imports
}

export function report(violations, label) {
  if (violations.length) {
    console.error(`${label}: ${violations.length} violação(ões).`)
    violations.forEach((violation) => console.error(`  ${violation}`))
    process.exitCode = 1
  } else console.log(`${label}: aprovado.`)
}

export function location(file, node) {
  return `${file.relative}:${file.ast.getLineAndCharacterOfPosition(node.getStart(file.ast)).line + 1}`
}
