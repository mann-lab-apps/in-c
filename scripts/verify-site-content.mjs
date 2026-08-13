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
const pilotFormScriptPath = resolve(siteRoot, 'pilot-form.js')
const pilotConcertsPath = resolve(repoRoot, 'data/promotion/pilot-concerts.json')
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

  for (const phrase of [
    '공연 홍보 파일럿 신청',
    'data-pilot-form',
    'name="applicantName"',
    'name="contactPhone"',
    'name="contactEmail"',
    'name="contactInstagram"',
    'name="concertTitle"',
    'name="concertDate"',
    'type="date"',
    'name="concertTime"',
    'type="time"',
    'name="venue"',
    'name="region"',
    'name="posterStatus"',
    'name="posterFile"',
    'value="needsDesign"',
    '추가 요청사항/비고',
    'data-pilot-result'
  ]) {
    assert(indexPage.includes(phrase), `pilot intake page missing: ${phrase}`)
  }

  assert(
    !indexPage.includes('name="promotionBudget"') &&
      !indexPage.includes('가장 오면 좋겠는 관객') &&
      !indexPage.includes('지금 가장 어려운 홍보 문제') &&
      !indexPage.includes('value="textOnly"') &&
      !indexPage.includes('name="concertDateTime"') &&
      !indexPage.includes('name="contact"'),
    'pilot intake page must keep abstract audience/budget questions out of the first form'
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
    pilotFormScript.includes('formatSubmission') &&
      pilotFormScript.includes('formatConcertDateTime') &&
      pilotFormScript.includes('validateContact') &&
      pilotFormScript.includes('syncPosterUpload') &&
      pilotFormScript.includes('navigator.clipboard.writeText') &&
      pilotFormScript.includes('URL.createObjectURL') &&
      pilotFormScript.includes('promotion_pilot_form_submit'),
    'pilot form script must generate copyable/downloadable submission drafts'
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
  verifyLoginAuthSurface()
  verifyFeatureMapPaths(featureMap, repoRoot)
  console.log(
    'Verified site content manifests, Compositions assets, product relations, and feature map paths.'
  )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
