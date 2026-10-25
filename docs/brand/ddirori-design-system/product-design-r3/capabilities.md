# 실제 연결 기능 조사

2026-10-25. 착수 HEAD `827ad18203e673b1e923d00cbcf0fd7f3af755d7` + 진행 중 미커밋 R2 구현. 설계 시 확인한 파일은 `evidence/source-audit.json`과 revision에 기록한다. 코드 존재·선택 확장자와 실제 기기 성공을 구분한다. 기존 R2의 제품 입력 해시와 달라진 파일은 새 R3 기준에 기록하고 R2를 재고정하지 않는다.

## 분류

- **A 현재 기능:** 해당 앱 내부 코드에 경로가 있다. 물리기기 검증까지 뜻하지 않는다.
- **B 수동 연결:** A 기능들을 사용자가 파일로 이어갈 수 있다. 수신 앱 성공 확인은 별도다.
- **C 목표 adapter:** 제품·플랫폼 연결 기능을 추가해야 한다.
- **D 보류:** 데이터나 기능이 부족해 현재 유효한 연결을 제공할 수 없다.

| 기능 | 상태·실제 근거 | 경계 |
| --- | --- | --- |
| Play 파일 가져오기 | A. `PlatformAudioFilePicker.pickAudioFiles`, `LocalAudioImportCoordinator.importFiles` | FLAC/MP3/M4A/ALAC/OGG/OPUS/WAV 선택. 2GiB 정책·MIME/길이/체크섬·임시파일 처리. 선택 가능과 codec 재생 보증은 다름 |
| Play 보관 | A. `local_audio_import.dart:_copySelection` | 앱 관리 영역으로 복사, SHA256 중복 판정. 분석 대기는 가져오기 실패와 다름. 외부 원본을 덮어쓰지 않음 |
| Play 작품 등록 | A. `main.dart:_openCatalogRegistration`, `CatalogRegistrationScreen`, `catalog.register` | 가져오기만으로 모든 파일이 자동으로 작품/녹음/악장이 되는 것이 아님. 작곡가·작품명·녹음명·악장명 필수, 나머지 선택 항목과 기존 재정리 기능 보존 |
| Play 음원 내보내기 | A. `LibraryManagementScreen._exportManagedFile`, `ManagedAudioLibrary.exportFileFor`, `SharePlusManagedAudioExporter` | 관리 음원이며 completed·실제 파일 존재·안전한 관리 경로여야 함. 스캔한 모든 파일에 무조건 노출할 수 없음. 공유 success/dismissed/unavailable/failed 별도 |
| Play 외부 진입 | C/D. iOS Info.plist, AndroidManifest.xml 조사 | Play를 여는 제품 전용 URL scheme·오디오 수신 route를 확인하지 못함. url_launcher 의존성은 해당 기능의 증거가 아님 |
| Play IMSLP | A, 이번 여정 제외. `imslp.dart`, `imslp_download.dart` | PDF/MIDI/audio 자료·권리/대기 상태가 존재하나 외부 자료 권리·다운로드 경로를 첫 사용 전제 조건으로 삼지 않음. 원격 자료는 이번에 다운로드하지 않음 |
| Score PDF/이미지 | A. `SheetLibraryStore.importPdf/importPdfBytes/importImagesAsPdf`, `SheetFileImportPolicy` | PDF, JPG/JPEG/PNG. HEIC/HEIF는 picker에 보여도 정책에서 거절. MusicXML·.chromatics를 열 수 있다고 쓰지 않음 |
| Score 파일 수명 | A. `_writeImportedPdf`, `_writeLinkedFile` | 앱 문서 영역의 사본. 직접 참조 동기화가 아님. 가져오기 후 외부 파일의 수정이 자동 반영되지 않음 |
| Score PDF 수신 | A. `clef/shared_imports` MethodChannel, Flutter `_importSharedFiles` | iOS PDF document type와 `ClefSharedImportBridge` security-scoped 접근/캐시 복사, Android VIEW/SEND/SEND_MULTIPLE PDF intent와 MainActivity bridge. iOS Share Extension과 별개이며 여기서는 기기 성공 미검증 |
| Score 음원 연결 | A. `pickLinkedFile/importLinkedFileBytes`, `controller.addLinkedFile`, `_showPracticeTools/_showLinkedAudioPlayer` | MP3/WAV/M4A/AAC/FLAC/OGG 선택. 기존 악보에 연결 사본 추가. ALAC/OPUS 선택·변환 기능은 확인되지 않음. 일반 오디오 Share intent 수신과 동일하지 않음 |
| Score 내보내기 | A. `shareCandidates`, 실제 SharePlus 경로 | 현재 PDF/주석 적용 사본/연결 파일/백업은 구분. 한국어 주석 PDF의 원본 fallback 한계 유지. 공유 종료가 상대 앱 저장 확인은 아님 |
| Studio 새 문서 | A. `openNewScoreWizard`, `createDefaultNewScoreDraft`, `submitNewScoreWizard` | solo-melody·다장조·4/4·기존 기본 설정. 기존 템플릿·설정 전체를 R3의 간단한 예제로 축소하지 않음 |
| Studio 파일 | A. `saveNativeProject`, project/musicXml bridge | .chromatics 프로젝트 저장/열기, MusicXML 가져오기·저장·사본 내보내기. 실제 저장 성공만 현재 snapshot의 clean 처리 |
| Studio PDF | A. `App.savePdf`, `src/main/index.ts:pdf:save` | Electron printToPDF→writeFile, 사용자 저장 dialog 취소는 null. PDF는 현재 화면/파트 설정의 출력 사본이며 프로젝트 저장과 별개 |
| Studio 플랫폼 연결 | C. package build 설정·main/preload 조사 | 프로젝트 파일 IO 존재를 OS 파일 연결·전용 protocol 등록으로 간주하지 않음. 현재 조사 범위에서 제품군 직접 열기 등록을 확인하지 못함 |
| 공통 ServiceLink | A UI만, `packages/ddirori_web/src/index.tsx` 및 Flutter 대응 | 이름·기능·availability·callback. 설치 조회·URL 검증·전달·상대 앱 완료·계정 인증 기능 없음 |
| 공통 작품 식별 | D. Play 도메인 IDs vs Score local score ID vs Studio document IDs | 서로 같은 namespace가 아님. 제목/파일명 유사성은 동일 작품·동일 녹음의 증거가 아님 |

## 채택한 두 연결

### J01 Studio → Score · PDF — B

Studio desktop에서 PDF 파일 생성 → 사용자가 모바일 기기로 파일 전달 → Score의 PDF picker 또는 지원되는 PDF 수신 경로 → 앱 내부 사본·메타데이터 저장 → 실제 지면 열기. 기기 간 이동을 같은 기기의 앱 전환처럼 그리지 않는다. ‘Score에서 열기’ 직접 동작은 C이며 이번 추천 범위에 포함하지 않는다.

### J02 Play → Score · 관리 음원 — B

관리 파일의 내보내기 → 사용자가 Files/파일 앱 등 접근 가능한 사본 보관 → Score에서 대상 악보를 직접 열고 악보 정보→연결 파일 추가 → 연습 도구의 연결 음원. WAV·MP3·M4A·FLAC·OGG는 선택 확장자 교집합이고 codec/profile 동등 보증이 아니다. .m4a 컨테이너만으로 모든 ALAC가 재생된다고 판단하지 않는다. 이번 시안은 WAV다.

## 보류한 연결

Score→Play 관련 녹음은 ID 매핑·검색 진입과 사용자 자료 존재를 확인할 수 없어 D. 제목을 복사하는 새 버튼도 실제 Clipboard/검색 흐름 검증 없이 이미 제공되는 것으로 쓰지 않는다. Play→Score IMSLP PDF 전달은 별도 자료 권리·내보내기 UX 조사 후 재평가한다. 인증·공유 라이브러리·클라우드 저장은 두 여정의 전제가 아니다.

## 현재 코드와 목표의 차이

1. Play 현재 import 취소는 scanStatus 문구가 있고, R3 목표는 오류/완료 성취를 발생시키지 않는 것이다. 기존 지원 안내와 실제 task 결과를 보존한다.
2. Score `importPdf/importImagesAsPdf/importSharedPdfFiles`는 `_scores`를 갱신한 뒤 `saveScores`를 기다리는 코드가 있다. 첫 사용 성공을 persistence 전 목록 노출로 판정하면 안 된다. 실패 때 목록/사본/재시도 정책을 먼저 확인해야 한다. 이번 작업에서 수정하지 않았다.
3. 진행 중 R2에서 일반 `_replace`는 persistence 뒤 모델 publish로 개선됐다. 기존 linked metadata 갱신의 개선을 import 전 경로의 완료로 확대하지 않는다.
4. Score 공유 PDF 수신은 경로 기반 중복 처리이며 전체 파일 checksum transaction이 아니다. R3 메모리 전달의 replay 방지는 미래 앱 구현 완료 증거가 아니다.
5. Studio PDF 생성 성공이 프로젝트 dirty를 해제하지 않는 경계를 보존한다. R3의 두 완료 문구도 구분한다.

## 플랫폼 수동 검수

PDF 수신(iOS document open/Android PDF intent), 클라우드 provider의 다운로드 지연·취소·권한 수명, Play share result와 실제 파일 보관, Score linked-audio codec·오디오 세션은 물리 기기에서 미검수다. 미설치는 실제 host 확인 결과일 때만 표현하고, 확인할 수 없으면 unknown으로 유지한다. Android queries·iOS scheme allowlist를 이번에 추가하지 않았다. 공개 설치 URL은 확인·주입되기 전까지 가짜 주소로 대체하지 않는다.
