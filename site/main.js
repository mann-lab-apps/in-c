import fallbackManifest from './download-manifest.json'
import { detectDesktopPlatform } from './download-platform.js'
import { bindTrackedLinks, configureAnalytics } from './analytics.js'
import { initAuthNavigation } from './auth-nav.js'
import { initGlobalBanner } from './global-banner.js'
import { initSiteShell } from './site-shell.js'
import { initDisabledTooltips } from './tooltip.js'

const manifestUrl = new URL('./download-manifest.json', import.meta.url)

const formatValue = (value, fallback = '릴리즈 대기 중') => value ?? fallback

const createDownloadCard = (download, manifest, detectedPlatform) => {
  const card = document.createElement('article')
  card.className = 'download-card'
  card.dataset.preferred = String(download.id === detectedPlatform)

  const isAvailable = download.available && download.url
  const action = isAvailable
    ? `<a class="button button--primary" data-track-event="download_platform" data-track-platform="${download.id}" data-track-file="${download.fileName}" href="${download.url}">다운로드</a>`
    : '<span class="button button--secondary" aria-disabled="true">후속 공개</span>'
  const status = isAvailable ? '다운로드 가능' : 'V1 후속'

  card.innerHTML = `
    <div class="download-card__head">
      <h3>${download.label}</h3>
      <span>${status}</span>
    </div>
    <dl>
      <div><dt>버전</dt><dd>${manifest.version}</dd></div>
      <div><dt>형식</dt><dd>${download.format}</dd></div>
      <div><dt>아키텍처</dt><dd>${download.architecture}</dd></div>
      <div><dt>파일</dt><dd>${download.fileName}</dd></div>
      <div><dt>크기</dt><dd>${formatValue(download.size)}</dd></div>
      <div><dt>서명</dt><dd>${manifest.signing?.[download.platform] ?? '확인 필요'}</dd></div>
    </dl>
    ${action}
  `

  return card
}

const renderDownloads = (manifest) => {
  const detectedPlatform = detectDesktopPlatform(navigator)
  const downloads = document.querySelector('[data-downloads]')
  const primaryDownload = document.querySelector('[data-primary-download]')
  const alternateDownload = document.querySelector('[data-alternate-download]')
  const releaseState = document.querySelector('[data-release-state]')
  const releaseVersion = document.querySelector('[data-release-version]')
  const releaseDate = document.querySelector('[data-release-date]')
  const checksumLink = document.querySelector('[data-checksums]')
  const releaseNotes = document.querySelector('[data-release-notes]')

  if (!downloads) {
    return
  }

  downloads.replaceChildren(
    ...manifest.downloads.map((download) =>
      createDownloadCard(download, manifest, detectedPlatform)
    )
  )

  const availableDownloads = manifest.downloads.filter((download) => download.available && download.url)
  const preferred = availableDownloads.find((download) => download.id === detectedPlatform)

  if (alternateDownload) alternateDownload.hidden = !preferred

  if (primaryDownload) {
    if (preferred) {
      primaryDownload.href = preferred.url
      primaryDownload.textContent = `${preferred.label} 다운로드`
      primaryDownload.dataset.trackEvent = 'download_primary'
      primaryDownload.dataset.trackPlatform = preferred.id
      primaryDownload.dataset.trackFile = preferred.fileName
      primaryDownload.dataset.trackLocation = 'hero'
    } else {
      primaryDownload.href = '#download'
      primaryDownload.textContent = availableDownloads.length ? '운영체제별 다운로드' : '릴리즈 대기'
      delete primaryDownload.dataset.trackEvent
      delete primaryDownload.dataset.trackPlatform
      delete primaryDownload.dataset.trackFile
      delete primaryDownload.dataset.trackLocation
      delete primaryDownload.dataset.trackLocation
    }
  }

  if (releaseState) {
    releaseState.textContent = manifest.releasePublished
      ? '프리릴리즈 다운로드 가능'
      : '릴리즈 대기 중'
  }

  if (releaseVersion) {
    releaseVersion.textContent = manifest.releaseTag
  }

  if (releaseDate) {
    releaseDate.textContent = formatValue(manifest.releaseDate)
  }

  if (checksumLink) {
    checksumLink.href = manifest.checksumsUrl
  }

  if (releaseNotes) {
    releaseNotes.href = manifest.releaseUrl
  }
}

const shouldShowGlobalBanner = () =>
  !document.body.classList.contains('opentutorials-home') &&
  !document.body.classList.contains('columns-page')

const init = async () => {
  initSiteShell()
  if (shouldShowGlobalBanner()) {
    initGlobalBanner()
  }
  bindTrackedLinks()
  configureAnalytics()
  initAuthNavigation()
  initDisabledTooltips()

  try {
    const response = await fetch(manifestUrl)
    if (!response.ok) {
      throw new Error(`Manifest request failed: ${response.status}`)
    }
    renderDownloads(await response.json())
  } catch {
    renderDownloads(fallbackManifest)
  }
}

init()
