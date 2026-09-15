import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const metadata = JSON.parse(read('docs/releases/in-c-app-store-ko.json'))
for (const [key, maximum] of Object.entries({ name: 30, subtitle: 30, promotionalText: 170, description: 4000, whatsNew: 4000 })) {
  const length = [...metadata[key]].length
  assert(length > 0 && length <= maximum, `${key}: ${length}/${maximum}`)
  console.log(`${key}: ${length}/${maximum}`)
}
assert(Buffer.byteLength(metadata.keywords, 'utf8') <= 100, 'keywords exceeds 100 UTF-8 bytes')
console.log(`keywords: ${Buffer.byteLength(metadata.keywords, 'utf8')}/100 bytes`)
for (const [key, path] of Object.entries({ marketingUrl: '/', supportUrl: '/support.html', privacyPolicyUrl: '/in-c-app-privacy.html' })) {
  const url = new URL(metadata[key])
  assert.equal(url.protocol, 'https:')
  assert.equal(url.hostname, 'in-c.mannlab.app')
  assert.equal(url.pathname, path)
  const file = path === '/' ? 'index.html' : path.slice(1)
  assert(existsSync(resolve(root, 'out/site', file)), `Missing deployed page ${file}`)
}
const home = read('site/index.html')
assert(!/href="[^" ]*(columns|community|chromatics|utility-apps)/.test(home), 'Home must be app-only')
assert(home.includes('공개 준비 중'), 'Do not imply the unverified public listing is downloadable')
assert(!home.includes('apps.apple.com'), 'Public download availability has not been verified')
for (const page of ['index.html', 'support.html', 'in-c-app-privacy.html']) {
  const html = read(`site/${page}`)
  assert(html.includes('lang="ko"'))
  assert(html.includes('in-c-app-privacy.html'))
  assert(!/<script[^>]+src=/.test(html), 'Static app pages must not load analytics or auth scripts')
  const built = read(`out/site/${page}`)
  for (const match of built.matchAll(/(?:src|href)="(\.\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
    assert(existsSync(resolve(root, 'out/site', match[1])), `Broken ${page} asset/link ${match[1]}`)
  }
}
assert(read('site/support.html').includes(`mailto:${metadata.contactEmail}`))
assert(read('site/in-c-app-privacy.html').includes(`mailto:${metadata.contactEmail}`))
assert(metadata.description.includes('음원을 직접 제공하는 스트리밍 서비스가 아닙니다'))
console.log('PASS: Korean metadata, app-only landing, support, privacy and deployed links')
