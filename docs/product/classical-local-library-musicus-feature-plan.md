# 클래식 로컬 음악앱 기능 정리

작성일: 2026-10-13

## 현재 iOS 재생 범위 변경 — 2026-10-30

아래 과거 마일스톤의 foreground-only 제한은 iOS 0.1.0(2)에서 변경한다. iOS 음악용 오디오 세션과 `UIBackgroundModes: audio`로 화면 잠금·앱 전환 중 재생을 유지하고 lifecycle에서는 위치만 저장한다. Android는 기존 background 일시정지 정책이다. interruption·출력 장치 분리 시 일시정지하고 자동 재개하지 않는 정책, 큐·파일 ID·위치 저장은 유지한다. 시스템 잠금 화면 조작·헤드폰 버튼·CarPlay·강제 종료 후 자동 재생은 별도 범위다. 시뮬레이터 앱 전환 증거와 iPhone Xs 물리 잠금·청감 확인을 구분한다.

## 목적

Musicus를 참조해 로컬 클래식 음악 관리 앱에서 구현할 기능을 정리한다. 목표는 Apple Music Classical의 스트리밍 카탈로그 경험을 복제하는 것이 아니라, 사용자가 가진 로컬 음원을 클래식 문법으로 정리하고, 그 안에서 작품 단위의 감상과 디스커버리를 가능하게 만드는 것이다.

참조 프로젝트:

- `references/musicus`
- `references/README.md`
- https://github.com/johrpan/musicus

## 핵심 판단

Musicus에서 가장 가져올 만한 것은 UI가 아니라 데이터 모델과 재생 단위다.

일반 음악앱의 기본 단위는 곡/앨범이지만, 클래식 로컬 앱의 기본 단위는 작품, 악장, 녹음, 트랙, 파일을 분리해야 한다. 특히 랜덤 재생은 트랙 하나를 고르는 방식이 아니라, 작품 또는 녹음을 고른 뒤 필요한 트랙 묶음을 큐에 넣어야 한다.

## 1차 구현 범위

### 1. 로컬 라이브러리 스캔

Musicus 참조 지점:

- `musicus-library/src/db/schema.rs`
- `musicus-library/src/library/edit/tracks.rs`

구현할 기능:

- 사용자가 선택한 폴더를 로컬 라이브러리 루트로 등록한다.
- 오디오 파일을 스캔해 경로, 포맷, 길이, 비트레이트, 수정일, 파일 해시를 저장한다.
- FLAC, MP3, M4A/ALAC, OGG/OPUS를 우선 지원한다.
- 파일 이동/이름 변경/삭제를 감지하고 라이브러리 DB와 동기화한다.
- 태그가 부족한 파일은 "정리 필요" 상태로 분류한다.

MVP 기준:

- 수동 폴더 스캔.
- 로컬 SQLite DB.
- 파일 삭제 없이 DB만 갱신.
- 파일 태그 쓰기는 후순위로 둔다.

### 2. 클래식 전용 엔티티 모델

Musicus 참조 지점:

- `musicus-library/src/db/schema.rs`
- `musicus-library/src/db/models.rs`
- `references/musicus/README.md`

구현할 기능:

- `Composer/Person`
- `Work`
- `Work Part/Movement`
- `Recording/Performance`
- `Track`
- `Local File`
- `Album/Release`
- `Performer`
- `Conductor`
- `Ensemble/Orchestra`
- `Instrument`
- `Tag`
- `Play History`

중요한 모델링 원칙:

- 앨범은 물리/상업 릴리스고, 작품은 음악적 단위다. 둘을 같은 계층으로 두지 않는다.
- 트랙 하나가 여러 작품/악장을 포함할 수 있어야 한다.
- 한 작품이 여러 녹음으로 존재할 수 있어야 한다.
- 한 녹음이 여러 앨범/박스셋에 포함될 수 있어야 한다.
- 작곡가와 연주자/지휘자/오케스트라를 같은 `artist` 필드로 뭉개지 않는다.

### 3. 작품/악장 중심 브라우징

Musicus 참조 지점:

- `src/work_page.rs`
- `src/recording_tile.rs`
- `src/album_page.rs`
- `musicus-library/src/library/list.rs`

구현할 기능:

- 작곡가별 작품 목록.
- 작품별 악장/부분 목록.
- 작품별 보유 녹음 목록.
- 녹음별 연주자, 지휘자, 오케스트라, 녹음연도, 앨범 표시.
- 앨범별 트랙 목록도 제공하되 기본 탐색축은 작품으로 둔다.
- 작품 상세에서 "내가 가진 녹음", "IMSLP에서 받을 수 있는 녹음/악보", "외부 스트리밍에서 듣기"를 구분한다.

### 4. 특수 랜덤 재생

Musicus 참조 지점:

- `musicus-library/src/library/program.rs`
- `src/player.rs`
- `src/editor/program_settings.rs`

구현할 기능:

- 랜덤 선택 단위를 트랙이 아니라 `Recording` 또는 `Work`로 둔다.
- 선택된 녹음이 여러 트랙으로 나뉜 경우, 관련 악장을 순서대로 큐에 넣는다.
- 특정 악장만 듣는 모드와 작품 전체를 듣는 모드를 분리한다.
- 최근 들은 작곡가/악기/연주자를 일정 시간 피하는 옵션을 둔다.
- 덜 들은 작품, 최근 추가한 음원, 저장만 해두고 안 들은 음원에 가중치를 줄 수 있다.

우리 앱의 기본값:

- "랜덤 전체 재생"은 기본적으로 작품/녹음 단위로 묶어 재생한다.
- 단일 트랙 랜덤은 별도 모드로 둔다.
- 소나타/교향곡/협주곡처럼 악장 단위 작품은 중간 악장만 튀어나오지 않게 한다.
- 오페라 아리아, 모음곡 발췌, 단일 소품은 트랙 단위 재생을 허용한다.

예상 모드:

- `작품 랜덤`: 작품 하나를 고르고 가능한 한 전체 악장을 큐에 넣는다.
- `녹음 랜덤`: 특정 녹음/앨범의 관련 트랙 묶음을 큐에 넣는다.
- `악장/소품 랜덤`: 짧게 듣기용.
- `안 들은 길`: 재생 이력이 적은 작품 우선.
- `작곡가 반복 피하기`: 같은 작곡가가 바로 이어지지 않게 한다.
- `편성별 랜덤`: 피아노 독주, 현악사중주, 관현악, 성악 등.

### 5. 검색과 매칭

Musicus 참조 지점:

- `musicus-library/src/library/search.rs`
- `src/search_page.rs`

구현할 기능:

- 작곡가, 작품, 작품번호, 별칭, 악장, 연주자, 지휘자, 오케스트라, 앨범명 검색.
- 한글명, 원어명, 영어명, 약칭을 함께 검색한다.
- `베토벤 5번`, `운명`, `Beethoven Symphony 5`, `Op.67` 같은 입력을 같은 후보군으로 묶는다.
- 태그가 엉킨 파일은 검색 결과에서 "후보 매칭"으로 보여준다.
- MusicBrainz/AcoustID 연동은 후순위지만 모델에는 외부 ID 필드를 남긴다.

### 6. 메타데이터 정리 UI

Musicus 참조 지점:

- `src/editor/work.rs`
- `src/editor/recording.rs`
- `src/editor/album.rs`
- `musicus-library/src/library/merge.rs`

구현할 기능:

- 파일 태그에서 추출한 후보를 검토하고 확정한다.
- 작품/악장/녹음/앨범을 수동 생성하거나 병합한다.
- "이 트랙들은 같은 작품의 악장이다"를 묶는 편집 UI를 제공한다.
- 같은 작곡가/작품이 중복 생성되었을 때 병합한다.
- 원본 파일 태그를 보존하면서 앱 내부 메타데이터를 우선 쓸 수 있게 한다.

MVP 기준:

- 내부 DB 편집 먼저.
- 파일 태그 쓰기/일괄 리태깅은 나중.

### 7. IMSLP 연동

참조 지점:

- `references/README.md`
- IMSLP API: https://imslp.org/wiki/IMSLP:API
- IMSLP Public domain: https://imslp.org/wiki/Public_domain
- IMSLP Membership Q&A: https://imslp.org/wiki/IMSLP:Membership_Q%26A

구현할 기능:

- 작품 상세에서 IMSLP 작품 페이지 후보를 연결한다.
- 악보, 파트보, 음원/녹음을 구분한다.
- 다운로드 가능한 항목의 출처, 라이선스, 저작권 상태, 서버/지역 힌트를 보여준다.
- 명확히 퍼블릭 도메인 또는 자유 라이선스인 항목은 앱 안에서 다운로드 후 라이브러리에 가져온다.
- 상태가 애매하거나 대기/회원/지역 처리가 필요한 항목은 IMSLP 페이지 열기로 보낸다.
- 다운로드한 파일에는 IMSLP URL, 파일 ID, 라이선스/저작권 문구, 다운로드 일자를 함께 저장한다.

주의:

- IMSLP 공식 API는 현재 작곡가/작품 목록 중심으로 보이며 완전한 파일 다운로드 API로 보기 어렵다.
- 음원은 악보와 별도의 권리 판단이 필요하다.
- 한국 사용자를 대상으로 할 때 IMSLP의 국가별 퍼블릭 도메인 표시를 그대로 "한국에서 자유 이용 가능"으로 번역하면 안 된다.

### 8. 플레이어와 재생 기록

Musicus 참조 지점:

- `src/player.rs`
- `src/player_bar.rs`
- `src/playlist_page.rs`
- `musicus-library/src/library/program.rs`

구현할 기능:

- 현재 재생 중인 작품, 악장, 녹음, 연주자를 동시에 표시한다.
- 큐에는 트랙명보다 작품/악장명을 우선 표시한다.
- 재생 기록은 트랙과 녹음 모두에 남긴다.
- 중간 악장만 들어도 작품 전체 완료로 보지 않는다.
- 전체 작품 묶음을 끝까지 들었는지 별도로 계산한다.
- "다음에도 이 녹음으로 듣기", "다른 해석으로 듣기"를 지원한다.

### 9. 개인 디스커버리

Musicus 참조 지점:

- Program/random playback 구조.
- Tag/play history 구조.

구현할 기능:

- 내 라이브러리 안에서 아직 안 들은 작품 추천.
- 같은 작품의 다른 해석 비교.
- 특정 작곡가의 보유 작품 지도.
- 특정 편성/시대/분위기 기반 큐.
- IMSLP에서 추가 가능한 공개 음원/악보 추천.
- 기존 in C 디스커버리 앱의 Daily Pick, Listening Map과 연결한다.

## 한국 로컬라이징 체크리스트

### 용어

확정 전에 용어집을 먼저 만든다.

- `Work`: 작품
- `Movement`: 악장
- `Recording`: 녹음 또는 연주 녹음
- `Performance`: 연주
- `Release/Album`: 앨범 또는 발매반
- `Composer`: 작곡가
- `Conductor`: 지휘자
- `Performer`: 연주자
- `Ensemble`: 앙상블
- `Orchestra`: 오케스트라 또는 관현악단
- `Opus/Catalogue number`: 작품번호/목록번호
- `Public domain`: 퍼블릭 도메인 또는 저작권 만료
- `Score`: 악보
- `Parts`: 파트보

주의:

- `Recording`을 항상 `녹음`으로만 쓰면 "녹음 파일"과 혼동될 수 있다. 작품 상세에서는 `연주 녹음`, 파일 관리 화면에서는 `오디오 파일`로 구분하는 것이 좋다.
- `Work`는 `곡`보다 `작품`이 낫다. 교향곡, 오페라, 모음곡, 소나타를 모두 포함하기 때문이다.
- `Movement`는 초보 사용자에게 낯설 수 있으므로 첫 노출에는 `악장`을 쓰고, 필요하면 `작품 안의 부분`으로 보조 설명한다.

### 작곡가/작품명 표기

구현할 기능:

- 한글 표기, 원어 표기, 영어 표기, 정렬명을 분리 저장한다.
- 예: `베토벤`, `Ludwig van Beethoven`, `Beethoven, Ludwig van`.
- 작품명은 한글명과 원제/관용명을 함께 표시한다.
- 작품번호 검색을 강하게 지원한다.
- 사용자가 입력한 원문은 보존한다.

주의:

- 한글 표기는 출처마다 다르다. `드뷔시/드뷔시`, `라흐마니노프/라흐마니노브` 같은 변형을 별칭으로 다룬다.
- 한국에서 널리 쓰는 별칭을 무시하면 검색 품질이 나빠진다. 예: `운명`, `비창`, `월광`, `신세계`, `전람회의 그림`.
- 별칭은 작품의 공식 제목처럼 보이지 않게 `한국어 별칭`으로 분리한다.

### 정렬

구현할 기능:

- 작곡가 정렬은 한글 가나다와 서양식 성 기준 정렬을 모두 지원한다.
- 기본 한국어 UI에서는 한글 표시명 가나다 정렬을 우선한다.
- 고급 설정에서 원어/성 기준 정렬을 제공한다.
- 작품번호 정렬은 문자열이 아니라 구조화된 번호로 처리한다.

주의:

- `Op. 10 No. 2`가 `Op. 10 No. 12` 뒤로 가면 안 된다.
- `BWV`, `K.`, `D.`, `Hob.`, `RV` 같은 목록번호 체계를 문자열로만 정렬하면 어색해진다.

### 검색

구현할 기능:

- 한글/영문/원어 혼합 검색.
- 초성 검색 후보 검토.
- 띄어쓰기 무시 검색.
- 작품번호 검색.
- 별칭 검색.
- 오타/표기 변형 검색.

한국어 예시:

- `베토벤 운명`
- `베토벤 5번`
- `교향곡 5번`
- `월광 1악장`
- `드보르작 신세계`
- `라흐 피협 2번`

### 외부 서비스 연결

구현할 기능:

- Apple Music, Spotify, YouTube, YouTube Music 외에 한국 사용자가 쓰는 Melon, Genie, Bugs, FLO, VIBE 검색 링크를 검토한다.
- 직접 재생 API가 없으면 검색 링크 fallback으로 제공한다.
- 사용자가 선호 스트리밍 앱을 고를 수 있게 한다.

주의:

- 국내 서비스는 딥링크/검색 URL 안정성이 낮을 수 있으므로, 링크 실패 fallback이 필요하다.
- 로컬 파일 앱의 핵심은 외부 스트리밍이 아니라 내 파일 관리다. 외부 링크는 보조 연결면으로 둔다.

### IMSLP와 한국 저작권 표시

확인한 공식 근거:

- 한국저작권위원회는 저작재산권의 기본 보호기간을 저작자 생존기간 및 사후 70년으로 안내한다.
- 한국저작권위원회 영문 저작권법 안내는 음반 등 저작인접권 보호기간을 원칙적으로 70년으로 설명한다.
- IMSLP는 국가별 퍼블릭 도메인 여부가 다를 수 있고, 제공 파일이 사용자의 국가에서 퍼블릭 도메인임을 보장하지 않는다고 안내한다.

제품 반영:

- 다운로드 버튼 근처에 `한국에서의 이용 가능 여부는 별도 확인이 필요할 수 있음`을 표시한다.
- IMSLP의 `Public Domain`, `Non-PD US`, `Non-PD EU` 같은 표시는 원문과 함께 보여준다.
- 한국 사용자를 위해 `작품 저작권`과 `녹음/실연/음반 권리`를 구분해 안내한다.
- 음원 다운로드는 악보 다운로드보다 보수적으로 처리한다.
- 앱은 법률 판정자가 아니라 출처/라이선스/상태를 투명하게 보여주는 도구로 포지셔닝한다.

### 날짜/시대/레퍼토리

구현할 기능:

- 한국어 UI에서 시대명은 `바로크`, `고전`, `낭만`, `근현대`, `현대`를 기본으로 한다.
- 연도는 한국식 날짜 표기와 국제 표기를 혼용하지 않는다.
- 작곡가 생몰년, 작품 작곡연도, 출판연도, 녹음연도, 발매연도를 구분한다.

주의:

- 저작권 판단에는 작곡연도보다 사망연도/출판연도/녹음 발행연도가 중요할 수 있다.
- 사용자에게는 너무 법률적으로 보이지 않게, 상세 정보 안에서 단계적으로 보여준다.

### UI 문장 톤

원칙:

- `미확인`, `정리 필요`, `후보`, `연결됨`처럼 상태어를 명확하게 쓴다.
- 초보 사용자에게 `메타데이터`만 던지지 말고 `곡 정보 정리`처럼 보조 표현을 쓴다.
- "이 곡은 틀렸습니다"보다 "다른 작품으로 연결할까요?"처럼 수정 가능한 문장으로 쓴다.

예시:

- `이 파일은 어떤 작품인지 아직 확인하지 못했어요.`
- `악장이 나뉜 음원으로 보여요. 작품 전체로 묶어 재생할까요?`
- `IMSLP에서 공개된 자료를 찾았어요. 한국에서의 이용 가능 여부는 자료별로 확인해 주세요.`

## 우선순위

### P0: 앱의 정체성

- 로컬 폴더 스캔.
- 작품/악장/녹음/트랙 DB.
- 작품 중심 브라우징.
- 작품/녹음 단위 랜덤 재생.
- 기본 플레이어와 큐.
- 재생 기록.

### P1: 쓸 만한 관리 앱

- 메타데이터 후보 매칭.
- 수동 정리/병합 UI.
- 한글/영문/작품번호 검색.
- 작곡가/작품 상세.
- 한국어 용어/표기/정렬.

### P2: 디스커버리 앱으로 확장

- 덜 들은 작품 추천.
- 같은 작품 다른 해석 비교.
- 편성/시대/작곡가 기반 자동 큐.
- 기존 Daily Pick/Listening Map과 연결.

### P3: 외부 카탈로그 확장

- IMSLP 작품 페이지 연결.
- IMSLP 공개 자료 다운로드/가져오기.
- MusicBrainz/AcoustID 매칭.
- 외부 스트리밍 검색 링크.

## 첫 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 기존 `apps/in_c_sheet`는 진행 중인 변경이 많아, 첫 마일스톤은 별도 Flutter 앱으로 격리했다.
- Musicus의 UI가 아니라 `works -> recordings -> tracks` 모델과 program/random playback 아이디어를 참고했다.
- 실제 파일 스캔, 실제 오디오 재생, IMSLP 다운로드, MusicBrainz/AcoustID 매칭은 후속 마일스톤으로 분리했다.

포함된 것:

- 작품/악장/연주 녹음/트랙/로컬 오디오 파일 도메인 모델.
- 한국어 표시명, 원어/영어 표시명, 정렬명, 별칭 모델.
- IMSLP 등 외부 출처와 저작권/지역 메모를 담을 수 있는 확장 지점.
- 베토벤/드보르자크 샘플 라이브러리.
- 작품 랜덤, 녹음 랜덤, 악장/소품 랜덤 재생 계획.
- 한국어 첫 화면.
- 악장 묶음 랜덤 재생과 로컬라이징 데이터 보존 테스트.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 두 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- SQLite는 아직 작품/녹음 연결 스키마를 더 설계한 뒤 도입한다.
- 이번 마일스톤은 앱 지원 디렉터리의 JSON 파일 저장소를 사용한다.
- 실제 플랫폼 폴더 선택은 후속으로 남기고, 스캐너 인터페이스와 샘플 스캔 UI를 먼저 완성했다.
- 파일 태그 파싱, 실제 오디오 재생, IMSLP 다운로드, MusicBrainz/AcoustID 자동 매칭은 범위에서 제외했다.

포함된 것:

- `AudioFileScanner` 인터페이스와 `FileSystemAudioFileScanner`.
- 지원 확장자: `flac`, `mp3`, `m4a`, `alac`, `ogg`, `opus`, `wav`.
- 파일 경로, 파일명, 확장자, 수정일, 크기 기반 스캔 후보 생성.
- `AudioImportStatus`: `scanned`, `needsReview`, `linked`, `missing`.
- `JsonScannedAudioStore`와 `ScannedAudioRepository`.
- 첫 화면의 `스캔`, `정리 필요` 상태.
- 샘플 라이브러리 파일과 스캔 후보 파일 분리.
- 스캔/저장소 테스트와 기존 랜덤 재생 테스트 유지.

검증:

```sh
cd apps/classical_local_library
flutter pub get
dart format lib test
flutter test
flutter analyze
```

## 세 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 실제 플랫폼 폴더 선택은 `file_picker`로 연결하되, 앱 내부에서는 `FolderPicker` 인터페이스 뒤에 둔다.
- 등록 경로는 파일 후보 저장소와 분리해 `classical_local_scan_locations.json`에 저장한다.
- 스캔 경로는 아직 SQLite로 옮기지 않고 JSON으로 유지한다.
- 폴더 재스캔은 파일 후보 병합과 마지막 스캔 상태 갱신까지만 맡는다.
- 삭제/이동 감지, 파일 태그 파싱, 실제 오디오 재생, IMSLP 다운로드, MusicBrainz/AcoustID 자동 매칭은 범위에서 제외했다.

포함된 것:

- `PlatformFolderPicker`와 테스트용 fake picker 주입 구조.
- `ScanLocation`: 표시명, 경로, 등록일, 마지막 스캔일, 마지막 스캔 파일 수, 활성 상태.
- `JsonScanLocationStore`, `MemoryScanLocationStore`, `ScanLocationRepository`.
- 첫 화면의 `폴더 추가`, `다시 스캔`, `비활성화/활성화` 흐름.
- 등록된 폴더를 `FileSystemAudioFileScanner`로 재스캔하고 `ScannedAudioRepository`에 병합하는 흐름.
- 실제 폴더 스캔과 데모 스캔의 UI 분리.
- 등록 경로 저장/재읽기, 마지막 스캔 상태 갱신, fake picker 기반 폴더 등록, 재스캔/비활성화 테스트.

검증:

```sh
cd apps/classical_local_library
flutter pub get
dart format lib test
flutter test
flutter analyze
```

## 네 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 실제 오디오 바이너리 태그 리더는 아직 도입하지 않는다.
- 이번 마일스톤은 파일명/경로 기반 후보 추론으로 먼저 검증한다.
- 후보는 원본 파일이나 `LocalAudioFile` 확정 메타데이터와 분리해 `MetadataCandidate`로 저장한다.
- 자동 확정은 하지 않고, `정리 필요` 파일에 대한 검토 후보만 만든다.
- 원본 파일 태그 쓰기, 실제 오디오 재생, SQLite 전환, IMSLP 다운로드, MusicBrainz/AcoustID 자동 매칭은 범위에서 제외했다.

포함된 것:

- `MetadataCandidate`: 파일 ID, 파일 경로, 파일명, 작곡가 후보, 작품 후보, 악장 후보, 트랙 번호 후보, 신뢰도.
- `MetadataCandidateInferencer`: 파일명/경로 기반 후보 추론.
- 지원 패턴:
  - `01 Allegro.flac`
  - `Beethoven - Symphony No.5 - I. Allegro.flac`
  - `Dvorak/New World/04 Allegro con fuoco.mp3`
- `JsonMetadataCandidateStore`, `MemoryMetadataCandidateStore`, `MetadataCandidateRepository`.
- 스캔/데모 스캔 후 후보를 저장하고, `정리 필요` 목록에 후보 요약 표시.
- 후보 추론, JSON 저장/재읽기, 화면 표시 테스트.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 다섯 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 고급 편집 UI 전에, 스캔 파일을 기존 샘플 트랙에 연결하는 최소 수직 흐름부터 구현한다.
- 연결 상태는 원본 파일 태그가 아니라 앱 내부 저장소에만 기록한다.
- 연결 저장소는 아직 JSON으로 유지하고, SQLite 전환은 후속으로 남긴다.
- 자동 매칭 확정, 중복 작품/녹음 병합, 파일 태그 쓰기는 범위에서 제외했다.

포함된 것:

- `AudioFileTrackLink`: 파일 ID, 트랙 ID, 연결 시각.
- `JsonAudioFileTrackLinkStore`, `MemoryAudioFileTrackLinkStore`, `AudioFileTrackLinkRepository`.
- `ScannedAudioRepository.markLinked`로 파일 후보를 `linked` 상태로 갱신.
- 첫 화면의 파일 후보별 `샘플 트랙에 연결` 액션.
- 연결된 파일은 `정리 필요` 목록에서 제외하고 `연결됨` 상태로 표시.
- `LinkedAudioFileResolver`로 재생 계획 트랙에 연결된 로컬 파일을 해석하는 기반.
- 연결 상태 저장/재읽기, `linked` 상태 전환, 연결 파일 해석, 화면 상태 테스트.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 여섯 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 검색은 별도 DB 인덱스 없이 메모리 기반 서비스로 먼저 시작한다.
- 한글/원어/영어/정렬명/별칭/작품번호/파일 후보 메타데이터를 같은 토큰 검색 규칙으로 비교한다.
- fuzzy matching, 초성 검색, 형태소 분석은 후속으로 남긴다.

포함된 것:

- `LibrarySearchService`와 `LibrarySearchResult`.
- 결과 타입: 인물, 작품, 악장, 연주 녹음, 파일 후보.
- `베토벤 5번`, `운명`, `Beethoven Symphony 5`, `Op.67` 검색.
- 스캔 파일 후보의 `MetadataCandidate` 기반 검색.
- 첫 화면의 `검색` 입력과 결과 목록.
- 한글/원어/영어/작품번호/별칭/악장/파일 후보 검색 테스트.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 일곱 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 실제 오디오 출력 라이브러리는 아직 도입하지 않는다.
- 이번 마일스톤은 작품/녹음 단위 재생 계획이 연결된 로컬 파일 경로 큐로 변환되는지 검증한다.
- 플랫폼별 오디오 세션, 백그라운드 재생, lock screen 제어는 후속으로 남긴다.

포함된 것:

- `LocalPlaybackQueueItem`.
- `LocalPlaybackQueueBuilder`: `PlaybackPlan`을 로컬 파일 경로 큐로 변환.
- 연결된 파일이 있으면 샘플 파일 대신 연결 파일 경로를 사용.
- `FakeLocalPlayer`: play/pause/resume/next 상태 전이.
- 첫 화면의 현재 재생 큐에서 `연결 파일` 표시.
- 악장 순서 유지, 연결 파일 경로 사용, fake player 상태 전이 테스트.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 여덟 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 현재 네 저장소는 이미 `Store` 인터페이스와 repository 래퍼로 분리되어 있어 SQLite adapter를 붙일 수 있는 경계가 있다.
- 실제 SQLite 패키지는 아직 도입하지 않는다. 지금은 schema와 JSON 마이그레이션 skeleton을 먼저 고정한다.
- 실제 SQLite 실행 adapter, DB 파일 생성, on-device migration 실행은 다음 마일스톤으로 남긴다.
- 기존 memory/json store는 테스트와 fallback 용도로 유지한다.

현재 JSON 저장소:

- `classical_local_scan.json`: 스캔 파일 후보.
- `classical_local_scan_locations.json`: 등록된 스캔 경로.
- `classical_local_metadata_candidates.json`: 파일명/경로 기반 메타데이터 후보.
- `classical_local_file_links.json`: 파일-트랙 연결 상태.

SQLite schema version 1:

- `scanned_audio_files`
- `scan_locations`
- `metadata_candidates`
- `audio_file_track_links`
- `schema_migrations`

포함된 것:

- `SqliteTableSchema`와 `SqliteStorageSchema`.
- 네 JSON 파일명과 SQLite table mapping.
- `JsonStorePayloads`.
- `JsonToSqliteMigrationPlanner`.
- SQLite seed row 변환:
  - `AudioImportStatus`는 enum name 문자열.
  - `SourceReference` 목록은 `source_references_json`.
  - bool은 `0/1`.
  - 연결 정보는 `track_id` primary key 기준.
- schema/table mapping, JSON fixture migration, 빈 payload migration 테스트.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 아홉 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- Android/iOS 런타임 SQLite adapter로 `sqflite`를 사용한다.
- 테스트 환경에서는 `sqflite_common_ffi`를 사용한다.
- 네 저장소를 한 번에 모두 전환하지 않고, 우선순위가 가장 높은 `ScannedAudioStore`를 실제 SQLite-backed store로 전환한다.
- 기존 memory/json store는 테스트, fallback, 단계적 전환을 위해 유지한다.
- 원본 JSON 파일은 migration 후에도 삭제하지 않는다.
- 스캔 경로, 메타데이터 후보, 파일-트랙 연결 저장소의 SQLite-backed 구현은 후속으로 남긴다.

포함된 것:

- `ClassicalLocalDatabase`.
- DB 파일명: `classical_local_library.sqlite`.
- `SqliteMigrationRunner.applySchema`.
- `schema_migrations` 적용 내역 기록.
- `json_store_migrations` JSON seed migration 내역 기록.
- `SqliteMigrationRunner.migrateJsonPayloads`.
- `SqliteMigrationRunner.migrateJsonDirectory`.
- `SqliteScannedAudioStore`.
- 앱 기본 스캔 파일 저장소를 `SqliteScannedAudioStore`로 전환.
- 기존 네 JSON 파일을 읽어 DB에 upsert/replace로 seed migration하는 실행부.
- schema version 적용, SQLite-backed 스캔 파일 저장/로드, JSON fixture migration, idempotent migration, 원본 JSON 파일 보존 테스트.

현재 저장소 상태:

- SQLite-backed:
  - `ScannedAudioStore`
- JSON 유지:
  - `ScanLocationStore`
  - `MetadataCandidateStore`
  - `AudioFileTrackLinkStore`
- Memory 유지:
  - 네 store 모두 테스트 주입 가능.

검증:

```sh
cd apps/classical_local_library
flutter pub get
dart format lib test
flutter test
flutter analyze
```

## 열 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 아홉 번째 마일스톤에서 남겨 둔 세 저장소를 모두 SQLite-backed 구현으로 전환한다.
- 앱 기본 저장 전략은 네 저장소가 같은 `classical_local_library.sqlite` DB를 공유하는 방식으로 맞춘다.
- 기존 JSON store 구현은 제거하지 않고, 테스트 fixture와 fallback 확인 용도로 유지한다.
- 기존 JSON 파일은 migration 후에도 삭제하지 않는다. 이제 JSON은 active store가 아니라 legacy migration source다.
- legacy JSON migration 중 파일 시스템 오류나 JSON format 오류가 나도, schema가 적용된 SQLite DB로 앱 기동은 계속 가능하게 한다.
- 실제 오디오 출력, IMSLP 다운로드, MusicBrainz/AcoustID 자동 매칭은 범위에서 제외했다.

포함된 것:

- `SqliteScanLocationStore`.
- `SqliteMetadataCandidateStore`.
- `SqliteAudioFileTrackLinkStore`.
- `LibraryHomeScreen` 기본 repository/store wiring의 SQLite 전환.
- 기본 DB open helper가 같은 SQLite connection future를 공유하도록 정리.
- JSON directory migration은 첫 성공 시 upsert/replace로 seed하고, 이후 성공 기록이 있으면 재적용하지 않아 SQLite 변경값을 보존한다.
- 스캔 경로, 메타데이터 후보, 파일-트랙 연결의 SQLite 저장/로드 테스트.
- 네 저장소 모두 JSON fixture migration 후 SQLite store로 읽을 수 있는지 검증.

현재 저장소 상태:

- SQLite-backed:
  - `ScannedAudioStore`
  - `ScanLocationStore`
  - `MetadataCandidateStore`
  - `AudioFileTrackLinkStore`
- JSON 유지:
  - 네 store 모두 legacy migration source와 fixture 확인용 구현으로 유지.
- Memory 유지:
  - 네 store 모두 위젯/도메인 테스트 주입 가능.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 열한 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 실제 오디오 출력 라이브러리 도입 전, 재생 계층의 contract와 상태 모델을 먼저 고정한다.
- `just_audio`, `audio_service` 등 실제 오디오 출력 의존성은 아직 추가하지 않는다.
- 지금 단계의 플레이어는 큐 상태, 현재 항목, 버튼 동작, UI 표시를 검증하기 위한 fake 구현이다.
- 이후 실제 플레이어 adapter는 `LocalPlaybackController` contract를 구현하는 방식으로 붙인다.
- 연결 파일이 없는 트랙은 기존 샘플 파일 fallback 경로를 계속 사용한다.
- IMSLP 다운로드, MusicBrainz/AcoustID 자동 매칭, 파일 태그 쓰기는 범위에서 제외했다.

포함된 것:

- `LocalPlaybackController`.
- `LocalPlaybackState`.
- `LocalPlayerState`의 한국어 상태 label.
- `LocalPlaybackQueueItem`의 작품명, 녹음명, 파일 출처 label.
- `FakeLocalPlayer`의 queue load, play, pause, resume, next, stop 상태 전이.
- 첫 화면 현재 재생 큐 패널의 재생/일시정지, 다음, 정지 버튼.
- 현재 상태, 현재 큐 위치, 작품/악장, 녹음명, 파일 경로 표시.
- 연결 파일/샘플 파일 출처 표시.
- queue load 후 첫 항목, 상태 전이, 마지막 항목 next, stop, widget control 테스트.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
```

## 열두 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 포그라운드 로컬 오디오 출력은 `just_audio` 0.10.6을 사용한다.
- `audio_service`와 백그라운드 재생은 이번 단계에 포함하지 않는다.
- 앱 기본 wiring은 실제 플레이어를 사용하고, widget/domain test는 fake controller를 주입한다.
- 클래식 작품 큐의 일부 악장을 조용히 건너뛰지 않도록 큐 전체가 실제 파일에 연결된 경우에만 재생한다.
- 로컬 파일만 재생하므로 인터넷, cleartext, 백그라운드 오디오 관련 Android/iOS 설정은 추가하지 않는다.
- 샘플 경로는 큐 표시와 개발용 데이터에만 사용하고 실제 재생 대상으로 취급하지 않는다.
- 실제 오디오 파일과 실기기가 준비되지 않아 소리 출력 및 포맷별 디코딩 호환성은 후속 검증으로 남긴다.

포함된 것:

- 비동기 `LocalPlaybackController` contract.
- `Stream<LocalPlaybackState>` 기반 UI 상태 구독.
- `loading`, `error` 재생 상태와 구조화된 `LocalPlaybackFailure`.
- `LocalPlaybackQueueValidator`와 파일 존재/연결/확장자 검증.
- `JustAudioLocalPlaybackController`의 playlist load, play, pause, resume, next, stop, completion, dispose 처리.
- `PlayerException`, `PlayerInterruptedException`, error stream의 한국어 오류 상태 변환.
- controller 주입, 명령 중복 방지, widget dispose 시 자원 정리.
- 현재 재생 큐의 로딩 indicator, 오류 메시지, 실패 파일 경로 표시.
- 비동기 fake player 상태 전이, 빈 큐, 샘플 경로, 누락 파일, 미지원 확장자, 오류 복구 테스트.
- Android debug APK 및 iOS Simulator app 빌드.
- iPhone 17 Simulator 설치/기동과 첫 화면 렌더링 확인.

아직 포함하지 않은 것:

- 백그라운드 재생.
- 잠금 화면, 알림, 헤드폰 버튼 제어.
- 앱별 오디오 포커스와 인터럽트 정책 고도화.
- 재생 위치 저장 및 재시작 복원.
- gapless/crossfade 품질 검증.
- 실제 기기별 FLAC/MP3/M4A/ALAC/OGG/OPUS/WAV 호환성 검증.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
flutter build apk --debug
flutter build ios --simulator --no-codesign
```

## 열세 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 클래식 장시간 감상을 위해 재생 위치, 길이, 버퍼 위치, seek를 foreground 플레이어 contract에 포함한다.
- `audio_session` 0.2.4의 음악 preset을 사용하고 `just_audio`의 자동 interruption 처리는 끈 뒤 앱 정책으로 직접 처리한다.
- interruption 시작과 출력 장치 분리 시 일시정지하며 interruption 종료 후 자동으로 재생하지 않는다.
- background 재생을 지원하지 않으므로 앱이 inactive, paused, hidden, detached 상태가 되면 재생을 일시정지하고 위치를 저장한다.
- SQLite schema를 v2로 올리고 `playback_positions`에 파일 경로별 재생 위치를 저장한다.
- 진행 이벤트마다 DB에 쓰지 않고 15초 간격으로 제한하되 pause, stop, 다음 악장, lifecycle 변화, dispose에서는 강제 저장한다.
- queue load 시 첫 항목에만 저장 위치를 복원한다. 작품의 연속성을 위해 자동으로 넘어간 다음 악장은 0초부터 재생한다.
- 완료되었거나 끝에서 10초 이내인 위치, 파일 수정 시각이 달라진 위치는 복원하지 않는다.
- `audio_service`, background audio 권한, 잠금 화면과 알림 제어는 포함하지 않는다.

포함된 것:

- `LocalPlaybackState`의 position, duration, buffered position, seeking, processing 상태.
- `LocalPlaybackController.seek`와 위치 강제 저장 contract.
- `just_audio` position/duration/buffer/current index 스트림 동기화.
- 빠른 seek 직렬화와 악장 전환 시 시간 상태 초기화.
- `PlaybackPositionRecord`, store, policy, coordinator, memory/deferred 구현.
- `SqlitePlaybackPositionStore`와 `playback_positions` schema v2 migration.
- 진행 위치 저장 제한, 완료 판정, 파일 변경 감지, 첫 항목 복원 정책.
- 음악용 audio session 구성과 주입 가능한 interruption 정책.
- 현재 재생 패널의 시간 표기, buffer 표시, seek slider, 탐색/버퍼링 상태.
- 앱 lifecycle observer의 foreground 일시정지와 위치 저장.
- seek 경계값, 연속 seek, 악장 전환, 완료, 복원, write 제한, schema migration, widget lifecycle 테스트.

아직 포함하지 않은 것:

- 백그라운드 재생.
- 잠금 화면과 알림 미디어 제어.
- 헤드폰 버튼 명령과 시스템 미디어 세션 표시.
- crossfade.
- 실제 기기 gapless 품질 검증.
- 실제 기기별 FLAC/MP3/M4A/ALAC/OGG/OPUS/WAV 호환성 검증.

플랫폼 설정:

- 포그라운드 로컬 파일 재생만 사용하므로 Android Manifest와 iOS Info.plist에는 권한을 추가하지 않았다.
- 실제 전화 interruption, 헤드폰 분리, 소리 출력은 실제 음원과 실기기에서 후속 검증해야 한다.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
flutter build apk --debug
flutter build ios --simulator --no-codesign
```

## 열네 번째 개발 마일스톤

구현 위치:

- `apps/classical_local_library`

결정:

- 감상 이력은 파일별 재개 위치인 `playback_positions`와 분리한다. 위치 저장은 재개 정책을, 이력은 사용자가 실제로 들은 세션과 최근 감상 탐색을 담당한다.
- SQLite schema를 v3로 올리고 `playback_history`와 최근/트랙/작품/녹음 조회 인덱스를 추가한다. v1/v2 테이블과 데이터는 그대로 보존한다.
- 모든 감상 이력은 사용자 계정이나 외부 서버 없이 기기 내부 `classical_local_library.sqlite`에만 저장한다.
- 감상 시간은 오디오 position 차이가 아니라 `playing` 상태의 실제 경과 시간으로 계산한다. seek, pause 중 대기, 중복 상태 이벤트는 감상 시간을 늘리지 않는다.
- pause/resume은 같은 세션이며, 악장 전환은 이전 세션을 마감하고 다음 악장 세션을 시작한다.
- stop, queue 교체, completed, error, dispose는 활성 세션을 저장하고 닫는다. 저장 작업은 직렬화해 비동기 이벤트 순서를 보존한다.
- 최근 감상은 저장 시점 snapshot 제목을 사용하므로 이후 카탈로그 표기가 바뀌거나 항목이 사라져도 이해 가능한 기록을 남긴다.
- 이어 듣기는 현재 악장부터 같은 녹음의 남은 악장을 순서대로 구성한다. 첫 악장은 기존 `PlaybackPositionCoordinator`가 위치를 복원하고, 자연스럽게 넘어가는 다음 악장은 0초부터 시작한다.
- 이어 듣기 대상의 남은 악장 중 로컬 파일 연결이 하나라도 없으면 일부를 조용히 건너뛰지 않고 실행을 막아 사유를 표시한다.
- 카탈로그에서 제거된 트랙은 snapshot 경로와 스캔 파일이 유효할 때 한 트랙 fallback 큐를 허용한다.
- 추천, 통계 기반 discovery, background 재생, 잠금 화면 제어는 이번 범위에 포함하지 않는다.

포함된 것:

- `PlaybackHistoryEntry`, status, store, repository, coordinator.
- memory/deferred/SQLite-backed playback history store.
- SQLite schema v3 및 v1/v2에서의 idempotent migration.
- 최근, 트랙별, 작품별, 녹음별 최신순 제한 조회.
- 가짜 시계와 ID factory를 사용한 재생/일시정지/재개/seek/악장 전환/완료/오류/정지/dispose 테스트.
- `ClassicalPlaybackPlanner.createContinuationPlan`과 `ContinueListeningQueueBuilder`.
- 최근 감상 패널, 한국어 상태·시간 표시, 이어 듣기/다시 듣기 액션, 파일 연결 불가 안내.
- 이어 듣기 실행 중 실제 controller 큐를 현재 재생 큐 패널에 표시.

아직 포함하지 않은 것:

- 감상 이력 기반 추천과 discovery.
- 사용자 계정과 클라우드 이력 동기화.
- 작품/작곡가별 집계 통계.
- 이력 삭제, 보관 기간, 내보내기.
- 활성 재생 중 프로세스 강제 종료에 대비한 주기적 이력 checkpoint.
- 백그라운드 재생, 잠금 화면, 알림, 헤드폰 버튼 제어.
- IMSLP 다운로드와 MusicBrainz/AcoustID 자동 매칭.

검증:

```sh
cd apps/classical_local_library
dart format lib test
flutter test
flutter analyze
flutter build apk --debug
flutter build ios --simulator --no-codesign
```

## 열다섯 번째 개발 마일스톤

결정:

- 실제 오디오 재생의 최소 증적은 테스트 전용 짧은 PCM WAV fixture를 앱 asset으로 포함하고, iOS Simulator와 Android emulator에서 실제 `just_audio` 어댑터와 SQLite를 함께 실행하는 통합 테스트로 남긴다.
- fixture는 결정론적으로 생성한 합성 음계이며, 외부 연주 음원이나 저작권이 있는 녹음은 포함하지 않는다.
- 통합 테스트는 load, 재생 위치 증가, pause/resume, seek, 다음 악장, 자연 완료, 이력/위치 영속화, 새 controller 복원, 오류 후 새 큐 복구와 dispose를 검사한다.
- 명시적 다음 악장 전환에서 현재 index stream이 이전 위치를 다시 저장하지 않도록 controller의 비동기 저장 순서를 보호한다.

검증:

- iPhone 17 iOS 26.5 Simulator에서 `flutter test integration_test/audio_playback_integration_test.dart -d <simulator-id>`를 통과했다.
- 네이티브 decoder와 상태 전이는 확인했지만, Simulator에서 사람이 실제 소리를 들은 검증이나 실제 음악 파일 포맷별 품질 검증은 아직 하지 않았다.

## 열여섯 번째 개발 마일스톤

포함된 것:

- `PlaybackHistoryStore`의 개별 삭제, 전체 삭제, 기준 시각 이전 삭제.
- 계속 보관/30일/90일/1년 보관 정책과 SQLite-backed 선호 저장소.
- 앱 시작 시 및 보관 정책 변경 시의 정리. 기준 시각과 동일한 기록은 보존한다.
- 최근 감상의 개별 삭제, 전체 삭제, 보관 정책 메뉴와 한국어 확인 대화상자.
- 이력 관리 시작 시 활성 재생을 일시정지하고 세션을 마감해, 삭제 뒤 뒤늦은 재생 이벤트가 기록을 되살리지 않도록 처리.
- 재생 위치 테이블은 감상 이력 삭제 대상에서 제외.

## 열일곱 번째 개발 마일스톤

포함된 것:

- 전체/최근 30일/최근 90일 감상 통계.
- 총 감상 시간, 세션 수, 완료 세션 수, 고유 트랙 수, 작품별/녹음별 상위 집계.
- SQLite schema v4의 `playback_history_preferences`와 v1/v2/v3에서 v4로의 idempotent migration 테스트.
- memory/SQLite 집계, retention 경계, UI의 삭제 확인과 통계 기간 전환 테스트.

아직 포함하지 않은 것:

- 감상 통계를 기반으로 한 추천 또는 discovery.
- 감상 이력 내보내기.
- 계정, 클라우드 이력 동기화.
- 백그라운드 재생, 잠금 화면/알림/헤드폰 버튼 제어.
- Android 및 실제 iOS 기기에서의 실제 음악 파일 포맷 호환성과 가청 출력 검증.
- IMSLP 다운로드와 MusicBrainz/AcoustID 자동 매칭.

## 열여덟 번째 개발 마일스톤

- 테스트 전용 PCM WAV fixture를 marker tone, 무음 구간, 결정론적 generator 계약으로 강화했다.
- 순수 Dart validator가 RIFF/PCM metadata, duration, marker frequency estimate, 무음 구간을 검사한다.
- generator의 `--check` 모드와 unit test가 커밋 fixture가 generator 출력과 동일한지 검증한다.
- iOS/Android native integration test는 fixture 검증 뒤 실제 `just_audio` adapter의 position, seek, queue transition, history/position persistence를 확인한다.
- fixture 무결성과 native decoder/state-machine 증적은 확보했지만, 사람의 스피커/헤드폰 청감은 별도 계층으로 남긴다.

## 열아홉 번째 개발 마일스톤

- scanner가 받아들이는 확장자와 실제 플랫폼에서 native test를 통과한 포맷을 별도 validation matrix로 관리한다.
- 자동 native run을 통과한 포맷은 synthetic PCM WAV와 synthetic AAC-in-M4A다.
- 이 환경에는 provenance가 명확한 multi-format encoder 또는 fixture source가 없으므로, 외부 음원이나 불명확한 바이너리를 추가하지 않았다.
- synthetic AAC-in-M4A는 iOS Simulator와 Android emulator의 native integration을 통과했다. MP3, FLAC, ALAC, OGG, OPUS는 앱이 재생을 시도할 수 있으나 플랫폼 호환성을 보증하지 않는다.

## 스무 번째 개발 마일스톤

- 기존 `clef_rc_tablet_api35` AVD를 부팅하고 두 설치된 `adb`에서 `emulator-5554` 연결을 확인했다.
- Pixel Tablet Android 15 API 35 emulator에서 APK 설치와 실제 `just_audio` integration test가 exit code 0으로 통과했다.
- Flutter doctor의 duplicate `adb` 및 Android license 경고는 앱 결함으로 숨기지 않고 환경 리스크로 기록한다.

## 스물한 번째 개발 마일스톤

- 자동화 증적, 포맷별 상태, 실기기 청감 확인 범위를 구분한 문서를 추가했다.
- 실기기 체크리스트는 format, transport, lifecycle, interruption, wired/Bluetooth route, long-file resume, human listening observation을 포함한다.
- analytics, 계정, 클라우드 전송 없이 fixture ID와 익명화한 상태만 기록하도록 개인정보 경계를 명시했다.

아직 포함하지 않은 것:

- 실제 iOS/Android 기기에서의 포맷별 청감과 codec 호환성 확인.
- Bluetooth/headphone route 및 실제 interruption의 자동화.
- gapless/crossfade 품질 검증과 구현.
- background playback, 잠금 화면/알림/헤드폰 버튼 제어.
- IMSLP 다운로드와 MusicBrainz/AcoustID 자동 매칭.

## 스물두 번째 개발 마일스톤

- 기존 합성 PCM source를 macOS 기본 `afconvert`로 AAC-in-M4A fixture로 변환했다.
- `afinfo`가 22,050 Hz mono AAC와 2.4초 duration을 확인하고, iOS Simulator와 Android emulator native integration test가 load/position/stop을 통과했다.
- AAC metadata가 encoder invocation마다 byte-stable하지 않아 semantic codec contract와 기록된 SHA-256을 분리해 문서화했다.

## 스물세 번째 개발 마일스톤

- `flutter devices`와 `adb devices`에서 iOS Simulator 및 Android Pixel Tablet emulator만 확인됐다. 물리 기기는 연결되지 않아 실기기 검증을 주장하지 않는다.
- interruption 시작 시 pause, 종료 시 auto-resume 금지, becoming-noisy 시 pause라는 policy 단위 테스트를 유지한다.
- 실제 Bluetooth/headphone route 및 OS interruption은 실기기 체크리스트의 수동 검증 대상으로 남긴다.

## 스물네 번째 개발 마일스톤

- SQLite test가 240 synthetic scanned files, 12 locations, 600 history sessions로 recent/statistics/retention과 recent index query plan을 확인한다.
- fixture는 실제 사용자 파일이나 경로를 포함하지 않으며, 결과는 correctness/index-use 증적일 뿐 device performance benchmark가 아니다.

## 스물다섯 번째 개발 마일스톤

- validation matrix, physical-device checklist, device audio evidence를 AAC fixture와 emulator 결과로 동기화했다.
- 남은 우선순위는 실제 기기 MP3/FLAC/M4A 호환성, acoustic output, Bluetooth/headphone route, interruption, 대형 실사용 라이브러리 성능 측정이다.

## 스물여섯 번째 개발 마일스톤

- `flutter devices`, `adb devices -l`, `xcrun simctl list devices`에서 연결된 대상은 iPhone 17 iOS Simulator와 Pixel Tablet Android 15 emulator뿐이었다. 각 대상에서 production `JustAudioLocalPlaybackController`의 synthetic WAV/AAC-in-M4A 통합 테스트를 재실행했다. 이는 물리 기기 또는 사람 청감 증적이 아니다.
- interruption policy는 pause, duck, unknown 유형이 시작되면 pause하고 종료 때는 자동 재개하지 않는 것으로 명시했다. becoming-noisy와 dispose 이후 event 무시도 순수 Dart 단위 테스트로 검증한다. 실제 OS interruption과 route 변경은 plugin mock으로 가장하지 않고 실기기 수동 검증으로 남긴다.
- SQLite 대형 synthetic 검증은 240 scanned file, metadata candidate, file-track link, playback position, 12 scan location, 600 history session까지 범위를 넓혔다. recent/statistics/retention/index plan과 history retention이 playback position을 삭제하지 않는 경계를 확인한다.
- 당시 조사에서는 `/usr/bin/afconvert`의 synthetic AAC-in-M4A만 채택하고 ALAC, FLAC, MP3를 미검증으로 남겼다. 서른네 번째 마일스톤에서 ALAC 호출과 출력을 다시 검증해 repository PCM 기반 ALAC-in-M4A를 추가했으며 FLAC, MP3, OGG, Opus는 계속 미검증이다.

## 스물일곱 번째 개발 마일스톤

- `PlaybackStateTrace`는 파일 경로 대신 synthetic track ID만 기록하는 결정론적 재생 state snapshot이다. command, player/processing state, queue index, position/duration, failure kind를 짧은 한 줄로 남겨 코딩 에이전트가 실패 원인과 최소 재현 흐름을 해석할 수 있게 한다.
- 외부 property-test 의존성을 추가하지 않았다. 표준 Dart `Random`의 `seed=20261019`로 24개 재생 scenario와 8개 SQLite scenario를 반복하고, 실패하면 seed와 scenario index로 재현한다. 이 규모는 로컬/CI 전체 테스트의 수 초 실행 경계를 유지한다.
- `재생 진단` 화면은 합성 WAV, AAC-in-M4A, ALAC-in-M4A fixture만 재생한다. 자동 확인은 load, position advance, pause/resume, stop 상태 전이에 한정되며, 결과와 사용자의 청감 선택은 기기 밖으로 전송하거나 DB에 저장하지 않는다.
- 사용자 청감 선택은 `소리가 들림`, `무음 또는 이상`, `확인하지 않음`뿐이다. 개인 파일 경로, 제목, 태그, 감상 이력, 기기 식별자는 진단 결과에 포함하지 않는다.
- LLM은 테스트 실행 결과·trace·seed를 해석해 회귀 test 후보를 만들 수 있지만, 앱 runtime에는 LLM API, analytics, telemetry, 계정을 추가하지 않았다. 물리 기기 route/codec/청감은 수동 feedback으로만 판정한다.

## 스물여덟 번째 개발 마일스톤

- 순수 Dart reference model과 `FakeLocalPlayer`를 분리해 같은 명령 sequence의 player/processing 상태, index, synthetic track ID, position, duration, failure를 비교한다. completed/stopped/error와 dispose 이후 event 불변식도 별도로 고정한다.
- 외부 fuzzing 의존성 없이 seed `20261019`, `20261020`, `20261021` 각각 16개 scenario와 24개 생성 명령을 실행한다. 빈/단일/다중 queue, 빠른 pause/resume, 연속 seek, 재생 중 queue 교체, 마지막 next 반복, simulated missing-file failure와 stop/valid-load 복구를 항상 포함한다.
- native integration은 45초 상한 안에서 synthetic WAV/AAC를 10회 교대하며 연속 seek의 마지막 요청, pause/resume/stop, stale event 부재를 검사한다. simulator/emulator 통과는 native decoder/state-machine 증적일 뿐 물리 출력이나 청감 증적이 아니다.
- 익명 진단 report schema는 generic platform, fixture ID, container/codec, transport 결과, failure kind, 수동 청감 선택만 허용한다. strict decoder와 privacy validator는 schema/필드/경로 형태를 거절하며 report는 clipboard 외에 저장·업로드되지 않는다.
- network-free Dart validator는 표준 입력 report의 schema와 known synthetic validation matrix를 확인하고 fixture별 후속 회귀 테스트 여부를 출력한다. fixture 실패를 codec 전체 실패로 일반화하지 않는다.
- history/position/preferences의 독립성, retention 이후 position/preference 보존, position event의 전체 history/statistics 재조회 방지, 진단 실행의 history 비오염을 synthetic test로 검증한다. 성능 wall-clock threshold나 schema/index 변경은 추가하지 않았다.

LLM/코딩 에이전트는 결정론적 명령 생성, trace 분석, 반례 재현과 회귀 테스트 작성을 담당할 수 있다. 사람만 판단할 수 있는 실제 가청 여부, 음질, 유선/Bluetooth route와 물리 interruption은 사용자가 수동으로 확인하고, 명시적으로 전달한 익명 report만 로컬 도구 입력으로 사용한다.

## 스물아홉 번째 개발 마일스톤

- `AudioTagReader`와 순수 Dart `audio_metadata_reader` production adapter를 도입했다. MP3 ID3, FLAC/OGG/Opus Vorbis Comment, MP4/M4A ilst, WAV RIFF 등을 같은 코드로 읽고 제목, 앨범, 트랙·앨범 아티스트, 장르, 연도, 트랙·디스크 번호를 내부 모델로 격리한다. 원본 태그를 쓰거나 수정하지 않는다.
- 범용 reader 모델에 없는 composer/work/movement 전용 필드는 파일명·폴더명 추론을 유지한다. 태그가 없거나 손상되어도 개별 파일만 fallback하며 전체 스캔을 중단하지 않는다. 태그와 경로 후보가 다르면 검토 충돌로 남긴다.
- synthetic WAV의 임시 복사본에 RIFF 태그를 기록한 뒤 production reader가 실제로 해독하는 자동 테스트를 추가했다. 외부 연주 음원이나 사용자 파일은 사용하지 않는다.
- SQLite schema v5는 마지막 확인 시각, 연속 누락 횟수, present/missing, 크기·수정 시각 기반 저비용 identity, 태그 결과, 상세 후보와 승인·거절 상태를 additive migration으로 저장한다. v4 행과 legacy JSON source는 보존되고 반복 migration은 무해하다.
- 동일 경로는 즉시 갱신하고, 경로가 달라도 identity 후보가 유일할 때만 이동으로 확정해 기존 file ID와 track link를 유지한다. 모호한 후보는 서로 다른 실제 파일일 수 있으므로 자동 병합하지 않는다. 한 번의 누락은 유예하고 두 번 연속 누락된 파일만 `missing`으로 표시한다.
- 누락 파일은 링크와 이력에서 삭제하지 않고 재생 해석에서 제외한다. 재발견 시 자동 복구하고, 관리 화면에서는 미연결 대체 파일을 선택해 기존 ID에 수동 재연결할 수 있다. history와 playback position은 경로 변경이나 수동 매칭 때문에 임의 삭제하지 않는다.
- `파일 정리` 화면에 정리 필요·연결됨·누락됨 필터, 태그·추론·confidence·충돌 표시, 검색 가능한 작곡가/작품/녹음/트랙 라벨, 다중 선택 승인, 거절, 링크 변경·해제, 대체 파일 선택과 저장 전 확인을 추가했다. 파일과 트랙은 일대일 연결이며 기존 연결 충돌을 알리고 교체되는 파일 상태도 함께 정리한다.
- 작품 랜덤과 녹음 랜덤은 녹음 내부의 악장을 원래 순서로 묶는다. 기본값은 재생 가능한 악장만 순서대로 넣고 누락 수와 제목을 표시하며, 완전한 작품 정책은 누락이 하나라도 있으면 빈 큐를 반환한다. 악장/소품 랜덤은 독립 단일 트랙 모드다. 이는 gapless 품질 보장이 아니다.
- 검색 정규화는 대소문자, 공백·구두점, 일반적인 라틴 발음기호, 한글 초성을 처리한다. 정확, prefix, substring, 초성 순으로 먼저 찾고 결과가 없을 때만 길이 제한 Levenshtein fuzzy fallback을 사용한다. 사용자 검색어를 저장하거나 전송하지 않는다.
- 대형 synthetic SQLite 검증에 파일 이동, 연속 누락, 수동 재연결을 포함하고, 링크·감상 이력·재생 위치가 독립적으로 보존되는지 확인한다. wall-clock 성능 임계값은 두지 않는다.

## 서른 번째 개발 마일스톤

- 2026-10-20에 IMSLP 공식 [API](https://imslp.org/wiki/IMSLP:API), [Public domain](https://imslp.org/wiki/Public_domain), [Membership Q&A](https://imslp.org/wiki/IMSLP:Membership_Q%26A)를 다시 확인했다. 자체 API는 작곡가·작품 목록과 page URL만 문서화하며 파일 목록, 권리 metadata와 직접 다운로드 endpoint는 제공하지 않는다. 회원이 아니어도 다운로드할 수 있다는 안내는 있지만 waiting 절차를 앱이 우회할 근거는 아니다.
- 작품 후보는 IMSLP의 공식 MediaWiki `api.php` 검색으로 조회하고 사용자 확인 후 로컬 work ID와 연결한다. 검색 실패 시 공식 HTTPS 작품 URL 수동 연결과 외부 페이지 열기를 제공한다. HTML scraping과 파일 링크 추출은 하지 않는다.
- `ImslpRightsStatus`는 public domain, 자유 라이선스, 지역 제한, 회원·대기, 확인 필요, 불가, unknown을 구분한다. IMSLP가 국가별 상태를 보장하지 않는다는 원문 취지와 녹음의 별도 관련 권리를 한국어로 표시하고, 지역 제한·unknown은 직접 다운로드를 차단한다.
- 검증된 직접 URL이 별도로 확인된 자료만 등록할 수 있다. production URL 정책은 HTTPS, IMSLP 공식 host와 하위 host, userinfo 없음, redirect 재검증을 요구한다. 최대 100 MiB, MIME·확장자, 안전한 파일명, 임시 파일, SHA-256, checksum 중복과 취소를 처리한다.
- SQLite schema v6에 `imslp_work_links`, `imslp_resources`, `imslp_imports`를 추가했다. 작품 연결과 자료 snapshot은 해제할 수 있지만 이미 가져온 파일과 provenance는 삭제하지 않는다. 파일 이동·재발견·수동 재연결에서도 `SourceReference`를 보존한다.
- 오디오 다운로드는 기존 `AudioFileScanner`, `ScannedAudioRepository`, `MetadataCandidateRepository`를 거쳐 정리 필요 후보로 들어간다. PDF·MIDI 등 비오디오는 provenance만 저장하며 재생 큐에 넣지 않는다.
- 기본 자동화는 공식 응답 형태를 줄인 JSON fixture와 loopback `HttpServer`를 사용한다. 검색 파싱, unknown 필드, 유사 host, redirect 탈출, MIME, 크기, checksum 중복, scanner import, SQLite v1-v4→v6, 권리 UI와 외부 페이지 fallback을 외부 네트워크 없이 검증한다. 실제 IMSLP 파일은 테스트에서 내려받지 않는다.
- loopback WAV fixture의 네이티브 파일 다운로드, 임시 파일 완료 이동, SHA-256, scanner 등록은 iPhone 17 iOS Simulator와 Android 15 API 35 emulator에서 각각 통과했다. IMSLP live 파일 다운로드, 물리 기기 저장소 권한 또는 실제 권리 상태의 증적은 아니다.

live IMSLP에서 확인한 범위:

- 공식 custom API가 현재 JSON 작품 목록과 page URL을 반환한다.
- 공식 MediaWiki API가 작품명 검색 결과를 반환한다.
- 파일 목록 및 안정적인 직접 다운로드 API는 공식 문서에서 확인하지 못했다.

정책 변경 위험:

- IMSLP API, host, membership, waiting 및 지역 서버 정책은 변경될 수 있으므로 live 다운로드를 자동화하기 전 공식 문서를 다시 확인해야 한다.
- 앱은 한국 저작권의 법적 판정자가 아니며 IMSLP 원문 상태와 출처를 보존하는 도구로 한정한다.

## 서른한 번째 개발 마일스톤

- iPhone 17 iOS 26.5 Simulator에서 production 앱을 build·install·launch했다. 한국어 홈 화면의 주요 도구와 scroll layout을 스크린샷으로 확인하고 앱 sandbox의 SQLite schema v6, 핵심 테이블, 무결성을 직접 조회했다.
- iOS 전용 production startup integration은 기존 DB를 지운 깨끗한 sandbox에서 실제 `path_provider`, `sqflite`, 기본 저장소 wiring과 IMSLP 화면 진입을 검증한다. 이 과정에서 화면 dispose 시 기본 DB를 닫는 lifecycle 경계를 보강했다.
- production `JustAudioLocalPlaybackController`의 합성 WAV/AAC 재생·seek·queue 완료·오류 복구·위치와 이력 저장, loopback WAV의 다운로드/import를 같은 시뮬레이터에서 다시 통과시켰다.
- 별도 live smoke는 iOS runtime에서 IMSLP 공식 MediaWiki HTTPS 검색을 호출하고 결과 URL이 공식 host인지 확인한다. 외부 네트워크와 서비스 변경에 영향을 받으므로 결정론적 기본 회귀와 분리한다.
- 시뮬레이터 자동화는 앱 설치·기동, native plugin 연결, 파일 sandbox, SQLite, decoder state와 HTTPS 경로의 증거다. 물리 출력, 청감 품질, Bluetooth·유선 route, OS interruption과 실제 사용자 폴더 권한은 사용자 피드백 중심 실기기 검증으로 유지한다.

## 서른두 번째 개발 마일스톤

- iOS 유입은 외부 디렉터리의 영구 접근을 전제로 하지 않는다. 시스템 문서 선택기에서 여러 파일을 선택하고, 선택 직후 앱 지원 디렉터리의 `managed_audio`로 스트리밍 복사해 이후 스캔과 재생은 앱 소유 파일만 사용한다. Android·데스크톱 폴더 스캔은 기존 정책을 유지한다.
- production picker는 WAV, MP3, FLAC, M4A, ALAC, OGG, OPUS를 복수 선택한다. 안전한 basename, 선택적 MIME 일치, 2 GiB 상한, 선언 크기와 실제 스트림 크기, SHA-256을 검증하며 완료 전에는 `.part`만 만든다.
- checksum 중복은 새 복사본을 만들지 않고, 같은 이름의 다른 파일은 번호 접미사로 보존한다. 외부 원본은 읽기만 하며 원본 경로·security-scoped URL·bookmark는 DB에 저장하지 않는다.
- SQLite schema v7에 `local_audio_imports`를 additive migration으로 추가했다. 원본 파일명, 앱 관리 경로, checksum, 크기, 가져온 시각, copied/completed/missing 상태와 로컬 file ID를 저장하며 v1-v6 데이터는 보존한다.
- 복사 완료 후 기존 scanner, reconciliation, metadata candidate 흐름을 재사용하고 `localImport` source reference를 붙인다. 분석 실패는 pending으로 보고 다음 시작 때 재시도하며, 고아 `.part`는 삭제한다. managed 파일 누락도 기존 두 번 연속 확인 정책을 따른다.
- iOS 홈은 파일 가져오기를 기본 행동으로 제공하고 폴더 추가를 숨긴다. 복사·분석 진행, 취소, 중복, 일부 실패를 한국어로 표시하며 화면 dispose는 진행 중 복사에 cancellation을 전달한다.
- 순수 Dart 테스트는 원본 보존, 이름 충돌, checksum 중복, 중간 취소, 크기 불일치, 저장 실패 rollback, 고아 임시 파일 정리, 누락·재가져오기를 검증한다. widget 테스트는 iOS UI, 취소·부분 실패·중복 문구를 검증한다.
- iOS Simulator 통합은 picker가 반환한 파일 이후의 production 경로, 즉 앱 저장소 복사, 실제 SQLite·scanner 등록, `just_audio` 재생과 DB 재개방 복원을 검증한다. 문서 선택기 UI의 제공자별 동작과 물리 기기 청감은 사용자 검증으로 남긴다.

플랫폼 판단 근거:

- Apple의 [Providing Access to Directories](https://developer.apple.com/documentation/uikit/providing-access-to-directories)에 따르면 문서 선택기는 security-scoped URL을 반환하고 디렉터리 접근 지속에는 scope lifecycle, coordinated access와 bookmark 관리가 필요하다.
- [file_picker 공식 패키지 문서](https://pub.dev/packages/file_picker)의 현재 계약은 선택한 파일 스트림을 받을 수 있지만 앱 재기동 이후 외부 폴더 bookmark lifecycle을 소유하는 API는 제공하지 않는다.
- 따라서 MVP는 외부 권한을 장기 보유하지 않고 즉시 앱 sandbox로 복사한다. open-in-place, document browser, 사진 보관함 접근을 사용하지 않으므로 별도 `Info.plist` 권한 키를 추가하지 않는다.

## 서른세 번째 개발 마일스톤

- 자동 후속 후보로 iOS 앱 관리 음원의 저장 공간 표시와 안전한 삭제를 선택했다. 네트워크, 계정, API key 또는 물리 기기 조작 없이 높은 비율로 자동 검증할 수 있고 sandbox 복사 정책에 필요한 최소 lifecycle을 완성하기 때문이다.
- `ManagedAudioLibrary` 경계는 실제 존재하는 관리 파일의 개수와 byte 합계를 계산한다. `파일 정리` 화면은 이 요약을 표시하고 `localImport` source reference인 파일에만 삭제 아이콘을 제공한다.
- 삭제는 사용자 확인 후 provenance 경로가 managed 디렉터리 내부인지 검사한다. 관리 복사본, 트랙 링크, scanned file, metadata candidate, local import 행을 정리하지만 선택 당시 외부 원본, 감상 이력과 재생 위치는 건드리지 않는다.
- memory/SQLite store 삭제, 원본 보존, 연관 저장소 정리, 사용량 갱신과 확인 dialog를 자동 테스트한다.

## 서른네 번째 개발 마일스톤

- local import lifecycle을 legacy copied, analysis pending, completed, deleting, missing, failed로 구분한다. 원자적 rename 전 copying은 byte progress와 `.part`로 표현하고, 앱 재시작은 orphan `.part`, DB 없는 완료 파일, 파일 없는 DB 행, 중단된 삭제를 반복 가능하게 복구한다.
- 복사는 `RandomAccessFile.writeFrom`을 청크마다 await해 메모리 상한을 입력 청크 수준으로 유지한다. 파일 순번·전체 수·복사 byte/전체 byte를 256 KiB 간격으로 전달하며 stream read, write, ENOSPC, 선언 크기 불일치와 cancellation을 구분한다. import/recovery/delete는 직렬화한다.
- 관리 화면은 localImport source만 시스템 공유 시트로 내보내고 삭제와 내보내기 상태를 한국어로 표시한다. production은 `share_plus`의 path 기반 `XFile`을 사용하며 테스트는 주입 adapter를 사용한다. 외부 원본과 앱 밖 경로는 대상이 아니다.
- 파일 provider 피드백은 경로 없는 strict JSON으로만 선택적으로 전달한다. generic platform/provider, 파일 수·형식, picker/import/export/relaunch 결과 외 필드는 거절하며 network upload와 자동 수집은 없다.
- repository PCM에서 macOS 내장 `afconvert`로 ALAC-in-M4A fixture를 만들고 `afinfo` semantic contract를 검사한다. iPhone 17 iOS 26.5 Simulator에서 native load, duration, position advance, stop을 통과했다. MP3/FLAC/OGG/Opus는 encoder fixture가 없고 Android ALAC는 runtime 실행 증거가 없어 미검증으로 남긴다.
- 새 share plugin까지 모든 iOS dependency가 FlutterGeneratedPluginSwiftPackage에 포함됨을 확인했다. Flutter 공식 migration 절차로 CocoaPods를 제거하고 Swift Package 전용 clean build, local import integration, WAV/AAC/ALAC playback integration을 통과했다.

남은 위험과 다음 우선순위:

- 물리 iOS/Android 기기의 MP3/FLAC/M4A 등 포맷별 태그 해독, 폴더 권한, 재생 호환성과 사람의 청감은 사용자 피드백으로 검증한다.
- 범용 metadata 모델이 노출하지 않는 composer/work/movement 계열 프레임은 상세 parser API 또는 MusicBrainz 후보를 설계하기 전까지 내부 추론으로만 보완한다.
- 다음 제품 단계는 MusicBrainz/AcoustID 후보 조회와 수동 승인 경계, 중복 작품·녹음 병합 및 사용자 편집 metadata다.
- provider별 실제 파일명 충돌·부분 실패 UX는 물리 기기 사용자 피드백에서 사례를 수집한 뒤 synthetic 회귀로 전환한다.

## 다음 설계 질문

- 이 앱은 기존 Flutter 앱 안의 새 모드인가, 별도 데스크톱 앱인가?
- 로컬 파일을 직접 재생하는 1차 플랫폼은 macOS/Windows/iOS 중 어디인가?
- 파일 태그를 앱이 수정해도 되는가, 아니면 내부 DB만 관리할 것인가?
- IMSLP 다운로드는 MVP에 포함할 것인가, 아니면 작품 상세의 외부 연결부터 시작할 것인가?
- 기존 in C 디스커버리 데이터와 로컬 라이브러리 데이터를 언제 합칠 것인가?

## 서른다섯 번째 개발 마일스톤

- 당시 SQLite schema v10에 `metadata_overrides`와 `library_entity_merges`를 추가했다. 현재 schema는 v11이며 작곡가, 작품명·번호, 악장명·순서, 연주자, 지휘자, 앙상블, 연도를 필드별 값·출처와 함께 저장하고 v1-v10 행과 legacy JSON 원본을 보존한다.
- 유효 메타데이터의 우선순위는 사용자 교정 > 사용자가 승인한 MusicBrainz 값 > 원본 태그 > 파일명·경로 추론이다. 사용자가 같은 필드를 교정해도 기존 MusicBrainz 승인값은 fallback으로 남고 초기화하면 복원된다.
- 파일 관리 화면에 좁은 화면에서도 넘치지 않는 파일 작업 메뉴, 교정 편집·취소·초기화, 현재 값과 출처, 한국어 검증 오류를 추가했다. 검색은 교정·승인된 유효값을 사용한다. 원본 태그는 읽기 전용이다.
- MusicBrainz recording 검색은 로컬 경로와 파일명을 제외하고 유효 메타데이터만 전송한다. 의미 있는 User-Agent 연락처, 1 request/second 직렬화, timeout/network/rate/server/response 오류를 구분하며 후보와 반영 필드를 각각 수동 승인한다. production 연락처는 `MUSICBRAINZ_CONTACT` dart-define으로 주입한다.
- 2026-10-20 공식 문서 기준 MusicBrainz API는 비상업 사용이 무료이고 API key 대신 의미 있는 User-Agent가 필수다. core data는 CC0, supplementary data는 CC BY-NC-SA 3.0이므로 상용 배포와 데이터 재배포 전에 사용 필드와 이용 조건을 다시 확인한다.
- 중복 탐지는 작품의 작곡가+작품 번호/정규화 제목, 녹음의 같은 작품+정규화 제목/MusicBrainz ID 같은 강한 신호만 사용한다. 자동 병합하지 않고 preview와 사용자 확인을 거친다.
- 확인된 병합은 한 SQLite transaction에서 playback history와 IMSLP work/resource/import 참조를 대표 ID로 옮기고 감사 기록을 남긴다. 실패 주입 테스트에서 감사 기록 쓰기 전 오류가 모든 참조 이동을 rollback함을 확인했다. immutable sample catalog, track/file link와 playback position은 삭제하지 않는다.
- 공식 AcoustID Web Service의 비상업 무료 사용 조건, 3 requests/second, application client key, fingerprint+duration lookup 계약을 구현하고 fixture로 검증했다. fingerprint DB는 CC BY-SA 3.0, MusicBrainz-AcoustID mapping은 CC0이다. user submission API key는 코드에 넣지 않고 submit도 지원하지 않는다.
- Chromaprint는 C/C++ library이고 공식 라이선스 페이지는 전체 배포물을 LGPL 2.1로 안내하며 `fpcalc` build가 FFmpeg에 의존한다. 현재 프로젝트에는 신뢰 가능한 native packaging과 포맷별 검증이 없으므로 production `AudioFingerprintService`는 명시적 unavailable 구현으로 남긴다. 임의 실행 파일 다운로드나 자체 지문 알고리즘은 사용하지 않는다.
- 순수 Dart discovery query는 같은 작곡가의 다른 작품, 같은 작품의 다른 녹음, 연주자 참여 녹음, 최근 감상 및 교정·승인된 파일 메타데이터로 관련 항목을 반환한다. 이 단계에서는 추천 UI가 범위 밖이었고, 후속 서른여섯 번째 마일스톤에서 로컬 추천 화면을 추가했다. 서버 개인화는 계속 범위 밖이다.

공식 정책 참고:

- MusicBrainz API: https://musicbrainz.org/doc/MusicBrainz_API
- MusicBrainz rate limiting: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- MusicBrainz data license: https://musicbrainz.org/doc/About/Data_License
- AcoustID Web Service: https://acoustid.org/webservice
- AcoustID license: https://acoustid.org/license
- Chromaprint: https://acoustid.org/chromaprint

당시 남은 위험과 후속 처리:

- MusicBrainz 검색 응답의 부족한 필드는 상세 조회로 보강한다. 서른여섯 번째 마일스톤에서 SQLite TTL cache, 동시 요청 결합과 제한된 retry/backoff를 추가했다.
- 병합 undo와 활성 alias의 검색·discovery·새 재생 큐 적용은 서른여섯 번째 마일스톤에서 완료했다. immutable sample catalog 자체는 보존하며 모든 과거 화면 모델을 물리적으로 다시 쓰지는 않는다.
- AcoustID는 production fingerprint adapter가 없어 실제 음원 식별이 비활성이다. 검증된 native packaging, 포맷 호환성, 앱 크기와 라이선스 검토가 선행돼야 한다.
- discovery 제품 화면, 한국어 추천 근거, 빈 상태와 좁은 화면 회귀는 서른여섯 번째 마일스톤에서 추가했다.
- 실제 MusicBrainz/AcoustID live 성공은 기본 회귀 테스트에 포함하지 않는다. 외부 서비스 가용성·정책·API key와 분리된 선택 검사로 유지한다.

## 서른여섯 번째 개발 마일스톤

- SQLite schema v11에서 병합 전후 영향 행 스냅샷, 되돌림 시각과 MusicBrainz TTL cache를 additive migration으로 추가했다. v10의 병합 unique constraint는 기존 감사 행을 보존하면서 활성 병합에만 적용되는 partial unique index로 전환한다.
- 작품·녹음 병합은 병합 이후 관련 데이터가 스냅샷과 같을 때만 한 transaction에서 되돌린다. 후속 연결 병합이나 사용자 변경이 있으면 복원을 거부하며, 되돌린 뒤 재병합해도 과거 감사 기록은 유지한다.
- 활성 alias chain은 cycle을 거부하고 검색, discovery와 새 재생 큐의 작품·녹음 ID를 대표 ID로 정규화한다. immutable sample catalog 자체는 삭제하거나 다시 쓰지 않는다.
- 홈 화면에 `음악 발견` 경로를 추가했다. 최근 감상, 같은 작곡가, 같은 작품의 다른 녹음과 교정된 파일 metadata를 deterministic하게 중복 제거하고 한국어 추천 근거와 함께 기존 재생 큐로 연결한다.
- MusicBrainz는 동일 요청을 합치고 검색 30일, 상세 90일, 빈 결과 1일 동안 SQLite에 cache한다. 429/503과 일시적 실패는 `Retry-After` 또는 지수 backoff로 최대 3회만 재시도한다. 오류와 malformed response는 성공 cache에 넣지 않는다.
- 2026-10-20 공식 문서를 재확인했다. MusicBrainz는 평균 1 request/second와 연락 가능한 User-Agent를 요구하고 core data는 CC0, supplementary data는 CC BY-NC-SA 3.0이다.
- AcoustID fingerprint lookup은 공식 권고에 맞춰 gzip POST body를 사용한다. URL에는 fingerprint와 로컬 경로를 넣지 않으며 키 누락, timeout, 429와 malformed response를 구분한다.
- 2026-10-20 조사 시 `chromaprint` Flutter FFI package 0.2.1은 iOS/Android를 지원하지만 raw 16-bit PCM 공급이 필요하다. MP3/FLAC/M4A 디코딩·리샘플링과 실제 기기 포맷 검증이 준비되지 않아 의존성을 추가하지 않았고 production capability는 명시적으로 unavailable이다.

검증 경계와 남은 위험:

- 병합 undo, alias chain/cycle, 변경 충돌, 재시작 영속성, MusicBrainz cache/동시 요청/TTL/retry, gzip AcoustID POST, discovery 좁은 화면과 감상 checkpoint는 deterministic test로 검증한다.
- 실제 MusicBrainz/AcoustID live 호출은 키와 서비스 상태에 의존하므로 기본 회귀 테스트에서 제외한다.
- Chromaprint production 활성화에는 포맷별 PCM decoder 선정, resampling 계약, native package 공급망 검토, 앱 크기 측정과 iOS/Android 실기기 fixture 검증이 필요하다.
- 실제 음질, Bluetooth/headphone route, interruption, iCloud 문서 제공자 UX는 사용자 실기기 피드백 대상으로 유지한다.

공식 정책 참고:

- MusicBrainz API: https://musicbrainz.org/doc/MusicBrainz_API
- MusicBrainz rate limiting: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- MusicBrainz data license: https://musicbrainz.org/doc/About/Data_License
- AcoustID Web Service: https://acoustid.org/webservice
- Chromaprint releases: https://github.com/acoustid/chromaprint/releases
- Flutter Chromaprint package assessment: https://pub.dev/packages/chromaprint

## 서른일곱 번째 개발 마일스톤

- 외부 계약이나 실기기 없이 이어서 처리할 데이터 복구 우선순위로 활성 감상 세션 checkpoint를 선택했다.
- 재생 상태 이벤트를 기준으로 30초마다 누적 감상 시간과 현재 위치를 SQLite에 저장한다. pause, stop, 악장 전환, 완료, 오류와 dispose의 기존 강제 저장 경계는 유지한다.
- 30초 이전에는 불필요한 쓰기를 만들지 않고, checkpoint 뒤에도 같은 세션을 이어서 집계하는 것을 fake clock과 memory store로 결정론적으로 검증한다.

## 내부 베타 출시 준비 마일스톤

- SQLite schema v13에 사용자 카탈로그를 위한 정규화된 작곡가·작품·악장·녹음·트랙
  테이블과 중단 가능한 전체 초기화 상태를 additive migration으로 추가했다.
- production 기본값은 샘플 데이터 없는 빈 카탈로그다. 데모 카탈로그와 샘플 스캔은
  `ENABLE_DEMO_LIBRARY=true`인 개발 실행에서만 노출한다.
- 스캔·가져오기 후보는 태그, 추론값과 사용자 교정을 바탕으로 새 작품·녹음을 만들거나
  기존 작품·녹음의 빠진 악장에 추가할 수 있다. 여러 파일의 악장명과 순서를 저장 전에
  조정하고, 잘못된 파일 연결은 카탈로그·링크·파일 상태를 한 transaction에서 다시
  정리한다.
- 설정에서 앱 관리 용량, 로컬 저장·외부 서비스 경계, 라이선스와 전체 초기화를 제공한다.
  전체 초기화는 외부 원본을 보존하고 실패한 관리 파일 정리를 다음 시작에서 재개한다.
- Android/iOS 백업에서 앱 관리 음원과 IMSLP 음원 복사본을 제외하고 SQLite metadata는
  사용자의 OS 백업 대상으로 유지한다.
- 내부 베타 이름, 임시 아이콘, 버전 `0.1.0+1`, iOS privacy manifest와 Android release
  signing 경계를 추가했다. release AAB는 debug key를 사용하지 않으며 외부 keystore나
  CI secret이 없으면 실패한다.

공개 출시 전에는 실제 개인정보·지원 URL, 운영 연락처, 배포 서명 자격 증명, 스토어
metadata와 물리 기기 사용자 피드백이 필요하다. 이 외부 결정이 없는 상태에서 임의의
계정·클라우드·원본 태그 쓰기·IMSLP scraping을 추가하지 않는다.

## 출시 전 데이터 안정성 고도화 마일스톤

- SQLite schema v14에 경로를 저장하지 않는 `playback_queue_state`를 additive하게 추가했다. track ID와 현재 track ID만 저장하며 재시작 때 현재 카탈로그와 실제 연결 파일로 큐를 재구성한다. 누락 악장은 제외하고 모든 항목이 사라진 큐는 재생하지 않는다.
- 논리 백업 v1은 카탈로그, 후보·교정, 파일 연결, 병합 감사, 재생 위치·감상 이력·보관 설정과 IMSLP 작품 연결을 포함한다. 원본 및 관리 음원, 실제 파일·폴더 경로, scan location, IMSLP 다운로드 cache와 일시 재생 큐는 제외한다. 복원한 파일은 누락 상태로 가져와 실제 음원을 다시 연결하게 한다.
- 백업은 형식·버전·scope·count·참조·alias·민감 경로를 검증하고 preview 뒤 한 transaction에서 반영한다. 동일 백업 재가져오기는 idempotent하며 충돌 또는 실패 시 부분 반영을 남기지 않는다.
- 누락 파일 재연결은 fingerprint, 크기, 포맷과 태그 근거를 점수화하되 자동 확정하지 않는다. 사용자 확인 뒤 기존 file ID와 교정·링크·재생 위치·감상 이력·가져오기 출처를 transaction으로 유지한다. duration은 현재 `LocalAudioFile` 계약에 없어 판단 근거에 포함하지 않는다.
- 100명·1,000작품·1,000녹음·5,000트랙 fixture에서 인덱스 기반 lookup, 검색 debounce, 상세·discovery·큐 생성을 검증한다. 개발 환경 benchmark는 검색 약 189 ms, 상세 약 2~3 ms, discovery와 큐 계획 1 ms 미만이다. 실제 SQLite 카탈로그 로드는 9개 query와 5초의 넉넉한 회귀 상한을 사용한다. 이는 물리 기기나 실제 대형 컬렉션의 체감 성능 보증이 아니다.
- 재생 명령과 dispose를 직렬화하고 큐 저장 중 position-only 이벤트를 중복 기록하지 않는다. 앱 기동 복원, 일부·전체 파일 누락, SQLite 재개방, 명령 경쟁을 deterministic test로 고정했다.
- 현재 재생, 큐와 파일 행의 역할·상태·순서·선택·disabled semantics를 보강하고 누락 파일 대화상자를 320px·Dynamic Type 200%에서 검증했다. VoiceOver 발화 품질, 실제 출력 route, Files/iCloud 제공자와 사람의 청감은 사용자 실기기 피드백 범위다.

## 배포 보류 중 자체 QA 고도화 (2026-10-23)

- 사용자 결정: 최종 디자인·아이콘은 디자인 작업에서 확정한다. 공개 페이지 게시,
  스토어 입력, 촬영·pinning·서명은 이번 고도화에서 진행하지 않는다.
- 전체 초기화 후 남던 schema v14 재생 큐를 삭제 범위에 넣었다. 재생 정지·빈 큐·대기 중
  이력/위치 저장을 삭제 전에 처리하여 정지나 dispose가 삭제된 데이터를 다시 쓰지 않게 한다.
- 큐 저장 실패의 동일 값 재시도, 명시적 clear 순서, 초기 idle 복원 보존을 회귀로 고정한다.
- 진단 재실행은 청감 응답을 초기화하고 예외를 개인정보 없는 한국어 오류로 처리한다.
- 자체 합성 FLAC, 호스트 PCM 신호 분석, 네이티브 FLAC 완료·seek 테스트를 추가한다.
  소리 출력·stereo route·gapless는 이 증거 범위 밖이며 MP3는 로컬 생성 도구가 없어 남긴다.
- 로컬 QA runner는 command별 종료·timeout·로그 해시와 소스 변경을 추적한다. 시뮬레이터는
  개인 데이터가 없는 전용 기기만 허용하며 스토어 촬영/물리 기기 검증과 명확히 구분한다.
