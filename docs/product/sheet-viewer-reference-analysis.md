# Android 악보 뷰어 레퍼런스 분석

작성일: 2026-08-20

## 목적

Android 우선 신규 악보 뷰어 앱을 설계하기 위해 Piascore와 MobileSheets를 공식
문서, 스토어 설명, 사용자 인터뷰 기준으로 분석한다. 목표는 경쟁 앱의 UI를 복제하는
것이 아니라, 연주자가 악보 앱에 기대하는 기본 기능과 Android에서 아직 해결되지 않은
불편을 분리해 MVP와 장기 로드맵으로 정리하는 것이다.

## 사용자 리서치 요약

- iPad에서는 Piascore를 사용한다.
- Galaxy에서는 MobileSheets를 사용한다.
- Android 악보 앱에 튜너 기능이 없어 아쉽다.
- CamScanner류 PDF 오른쪽 하단 워터마크 영역을 누르면 홈페이지가 열리는 링크가
  있는데, Galaxy 쪽에서 이 하이퍼링크를 제거하거나 비활성화하기 어렵다.
- 실제 CamScanner 샘플 파일은 아직 확보되지 않았다.

이 피드백은 두 가지 기회로 정리된다.

- 악보를 보다가 바로 조율, 메트로놈, 공연 모드로 이어지는 Android 태블릿 경험.
- visible watermark 제거가 아니라 PDF link annotation을 탐지하고, 사용자가 명시적으로
  비활성화하거나 제거 사본을 만들 수 있는 PDF 정리 기능.

## Piascore 분석

Piascore는 iPad/iPhone 중심의 악보 뷰어다. App Store 설명과 공식 매뉴얼 기준으로
악보 보기, 주석, 페이지 전환, 세트리스트, 악보 가져오기, 음악 도구를 한 앱에 묶는다.

### 라이브러리/파일 관리

- 사용자 PDF를 앱에 가져와 보관한다.
- IMSLP/Petrucci Music Library, Piascore Store, 클라우드, 카메라 촬영, PC/iTunes 전송,
  다른 앱의 "Open In" 흐름을 제공한다.
- 카탈로그에서 grid/list 전환, 정렬, 앱 내 검색을 지원한다.
- 제목, 아티스트, 작곡가 편집, 표지 변경, 태그 추가/제거를 제공한다.
- 세트리스트를 만들고 편집, 공유할 수 있다.

### 악보 보기/페이지 전환

- 스와이프, 화면 우측 탭, 페이지 슬라이더, 첫/마지막 페이지 점프 같은 기본 페이지
  이동을 제공한다.
- 1페이지, 세로 스크롤, 반 페이지, 2페이지 표시를 제공한다.
- 자동 세로 스크롤은 양손이 악기를 연주 중일 때 페이지 넘김을 줄이는 기능으로
  설명된다.
- 공연 모드는 연주 중 화면 탭으로 메뉴가 뜨는 오작동을 줄이는 역할을 한다.
- Bluetooth page turner와 Piascore Air를 통한 원격 페이지 넘김을 지원한다.
- 여러 기기 간 페이지 전환과 곡 선택 동기화를 제공한다.

### 페이지 도구/PDF 정리

- 북마크를 추가하고, PDF 목차/bookmark를 가져오는 흐름을 제공한다.
- 페이지 확대, 여백 조정, 회전을 지원한다.
- 2페이지 표시의 시작 페이지를 좌/우로 지정할 수 있다.
- 페이지 숨김, 순서 변경, 복제, 추가를 제공한다.
- 반복 구간 처리를 위한 페이지 점프 버튼을 배치할 수 있다.
- 작성한 필기가 포함된 PDF를 메일, 프린트, 다른 앱으로 내보낼 수 있다.

### 주석/필기

- 펜, 스탬프, 텍스트, 도형, 지우개, undo/redo를 제공한다.
- 펜 색상, 두께, 브러시 유형을 바꿀 수 있다.
- 스탬프는 운지, 음표, 임시표 등 악보 표시에 가까운 입력을 돕는다.
- palm rejection과 도구막대 위치 이동을 지원한다.

### 메트로놈/튜너/음악 도구

- Piascore App Store 설명은 music tools로 가상 키보드, chromatic tuner, music player,
  voice recorder를 명시한다.
- 공식 매뉴얼 목차에는 music player, keyboard, tuner, recorder, movie, metronome이
  별도 항목으로 정리되어 있다.

### 신규 앱 관점에서 가져올 점

- Android 악보 뷰어에서도 튜너와 메트로놈은 악보 화면에서 빠르게 열려야 한다.
- 페이지 전환, 주석, 세트리스트는 "연주 중 끊기지 않음"을 기준으로 설계해야 한다.
- 1페이지, 2페이지, 세로 스크롤, 반 페이지, 자동 스크롤은 태블릿 악보 앱의 기본
  기대치다.
- PDF 페이지 순서/숨김/복제는 원본을 손상하지 않는 virtual ordering으로 시작하는
  편이 안전하다.

## MobileSheets 분석

MobileSheets는 Android 태블릿 악보 뷰어의 기준점으로 볼 수 있다. 공식 사이트는
macOS, iOS, Android, Windows 지원을 명시하고, Google Play 설명은 Android tablets에
최적화된 sheet music viewer라고 설명한다.

### 라이브러리/파일 관리

- SQLite 기반 라이브러리와 캐시로 큰 라이브러리에서도 검색/편집/열기를 빠르게
  유지하는 방향을 제시한다.
- 20개 이상의 필드, 사용자 정의 필드, 정렬, 필터, group, rating, alphabet jump,
  음성 검색을 제공한다.
- 여러 라이브러리를 만들어 밴드/이벤트별로 분리할 수 있다.
- PDF, 이미지, 텍스트, ChordPro 파일을 지원한다.
- 한 곡에 여러 PDF 또는 이미지 파일을 붙일 수 있다.
- 텍스트/ChordPro 파일에서는 chord 색상, section 숨김, font 조정, transpose, capo,
  metadata 자동 읽기를 지원한다.
- CSV index 파일로 큰 PDF songbook을 곡 단위로 나눌 수 있다.
- Android에서는 기존 저장소 파일을 직접 참조할 수 있고, 앱이 파일을 복사/이동하지
  않는 구성을 지원한다.
- Dropbox, Google Drive, OneDrive 내장 import/export와 시스템 파일 브라우저 기반
  cloud import를 제공한다.
- 전체 라이브러리와 설정을 `.msb` 백업 파일로 저장하고, 데이터베이스 자동 백업도
  제공한다.
- PC companion app으로 컴퓨터에서 곡을 만들고 편집해 태블릿으로 전송할 수 있다.

### 악보 보기/페이지 전환

- 1페이지, 2페이지 side-by-side, 반 페이지 넘김, 세로 스크롤을 지원한다.
- 가로/세로 display mode와 페이지 scaling을 설정할 수 있다.
- landscape에서는 페이지를 확대된 half page로 보여주거나 half turn/scroll 조합을
  사용할 수 있다.
- custom page ordering으로 페이지 복제, 순서 변경, 제거를 처리하고 원본 문서는
  보존한다.
- duplicated page instance별 annotation, crop, bookmark, link point 등을 다르게 둘 수
  있다.
- 자동 image caching으로 페이지 전환 직후 표시 지연을 줄인다.
- 여백 제거를 위한 manual/automatic cropping과 페이지 회전을 제공한다.
- song overlay는 필요할 때만 나타나는 feature access layer로 설계되어 있다.

### 세트리스트/공연 모드

- 세트리스트를 만들고 merge/delete/edit할 수 있다.
- 세트리스트 안에서 악보를 add/remove/rearrange하고 순서대로 넘길 수 있다.
- collection으로 곡 그룹을 관리한다.
- performance mode는 song overlay를 비활성화하고 연주 중 실수로 기능이 실행되는
  상황을 줄인다.
- quick action box로 performance mode, metronome, audio player, automatic scrolling,
  setlist/bookmark 등을 빠르게 열 수 있다.

### 주석/필기

- freeform pen, highlighter, text, stamp, eraser, shape, arrow, crescendo, piano staff,
  nudge tool을 제공한다.
- 수백 개의 stamp와 custom stamp, opacity/color 조절을 지원한다.
- 자주 쓰는 도구 설정을 favorite으로 저장할 수 있다.
- 스타일러스 입력, pressure sensitivity, stylus button shortcut을 지원한다.
- undo/redo와 자동 저장을 제공한다.
- 세 손가락 탭으로 편집 진입/종료, 두 손가락 탭으로 도구 전환 같은 gesture를 제공한다.
- PDF 페이지 일부 cut/copy/paste와 MobileSheets 주석 embed 공유를 지원한다.
- annotation layer를 만들어 필요한 레이어만 표시/숨김 처리할 수 있다.

### 메트로놈/튜너/음악 도구

- 메트로놈은 count-in/stop, beat sound 변경, 첫 박 강조, 일정 마디 후 페이지 변경,
  무음 시각 표시를 제공한다.
- LED, fade circle, 화면 가장자리 rectangle 같은 여러 시각 표시 모드를 제공한다.
- score에 하나 이상의 audio track을 붙이고 backing/practice track처럼 재생할 수 있다.
- audio player는 loop point, tempo 변경, pitch shift를 제공한다.
- 공식 기능 설명과 Google Play 설명 기준으로 chromatic tuner는 확인되지 않았다.
  따라서 내장 튜너는 Android 악보 뷰어 차별점으로 둘 수 있다.

### PDF 편집/정리

- MobileSheets는 page ordering, crop, rotate, bookmark, link point, PDF annotation
  embed를 지원한다.
- 사용자가 언급한 CamScanner류 외부 URL link annotation 제거/비활성화는 공식 설명에서
  직접 확인되지 않았다.
- 신규 앱은 이 부분을 visible watermark 제거가 아니라 "링크 annotation 정리"로 좁혀
  안전하게 차별화한다.

### 페달/MIDI/외부 장치

- Bluetooth/USB 페달로 페이지 넘김, 스크롤, link point, smart button, 오디오 시작/정지
  같은 action을 실행할 수 있다.
- 최대 6개 페달 스위치를 별도 action에 매핑할 수 있다.
- face gesture를 통한 hands-free page turn도 Google Play 설명에 포함되어 있다.
- USB/Bluetooth MIDI 장치와 연결해 registration 선택, metronome tempo sync,
  MobileSheets action trigger를 처리한다.
- 표준 MIDI message, patch select, control change, program change, sysex, channel/port
  filtering, KORG/Yamaha 특화 흐름, MIDI smart button을 지원한다.

### 동기화/백업/협업

- score/setlist를 single file로 export해 공유할 수 있다.
- 같은 라이브러리를 가진 사용자에게 PDF 없이 setlist만 공유하는 흐름을 제공한다.
- Wi-Fi로 여러 태블릿을 연결하거나 Bluetooth로 최대 7대 follower를 연결해 leader
  tablet이 곡 로딩과 페이지 전환을 제어할 수 있다.
- Wi-Fi 또는 cloud folder로 library synchronization을 제공하고, 어떤 field를 동기화할지
  선택해 각 연주자의 annotation, settings, metadata를 보존할 수 있다.
- Android, Windows, iOS/Mac 간 공통 UI와 기능 호환을 강조한다.

## 기능 비교표

| 범주 | Piascore | MobileSheets | 신규 앱 방향 |
| --- | --- | --- | --- |
| 플랫폼 | iPad/iPhone 중심 | Android/iOS/Windows/Mac | Android 태블릿 우선 |
| 파일 | PDF, 클라우드, 카메라, IMSLP, 스토어 | PDF, 이미지, 텍스트, ChordPro, CSV index | MVP는 PDF 우선 |
| 라이브러리 | 태그, 세트리스트, 검색, 제목/작곡가 편집 | 20개+ 필드, 필터, 여러 라이브러리, 백업 | 제목/작곡가/태그/최근 사용부터 |
| 보기 | 1페이지, 스크롤, 반 페이지, 2페이지 | 1페이지, 2페이지, 반 페이지, 세로 스크롤, scaling | 1/2페이지, 세로, 반 페이지 |
| 페이지 정리 | 확대/회전, 순서 변경, 숨김, 복제, 점프 | crop, rotate, page ordering, link point | 원본 보존 virtual ordering |
| 주석 | 펜, 스탬프, 텍스트, 도형, 지우개 | 고급 도구, favorite, stylus, layer | 펜/형광펜/지우개/텍스트부터 |
| 공연 | 공연 모드, Bluetooth, sync page turning | 공연 모드, quick action, 세트리스트 | 공연 모드와 페달 기본 지원 |
| 음악 도구 | 튜너, 메트로놈, 키보드, 녹음, 플레이어 | 메트로놈, 오디오 플레이어 | 튜너+메트로놈 핵심 차별점 |
| 외부 장치 | Bluetooth page turner, Piascore Air | Bluetooth/USB 페달, MIDI, face gesture | HID 페달부터 시작 |
| 동기화 | 페이지 전환 동기화 | library sync, leader/follower, cloud/Wi-Fi | Later. MVP는 로컬 안정성 우선 |
| PDF 링크 정리 | 직접 확인 필요 | 직접 확인되지 않음 | link annotation 탐지/비활성화/제거 사본 |

## Android 구현 리스크

### PDF 렌더링

Android `PdfRenderer`는 API 21부터 사용할 수 있지만, 기본 모델은 페이지를 열고
렌더링한 뒤 닫는 흐름이다. 문서에 따르면 한 번에 하나의 페이지만 열 수 있으므로,
저지연 페이지 넘김을 위해서는 별도 page bitmap cache, prefetch, zoom level cache,
대형 PDF 메모리 정책이 필요하다. Android V/API 35에는 search, fast scrolling,
annotation 관련 확장이 언급되지만, Android 7.0 이상을 넓게 지원하려면 하위 버전
전략이 필요하다.

### PDF link annotation 탐지/삭제

사용자 문제는 visible watermark 제거가 아니라 외부 URL을 여는 link annotation이다.
렌더링 API만으로는 PDF 객체 편집이 부족할 가능성이 크다. PDFBox-Android, iText 계열
라이선스, qpdf/네이티브 처리, 자체 parser 범위를 별도 spike로 비교해야 한다. MVP
정책은 다음 순서가 안전하다.

1. 페이지별 link annotation 영역 탐지.
2. 악보 화면에서 해당 link tap 비활성화.
3. 사용자가 선택한 link annotation을 제거한 사본 PDF 생성.
4. 원본 PDF는 항상 보존.

### 스타일러스 필기 레이어

필기는 PDF를 직접 수정하기보다 앱 내부 annotation layer로 시작한다. PDF embed/export는
V2로 미룬다. Samsung S Pen pressure, palm rejection, latency, undo/redo stroke model,
확대/회전/크롭 후 좌표 보존이 주요 리스크다.

### 저지연 페이지 넘김

연주 중 지연은 곧 제품 실패다. 대형 스캔 PDF, 고해상도 이미지 기반 PDF, 2페이지 보기,
반 페이지 넘김에서 pre-render 범위와 메모리 회수 정책을 먼저 검증해야 한다.

### 오디오 입력 기반 튜너

튜너는 마이크 권한, 실시간 pitch detection, 주변 소음, 관악기 배음, latency, A4
calibration, 기기별 마이크 편차가 있다. MVP는 악기별 튜너가 아니라 chromatic tuner로
시작한다.

### Bluetooth 페달/MIDI 입력

Bluetooth 페달은 HID keyboard 입력처럼 동작하는 경우가 많으므로 page up/down, arrow,
space mapping부터 지원한다. 제조사별 BLE HID 차이는 실제 기기 테스트가 필요하다.
MIDI는 Android MIDI API, USB/Bluetooth permission, device profile, action mapping이
얽혀 있어 V2 이후로 분리한다.

### 로컬 DB/파일 저장/백업

원본 PDF, 앱 내부 annotation, 세트리스트, page order, crop, link-disabled metadata를
분리해 저장해야 한다. MVP에서는 계정/서버 저장 없이 로컬 DB와 앱 전용 저장소를 쓰고,
V1에서 백업/복원 포맷을 정의한다.

## 출처

- Piascore App Store: https://apps.apple.com/us/app/piascore-smart-music-score/id406141702
- Piascore Manual: https://piascore.com/manual/
- MobileSheets 공식 사이트: https://www.zubersoft.com/mobilesheets/
- MobileSheets Library/Setlists: https://www.zubersoft.com/mobilesheets/features/
- MobileSheets Display: https://www.zubersoft.com/mobilesheets/features/display/
- MobileSheets Annotations: https://www.zubersoft.com/mobilesheets/features/annotations/
- MobileSheets Utilities: https://www.zubersoft.com/mobilesheets/features/utilities/
- MobileSheets Files: https://www.zubersoft.com/mobilesheets/features/files/
- MobileSheets MIDI: https://www.zubersoft.com/mobilesheets/features/midi/
- MobileSheets Collaboration: https://www.zubersoft.com/mobilesheets/features/collaboration/
- MobileSheets Google Play: https://play.google.com/store/apps/details?id=com.zubersoft.mobilesheetspro
- Android PdfRenderer: https://developer.android.com/reference/android/graphics/pdf/PdfRenderer
