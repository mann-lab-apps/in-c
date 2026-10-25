import {
  Children,
  cloneElement,
  type ReactElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { Button, Dialog, Text, type ButtonProps } from "./index";
import { ddiroriTokens } from "../../../docs/brand/ddirori-design-system/generated/tokens";

export type Option<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};
export function Group({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="dd-inline" role="group" aria-label={label}>
      {children}
    </div>
  );
}
export function ToggleButton({
  selected,
  onSelected,
  ...props
}: Omit<ButtonProps, "onClick" | "selected"> & {
  selected: boolean;
  onSelected: (value: boolean) => void;
}) {
  return (
    <Button
      {...props}
      selected={selected}
      onClick={() => onSelected(!selected)}
    />
  );
}
export function Stack({
  children,
  gap = "md",
  inline = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  gap?: "sm" | "md" | "lg" | "xl";
  inline?: boolean;
}) {
  return (
    <div
      {...props}
      className={`${inline ? "dd-inline" : "dd-stack"} ${props.className ?? ""}`}
      style={
        {
          "--dd-stack-gap": `var(--dd-spacing-${gap})`,
          ...props.style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
/** Density changes control rhythm without resetting inherited color roles. */
export function Density({
  density,
  children,
  className = "",
}: {
  density: "comfortable" | "compact";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`dd-density ${className}`}
      data-density={density}
      style={
        {
          "--dd-density-control": ddiroriTokens.density[density].control + "px",
          "--dd-density-font": ddiroriTokens.density[density].font / 16 + "rem",
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
export function Container(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`dd-container ${props.className ?? ""}`} />;
}
export function Field({
  label,
  help,
  error,
  required,
  id,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  id: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid": boolean;
    "aria-required"?: boolean;
  }) => ReactNode;
}) {
  return (
    <div className="dd-field">
      <label htmlFor={id}>
        {label}
        {required ? <span> (필수)</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": help || error ? id + "-description" : undefined,
        "aria-invalid": !!error,
        "aria-required": required || undefined,
      })}
      {help || error ? (
        <p id={id + "-description"} className={error ? "dd-error" : "dd-help"}>
          {error || help}
        </p>
      ) : null}
    </div>
  );
}
export function Textarea({
  label,
  help,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  help?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <Field
      id={props.id ?? id}
      label={label}
      help={help}
      error={error}
      required={props.required}
    >
      {(field) => (
        <textarea
          {...props}
          {...field}
          rows={props.rows ?? 3}
          className="dd-textarea"
        />
      )}
    </Field>
  );
}
export function Checkbox({
  label,
  indeterminate = false,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  indeterminate?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="dd-check">
      <input {...props} ref={ref} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
export function Switch({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & {
  label: string;
}) {
  return (
    <label className="dd-check dd-switch">
      <input {...props} type="checkbox" role="switch" />
      <span>{label}</span>
    </label>
  );
}
export function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="dd-radio-group" disabled={disabled}>
      <legend>{label}</legend>
      {options.map((o) => (
        <label className="dd-check" key={o.value}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  help,
  error,
  required,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  help?: string;
  error?: string;
  required?: boolean;
}) {
  const id = useId(),
    listId = `${id}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState<string>();
  useEffect(() => setValidationError(undefined), [value, required, disabled]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<T | undefined>(value);
  const search = useRef({ text: "", at: 0 });
  const enabled = options.filter((o) => !o.disabled);
  const available = !disabled && enabled.length > 0;
  const activeIndex = options.findIndex(
    (o) => o.value === active && !o.disabled,
  );
  const activeId = activeIndex < 0 ? undefined : `${id}-option-${activeIndex}`;
  const selected = options.find((o) => o.value === value);
  const close = () => setOpen(false);
  const commit = (next = active) => {
    if (
      available &&
      next !== undefined &&
      enabled.some((o) => o.value === next) &&
      next !== value
    )
      onChange(next);
    close();
  };
  const begin = () => {
    if (!available) return;
    search.current = { text: "", at: 0 };
    setActive(
      enabled.some((o) => o.value === value) ? value : enabled[0].value,
    );
    setOpen(true);
  };
  useEffect(() => {
    if (!available) setOpen(false);
    if (open && !enabled.some((o) => o.value === active))
      setActive(enabled[0]?.value);
  }, [available, open, active, options]);
  useEffect(() => {
    const el = surface.current,
      button = trigger.current;
    if (!open || !el || !button) return;
    const position = () => {
      const r = button.getBoundingClientRect();
      const margin = 8,
        gap = 4;
      const width = Math.min(r.width, window.innerWidth - margin * 2);
      el.style.width = width + "px";
      el.style.left =
        Math.max(margin, Math.min(r.left, window.innerWidth - width - margin)) +
        "px";
      const below = Math.max(0, window.innerHeight - r.bottom - gap - margin);
      const above = Math.max(0, r.top - gap - margin);
      const upwards = below < Math.min(el.scrollHeight, 320) && above > below;
      el.style.maxHeight =
        Math.max(0, Math.min(320, upwards ? above : below)) + "px";
      const height = el.getBoundingClientRect().height;
      el.style.top =
        Math.max(margin, upwards ? r.top - gap - height : r.bottom + gap) +
        "px";
    };
    const dismiss = (event: Event) => {
      if ((event as ToggleEvent).newState === "closed") setOpen(false);
    };
    el.showPopover();
    position();
    el.addEventListener("toggle", dismiss);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      el.removeEventListener("toggle", dismiss);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, [open]);
  useEffect(() => {
    if (open && activeId)
      document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeId]);
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!available || event.nativeEvent.isComposing) return;
    const key = event.key;
    if (key === "Tab") {
      if (open) commit();
      return;
    }
    if (key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (open) commit();
      else begin();
      return;
    }
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(
        key,
      )
    ) {
      event.preventDefault();
      if (open && event.altKey && key === "ArrowUp") {
        commit();
        return;
      }
      if (!open) begin();
      const current = Math.max(
        0,
        enabled.findIndex((o) => o.value === active),
      );
      let index = current;
      if (key === "Home") index = 0;
      else if (key === "End") index = enabled.length - 1;
      else if (open)
        index +=
          key === "ArrowDown"
            ? 1
            : key === "ArrowUp"
              ? -1
              : key === "PageDown"
                ? 10
                : -10;
      else return;
      setActive(
        enabled[Math.max(0, Math.min(index, enabled.length - 1))].value,
      );
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!open) begin();
      const now = Date.now();
      const text =
        (now - search.current.at < 700 ? search.current.text : "") +
        key.toLocaleLowerCase();
      search.current = { text, at: now };
      const repeated = [...text].every((c) => c === text[0]);
      const query = repeated ? text[0] : text;
      const current = enabled.findIndex(
        (o) => o.value === (open ? active : value),
      );
      const offset = repeated ? 1 : 0;
      for (let i = 0; i < enabled.length; i++) {
        const option =
          enabled[(Math.max(0, current) + offset + i) % enabled.length];
        if (option.label.toLocaleLowerCase().startsWith(query)) {
          setActive(option.value);
          break;
        }
      }
    }
  };
  return (
    <Field
      id={id}
      label={label}
      help={help}
      error={error || validationError}
      required={required}
    >
      {(field) => (
        <>
          {required && (
            <select
              hidden
              aria-hidden="true"
              tabIndex={-1}
              required
              disabled={disabled}
              value={value}
              onChange={() => {}}
              onInvalid={(event) => {
                event.preventDefault();
                setValidationError(event.currentTarget.validationMessage);
                trigger.current?.focus();
              }}
            >
              {options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          )}
          <button
            {...field}
            ref={trigger}
            type="button"
            role="combobox"
            className="dd-select"
            disabled={disabled}
            aria-disabled={!available || undefined}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open ? activeId : undefined}
            onClick={() => (open ? close() : begin())}
            onKeyDown={handleKey}
            onBlur={(event) => {
              if (
                open &&
                event.relatedTarget &&
                !surface.current?.contains(event.relatedTarget)
              )
                close();
            }}
          >
            <span>{selected?.label ?? "—"}</span>
            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
              <path
                d="m4 6 4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {open && (
            <div
              ref={surface}
              id={listId}
              role="listbox"
              aria-label={label}
              popover="auto"
              className="dd-select-options"
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") event.preventDefault();
              }}
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  data-value={option.value}
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  data-active={
                    (option.value === active && !option.disabled) || undefined
                  }
                  className="dd-select-option"
                  onClick={() => {
                    if (!option.disabled) {
                      commit(option.value);
                      trigger.current?.focus();
                    }
                  }}
                >
                  <span>{option.label}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    style={{
                      visibility: option.value === value ? "visible" : "hidden",
                    }}
                  >
                    <path
                      d="m3 8 3 3 7-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Field>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  valueText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  valueText?: string;
}) {
  const id = useId();
  return (
    <div className="dd-field">
      <label htmlFor={id}>
        {label} <span className="dd-numeric">{valueText ?? value}</span>
      </label>
      <input
        id={id}
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-valuetext={valueText}
      />
    </div>
  );
}

function nextIndex(key: string, current: number, length: number) {
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowRight" || key === "ArrowDown")
    return (current + 1) % length;
  if (key === "ArrowLeft" || key === "ArrowUp")
    return (current - 1 + length) % length;
  return -1;
}
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const refs = useRef(new Map<T, HTMLButtonElement>()),
    enabled = options.filter((o) => !o.disabled && !disabled),
    entry = enabled.find((o) => o.value === value)?.value ?? enabled[0]?.value;
  return (
    <div className="dd-segments" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={disabled || o.disabled}
          tabIndex={o.value === entry ? 0 : -1}
          ref={(el) => {
            if (el) refs.current.set(o.value, el);
            else refs.current.delete(o.value);
          }}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const n = nextIndex(
              e.key,
              enabled.findIndex((v) => v.value === o.value),
              enabled.length,
            );
            if (n >= 0) {
              e.preventDefault();
              const target = enabled[n];
              refs.current.get(target.value)?.focus();
              onChange(target.value);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Tabs<T extends string>({
  label,
  options,
  value,
  onChange,
  activation = "automatic",
}: {
  label: string;
  options: readonly (Option<T> & { content: ReactNode })[];
  value: T;
  onChange: (v: T) => void;
  activation?: "automatic" | "manual";
}) {
  const id = useId(),
    refs = useRef(new Map<T, HTMLButtonElement>()),
    enabled = options.filter((o) => !o.disabled),
    [focused, setFocused] = useState<T>(value);
  const entry =
    enabled.find((o) => o.value === (activation === "manual" ? focused : value))
      ?.value ?? enabled[0]?.value;
  return (
    <div className="dd-tabs">
      <div className="dd-tab-list" role="tablist" aria-label={label}>
        {options.map((o, i) => (
          <button
            key={o.value}
            ref={(el) => {
              if (el) refs.current.set(o.value, el);
              else refs.current.delete(o.value);
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-controls={`${id}-panel-${i}`}
            aria-selected={value === o.value}
            tabIndex={entry === o.value ? 0 : -1}
            disabled={o.disabled}
            onFocus={() => setFocused(o.value)}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const n = nextIndex(
                e.key,
                enabled.findIndex((v) => v.value === o.value),
                enabled.length,
              );
              if (n >= 0) {
                e.preventDefault();
                const target = enabled[n];
                refs.current.get(target.value)?.focus();
                if (activation === "automatic") onChange(target.value);
              }
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {options.map((o, i) => (
        <div
          key={o.value}
          id={`${id}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${i}`}
          hidden={value !== o.value}
          tabIndex={0}
        >
          {value === o.value ? o.content : null}
        </div>
      ))}
    </div>
  );
}
export function Icon({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <span
      className="dd-icon"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </span>
  );
}
export function Avatar({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span className="dd-avatar" role="img" aria-label={name}>
      {src && !failed ? (
        <img alt="" src={src} onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">
          {Array.from(name.trim()).slice(0, 2).join("") || "?"}
        </span>
      )}
    </span>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "error";
}) {
  return <span className={`dd-badge dd-badge--${tone}`}>{children}</span>;
}
export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "error";
}) {
  return (
    <Badge tone={tone}>
      <span aria-hidden="true">
        {{ neutral: "·", success: "✓", warning: "△", error: "!" }[tone]}{" "}
      </span>
      {label}
    </Badge>
  );
}
export function Divider() {
  return <hr className="dd-divider" />;
}
export function List({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <ul className="dd-list" aria-label={label}>
      {Children.map(children, (child) => (child ? <li>{child}</li> : null))}
    </ul>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <div className="dd-card">{children}</div>;
}
export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="dd-stack">
      <div className="dd-section-head">
        <Text as="h2" variant="sectionTitle">
          {title}
        </Text>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Accordion({
  title,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <section className="dd-accordion">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
      >
        <span>{title}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
export type TableColumn = { key: string; label: string; sortable?: boolean };
export function Table({
  label,
  columns,
  rows,
  sort,
  onSort,
  empty = "표시할 항목이 없어요",
}: {
  label: string;
  columns: readonly TableColumn[];
  rows: readonly { id: string; cells: Record<string, ReactNode> }[];
  sort?: { key: string; direction: "ascending" | "descending" };
  onSort?: (key: string) => void;
  empty?: string;
}) {
  return (
    <div
      className="dd-table-scroll"
      role="region"
      aria-label={label + " 표 영역"}
      tabIndex={0}
    >
      <table className="dd-table">
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sort?.key === c.key ? sort.direction : undefined}
              >
                {c.sortable && onSort ? (
                  <button type="button" onClick={() => onSort(c.key)}>
                    {c.label}
                    <span aria-hidden="true">
                      {" "}
                      {sort?.key === c.key
                        ? sort.direction === "ascending"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key}>{row.cells[c.key]}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function InlineMessage({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={error ? "dd-error" : "dd-help"}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
/** Host controls lifetime; no auto-dismiss of actionable notices. */
export function Toast({
  message,
  onClose,
  action,
}: {
  message: string;
  onClose: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="dd-toast">
      <span role="status">{message}</span>
      {action}
      <Button kind="quiet" onClick={onClose} aria-label="알림 닫기">
        닫기
      </Button>
    </div>
  );
}
export function Skeleton({
  label = "불러오는 중",
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <div className="dd-skeleton" role="status" aria-label={label}>
      {Array.from({ length: Math.max(1, Math.min(lines, 10)) }, (_, i) => (
        <span key={i} aria-hidden="true" />
      ))}
    </div>
  );
}
export function ConfirmDialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  busy = false,
  error,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  error?: string;
}) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const lock = useRef(false), generation = useRef(0);
  useEffect(() => {
    generation.current++; lock.current = false; setPending(false); setFailure(undefined);
    return () => { generation.current++; };
  }, [open]);
  const confirm = async () => {
    if (!open || busy || lock.current) return;
    lock.current = true; setPending(true); setFailure(undefined);
    const current = generation.current;
    try { await onConfirm(); }
    catch {
      if (current === generation.current) setFailure('작업을 완료하지 못했어요. 다시 시도해 주세요.');
    } finally {
      if (current === generation.current) { lock.current = false; setPending(false); }
    }
  };
  const close = () => { if (!busy && !lock.current) onClose(); };
  return (
    <Dialog open={open} title={title} busy={busy || pending} onClose={close}
      actions={<>
        <Button kind="secondary" disabled={busy || pending} onClick={close}>취소</Button>
        <Button key={open ? "confirm-open" : "confirm-closed"} kind="danger" busy={busy || pending} onClick={confirm}>{title}</Button>
      </>}>
      {children}
      {error || failure ? <InlineMessage error>{error || failure}</InlineMessage> : null}
    </Dialog>
  );
}

export function AppHeader({
  title,
  subtitle,
  leading,
  actions,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="dd-app-header">
      {leading}
      <div className="dd-stack">
        <Text as="h1" variant="screenTitle">
          {title}
        </Text>
        {subtitle ? (
          <Text as="p" variant="description">
            {subtitle}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="dd-inline">{actions}</div> : null}
    </header>
  );
}
export function Navigation({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav className="dd-navigation" aria-label={label}>
      {children}
    </nav>
  );
}
export function NavigationItem({
  label,
  href,
  current = false,
  icon,
}: {
  label: string;
  href: string;
  current?: boolean;
  icon?: ReactNode;
}) {
  return (
    <a
      className="dd-navigation-item"
      href={href}
      aria-current={current ? "page" : undefined}
    >
      {icon ? <Icon>{icon}</Icon> : null}
      <span>{label}</span>
    </a>
  );
}

/** Native top layer retains the original DOM ancestry and theme/density inheritance. */
export function Popover({
  label,
  triggerLabel,
  open,
  onOpenChange,
  children,
  menu = false,
  onKeyDown,
}: {
  label: string;
  triggerLabel?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
  menu?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null),
    surface = useRef<HTMLDivElement>(null),
    id = useId(),
    change = useRef(onOpenChange);
  change.current = onOpenChange;
  useEffect(() => {
    const el = surface.current,
      button = trigger.current;
    if (!el || !button) return;
    if (!open) {
      if (el.matches(":popover-open")) el.hidePopover();
      return;
    }
    const position = () => {
      const r = button.getBoundingClientRect();
      const w = Math.min(320, window.innerWidth - 32);
      el.style.width = w + "px";
      el.style.left =
        Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) + "px";
      el.style.maxHeight = Math.max(120, window.innerHeight - 32) + "px";
      const h = el.getBoundingClientRect().height;
      el.style.top =
        Math.max(16, Math.min(r.bottom + 8, window.innerHeight - h - 16)) +
        "px";
    };
    el.showPopover();
    position();
    const first = el.querySelector<HTMLElement>(
      menu ? '[role="menuitem"]:not(:disabled)' : inputSelector,
    );
    (first ?? el).focus();
    const dismiss = (event: Event) => {
      if ((event as ToggleEvent).newState === "closed") change.current(false);
    };
    el.addEventListener("toggle", dismiss);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      el.removeEventListener("toggle", dismiss);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (el.matches(":popover-open")) el.hidePopover();
      if (el.contains(document.activeElement)) button.focus();
    };
  }, [open, menu]);
  const close = () => {
    onOpenChange(false);
    trigger.current?.focus();
  };
  return (
    <span className="dd-popover-anchor">
      <button
        ref={trigger}
        className="dd-button dd-button--secondary"
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup={menu ? "menu" : "dialog"}
        onClick={() => (open ? close() : onOpenChange(true))}
        onKeyDown={(e) => {
          if (menu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            onOpenChange(true);
          }
        }}
      >
        {triggerLabel ?? label}
      </button>
      <div
        ref={surface}
        id={id}
        popover="auto"
        className="dd-popover"
        role={menu ? "menu" : "dialog"}
        aria-label={label}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
          } else onKeyDown?.(e);
        }}
      >
        {children}
      </div>
    </span>
  );
}
const inputSelector =
  'input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled),a[href],[tabindex="0"]';
export function Menu({
  label,
  items,
}: {
  label: string;
  items: readonly {
    id: string;
    label: string;
    disabled?: boolean;
    onSelect: () => void;
  }[];
}) {
  const [open, setOpen] = useState(false),
    search = useRef({ text: "", at: 0 });
  useEffect(() => {
    if (!open) search.current = { text: "", at: 0 };
  }, [open]);
  return (
    <Popover
      label={label}
      triggerLabel="더 보기"
      open={open}
      onOpenChange={setOpen}
      menu
      onKeyDown={(e) => {
        const buttons = Array.from(
          e.currentTarget.querySelectorAll<HTMLButtonElement>(
            '[role="menuitem"]:not(:disabled)',
          ),
        );
        let n = nextIndex(
          e.key,
          buttons.indexOf(document.activeElement as HTMLButtonElement),
          buttons.length,
        );
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now();
          search.current = {
            text:
              (now - search.current.at < 600 ? search.current.text : "") +
              e.key.toLowerCase(),
            at: now,
          };
          n = buttons.findIndex((b) =>
            b.textContent?.toLowerCase().startsWith(search.current.text),
          );
        }
        if (n >= 0 && buttons[n]) {
          e.preventDefault();
          buttons[n].focus();
        }
        if (e.key === "Tab") {
          setOpen(false);
        }
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          role="menuitem"
          tabIndex={-1}
          type="button"
          disabled={item.disabled}
          onClick={() => {
            setOpen(false);
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </Popover>
  );
}
export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const id = useId(),
    [open, setOpen] = useState(false),
    anchor = useRef<HTMLSpanElement>(null),
    tip = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = tip.current,
      host = anchor.current;
    if (!open || !el || !host) return;
    const position = () => {
      const r = host.getBoundingClientRect();
      const w = el.getBoundingClientRect().width,
        h = el.getBoundingClientRect().height;
      el.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
      el.style.top = (r.top >= h + 8 ? r.top - h : r.bottom) + "px";
    };
    el.showPopover();
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, [open]);
  return (
    <span
      ref={anchor}
      className="dd-tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {cloneElement(children, {
        "aria-describedby":
          [children.props["aria-describedby"], open ? id : undefined]
            .filter(Boolean)
            .join(" ") || undefined,
      })}
      {open ? (
        <span
          ref={tip}
          id={id}
          role="tooltip"
          popover="manual"
          className="dd-tooltip"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
