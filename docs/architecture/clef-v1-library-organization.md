# Clef V1 라이브러리 조직화 메모

작성일: 2026-08-26

## 범위

이번 V1 보강은 악보 수가 늘어난 사용자가 라이브러리를 빠르게 정리하고 다시 찾는 흐름을
우선한다. 구현 범위는 컬렉션, 그룹, 별점, 연결 파일 metadata와 실제 library profile 저장소
분리 1차다. 기존 폴더 직접 참조는 플랫폼 파일 권한과 데이터 이관 정책이 커서 후속으로 분리한다.

## 구현된 모델

- `SheetScore.collection`: 세트리스트와 별도로 악보를 묶는 상위 분류.
- `SheetScore.group`: 레슨, 파트, 연주회 단위 같은 보조 분류.
- `SheetScore.rating`: 0-5 범위 정수 별점. 잘못된 저장값은 decode/copy 시 clamp한다.
- `SheetScore.linkedFiles`: 한 곡에 여러 보조 파일을 연결하기 위한 metadata 모델.
- `SheetLibraryProfile`: 기본/추가 라이브러리 profile catalog와 active profile을 저장한다.

`linkedFiles`는 아직 제품 UI에 노출하지 않는다. V1 다음 단계에서 파트보, 반주 음원, 다른 조성
PDF, 레슨 자료를 한 악보 상세에 묶는 UI를 붙일 수 있게 저장 모델과 백업 round-trip만 먼저
고정했다.

## 라이브러리 UI 정책

- 악보 정보 편집 dialog에서 제목, 작곡가, 태그, 컬렉션, 그룹, 별점, 메모를 편집한다.
- 라이브러리 검색은 제목, 작곡가, 태그, 컬렉션, 그룹, 메모를 함께 본다.
- 필터는 즐겨찾기, 태그, 컬렉션, 그룹, 최소 별점을 제공한다.
- 정렬은 최근 열기, 제목, 작곡가, 별점, 가져온 날짜를 제공한다.
- 목록 카드에는 컬렉션, 그룹, 별점을 보조 정보로 한 줄만 표시한다.
- 상단 library switcher는 기본 라이브러리와 추가 profile을 전환한다. 기본 라이브러리는 기존
  preference key를 유지하고, 추가 profile은 profile id를 붙인 scoped key에 scores/setlists/view/
  favorite preset metadata를 저장한다.

## 폴더 직접 참조 후속 설계

MobileSheets식 기존 폴더 직접 참조는 Android에서 Storage Access Framework의 persistent URI
permission을 전제로 설계해야 한다. iOS는 보안 범위 URL 접근과 Files provider별 동작 차이가 있어
Android와 같은 “폴더를 계속 감시하는 라이브러리” 경험을 그대로 보장하기 어렵다.

후속 구현 전에 결정할 항목:

- 앱 내부 사본 저장과 폴더 직접 참조를 동시에 허용할지.
- 참조 파일이 이동/삭제된 경우 라이브러리 항목을 어떻게 복구할지.
- 폴더 scan 결과를 자동 등록할지, 사용자가 확인 후 등록할지.
- Android URI permission 갱신/상실 시 안내 문구.
- iOS에서는 folder reference 대신 document picker/import 중심으로 제한할지.

V1 현재 기본값은 앱 내부 사본 저장이다. 이 방식은 TestFlight/APK 테스터에게 파일 접근 실패를
줄이는 데 유리하고, 전체 백업 ZIP과도 충돌이 적다.

## 남은 V1 작업

- 기존 폴더 직접 참조 spike 구현.
- cloud file import 범위 결정.
