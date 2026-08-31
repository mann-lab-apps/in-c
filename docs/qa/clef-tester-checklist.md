# Clef 외부 테스터 체크리스트

작성일: 2026-08-26

## 시작 전

- v1 RC 전체 실행 순서와 기록 양식은 `docs/qa/clef-v1-rc-qa-plan.md`를 먼저 확인한다.
- 실기기/외부장비 당일 실행표는 `docs/qa/clef-v1-device-qa-runbook.md`를 사용한다.
- 설치 후 런처/앱 이름이 `Clef`로 보이는지 확인한다.
- 앱 첫 화면 오른쪽 위 `테스트 정보`에서 앱 이름, 버전/build를 확인한다.
- TestFlight 또는 APK 설치 방식과 기기명/OS 버전을 기록한다.
- 가능하면 평소 쓰는 텍스트 PDF 악보 1개, 스캔/이미지 악보 1개, 큰 PDF 1개를 준비한다.
- iPad/TestFlight와 Android 태블릿/APK를 모두 테스트할 수 있으면 화면 크기별 표시 차이를 함께 기록한다.

## 필수 테스트

15분 안에 아래 흐름만 먼저 확인한다.

1. 빈 라이브러리에서 `악보 추가`로 PDF를 가져온다.
2. 악보 정보에서 제목, 작곡가, 태그, 컬렉션, 그룹, 별점을 입력한다.
3. 라이브러리 검색/정렬/필터로 방금 입력한 악보를 다시 찾는다.
4. PDF를 열고 이전/다음 페이지, 세로 스크롤, 1페이지 보기 중 하나를 확인한다. 세로모드에서는
   상단 toolbar를 좌우로 밀어 `필기 모드`, `페이지 정리`, `공연 설정`, `공연 모드`에 접근한다.
5. 펜 또는 형광펜으로 짧게 필기하고 앱을 다시 열어 복원되는지 확인한다.
6. 텍스트 주석을 하나 추가하고 다시 탭해 수정 또는 삭제한다.
7. 북마크를 추가하고 북마크 목록에서 해당 페이지로 이동한다.
8. 튜너를 열어 Chromatic/Target mode, Guitar/Bass/Ukulele/Mandolin/Strings/Bb/Eb/F preset을 전환한다.
9. 조용한 상태, 440/441/442Hz A4 quick action, 440Hz reference tone, 실제 악기 입력에서 target shortcut,
   sharp/flat 표기, LED, 입력 bar, `소리가 너무 작습니다`, `음을 잡는 중`, `조금 낮아요`, `조금 높아요`,
   `맞았습니다` 상태를 확인한다.
10. Target mode에서 target lock을 켜고 다른 줄/음을 넣었을 때 `타겟 음을 기다리는 중`으로 안정적으로
   표시되는지 확인한다.
11. 가능하면 Piascore 또는 무료 상용 튜너앱과 A4/E2/C4/G4/C6 cents 값을 비교해 차이를 기록한다.
12. 튜너에서 현재 음을 target으로 추가하고 custom preset을 저장/적용/삭제한다.
13. 메트로놈을 열어 BPM/박자를 바꾸고 start/stop을 확인한다.
14. 자동 스크롤을 시작한 뒤 수동 페이지 이동 시 정지되는지 확인한다.
15. `테스트 정보`에서 `피드백 템플릿 복사`를 눌러 양식이 복사되는지 확인한다.

## 선택 테스트

시간이 있으면 아래 항목을 추가로 확인한다.

1. JPG/PNG 이미지를 PDF 악보로 묶어 등록한다.
2. 세트리스트를 만들고 악보를 추가/정렬한 뒤 첫 곡을 연다.
3. PDF 공유와 필기 포함 PDF 공유를 실행한다.
4. 한글 텍스트 주석만 있는 악보에서 PDF export 제한 안내와 원본 공유 fallback을 확인한다.
5. URL link가 있는 PDF에서 link tap 차단과 link 제거 사본 생성을 확인한다.
6. metadata 백업과 PDF 포함 전체 백업을 생성한다.
7. 색상 반전, 어두운 배경, crop mask, 페이지 숨김/회전 표시를 확인한다.
8. hardware keyboard 또는 Bluetooth 페달이 있으면 Space/Page/Arrow 키가 한 페이지씩 넘기고
   PDF가 조금씩 스크롤되지 않는지 확인한다. 첫 page에서 이전, 마지막 page에서 다음을 누르면
   `곡 처음` 또는 `곡 끝` 안내가 나와야 한다.
9. 컬렉션/그룹/별점이 앱을 다시 열어도 유지되는지 확인한다.
10. 연결 파일을 추가하고 role을 Full score/Part/Original 등으로 바꾼 뒤 viewer에서 전환한다.
11. 리허설 마크를 추가/수정/삭제하고 quick jump로 이동한다.
12. crop preset을 모든 page/홀수짝수/cover 제외 scope로 저장하고 적용/삭제한다.
13. page template에서 숨김/순서/빈 페이지/visibility preset 요약이 이해되는지 확인한다.
14. 세트리스트 리허설 모드에서 곡별 시작 page와 메모가 viewer 진입에 반영되는지 확인한다.
15. viewer의 페이지 탐색 grid에서 현재 page, 숨김 page, duplicate page 표시를 확인한다.
16. 텍스트가 포함된 PDF에서 `PDF 본문 검색`으로 결과 page 이동, 이전/다음 결과, 검색어 지우기를 확인한다.
17. 세트리스트를 복제하고 곡별 예상 시간/전환 시간/총 예상 시간이 보존되는지 확인한다.
18. 페달 mapping을 `직접 설정`으로 바꾼 뒤 Space, Shift+Space, Arrow, Page, Enter, Tab, Media key action이 기대대로 동작하는지 확인한다.
19. 큰 annotation layer가 있는 악보에서 필기 포함 PDF 공유 전 annotation 요약 안내가 표시되는지 확인한다.
20. crop preset을 odd/even 또는 cover 제외로 적용한 뒤 페이지별 crop mask와 crop-to-fit이 맞는지 확인한다.
21. metadata 백업/복원과 PDF 포함 전체 백업/복원 후 custom pedal, page별 crop, 세트리스트 예상 시간이 유지되는지 확인한다.

## Known Issues

- 튜너의 synthetic sine/noise/time-series 테스트는 통과했다. Preset/target/custom preset, target lock,
  sharp/flat 표기, LED/input bar, A4 440/441/442 quick action/history, A4 보정 제안, adaptive noise
  floor 1차는 자동 테스트로 확인했다. 실제 악기 기준 정확도, latency, 외부
  마이크 안정성은 Android/iOS 실기기 검증 중이다.
- 2026-08-31 기준 `1.0.0+10` 튜너 보강분 AAB는 준비됐지만, ADB에 연결된 Android 기기가 없어
  실제 마이크 QA는 아직 기록되지 않았다.
- iOS Simulator는 튜너 정확도 판단 대상이 아니다.
- 한글/비ASCII 텍스트 주석은 PDF export에서 제한될 수 있고, 이 경우 원본 PDF 공유로 fallback한다.
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
