import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles.css';
import { Studio } from './Studio';

function App() {
  const [theme, setTheme] = useState('light'), [density, setDensity] = useState('compact');
  return <div className="ddirori studio-host" data-theme={theme} data-density={density}>
    <header className="studio-review-controls"><a href="#studio-content">사보 작업으로</a><span>Ddirori / Design review</span>
      <label>테마<select aria-label="테마" value={theme} onChange={e => setTheme(e.target.value)}><option value="light">밝은</option><option value="dark">어두운</option></select></label>
      <label>밀도<select aria-label="밀도" value={density} onChange={e => setDensity(e.target.value)}><option>compact</option><option>comfortable</option></select></label>
    </header><main id="studio-content" tabIndex={-1}><Studio /></main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App />);
