import { useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { Button, IconButton } from './controls';
export { Button, IconButton, type ButtonProps } from './controls';
import geometry from '../../../docs/brand/ddirori-design-system/generated/geometry.json';
import bach from '../../../docs/brand/ddirori-design-system/assets/bach-surprised.png';
export function Mark({ size = 48, pulse = false }: {
    size?: number;
    pulse?: boolean;
}) {
    const g = size <= 32 ? geometry.small : geometry.full;
    return <svg className={pulse ? 'dd-mark dd-mark--pulse' : 'dd-mark'} width={size} height={size} viewBox={g.viewBox.join(' ')} aria-hidden="true" fill="currentColor">
 {g.stems.lines.map((s, i) => <path key={'s' + i} d={`M${s[0]} ${s[1]}V${s[2]}`} fill="none" stroke="currentColor" strokeWidth={g.stems.width}/>)}
 {g.beams.map((b, i) => <rect key={'b' + i} x={b[0]} y={b[1]} width={b[2]} height={b[3]}/>)}
 {g.heads.map((h, i) => <ellipse className="dd-head" style={{ animationDelay: `-${i * 180}ms` }} key={i} cx={h[0]} cy={h[1]} rx={h[2]} ry={h[3]} transform={`rotate(${h[4]} ${h[0]} ${h[1]})`}/>)}
 <circle cx={g.dot[0]} cy={g.dot[1]} r={g.dot[2]}/>
 </svg>;
}
export function Bach({ size = 64 }: {
    size?: number;
}) { return <img src={bach} width={size} height={size} alt="놀란 바흐" className="dd-bach"/>; }
export function Input({ label, error, help, clearable = false, onClear, ...props }: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    help?: string;
    clearable?: boolean;
    onClear?: () => void;
}) {
    const id = useId(), description = error || help;
    return <div className="dd-field"><label htmlFor={id}>{label}</label><div className="dd-input-row"><input {...props} id={id} aria-invalid={!!error} aria-describedby={description ? id + '-help' : undefined}/>{clearable && String(props.value ?? '') !== '' ? <IconButton label={label + ' 지우기'} onClick={onClear} disabled={props.disabled}>×</IconButton> : null}</div>{description ? <p id={id + '-help'} className={error ? 'dd-error' : 'dd-help'}>{description}</p> : null}</div>;
}
export function Search({ value, onChange, label = '검색' }: {
    value: string;
    onChange: (v: string) => void;
    label?: string;
}) { return <Input label={label} value={value} type="search" clearable onClear={() => onChange('')} onChange={e => onChange(e.target.value)}/>; }
export function Choices<T extends string | number>({ label, options, selected, onChange, multiple = false, disabled = false }: {
    label: string;
    options: readonly {
        value: T;
        label: string;
    }[];
    selected: readonly T[];
    onChange: (v: T[]) => void;
    multiple?: boolean;
    disabled?: boolean;
}) {
    return <div className="dd-choices" role="group" aria-label={label}>{options.map(o => <Button key={o.value} kind="secondary" disabled={disabled} selected={selected.includes(o.value)} onClick={() => { const next = multiple ? [...selected] : []; onChange(selected.includes(o.value) ? next.filter(v => v !== o.value) : [...next, o.value]); }}>{o.label}</Button>)}</div>;
}
export function Toolbar({ children, label = '도구' }: {
    children: ReactNode;
    label?: string;
}) { return <div className="dd-toolbar" role="group" aria-label={label}>{children}</div>; }
export function Item({ title, subtitle, leading, actions, selected = false, selecting = false, onSelected, onOpen }: {
    title: string;
    subtitle?: string;
    leading?: ReactNode;
    actions?: ReactNode;
    selected?: boolean;
    selecting?: boolean;
    onSelected?: (v: boolean) => void;
    onOpen?: () => void;
}) {
    return <article className={`dd-item ${selected ? 'is-selected' : ''}`}><div className="dd-item-main">{selecting ? <input type="checkbox" aria-label={title + ' 선택'} checked={selected} onChange={e => onSelected?.(e.target.checked)}/> : leading}<div>{onOpen ? <button type="button" className="dd-item-title" onClick={onOpen}>{title}</button> : <strong>{title}</strong>}{subtitle ? <p>{subtitle}</p> : null}</div></div>{actions ? <div className="dd-item-actions">{actions}</div> : null}</article>;
}
export function Banner({ children, kind = 'info', action }: {
    children: ReactNode;
    kind?: 'info' | 'success' | 'warning' | 'error';
    action?: ReactNode;
}) {
    const icons = { info: 'ⓘ', success: '✓', warning: '△', error: '!' };
    return <div className={`dd-banner dd-banner--${kind}`} role={kind === 'error' ? 'alert' : 'status'}><span className="dd-banner-symbol" aria-hidden="true">{icons[kind]}</span><div>{children}{action ? <div className="dd-item-actions">{action}</div> : null}</div></div>;
}
export function StatePanel({ title, message, error = false, bachFace = false, action, diagnostic }: {
    title: string;
    message: string;
    error?: boolean;
    bachFace?: boolean;
    action?: ReactNode;
    diagnostic?: string;
}) {
    return <section className="dd-state">{bachFace ? <Bach /> : <span className="dd-state-symbol" aria-hidden="true">{error ? '!' : '□'}</span>}<h3>{title}</h3><p>{message}</p>{action}{diagnostic ? <details><summary>진단 정보</summary><pre>{diagnostic}</pre></details> : null}</section>;
}
export function Progress({ value, label = '불러오는 중' }: {
    value?: number;
    label?: string;
}) { return <div className="dd-progress"><div role="progressbar" aria-label={label} aria-valuemin={value === undefined ? undefined : 0} aria-valuemax={value === undefined ? undefined : 100} aria-valuenow={value === undefined ? undefined : Math.round(Math.max(0, Math.min(1, value)) * 100)}>{value === undefined ? <Mark pulse size={48}/> : <progress aria-hidden="true" max={1} value={Math.max(0, Math.min(1, value))}/>}</div><span role="status">{label}</span></div>; }
export function SettingsRow({ label, description, children }: {
    label: string;
    description?: string;
    children: ReactNode;
}) { return <div className="dd-settings"><div><strong>{label}</strong>{description ? <p>{description}</p> : null}</div><div>{children}</div></div>; }
export function Dialog({ open, title, children, onClose, actions, sheet = false }: {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
    actions?: ReactNode;
    sheet?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null), titleId = useId();
    useEffect(() => { const el = ref.current; if (!el)
        return; const previous = document.activeElement as HTMLElement | null; if (open && !el.open)
        el.showModal();
    else if (!open && el.open)
        el.close(); return () => { if (el.open)
        el.close(); if (open)
        previous?.focus(); }; }, [open]);
    return <dialog ref={ref} className={`dd-dialog ${sheet ? 'dd-dialog--sheet' : ''}`} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onClose={() => { if (open)
        onClose(); }}><div className="dd-dialog-head"><h2 id={titleId}>{title}</h2><IconButton label="닫기" onClick={onClose}>×</IconButton></div><div className="dd-dialog-body">{children}</div><div className="dd-dialog-actions">{actions}</div></dialog>;
}
export function NumberControl({ label, value, onChange, min, max, step = 1, unit = '', disabled = false }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    disabled?: boolean;
}) {
    const [draft, setDraft] = useState(String(value)), [error, setError] = useState('');
    useEffect(() => { setDraft(String(value)); setError(''); }, [value]);
    const commit = () => { const n = draft.trim() === '' ? NaN : Number(draft); if (!Number.isFinite(n) || n < min || n > max) {
        setError(`${min}~${max} 범위로 입력해주세요`);
        return;
    } setError(''); onChange(n); };
    return <div className="dd-number"><div className="dd-number-row"><IconButton label={label + ' 낮추기'} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</IconButton><Input label={label + (unit ? ' ' + unit : '')} value={draft} disabled={disabled} error={error || undefined} inputMode="decimal" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter')
        commit(); }} onBlur={commit}/><IconButton label={label + ' 높이기'} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + step))}>＋</IconButton></div><input type="range" aria-label={label + ' 슬라이더'} disabled={disabled} value={Math.max(min, Math.min(max, value))} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))}/></div>;
}
export function PageControls({ page, count, onChange, performance = false }: {
    page: number;
    count?: number;
    onChange: (v: number) => void;
    performance?: boolean;
}) { return <div className={`dd-pages ${performance ? 'dd-pages--performance' : ''}`}><IconButton label="이전 페이지" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</IconButton><output aria-live="polite">{page} / {count ?? '—'}</output><IconButton label="다음 페이지" disabled={count !== undefined && page >= count} onClick={() => onChange(page + 1)}>›</IconButton></div>; }
export function Transport({ playing, onToggle, position = 0, duration, onSeek, onPrevious, onNext }: {
    playing: boolean;
    onToggle?: () => void;
    position?: number;
    duration?: number;
    onSeek?: (n: number) => void;
    onPrevious?: () => void;
    onNext?: () => void;
}) { const time = (n: number) => `${Math.floor(n / 60)}:${Math.floor(n % 60).toString().padStart(2, '0')}`; return <div className="dd-transport"><div><IconButton label="이전 트랙" onClick={onPrevious}>‹</IconButton><Button onClick={onToggle}>{playing ? '일시정지' : '재생'}</Button><IconButton label="다음 트랙" onClick={onNext}>›</IconButton></div>{duration && duration > 0 ? <><input type="range" aria-label="재생 위치" min={0} max={duration} value={Math.max(0, Math.min(duration, position))} disabled={!onSeek} onChange={e => onSeek?.(Number(e.target.value))}/><output>{time(position)} / {time(duration)}</output></> : null}</div>; }
export type TunerStatus = 'flat' | 'centered' | 'sharp' | 'noSignal' | 'lowConfidence';
export function TunerMeter({ status, cents, note = 'A4' }: {
    status: TunerStatus;
    cents?: number;
    note?: string;
}) {
    const names = { flat: '낮음', centered: '정확', sharp: '높음', noSignal: '신호 없음', lowConfidence: '신뢰도 낮음' }, has = cents !== undefined && status !== 'noSignal';
    return <div className="dd-tuner" role="img" aria-label={`${note} ${names[status]}${has ? ' ' + cents + ' 센트' : ''}`}><h3>{note} · {names[status]}</h3><div className="dd-tuner-track"><i />{has ? <b style={{ left: `${(Math.max(-50, Math.min(50, cents!)) + 50)}%` }}>{status === 'centered' ? '✓' : '▼'}</b> : null}</div><p>{has ? cents + ' cents' : '소리를 기다리고 있어요'}</p><div className="dd-tuner-labels"><span>낮음</span><span>정확</span><span>높음</span></div></div>;
}
export function BeatIndicator({ beats, currentBeat, running }: {
    beats: number;
    currentBeat: number;
    running: boolean;
}) { return <div className="dd-beats" role="img" aria-label={running ? `${beats}박 중 ${currentBeat}번째 박` : `${beats}박 대기`}>{Array.from({ length: beats }, (_, i) => <span key={i} className={running && i + 1 === currentBeat ? 'is-active' : ''}>{i + 1}</span>)}</div>; }

export { ddiroriTokens } from "../../../docs/brand/ddirori-design-system/generated/tokens";
