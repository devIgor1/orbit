import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { importsOf, location, report, root, sourceFiles, walk } from './source-files.mjs'

const violations = []
const files = await sourceFiles()
const styles = (await walk(path.join(root, 'src'))).filter((file) => /\.(css|scss|sass|less|styl)$/.test(file))
const cssPath = path.join(root, 'src/styles/globals.css')
for (const file of styles) if (file !== cssPath) violations.push(`${path.relative(root, file)}: estilos autorais pertencem a globals.css.`)

const css = await readFile(cssPath, 'utf8')
const knownClasses = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => match[1]))
const utility = /^(?:!?-?(?:p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy]|w|min-w|max-w|h|min-h|max-h|inset|top|right|bottom|left|z|order|col|row|grid-cols|grid-rows|flex|basis|grow|shrink|items|justify|content|self|place-items|bg|text|font|leading|tracking|border|rounded|shadow|opacity|overflow|object|aspect|translate|rotate|scale|transition|duration|ease|animate|ring|outline|cursor|fill|stroke)-|(?:block|inline|inline-block|flex|inline-flex|grid|hidden|relative|absolute|fixed|sticky|visible|invisible|truncate|antialiased|italic|underline)$)/
const visualProps = new Set(['color', 'background', 'backgroundColor', 'fill', 'stroke', 'strokeWidth', 'fontSize', 'fontFamily', 'fontWeight', 'borderRadius', 'boxShadow'])
let globalImports = 0

function stringsIn(node) {
  const values = []
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) values.push(node.text)
  else if (ts.isConditionalExpression(node)) values.push(...stringsIn(node.whenTrue), ...stringsIn(node.whenFalse))
  else if (ts.isBinaryExpression(node)) values.push(...stringsIn(node.right))
  else if (ts.isJsxExpression(node) && node.expression) values.push(...stringsIn(node.expression))
  else if (ts.isCallExpression(node)) node.arguments.forEach((argument) => values.push(...stringsIn(argument)))
  else if (ts.isArrayLiteralExpression(node)) node.elements.forEach((element) => values.push(...stringsIn(element)))
  else if (ts.isArrowFunction(node)) values.push(...stringsIn(node.body))
  else if (ts.isTemplateExpression(node)) {
    values.push(node.head.text)
    node.templateSpans.forEach((span) => values.push(...stringsIn(span.expression), span.literal.text))
  }
  return values
}

for (const file of files) {
  const fail = (node, message) => violations.push(`${location(file, node)}: ${message}`)
  const constants = new Map()
  function collectConstants(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer)
    ts.forEachChild(node, collectConstants)
  }
  collectConstants(file.ast)
  function isToken(node, seen = new Set()) {
    if (ts.isJsxExpression(node)) return Boolean(node.expression && isToken(node.expression, seen))
    if (ts.isStringLiteral(node)) return /^var\(--[\w-]+\)$/.test(node.text) || (file.relative === 'src/components/shared/chart.tsx' && /^url\(#[\w-]+\)$/.test(node.text))
    if (ts.isIdentifier(node) && constants.has(node.text) && !seen.has(node.text)) return isToken(constants.get(node.text), new Set([...seen, node.text]))
    if (ts.isElementAccessExpression(node)) return isToken(node.expression, seen)
    if (ts.isObjectLiteralExpression(node)) return node.properties.length > 0 && node.properties.every((property) => ts.isPropertyAssignment(property) && isToken(property.initializer, seen))
    return false
  }
  for (const { value, node } of importsOf(file.ast)) {
    if (/\.(css|scss|sass|less|styl)(?:\?|$)/.test(value)) {
      if (!value.endsWith('styles/globals.css') || file.relative !== 'src/main.tsx') fail(node, 'importe CSS somente uma vez em src/main.tsx.')
      else globalImports += 1
    }
    if (/(?:styled-components|@emotion\/|styled-jsx|stitches|vanilla-extract)/.test(value)) fail(node, 'CSS-in-JS não é permitido.')
  }
  function checkClasses(node) {
    for (const value of stringsIn(node)) {
      for (const className of value.split(/\s+/).filter(Boolean)) {
        const base = className.split(':').at(-1)
        const semanticExceptions = new Set(['text-link', 'row-arrow'])
        if ((utility.test(base) && !semanticExceptions.has(className)) || className.includes('[')) fail(node, `classe utilitária '${className}'; use uma classe semântica.`)
        else if (!knownClasses.has(className)) fail(node, `classe '${className}' não definida em globals.css.`)
      }
    }
  }
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(file.ast) === 'style') fail(node, 'blocos <style> não são permitidos.')
    }
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(file.ast)
      if (name === 'className' && node.initializer) checkClasses(node.initializer)
      if (name === 'style' || name === 'css') fail(node, 'estilos inline devem ficar em globals.css; coordenadas precisam de adaptador explícito.')
      if (visualProps.has(name) && node.initializer) {
        if (!isToken(node.initializer)) fail(node, `prop visual '${name}' deve referenciar um token CSS.`)
      }
    }
    if (ts.isCallExpression(node) && /^(?:cn|clsx|cva|classNames)$/.test(node.expression.getText(file.ast))) {
      checkClasses(node)
      if (node.expression.getText(file.ast) === 'cva' && node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])) {
        const variants = node.arguments[1].properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(file.ast) === 'variants')
        if (variants && ts.isPropertyAssignment(variants)) {
          const visitVariants = (child) => { if (ts.isStringLiteral(child)) checkClasses(child); ts.forEachChild(child, visitVariants) }
          visitVariants(variants.initializer)
        }
      }
    }
    if (ts.isTypeReferenceNode(node) && /^(?:React\.)?CSSProperties$/.test(node.typeName.getText(file.ast))) fail(node, 'objetos de aparência não pertencem ao TypeScript.')
    if (ts.isTaggedTemplateExpression(node) && /(?:^|\.)(?:css|styled)/.test(node.tag.getText(file.ast))) fail(node, 'estilos tagged-template não são permitidos.')
    ts.forEachChild(node, visit)
  }
  visit(file.ast)
}

if (globalImports !== 1) violations.push(`globals.css precisa de um único import em src/main.tsx (encontrados: ${globalImports}).`)
const shadcn = JSON.parse(await readFile(path.join(root, 'components.json'), 'utf8'))
if (shadcn.tailwind?.css !== 'src/styles/globals.css' || shadcn.tailwind?.cssVariables !== true) violations.push('components.json deve usar globals.css e cssVariables: true.')
report([...new Set(violations)], 'Estilos')
