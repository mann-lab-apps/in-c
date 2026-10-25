# React API 원문과 직접 선언한 props

현행 소스에서 추출한 계약이다. 구현 완료·브라우저 지원 보장이 아니다. 기본값 `—`는 함수 인자에서 기본값을 선언하지 않았다는 뜻이다. React 표준 HTML 속성은 원문에 표시한 상속 타입을 따른다. 생성된 tokens export는 [토큰 부록](token-reference.md)을 본다.

Import: `import { … } from "@ddirori/ui"`; `import "@ddirori/ui/styles.css"`.

<a id="Text"></a>
## Text

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 6행.

```tsx
export function Text({as: Element = 'span', variant = 'body', className = '', ...props}: HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'strong' | 'output' | 'kbd';
  variant?: DdiroriTextRole;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| as | "span" &#124; "p" &#124; "div" &#124; "h1" &#124; "h2" &#124; "h3" &#124; "h4" &#124; "strong" &#124; "output" &#124; "kbd" &#124; undefined | 아니오 | 'span' |
| variant | "screenTitle" &#124; "sectionTitle" &#124; "itemTitle" &#124; "body" &#124; "description" &#124; "label" &#124; "action" &#124; "caption" &#124; "display" &#124; "numeric" &#124; undefined | 아니오 | 'body' |

<a id="Mark"></a>
## Mark

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 18행.

```tsx
export function Mark({ size = 48, pulse = false }: {
    size?: number;
    pulse?: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| size | number &#124; undefined | 아니오 | 48 |
| pulse | boolean &#124; undefined | 아니오 | false |

<a id="Bach"></a>
## Bach

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 30행.

```tsx
export function Bach({ size = 64, expression = 'surprised' }: {
    size?: number;
    expression?: 'surprised' | 'calm' | 'happy';
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| size | number &#124; undefined | 아니오 | 64 |
| expression | "surprised" &#124; "calm" &#124; "happy" &#124; undefined | 아니오 | 'surprised' |

<a id="ProductId"></a>
## ProductId

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 34행.

```tsx
export type ProductId = 'play' | 'score' | 'studio' | 'talk' | 'stage' | 'click' | 'chime';
```

<a id="ProductGlyph"></a>
## ProductGlyph

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 35행.

```tsx
export function ProductGlyph({product,size=32}:{product:ProductId;size?:number})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| product | ProductId | 예 | — |
| size | number &#124; undefined | 아니오 | 32 |

<a id="ProductSignature"></a>
## ProductSignature

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 39행.

```tsx
export function ProductSignature({product,name,subtitle}:{product:ProductId;name:string;subtitle?:string})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| product | ProductId | 예 | — |
| name | string | 예 | — |
| subtitle | string &#124; undefined | 아니오 | — |

<a id="ButtonProps"></a>
## ButtonProps

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 42행.

```tsx
export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    onClick?: () => void | Promise<void>;
    kind?: 'primary' | 'secondary' | 'danger' | 'quiet';
    busy?: boolean;
    selected?: boolean;
    onError?: (e: unknown) => void;
};
```

<a id="Button"></a>
## Button

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 49행.

```tsx
export function Button({ children, onClick, kind = 'primary', busy = false, selected, onError, disabled, ...props }: ButtonProps)
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| onError | (import("/Users/jaemankim/Desktop/privates/coding/in-c/node_modules/@types/react/index").ReactEventHandler<HTMLButtonElement> & ((e: unknown) => void)) &#124; undefined | 아니오 | — |
| onClick | (() => void &#124; Promise<void>) &#124; undefined | 아니오 | — |
| kind | "primary" &#124; "secondary" &#124; "danger" &#124; "quiet" &#124; undefined | 아니오 | 'primary' |
| busy | boolean &#124; undefined | 아니오 | false |
| selected | boolean &#124; undefined | 아니오 | — |

<a id="IconButton"></a>
## IconButton

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 74행.

```tsx
export function IconButton({ label, children, className = '', ...props }: ButtonProps & {
    label: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| onError | (import("/Users/jaemankim/Desktop/privates/coding/in-c/node_modules/@types/react/index").ReactEventHandler<HTMLButtonElement> & ((e: unknown) => void)) &#124; undefined | 아니오 | — |
| onClick | (() => void &#124; Promise<void>) &#124; undefined | 아니오 | — |
| kind | "primary" &#124; "secondary" &#124; "danger" &#124; "quiet" &#124; undefined | 아니오 | — |
| busy | boolean &#124; undefined | 아니오 | — |
| selected | boolean &#124; undefined | 아니오 | — |
| label | string | 예 | — |

<a id="Input"></a>
## Input

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 77행.

```tsx
export function Input({ label, error, help, clearable = false, onClear, ...props }: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    help?: string;
    clearable?: boolean;
    onClear?: () => void;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| error | string &#124; undefined | 아니오 | — |
| help | string &#124; undefined | 아니오 | — |
| clearable | boolean &#124; undefined | 아니오 | false |
| onClear | (() => void) &#124; undefined | 아니오 | — |

<a id="Search"></a>
## Search

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 87행.

```tsx
export function Search({ value, onChange, label = '검색' }: {
    value: string;
    onChange: (v: string) => void;
    label?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| value | string | 예 | — |
| onChange | (v: string) => void | 예 | — |
| label | string &#124; undefined | 아니오 | '검색' |

<a id="Choices"></a>
## Choices

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 92행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| options | readonly { value: T; label: string; }[] | 예 | — |
| selected | readonly T[] | 예 | — |
| onChange | (v: T[]) => void | 예 | — |
| multiple | boolean &#124; undefined | 아니오 | false |
| disabled | boolean &#124; undefined | 아니오 | false |

<a id="Toolbar"></a>
## Toolbar

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 105행.

```tsx
export function Toolbar({ children, label = '도구' }: {
    children: ReactNode;
    label?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| children | ReactNode | 예 | — |
| label | string &#124; undefined | 아니오 | '도구' |

<a id="Item"></a>
## Item

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 109행.

```tsx
export function Item({ title, subtitle, leading, actions, selected = false, selecting = false, disabled = false, onSelected, onOpen }: {
    title: string;
    subtitle?: string;
    leading?: ReactNode;
    actions?: ReactNode;
    selected?: boolean;
    selecting?: boolean;
    disabled?: boolean;
    onSelected?: (v: boolean) => void;
    onOpen?: () => void;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| title | string | 예 | — |
| subtitle | string &#124; undefined | 아니오 | — |
| leading | ReactNode | 아니오 | — |
| actions | ReactNode | 아니오 | — |
| selected | boolean &#124; undefined | 아니오 | false |
| selecting | boolean &#124; undefined | 아니오 | false |
| disabled | boolean &#124; undefined | 아니오 | false |
| onSelected | ((v: boolean) => void) &#124; undefined | 아니오 | — |
| onOpen | (() => void) &#124; undefined | 아니오 | — |

<a id="Banner"></a>
## Banner

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 122행.

```tsx
export function Banner({ children, kind = 'info', action }: {
    children: ReactNode;
    kind?: 'info' | 'success' | 'warning' | 'error';
    action?: ReactNode;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| children | ReactNode | 예 | — |
| kind | "info" &#124; "success" &#124; "warning" &#124; "error" &#124; undefined | 아니오 | 'info' |
| action | ReactNode | 아니오 | — |

<a id="StatePanel"></a>
## StatePanel

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 130행.

```tsx
export function StatePanel({ title, message, error = false, bachFace = false, action, diagnostic }: {
    title: string;
    message: string;
    error?: boolean;
    bachFace?: boolean;
    action?: ReactNode;
    diagnostic?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| title | string | 예 | — |
| message | string | 예 | — |
| error | boolean &#124; undefined | 아니오 | false |
| bachFace | boolean &#124; undefined | 아니오 | false |
| action | ReactNode | 아니오 | — |
| diagnostic | string &#124; undefined | 아니오 | — |

<a id="Progress"></a>
## Progress

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 140행.

```tsx
export function Progress({ value, label = '불러오는 중' }: {
    value?: number;
    label?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| value | number &#124; undefined | 아니오 | — |
| label | string &#124; undefined | 아니오 | '불러오는 중' |

<a id="SettingsRow"></a>
## SettingsRow

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 144행.

```tsx
export function SettingsRow({ label, description, children }: {
    label: string;
    description?: string;
    children: ReactNode;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| description | string &#124; undefined | 아니오 | — |
| children | ReactNode | 예 | — |

<a id="Dialog"></a>
## Dialog

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 149행.

```tsx
export function Dialog({ open, title, children, onClose, actions, sheet = false, busy = false }: {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
    actions?: ReactNode;
    sheet?: boolean;
    busy?: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| open | boolean | 예 | — |
| title | string | 예 | — |
| children | ReactNode | 예 | — |
| onClose | () => void | 예 | — |
| actions | ReactNode | 아니오 | — |
| sheet | boolean &#124; undefined | 아니오 | false |
| busy | boolean &#124; undefined | 아니오 | false |

<a id="NumberControl"></a>
## NumberControl

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 176행.

```tsx
export function NumberControl({ label, value, onChange, min, max, step = 1, unit = '', disabled = false }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    disabled?: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| value | number | 예 | — |
| onChange | (v: number) => void | 예 | — |
| min | number | 예 | — |
| max | number | 예 | — |
| step | number &#124; undefined | 아니오 | 1 |
| unit | string &#124; undefined | 아니오 | '' |
| disabled | boolean &#124; undefined | 아니오 | false |

<a id="PageControls"></a>
## PageControls

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 212행.

```tsx
export function PageControls({ page, count, onChange, performance = false }: {
    page: number;
    count?: number;
    onChange: (v: number) => void;
    performance?: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| page | number | 예 | — |
| count | number &#124; undefined | 아니오 | — |
| onChange | (v: number) => void | 예 | — |
| performance | boolean &#124; undefined | 아니오 | false |

<a id="Transport"></a>
## Transport

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 218행.

```tsx
export function Transport({ playing, onToggle, position = 0, duration, onSeek, onPrevious, onNext }: {
    playing: boolean;
    onToggle?: () => void;
    position?: number;
    duration?: number;
    onSeek?: (n: number) => void;
    onPrevious?: () => void;
    onNext?: () => void;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| playing | boolean | 예 | — |
| onToggle | (() => void) &#124; undefined | 아니오 | — |
| position | number &#124; undefined | 아니오 | 0 |
| duration | number &#124; undefined | 아니오 | — |
| onSeek | ((n: number) => void) &#124; undefined | 아니오 | — |
| onPrevious | (() => void) &#124; undefined | 아니오 | — |
| onNext | (() => void) &#124; undefined | 아니오 | — |

<a id="TunerStatus"></a>
## TunerStatus

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 227행.

```tsx
export type TunerStatus = 'flat' | 'centered' | 'sharp' | 'noSignal' | 'lowConfidence';
```

<a id="TunerMeter"></a>
## TunerMeter

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 228행.

```tsx
export function TunerMeter({ status, cents, note = 'A4' }: {
    status: TunerStatus;
    cents?: number;
    note?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| status | TunerStatus | 예 | — |
| cents | number &#124; undefined | 아니오 | — |
| note | string &#124; undefined | 아니오 | 'A4' |

<a id="BeatIndicator"></a>
## BeatIndicator

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 236행.

```tsx
export function BeatIndicator({ beats, currentBeat, running }: {
    beats: number;
    currentBeat: number;
    running: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| beats | number | 예 | — |
| currentBeat | number | 예 | — |
| running | boolean | 예 | — |

<a id="ServiceAvailability"></a>
## ServiceAvailability

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 244행.

```tsx
export type ServiceAvailability = 'available' | 'external' | 'install' | 'unavailable';
```

<a id="ServiceLink"></a>
## ServiceLink

소스: [packages/ddirori_web/src/index.tsx](../../../../packages/ddirori_web/src/index.tsx) · 조사 당시 246행.

```tsx
export function ServiceLink({product,name,description,availability='available',onOpen}:{product:ProductId;name:string;description:string;availability?:ServiceAvailability;onOpen?:()=>void})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| product | ProductId | 예 | — |
| name | string | 예 | — |
| description | string | 예 | — |
| availability | ServiceAvailability &#124; undefined | 아니오 | 'available' |
| onOpen | (() => void) &#124; undefined | 아니오 | — |

<a id="Option"></a>
## Option

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 19행.

```tsx
export type Option<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};
```

<a id="Group"></a>
## Group

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 24행.

```tsx
export function Group({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| children | ReactNode | 예 | — |

<a id="ToggleButton"></a>
## ToggleButton

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 37행.

```tsx
export function ToggleButton({
  selected,
  onSelected,
  ...props
}: Omit<ButtonProps, "onClick" | "selected"> & {
  selected: boolean;
  onSelected: (value: boolean) => void;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| kind | "primary" &#124; "secondary" &#124; "danger" &#124; "quiet" &#124; undefined | 아니오 | — |
| busy | boolean &#124; undefined | 아니오 | — |
| selected | boolean | 예 | — |
| onSelected | (value: boolean) => void | 예 | — |

<a id="Stack"></a>
## Stack

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 53행.

```tsx
export function Stack({
  children,
  gap = "md",
  inline = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  gap?: "sm" | "md" | "lg" | "xl";
  inline?: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| gap | "sm" &#124; "md" &#124; "lg" &#124; "xl" &#124; undefined | 아니오 | "md" |
| inline | boolean &#124; undefined | 아니오 | false |

<a id="Density"></a>
## Density

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 78행.

```tsx
export function Density({
  density,
  children,
  className = "",
}: {
  density: "comfortable" | "compact";
  children: ReactNode;
  className?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| density | "comfortable" &#124; "compact" | 예 | — |
| children | ReactNode | 예 | — |
| className | string &#124; undefined | 아니오 | "" |

<a id="Container"></a>
## Container

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 102행.

```tsx
export function Container(props: HTMLAttributes<HTMLDivElement>)
```

<a id="Field"></a>
## Field

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 105행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| help | string &#124; undefined | 아니오 | — |
| error | string &#124; undefined | 아니오 | — |
| required | boolean &#124; undefined | 아니오 | — |
| id | string | 예 | — |
| children | (props: { id: string; "aria-describedby"?: string; "aria-invalid": boolean; "aria-required"?: boolean; }) => ReactNode | 예 | — |

<a id="Textarea"></a>
## Textarea

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 145행.

```tsx
export function Textarea({
  label,
  help,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  help?: string;
  error?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| help | string &#124; undefined | 아니오 | — |
| error | string &#124; undefined | 아니오 | — |

<a id="Checkbox"></a>
## Checkbox

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 175행.

```tsx
export function Checkbox({
  label,
  indeterminate = false,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  indeterminate?: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| indeterminate | boolean &#124; undefined | 아니오 | false |

<a id="Switch"></a>
## Switch

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 194행.

```tsx
export function Switch({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & {
  label: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |

<a id="RadioGroup"></a>
## RadioGroup

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 207행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| options | readonly Option<T>[] | 예 | — |
| value | T | 예 | — |
| onChange | (value: T) => void | 예 | — |
| disabled | boolean &#124; undefined | 아니오 | false |

<a id="Select"></a>
## Select

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 240행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| options | readonly Option<T>[] | 예 | — |
| value | T | 예 | — |
| onChange | (value: T) => void | 예 | — |
| disabled | boolean &#124; undefined | 아니오 | — |
| help | string &#124; undefined | 아니오 | — |
| error | string &#124; undefined | 아니오 | — |
| required | boolean &#124; undefined | 아니오 | — |

<a id="Slider"></a>
## Slider

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 550행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| value | number | 예 | — |
| onChange | (v: number) => void | 예 | — |
| min | number &#124; undefined | 아니오 | 0 |
| max | number &#124; undefined | 아니오 | 100 |
| step | number &#124; undefined | 아니오 | 1 |
| disabled | boolean &#124; undefined | 아니오 | false |
| valueText | string &#124; undefined | 아니오 | — |

<a id="SegmentedControl"></a>
## SegmentedControl

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 599행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| options | readonly Option<T>[] | 예 | — |
| value | T | 예 | — |
| onChange | (value: T) => void | 예 | — |
| disabled | boolean &#124; undefined | 아니오 | false |

<a id="Tabs"></a>
## Tabs

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 650행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| options | readonly (Option<T> & { content: ReactNode; })[] | 예 | — |
| value | T | 예 | — |
| onChange | (v: T) => void | 예 | — |
| activation | "automatic" &#124; "manual" &#124; undefined | 아니오 | "automatic" |

<a id="Icon"></a>
## Icon

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 722행.

```tsx
export function Icon({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| children | ReactNode | 예 | — |
| label | string &#124; undefined | 아니오 | — |

<a id="Avatar"></a>
## Avatar

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 740행.

```tsx
export function Avatar({ name, src }: { name: string; src?: string })
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| name | string | 예 | — |
| src | string &#124; undefined | 아니오 | — |

<a id="Badge"></a>
## Badge

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 755행.

```tsx
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "error";
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| children | ReactNode | 예 | — |
| tone | "success" &#124; "warning" &#124; "error" &#124; "neutral" &#124; undefined | 아니오 | "neutral" |

<a id="StatusBadge"></a>
## StatusBadge

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 764행.

```tsx
export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "error";
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| tone | "success" &#124; "warning" &#124; "error" &#124; "neutral" &#124; undefined | 아니오 | "neutral" |

<a id="Divider"></a>
## Divider

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 780행.

```tsx
export function Divider()
```

<a id="List"></a>
## List

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 783행.

```tsx
export function List({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| children | ReactNode | 예 | — |
| label | string | 예 | — |

<a id="Card"></a>
## Card

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 796행.

```tsx
export function Card({ children }: { children: ReactNode })
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| children | ReactNode | 예 | — |

<a id="Section"></a>
## Section

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 799행.

```tsx
export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| title | string | 예 | — |
| children | ReactNode | 예 | — |
| action | ReactNode | 아니오 | — |

<a id="Accordion"></a>
## Accordion

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 820행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| title | string | 예 | — |
| children | ReactNode | 예 | — |
| open | boolean | 예 | — |
| onOpenChange | (value: boolean) => void | 예 | — |

<a id="TableColumn"></a>
## TableColumn

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 849행.

```tsx
export type TableColumn = { key: string; label: string; sortable?: boolean };
```

<a id="Table"></a>
## Table

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 850행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| columns | readonly TableColumn[] | 예 | — |
| rows | readonly { id: string; cells: Record<string, ReactNode>; }[] | 예 | — |
| sort | { key: string; direction: "ascending" &#124; "descending"; } &#124; undefined | 아니오 | — |
| onSort | ((key: string) => void) &#124; undefined | 아니오 | — |
| empty | string &#124; undefined | 아니오 | "표시할 항목이 없어요" |

<a id="InlineMessage"></a>
## InlineMessage

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 920행.

```tsx
export function InlineMessage({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| children | ReactNode | 예 | — |
| error | boolean &#124; undefined | 아니오 | false |

<a id="Toast"></a>
## Toast

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 937행.

```tsx
export function Toast({
  message,
  onClose,
  action,
}: {
  message: string;
  onClose: () => void;
  action?: ReactNode;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| message | string | 예 | — |
| onClose | () => void | 예 | — |
| action | ReactNode | 아니오 | — |

<a id="Skeleton"></a>
## Skeleton

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 956행.

```tsx
export function Skeleton({
  label = "불러오는 중",
  lines = 3,
}: {
  label?: string;
  lines?: number;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string &#124; undefined | 아니오 | "불러오는 중" |
| lines | number &#124; undefined | 아니오 | 3 |

<a id="ConfirmDialog"></a>
## ConfirmDialog

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 971행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| open | boolean | 예 | — |
| title | string | 예 | — |
| children | ReactNode | 예 | — |
| onClose | () => void | 예 | — |
| onConfirm | () => void &#124; Promise<void> | 예 | — |
| busy | boolean &#124; undefined | 아니오 | false |
| error | string &#124; undefined | 아니오 | — |

<a id="AppHeader"></a>
## AppHeader

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 1019행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| title | string | 예 | — |
| subtitle | string &#124; undefined | 아니오 | — |
| leading | ReactNode | 아니오 | — |
| actions | ReactNode | 아니오 | — |

<a id="Navigation"></a>
## Navigation

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 1047행.

```tsx
export function Navigation({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| children | ReactNode | 예 | — |

<a id="NavigationItem"></a>
## NavigationItem

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 1060행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| href | string | 예 | — |
| current | boolean &#124; undefined | 아니오 | false |
| icon | ReactNode | 아니오 | — |

<a id="Popover"></a>
## Popover

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 1084행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| triggerLabel | string &#124; undefined | 아니오 | — |
| open | boolean | 예 | — |
| onOpenChange | (v: boolean) => void | 예 | — |
| children | ReactNode | 예 | — |
| menu | boolean &#124; undefined | 아니오 | false |
| onKeyDown | ((e: KeyboardEvent<HTMLDivElement>) => void) &#124; undefined | 아니오 | — |

<a id="Menu"></a>
## Menu

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 1193행.

```tsx
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
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| label | string | 예 | — |
| items | readonly { id: string; label: string; disabled?: boolean; onSelect: () => void; }[] | 예 | — |

<a id="Tooltip"></a>
## Tooltip

소스: [packages/ddirori_web/src/basic.tsx](../../../../packages/ddirori_web/src/basic.tsx) · 조사 당시 1267행.

```tsx
export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
})
```

| 인자 | 타입 | 필수 | 인자 기본값 |
| --- | --- | --- | --- |
| text | string | 예 | — |
| children | ReactElement<{ "aria-describedby"?: string; }, string &#124; import("/Users/jaemankim/Desktop/privates/coding/in-c/node_modules/@types/react/index").JSXElementConstructor<any>> | 예 | — |

