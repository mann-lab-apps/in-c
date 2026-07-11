import { bindTrackedLinks, configureAnalytics } from './analytics.js'

const manifestUrl = new URL('./download-manifest.json', import.meta.url)

const platformMatchers = [
  { id: 'macos', patterns: ['Mac', 'iPhone', 'iPad'] },
  { id: 'windows', patterns: ['Windows', 'Win32', 'Win64'] },
  { id: 'linux', patterns: ['Linux', 'X11'] }
]

const fallbackManifest = {
  version: '0.1.0-alpha.4',
  releaseTag: 'v0.1.0-alpha.4',
  releasePublished: true,
  releaseUrl: 'https://github.com/mann-lab-apps/in-c/releases/tag/v0.1.0-alpha.4',
  checksumsUrl: 'https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.4/SHA256SUMS.txt',
  downloads: [
    {
      id: 'macos',
      platform: 'macOS',
      label: 'macOS',
      architecture: 'Universal',
      format: 'DMG',
      available: true,
      fileName: 'in-C-0.1.0-alpha.4-mac-universal.dmg',
      size: '224.9 MB',
      url: 'https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.4/in-C-0.1.0-alpha.4-mac-universal.dmg'
    },
    {
      id: 'windows',
      platform: 'Windows',
      label: 'Windows',
      architecture: 'x64',
      format: 'NSIS installer',
      available: true,
      fileName: 'in-C-0.1.0-alpha.4-windows-x64-setup.exe',
      size: '111.0 MB',
      url: 'https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.4/in-C-0.1.0-alpha.4-windows-x64-setup.exe'
    },
    {
      id: 'linux',
      platform: 'Linux',
      label: 'Linux',
      architecture: 'x86_64',
      format: 'AppImage',
      available: true,
      fileName: 'in-C-0.1.0-alpha.4-linux-x86_64.AppImage',
      size: '138.1 MB',
      url: 'https://github.com/mann-lab-apps/in-c/releases/download/v0.1.0-alpha.4/in-C-0.1.0-alpha.4-linux-x86_64.AppImage'
    }
  ]
}

const formatValue = (value, fallback = '릴리즈 대기 중') => value ?? fallback

const detectPlatform = () => {
  const platformText = [
    navigator.platform,
    navigator.userAgent,
    navigator.userAgentData?.platform
  ]
    .filter(Boolean)
    .join(' ')

  return (
    platformMatchers.find(({ patterns }) =>
      patterns.some((pattern) => platformText.includes(pattern))
    )?.id ?? 'macos'
  )
}

const createDownloadCard = (download, manifest, detectedPlatform) => {
  const card = document.createElement('article')
  card.className = 'download-card'
  card.dataset.preferred = String(download.id === detectedPlatform)

  const isAvailable = download.available && download.url
  const action = isAvailable
    ? `<a class="button button--primary" data-track-event="download_platform" data-track-platform="${download.id}" data-track-file="${download.fileName}" href="${download.url}">다운로드</a>`
    : `<a class="button button--secondary" data-track-event="release_link" data-track-location="download_card" href="${manifest.releaseUrl}">릴리즈 확인</a>`
  const status = isAvailable ? '다운로드 가능' : '아직 게시 전'

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
  const detectedPlatform = detectPlatform()
  const downloads = document.querySelector('[data-downloads]')
  const primaryDownload = document.querySelector('[data-primary-download]')
  const releaseState = document.querySelector('[data-release-state]')
  const releaseVersion = document.querySelector('[data-release-version]')
  const releaseDate = document.querySelector('[data-release-date]')
  const checksumLink = document.querySelector('[data-checksums]')

  if (!downloads) {
    return
  }

  downloads.replaceChildren(
    ...manifest.downloads.map((download) =>
      createDownloadCard(download, manifest, detectedPlatform)
    )
  )

  const preferred =
    manifest.downloads.find(
      (download) => download.id === detectedPlatform && download.available
    ) ?? manifest.downloads.find((download) => download.available)

  if (primaryDownload) {
    primaryDownload.href = preferred?.url ?? manifest.releaseUrl
    primaryDownload.textContent = preferred
      ? `${preferred.label} 다운로드`
      : 'GitHub Releases 확인'
    primaryDownload.dataset.trackEvent = preferred
      ? 'download_primary'
      : 'release_link'
    primaryDownload.dataset.trackPlatform = preferred?.id ?? ''
    primaryDownload.dataset.trackFile = preferred?.fileName ?? ''
    primaryDownload.dataset.trackLocation = 'hero'
  }

  if (releaseState) {
    releaseState.textContent = manifest.releasePublished
      ? '다운로드 가능'
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
}

const init = async () => {
  bindTrackedLinks()
  configureAnalytics()

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
