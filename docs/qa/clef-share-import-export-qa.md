# Clef 공유/import/export QA

작성일: 2026-08-23

## 범위

이 체크리스트는 Clef V1의 파일 이동 흐름을 검증한다.

- 외부 앱에서 PDF를 Clef로 열기/import.
- Clef에서 PDF 공유.
- JPG/PNG 이미지를 PDF 악보로 묶기.
- 링크 제거 사본이 있는 악보의 공유 후보.

앱 내 카메라 스캔, HEIC 변환, 필기 포함 PDF export, PDF 포함 전체 백업은 이 QA 범위가 아니다.

## Android

1. 앱이 종료된 상태에서 Files/Downloads의 PDF를 `Clef`로 열고 라이브러리에 등록되는지 확인한다.
2. 앱이 실행 중인 상태에서 Files/Downloads의 PDF를 `Clef`로 공유하고 중복 등록 없이 한 번만 추가되는지 확인한다.
3. KakaoTalk 또는 메신저 첨부 PDF를 `Clef`로 공유하고 PDF가 열리는지 확인한다.
4. Google Drive, Dropbox 같은 file provider 앱에서 PDF를 `Clef`로 공유한다.
5. 여러 PDF를 한 번에 공유했을 때 모두 등록되고 첫 PDF가 열리는지 확인한다.
6. PDF가 아닌 파일을 공유했을 때 앱이 crash 없이 무시하거나 실패 안내를 표시하는지 확인한다.
7. 같은 PDF를 반복 공유했을 때 사용자가 의도한 반복 등록인지, platform event 중복으로 인한 이중 등록인지 확인한다.
8. 대용량 PDF를 공유했을 때 cache copy와 documents copy가 끝날 때까지 앱이 멈추지 않는지 확인한다.
9. Clef 라이브러리 카드에서 PDF 공유 sheet가 열리는지 확인한다.
10. Clef viewer 메뉴에서 PDF 공유 sheet가 열리는지 확인한다.
11. PDF 링크 제거 사본을 만든 악보에서 현재 PDF와 원본 PDF 공유 후보가 보이는지 확인한다.

## iOS

1. TestFlight 또는 로컬 설치 앱에서 Files 앱의 PDF를 `Clef`로 연다.
2. 앱이 종료된 상태에서 PDF를 열었을 때 라이브러리에 등록되는지 확인한다.
3. 앱이 실행 중인 상태에서 PDF를 열었을 때 라이브러리에 등록되는지 확인한다.
4. PDF가 iCloud Drive, On My iPhone, Downloads 위치에 있을 때 각각 열어본다.
5. security-scoped file URL 접근 실패 없이 앱 내부 사본이 생성되는지 확인한다.
6. PDF가 아닌 파일이 들어왔을 때 앱이 crash 없이 무시하거나 실패 안내를 표시하는지 확인한다.
7. Clef 라이브러리 카드에서 iOS share sheet가 열리는지 확인한다.
8. Clef viewer 메뉴에서 iOS share sheet가 열리는지 확인한다.
9. PDF 링크 제거 사본을 만든 악보에서 현재 PDF와 원본 PDF 공유 후보가 보이는지 확인한다.
10. 일반 Share Extension처럼 앱 목록에 Clef가 뜨지 않는 앱이 있으면 앱/파일 종류를 기록한다.

## 이미지에서 PDF 만들기

1. JPG 한 장을 선택해 PDF 악보로 등록한다.
2. PNG 한 장을 선택해 PDF 악보로 등록한다.
3. JPG/PNG 여러 장을 선택해 페이지 순서가 기대와 맞는지 확인한다.
4. 생성된 PDF를 열어 A4 portrait, 흰 배경, 이미지 비율 유지가 적용되는지 확인한다.
5. HEIC 파일은 현재 1차 미지원이다. 선택 가능 여부와 사용자 안내가 충분한지 기록한다.
6. 이미지 원본 파일이 삭제되지 않는지 확인한다.

## 실패/회귀 케이스

1. 손상된 PDF를 공유한다.
2. 파일 접근 권한이 만료된 provider URL을 공유한다.
3. 공유 import 도중 다른 파일을 한 번 더 공유한다.
4. 공유 import 후 앱을 재시작해 라이브러리 metadata가 유지되는지 확인한다.
5. 공유한 PDF의 제목이 scanner/date suffix 없이 읽을 만하게 정리되는지 확인한다.

## 기록할 항목

- 기기와 OS version.
- 앱 설치 방식: debug, release APK, TestFlight.
- 공유 출처 앱.
- 파일 크기와 페이지 수.
- 성공/실패 여부.
- 실패 시 표시 문구와 console log.
