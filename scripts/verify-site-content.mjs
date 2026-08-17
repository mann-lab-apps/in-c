import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

import { verifyFeatureMapPaths } from './verify-feature-map-paths.mjs'

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
const communityPagePath = resolve(siteRoot, 'community.html')
const communityScriptPath = resolve(siteRoot, 'community.js')
const communityPostPagePath = resolve(siteRoot, 'community-post.html')
const communityPostScriptPath = resolve(siteRoot, 'community-post.js')
const communityWritePagePath = resolve(siteRoot, 'community-write.html')
const communityWriteScriptPath = resolve(siteRoot, 'community-write.js')
const communityMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/0002_community_board_schema.sql'
)
const indexPagePath = resolve(siteRoot, 'index.html')
const privacyPagePath = resolve(siteRoot, 'privacy.html')
const inCClickPrivacyPagePath = resolve(siteRoot, 'in-c-click-privacy.html')
const supportPagePath = resolve(siteRoot, 'support.html')
const pilotFormScriptPath = resolve(siteRoot, 'pilot-form.js')
const utilityAppPagePath = resolve(siteRoot, 'utility-apps.html')
const utilityAppFormScriptPath = resolve(siteRoot, 'utility-app-form.js')
const metronomePagePath = resolve(siteRoot, 'metronome.html')
const metronomeScriptPath = resolve(siteRoot, 'metronome.js')
const pilotConcertsPath = resolve(repoRoot, 'data/promotion/pilot-concerts.json')
const promotionInterestMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/0003_promotion_interest_registrations.sql'
)
const promotionInterestAdminMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/0004_promotion_interest_admin_review.sql'
)
const utilityAppRequestsMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/0005_utility_app_requests.sql'
)
const promotionAdminPagePath = resolve(siteRoot, 'promotion-admin.html')
const promotionAdminScriptPath = resolve(siteRoot, 'promotion-admin.js')
const themeLabPagePath = resolve(siteRoot, 'theme-lab.html')
const themeLabScriptPath = resolve(siteRoot, 'theme-lab.js')
const promotionInterestNotificationFunctionPath = resolve(
  repoRoot,
  'supabase/functions/notify-promotion-interest/index.ts'
)
const promotionInterestNotificationDocPath = resolve(
  repoRoot,
  'docs/product/promotion/interest-notification.md'
)
const loginPagePath = resolve(siteRoot, 'login.html')
const loginScriptPath = resolve(siteRoot, 'login.js')
const authRedirectScriptPath = resolve(siteRoot, 'auth-redirect.js')
const authScriptPath = resolve(siteRoot, 'auth.js')
const authNavScriptPath = resolve(siteRoot, 'auth-nav.js')
const compositionDifficulties = new Set(['초급', '중급', '고급'])
const compositionTags = new Set([
  'american-folk-song',
  'beethoven',
  'beginner',
  'children-song',
  'classical',
  'english-ballad',
  'english-melody',
  'french-melody',
  'hymn',
  'japanese-folk-song',
  'korean-folk-song',
  'public-domain',
  'round',
  'shaker-song',
  'single-voice',
  'traditional',
  'welsh-folk-song'
])

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
    assert(
      compositionDifficulties.has(composition.difficulty),
      `${composition.slug} has unsupported difficulty: ${composition.difficulty}`
    )
    assert(
      Array.isArray(composition.tags) && composition.tags.length > 0,
      `${composition.slug} must have tags`
    )
    assert(
      new Set(composition.tags).size === composition.tags.length,
      `${composition.slug} has duplicate tags`
    )
    for (const tag of composition.tags) {
      assert(tag.length > 0, `${composition.slug} has an empty tag`)
      assert(
        compositionTags.has(tag),
        `${composition.slug} has unsupported tag: ${tag}`
      )
    }
    for (const requiredTag of ['public-domain', 'single-voice']) {
      assert(
        composition.tags.includes(requiredTag),
        `${composition.slug} missing required tag: ${requiredTag}`
      )
    }
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

function verifyColumnAssets() {
  const imagePattern = /!\[[^\]]*]\((?<src>[^)\s]+)(?:\s+"[^"]*")?\)/g

  for (const column of columnsModule.columns) {
    for (const match of column.body.matchAll(imagePattern)) {
      const src = match.groups?.src

      if (
        !src ||
        /^(?:https?:)?\/\//.test(src) ||
        src.startsWith('/') ||
        src.startsWith('.')
      ) {
        continue
      }

      assert(
        existsSync(resolve(publicRoot, src)),
        `${column.slug} references missing public column asset: ${src}`
      )
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
  const community = findItem('Community 게시판 CRUD')
  assert(community, 'feature map missing Community flow')
  assert(community.status !== '지원', 'Community must not be supported')
  assert(
    community.docs?.includes('docs/product/relationship-model.md'),
    'Community must link to the relationship model'
  )
  assert(
    community.docs?.includes('docs/product/community/api-server-boundary.md'),
    'Community must link to the API server boundary'
  )
  for (const phrase of ['게시판', 'Supabase Auth', '글쓰기', '작성자 수정/삭제', '댓글']) {
    assert(
      relationshipModel.includes(phrase),
      `relationship model missing Community boundary: ${phrase}`
    )
  }

  const communityPage = readFileSync(communityPagePath, 'utf8')
  const communityScript = readFileSync(communityScriptPath, 'utf8')
  const communityPostPage = readFileSync(communityPostPagePath, 'utf8')
  const communityPostScript = readFileSync(communityPostScriptPath, 'utf8')
  const communityWritePage = readFileSync(communityWritePagePath, 'utf8')
  const communityWriteScript = readFileSync(communityWriteScriptPath, 'utf8')
  const communityMigration = readFileSync(communityMigrationPath, 'utf8')

  assert(
    communityPage.includes('data-community-posts') &&
      communityPage.includes('data-community-write-action') &&
      !communityPage.includes('data-community-detail'),
    'Community page must be list-only with a write entry'
  )
  assert(
    communityPostPage.includes('data-community-post-detail') &&
      communityPostPage.includes('data-community-post-detail-body') &&
      communityScript.includes('community-post.html?post='),
    'Community post page missing detail surface or post URL contract'
  )
  assert(
    communityWritePage.includes('data-community-post-form') &&
      communityWriteScript.includes('.insert(payload)') &&
      communityWriteScript.includes('.update(payload)') &&
      communityWriteScript.includes('community-post.html?post='),
    'Community write page must support post create and update'
  )
  for (const phrase of [
    "from('community_posts')",
    '.delete()',
    'data-community-post-delete',
    'data-community-comment-form',
    "from('community_comments')",
    'data-community-comment-edit',
    'data-community-comment-delete',
    'community_comment_create',
    'community_comment_update',
    'community_comment_delete'
  ]) {
    assert(
      communityPostScript.includes(phrase),
      `Community post script missing CRUD hook: ${phrase}`
    )
  }
  for (const phrase of [
    'owners can update own community posts',
    'owners can delete own community posts',
    'owners can update own community comments',
    'owners can delete own community comments'
  ]) {
    assert(
      communityMigration.includes(phrase),
      `Community migration missing RLS policy: ${phrase}`
    )
  }
}

function verifyPilotIntakeSurface() {
  const indexPage = readFileSync(indexPagePath, 'utf8')
  const pilotFormScript = readFileSync(pilotFormScriptPath, 'utf8')
  const pilotConcerts = readJson(pilotConcertsPath)
  const promotionInterestMigration = readFileSync(promotionInterestMigrationPath, 'utf8')

  for (const phrase of [
    '클래식 연주회 홍보 관심 등록',
    'inc-sketch-theme',
    'inc-sketch-hero',
    'inc-sketch-surface',
    'inc-sketch-button',
    'data-pilot-form',
    'name="applicantName"',
    'name="role"',
    'name="contactPhone"',
    'name="contactEmail"',
    'name="contactInstagram"',
    'name="upcomingRecital"',
    'name="helpNeeded"',
    'name="notes"',
    'name="privacyAcknowledgement"',
    '관심 등록하기',
    'data-pilot-status'
  ]) {
    assert(indexPage.includes(phrase), `pilot intake page missing: ${phrase}`)
  }

  assert(
    !indexPage.includes('name="promotionBudget"') &&
      !indexPage.includes('name="concertTitle"') &&
      !indexPage.includes('name="concertDate"') &&
      !indexPage.includes('name="concertTime"') &&
      !indexPage.includes('name="venue"') &&
      !indexPage.includes('name="region"') &&
      !indexPage.includes('name="ticketUrl"') &&
      !indexPage.includes('name="posterStatus"') &&
      !indexPage.includes('name="posterFile"') &&
      !indexPage.includes('가장 오면 좋겠는 관객') &&
      !indexPage.includes('지금 가장 어려운 홍보 문제') &&
      !indexPage.includes('value="textOnly"') &&
      !indexPage.includes('name="concertDateTime"') &&
      !indexPage.includes('name="contact"') &&
      !indexPage.includes('Concert Promotion Pilot') &&
      !indexPage.includes('무료 파일럿') &&
      !indexPage.includes('data-pilot-result') &&
      !indexPage.includes('신청서 초안') &&
      !indexPage.includes('텍스트 저장') &&
      !indexPage.includes('공연 홍보 신청') &&
      !indexPage.includes('공연 정보 입력') &&
      !indexPage.includes('공연명') &&
      !indexPage.includes('공연 날짜') &&
      !indexPage.includes('공연 시간') &&
      !indexPage.includes('공연 장소') &&
      !indexPage.includes('클래식 연주회 홍보 신청') &&
      !indexPage.includes('연주회 정보 입력') &&
      !indexPage.includes('Working Note') &&
      !indexPage.includes('pilot-intro__board') &&
      !indexPage.includes('메일 앱'),
    'interest registration page must avoid detailed recital intake fields, old campaign copy, and decorative sketch boards'
  )
  for (const phrase of [
    '서울시향',
    '0번 샘플',
    'data-sample-concert',
    'data-fill-sample',
    'sample-concert'
  ]) {
    assert(
      !indexPage.includes(phrase) && !pilotFormScript.includes(phrase),
      `pilot sample data must remain internal-only, but public site includes: ${phrase}`
    )
  }
  assert(
    !existsSync(resolve(siteRoot, 'pilot-concert-data.js')),
    'pilot concert sample data must not be stored under the public site directory'
  )
  assert(
    pilotFormScript.includes('validateContact') &&
      pilotFormScript.includes("from('promotion_interest_registrations')") &&
      pilotFormScript.includes('.insert(payload)') &&
      pilotFormScript.includes('promotion_interest_submit') &&
      pilotFormScript.includes('isSupabaseConfigured') &&
      !pilotFormScript.includes('navigator.clipboard.writeText') &&
      !pilotFormScript.includes('URL.createObjectURL') &&
      !pilotFormScript.includes('syncPosterUpload') &&
      !pilotFormScript.includes('mailto:'),
    'interest registration script must validate inputs and submit to Supabase without mailto'
  )
  for (const phrase of [
    'create table if not exists public.promotion_interest_registrations',
    'alter table public.promotion_interest_registrations enable row level security',
    'grant insert on public.promotion_interest_registrations to anon, authenticated',
    'for insert',
    'contact_phone',
    'contact_email',
    'contact_instagram'
  ]) {
    assert(
      promotionInterestMigration.includes(phrase),
      `promotion interest migration missing: ${phrase}`
    )
  }
  assert(
    !promotionInterestMigration.includes('grant select on public.promotion_interest_registrations'),
    'promotion interest migration must not grant public select access'
  )
  assert(
    pilotConcerts.concerts.some(
      (concert) =>
        concert.id === 'spo-beethoven-choral-2026-08-16' &&
        concert.visibility === 'internal_only' &&
        concert.title.includes('서울시향') &&
        concert.date === '2026-08-16' &&
        concert.venue === '세종문화회관 대극장'
    ),
    'internal pilot concert JSON must preserve the 0th sample concert'
  )
}

function verifyUtilityAppRequestSurface() {
  const indexPage = readFileSync(indexPagePath, 'utf8')
  const utilityAppPage = readFileSync(utilityAppPagePath, 'utf8')
  const utilityAppFormScript = readFileSync(utilityAppFormScriptPath, 'utf8')
  const utilityAppRequestsMigration = readFileSync(utilityAppRequestsMigrationPath, 'utf8')
  const privacyPage = readFileSync(privacyPagePath, 'utf8')
  const viteConfig = readFileSync(resolve(siteRoot, 'vite.config.ts'), 'utf8')
  const analyticsScript = readFileSync(resolve(siteRoot, 'analytics.js'), 'utf8')

  assert(
    indexPage.includes('./utility-apps.html') &&
      utilityAppPage.includes('./index.html') &&
      utilityAppPage.includes('./metronome.html') &&
      viteConfig.includes('utilityApps') &&
      viteConfig.includes('utility-apps.html'),
    'promotion and utility app landing pages must be public but cross-linked as separate experiments'
  )

  for (const phrase of [
    '무료 음악 도구 제안',
    '음악가를 위한 작은 도구를 무료로 만들어봅니다',
    '앱 제작 대행이 아니라, 공개 도구 실험입니다',
    'data-utility-app-form',
    'name="applicantName"',
    'name="role"',
    'name="contactPhone"',
    'name="contactEmail"',
    'name="contactInstagram"',
    'name="activityContext"',
    'name="problemFrequency"',
    'name="problemDescription"',
    'name="currentWorkaround"',
    'name="desiredTool"',
    'name="expectedUsers"',
    'name="publicToolAcknowledgement"',
    'name="privacyAcknowledgement"',
    '도구 제안하기',
    './utility-app-form.js'
  ]) {
    assert(utilityAppPage.includes(phrase), `utility app request page missing: ${phrase}`)
  }

  for (const phrase of [
    'validateContact',
    "from('utility_app_requests')",
    '.insert(payload)',
    'utility_app_request_submit',
    'isSupabaseConfigured',
    '!supabase',
    'window.location.search'
  ]) {
    assert(
      utilityAppFormScript.includes(phrase),
      `utility app request script missing: ${phrase}`
    )
  }

  for (const phrase of [
    'create table if not exists public.utility_app_requests',
    'alter table public.utility_app_requests enable row level security',
    'grant insert on public.utility_app_requests to anon, authenticated',
    'for insert',
    'activity_context',
    'problem_frequency',
    'problem_description',
    'expected_users',
    'admins can read utility app requests'
  ]) {
    assert(
      utilityAppRequestsMigration.includes(phrase),
      `utility app request migration missing: ${phrase}`
    )
  }

  for (const phrase of ['무료 음악 도구 제안 폼', '공개 웹도구 선정 검토']) {
    assert(privacyPage.includes(phrase), `privacy notice missing utility app copy: ${phrase}`)
  }

  for (const phrase of ['activity_context', 'frequency']) {
    assert(analyticsScript.includes(phrase), `analytics allowlist missing: ${phrase}`)
  }
}

function verifyMetronomeSurface() {
  const metronomePage = readFileSync(metronomePagePath, 'utf8')
  const metronomeScript = readFileSync(metronomeScriptPath, 'utf8')
  const utilityAppPage = readFileSync(utilityAppPagePath, 'utf8')
  const viteConfig = readFileSync(resolve(siteRoot, 'vite.config.ts'), 'utf8')
  const sitemap = readFileSync(resolve(siteRoot, 'public/sitemap.xml'), 'utf8')
  const analyticsScript = readFileSync(resolve(siteRoot, 'analytics.js'), 'utf8')

  assert(
    viteConfig.includes('metronome') &&
      viteConfig.includes('metronome.html') &&
      sitemap.includes('https://in-c.mannlab.app/metronome.html') &&
      utilityAppPage.includes('무료 메트로놈 열기'),
    'metronome page must be built, indexed, and linked from the utility app landing'
  )

  for (const phrase of [
    'in C Click',
    '무료 메트로놈',
    '연습을 바로 시작하세요',
    'data-bpm-output',
    'data-bpm-input',
    'data-bpm-slider',
    'data-start-stop',
    'data-tap-tempo',
    'name="meter"',
    'value="2"',
    'value="3"',
    'value="4"',
    'value="6"',
    'data-accent-toggle',
    'data-pulse',
    'data-beat-label',
    'Space 시작/정지',
    './metronome.js',
    './utility-apps.html'
  ]) {
    assert(metronomePage.includes(phrase), `metronome page missing: ${phrase}`)
  }

  for (const phrase of [
    'AudioContext',
    'scheduleAheadSeconds',
    'lookaheadMs',
    'localStorage',
    'in-c-click-preferences',
    'metronome_start',
    'metronome_tap_tempo',
    'ArrowUp',
    'ArrowDown',
    'Space',
    'tapTempo'
  ]) {
    assert(metronomeScript.includes(phrase), `metronome script missing: ${phrase}`)
  }

  for (const forbidden of [
    'navigator.mediaDevices',
    'getUserMedia',
    "from('",
    'supabase',
    '정확도 최고',
    '프로용',
    '완벽한 리듬 엔진'
  ]) {
    assert(
      !metronomePage.includes(forbidden) && !metronomeScript.includes(forbidden),
      `metronome MVP must avoid excluded scope/copy: ${forbidden}`
    )
  }

  assert(analyticsScript.includes('meter'), 'analytics allowlist missing metronome meter param')
}

function verifyPrivacyNoticeSurface() {
  const privacyPage = readFileSync(privacyPagePath, 'utf8')
  const inCClickPrivacyPage = readFileSync(inCClickPrivacyPagePath, 'utf8')
  const supportPage = readFileSync(supportPagePath, 'utf8')
  const viteConfig = readFileSync(resolve(siteRoot, 'vite.config.ts'), 'utf8')
  const sitemap = readFileSync(resolve(siteRoot, 'public/sitemap.xml'), 'utf8')

  assert(
    privacyPage.includes('in C 개인정보 처리방침') &&
      privacyPage.includes('Google Analytics 사용') &&
      privacyPage.includes('피드백과 문의') &&
      privacyPage.includes('클래식 연주회 홍보 관심 등록') &&
      privacyPage.includes('공개 사이트에서 조회할 수 없고') &&
      privacyPage.includes('in C - Click 모바일 앱') &&
      privacyPage.includes('daga42@naver.com'),
    'privacy notice page must keep core notice content'
  )

  assert(
    viteConfig.includes('inCClickPrivacy') &&
      sitemap.includes('https://in-c.mannlab.app/in-c-click-privacy.html') &&
      viteConfig.includes('support') &&
      sitemap.includes('https://in-c.mannlab.app/support.html'),
    'in C Click privacy policy must be built and indexed'
  )

  for (const phrase of [
    'in C - Click 개인정보 처리방침',
    '앱 내부에서 개인정보를 수집하지 않습니다',
    'BPM, 박자, 첫 박 강조 여부',
    '기능 제안 웹 폼',
    'Supabase',
    'Google Analytics 4',
    'daga42@naver.com'
  ]) {
    assert(
      inCClickPrivacyPage.includes(phrase),
      `in C Click privacy policy missing: ${phrase}`
    )
  }

  for (const phrase of ['in C 지원', '문의와 버그 제보', 'daga42@naver.com']) {
    assert(supportPage.includes(phrase), `support page missing: ${phrase}`)
  }

  assert(
    !privacyPage.includes('class="site-header"') &&
      !privacyPage.includes('./main.js') &&
      !privacyPage.includes('data-global-ad-banner') &&
      !inCClickPrivacyPage.includes('class="site-header"') &&
      !inCClickPrivacyPage.includes('./main.js') &&
      !inCClickPrivacyPage.includes('data-global-ad-banner') &&
      !supportPage.includes('class="site-header"') &&
      !supportPage.includes('./main.js') &&
      !supportPage.includes('data-global-ad-banner'),
    'privacy notice page must not render global navigation or ad banner'
  )
}

function verifyPromotionAdminSurface() {
  const viteConfig = readFileSync(resolve(siteRoot, 'vite.config.ts'), 'utf8')
  const adminPage = readFileSync(promotionAdminPagePath, 'utf8')
  const adminScript = readFileSync(promotionAdminScriptPath, 'utf8')
  const adminMigration = readFileSync(promotionInterestAdminMigrationPath, 'utf8')
  const notificationFunction = readFileSync(
    promotionInterestNotificationFunctionPath,
    'utf8'
  )
  const notificationDoc = readFileSync(promotionInterestNotificationDocPath, 'utf8')

  for (const phrase of [
    'promotionAdmin',
    'promotion-admin.html'
  ]) {
    assert(viteConfig.includes(phrase), `promotion admin Vite input missing: ${phrase}`)
  }

  for (const phrase of [
    '관심 등록 확인',
    'noindex,nofollow',
    'data-admin-status',
    'data-admin-summary',
    'data-admin-table',
    'data-admin-refresh',
    './promotion-admin.js'
  ]) {
    assert(adminPage.includes(phrase), `promotion admin page missing: ${phrase}`)
  }

  for (const phrase of [
    "from('promotion_interest_registrations')",
    '.select(createRegistrationSelect())',
    '.update({',
    'review_status',
    'reviewed_at',
    'reviewer_user_id',
    'createLoginUrlWithRedirect',
    '관리자 권한이 필요합니다'
  ]) {
    assert(adminScript.includes(phrase), `promotion admin script missing: ${phrase}`)
  }

  for (const phrase of [
    'add column if not exists review_status',
    'grant select on public.promotion_interest_registrations to authenticated',
    'grant update (review_status, reviewed_at, reviewer_user_id)',
    'admins can read promotion interest registrations',
    'profiles.role = \'admin\'',
    'profiles.status = \'active\''
  ]) {
    assert(adminMigration.includes(phrase), `promotion admin migration missing: ${phrase}`)
  }
  assert(
    !adminMigration.includes('grant select on public.promotion_interest_registrations to anon'),
    'promotion admin migration must not grant anonymous select access'
  )

  for (const phrase of [
    'daga42@naver.com',
    'daga4242@gmail.com',
    'RESEND_API_KEY',
    'PROMOTION_INTEREST_NOTIFY_FROM',
    'PROMOTION_INTEREST_WEBHOOK_SECRET',
    'x-in-c-webhook-secret',
    'https://api.resend.com/emails',
    'https://in-c.mannlab.app/promotion-admin.html'
  ]) {
    assert(
      notificationFunction.includes(phrase) || notificationDoc.includes(phrase),
      `promotion notification setup missing: ${phrase}`
    )
  }
}

function verifyDesignThemeLab() {
  const viteConfig = readFileSync(resolve(siteRoot, 'vite.config.ts'), 'utf8')
  const themeLabPage = readFileSync(themeLabPagePath, 'utf8')
  const themeLabScript = readFileSync(themeLabScriptPath, 'utf8')
  const styles = readFileSync(resolve(siteRoot, 'styles.css'), 'utf8')

  for (const phrase of ['themeLab', 'theme-lab.html']) {
    assert(viteConfig.includes(phrase), `theme lab Vite input missing: ${phrase}`)
  }

  for (const phrase of [
    '디자인 테마 랩',
    'noindex,nofollow',
    'data-theme-lab',
    'data-theme-nav',
    'data-theme-stack',
    './theme-lab.js'
  ]) {
    assert(themeLabPage.includes(phrase), `theme lab page missing: ${phrase}`)
  }

  for (const phrase of [
    'landingModel',
    'themes',
    'renderThemeDemo',
    'renderInterestForm',
    'renderWorkspaceMock',
    'Excalidraw / Sketch',
    'Mann Lab Games',
    'rough outline',
    'hachure',
    'theme-preview-sketch-board',
    'theme-preview-sketch-shape--diamond',
    'Rehearsal Notebook',
    'Quiet Editorial',
    'Modern Arts Platform',
    'Small SaaS / Utility',
    'Card Catalog / Archive',
    'data-theme-demo'
  ]) {
    assert(themeLabScript.includes(phrase), `theme lab script missing: ${phrase}`)
  }

  for (const themeClass of [
    '.theme-demo--sketch',
    '--sketch-rough-rect',
    '--sketch-hachure-blue',
    '.theme-preview-sketch-board',
    '.theme-demo--notebook',
    '.theme-demo--editorial',
    '.theme-demo--arts',
    '.theme-demo--utility',
    '.theme-demo--archive'
  ]) {
    assert(styles.includes(themeClass), `theme lab CSS missing: ${themeClass}`)
  }
}

function verifyLoginAuthSurface() {
  const loginHtml = readFileSync(loginPagePath, 'utf8')
  const loginScript = readFileSync(loginScriptPath, 'utf8')
  const authRedirectScript = readFileSync(authRedirectScriptPath, 'utf8')
  const authScript = readFileSync(authScriptPath, 'utf8')
  const authNavScript = readFileSync(authNavScriptPath, 'utf8')
  const communityWriteScript = readFileSync(communityWriteScriptPath, 'utf8')
  const communityPostScript = readFileSync(communityPostScriptPath, 'utf8')

  assert(
    loginHtml.includes('data-auth-provider="google"'),
    'login page missing google auth button'
  )
  assert(
    !loginHtml.includes('data-auth-provider="kakao"') &&
      loginHtml.includes('data-auth-pending-provider="kakao"'),
    'Kakao must remain visible as pending without starting OAuth'
  )
  assert(
    !loginHtml.includes('data-auth-provider="naver"'),
    'Naver auth button must remain hidden until Custom OAuth/OIDC is configured'
  )

  assert(
    loginHtml.includes('data-auth-status') &&
      loginHtml.includes('data-auth-session') &&
      loginHtml.includes('data-auth-sign-out'),
    'login page missing auth session controls'
  )
  assert(loginHtml.includes('./login.js'), 'login page must load login.js')
  assert(
    loginScript.includes('signInWithOAuth') &&
      loginScript.includes('redirectTo') &&
      loginScript.includes('getSession') &&
      loginScript.includes('onAuthStateChange') &&
      loginScript.includes('signOut') &&
      loginScript.includes('auth_callback_error') &&
      loginScript.includes('auth_social_pending') &&
      loginScript.includes('redirectSignedInUser'),
    'login script must support OAuth session lifecycle'
  )
  assert(
    loginScript.includes('getRequestedAuthRedirectTarget') &&
      authRedirectScript.includes('redirectTo') &&
      authRedirectScript.includes('sessionStorage') &&
      authRedirectScript.includes('targetUrl.origin !== window.location.origin') &&
      authRedirectScript.includes('isLoginPath'),
    'login redirect flow must preserve safe internal destinations'
  )
  assert(
    communityWriteScript.includes('createLoginUrlWithRedirect') &&
      communityPostScript.includes('createLoginUrlWithRedirect') &&
      communityPostScript.includes('로그인하고 댓글 남기기'),
    'Community auth entry points must preserve their login redirect target'
  )
  assert(
    authScript.includes('@supabase/supabase-js') &&
      authScript.includes('VITE_SUPABASE_URL') &&
      authScript.includes('VITE_SUPABASE_PUBLISHABLE_KEY') &&
      authScript.includes('flowType') &&
      authScript.includes('pkce'),
    'auth script must use Supabase env config and PKCE'
  )
  assert(
    loginScript.includes('initAuthNavigation') &&
      authNavScript.includes('.nav-login-link') &&
      authNavScript.includes('getSession') &&
      authNavScript.includes('onAuthStateChange') &&
      authNavScript.includes('signOut') &&
      authNavScript.includes('로그아웃'),
    'auth navigation must render signed-in header sign out state'
  )
}

try {
  verifyDownloadManifest()
  verifyCompositions()
  verifyColumnAssets()
  verifyProductRelations()
  verifyProductSurfaceStates()
  verifyPilotIntakeSurface()
  verifyUtilityAppRequestSurface()
  verifyMetronomeSurface()
  verifyPrivacyNoticeSurface()
  verifyPromotionAdminSurface()
  verifyDesignThemeLab()
  verifyLoginAuthSurface()
  verifyFeatureMapPaths(featureMap, repoRoot)
  console.log(
    'Verified site content manifests, Compositions assets, product relations, and feature map paths.'
  )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
