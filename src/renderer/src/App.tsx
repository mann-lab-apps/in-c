import { useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import './styles.css'
import { demoScore } from './notation/demo-score'
import { NotationPreview } from './notation/NotationPreview'

const durations = ['Whole', 'Half', 'Quarter', 'Eighth']
const tools = ['Select', 'Note', 'Rest', 'Tie']

const App = () => {
  const [selectedEventId, setSelectedEventId] = useState('note-e4')
  const selectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId)
  }, [])
  const selection = useMemo(() => {
    for (const part of demoScore.parts) {
      for (const staff of part.staves) {
        for (const measure of staff.measures) {
          for (const voice of measure.voices) {
            if (voice.events.some((event) => event.id === selectedEventId)) {
              return {
                measure: measure.number,
                voice: voice.id
              }
            }
          }
        }
      }
    }

    return undefined
  }, [selectedEventId])

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Score navigation">
        <div>
          <p className="eyebrow">in-C</p>
          <h1>Untitled Score</h1>
        </div>

        <nav className="panel-list" aria-label="Open panels">
          <button className="panel-list__item panel-list__item--active" type="button">
            Score
          </button>
          <button className="panel-list__item" type="button">
            Parts
          </button>
          <button className="panel-list__item" type="button">
            Mixer
          </button>
        </nav>

        <section className="inspector" aria-label="Selection inspector">
          <h2>Selection</h2>
          <dl>
            <div>
              <dt>Event</dt>
              <dd>{selectedEventId}</dd>
            </div>
            <div>
              <dt>Measure</dt>
              <dd>{selection?.measure ?? '—'}</dd>
            </div>
            <div>
              <dt>Voice</dt>
              <dd>{selection?.voice ?? '—'}</dd>
            </div>
          </dl>
        </section>
      </aside>

      <section className="workspace" aria-label="Notation editor">
        <header className="toolbar">
          <div className="segmented-control" aria-label="Editing tools">
            {tools.map((tool) => (
              <button
                className={tool === 'Select' ? 'is-active' : undefined}
                key={tool}
                type="button"
              >
                {tool}
              </button>
            ))}
          </div>

          <div className="duration-strip" aria-label="Durations">
            {durations.map((duration) => (
              <button key={duration} type="button">
                {duration}
              </button>
            ))}
          </div>
        </header>

        <div className="score-page" aria-label="Score page">
          <div className="score-title">
            <span>{demoScore.title}</span>
            <small>Andante · 4/4</small>
          </div>

          <NotationPreview
            onSelectEvent={selectEvent}
            score={demoScore}
            selectedEventId={selectedEventId}
          />
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
