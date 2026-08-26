# Clef 외부 테스터 체크리스트

작성일: 2026-08-26

## 시작 전

- 앱 첫 화면 오른쪽 위 `테스트 정보`에서 앱 이름, 버전/build를 확인한다.
- TestFlight 또는 APK 설치 방식과 기기명/OS 버전을 기록한다.
- 가능하면 평소 쓰는 PDF 악보 1개와 스캔/이미지 악보 1개를 준비한다.

## 필수 테스트

15분 안에 아래 흐름만 먼저 확인한다.

1. 빈 라이브러리에서 `악보 추가`로 PDF를 가져온다.
2. 악보 정보에서 제목, 작곡가, 태그, 컬렉션, 그룹, 별점을 입력한다.
3. 라이브러리 검색/정렬/필터로 방금 입력한 악보를 다시 찾는다.
4. PDF를 열고 이전/다음 페이지, 세로 스크롤, 1페이지 보기 중 하나를 확인한다.
5. 펜 또는 형광펜으로 짧게 필기하고 앱을 다시 열어 복원되는지 확인한다.
6. 텍스트 주석을 하나 추가하고 다시 탭해 수정 또는 삭제한다.
7. 북마크를 추가하고 북마크 목록에서 해당 페이지로 이동한다.
8. 튜너를 열어 Concert/Bb Trumpet 표시와 Chromatic/Bb Trumpet 감지 profile을 전환한다.
9. 조용한 상태와 440Hz reference tone 또는 실제 트럼펫 입력에서 튜너 상태를 확인한다.
10. 메트로놈을 열어 BPM/박자를 바꾸고 start/stop을 확인한다.
11. 자동 스크롤을 시작한 뒤 수동 페이지 이동 시 정지되는지 확인한다.
12. `테스트 정보`에서 `피드백 템플릿 복사`를 눌러 양식이 복사되는지 확인한다.

## 선택 테스트

시간이 있으면 아래 항목을 추가로 확인한다.

1. JPG/PNG 이미지를 PDF 악보로 묶어 등록한다.
2. 세트리스트를 만들고 악보를 추가/정렬한 뒤 첫 곡을 연다.
3. PDF 공유와 필기 포함 PDF 공유를 실행한다.
4. 한글 텍스트 주석만 있는 악보에서 PDF export 제한 안내와 원본 공유 fallback을 확인한다.
5. URL link가 있는 PDF에서 link tap 차단과 link 제거 사본 생성을 확인한다.
6. metadata 백업과 PDF 포함 전체 백업을 생성한다.
7. 색상 반전, 어두운 배경, crop mask, 페이지 숨김/회전 표시를 확인한다.
8. hardware keyboard 또는 Bluetooth 페달이 있으면 Space/Page/Arrow 키 넘김을 확인한다.
9. 컬렉션/그룹/별점이 앱을 다시 열어도 유지되는지 확인한다.

## Known Issues

- 튜너 정확도와 latency는 Android/iOS 실기기 검증 중이다.
- iOS Simulator는 튜너 정확도 판단 대상이 아니다.
- 한글/비ASCII 텍스트 주석은 PDF export에서 제한될 수 있고, 이 경우 원본 PDF 공유로 fallback한다.
- 필기 포함 PDF 공유는 편집 가능한 PDF annotation embed가 아니라 새 PDF 사본에 stamp하는 방식이다.
- crop/rotation/page hide는 원본 PDF를 바꾸지 않는 앱 metadata/display 중심 기능이다.
- 연결 파일 metadata는 내부 저장 모델만 있고, 테스터용 파일 연결 관리 UI는 아직 없다.
- S Pen pressure와 palm rejection은 아직 고도화 전이다.
- Bluetooth 페달은 기본 key mapping 수준이며, 페달별 mapping UI는 없다.
- cloud sync/account/server 저장은 없다.

## 실패 시 기록할 정보

`테스트 정보` 화면의 `피드백 템플릿 복사`를 눌러 아래 정보를 채워 보낸다.

- 앱 버전/build.
- 기기명과 OS 버전.
- 설치 방식: TestFlight, debug APK, release APK.
- PDF 종류와 페이지 수: 스캔 PDF, 일반 PDF, 이미지 변환 PDF 등.
- 한 일: 누른 버튼, 메뉴, 입력값.
- 기대한 결과.
- 실제 결과.
- 표시된 오류 문구.
- 같은 순서로 다시 했을 때 재현되는지.
