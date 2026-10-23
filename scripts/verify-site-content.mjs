import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const siteRoot = resolve(repoRoot, 'site')
const outSiteRoot = resolve(repoRoot, 'out/site')

const read = (path) => readFileSync(path, 'utf8')
const readJson = (path) => JSON.parse(read(path))

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function verifyDownloadManifest() {
  // ATDD: distribution-download.platform-files
  const sourcePath = resolve(siteRoot, 'download-manifest.json')
  const builtPath = resolve(outSiteRoot, 'download-manifest.json')

  assert(existsSync(sourcePath), 'site/download-manifest.json is missing')
  assert(
    existsSync(builtPath),
    'out/site/download-manifest.json is missing; run npm run site:build first'
  )

  const source = readJson(sourcePath)
  const built = readJson(builtPath)
  assert(
    JSON.stringify(source) === JSON.stringify(built),
    'built download-manifest.json must match the source manifest'
  )
  assert(source.version, 'download manifest missing version')
  assert(source.releaseTag, 'download manifest missing releaseTag')
  assert(source.releaseUrl.includes(source.releaseTag), 'releaseUrl must include releaseTag')

  const requiredPlatforms = new Set(['macOS', 'Windows'])
  for (const download of source.downloads ?? []) {
    assert(download.id, 'download entry missing id')
    assert(download.label, `download ${download.id} missing label`)
    assert(download.fileName, `download ${download.id} missing fileName`)

    if (!download.available) {
      continue
    }

    assert(download.url, `available download ${download.id} missing url`)
    assert(download.url.includes(source.releaseTag), `${download.id} URL must include releaseTag`)
    assert(
      basename(download.url) === download.fileName,
      `${download.id} URL basename must match fileName`
    )
    requiredPlatforms.delete(download.platform)
  }

  assert(
    requiredPlatforms.size === 0,
    `download manifest missing platform(s): ${[...requiredPlatforms].join(', ')}`
  )

  // ATDD: distribution-download.prerelease-signing-notice
  assert(/(?:alpha|beta|rc)/i.test(source.version), 'download version must be prerelease')
  for (const platform of ['macOS', 'Windows']) {
    assert(
      source.signing?.[platform]?.includes('미서명'),
      `download manifest must show the unsigned ${platform} notice`
    )
  }
}

function verifyConcertPromotionHome() {
  // ATDD: product-surfaces.promotion-state
  // ATDD: product-surfaces.community-state
  // ATDD: product-surfaces.work-context
  // ATDD: product-surfaces.open-in-chromatics
  const indexPage = read(resolve(siteRoot, 'index.html'))
  const siteShell = read(resolve(siteRoot, 'site-shell.js'))
  const mainScript = read(resolve(siteRoot, 'main.js'))

  for (const phrase of [
    '음악앱 공연 정보 홍보 시스템',
    '음악앱의 배너 공간으로 공연 정보를 전합니다',
    '음악앱의 배너 공간을 활용해',
    '공연·연주회 정보를 푸시하는 홍보 시스템',
    'Clef &amp; Staff',
    '악보를 보는 사람에게 공연 정보를',
    './assets/services/clef-ios23-ipad-home.png',
    'Clef &amp; Staff 악보 라이브러리 화면 캡처',
    'Chromatics',
    '악보를 만드는 사람에게 관련 공연을',
    './assets/app-preview.svg',
    'Chromatics 악보 편집 화면 캡처',
    '공연 정보는 넓게보다 알맞게',
    './assets/posters/one-page-recital.svg',
    '공연·연주회 광고 소재 예시',
    'sponsored 또는 promoted',
    './support.html'
  ]) {
    assert(indexPage.includes(phrase), `concert promotion home missing: ${phrase}`)
  }

  for (const forbidden of [
    'in C Click</h3>',
    'in C Chime</h3>',
    './metronome.html',
    './columns.html',
    '읽을거리',
    '클래식을 처음 듣는 사람',
    '동요 연구소',
    '필요한 음악 도구로 바로 가세요',
    '오늘 저녁, 혜화',
    'Nearby recital',
    '음악 광고',
    'in C Promotion',
    'nav-login-link',
    'community.html',
    'concerts.html'
  ]) {
    assert(!indexPage.includes(forbidden), `concert promotion home must not expose: ${forbidden}`)
  }

  assert(siteShell.includes('index.html#services'), 'site shell must link service section')
  assert(!siteShell.includes('columns.html'), 'site shell must not link Columns')
  assert(!mainScript.includes('initAuthNavigation'), 'main script must not initialize auth nav')
  assert(!mainScript.includes('initGlobalBanner'), 'main script must not initialize ad banner')
}

function verifyPublicIndexScope() {
  const sitemap = read(resolve(siteRoot, 'public/sitemap.xml'))

  for (const indexed of ['index.html', 'support.html', 'privacy.html']) {
    assert(
      sitemap.includes(`https://in-c.mannlab.app/${indexed}`),
      `sitemap missing active page: ${indexed}`
    )
  }

  for (const deferred of [
    'columns.html',
    'nursery-lab.html',
    'chromatics.html',
    'utility-apps.html',
    'metronome.html',
    'classic-quiz.html',
    'classic-quiz-credits.html',
    'in-c-click-privacy.html',
    'community.html',
    'community-post.html',
    'community-write.html',
    'login.html',
    'concerts.html'
  ]) {
    assert(!sitemap.includes(deferred), `sitemap must not index deferred page: ${deferred}`)
    assert(
      read(resolve(siteRoot, deferred)).includes('noindex,nofollow'),
      `${deferred} must be marked noindex`
    )
  }

  for (const columnPage of [
    'columns/choral-symphony-hiphop.html',
    'columns/starting-to-listen-classical.html',
    'columns/genre-appeal.html',
    'columns/repetition-power.html'
  ]) {
    assert(!sitemap.includes(columnPage), `sitemap must not index column: ${columnPage}`)
    assert(
      read(resolve(siteRoot, columnPage)).includes('noindex,nofollow'),
      `${columnPage} must be marked noindex`
    )
  }
}

function verifySupportAndPrivacy() {
  const supportPage = read(resolve(siteRoot, 'support.html'))
  const supportScript = read(resolve(siteRoot, 'support.js'))
  const privacyPage = read(resolve(siteRoot, 'privacy.html'))

  for (const phrase of [
    '공연 홍보 문의',
    'in C 앱의 배너 공간',
    '필요한 내용만 간단히',
    '이름·단체명',
    'data-support-form',
    '문의 접수하기',
    'daga4242@gmail.com'
  ]) {
    assert(supportPage.includes(phrase), `support page missing: ${phrase}`)
  }

  for (const phrase of [
    "from('promotion_interest_registrations')",
    'createInquiryPayload',
    '공연·연주회명',
    '문의가 접수되었습니다',
    'support_inquiry_submit'
  ]) {
    assert(supportScript.includes(phrase), `support script missing: ${phrase}`)
  }

  for (const phrase of [
    '공연·연주회 홍보 문의',
    '공연·연주회 홍보 문의 정보',
    '공연 홍보 대시보드',
    '캠페인 리포트',
    'daga4242@gmail.com'
  ]) {
    assert(privacyPage.includes(phrase), `privacy page missing: ${phrase}`)
  }

  for (const forbidden of ['in C - Click', 'Columns', '무료 음악 도구 제안']) {
    assert(!supportPage.includes(forbidden), `support page must not mention: ${forbidden}`)
    assert(!privacyPage.includes(forbidden), `privacy page must not mention: ${forbidden}`)
  }
}

try {
  verifyDownloadManifest()
  verifyConcertPromotionHome()
  verifyPublicIndexScope()
  verifySupportAndPrivacy()
  console.log('Verified in C concert promotion site content and public scope.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
