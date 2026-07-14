const tls = require('node:tls')

const productionOrigin = (process.env.PRODUCTION_SITE_URL || 'https://in-c.mannlab.app').replace(/\/$/, '')
const fallbackUrl = process.env.GITHUB_PAGES_FALLBACK_URL || 'https://mann-lab-apps.github.io/in-c/'
const expectedOrigin = 'https://in-c.mannlab.app'
const requestTimeoutMs = Number(process.env.PRODUCTION_SITE_TIMEOUT_MS || 15000)

const checks = []

function addCheck(name, run) {
  checks.push({ name, run })
}

function toUrl(path) {
  return path.startsWith('http') ? path : `${productionOrigin}${path}`
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    return await fetch(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function readText(path, expectedStatus = 200) {
  const url = toUrl(path)
  const response = await fetchWithTimeout(url)

  if (response.status !== expectedStatus) {
    throw new Error(`${url} returned ${response.status}, expected ${expectedStatus}`)
  }

  return {
    url,
    finalUrl: response.url,
    text: await response.text()
  }
}

async function assertHeadOk(url) {
  const response = await fetchWithTimeout(url, { method: 'HEAD' })

  if (response.status < 200 || response.status >= 400) {
    throw new Error(`${url} returned ${response.status}`)
  }
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label} does not include ${expected}`)
  }
}

function assertAbsoluteProductionUrl(value, label) {
  if (!value.startsWith(`${expectedOrigin}/`)) {
    throw new Error(`${label} must use ${expectedOrigin}, got ${value}`)
  }
}

function parseManifest(raw) {
  let manifest

  try {
    manifest = JSON.parse(raw)
  } catch (error) {
    throw new Error(`download manifest is invalid JSON: ${error.message}`)
  }

  const requiredStringFields = ['version', 'releaseTag', 'repositoryUrl', 'releaseUrl', 'checksumsUrl']
  for (const field of requiredStringFields) {
    if (typeof manifest[field] !== 'string' || manifest[field].length === 0) {
      throw new Error(`download manifest missing required string field: ${field}`)
    }
  }

  if (!Array.isArray(manifest.downloads) || manifest.downloads.length === 0) {
    throw new Error('download manifest must include at least one download entry')
  }

  for (const entry of manifest.downloads) {
    const label = entry.id || entry.platform || 'unknown download'
    const requiredEntryFields = ['id', 'platform', 'label', 'architecture', 'format', 'fileName', 'url']

    for (const field of requiredEntryFields) {
      if (typeof entry[field] !== 'string' || entry[field].length === 0) {
        throw new Error(`download manifest entry ${label} missing required string field: ${field}`)
      }
    }

    if (typeof entry.available !== 'boolean') {
      throw new Error(`download manifest entry ${label} missing boolean field: available`)
    }

    if (entry.available && !entry.url.includes(`/releases/download/${manifest.releaseTag}/`)) {
      throw new Error(`download manifest entry ${label} URL does not match release tag ${manifest.releaseTag}`)
    }
  }

  return manifest
}

async function assertCertificate() {
  const host = new URL(productionOrigin).hostname

  await new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: host,
        rejectUnauthorized: true
      },
      () => {
        const certificate = socket.getPeerCertificate()
        socket.end()

        if (!certificate || !certificate.subjectaltname || !certificate.subjectaltname.includes(`DNS:${host}`)) {
          reject(new Error(`TLS certificate does not include DNS:${host}`))
          return
        }

        resolve()
      }
    )

    socket.setTimeout(requestTimeoutMs, () => {
      socket.destroy(new Error(`TLS check timed out after ${requestTimeoutMs}ms`))
    })
    socket.on('error', reject)
  })
}

addCheck('production pages return HTTP 200', async () => {
  const paths = [
    '/',
    '/#download',
    '/columns.html',
    '/compositions.html',
    '/privacy.html',
    '/sitemap.xml',
    '/robots.txt'
  ]

  for (const path of paths) {
    const response = await fetchWithTimeout(toUrl(path), { method: 'HEAD' })

    if (response.status !== 200) {
      throw new Error(`${toUrl(path)} returned ${response.status}, expected 200`)
    }
  }
})

addCheck('GitHub Pages fallback redirects to the production domain', async () => {
  const response = await fetchWithTimeout(fallbackUrl, { method: 'HEAD' })
  const finalUrl = response.url.replace(/\/$/, '')

  if (response.status !== 200) {
    throw new Error(`${fallbackUrl} returned ${response.status}, expected 200 after redirects`)
  }

  if (finalUrl !== expectedOrigin) {
    throw new Error(`${fallbackUrl} final URL is ${response.url}, expected ${expectedOrigin}/`)
  }
})

addCheck('legacy /in-c/ path preserves old GitHub Pages links', async () => {
  const legacy = await readText('/in-c/')

  assertIncludes(legacy.text, 'window.location.replace', 'legacy redirect page')
  assertIncludes(legacy.text, 'target.hash', 'legacy redirect page')
})

addCheck('robots and sitemap use the production domain', async () => {
  const robots = await readText('/robots.txt')
  const sitemap = await readText('/sitemap.xml')

  assertIncludes(robots.text, `Sitemap: ${expectedOrigin}/sitemap.xml`, 'robots.txt')
  assertIncludes(sitemap.text, `<loc>${expectedOrigin}/index.html</loc>`, 'sitemap.xml')
  assertIncludes(sitemap.text, `<loc>${expectedOrigin}/columns.html</loc>`, 'sitemap.xml')
  assertIncludes(sitemap.text, `<loc>${expectedOrigin}/compositions.html</loc>`, 'sitemap.xml')
  assertIncludes(sitemap.text, `<loc>${expectedOrigin}/privacy.html</loc>`, 'sitemap.xml')
})

addCheck('published canonical URL uses the production domain', async () => {
  const columns = await readText('/columns.html')
  const privacy = await readText('/privacy.html')

  assertIncludes(columns.text, `<link rel="canonical" href="${expectedOrigin}/columns.html" />`, 'columns.html')
  assertIncludes(privacy.text, `<link rel="canonical" href="${expectedOrigin}/privacy.html" />`, 'privacy.html')
})

addCheck('download manifest schema and release links are reachable', async () => {
  const manifestResponse = await readText('/download-manifest.json')
  const manifest = parseManifest(manifestResponse.text)

  assertAbsoluteProductionUrl(`${expectedOrigin}/download-manifest.json`, 'download manifest URL')
  await assertHeadOk(manifest.releaseUrl)
  await assertHeadOk(manifest.checksumsUrl)

  for (const download of manifest.downloads.filter((entry) => entry.available)) {
    await assertHeadOk(download.url)
  }
})

addCheck('TLS certificate is valid for the production domain', assertCertificate)

async function main() {
  const failures = []

  console.log(`Production site: ${productionOrigin}`)
  console.log(`Fallback URL: ${fallbackUrl}`)

  for (const check of checks) {
    try {
      await check.run()
      console.log(`✓ ${check.name}`)
    } catch (error) {
      failures.push({ name: check.name, message: error.message })
      console.error(`✗ ${check.name}`)
      console.error(`  ${error.message}`)
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} production smoke check(s) failed.`)
    process.exitCode = 1
    return
  }

  console.log('\nProduction smoke checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
