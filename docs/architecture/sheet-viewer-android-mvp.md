# Android 악보 뷰어 MVP 구현 메모

작성일: 2026-08-20

## 구현 방향

`apps/in_c_sheet`를 Android 전용 Flutter 앱으로 시작한다. 기존 `in_c_click`,
`in_c_chime`와 같은 앱 포트폴리오 구조를 따르되, PDF 렌더링은 Flutter widget만으로
직접 만들지 않고 `pdfrx`를 사용한다. `pdfrx`는 PDFium 기반이고 PDF viewing,
link handling, page layout customization, page manipulation 관련 확장 지점이 있어
향후 PDF link annotation 정리와 페이지 정리 기능으로 이어가기 좋다.

## 1차 MVP 포함 범위

- PDF 파일 선택.
- 앱 내부 문서 저장소에 PDF 사본 저장.
- 로컬 라이브러리 record 저장.
- 제목, 작곡가, 태그, 메모, 파일 경로, 최근 열기, 마지막 페이지, 즐겨찾기 필드.
- 라이브러리 목록, 검색, 최근 열기/즐겨찾기 표시.
- PDF viewer 화면.
- 이전/다음 페이지 이동.
- 현재 페이지/전체 페이지 표시.
- 마지막 페이지 저장.
- URL link annotation 탭 비활성화.
- PDF link annotation 영역 표시 토글.
- 기본 확대/축소/이동은 `pdfrx` viewer 동작에 맡긴다.

## 1차 MVP 제외 범위

- 주석/필기.
- 튜너/메트로놈.
- PDF link annotation 제거 사본 생성.
- 세트리스트.
- Bluetooth 페달.
- ChordPro/text.
- 이미지 파일.
- 클라우드 동기화.
- 계정/서버 저장.

## 기술 리스크

- `file_picker` 12.x는 API가 크게 바뀌었으므로 이후 예제/문서와 버전을 맞춰 봐야 한다.
- `pdfrx`는 자체 캐시와 progressive loading을 제공하지만, 실제 50-100페이지 스캔 PDF에서
  Android 태블릿 메모리/지연을 계측해야 한다.
- 앱 내부 사본 저장은 MVP에 안전하지만, MobileSheets처럼 기존 폴더를 직접 참조하는
  고급 사용성은 V1에서 별도 설계가 필요하다.
- PDF link annotation 제거는 viewer 기능이 아니라 PDF 객체 쓰기/사본 생성 기능이므로
  별도 spike가 필요하다.
- URL link annotation은 viewer layer에서 차단하지만, 원본 PDF의 annotation 객체는 그대로
  남아 있다.
