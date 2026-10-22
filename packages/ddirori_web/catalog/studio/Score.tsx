import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Formatter, Dot } from 'vexflow';
import { ddiroriTokens } from '../../src';
import type { Draft } from './model';

export function Score({ draft, selected, playing, input, span }: { draft: Draft; selected: string[]; playing: boolean; input: boolean; span: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const el = host.current!;
    el.replaceChildren();
    try {
      const renderer = new Renderer(el, Renderer.Backends.SVG);
      renderer.resize(640, 200);
      const context = renderer.getContext();
      const stave = new Stave(20, 25, 600).addClef('treble').addTimeSignature(draft.meter).addKeySignature(draft.key).setContext(context);
      stave.draw();
      const notes = draft.notes.map(n => {
        const note = new StaveNote({ keys: [n.pitch], duration: n.duration });
        for (let i = 0; i < n.dots; i++) Dot.buildAndAttach([note], { all: true });
        return note;
      });
      Formatter.FormatAndDraw(context, stave, notes);
      const svg = el.querySelector('svg')!;
      svg.setAttribute('viewBox', '0 0 640 200');
      svg.setAttribute('aria-hidden', 'true');
      svg.removeAttribute('width'); svg.removeAttribute('height');
      svg.style.removeProperty('width'); svg.style.removeProperty('height');
      // Overlay coordinates come from VexFlow, never from guessed screen pixels.
      const overlay = (tag: string, attrs: Record<string, string | number>) => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
        svg.append(node); return node;
      };
      notes.forEach((note, i) => {
        const box = note.getBoundingBox();
        if (selected.includes(draft.notes[i].id)) overlay('rect', { x: box.getX() - 5, y: box.getY() - 6, width: box.getW() + 10, height: box.getH() + 12, fill: 'none', stroke: ddiroriTokens.score.voiceOne, 'stroke-width': 2, 'data-state': 'selection' });
        if (playing && i === 2) overlay('line', { x1: box.getX() - 8, x2: box.getX() - 8, y1: 20, y2: 125, stroke: ddiroriTokens.score.playhead, 'stroke-width': 3, 'data-state': 'playhead' });
        if (input && i === 3) overlay('line', { x1: box.getX() + box.getW() + 15, x2: box.getX() + box.getW() + 15, y1: 40, y2: 115, stroke: ddiroriTokens.score.notation, 'stroke-width': 2, 'stroke-dasharray': '5 3', 'data-state': 'input' });
      });
      if (span) {
        const start = notes[draft.spanStart - 1].getAbsoluteX();
        const end = notes[draft.spanEnd - 1].getAbsoluteX();
        overlay('line', { x1: start, x2: end, y1: 14, y2: 14, stroke: ddiroriTokens.score.voiceTwo, 'stroke-width': 2 });
        for (const [x, label] of [[start, '시작'], [end, '끝']] as const) {
          overlay('circle', { cx: x, cy: 14, r: 5, fill: ddiroriTokens.score.paper, stroke: ddiroriTokens.score.voiceTwo, 'stroke-width': 2, 'data-state': 'endpoint' });
          overlay('text', { x, y: 165, fill: ddiroriTokens.score.notation, stroke: 'none', 'font-family': 'sans-serif', 'font-size': 12, 'text-anchor': 'middle' }).textContent = label;
        }
      }
      setError('');
    } catch { setError('샘플 악보를 표시하지 못했습니다.'); }
    return () => el.replaceChildren();
  }, [draft.notes, draft.key, draft.meter, draft.spanStart, draft.spanEnd, selected, playing, input, span]);
  return <figure className="studio-paper">
    <figcaption><strong>작은 연습곡</strong><span>직접 작성한 4음 fixture · 렌더링 표본</span></figcaption>
    {error ? <p role="alert">{error}</p> : null}
    <div ref={host} className="studio-notation" role="img" aria-label="높은음자리표 샘플 악보" />
    <div className="studio-note-strip" aria-label="악보 편집 상태 표본">
      {draft.notes.map((note, i) => <div key={note.id} className={`studio-note-state ${selected.includes(note.id) ? 'selected' : ''} ${playing && i === 2 ? 'playhead' : ''}`}>
        <span>{i + 1}음 · {note.voice}성부</span>
        {selected.includes(note.id) ? <strong>선택</strong> : null}
        {playing && i === 2 ? <strong>재생 위치</strong> : null}
        {input && i === 3 ? <strong className="input-cursor">입력 ▏</strong> : null}
      </div>)}
    </div>
  </figure>;
}
