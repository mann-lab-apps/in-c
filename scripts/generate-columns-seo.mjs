import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const siteRoot = resolve(repoRoot, 'site')
const columnsRoot = resolve(siteRoot, 'columns')
const publicRoot = resolve(siteRoot, 'public')
const baseUrl = 'https://in-c.mannlab.app'
const socialImageUrl = `${baseUrl}/social-preview.png`
const socialImageAlt = 'in C 앱 아이콘'

const columnsDataSource = readFileSync(resolve(siteRoot, 'columns-data.js'), 'utf8')
const columnsModule = await import(
  `data:text/javascript;base64,${Buffer.from(columnsDataSource).toString('base64')}`
)
const { columns } = columnsModule

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const slugifyAnchor = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')

const renderMarkdown = (markdown) => {
  const lines = markdown.trim().split('\n')
  const html = []
  let listItems = []

  const flushList = () => {
    if (listItems.length === 0) return
    html.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`)
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushList()
      continue
    }

    if (line.startsWith('## ')) {
      flushList()
      const title = escapeHtml(line.slice(3))
      html.push(`<h2 id="${slugifyAnchor(title)}">${title}</h2>`)
      continue
    }

    if (line.startsWith('- ')) {
      listItems.push(escapeHtml(line.slice(2)).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'))
      continue
    }

    flushList()
    html.push(`<p>${escapeHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`)
  }

  flushList()
  return html.join('\n')
}

const renderChipList = (items) =>
  items.length > 0
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')
    : '<li>연결 전</li>'

const renderArticle = (column) => {
  const url = `${baseUrl}/columns/${column.slug}.html`
  const title = `${column.title} | Columns | in C`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: column.title,
    description: column.summary,
    datePublished: column.publishedAt,
    inLanguage: 'ko-KR',
    author: {
      '@type': 'Organization',
      name: 'mann-lab-apps'
    },
    publisher: {
      '@type': 'Organization',
      name: 'in C'
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    keywords: column.tags.join(', ')
  }

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(column.summary)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${escapeHtml(column.title)} | Columns" />
    <meta property="og:description" content="${escapeHtml(column.summary)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="in C" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:image" content="${socialImageUrl}" />
    <meta property="og:image:alt" content="${socialImageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(column.title)} | Columns" />
    <meta name="twitter:description" content="${escapeHtml(column.summary)}" />
    <meta name="twitter:image" content="${socialImageUrl}" />
    <meta name="twitter:image:alt" content="${socialImageAlt}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <link rel="icon" href="../assets/icon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="../index.html" aria-label="in C home">
        <img src="../assets/icon.svg" width="36" height="36" alt="" />
        <span>in C</span>
      </a>
      <nav aria-label="주요 링크">
        <a aria-current="page" href="../columns.html">Columns</a>
        <a href="../compositions.html">Compositions</a>
        <a href="../index.html#product-map">Concerts</a>
        <a href="../index.html#product-map">Creators</a>
        <a href="../index.html#product-map">Classes</a>
        <a href="../index.html#download">Chromatics 앱</a>
        <a href="https://github.com/mann-lab-apps/in-c">GitHub</a>
      </nav>
    </header>

    <main class="column-page">
      <article class="column-document">
        <header class="column-document__header">
          <p class="eyebrow">Columns · ${escapeHtml(column.category)}</p>
          <h1>${escapeHtml(column.title)}</h1>
          <p class="column-article__summary">${escapeHtml(column.summary)}</p>
          <dl class="column-meta">
            <div><dt>상태</dt><dd>공개</dd></div>
            <div><dt>읽는 시간</dt><dd>${column.readingMinutes}분</dd></div>
            <div><dt>게시일</dt><dd>${column.publishedAt}</dd></div>
          </dl>
          <ul class="tag-list" aria-label="태그">
            ${renderChipList(column.tags)}
          </ul>
        </header>

        <div class="markdown-body">
${renderMarkdown(column.body)}
        </div>

        <aside class="related-panel" aria-label="관련 항목">
          <section>
            <h2>관련 작품</h2>
            <ul class="chip-list">
              ${renderChipList(column.relatedWorks)}
            </ul>
          </section>
          <section>
            <h2>관련 작곡가</h2>
            <ul class="chip-list">
              ${renderChipList(column.relatedComposers)}
            </ul>
          </section>
          <section>
            <h2>관련 공연</h2>
            <ul class="chip-list">
              ${renderChipList(column.relatedPerformances)}
            </ul>
          </section>
        </aside>
      </article>
    </main>

    <footer class="site-footer">
      <p>© 2026 mann-lab-apps. Columns는 in C가 만드는 클래식 읽기 지도입니다.</p>
      <div>
        <a href="../columns.html">Columns</a>
        <a href="../index.html#product-map">제품군</a>
        <a href="../index.html#download">Chromatics 앱</a>
      </div>
    </footer>
    <script type="module" src="../main.js"></script>
  </body>
</html>
`
}

const publicColumns = columns.filter((column) => column.status === 'public')
mkdirSync(columnsRoot, { recursive: true })
mkdirSync(publicRoot, { recursive: true })

for (const column of publicColumns) {
  writeFileSync(resolve(columnsRoot, `${column.slug}.html`), renderArticle(column))
}

const sitemapUrls = [
  `${baseUrl}/index.html`,
  `${baseUrl}/columns.html`,
  `${baseUrl}/compositions.html`,
  ...publicColumns.map((column) => `${baseUrl}/columns/${column.slug}.html`)
]

writeFileSync(
  resolve(publicRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
  </url>`
  )
  .join('\n')}
</urlset>
`
)

writeFileSync(
  resolve(publicRoot, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
)

console.log(`Generated ${publicColumns.length} column pages and sitemap.xml`)
