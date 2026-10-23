import { useEffect, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'

export const appearanceStorageKey = 'chromatics.ddirori-appearance.v1'
type Appearance = { theme: 'light' | 'dark'; density: 'compact' | 'comfortable' }
const defaults: Appearance = { theme: 'light', density: 'compact' }

export function readAppearance(): Appearance {
  try {
    const value = JSON.parse(window.localStorage.getItem(appearanceStorageKey) ?? 'null')
    return {
      theme: value?.theme === 'dark' ? 'dark' : defaults.theme,
      density: value?.density === 'comfortable' ? 'comfortable' : defaults.density
    }
  } catch { return { ...defaults } }
}

export function AppearanceSettings() {
  const [appearance, setAppearance] = useState(readAppearance)
  const [saveFailed, setSaveFailed] = useState(false)
  const details = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = document.documentElement
    const hadClass = root.classList.contains('ddirori')
    const previous = { theme: root.dataset.theme, density: root.dataset.density }
    root.classList.add('ddirori')
    return () => {
      if (!hadClass) root.classList.remove('ddirori')
      for (const key of ['theme', 'density'] as const) {
        if (previous[key] === undefined) delete root.dataset[key]
        else root.dataset[key] = previous[key]
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = appearance.theme
    document.documentElement.dataset.density = appearance.density
  }, [appearance])

  const update = (patch: Partial<Appearance>) => {
    const next = { ...appearance, ...patch }
    setAppearance(next)
    try { window.localStorage.setItem(appearanceStorageKey, JSON.stringify(next)); setSaveFailed(false) }
    catch { setSaveFailed(true) }
  }

  return <div className="appearance-bar">
    <details className="appearance-settings" ref={details}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false
      }}
      onKeyDown={event => {
        // Appearance controls must never send note-entry shortcuts to the editor.
        event.stopPropagation()
        if (event.key === 'Escape') {
          event.preventDefault()
          if (details.current) details.current.open = false
          summary.current?.focus()
        }
      }}>
      <summary ref={summary} aria-label="화면 설정" title="화면 설정">
        <Settings2 size={16} aria-hidden="true" /><span>화면</span>
      </summary>
      <div className="appearance-settings__body">
        <label>테마<select aria-label="화면 테마" value={appearance.theme}
          onChange={event => update({ theme: event.target.value as Appearance['theme'] })}>
          <option value="light">밝게</option><option value="dark">어둡게</option>
        </select></label>
        <label>간격<select aria-label="도구 간격" value={appearance.density}
          onChange={event => update({ density: event.target.value as Appearance['density'] })}>
          <option value="compact">촘촘하게</option><option value="comfortable">넉넉하게</option>
        </select></label>
        {saveFailed && <p role="status">설정을 저장하지 못했습니다. 이번 창에는 적용됩니다.</p>}
      </div>
    </details>
  </div>
}
