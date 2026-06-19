import { createRoot } from 'react-dom/client'

import './styles.css'

const durations = ['Whole', 'Half', 'Quarter', 'Eighth']
const tools = ['Select', 'Note', 'Rest', 'Tie']

const App = () => {
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
              <dt>Staff</dt>
              <dd>1</dd>
            </div>
            <div>
              <dt>Measure</dt>
              <dd>1</dd>
            </div>
            <div>
              <dt>Voice</dt>
              <dd>1</dd>
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
            <span>Untitled Score</span>
            <small>Andante · 4/4</small>
          </div>

          <div className="staff-system">
            {[0, 1, 2, 3, 4].map((line) => (
              <span className="staff-line" key={line} />
            ))}
            <span className="clef">𝄞</span>
            <span className="time-signature">4<br />4</span>
            <span className="measure-bar measure-bar--one" />
            <span className="measure-bar measure-bar--two" />
            <span className="measure-bar measure-bar--three" />
            <span className="note note--one" />
            <span className="note note--two" />
            <span className="note note--three" />
            <span className="note note--four" />
          </div>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
