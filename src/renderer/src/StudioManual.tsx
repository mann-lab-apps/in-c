import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Dialog, Input, Text } from '@ddirori/ui'
import { manualChapters, manualVersion, resolveManualLink, searchManual, shortcutMarkdown } from './studio-manual'
import practiceXml from '../../../docs/product/studio-manual/examples/manual-practice.musicxml?raw'
import './studio-manual.css'

type Location = { chapterId: string; anchor: string; scroll: number }
export function StudioManual({ theme, onClose }: { theme: 'light' | 'dark'; onClose: () => void }) {
  const [location, setLocation] = useState<Location>({ chapterId: 'start', anchor: '', scroll: 0 })
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState<Location[]>([])
  const root = useRef<HTMLDivElement>(null), article = useRef<HTMLElement>(null)
  const composing = useRef(false), navigation = useRef(false)
  const navigationOrigin = useRef<Element | null>(null)
  const viewportIntent = useRef(0), navigationViewportIntent = useRef(0)
  useEffect(() => {
    const invalidate = () => { viewportIntent.current += 1 }
    const visibility = () => { if (document.visibilityState === 'hidden') invalidate() }
    window.addEventListener('blur', invalidate)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', invalidate)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  const chapter = manualChapters.find(item => item.id === location.chapterId) ?? manualChapters[0]
  const results = searchManual(query)
  const go = (chapterId: string, anchor = '') => {
    navigationOrigin.current = document.activeElement
    navigationViewportIntent.current = viewportIntent.current
    setHistory(previous => [...previous, { ...location, scroll: article.current?.scrollTop ?? 0 }])
    navigation.current = true; setQuery(''); setLocation({ chapterId, anchor, scroll: 0 })
  }
  const back = () => {
    const previous = history.at(-1)
    if (!previous) return
    navigationOrigin.current = document.activeElement
    navigationViewportIntent.current = viewportIntent.current
    navigation.current = true; setQuery(''); setHistory(history.slice(0, -1)); setLocation(previous)
  }
  useEffect(() => {
    if (!navigation.current) return
    navigation.current = false
    const origin = navigationOrigin.current
    const intent = navigationViewportIntent.current
    const frame = requestAnimationFrame(() => {
      if (intent !== viewportIntent.current) return
      const active = document.activeElement
      if (active !== origin && active !== document.body && active !== article.current) return
      const target = location.anchor ? article.current?.querySelector<HTMLElement>(`[data-manual-anchor="${location.anchor.replace(/[^a-z0-9-]/g, '')}"]`) : undefined
      article.current?.focus({ preventScroll: true })
      if (target) target.scrollIntoView?.({ block: 'start' })
      else if (article.current) article.current.scrollTop = location.scroll
    })
    return () => cancelAnimationFrame(frame)
  }, [location])
  const link = (href: string, label: ReactNode): ReactNode => {
    const target = resolveManualLink(href, chapter.id)
    if (target) return <a href={`#manual-${target.chapterId}-${target.anchor}`} onClick={event => { event.preventDefault(); go(target.chapterId, target.anchor) }}>{label}</a>
    if (href === 'examples/manual-practice.musicxml') return <a download="studio-manual-practice.musicxml"
      href={`data:application/vnd.recordare.musicxml+xml;charset=utf-8,${encodeURIComponent(practiceXml)}`}>{label}</a>
    if (/^https:\/\//.test(href)) return <a href={href} target="_blank" rel="noreferrer">{label}</a>
    return <span>{label}</span>
  }
  return <div ref={root} className="studio-manual ddirori" data-theme={theme} data-density="compact"
    onWheelCapture={event => { if (event.deltaX || event.deltaY) viewportIntent.current += 1 }}
    onTouchMoveCapture={() => { viewportIntent.current += 1 }}
    onPointerDownCapture={() => { viewportIntent.current += 1 }}
    onCompositionStartCapture={() => { composing.current = true }} onCompositionEndCapture={() => { composing.current = false }}
    onKeyDownCapture={event => {
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        if (event.key === 'Escape') event.preventDefault()
        event.stopPropagation()
        return
      }
      if (['PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) viewportIntent.current += 1
    }}
    onKeyDown={event => {
      // Native controls retain Enter/Space/Tab; no help key reaches score/playback/save.
      event.stopPropagation()
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
    }}>
    <Dialog open title="띠로리 Studio 사용설명서" onClose={onClose}>
      <Text as="p" variant="caption">기능 기준 {manualVersion} · 오프라인 본문</Text>
      <div className="studio-manual__search">
        <Input label="사용설명서 검색" type="search" value={query} onChange={event => setQuery(event.target.value)}
          help="기능·메뉴·단축키 또는 오류 문구로 찾습니다. 여러 단어는 모두 포함된 항목을 찾습니다." />
        <Button kind="quiet" disabled={!query} onClick={() => { setQuery(''); root.current?.querySelector<HTMLInputElement>('input')?.focus() }}>검색 지우기</Button>
        <Button kind="quiet" disabled={!history.length} onClick={back}>이전 항목</Button>
      </div>
      <div className="studio-manual__layout">
        <nav className="studio-manual__contents" aria-label="사용설명서 목차">
          {manualChapters.map(item => <Button kind="quiet" key={item.id} aria-current={item.id === chapter.id ? 'page' : undefined}
            onClick={() => go(item.id)}>{item.title}</Button>)}
        </nav>
        <article ref={article} tabIndex={-1} aria-label="사용설명서 본문" className="studio-manual__article">
          {query.trim() ? <>
            <Text as="p" role="status">{results.length ? `검색 결과 ${results.length}개` : '일치하는 설명이 없습니다. 기호 이름이나 다른 단어로 검색하세요.'}</Text>
            <div className="studio-manual__results">{results.map((section, index) => <Button key={`${section.file}:${section.anchor}:${index}`} kind="secondary" onClick={() => go(section.chapterId, section.anchor)}>
              <Text as="span" variant="caption">{section.chapterTitle}</Text><Text as="span" variant="label">{section.title}</Text>
            </Button>)}</div>
          </> : <ManualMarkdown text={chapter.id === 'shortcuts' ? shortcutMarkdown : chapter.content} link={link} />}
        </article>
      </div>
    </Dialog>
  </div>
}

// Deliberately small renderer for authored local Markdown: React escapes text;
// no raw HTML, scripts, images, iframe, arbitrary styles or file URLs are executed.
function Inline({ text, link }: { text: string; link: (href: string, label: ReactNode) => ReactNode }) {
  return <>{text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g).map((token, i) => {
    const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    return <Fragment key={i}>{match ? link(match[2], match[1]) : token.startsWith('**') ? <strong>{token.slice(2, -2)}</strong> : token.startsWith('`') ? <code>{token.slice(1, -1)}</code> : token}</Fragment>
  })}</>
}
function ManualMarkdown({ text, link }: { text: string; link: (href: string, label: ReactNode) => ReactNode }) {
  const lines = text.split('\n'), nodes: ReactNode[] = []
  const inline = (line: string) => <Inline text={line} link={link} />
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const anchor = line.match(/^<a id="([a-z0-9-]+)"><\/a>$/)
    if (anchor) { nodes.push(<span key={i} data-manual-anchor={anchor[1]} id={`manual-anchor-${anchor[1]}`} />); continue }
    const heading = line.match(/^(#{1,3}) (.*)$/)
    if (heading) { nodes.push(<Text key={i} as={heading[1].length === 1 ? 'h2' : 'h3'} variant="itemTitle">{inline(heading[2])}</Text>); continue }
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s:|-]+\|$/)) {
      const headers = line.split('|').slice(1, -1).map(s => s.trim()), rows: string[][] = []
      i += 2
      while (lines[i]?.startsWith('|')) { rows.push(lines[i].split('|').slice(1, -1).map(s => s.trim())); i++ }
      i--
      nodes.push(<div key={i} className="studio-manual__table" role="region" aria-label="사용설명서 참고 표" tabIndex={0}><table><thead><tr>{headers.map((h, k) => <th key={k} scope="col">{inline(h)}</th>)}</tr></thead><tbody>{rows.map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>); continue
    }
    if (/^(?:- |\d+\. )/.test(line)) {
      const ordered = /^\d+\./.test(line), items: ReactNode[] = []
      while (lines[i] && (ordered ? /^\d+\. / : /^- /).test(lines[i])) { items.push(<li key={i}>{inline(lines[i].replace(/^(?:- |\d+\. )/, ''))}</li>); i++ }
      i--; nodes.push(ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>); continue
    }
    let paragraph = line
    while (lines[i + 1]?.trim() && !/^(?:#|<a |\||- |\d+\. )/.test(lines[i + 1])) paragraph += ' ' + lines[++i]
    nodes.push(<Text as="p" key={i}>{inline(paragraph)}</Text>)
  }
  return <>{nodes}</>
}
