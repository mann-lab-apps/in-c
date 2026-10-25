// Documentation fixtures: API type checking only, not product behavior.
import * as UI from '../../../../packages/ddirori_web/src/index';
import '../../../../packages/ddirori_web/src/styles.css';
export function CommonExamples() {
  return <div className="ddirori" data-theme="light" data-density="comfortable">
    {/* C01 */}
    <UI.Button onClick={() => {}}>저장</UI.Button>
    {/* C02 */}
    <UI.IconButton label="추가" onClick={() => {}}>＋</UI.IconButton>
    {/* C03 */}
    <UI.ToggleButton selected={true} onSelected={() => {}}>고정</UI.ToggleButton>
    {/* C04 */}
    <UI.Input label="제목" value="연습" onChange={() => {}} required />
    {/* C05 */}
    <UI.Checkbox label="선택" checked={false} onChange={() => {}} />
    {/* C06 */}
    <UI.RadioGroup label="다운로드" value="auto" options={[{value:"auto",label:"자동"}]} onChange={() => {}} />
    {/* C07 */}
    <UI.Switch label="알림" checked={false} onChange={() => {}} />
    {/* C08 */}
    <UI.Select label="정렬" value="recent" options={[{value:"recent",label:"최근순"}]} onChange={() => {}} />
    {/* C09 */}
    <UI.NumberControl label="빠르기" value={96} min={30} max={240} onChange={() => {}} unit="BPM" />
    {/* C10 */}
    <UI.Slider label="음량" value={50} valueText="50%" onChange={() => {}} />
    {/* C11 */}
    <UI.Choices label="필터" options={[{value:"fav",label:"즐겨찾기"}]} selected={[]} multiple onChange={() => {}} />
    {/* C12 */}
    <UI.SegmentedControl label="보기" options={[{value:"list",label:"목록"}]} value="list" onChange={() => {}} />
    {/* C13 */}
    <UI.Tabs label="자료" value="score" onChange={() => {}} options={[{value:"score",label:"악보",content:<p>자료</p>}]} />
    {/* C14 */}
    <UI.Text as="h3" variant="screenTitle">악보함</UI.Text>
    {/* C15 */}
    <UI.Icon label="악보">□</UI.Icon>
    {/* C16 */}
    <UI.Avatar name="김연주" />
    {/* C17 */}
    <UI.StatusBadge label="확인 필요" tone="warning" />
    {/* C18 */}
    <UI.Divider />
    {/* C19 */}
    <UI.List label="악보"><UI.Item title="연습곡" subtitle="작곡가" onOpen={() => {}} /></UI.List>
    {/* C20 */}
    <UI.Section title="최근"><UI.Card>자료</UI.Card></UI.Section>
    {/* C21 */}
    <UI.Accordion title="상세" open={false} onOpenChange={() => {}}>설명</UI.Accordion>
    {/* C22 */}
    <UI.Table label="자료" columns={[{key:"name",label:"이름"}]} rows={[]} />
    {/* C23 */}
    <UI.Banner kind="error" action={<UI.Button onClick={() => {}}>다시 시도</UI.Button>}>불러오지 못했어요</UI.Banner>
    {/* C24 */}
    <UI.StatePanel title="악보가 없어요" message="파일을 추가해 보세요" />
    {/* C25 */}
    <UI.Toast message="저장했어요" onClose={() => {}} />
    {/* C26 */}
    <UI.Progress label="가져오는 중" />
    {/* C27 */}
    <UI.ConfirmDialog open={false} title="삭제" onClose={() => {}} onConfirm={() => {}}>선택 자료를 삭제할까요?</UI.ConfirmDialog>
    {/* C28 */}
    <UI.Menu label="자료 메뉴" items={[{id:"open",label:"열기",onSelect:()=>{}}]} />
    {/* C29 */}
    <UI.Popover label="설정" open={false} onOpenChange={() => {}}><UI.Input label="이름" /></UI.Popover>
    {/* C30 */}
    <UI.Tooltip text="복사본 만들기"><UI.IconButton label="복사" onClick={() => {}}>＋</UI.IconButton></UI.Tooltip>
    {/* C31 */}
    <UI.Container><UI.Density density="compact"><UI.Group label="편집"><UI.Stack inline><span>자료</span></UI.Stack></UI.Group></UI.Density></UI.Container>
    {/* C32 */}
    <UI.Toolbar label="편집"><UI.Button onClick={() => {}}>저장</UI.Button></UI.Toolbar>
    {/* C33 */}
    <UI.AppHeader title="악보함" actions={<UI.Navigation label="서비스"><UI.NavigationItem label="악보" href="/score" current /></UI.Navigation>} />
    {/* C34 */}
    <UI.SettingsRow label="음량"><UI.Slider label="음량" value={50} onChange={() => {}} /></UI.SettingsRow>
    {/* C35 */}
    <UI.ServiceLink product="score" name="띠로리 스코어" description="악보와 연습" availability="unavailable" />
    {/* C36 */}
    <UI.PageControls page={1} count={12} onChange={() => {}} />
    {/* C37 */}
    <UI.Toolbar label="주석"><UI.Choices label="도구" options={[{value:"pen",label:"펜"}]} selected={["pen"]} onChange={() => {}} /></UI.Toolbar>
    {/* C38 */}
    <UI.Transport playing={false} duration={180} position={0} onToggle={() => {}} onSeek={() => {}} />
    {/* C39 */}
    <UI.TunerMeter status="noSignal" note="A4" />
  </div>;
}

// PAT-LIST: proposed app-side adapter, not a new shared public API.
// The host filters rows, owns the stable selected IDs, loading/error, and retries.
type ScoreRowView = {id: string; title: string; subtitle: string; available: boolean};
type ScoreLibraryProps = {
  query: string; rows: readonly ScoreRowView[]; selectedIds: ReadonlySet<string>;
  selecting: boolean; loading: boolean; error?: string;
  onQuery: (query: string) => void; onOpen: (id: string) => void;
  onSelected: (id: string, selected: boolean) => void; onRetry: () => void;
};
export function ScoreLibraryAdapter(p: ScoreLibraryProps) {
  return <UI.Stack>
    <UI.Search label="악보 검색" value={p.query} onChange={p.onQuery} />
    {p.loading ? <UI.Progress label="악보를 불러오는 중" /> : p.error ?
      <UI.StatePanel error title="악보를 불러오지 못했어요" message={p.error}
        action={<UI.Button onClick={p.onRetry}>다시 시도</UI.Button>} /> :
      p.rows.length === 0 ? <UI.StatePanel title={p.query ? "검색 결과가 없어요" : "악보가 없어요"}
        message={p.query ? "검색어를 바꿔 보세요" : "가져온 악보가 여기에 표시돼요"} /> :
      <UI.List label="악보">{p.rows.map(row => <UI.Item key={row.id}
        title={row.title} subtitle={row.available ? row.subtitle : "파일을 찾을 수 없어요"}
        disabled={!row.available} selecting={p.selecting} selected={p.selectedIds.has(row.id)}
        onOpen={() => p.onOpen(row.id)} onSelected={selected => p.onSelected(row.id, selected)} />)}</UI.List>}
  </UI.Stack>;
}

// Boundary-state wiring fixtures. Lifecycle and behavior need the acceptance tests.
export function BoundaryExamples() {
  return <>
    <UI.Field id="custom-title" label="사용자 입력" help="앱이 검증해요">
      {props => <input {...props} className="dd-input" defaultValue="연습곡" />}
    </UI.Field>
    <UI.Textarea label="메모" value="원문 유지" readOnly />
    <UI.Select label="자료 없음" value="" options={[]} onChange={() => {}} />
    <UI.Badge tone="neutral">12</UI.Badge>
    <UI.InlineMessage error>저장하지 못했어요</UI.InlineMessage>
    <UI.Skeleton />
    <UI.Dialog open={false} title="연습 설정" sheet onClose={() => {}}><p>앱 설정</p></UI.Dialog>
    <UI.Mark /><UI.Bach /><UI.ProductGlyph product="score" />
    <UI.ProductSignature product="score" name="띠로리 스코어" />
    <UI.BeatIndicator beats={4} currentBeat={1} running={false} />
    <UI.ServiceLink product="play" name="띠로리 플레이" description="음원 감상" availability="unavailable" />
  </>;
}
