const { existsSync, readdirSync, readFileSync } = require('node:fs')
const { resolve } = require('node:path')

const siteRoot = resolve(__dirname, '../site')
const productionOrigin = 'https://in-c.mannlab.app'
const socialImageUrl = `${productionOrigin}/social-preview.png`

function readSiteFile(relativePath) {
  return readFileSync(resolve(siteRoot, relativePath), 'utf8')
}

function getAttributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
  )
}

function getTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/)
  return match ? match[1].trim() : ''
}

function getMeta(html) {
  const metas = new Map()

  for (const match of html.matchAll(/<meta\s+[^>]*>/g)) {
    const attrs = getAttributes(match[0])
    const key = attrs.property || attrs.name

    if (key && attrs.content) {
      metas.set(key, attrs.content)
    }
  }

  return metas
}

function getCanonical(html) {
  for (const match of html.matchAll(/<link\s+[^>]*>/g)) {
    const attrs = getAttributes(match[0])

    if (attrs.rel === 'canonical') {
      return attrs.href || ''
    }
  }

  return ''
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertMeta(metas, key, filePath) {
  const value = metas.get(key)

  assert(value && value.trim().length > 0, `${filePath} missing ${key}`)
  return value
}

function verifyPage({ filePath, publicPath }) {
  const html = readSiteFile(filePath)
  const title = getTitle(html)
  const metas = getMeta(html)
  const expectedUrl = `${productionOrigin}/${publicPath}`

  assert(title, `${filePath} missing title`)
  assertMeta(metas, 'description', filePath)
  assert(getCanonical(html) === expectedUrl, `${filePath} canonical must be ${expectedUrl}`)

  assertMeta(metas, 'og:title', filePath)
  assertMeta(metas, 'og:description', filePath)
  assertMeta(metas, 'og:type', filePath)
  assert(assertMeta(metas, 'og:url', filePath) === expectedUrl, `${filePath} og:url must be ${expectedUrl}`)
  assert(assertMeta(metas, 'og:site_name', filePath) === 'in C', `${filePath} og:site_name must be in C`)
  assert(assertMeta(metas, 'og:locale', filePath) === 'ko_KR', `${filePath} og:locale must be ko_KR`)
  assert(assertMeta(metas, 'og:image', filePath) === socialImageUrl, `${filePath} og:image must be ${socialImageUrl}`)
  assertMeta(metas, 'og:image:alt', filePath)

  assert(assertMeta(metas, 'twitter:card', filePath) === 'summary_large_image', `${filePath} twitter:card must be summary_large_image`)
  assertMeta(metas, 'twitter:title', filePath)
  assertMeta(metas, 'twitter:description', filePath)
  assert(assertMeta(metas, 'twitter:image', filePath) === socialImageUrl, `${filePath} twitter:image must be ${socialImageUrl}`)
  assertMeta(metas, 'twitter:image:alt', filePath)

  return expectedUrl
}

function getPages() {
  const pages = [
    { filePath: 'index.html', publicPath: 'index.html' },
    { filePath: 'columns.html', publicPath: 'columns.html' },
    { filePath: 'compositions.html', publicPath: 'compositions.html' }
  ]

  const columnsRoot = resolve(siteRoot, 'columns')
  for (const entry of readdirSync(columnsRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('_')) {
      pages.push({
        filePath: `columns/${entry.name}`,
        publicPath: `columns/${entry.name}`
      })
    }
  }

  return pages
}

function main() {
  const expectedUrls = getPages().map(verifyPage)
  const sitemap = readSiteFile('public/sitemap.xml')
  const robots = readSiteFile('public/robots.txt')
  const socialImagePath = resolve(siteRoot, 'public/social-preview.png')

  assert(existsSync(socialImagePath), 'site/public/social-preview.png is missing')
  assert(
    robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`),
    'robots.txt must reference the production sitemap URL'
  )

  for (const url of expectedUrls) {
    assert(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml missing ${url}`)
  }

  console.log(`Verified SEO metadata for ${expectedUrls.length} page(s).`)
  console.log(`Preview image: ${socialImageUrl}`)
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
