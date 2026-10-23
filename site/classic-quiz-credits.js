import { bindTrackedLinks, configureAnalytics } from './analytics.js'
import { initSiteShell } from './site-shell.js'
import { isClearedAudio } from './classic-quiz-audio.js'
import { quizWorks } from './classic-quiz-data.js'

function formatWorkTitle(work) {
  return work.nicknameKo ? `${work.titleKo} '${work.nicknameKo}'` : work.titleKo
}

function createCreditItem(work) {
  const item = document.createElement('article')
  item.className = 'classic-credit-item'

  const title = document.createElement('h2')
  title.textContent = `${work.composerKo} - ${formatWorkTitle(work)}`

  const source = document.createElement('a')
  source.href = work.sourceUrl
  source.target = '_blank'
  source.rel = 'noreferrer'
  source.textContent = work.sourceName

  const license = document.createElement('a')
  license.href = work.licenseUrl || work.sourceUrl
  license.target = '_blank'
  license.rel = 'noreferrer'
  license.textContent = work.license
  const attributionText = work.attributionRequired
    ? `${work.performer}, ${formatFullWork(work)}, ${work.sourceName}, ${work.license}. 앱에서는 ${work.clipStart}초부터 ${work.clipDuration}초 구간을 재생합니다.`
    : `출처 확인용 기록입니다. 앱에서는 ${work.clipStart}초부터 ${work.clipDuration}초 구간을 재생합니다.`

  const detail = document.createElement('dl')
  const rows = [
    ['연주/제작', work.performer],
    ['출처', source],
    ['라이선스', license],
    ['표기 문구', attributionText],
    ['상태', work.verifiedAudioStatus],
    ['검수일', work.rightsVerifiedAt || '확인 필요'],
    ['변경 여부', `${work.clipStart}초부터 ${work.clipDuration}초 구간을 앱에서 재생`],
    ['권리 메모', work.rightsNotes]
  ]

  for (const [label, value] of rows) {
    const term = document.createElement('dt')
    const description = document.createElement('dd')
    term.textContent = label
    if (typeof value === 'string') {
      description.textContent = value
    } else {
      description.append(value)
    }
    detail.append(term, description)
  }

  item.append(title, detail)
  return item
}

function initCredits() {
  initSiteShell()
  bindTrackedLinks()
  configureAnalytics()

  const list = document.querySelector('[data-credit-list]')
  const count = document.querySelector('[data-credit-count]')
  const works = quizWorks.filter(isClearedAudio)

  if (count) {
    count.textContent = `${works.length}곡`
  }
  if (list) {
    list.replaceChildren(...works.map(createCreditItem))
  }
}

initCredits()
