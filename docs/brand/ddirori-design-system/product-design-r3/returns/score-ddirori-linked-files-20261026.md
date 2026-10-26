# Score R3 · 파트와 연결 파일 sheet

## 적용 범위

- 실제 화면: `SheetViewerScreen` → `모든 도구` → `보기 옵션` → `파트/버전`.
- raw `ListTile`과 아이콘 버튼으로 구성된 목록을 공통 `showDdiroriSheet`, `DdiroriItem`, `DdiroriStatusBadge`, `DdiroriButton`, `DdiroriMenuButton` 조합으로 교체했다.
- 현재 열린 PDF는 별도 상태로, 연결 파일은 파일명·역할·가용 상태와 행동으로 구분한다. 앱 sandbox의 절대 경로는 기본 화면에 노출하지 않는다.

## 보존 계약

- PDF 전환, 이미지 보기, 오디오 재생, 역할 metadata 저장, 연결 제거는 기존 `SheetLibraryController`와 viewer 경로를 그대로 사용한다.
- 파일 없음 또는 지원하지 않는 형식에서는 열기만 비활성화한다. 역할 변경과 연결 제거는 복구를 위해 계속 제공한다.
- PDF 원본, 페이지·zoom·crop·주석·undo, 세트리스트와 연결 파일 보존 정책은 변경하지 않았다.

## 자동 검증

`test/score_r2_viewer_test.dart`의
`real PDF score parts keep file actions and paths scoped to Ddirori rows`는 390px 폭·200% 글자에서 실제 3쪽 PDF와 임시 PDF 연결 파일로 다음을 확인한다.

1. `모든 도구 → 보기 옵션 → 파트/버전` 실제 widget 진입
2. 파일명·역할·`사용 가능` 상태와 열기 행동 노출
3. absolute sandbox path 비노출
4. 역할 변경 저장 후 동일한 PDF document identity 유지

이 검증은 파일 전환 버튼을 누르거나 실제 iOS Files provider, 오디오 codec, 이미지 렌더링을 검증하지 않는다.

## 미검수

- iPhone/iPad의 200% 글자·가로 화면·VoiceOver 및 실제 touch target
- iCloud/Files provider에서 사라진 파일·외부 경로의 복구 동선
- 실제 PDF 전환, 이미지 zoom, 로컬 오디오 codec·출력 route
