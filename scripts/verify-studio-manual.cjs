const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..'), base = path.join(root, 'docs/product/studio-manual')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'))
const catalog = JSON.parse(fs.readFileSync(path.join(base, 'catalog.json'), 'utf8'))
const entries = JSON.parse(fs.readFileSync(path.join(base, 'entrypoints.json'), 'utf8'))
const shortcuts = { exports: {} }
vm.runInNewContext(ts.transpileModule(read('src/renderer/src/studio-shortcuts.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, shortcuts)
const expected = shortcuts.exports.studioShortcutMarkdown()
if (process.argv.includes('--write-shortcuts')) fs.writeFileSync(path.join(base, '10-shortcuts.md'), expected)
assert.equal(fs.readFileSync(path.join(base, '10-shortcuts.md'), 'utf8'), expected, 'Regenerate the shortcut reference explicitly with --write-shortcuts')
const ids = new Set()
for (const row of catalog) {
  assert(!ids.has(row.id), `Duplicate ${row.id}`); ids.add(row.id)
  for (const key of ['title', 'entry', 'scope', 'disabled', 'shortcut', 'support', 'manual']) assert(row[key], `${row.id}: missing ${key}`)
  for (const source of row.sources) assert(fs.existsSync(path.resolve(root, source)), source)
  const [file, anchor] = row.manual.split('#')
  assert(fs.readFileSync(path.join(base, file), 'utf8').includes(`<a id="${anchor}"></a>`), `Missing section ${row.manual}`)
  // The offline section parser splits only at an anchor followed by ##.
  // Keep inserted notes from silently moving a task into a previous section.
  const marker = '<a id="' + anchor + '"></a>'
  const text = fs.readFileSync(path.join(base, file), 'utf8')
  assert.equal(text.split(marker).length - 1, 1, 'Duplicate task anchor ' + row.manual)
  assert(text.slice(text.indexOf(marker) + marker.length).trimStart().startsWith('## '), 'Task anchor must immediately precede its own ## heading: ' + row.manual)

  assert.equal(row.userChecked, false, 'Do not invent user verification')
}
for (const ch of manifest.chapters) {
  const text = fs.readFileSync(path.join(base, ch.file), 'utf8'); assert(text.length > 100, ch.file)
}
for (const name of [...manifest.chapters.map(c => c.file), 'README.md', 'feature-index.md']) {
  const text = fs.readFileSync(path.join(base, name), 'utf8')
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1]
    if (link.startsWith('https://')) continue
    const [file, anchor] = link.split('#'), target = path.resolve(base, file || name)
    assert(fs.existsSync(target), `${name}: missing ${link}`)
    if (anchor) assert(fs.readFileSync(target, 'utf8').includes(`<a id="${anchor}"></a>`), `${name}: missing anchor ${link}`)
  }
}
const appSource = read('src/renderer/src/App.tsx')
const app = ts.createSourceFile('App.tsx', appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const unwrap = n => ts.isAsExpression(n) || ts.isSatisfiesExpression(n) ? unwrap(n.expression) : n
const field = (n, key) => n.properties.find(p => p.name && (p.name.text ?? p.name.getText(app)) === key)?.initializer
const str = n => n && ts.isStringLiteral(n) ? n.text : undefined
let menuArray
function visit(n) { if (ts.isVariableDeclaration(n) && n.name.getText(app) === 'applicationMenus') menuArray = unwrap(n.initializer); ts.forEachChild(n, visit) }
visit(app); assert(menuArray && ts.isArrayLiteralExpression(menuArray))
const actual = []
for (const menu of menuArray.elements) {
  const menuId = str(field(menu, 'id'))
  for (const command of field(menu, 'commands').elements) actual.push(`${menuId}:${str(field(command, 'id'))}`)
}
assert.deepEqual([...Object.keys(entries.menus)].sort(), actual.sort(), 'Every actual menu command needs a mapped manual task')
for (const id of Object.values(entries.menus)) assert(ids.has(id) || id === 'shortcut-reference', `Unmapped task ${id}`)
const paletteSource = read('src/renderer/src/StudioNotationPalette.tsx')
const palette = ts.createSourceFile('palette.tsx', paletteSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let families
function visitPalette(n) { if (ts.isVariableDeclaration(n) && n.name.getText(palette) === 'familyNames') families = unwrap(n.initializer); ts.forEachChild(n, visitPalette) }
visitPalette(palette); assert(families && ts.isArrayLiteralExpression(families))
assert.deepEqual(Object.keys(entries.paletteFamilies).sort(), families.elements.map(str).sort(), 'Every actual palette family needs a manual mapping')
for (const [family, id] of Object.entries(entries.paletteFamilies)) { assert(read('src/renderer/src/StudioNotationPalette.tsx').includes(`'${family}'`), family); assert(ids.has(id), id) }
const files = fs.readdirSync(path.join(root, 'src/renderer/src')).filter(n => /^(Studio.+|SpanProperties|NativeBackupsDialog)\.tsx$/.test(n) && !n.includes('.test.'))
assert.deepEqual(Object.keys(entries.surfaces).sort(), files.sort(), 'Each shipped Studio component must have a documented role; no test files in audit')
for (const topics of Object.values(entries.surfaces)) for (const id of topics) assert(ids.has(id) || id === 'shortcut-reference', id)
assert(read('src/renderer/src/editor/keyboard-input.ts').includes("Digit7: 'whole'"))
assert(!read('src/renderer/src/StudioChordProperties.tsx').includes('Cmd/Ctrl+Alt/Option+↑'), 'Stale octave tooltip')
assert(!read('src/renderer/src/StudioChordProperties.tsx').includes("'Alt/Option+↑'"), 'Stale diatonic tooltip')
console.log(JSON.stringify({ status: 'passed', chapters: manifest.chapters.length, taskGroups: catalog.length, menuCommands: actual.length, paletteFamilies: Object.keys(entries.paletteFamilies).length, surfaces: files.length, sourceAuditNotRuntimeApproval: true, userVerificationChecked: 0 }, null, 2))
