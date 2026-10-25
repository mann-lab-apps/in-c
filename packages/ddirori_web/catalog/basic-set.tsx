import { useState, type ReactNode, type CSSProperties } from "react";
import { Info } from "lucide-react";
import * as UI from "../src";
import palettes from "../../../docs/brand/ddirori-design-system/palette-candidates.json";
import source from "../../../docs/brand/ddirori-design-system/tokens.json";
import "./basic-set.css";

type Theme = "light" | "dark";
const categories = [
  "전체",
  "실행",
  "입력·선택",
  "정보 표시",
  "피드백",
  "일시적 UI",
  "배치·탐색",
] as const;
const fixtures = [
  {
    id: "1",
    title: "평균율 클라비어곡집 제1권 전주곡과 푸가 다장조 BWV 846",
    composer: "J. S. Bach",
    pages: 6,
  },
  {
    id: "2",
    title: "Images, Book I — Reflets dans l’eau / 영상 제1집 · 물의 반영",
    composer: "C. Debussy",
    pages: 8,
  },
  { id: "3", title: "인벤션 1번 BWV 772", composer: "J. S. Bach", pages: 3 },
];
const option = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
function paletteStyle(key: string, theme: Theme): CSSProperties {
  const palette =
    palettes.variants.find((p) => p.key === key) ?? palettes.variants[0];
  const values = palette as unknown as Record<string, Record<string, string>>;
  return Object.fromEntries(
    Object.entries(source.themes[theme]).map(([key, value]) => {
      const [group, name] = value.startsWith("@")
        ? value.slice(1).split(".")
        : [];
      return [
        "--dd-" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
        group ? values[group][name] : value,
      ];
    }),
  ) as CSSProperties;
}
function Spec({
  name,
  category,
  description,
  code,
  children,
}: {
  name: string;
  category: string;
  description: string;
  code: string;
  children: ReactNode;
}) {
  return (
    <section className="set-spec" data-name={name} data-category={category}>
      <UI.Stack gap="lg">
        <div className="set-spec-heading">
          <UI.Text as="h2" variant="sectionTitle">
            {name}
          </UI.Text>
          <UI.Badge>구현</UI.Badge>
        </div>
        <UI.Text as="p" variant="description">
          {description}
        </UI.Text>
        <div className="set-example">{children}</div>
        <details>
          <summary>사용 코드</summary>
          <pre>
            <code>{code}</code>
          </pre>
        </details>
      </UI.Stack>
    </section>
  );
}
export function BasicSet() {
  const [theme, setTheme] = useState<Theme>("light"),
    [density, setDensity] = useState("comfortable"),
    [accent, setAccent] = useState("lime"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("전체");
  const [text, setText] = useState("오늘의 연습"),
    [checked, setChecked] = useState(true),
    [enabled, setEnabled] = useState(true),
    [radio, setRadio] = useState("자동"),
    [select, setSelect] = useState("최근순"),
    [segment, setSegment] = useState("목록"),
    [tab, setTab] = useState("악보"),
    [slider, setSlider] = useState(65),
    [bpm, setBpm] = useState(96),
    [accordion, setAccordion] = useState(false),
    [toast, setToast] = useState(false),
    [dialog, setDialog] = useState(false),
    [sheet, setSheet] = useState(false),
    [popover, setPopover] = useState(false),
    [notice, setNotice] = useState("선택한 동작이 여기에 표시됩니다."),
    [sort, setSort] = useState<"ascending" | "descending">("ascending"),
    [composite, setComposite] = useState("악보함");
  const specs: {
    name: string;
    category: string;
    description: string;
    code: string;
    children: ReactNode;
  }[] = [
    {
      name: "Button · IconButton · Toggle · Group",
      category: "실행",
      description:
        "행동의 우선순위를 구분합니다. 선택과 포커스는 별개이며 로딩 중 중복 실행은 차단합니다.",
      code: '<Group label="문서"><Button onClick={save}>저장</Button>\n<ToggleButton selected={pinned} onSelected={setPinned}>고정</ToggleButton></Group>',
      children: (
        <UI.Stack>
          <UI.Group label="실행 상태">
            <UI.Button onClick={() => setToast(true)}>저장</UI.Button>
            <UI.Button
              kind="secondary"
              onClick={() => setNotice("사본 만들기")}
            >
              사본 만들기
            </UI.Button>
            <UI.Button kind="quiet" onClick={() => setNotice("취소")}>
              취소
            </UI.Button>
            <UI.Button kind="danger" onClick={() => setDialog(true)}>
              삭제
            </UI.Button>
            <UI.IconButton
              label="악보 추가"
              onClick={() => setNotice("악보 추가")}
            >
              ＋
            </UI.IconButton>
          </UI.Group>
          <UI.Group label="선택과 대기">
            <UI.ToggleButton
              kind="secondary"
              selected={checked}
              onSelected={setChecked}
            >
              즐겨찾기
            </UI.ToggleButton>
            <UI.Button busy onClick={() => {}}>
              저장
            </UI.Button>
            <UI.Button disabled onClick={() => {}}>
              실행 불가
            </UI.Button>
          </UI.Group>
          <UI.Text variant="caption">
            대기·비활성은 고정 상태 예제입니다. 나머지는 직접 조작할 수 있어요.
          </UI.Text>
        </UI.Stack>
      ),
    },
    {
      name: "Field · TextInput · Textarea · Search",
      category: "입력·선택",
      description:
        "레이블은 항상 보이고 설명·오류가 입력과 연결됩니다. 읽기전용 값은 선택해 복사할 수 있습니다.",
      code: '<Input label="이름" value={name} onChange={e => setName(e.target.value)} required />\n<Textarea label="메모" value={memo} onChange={...} />',
      children: (
        <div className="set-two">
          <UI.Input
            label="연습 이름"
            value={text}
            onChange={(e) => setText(e.target.value)}
            help="나중에 바꿀 수 있어요"
            required
          />
          <UI.Input
            label="입력 오류 예제"
            value=""
            onChange={() => {}}
            error="이름을 입력해 주세요"
          />
          <UI.Textarea
            label="메모"
            value={text}
            onChange={(e) => setText(e.target.value)}
            help="한국어 조합을 그대로 입력합니다"
          />
          <UI.Stack>
            <UI.Input label="읽기전용" value="BWV 846" readOnly clearable />
            <UI.Search label="작품 검색 예제" value={text} onChange={setText} />
          </UI.Stack>
        </div>
      ),
    },
    {
      name: "Checkbox · RadioGroup · Switch · Select",
      category: "입력·선택",
      description:
        "여러 항목 선택, 한 값 선택, 즉시 설정 변경을 서로 다른 조작으로 표현합니다.",
      code: '<Checkbox label="선택" checked={selected} onChange={...} />\n<Select label="정렬" options={options} value={sort} onChange={setSort} />',
      children: (
        <div className="set-two">
          <UI.Stack>
            <UI.Checkbox
              label="오프라인에서 보관"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <UI.Checkbox
              label="일부 선택"
              checked={false}
              indeterminate
              onChange={() => {}}
            />
            <UI.Checkbox label="비활성 선택" checked disabled />
            <UI.Switch
              label="연습 알림"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </UI.Stack>
          <UI.Stack>
            <UI.RadioGroup
              label="다운로드"
              value={radio}
              options={[
                ...option(["자동", "직접 선택"]),
                { value: "준비 중", label: "준비 중", disabled: true },
              ]}
              onChange={setRadio}
            />
            <UI.Select
              label="정렬"
              options={option(["최근순", "이름순"])}
              value={select}
              onChange={setSelect}
            />
          </UI.Stack>
        </div>
      ),
    },
    {
      name: "Number · Slider · FilterChip · Segmented",
      category: "입력·선택",
      description:
        "값 선택과 다중 필터를 구분합니다. 분할 선택은 방향키·Home·End로 조작합니다.",
      code: '<SegmentedControl label="보기" options={options} value={view} onChange={setView} />',
      children: (
        <div className="set-two">
          <UI.NumberControl
            label="빠르기"
            unit="BPM"
            value={bpm}
            min={40}
            max={240}
            onChange={setBpm}
          />
          <UI.Stack>
            <UI.Slider
              label="음량 표시 예제"
              value={slider}
              onChange={setSlider}
              valueText={`${slider}%`}
            />
            <UI.Choices
              label="필터"
              options={option(["즐겨찾기", "다운로드"])}
              selected={checked ? ["즐겨찾기"] : []}
              multiple
              onChange={(v) => setChecked(v.includes("즐겨찾기"))}
            />
            <UI.SegmentedControl
              label="보기"
              options={[
                ...option(["목록", "격자"]),
                { value: "준비", label: "준비 중", disabled: true },
              ]}
              value={segment}
              onChange={setSegment}
            />
          </UI.Stack>
        </div>
      ),
    },
    {
      name: "Tabs · Panel",
      category: "입력·선택",
      description:
        "같은 위계의 콘텐츠 영역을 전환합니다. 방향키로 이동하고 비활성 항목을 건너뜁니다.",
      code: '<Tabs label="자료" value={tab} onChange={setTab} options={[{value:"score",label:"악보",content:<Library/>}]} />',
      children: (
        <UI.Tabs
          label="자료 분류"
          value={tab}
          onChange={setTab}
          options={[
            {
              value: "악보",
              label: "악보",
              content: <UI.Text as="p">연습할 악보를 골라보세요.</UI.Text>,
            },
            {
              value: "녹음",
              label: "녹음",
              content: (
                <UI.Text as="p">같은 곡의 서로 다른 해석을 들어보세요.</UI.Text>
              ),
            },
            {
              value: "협업",
              label: "협업 · 준비 중",
              disabled: true,
              content: null,
            },
          ]}
        />
      ),
    },
    {
      name: "Typography · Icon · Avatar · Badge",
      category: "정보 표시",
      description:
        "제목·본문·설명을 역할로 구분합니다. 프로필 이미지는 실패해도 이름을 표시합니다.",
      code: '<Text as="h2" variant="sectionTitle">최근 연습</Text>\n<Avatar name="김연주" /> <StatusBadge label="준비됨" tone="success" />',
      children: (
        <UI.Stack>
          <UI.Text as="h3" variant="screenTitle">
            음악을 위한 명확한 도구
          </UI.Text>
          <UI.Text as="p">
            긴 한국어와 English titles가 자연스럽게 이어지는 본문입니다.
          </UI.Text>
          <UI.Text variant="description">
            서로 다른 연주와 시도를 발견하세요.
          </UI.Text>
          <UI.Group label="정보 표시">
            <UI.Icon label="연주">♪</UI.Icon>
            <UI.Avatar name="김연주" />
            <UI.Avatar name="이미지 오류" src="data:image/png;base64,invalid" />
            <UI.Badge>12</UI.Badge>
            <UI.StatusBadge tone="success" label="준비됨" />
            <UI.StatusBadge tone="warning" label="확인 필요" />
            <UI.StatusBadge tone="error" label="파일 없음" />
          </UI.Group>
        </UI.Stack>
      ),
    },
    {
      name: "List · Item · Divider · Card · Section",
      category: "정보 표시",
      description:
        "목록은 평면으로 연결하고 독립 묶음만 카드로 구분합니다. 제목과 보조 행동은 별도 조작입니다.",
      code: '<List label="악보"><Item title={title} flat onOpen={open} trailing={<IconButton .../>}/></List>',
      children: (
        <UI.Section title="최근 연습">
          <UI.List label="최근 악보">
            {fixtures.slice(0, 2).map((f) => (
              <UI.Item
                key={f.id}
                flat
                title={f.title}
                subtitle={f.composer}
                leading={<UI.Mark size={24} />}
                onOpen={() => setNotice(f.title)}
                selecting
                selected={checked}
                onSelected={setChecked}
                trailing={
                  <UI.IconButton
                    label={f.title + " 정보"}
                    onClick={() => setNotice("작품 정보")}
                  >
                    <Info size={20} aria-hidden="true" />
                  </UI.IconButton>
                }
              />
            ))}
          </UI.List>
          <UI.Divider />
          <UI.Card>
            <UI.Text>파일과 연습 기록은 제품에서 연결합니다.</UI.Text>
          </UI.Card>
        </UI.Section>
      ),
    },
    {
      name: "Accordion · Table",
      category: "정보 표시",
      description:
        "부가 정보는 펼쳐 읽고, 비교할 데이터는 표로 보여줍니다. 정렬은 호스트가 값을 갱신합니다.",
      code: '<Table label="파일" columns={columns} rows={rows} sort={sort} onSort={sortRows} />',
      children: (
        <UI.Stack>
          <UI.Accordion
            title="파일 정보"
            open={accordion}
            onOpenChange={setAccordion}
          >
            <UI.Text>원본 파일은 이 카탈로그에서 읽지 않습니다.</UI.Text>
          </UI.Accordion>
          <UI.Table
            label="연습 자료"
            columns={[
              { key: "title", label: "자료", sortable: true },
              { key: "pages", label: "페이지" },
            ]}
            sort={{ key: "title", direction: sort }}
            onSort={() =>
              setSort(sort === "ascending" ? "descending" : "ascending")
            }
            rows={[...fixtures]
              .sort(
                (a, b) =>
                  (sort === "ascending" ? 1 : -1) *
                  a.title.localeCompare(b.title),
              )
              .map((f) => ({
                id: f.id,
                cells: { title: f.title, pages: f.pages },
              }))}
          />
          <UI.Table
            label="빈 표 예제"
            columns={[{ key: "title", label: "자료" }]}
            rows={[]}
          />
        </UI.Stack>
      ),
    },
    {
      name: "Banner · InlineMessage · Empty / Error",
      category: "피드백",
      description:
        "오류에는 복구 행동을 함께 제공합니다. 캐릭터는 보조 위치에만 사용합니다.",
      code: '<Banner kind="error" action={<Button onClick={retry}>다시 시도</Button>}>읽지 못했어요</Banner>',
      children: (
        <UI.Stack>
          <UI.Banner>샘플 데이터로 구성한 화면입니다.</UI.Banner>
          <UI.Banner
            kind="error"
            action={
              <UI.Button
                kind="secondary"
                onClick={() => setNotice("다시 시도 요청")}
              >
                다시 시도
              </UI.Button>
            }
          >
            파일을 읽지 못했어요.
          </UI.Banner>
          <UI.InlineMessage>설정은 언제든 바꿀 수 있어요.</UI.InlineMessage>
          <UI.StatePanel
            title="첫 악보를 추가해보세요"
            message="오늘 연습할 곡부터 시작해요."
            bachFace
            action={
              <UI.Button onClick={() => setNotice("파일 선택 요청")}>
                악보 추가
              </UI.Button>
            }
          />
        </UI.Stack>
      ),
    },
    {
      name: "Toast · Progress · Skeleton",
      category: "피드백",
      description:
        "진행률은 실제 값을 사용합니다. 알림은 포커스를 훔치지 않으며 닫을 수 있습니다.",
      code: '<Progress value={0.6} label="자료 준비 60%"/>\n<Skeleton lines={3}/> <Toast message="저장했어요" onClose={dismiss}/>',
      children: (
        <UI.Stack>
          <UI.Group label="진행 상태">
            <UI.Progress value={0.6} label="자료 준비 60%" />
            <UI.Progress label="자료를 읽는 중" />
          </UI.Group>
          <UI.Skeleton />
          <UI.Button kind="secondary" onClick={() => setToast(true)}>
            저장 알림 보기
          </UI.Button>
          {toast ? (
            <UI.Toast
              message="예제 설정을 저장했어요"
              onClose={() => setToast(false)}
            />
          ) : null}
        </UI.Stack>
      ),
    },
    {
      name: "Dialog · Sheet · Menu · Popover · Tooltip",
      category: "일시적 UI",
      description:
        "메뉴는 명령, 팝오버는 보조 내용입니다. Escape로 닫고 조작한 곳으로 돌아갑니다.",
      code: '<Menu label="더 보기" items={items}/>\n<Popover label="설정" open={open} onOpenChange={setOpen}>...</Popover>',
      children: (
        <UI.Stack>
          <UI.Group label="일시적 UI">
            <UI.Button kind="secondary" onClick={() => setDialog(true)}>
              삭제 확인
            </UI.Button>
            <UI.Button kind="secondary" onClick={() => setSheet(true)}>
              설정 시트
            </UI.Button>
            <UI.Menu
              label="자료 메뉴"
              items={[
                {
                  id: "open",
                  label: "열기",
                  onSelect: () => setNotice("열기"),
                },
                {
                  id: "export",
                  label: "내보내기 · 준비 중",
                  disabled: true,
                  onSelect: () => {},
                },
                {
                  id: "copy",
                  label: "사본 만들기",
                  onSelect: () => setNotice("사본 만들기"),
                },
              ]}
            />
            <UI.Popover
              label="표시 설정"
              open={popover}
              onOpenChange={setPopover}
            >
              <UI.Stack>
                <UI.Input
                  label="표시 이름"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <UI.Button onClick={() => setPopover(false)}>적용</UI.Button>
              </UI.Stack>
            </UI.Popover>
            <UI.Tooltip text="원본을 유지하고 사본을 만듭니다.">
              <UI.Button kind="quiet" onClick={() => setNotice("사본 만들기")}>
                사본 안내
              </UI.Button>
            </UI.Tooltip>
          </UI.Group>
          <UI.InlineMessage>{notice}</UI.InlineMessage>
        </UI.Stack>
      ),
    },
    {
      name: "Layout · Header · Navigation · Services",
      category: "배치·탐색",
      description:
        "같은 제품군의 이름과 조작 문법을 유지합니다. 실제 연결 상태는 호스트가 판단합니다.",
      code: '<AppHeader title="나의 악보함" actions={<Button .../>}/>\n<Navigation label="자료"><NavigationItem href="#library" label="악보" current/></Navigation>',
      children: (
        <UI.Stack>
          <UI.AppHeader
            title="나의 악보함"
            subtitle="연습할 곡을 가장 편한 자리에"
            leading={<UI.Mark size={32} />}
            actions={
              <UI.Button onClick={() => setNotice("추가 요청")}>추가</UI.Button>
            }
          />
          <UI.Navigation label="예제 탐색">
            <UI.NavigationItem href="#examples" label="악보" current />
            <UI.NavigationItem href="#examples" label="녹음" />
          </UI.Navigation>
          <UI.Toolbar label="문서 도구">
            <UI.IconButton label="실행 취소" disabled>
              ↶
            </UI.IconButton>
            <UI.Button kind="quiet" onClick={() => setNotice("저장")}>
              저장
            </UI.Button>
          </UI.Toolbar>
          <UI.ServiceLink
            product="studio"
            name="띠로리 스튜디오"
            description="악보를 만드는 도구"
            availability="unavailable"
          />
        </UI.Stack>
      ),
    },
  ];
  const filtered = specs.filter(
    (s) =>
      (category === "전체" || s.category === category) &&
      `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className="ddirori set-root"
      data-theme={theme}
      data-density={density}
      style={paletteStyle(accent, theme)}
    >
      <UI.Container>
        <UI.Stack gap="xl">
          <a href="?foundations">← 시스템 기준</a>
          <UI.AppHeader
            title="기본 컴포넌트"
            subtitle="띠로리의 실제 공통 구현 · React / Flutter 디자인 세트"
            leading={<UI.Mark size={40} />}
          />
          <div className="set-controls">
            <UI.Select
              label="테마"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: "밝은 화면" },
                { value: "dark", label: "어두운 화면" },
              ]}
            />
            <UI.Select
              label="밀도"
              value={density}
              onChange={setDensity}
              options={option(["comfortable", "compact"])}
            />
            <UI.Select
              label="강조색 · 임시"
              value={accent}
              onChange={setAccent}
              options={palettes.variants.map((p) => ({
                value: p.key,
                label: p.name,
              }))}
            />
            <UI.Search
              label="컴포넌트 검색"
              value={query}
              onChange={setQuery}
            />
          </div>
          <UI.SegmentedControl
            label="컴포넌트 분류"
            value={category}
            onChange={setCategory}
            options={option([...categories])}
          />
          <UI.Text variant="description">
            기본 화면은 중립색을 유지합니다. 실제 조작으로 선택·포커스·오류를
            확인하세요. 필수 설명은 툴팁 밖에서도 제공하며 메뉴는 방향키와
            Home/End로 이동합니다.
          </UI.Text>
          <div>
            {filtered.map((s) => (
              <Spec key={s.name} {...s} />
            ))}
            {!filtered.length ? (
              <UI.StatePanel
                title="검색 결과가 없어요"
                message="다른 컴포넌트 이름으로 검색해보세요."
              />
            ) : null}
          </div>
          <section id="examples">
            <UI.Section title="화면으로 조합해보기">
              <UI.Text as="p" variant="description">
                공개 컴포넌트를 조합한 독립 예제입니다. 실제 파일·재생·편집
                엔진은 연결하지 않았습니다.
              </UI.Text>
              <UI.Tabs
                label="조합 화면"
                value={composite}
                onChange={setComposite}
                options={["악보함", "작품·녹음", "설정", "사보 패널"].map(
                  (value) => ({
                    value,
                    label: value,
                    content: <Composite kind={value} />,
                  }),
                )}
              />
            </UI.Section>
          </section>
          <UI.Divider />
          <UI.Text variant="caption">
            Flutter는 네이티브 입력·메뉴·표와 공통 패키지를 합성합니다. Figma
            대응 명세는 별도 문서이며 실제 Figma 라이브러리 제작을 의미하지
            않습니다.
          </UI.Text>
        </UI.Stack>
      </UI.Container>
      <UI.ConfirmDialog
        open={dialog}
        title="예제 삭제"
        onClose={() => setDialog(false)}
        onConfirm={() => {
          setNotice("예제 삭제 요청");
          setDialog(false);
        }}
      >
        <UI.Text>
          카탈로그 상태만 변경하며 실제 파일을 삭제하지 않습니다.
        </UI.Text>
      </UI.ConfirmDialog>
      <UI.Dialog
        open={sheet}
        title="연습 설정"
        sheet
        onClose={() => setSheet(false)}
        actions={<UI.Button onClick={() => setSheet(false)}>완료</UI.Button>}
      >
        <UI.Input
          label="연습 이름"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </UI.Dialog>
    </div>
  );
}
function Composite({ kind }: { kind: string }) {
  const [query, setQuery] = useState(""),
    [favorites, setFavorites] = useState<string[]>([]),
    [selection, setSelection] = useState<string[]>([]),
    [name, setName] = useState("나의 연습"),
    [memo, setMemo] = useState(""),
    [error, setError] = useState(""),
    [notify, setNotify] = useState(true),
    [mode, setMode] = useState("자동"),
    [instrument, setInstrument] = useState("피아노"),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState(""),
    [bpm, setBpm] = useState(96),
    [voice, setVoice] = useState("성부 1"),
    [playing, setPlaying] = useState(false);
  const visible = fixtures.filter(
    (f) =>
      f.title.toLowerCase().includes(query.toLowerCase()) &&
      (!favorites.length || f.id === "1"),
  );
  if (kind === "설정")
    return (
      <UI.Stack className="set-settings">
        <UI.Input
          label="프로필 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          required
        />
        <UI.Textarea
          label="연습 메모"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <UI.Switch
          label="연습 알림"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
        <UI.RadioGroup
          label="자료 다운로드"
          options={option(["자동", "직접 선택"])}
          value={mode}
          onChange={setMode}
        />
        <UI.Select
          label="기본 악기"
          options={option(["피아노", "현악", "관악"])}
          value={instrument}
          onChange={setInstrument}
        />
        <UI.Group label="설정 행동">
          <UI.Button
            onClick={() => {
              if (!name.trim()) {
                setError("이름을 입력해 주세요");
                return;
              }
              setError("");
              setConfirm(true);
            }}
          >
            변경 저장
          </UI.Button>
        </UI.Group>
        <UI.Dialog
          open={confirm}
          title="설정을 저장할까요?"
          onClose={() => setConfirm(false)}
          actions={
            <UI.Button
              onClick={() => {
                setMessage("예제 설정을 저장했어요");
                setConfirm(false);
              }}
            >
              저장
            </UI.Button>
          }
        >
          <UI.Text>
            {name} · {instrument}
          </UI.Text>
        </UI.Dialog>
        {message ? (
          <UI.Toast message={message} onClose={() => setMessage("")} />
        ) : null}
      </UI.Stack>
    );
  if (kind === "사보 패널")
    return (
      <UI.Density className="set-tool-panel" density="compact">
        <UI.Stack>
          <UI.Toolbar label="사보 명령">
            <UI.Tooltip text="이 예제는 편집 엔진에 연결되어 있지 않습니다.">
              <UI.Button
                kind="quiet"
                onClick={() => setMessage("실행 취소 요청")}
              >
                실행 취소
              </UI.Button>
            </UI.Tooltip>
            <UI.Button onClick={() => setMessage("저장 요청")}>저장</UI.Button>
          </UI.Toolbar>
          <UI.SegmentedControl
            label="성부"
            options={option(["성부 1", "성부 2", "성부 3"])}
            value={voice}
            onChange={setVoice}
          />
          <UI.NumberControl
            label="빠르기"
            value={bpm}
            onChange={setBpm}
            min={40}
            max={240}
            unit="BPM"
          />
          <UI.Select
            label="음가"
            options={option(["4분음표", "8분음표", "16분음표"])}
            value={instrument === "피아노" ? "4분음표" : instrument}
            onChange={setInstrument}
          />
          <UI.InlineMessage>
            {message || "선택한 도구의 속성을 표시합니다."}
          </UI.InlineMessage>
        </UI.Stack>
      </UI.Density>
    );
  return (
    <UI.Stack>
      <UI.AppHeader
        title={kind === "악보함" ? "나의 악보함" : "작품과 녹음"}
        actions={
          <UI.Button onClick={() => setMessage("자료 추가 요청")}>
            자료 추가
          </UI.Button>
        }
      />
      <UI.Search label="작품 검색" value={query} onChange={setQuery} />
      <UI.Choices
        label="자료 필터"
        options={option(["즐겨찾기"])}
        selected={favorites}
        onChange={setFavorites}
      />
      {visible.length ? (
        <UI.List label="자료 목록">
          {visible.map((f) => (
            <UI.Item
              key={f.id}
              title={f.title}
              subtitle={`${f.composer} · ${kind === "악보함" ? f.pages + "페이지" : "연주자 김연주 · 2024 · 로컬 녹음"}`}
              selecting
              selected={selection.includes(f.id)}
              onSelected={(selected) =>
                setSelection((v) =>
                  selected ? [...v, f.id] : v.filter((id) => id !== f.id),
                )
              }
              onOpen={() => setMessage(f.title + " 선택")}
              leading={<UI.Mark size={24} />}
              actions={
                <>
                  <UI.StatusBadge
                    label={kind === "악보함" ? "준비됨" : "로컬 파일"}
                    tone="success"
                  />
                  <UI.Menu
                    label={f.title + " 메뉴"}
                    items={[
                      {
                        id: "info",
                        label: "정보 보기",
                        onSelect: () => setMessage(f.title + " 정보"),
                      },
                      {
                        id: "copy",
                        label: "사본 만들기",
                        onSelect: () => setMessage("사본 요청"),
                      },
                    ]}
                  />
                </>
              }
            />
          ))}
        </UI.List>
      ) : (
        <UI.StatePanel
          title="검색 결과가 없어요"
          message="검색어나 필터를 바꿔보세요."
          action={
            <UI.Button
              onClick={() => {
                setQuery("");
                setFavorites([]);
              }}
            >
              검색 초기화
            </UI.Button>
          }
        />
      )}
      <UI.InlineMessage>
        {selection.length}개 선택 · {message || "샘플 자료"}
      </UI.InlineMessage>
      {kind === "작품·녹음" ? (
        <UI.Transport playing={playing} onToggle={() => setPlaying(!playing)} />
      ) : null}
    </UI.Stack>
  );
}
