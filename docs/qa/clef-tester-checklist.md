# Clef & Staff 외부 테스터 체크리스트

작성일: 2026-08-26

## 시작 전

- v1 RC 전체 실행 순서와 기록 양식은 `docs/qa/clef-v1-rc-qa-plan.md`를 먼저 확인한다.
- 실기기/외부장비 당일 실행표는 `docs/qa/clef-v1-device-qa-runbook.md`를 사용한다.
- 설치 후 런처/앱 이름이 `Clef & Staff`로 보이는지 확인한다.
- 앱 첫 화면 오른쪽 위 `테스트 정보`에서 앱 이름, 버전/build를 확인한다.
- 현재 소스 RC 후보는 `1.0.0+20`이다. 내부테스트 설치본은 Play Console 업로드 시점의 buildCode를
  함께 기록한다.
- TestFlight 또는 APK 설치 방식과 기기명/OS 버전을 기록한다.
- 가능하면 평소 쓰는 텍스트 PDF 악보 1개, 스캔/이미지 악보 1개, 큰 PDF 1개를 준비한다.
- iPad/TestFlight와 Android 태블릿/APK를 모두 테스트할 수 있으면 화면 크기별 표시 차이를 함께 기록한다.

## 필수 테스트

15분 안에 아래 흐름만 먼저 확인한다.

1. 빈 라이브러리에서 `악보 추가`로 PDF를 가져온다.
2. 가져온 직후 `정보 편집` 안내가 보이면 제목, 작곡가, 태그, 컬렉션, 그룹, 별점을 입력한다.
   사용자 필드의 `조성`/`장르`/`난이도`/`편성` 추천 칩으로 자주 쓰는 정보를 바로 추가하고,
   홈의 빠른 필터에서 같은 값으로 다시 찾을 수 있는지도 확인한다.
3. 정보를 아직 입력하지 않은 악보가 홈 `정리 필요` rail에 보이고 `정보 편집`으로 바로 열리는지
   확인한다.
4. 라이브러리 검색/정렬/필터로 방금 입력한 악보를 다시 찾는다. 검색어와 필터를 함께 적용했을 때
   홈 상단 `현재 조건` 칩으로 활성 조건이 보이고, 개별 삭제 또는 `전체 초기화`로 풀리는지 확인한다.
   컬렉션/그룹/사용자 필드 값이 많을 때는 `더 보기`로 숨겨진 값도 선택할 수 있는지 확인한다.
5. 같은 PDF를 다시 가져왔을 때 새 카드가 조용히 중복 생성되지 않고 기존 악보를 연다는 안내가 보이는지
   확인한다.
6. PDF를 열고 이전/다음 페이지, 세로 스크롤, 1페이지 보기 중 하나를 확인한다. 세로모드에서는
   상단 toolbar를 좌우로 밀어 `필기 모드`, `페이지 정리`, `공연 설정`, `공연 모드`에 접근한다.
   viewer의 `악보 정보 편집`에서 제목/작곡가/태그/컬렉션/그룹/별점/추천 사용자 필드를 바로 수정할 수 있는지도
   확인한다.
7. 펜/형광펜/크레셴도/디미누엔도/오선/격자와 `Fine`, `D.C.`, `D.S.`, `Coda`, `rit.`, `accel.`
   같은 스탬프 중 몇 가지를 짧게 필기하고 앱을 다시 열어 복원되는지 확인한다.
8. 텍스트 주석을 하나 추가하고 다시 탭해 수정 또는 삭제한다.
9. 북마크를 추가하고 북마크 목록에서 해당 페이지로 이동한다. 긴 PDF/songbook은 가능하면
   `CSV 북마크 가져오기`로 `page,label` 또는 `label,page` CSV가 잘 병합되는지도 확인한다.
10. 튜너를 열었을 때 시작 버튼 없이 확대된 pitch history chart 안에 현재 음/cents/frequency/signal이 먼저 보이고, 기타 줄 맞춤이나 악기별
   preset 선택 없이 가장 가까운 음을 바로 표시하는지 확인한다.
11. 조용한 상태, 440/441/442Hz A4 quick action, 440Hz reference tone, 실제 악기 입력에서 sharp/flat
   표기, pitch history의 최신 값 왼쪽 고정/오래된 값 오른쪽 흐름/낮음·높음 방향, note 변경 시 선 끊김, `소리가 작거나 주변 소음이 큽니다`,
   `음을 잡는 중`, `조금 낮아요`, `조금 높아요`, `맞았습니다` 상태를 확인한다.
12. `세부 설정` 아래에서 sharp/flat 표기, 감지 엔진, A4 slider/history, 기준음/드론이 접근 가능한지
   확인한다. 기타 줄 맞춤, 악기별 preset, custom target/preset, target lock은 v1 UI에 보이지 않아야 한다.
13. 가능하면 Piascore 또는 무료 상용 튜너앱과 A4/E2/A2/C4/G4/C6 cents 값을 비교해 차이를 기록한다.
14. 메트로놈을 열어 BPM/박자, 8분/3연/16분 나눔, 0/1/2마디 카운트인, 박별 강세 패턴,
    Tap tempo, start/stop을 확인한다. 값을 바꾼 뒤 같은 악보를 다시 열었을 때 메트로놈 설정이
    유지되는지 확인한다. 같은 악보를 세트리스트 안에서 열었다면 세트리스트별 값으로 따로 저장되는지
    확인한다.
    기본값은 `소리 켬`이어야 하며, `tick 소리`를 끄면 화면 박자 표시만 사용하는 `시각만` 상태로
    이해되는지 확인한다.
15. 메트로놈/튜너 sheet의 작은 창 버튼으로 악보 위 mini panel을 띄우고 닫을 수 있는지 확인한다.
    메트로놈 mini panel은 시작/정지 버튼과 시각 박자 표시가 바로 보여야 하며, 소리가 작거나
    들리지 않는 환경에서도 현재 박을 눈으로 따라갈 수 있어야 한다.
16. viewer 첫 진입에서 왼쪽 `이전`, 가운데 `메뉴`, 오른쪽 `다음` tap zone 안내가 보이는지 확인한다.
    안내가 사라진 뒤 `터치 영역 다시 보기`를 눌러 같은 안내를 다시 볼 수 있는지도 확인한다.
17. 자동 스크롤을 시작한 뒤 수동 페이지 이동 시 정지되는지 확인한다.
18. `테스트 정보`에서 `피드백 템플릿 복사`를 눌러 양식이 복사되는지 확인한다.
19. 새 라이브러리를 만들 때 기존 이름을 다시 입력하면 중복 안내가 뜨고 `열기` action으로 기존
    라이브러리에 진입하는지 확인한다.

## 선택 테스트

시간이 있으면 아래 항목을 추가로 확인한다.

1. JPG/PNG 이미지를 PDF 악보로 묶어 등록한다.
2. `악보 추가`에서 단일 PDF, 여러 PDF, 이미지 PDF를 가져오며 세트리스트에 추가하는 action이 보이는지 확인한다.
3. 악보 카드를 길게 눌러 일괄 선택 모드로 들어가고, 선택 상태가 체크/색상/선택 수로 분명한지
   확인한다. `현재 목록 전체 선택`과 `현재 목록 선택 해제`가 기대대로 동작하는지도 확인한다.
4. 여러 악보를 일괄 선택해 기존 또는 새 세트리스트에 한 번에 추가한다. 이미 들어간 악보가 있으면
   중복 skip 안내가 이해되는지 확인하고, 완료 안내의 `열기`로 세트리스트 상세를 바로 확인한다.
5. 같은 이름의 세트리스트를 만들거나 이름 변경하려 할 때 새 항목이 조용히 생기지 않고 중복 안내가
   보이는지 확인한다.
6. 빈 세트리스트 상세 화면에서 `악보 추가`가 바로 보이는지 확인한다. 세트리스트 상세의 `악보 추가`에서
   여러 악보를 검색/체크하거나 `현재 검색 결과 전체 선택`으로 한 번에 추가하고, 추가된 악보가
   세트리스트 끝에 순서대로 붙는지 확인한다.
7. 여러 악보를 일괄 선택해 기존 또는 새 컬렉션으로 묶고, 완료 안내의 `보기`로 컬렉션 필터를
   바로 열 수 있는지 확인한다.
8. 여러 악보를 일괄 선택해 라이브러리에서 제거할 때 확인 dialog가 뜨고, PDF 원본 파일은 삭제하지
   않는다는 안내가 이해되는지 확인한다.
9. 세트리스트 상세에서 metadata가 비어 있는 악보도 파일명/작곡가 subtitle로 구분되는지 확인하고,
   drag handle로 순서를 바꾼다. 위/아래 버튼과 번호 배지 직접 순서 입력도 보조로 동작하는지
   확인한다. 항목을 제거한 뒤 `되돌리기`로 원래 위치에 복구되는지도 확인한다.
10. 세트리스트 중간 곡을 열었다가 홈으로 돌아와 `최근 세트리스트` rail에 `진행 n/m` pill,
   최근 연 시간, `이어보기` 곡명이 보이고, 다시 누르면 해당 곡부터 열리는지 확인한다.
11. 세트리스트로 연 악보에서 좁은 화면 또는 공연 모드에서도 현재 곡명과 `2/8` 같은 진행 배지가
   보이는지 확인한다.
12. PDF 공유와 필기 포함 PDF 공유를 실행한다.
13. 한글 텍스트 주석만 있는 악보에서 PDF export 제한 안내와 원본 공유 fallback을 확인한다.
14. URL link가 있는 PDF에서 link tap 차단과 link 제거 사본 생성을 확인한다.
15. metadata 백업과 PDF 포함 전체 백업을 생성한다.
16. 색상 반전, 어두운 배경, crop mask, 페이지 숨김/회전 표시를 확인한다.
17. 기본 viewer 배경이 악보 여백과 이질감 없이 paper/white 계열로 보이는지 확인한다.
15. hardware keyboard 또는 Bluetooth 페달이 있으면 Space/Page/Arrow 키가 한 페이지씩 넘기고
   PDF가 조금씩 스크롤되지 않는지 확인한다. 첫 page에서 이전, 마지막 page에서 다음을 누르면
   `곡 처음` 또는 `곡 끝` 안내가 나와야 한다.
16. 컬렉션/그룹/별점이 앱을 다시 열어도 유지되는지 확인한다.
17. 연결 파일을 추가하고 role을 Full score/Part/Original 등으로 바꾼 뒤 viewer에서 전환한다.
18. 리허설 마크를 추가/수정/삭제하고 quick jump로 이동한다.
19. crop preset을 모든 page/홀수짝수/cover 제외 scope로 저장하고 적용/삭제한다.
20. page template에서 숨김/순서/빈 페이지/visibility preset 요약이 이해되는지 확인한다.
21. 세트리스트 리허설 모드에서 곡별 시작 page와 메모가 viewer 진입에 반영되는지 확인한다.
22. viewer의 페이지 탐색 grid에서 현재 page, 숨김 page, duplicate page 표시를 확인한다.
23. 텍스트가 포함된 PDF에서 `PDF 본문 검색`으로 결과 page 이동, 이전/다음 결과, 검색어 지우기를 확인한다.
24. 세트리스트를 복제하고 곡별 예상 시간/전환 시간/총 예상 시간이 보존되는지 확인한다.
25. 페달 mapping을 `직접 설정`으로 바꾼 뒤 Space, Shift+Space, Arrow, Page, Enter, Tab, Media key action이 기대대로 동작하는지 확인한다.
26. 큰 annotation layer가 있는 악보에서 필기 포함 PDF 공유 전 annotation 요약 안내가 표시되는지 확인한다.
27. crop preset을 odd/even 또는 cover 제외로 적용한 뒤 페이지별 crop mask와 crop-to-fit이 맞는지 확인한다.
28. metadata 백업/복원과 PDF 포함 전체 백업/복원 후 custom pedal, page별 crop, 세트리스트 예상 시간이 유지되는지 확인한다.

## Known Issues

- 튜너의 synthetic sine/noise/time-series/pitch history 테스트는 통과했다. v1 UI는 Chromatic-only 첫 화면,
  세부 설정 접힘, 확대된 pitch history chart, sharp/flat 표기, A4 440/441/442 quick action/history, A4 보정 제안, adaptive noise
  floor 1차, weak signal normalization, clipping penalty, 저음 3배음 guard, `자동`/`기존`/`정밀 후보`
  감지 엔진, plucked string 회귀는 자동 테스트로 확인했다.
  Pitch history chart는 저장/백업 대상이 아닌 화면 내 임시 상태이며, 최신 sample을 왼쪽에 고정하고
  오래된 sample을 오른쪽으로 흘려 보여준다. 중앙선 label은 `0` 대신 현재 가장 가까운 음으로 표시하고,
  별도 meter/LED/input bar는 제거했다.
  기타 줄 맞춤, 악기별 preset, custom target/preset, target lock은 선택지 과다로 v1 UI에서 제외했다.
  실제 악기 기준 정확도, latency, 외부 마이크 안정성은 Android/iOS 실기기 검증 중이다.
- 2026-09-07 기준 현재 소스 RC 후보는 `1.0.0+20`이다. 실제 마이크 정확도/latency QA는 아직
  기록되지 않았다.
- iOS Simulator는 튜너 정확도 판단 대상이 아니다.
- 한글/비ASCII 텍스트 주석은 PDF export에서 제한될 수 있고, 이 경우 원본 PDF 공유로 fallback한다.
- 카메라로 종이 악보를 직접 촬영해 PDF로 만드는 내장 스캐너는 v1 범위가 아니다. v1에서는 이미
  만들어진 PDF/JPG/PNG를 가져오고, JPG/PNG 여러 장을 PDF 악보로 묶는 흐름을 확인한다.
- 필기 포함 PDF 공유는 편집 가능한 PDF annotation embed가 아니라 새 PDF 사본에 stamp하는 방식이다.
- crop/rotation/page hide는 원본 PDF를 바꾸지 않는 앱 metadata/display 중심 기능이다.
- URL link 제거는 synthetic link PDF fixture 기준으로 검증되어 있다. 실제 CamScanner/object stream
  PDF는 샘플 확보 후 별도 QA가 필요하다.
- S Pen pressure metadata/render/export와 stylus 직후 touch rejection window는 1차 구현되어 있다.
  Galaxy Tab S Pen/palm QA tuning은 남아 있다.
- Bluetooth 페달은 predefined/custom key dropdown과 진단 로그 기반 unknown key 설정을 지원한다.
  실제 key capture wizard는 후속 범위다.
- 방향키 방식 페달은 위/왼쪽이 이전 page, 아래/오른쪽이 다음 page로 동작해야 한다.
- 첫 page에서 이전, 마지막 page에서 다음을 누르면 버튼이 죽은 것처럼 보이지 않고 `곡 처음` 또는
  `곡 끝` 안내가 짧게 표시되어야 한다.
- 2026-09-07 연주자 피드백으로 다중 선택 강조, bulk setlist 추가, setlist drag reorder,
  최근 세트리스트 rail, page tap zone hint, paper/white viewer background, 메트로놈 subdivision/박별 강세 패턴/Tap tempo,
  세트리스트별 metronome override,
  고정형 mini tuner/metronome panel을 v1 hotfix에 반영했다. 실제 장비/연주 환경에서는 discoverability와
  장시간 사용성을 다시 확인한다.
- MobileSheets 비교와 연주자 피드백에 따라 새 metronome settings의 기본값은 `소리 켬`으로 둔다.
  명시적으로 `tick 소리`를 끈 기존/저장 설정은 유지하며, 메트로놈 화면과 mini panel에는 `소리`/`시각만`
  상태와 소리 크기가 보여야 한다.
- Android에서는 `소리 크기` slider가 tick 음량에 반영되는지 확인한다. iOS는 별도 native parity 전까지
  시스템 click fallback으로 보고 실기기에서 따로 기록한다.
- `소리 확인` 버튼으로 시작 전 tick이 들리는지 확인하고, 안 들리면 기기 볼륨/무음 모드/이어폰
  연결을 기록한다.
- 다중 선택 모드에서는 일반 목록뿐 아니라 `최근` quick access 악보 카드도 선택 상태로 바뀌어야 한다.
  선택된 카드는 check icon, primary border, 강조 배경이 보이고 viewer로 열리지 않아야 한다.
- 세트리스트 상세의 drag handle은 손가락으로 바로 잡을 수 있을 정도의 터치 영역으로 보이며, 위/아래
  버튼은 보조 이동 경로로 남아 있어야 한다.
- OCR, 실제 HID key capture wizard, SQLite/file-backed annotation migration, PDF 표준 annotation
  embed는 v1.1 이후 후속 범위다.
- cloud sync/account/server 저장은 없다.

## 실패 시 기록할 정보

`테스트 정보` 화면의 `피드백 템플릿 복사`를 눌러 아래 정보를 채워 보낸다.

- 앱 버전/build.
- 기기명과 OS 버전.
- 설치 방식: TestFlight, debug APK, release APK.
- PDF/샘플 파일 유형: 텍스트 PDF, 스캔 PDF, 이미지 변환 PDF, URL link PDF, 한글 주석 PDF 등.
- 페이지 수와 파일 크기.
- 샘플 파일 공유 가능 여부.
- 테스트 영역: import, viewer, search, annotation export, backup, pedal, S Pen, tuner, audio 등.
- blocker 여부: 예, 아니오, 모르겠음.
- 어색한 한글 문구/표시.
- 한 일: 누른 버튼, 메뉴, 입력값.
- 기대한 결과.
- 실제 결과.
- 표시된 오류 문구.
- 스크린샷 또는 화면녹화 가능 여부.
- 같은 순서로 다시 했을 때 재현되는지.
