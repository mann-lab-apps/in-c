import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const siteRoot = resolve(repoRoot, 'site')
const outSiteRoot = resolve(repoRoot, 'out/site')

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const siteManifestPath = resolve(siteRoot, 'download-manifest.json')
const builtManifestPath = resolve(outSiteRoot, 'download-manifest.json')
const catalogPath = resolve(siteRoot, 'compositions-catalog.json')
const publicRoot = resolve(siteRoot, 'public')
const loadDataModule = async (path) => {
  const source = readFileSync(path, 'utf8')
  const encoded = Buffer.from(source).toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}
const columnsModule = await loadDataModule(resolve(siteRoot, 'columns-data.js'))
const productModule = await loadDataModule(resolve(siteRoot, 'product-data.js'))

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function publicAssetPath(url) {
  assert(url.startsWith('./'), `asset URL must be relative: ${url}`)
  return resolve(publicRoot, url.slice(2))
}

function verifyDownloadManifest() {
  assert(existsSync(siteManifestPath), 'site/download-manifest.json is missing')
  assert(
    existsSync(builtManifestPath),
    'out/site/download-manifest.json is missing; run npm run site:build first'
  )

  const source = readJson(siteManifestPath)
  const built = readJson(builtManifestPath)

  assert(
    JSON.stringify(source) === JSON.stringify(built),
    'built download-manifest.json must match the site source manifest'
  )
  assert(source.version, 'download manifest missing version')
  assert(source.releaseTag, 'download manifest missing releaseTag')
  assert(
    source.releaseUrl.includes(source.releaseTag),
    'releaseUrl must include releaseTag'
  )
  assert(
    source.checksumsUrl.includes(source.releaseTag),
    'checksumsUrl must include releaseTag'
  )

  for (const download of source.downloads ?? []) {
    assert(download.id, 'download entry missing id')
    assert(download.label, `download ${download.id} missing label`)
    assert(download.fileName, `download ${download.id} missing fileName`)

    if (!download.available) {
      continue
    }

    assert(download.url, `available download ${download.id} missing url`)
    assert(
      download.url.includes(source.releaseTag),
      `${download.id} URL must include releaseTag`
    )
    assert(
      basename(download.url) === download.fileName,
      `${download.id} URL basename must match fileName`
    )
    assert(
      download.fileName.includes(source.version),
      `${download.id} fileName must include manifest version`
    )
  }
}

function verifyCompositions() {
  const catalog = readJson(catalogPath)
  const columns = new Set(columnsModule.columns.map((column) => column.slug))
  const works = new Set(productModule.works.map((work) => work.id))

  for (const composition of catalog.compositions ?? []) {
    if (composition.status !== 'available') {
      continue
    }

    assert(composition.slug, 'available composition missing slug')
    assert(composition.workId, `${composition.slug} missing workId`)
    assert(works.has(composition.workId), `${composition.slug} workId not found`)
    assert(
      composition.assets?.musicxml,
      `${composition.slug} missing MusicXML asset`
    )
    assert(
      composition.assets?.chromatics,
      `${composition.slug} missing Chromatics asset`
    )
    assert(
      composition.assets.musicxml === composition.assets.chromatics,
      `${composition.slug} Chromatics asset should use the MusicXML source`
    )
    assert(
      existsSync(publicAssetPath(composition.assets.musicxml)),
      `${composition.slug} MusicXML file is missing`
    )
    assert(
      composition.assets.pdf === null,
      `${composition.slug} must not expose PDF as the primary catalog asset`
    )

    for (const columnSlug of composition.relatedColumns ?? []) {
      assert(
        columns.has(columnSlug),
        `${composition.slug} references missing column ${columnSlug}`
      )
    }
  }
}

function verifyProductRelations() {
  const workIds = new Set(productModule.works.map((work) => work.id))
  const creatorIds = new Set(productModule.creators.map((creator) => creator.id))
  const concertIds = new Set(productModule.concerts.map((concert) => concert.id))
  const classIds = new Set(productModule.classes.map((classItem) => classItem.id))
  const columnSlugs = new Set(columnsModule.columns.map((column) => column.slug))

  for (const work of productModule.works) {
    for (const creatorId of work.creators ?? []) {
      assert(creatorIds.has(creatorId), `${work.id} references ${creatorId}`)
    }
    for (const concertId of work.concerts ?? []) {
      assert(concertIds.has(concertId), `${work.id} references ${concertId}`)
    }
    for (const columnSlug of work.columns ?? []) {
      assert(columnSlugs.has(columnSlug), `${work.id} references ${columnSlug}`)
    }
  }

  for (const creator of productModule.creators) {
    for (const workId of creator.works ?? []) {
      assert(workIds.has(workId), `${creator.id} references ${workId}`)
    }
    for (const classId of creator.classes ?? []) {
      assert(classIds.has(classId), `${creator.id} references ${classId}`)
    }
  }
}

try {
  verifyDownloadManifest()
  verifyCompositions()
  verifyProductRelations()
  console.log('Verified site content manifests, Compositions assets, and product relations.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
