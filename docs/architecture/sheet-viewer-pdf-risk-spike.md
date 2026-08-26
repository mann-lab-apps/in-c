# Android 악보 뷰어 PDF 리스크 스파이크

작성일: 2026-08-20

## 목적

`apps/in_c_sheet` MVP 1차의 PDF viewer 선택과 link annotation 처리 가능성을
실기기 없이 로컬 fixture와 Android 에뮬레이터로 확인한다. 이번 검증은 성능 절대값이
아니라 crash, blank render, link annotation 탐지 가능성, 다음 구현 순서를 판단하기 위한
기술 스파이크다.

## Fixture

fixture는 외부 PDF를 다운로드하지 않고 자체 생성한다.

생성 명령:

```sh
cd apps/in_c_sheet
dart run tool/generate_pdf_fixtures.dart
```

검사 명령:

```sh
cd apps/in_c_sheet
dart run tool/inspect_pdf_fixtures.dart
```

생성된 파일:

| 파일 | 목적 | 확인 결과 |
| --- | --- | --- |
| `apps/in_c_sheet/test-fixtures/pdfs/short-score.pdf` | 3페이지 기본 악보형 PDF | Ghostscript 렌더 성공, `pdfrx_engine` 기준 3 pages |
| `apps/in_c_sheet/test-fixtures/pdfs/long-scan-like-score.pdf` | 90페이지 스캔형/복잡 drawing PDF | Ghostscript 렌더 성공, `pdfrx_engine` 기준 90 pages |
| `apps/in_c_sheet/test-fixtures/pdfs/link-annotation-score.pdf` | 오른쪽 하단 link annotation 재현 | Ghostscript 렌더 성공, `pdfrx_engine` 기준 3 pages, page 1 link 1개 |

`link-annotation-score.pdf`의 링크는 visible watermark 제거 테스트가 아니라, URL link
annotation 탐지와 탭 비활성화 정책을 검증하기 위한 fixture다.

## 렌더링 확인

Poppler의 `pdfinfo`, `pdftoppm`은 현재 로컬 환경에 없어 Ghostscript로 첫 페이지를
렌더링했다.

```sh
gs -q -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r96 \
  -dFirstPage=1 -dLastPage=1 \
  -sOutputFile=/private/tmp/in_c_sheet_pdf_render/link-page-1.png \
  apps/in_c_sheet/test-fixtures/pdfs/link-annotation-score.pdf
```

Ghostscript는 fontconfig cache write 경고를 냈지만 PNG 렌더링 자체는 성공했다. 링크
fixture의 오른쪽 하단 테스트 영역은 화면상 명확히 보인다.

## pdfrx Link Handling 판단

로컬 `pdfrx`/`pdfrx_engine` 소스 기준:

- `PdfPage.loadLinks()`로 page별 link annotation을 읽을 수 있다.
- `PdfLink`는 `url`, `dest`, `rects`, `annotation` 정보를 가진다.
- `PdfViewerParams.linkHandlerParams`로 link tap callback을 가로챌 수 있다.
- `PdfLinkHandlerParams.customPainter`로 링크 영역 표시를 커스터마이즈할 수 있다.
- `enableAutoLinkDetection`을 끄면 PDF에 실제 정의된 annotation link만 대상으로 삼을 수 있다.
- `PdfViewerParams.linkWidgetBuilder`도 가능하지만, 문서상 simple link tap/custom visual에는
  `linkHandlerParams`가 더 적합하다고 설명되어 있다.

`tool/inspect_pdf_fixtures.dart` 실행 결과:

```text
test-fixtures/pdfs/short-score.pdf: 3 pages
test-fixtures/pdfs/long-scan-like-score.pdf: 90 pages
test-fixtures/pdfs/link-annotation-score.pdf: 3 pages
  page 1: 1 link(s)
    url=https://camscanner.example.invalid/watermark-link rects=[PdfRect(left: 410.0, top: 62.0, right: 560.0, bottom: 34.0)]
```

1차 판단:

- link annotation 영역 표시: 가능.
- link tap override/disable: 가능. `onLinkTap`에서 외부 URL을 열지 않고 앱 내부 상태로만 처리하면 된다.
- link annotation 제거 사본 생성: `pdfrx` viewer layer만으로는 부족하다. 2026-08-22
  후속 구현에서는 Apache-2.0 pure Dart package인 `pdf_document` 3.7.0을 사용해 `/URI`
  link annotation만 제거하는 앱 내부 사본 생성을 구현했다.

## Link Annotation 1차 구현

2026-08-20 기준으로 `apps/in_c_sheet` viewer에 `PdfViewerParams.linkHandlerParams`를
적용했다.

- URL link annotation tap은 외부 브라우저를 열지 않고 앱 안에서 차단 안내를 보여준다.
- PDF 내부 destination link는 `PdfViewerController.goToDest()`로 이동을 유지한다.
- `enableAutoLinkDetection`은 `false`로 둔다. MVP 1차는 PDF에 실제 포함된 link annotation만
  처리하고, 텍스트처럼 보이는 URL 자동 감지는 범위에서 제외한다.
- AppBar의 링크 버튼으로 링크 영역 표시를 켜고 끌 수 있다.
- visible watermark 제거와 PDF annotation 삭제/재저장은 하지 않는다.

수동 확인 절차:

1. `link-annotation-score.pdf`를 앱에 import한다.
2. viewer AppBar의 링크 버튼을 눌러 오른쪽 하단 링크 영역 표시를 켠다.
3. 오른쪽 하단 링크 영역을 탭한다.
4. 외부 브라우저가 열리지 않고 앱 안에서 차단 안내가 표시되는지 확인한다.

구현 후 검증:

```sh
cd apps/in_c_sheet
dart run tool/inspect_pdf_fixtures.dart
dart format lib test
flutter analyze
flutter test
flutter build apk --debug
cd ../..
git diff --check
```

결과:

- URL/destination/unknown link 정책 단위 테스트 통과.
- `link-annotation-score.pdf` page 1 URL link annotation 1개 탐지 재확인.
- Android debug APK 빌드 통과.
- 2026-08-20 구현 직후 `adb devices` 결과 연결된 기기가 없어 에뮬레이터 수동 확인은
  수행하지 못했다.

## Link Annotation 제거 사본 생성 1차

2026-08-22 기준으로 `apps/in_c_sheet`에 원본 보존형 URL link annotation 제거 사본 생성을
추가했다.

선택한 라이브러리:

- `pdf_document` 3.7.0.
- Apache-2.0 license.
- Pure Dart package이며 기존 PDF 열기, page tree/annotation 읽기, `PdfEditor` incremental
  save를 제공한다.
- `PdfLinkAnnotation`과 `PdfUriAction`을 통해 `/Link` annotation 중 외부 URL action만 식별할
  수 있다.
- `PdfEditor.removeAnnotations(pageIndex, annotations)`로 해당 annotation만 제거한 새 bytes를
  생성한다.

비교 메모:

- `pdfrx`는 viewer/link handling에는 충분하지만 PDF 객체 재저장은 담당하지 않는다.
- `syncfusion_flutter_pdf`도 기존 PDF annotation 제거 API가 명확하지만 상용 또는 Community
  license 조건 검토가 필요하다.
- `pdf` package는 PDF 생성에는 강하지만 기존 PDF annotation object 수정 용도는 맞지 않는다.
- Android native `PdfRenderer`는 렌더링 API라 기존 PDF annotation writer가 아니다.

구현 정책:

- 제거 대상은 `/URI` action이 있는 URL link annotation이다.
- 내부 `/GoTo` destination link는 제거하지 않는다.
- 알 수 없는 link action은 제거하지 않는다.
- 원본 PDF 파일은 수정하지 않는다.
- 사용자가 viewer 메뉴에서 명시적으로 선택한 경우에만 앱 내부 `scores/` 폴더에
  `<기존 이름>-links-disabled.pdf` 기반 사본을 만든다.
- MVP 1차 UI는 현재 라이브러리 항목의 `score.id`, 북마크, 세트리스트 참조, 필기 metadata를
  유지하고 `filePath`만 정리된 사본으로 교체한다.
- `SheetScore.pdfLinkSanitization`에는 이전 파일 경로, 제거한 URL link 개수, 생성 시각을
  저장한다.

fixture 검증:

- `link-annotation-score.pdf`에서 URL link annotation을 탐지한다.
- 정리 사본 생성 후 URL link annotation count가 0이 되는지 확인한다.
- page count가 유지되는지 확인한다.
- 원본 파일 bytes가 변경되지 않는지 확인한다.
- `short-score.pdf`처럼 URL link가 없는 PDF에서는 사본을 쓰지 않고 안전하게 종료한다.

남은 리스크:

- 암호화/DRM PDF는 우회하지 않는다.
- malformed PDF나 object stream이 복잡한 실제 CamScanner PDF는 Android 태블릿에서 추가 검증이
  필요하다.
- incremental save 특성상 과거 revision bytes에는 원본 annotation 객체가 남을 수 있다.
  viewer와 일반 PDF reader에서 활성 link로 노출되는 page `/Annots`에서는 제거되지만, 파일
  forensic 수준의 완전 삭제가 필요한 요구는 별도 compact/rewrite 검토가 필요하다.
- visible watermark 이미지/텍스트 제거는 계속 범위 밖이다.

참고:

- https://pub.dev/packages/pdf_document
- https://pub.dev/packages/syncfusion_flutter_pdf
- https://help.syncfusion.com/document-processing/pdf/pdf-library/flutter/working-with-annotations

## 에뮬레이터 확인

사용한 AVD:

- `ms_fold_review_35`
- Android 15 API 35
- `emulator-5554`, 이후 재시작 중 `emulator-5556`으로 변경됨

확인한 내용:

- `flutter build apk --debug` 통과.
- `flutter run -d emulator-5554`로 앱 실행.
- `com.mannlab.clef/.MainActivity` 포커스 확인.
- `/sdcard/Download/clef-fixtures/`에 fixture 3종 복사 완료.
- file picker가 `application/pdf` custom type으로 열리는 로그 확인.

제한:

- 에뮬레이터/ADB 연결이 중간에 끊기며 자동 UI 조작으로 PDF 선택까지 완료하지 못했다.
- 2026-08-20 재확인 시 `adb devices`는 `emulator-5554 device`를 반환했지만,
  `/sdcard/Download/clef-fixtures` 조회는 `Transport endpoint is not connected`,
  `pm path com.mannlab.clef`는 `Can't find service: package`로 실패했다.
- 따라서 앱 내부 import/open의 최종 수동 검증은 내일 실기기 태블릿에서 이어서 확인한다.
- 에뮬레이터 로그의 frame skip은 첫 부팅, 설치, JIT/profile install 구간과 겹쳐 절대 성능
  판단에는 사용하지 않는다.

## 검증 결과

실행한 명령:

```sh
cd apps/in_c_sheet
dart format tool/generate_pdf_fixtures.dart tool/inspect_pdf_fixtures.dart
dart run tool/generate_pdf_fixtures.dart
dart run tool/inspect_pdf_fixtures.dart
flutter analyze
flutter test
flutter build apk --debug
cd ../..
git diff --check
```

결과:

- fixture 3종 재생성 성공.
- link annotation fixture에서 page 1 URL link 1개 탐지.
- `flutter analyze` 통과.
- `flutter test` 통과.
- `flutter build apk --debug` 통과.
- `git diff --check` 통과.

## 다음 추천

다음 작업은 **실기기에서 link annotation fixture 수동 검증**을 먼저 진행하는 편이 좋다.

이유:

- viewer layer의 URL tap 차단과 링크 영역 표시 1차 구현은 들어갔다.
- 에뮬레이터/ADB가 불안정했으므로 실제 태블릿에서 import/open/tap 차단을 확인해야 한다.
- 제거 사본 생성은 별도 writer 판단이 필요하므로, 실기기에서 차단 UX를 확인한 뒤 분리한다.

그 다음 순서:

1. 실기기 태블릿에서 `link-annotation-score.pdf` import/open/tap 차단 확인.
2. PDF link annotation 제거 사본 생성 spike.
3. 북마크.
4. 세트리스트.
5. 주석/필기.
