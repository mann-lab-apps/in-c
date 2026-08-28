# Android 악보 뷰어 MVP

작성일: 2026-08-20

## 제품 가설

Android 태블릿 연주자는 MobileSheets급 기본 악보 뷰어 기능을 기대하지만, 악보를
보다가 바로 조율해야 하는 순간과 PDF 내부 하이퍼링크를 정리해야 하는 순간에 별도
도구로 이동해야 한다. 신규 앱은 악보 보기, 공연 준비, 튜너, PDF link annotation
정리를 한 흐름 안에 묶어 Android 악보 뷰어의 체감 불편을 줄인다.

## 타깃

- 1차: Galaxy Tab 등 Android 태블릿으로 PDF 악보를 보는 학생, 아마추어, 전공생.
- 2차: 연주회, 합주, 레슨에서 세트리스트와 필기가 필요한 연주자.
- 제외: 콘텐츠 악보 마켓, 사보 편집, 팀 협업 SaaS가 필요한 기관 사용자.

## MVP 범위

### 라이브러리

- PDF 가져오기.
- 앱 로컬 라이브러리에 악보 등록.
- 제목, 작곡가, 태그, 메모 편집.
- 최근 열기, 즐겨찾기.
- 제목/태그 검색.

### 악보 보기

- 1페이지 보기.
- 2페이지 보기.
- 세로 스크롤 보기.
- 반 페이지 넘김.
- 확대/축소/이동.
- 빠른 이전/다음 페이지.
- 마지막 위치 저장.
- 100페이지급 스캔 PDF를 기준으로 캐시/prefetch 성능 검증.

### 세트리스트/공연

- 세트리스트 생성, 이름 변경, 삭제.
- 세트리스트에 악보 추가, 순서 변경, 제거.
- 세트리스트 순서대로 곡 사이를 넘김.
- 세트리스트별 공연 보기 preset으로 보기 모드, page scale, 반 페이지 넘김, 전환 확인,
  자동 곡 이동, 페달 mapping을 곡별 설정 위에 override.
- 공연 preset template을 저장/적용/삭제하고 장비 profile metadata를 백업/복원.
- 공연 모드: 편집 UI 숨김, 실수 탭 방지, 큰 페이지 넘김 영역.

### 북마크

- 페이지 북마크 추가/해제.
- 북마크 목록에서 페이지 이동.
- 북마크 이름 변경.
- 북마크 목록에서 삭제.

### 주석/필기

- 펜.
- 형광펜.
- 지우개.
- 텍스트.
- 색상/두께 선택.
- undo/redo.
- 자동 저장.
- 주석은 앱 내부 레이어로 저장하고 원본 PDF는 수정하지 않는다.

### 음악 도구

- 메트로놈: BPM, 박자, 첫 박 강조, 시작/정지, 시각 표시.
- 튜너: chromatic tuner, 현재 음 이름, cents 편차, A4 calibration.
- 기준음/드론: 튜너 A4 기준을 공유하는 기준음, 5도, 옥타브 drone 재생.
- 로컬 오디오 플레이어: 악보에 연결한 audio file 재생/정지.
- 튜너는 악보 위 overlay 또는 side sheet로 열 수 있어야 한다.

### PDF link annotation 정리

- PDF의 link annotation을 페이지별로 탐지한다.
- 링크 영역을 화면에서 표시한다.
- 공연/보기 중 링크 탭을 비활성화할 수 있다.
- 사용자가 선택한 link annotation을 제거한 사본 PDF를 생성한다.
- 원본 파일은 항상 보존한다.

### Bluetooth 페달

- 기본 HID 입력으로 이전/다음 페이지 넘김을 지원한다.
- V1에서는 predefined/custom action mapping으로 page, score, quick action, no-op을 지원한다.

## 핵심 사용자 흐름

### 첫 악보 가져오기

1. 사용자가 PDF를 선택한다.
2. 앱이 파일명에서 제목을 제안한다.
3. 사용자가 제목, 작곡가, 태그를 확인한다.
4. 악보가 라이브러리에 등록되고 바로 열린다.

### 연습 중 조율

1. 사용자가 악보 화면에서 튜너 버튼을 누른다.
2. 앱이 마이크 권한을 요청한다.
3. 사용자가 악기를 연주하면 현재 음과 cents 편차를 보여준다.
4. 튜너를 닫으면 기존 페이지, 확대, 공연 모드 상태로 돌아온다.

### CamScanner류 링크 정리

1. 사용자가 PDF 정리 화면을 연다.
2. 앱이 페이지별 link annotation 목록과 위치를 표시한다.
3. 사용자가 오른쪽 하단 워터마크 영역의 링크를 확인한다.
4. 사용자가 링크 비활성화를 선택하면 뷰어에서 해당 링크가 눌리지 않는다.
5. 사용자가 정리된 사본 만들기를 선택하면 link annotation이 제거된 PDF 사본을 만든다.

### 공연 준비

1. 사용자가 세트리스트를 만든다.
2. 곡을 순서대로 추가한다.
3. 필요한 페이지에 북마크와 필기를 남긴다.
4. 공연 모드로 들어간다.
5. 화면 탭 또는 Bluetooth 페달로 페이지와 곡을 넘긴다.

## 비목표

- visible watermark 이미지/텍스트 제거.
- 저작권 악보 제공, 구매, 공유 마켓.
- MusicXML 사보 편집.
- ChordPro, 텍스트 코드 transpose.
- PDF annotation embed/export.
- 앱 내 카메라 PDF 스캔. 1차는 외부 스캔 앱/사진 앱/파일 앱에서 만든 자료를 잘 가져와
  악보로 관리하는 데 집중한다.
- 팀 동기화와 다중 기기 페이지 제어.
- MIDI action mapping.
- 고급 오디오 플레이어, A-B loop, tempo/pitch shift.
- 계정, 로그인, 서버 저장, 결제.

## 기술 방향

- Android 태블릿 우선. Flutter 앱 포트폴리오와 맞출지, 네이티브 Android로 갈지는 PDF
  렌더링, 필기 latency, tuner audio pipeline spike 결과로 결정한다.
- 초기 기술 검증은 PDF 렌더링, 필기 overlay, link annotation parsing, tuner pitch
  detection을 분리된 spike로 진행한다.
- 데이터는 로컬 DB와 앱 전용 파일 저장소를 기본으로 한다.
- 원본 PDF는 읽기 전용으로 보존하고, 변경은 앱 metadata 또는 사본 PDF로만 저장한다.

## 성공 기준

- 100페이지 PDF에서 페이지 넘김이 체감상 끊기지 않는다.
- 10개 악보로 구성된 세트리스트를 공연 모드에서 안정적으로 넘길 수 있다.
- 사용자가 기본 필기 도구로 리허설 메모를 남기고 재실행 후 그대로 확인할 수 있다.
- 튜너가 일반 연습실 소음에서 현재 음과 편차를 안정적으로 표시한다.
- CamScanner류 샘플 PDF에서 link annotation을 탐지하고, 탭 비활성화 또는 제거 사본
  생성을 완료한다.
- Bluetooth 페달 1종 이상에서 이전/다음 페이지 넘김이 동작한다.

## 검증에 필요한 샘플

- 짧은 1-3페이지 PDF 악보.
- 50-100페이지 이상 PDF songbook.
- 스캔 기반 PDF.
- link annotation이 있는 CamScanner류 PDF.
- 필기와 세트리스트를 반복 테스트할 실제 연습 악보.
- Bluetooth 페달 최소 1종.

## 다음 결정

- Flutter 유지 여부와 네이티브 Android 전환 여부.
- PDF 객체 편집 라이브러리 후보와 라이선스.
- 튜너 pitch detection 라이브러리 후보.
- 앱 이름과 in C 포트폴리오 안에서의 위치.
- 실제 사용자 샘플 PDF 확보 방식.

## 현재 구현 상태

제품명은 `Clef`다. 2026-08-27 기준으로 `apps/in_c_sheet` Android Flutter 앱 scaffold와 MobileSheets식
기본 사용 흐름 일부를 구현했다.

- PDF 파일 선택.
- 앱 내부 문서 저장소에 PDF 사본 저장.
- 로컬 라이브러리 record 저장.
- 라이브러리 목록, 검색, 즐겨찾기 표시.
- 라이브러리 정렬/필터 1차: 최근 열기, 제목, 작곡가, 별점, 가져온 날짜 정렬,
  즐겨찾기/태그/컬렉션/그룹/최소 별점 필터.
- 악보 제목, 작곡가, 태그, 컬렉션, 그룹, 별점, 메모, custom metadata field 편집.
- profile-backed 라이브러리 전환 1차: 기본/추가 라이브러리 전환, 생성, 이름 변경,
  비우기. scores/setlists/view/favorite preset metadata는 profile별 저장 key로 분리한다.
- 전역 보기/입력 기본값 1차: 새 악보에 적용할 보기 모드, 페이지 맞춤, 반 페이지 넘김,
  공연 모드 화면 유지, 페달/action mapping을 저장하고 백업에 포함한다.
- 연결 파일 metadata/UI 1차: 한 곡에 여러 보조 파일을 묶기 위한 저장 모델, 관리 UI,
  viewer 연결 PDF 전환, 백업 round-trip.
- `pdfrx` 기반 PDF viewer.
- 이전/다음 페이지 이동.
- 현재 페이지/전체 페이지 표시.
- 마지막 페이지 저장.
- PDF URL link annotation 탭 비활성화.
- PDF link annotation 영역 표시 토글.
- PDF URL link annotation 제거 사본 생성 1차.
- 현재 페이지 북마크 추가/해제.
- 북마크 목록에서 페이지 이동, 이름 변경, 삭제.
- 세트리스트 생성/이름 변경/삭제.
- 세트리스트 악보 검색 추가/제거/순서 이동.
- 세트리스트 목록/상세에서 첫 곡 열기.
- 세트리스트 viewer context에서 이전/다음 곡 이동.
- viewer에서 세트리스트 이름과 현재 곡 순서 표시.
- 보기 모드 1차: 1페이지식 가로 배치, 2페이지 태블릿 spread, 세로 스크롤.
- 곡별 보기 설정 저장: 보기 모드, 반 페이지 넘김, 표시 효과.
- 모바일 viewer UX 1차: 좁은 화면 AppBar overflow menu, 좁은 화면 세로 스크롤 기본값,
  1페이지 모드 페이지 간격 보정, 일반 모드 하단 페이지 컨트롤 자동 숨김.
- 반 페이지 넘김 1차: visible viewport 기반 반 페이지 이동, 페이지 경계에서 이전/다음
  페이지 이동, 2페이지 보기와 동시 사용 제한.
- 페이지 정리 metadata 1차: 현재 페이지 숨김/해제, 숨김 페이지 navigation skip, page별
  회전 metadata 저장, global crop metadata와 화면 mask.
- 주석/필기 1차: 펜/형광펜 stroke, 텍스트 주석, 지우개 stroke 삭제, 색상/두께 선택,
  텍스트 주석 수정/삭제, 현재 페이지 stroke/text undo, 앱 metadata 저장, `pdfrx` page overlay
  기반 좌표 정합성 보강.
- 메트로놈 1차: BPM/박자 저장, start/stop, accent beat visual 표시, 기본 OFF tick sound toggle.
- 튜너 1차: `record` 기반 microphone PCM stream, autocorrelation pitch detector, median
  smoothing, no-signal debounce, octave jump 완화, note hysteresis, frequency-to-note 계산,
  cents meter, Concert/Bb Trumpet 표시 모드, Chromatic/Bb Trumpet 감지 profile, A4 기준음 저장,
  visual tuner fallback.
- 하드웨어 키/Bluetooth 페달 입력 1차: Arrow/Page/Space 기반 이전/다음 페이지 넘김.
- 공연 모드 1차: 관리 action 숨김, 큰 페이지 컨트롤 유지.
- 자동 스크롤 1차: 곡별 duration/start/end/cue/pause marker/repeat section/page duration/cue point
  저장, 세로 스크롤 기반 weighted timeline 진행, pause/resume/stop, BPM 기반 duration preset,
  세트리스트 자동 다음 곡 진행, 수동 페이지 이동/키 입력 시 정지.
- 로컬 백업/복원 1차: PDF 파일을 제외한 앱 metadata JSON export/import, PDF 파일을 포함한
  전체 백업/복원 ZIP, active library profile별 save mutation 기반 metadata 자동 snapshot.
- 공유/import/export 1차: Android 외부 PDF 수신, iOS document open URL 수신, 현재 PDF 공유,
  필기 포함 PDF 공유 사본 생성, 한글 텍스트 주석 PDF export 안전 fallback,
  JPG/PNG 이미지를 PDF 악보로 묶기, 변환 원본 이미지를 reference linked file로 보존.
- 표시 효과 1차: 일반, 어두운 배경, 색상 반전.
- 베타 전달 polish: 앱 내 테스트 정보/version 표시, 피드백 템플릿 복사, 빈 라이브러리 CTA,
  검색/필터 빈 결과 초기화, viewer 오류 배너, 구체적인 import/share/export 실패 안내,
  외부 테스터 체크리스트와 베타 피드백 요청 메시지.

URL link annotation은 viewer layer에서 외부 브라우저가 열리지 않게 막고, 사용자가 명시적으로
선택하면 외부 URL link annotation만 제거한 앱 내부 사본을 생성한다. PDF visible watermark 제거는
범위에서 제외한다.

iOS scaffold는 2026-08-21 smoke test 보조 타깃으로 추가했다. iPhone 16 Pro / iOS 18.4
Simulator에서 276페이지 PDF import/open/render/page move를 수동 확인했지만, 제품 검증의
우선순위는 Android 태블릿이다.

Android 태블릿 실기기 smoke test, 실제 CamScanner 샘플 PDF link 제거 검증,
튜너 정확도/latency 실기기 검증, 메트로놈 오디오 latency/accent sound,
기준음/드론/로컬 오디오 Android latency와 iOS parity,
Bluetooth/USB 페달 실기기 HID 검증, 주석/필기 고도화, PDF annotation 객체 embed/export,
실제 페이지 회전 live 렌더링, per-instance crop/rotation override,
한글 텍스트 PDF font embedding,
기존 폴더 직접 참조, ChordPro/text,
HEIC 이미지 변환, iOS Share Extension, 클라우드 동기화,
계정/서버 저장은 이후 단계로 남겨둔다. Drive/iCloud/Dropbox 같은 클라우드 파일은 별도 SDK 없이
system file picker/provider 경로를 우선 사용한다. 구현 메모는
[`docs/architecture/sheet-viewer-android-mvp.md`](../architecture/sheet-viewer-android-mvp.md)에
정리한다.
