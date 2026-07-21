import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const repoRoot = resolve(import.meta.dirname, '..')
const siteRoot = resolve(repoRoot, 'site')
const outSiteRoot = resolve(repoRoot, 'out/site')

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const siteManifestPath = resolve(siteRoot, 'download-manifest.json')
const builtManifestPath = resolve(outSiteRoot, 'download-manifest.json')
const siteMainPath = resolve(siteRoot, 'main.js')
const catalogPath = resolve(siteRoot, 'compositions-catalog.json')
const publicRoot = resolve(siteRoot, 'public')
const loadDataModule = async (path) => {
  const source = readFileSync(path, 'utf8')
  const encoded = Buffer.from(source).toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}
const columnsModule = await loadDataModule(resolve(siteRoot, 'columns-data.js'))
const productModule = await loadDataModule(resolve(siteRoot, 'product-data.js'))
const featureMapContext = { window: {} }
runInNewContext(
  readFileSync(resolve(repoRoot, 'docs/product/feature-map-data.js'), 'utf8'),
  featureMapContext
)
const featureMap = featureMapContext.window.FEATURE_MAP
const relationshipModelPath = resolve(
  repoRoot,
  'docs/product/relationship-model.md'
)

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
  // ATDD: distribution-download.platform-files
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

  const requiredPlatforms = new Set(['macOS', 'Windows', 'Linux'])

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
    requiredPlatforms.delete(download.platform)
  }

  assert(
    requiredPlatforms.size === 0,
    `download manifest missing platform(s): ${[...requiredPlatforms].join(', ')}`
  )

  // ATDD: distribution-download.prerelease-signing-notice
  const siteMain = readFileSync(siteMainPath, 'utf8')
  assert(
    /(?:alpha|beta|rc)/i.test(source.version),
    'download manifest version must identify the current prerelease'
  )
  assert(
    siteMain.includes('releaseVersion.textContent = manifest.releaseTag'),
    'download page must render the prerelease release tag'
  )
  assert(
    siteMain.includes('manifest.signing?.[download.platform]'),
    'download page must render the signing notice for each platform'
  )
  for (const platform of ['macOS', 'Windows']) {
    assert(
      source.signing?.[platform]?.includes('미서명'),
      `download manifest must show the unsigned ${platform} notice`
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
    // ATDD: product-surfaces.open-in-chromatics
    assert(
      composition.assets.musicxml === composition.assets.chromatics,
      `${composition.slug} Chromatics asset should use the MusicXML source`
    )
    assert(
      existsSync(publicAssetPath(composition.assets.musicxml)),
      `${composition.slug} MusicXML file is missing`
    )
    assert(
      existsSync(
        publicAssetPath(composition.assets.musicxml.replace(/\.musicxml$/, '.pdf'))
      ),
      `${composition.slug} PDF sidecar file is missing`
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

  // ATDD: product-surfaces.work-context
  assert(
    productModule.works.some(
      (work) => (work.scores?.length ?? 0) > 0 && (work.columns?.length ?? 0) > 0
    ),
    'at least one work must connect a score and Columns'
  )

  for (const creator of productModule.creators) {
    for (const workId of creator.works ?? []) {
      assert(workIds.has(workId), `${creator.id} references ${workId}`)
    }
    for (const classId of creator.classes ?? []) {
      assert(classIds.has(classId), `${creator.id} references ${classId}`)
    }
  }
}

function verifyProductSurfaceStates() {
  const featureItems = featureMap.flatMap((group) =>
    group.sections.flatMap((section) => section.items)
  )
  const findItem = (name) => featureItems.find((item) => item.name === name)
  const relationshipModel = readFileSync(relationshipModelPath, 'utf8')

  // ATDD: product-surfaces.promotion-state
  const promotion = findItem('공연 배너 슬롯')
  assert(promotion, 'feature map missing promotion banner slot')
  assert(promotion.status !== '지원', 'promotion banner must not be supported')
  assert(
    promotion.docs?.includes('docs/product/relationship-model.md'),
    'promotion banner must link to the relationship model'
  )
  for (const phrase of ['공연 배너', '감상', '관련 인물']) {
    assert(
      relationshipModel.includes(phrase),
      `relationship model missing promotion guidance: ${phrase}`
    )
  }

  // ATDD: product-surfaces.community-state
  const community = findItem('Community 최소 대화·학습 흐름')
  assert(community, 'feature map missing Community flow')
  assert(community.status !== '지원', 'Community must not be supported')
  assert(
    community.docs?.includes('docs/product/relationship-model.md'),
    'Community must link to the relationship model'
  )
  for (const phrase of ['독립 공개 프로필', '비공개 연락처', '신청이나 결제']) {
    assert(
      relationshipModel.includes(phrase),
      `relationship model missing Community boundary: ${phrase}`
    )
  }
}

try {
  verifyDownloadManifest()
  verifyCompositions()
  verifyProductRelations()
  verifyProductSurfaceStates()
  console.log('Verified site content manifests, Compositions assets, and product relations.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
