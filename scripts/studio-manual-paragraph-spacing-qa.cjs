// Read-only help layout: measurements run against real computed styles, not jsdom.
module.exports = async function manualParagraphSpacingQa(ctx) {
  const { win, nativeTheme, run, settle, point, key, fs, path, out, assert, results, setStage, text } = ctx
  const cases = []
  await run(() => {
    for (const n of document.querySelectorAll('.studio-manual__article .dd-text, .studio-manual__article li, .studio-manual__article a')) {
      n.dataset.qaBaseFontSize = String(parseFloat(getComputedStyle(n).fontSize))
    }
  })
  for (const theme of ['light', 'dark']) for (const scale of [1, 2]) {
    setStage(`manual-paragraph-${theme}-${scale}`)
    nativeTheme.themeSource = theme
    await run(({ theme, scale }) => {
      document.querySelector('.studio-manual').setAttribute('data-theme', theme)
      document.querySelector('.studio-manual__article').style.fontSize = `${scale * 100}%`
      for (const n of document.querySelectorAll('.studio-manual__article [data-qa-base-font-size]')) {
        n.style.fontSize = `${Number(n.dataset.qaBaseFontSize) * scale}px`
      }
    }, { theme, scale })
    await settle()
    await point('.studio-manual__article p', text)
    // Reveal the paragraph boundary in the existing internal scroll surface.
    await run(text => {
      const a = document.querySelector('.studio-manual__article')
      const p = [...a.querySelectorAll('p')].find(n => n.textContent.trim() === text)
      a.scrollTop += p.getBoundingClientRect().top - a.getBoundingClientRect().top - a.clientHeight / 3
    }, text)
    await settle()
    const measured = await run(text => {
      const a = document.querySelector('.studio-manual__article'), style = getComputedStyle(a)
      const target = [...a.querySelectorAll('p')].find(n => n.textContent.trim() === text)
      const ar = a.getBoundingClientRect(), top = target.getBoundingClientRect().top, previous = target.previousElementSibling
      return {
        boundary: { previousTag: previous.tagName, previousBottom: previous.getBoundingClientRect().bottom, nextTop: top, articleTop: ar.top, articleBottom: ar.bottom },
        token: parseFloat(style.getPropertyValue('--dd-spacing-md')),
        fontSize: style.fontSize, color: style.color,
        horizontalOverflow: a.scrollWidth > a.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
        scroll: a.scrollTop,
        pairs: [...a.querySelectorAll('p + p')].map(p => {
          const previous = p.previousElementSibling, r = p.getBoundingClientRect(), before = previous.getBoundingClientRect()
          return { previous: previous.textContent.slice(0, 100), next: p.textContent.slice(0, 100), gap: r.top - before.bottom, margin: getComputedStyle(p).marginBlockStart, fontSize: parseFloat(getComputedStyle(p).fontSize), baseFontSize: Number(p.dataset.qaBaseFontSize) }
        })
      }
    }, text)
    cases.push({ theme, scale, ...measured })
    fs.writeFileSync(path.join(out, 'paragraph-spacing.json'), JSON.stringify(cases, null, 2) + '\n')
    fs.writeFileSync(path.join(out, `paragraph-${theme}-${scale}.png`), (await win.webContents.capturePage()).toPNG())
    assert(measured.boundary.previousTag === 'P' && measured.boundary.previousBottom >= measured.boundary.articleTop + 8 && measured.boundary.nextTop <= measured.boundary.articleBottom - 8, 'Captured authored paragraph boundary is inside the actual article viewport')
    assert(measured.pairs.every(pair => Math.abs(pair.fontSize - pair.baseFontSize * scale) < .1), 'Every measured Text paragraph is actually enlarged at 200%')
    assert(measured.pairs.length > 0, 'Real authored adjacent paragraphs must be covered')
    assert(Number.isFinite(measured.token) && measured.token > 0, 'Use the current spacing token')
    assert(!measured.horizontalOverflow, 'No manual or document horizontal overflow')
    assert(measured.pairs.every(pair => pair.gap >= measured.token - .25), 'Authored paragraphs have at least the existing md token gap')
    // Search navigation focused the article. Native PageUp must still scroll it.
    assert(await run(() => document.activeElement === document.querySelector('.studio-manual__article')), 'Article retains actual keyboard ownership')
    await key('PageUp'); await settle()
    await run(() => new Promise(resolve => setTimeout(resolve, 250)))
    const after = await run(() => document.querySelector('.studio-manual__article').scrollTop)
    assert(after < measured.scroll, 'Native PageUp scrolls the manual article')
  }
  results.actions.push({ stage: 'manual-paragraph-spacing', cases, scope: 'Scoped manual themes and article text enlargement; no whole-app200, physical keyboard, IME or screenreader approval.' })
}
