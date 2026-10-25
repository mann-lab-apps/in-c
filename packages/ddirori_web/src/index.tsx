import { useEffect, useId, useRef, useState, type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import type { DdiroriTextRole } from '../../../docs/brand/ddirori-design-system/generated/tokens';
export type { DdiroriTextRole } from '../../../docs/brand/ddirori-design-system/generated/tokens';

/** Visual style is independent of document semantics. Headings require an explicit `as`. */
export function Text({as: Element = 'span', variant = 'body', className = '', ...props}: HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'strong' | 'output' | 'kbd';
  variant?: DdiroriTextRole;
}) {
  const role = variant.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  return <Element {...props} className={`dd-text dd-text--${role} ${className}`}/>;
}
import geometry from '../../../docs/brand/ddirori-design-system/generated/geometry.json';
import bach from '../../../docs/brand/ddirori-brand-system/assets/bach-surprised.svg';
import bachCalm from '../../../docs/brand/ddirori-brand-system/assets/bach-calm.svg';
import bachHappy from '../../../docs/brand/ddirori-brand-system/assets/bach-happy.svg';
import family from '../../../docs/brand/ddirori-brand-system/family.json';
export function Mark({ size = 48, pulse = false }: {
    size?: number;
    pulse?: boolean;
}) {
    const g = size <= 32 ? geometry.small : geometry.full;
    return <svg className={pulse ? 'dd-mark dd-mark--pulse' : 'dd-mark'} width={size} height={size} viewBox={g.viewBox.join(' ')} aria-hidden="true" fill="currentColor">
 {g.stems.lines.map((s, i) => <path key={'s' + i} d={`M${s[0]} ${s[1]}V${s[2]}`} fill="none" stroke="currentColor" strokeWidth={g.stems.width}/>)}
 {g.beams.map((b, i) => <rect key={'b' + i} x={b[0]} y={b[1]} width={b[2]} height={b[3]}/>)}
 {g.heads.map((h, i) => <ellipse className="dd-head"  key={i} cx={h[0]} cy={h[1]} rx={h[2]} ry={h[3]} transform={`rotate(${h[4]} ${h[0]} ${h[1]})`}/>)}
 <circle cx={g.dot[0]} cy={g.dot[1]} r={g.dot[2]}/>
 </svg>;
}
export function Bach({ size = 64, expression = 'surprised' }: {
    size?: number;
    expression?: 'surprised' | 'calm' | 'happy';
}) { return <img src={{surprised:bach,calm:bachCalm,happy:bachHappy}[expression]} width={size} height={size} alt={{surprised:'놀란 바흐',calm:'차분한 바흐',happy:'기쁜 바흐'}[expression]} className="dd-bach"/>; }
export type ProductId = 'play' | 'score' | 'studio' | 'talk' | 'stage' | 'click' | 'chime';
export function ProductGlyph({product,size=32}:{product:ProductId;size?:number}) {
 const p=family.products.find(p=>p.id===product)!;
 return <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d={[p.path,...(p.cutouts||[])].join(' ')}/>{p.extra?<path d={p.extra}/>:null}</svg>;
}
export function ProductSignature({product,name,subtitle}:{product:ProductId;name:string;subtitle?:string}){
 return <div className="dd-product-signature"><ProductGlyph product={product}/><div><Text as="h2" variant="screenTitle">{name}</Text>{subtitle?<p>{subtitle}</p>:null}</div></div>;
}
export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    onClick?: () => void | Promise<void>;
    kind?: 'primary' | 'secondary' | 'danger' | 'quiet';
    busy?: boolean;
    selected?: boolean;
    onError?: (e: unknown) => void;
};
export function Button({ children, onClick, kind = 'primary', busy = false, selected, onError, disabled, ...props }: ButtonProps) {
    const [pending, setPending] = useState(false);
    const lock = useRef(false), alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    const run = async () => { if (lock.current || disabled || busy || !onClick)
        return; lock.current = true; try {
        const result = onClick();
        if (result && typeof result.then === 'function') {
            setPending(true);
            await result;
        }
    }
    catch (e) {
        if (onError)
            onError(e);
        else
            console.error(e);
    }
    finally {
        lock.current = false;
        if (alive.current)
            setPending(false);
    } };
    return <button type="button" {...props} className={`dd-button dd-button--${kind} ${props.className ?? ''}`} aria-pressed={selected} aria-busy={busy || pending} disabled={disabled || busy || pending || !onClick} onClick={() => void run()}>{pending || busy ? <span aria-hidden="true">◌ </span> : null}{children}{pending || busy ? ' · 처리 중' : ''}</button>;
}
export function IconButton({ label, children, className = '', ...props }: ButtonProps & {
    label: string;
}) { return <Button {...props} kind={props.kind ?? 'quiet'} aria-label={label} title={label} className={`dd-icon-button ${className}`}>{children}</Button>; }
export function Input({ label, error, help, clearable = false, onClear, ...props }: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    help?: string;
    clearable?: boolean;
    onClear?: () => void;
}) {
    const id = useId(), description = error || help;
    return <div className="dd-field"><label htmlFor={id}>{label}</label><div className="dd-input-row"><input {...props} id={id} aria-invalid={!!error} aria-describedby={description ? id + '-help' : undefined}/>{clearable && String(props.value ?? '') !== '' ? <IconButton label={label + ' 지우기'} onClick={onClear} disabled={props.disabled || props.readOnly}>×</IconButton> : null}</div>{description ? <p id={id + '-help'} className={error ? 'dd-error' : 'dd-help'}>{description}</p> : null}</div>;
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
    return <div className="dd-choices" role="group" aria-label={label}>{options.map(o => <Button key={o.value} className="dd-choice" kind="secondary" disabled={disabled} selected={selected.includes(o.value)} onClick={() => { const next = multiple ? [...selected] : []; onChange(selected.includes(o.value) ? next.filter(v => v !== o.value) : [...next, o.value]); }}><span className="dd-choice-check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="m2 7 3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>{o.label}</span></Button>)}</div>;
}
export function Toolbar({ children, label = '도구' }: {
    children: ReactNode;
    label?: string;
}) { return <div className="dd-toolbar" role="group" aria-label={label}>{children}</div>; }
export function Item({ title, subtitle, leading, trailing, actions, flat = false, selected = false, selecting = false, disabled = false, onSelected, onOpen }: {
    title: string;
    subtitle?: string;
    leading?: ReactNode;
    trailing?: ReactNode;
    actions?: ReactNode;
    flat?: boolean;
    selected?: boolean;
    selecting?: boolean;
    disabled?: boolean;
    onSelected?: (v: boolean) => void;
    onOpen?: () => void;
}) {
    return <article aria-disabled={disabled || undefined} className={`dd-item ${flat ? 'dd-item--flat' : ''} ${trailing ? 'dd-item--with-trailing' : ''} ${selected ? 'is-selected' : ''}`}>
        <div className="dd-item-main">
            {selecting ? <input type="checkbox" aria-label={title + ' 선택'} checked={selected} disabled={disabled} onChange={e => onSelected?.(e.target.checked)}/> : leading ? <span inert={disabled}>{leading}</span> : null}
            <div className="dd-item-content">{onOpen && !disabled ? <button type="button" className="dd-item-title dd-text--item-title" onClick={onOpen}>{title}</button> : <Text as="strong" variant="itemTitle">{title}</Text>}{subtitle ? <p>{subtitle}</p> : null}</div>
            {trailing ? <div className="dd-item-trailing" inert={disabled}>{trailing}</div> : null}
        </div>
        {actions ? <div className="dd-item-actions" inert={disabled}>{actions}</div> : null}
    </article>;
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
export function Dialog({ open, title, children, onClose, actions, sheet = false, busy = false }: {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
    actions?: ReactNode;
    sheet?: boolean;
    busy?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null), titleId = useId();
    useEffect(() => { const el = ref.current; if (!el)
        return; const previous = document.activeElement as HTMLElement | null; if (open && !el.open)
        el.showModal();
    else if (!open && el.open)
        el.close(); return () => { if (el.open)
        el.close(); if (open)
        previous?.focus(); }; }, [open]);
    return <dialog ref={ref} className={`dd-dialog ${sheet ? 'dd-dialog--sheet' : ''}`} aria-labelledby={titleId} onKeyDown={e => {
      if (e.key !== 'Tab') return;
      const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')).filter(n => n.getClientRects().length && !n.closest('[hidden],[inert]'));
      const first = controls[0], last = controls.at(-1);
      if (!first) { e.preventDefault(); e.currentTarget.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} onClose={() => { if (open && !busy)
        onClose(); }}><div className="dd-dialog-head"><Text as="h2" variant="sectionTitle" id={titleId}>{title}</Text><IconButton label="닫기" disabled={busy} onClick={onClose}>×</IconButton></div><div className="dd-dialog-body">{children}</div><div className="dd-dialog-actions">{actions}</div></dialog>;
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
    const dirty = useRef(false), composing = useRef(false);
    useEffect(() => { dirty.current = false; setDraft(String(value)); setError(''); }, [value]);
    const commit = () => {
        if (disabled || composing.current || !dirty.current) return;
        const n = draft.trim() === '' ? NaN : Number(draft);
        if (!Number.isFinite(n) || n < min || n > max) {
            setError(`${min}~${max} 범위로 입력해주세요`); return;
        }
        // Clear synchronously: Enter and blur can occur before the host echoes value.
        dirty.current = false; setError(''); setDraft(String(n));
        if (n !== value) onChange(n);
    };
    return <div className="dd-number"><div className="dd-number-row">
        <IconButton label={label + ' 낮추기'} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</IconButton>
        <Input label={label + (unit ? ' ' + unit : '')} value={draft} disabled={disabled} error={error || undefined} inputMode="decimal"
            onChange={e => { dirty.current = true; setDraft(e.target.value); }}
            onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
            onKeyDown={e => {
                if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                if (e.key === 'Escape') { e.preventDefault(); dirty.current = false; setDraft(String(value)); setError(''); }
            }} onBlur={commit}/>
        <IconButton label={label + ' 높이기'} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + step))}>＋</IconButton>
        </div><input type="range" aria-label={label + ' 슬라이더'} disabled={disabled} value={Math.max(min, Math.min(max, value))} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))}/></div>;
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

export type ServiceAvailability = 'available' | 'external' | 'install' | 'unavailable';
/** The host owns navigation and URL validation. */
export function ServiceLink({product,name,description,availability='available',onOpen}:{product:ProductId;name:string;description:string;availability?:ServiceAvailability;onOpen?:()=>void}) {
 const label={available:'열기',external:'외부 서비스로 이동',install:'설치 안내 보기',unavailable:'연결 준비 중'}[availability];
 return <section className="dd-service-link"><ProductSignature product={product} name={name} subtitle={description}/><Button kind="secondary" disabled={availability==='unavailable'||!onOpen} onClick={onOpen} aria-label={`${name} · ${label}`}>{label}</Button></section>;
}

export * from './basic';
