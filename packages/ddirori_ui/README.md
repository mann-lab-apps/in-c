# Ddirori Flutter UI

서비스 전용 컴포넌트를 만들 때: [테마 확장 기준](../../docs/brand/ddirori-design-system/service-theme-contract.md) · [로컬 조합 소스](example/lib/theme_recipes.dart). 예제 폴더에서 `flutter run -d chrome -t lib/theme_reference_main.dart`로 독립 기준 예제를 연다. 실제 제품 화면·파일·오디오 기능을 사용하지 않는다.

앱의 파일·오디오·저장소에 의존하지 않는 Flutter 공통 UI다. 공개 진입점은 `package:ddirori_ui/ddirori_ui.dart`다.

앱의 pubspec에 `ddirori_ui: {path: ../../packages/ddirori_ui}`를 추가하고 MaterialApp의 theme에 `ddiroriTheme()`를 연결한다. 앱에 등록한 TTF/OTF는 fontFamily로 지정할 수 있다. 기본은 플랫폼 글꼴이다.

`DdiroriSearch(value: query, onChanged: onQueryChanged)`처럼 값과 callback을 넘긴다. `DdiroriItem`에는 모델 대신 제목·보조 정보·slot·행동을 전달한다. `DdiroriStatusBadge`와 `DdiroriMetricGroup`은 상태와 수치를 계산하지 않고 표시만 하며, `DdiroriPlaybackProgress`는 앱이 제공한 위치·길이·buffered 위치를 사용한다. UI는 엔진과 controller를 소유하지 않는다.

실제 카탈로그는 `example/`에서 `flutter pub get`, `flutter run -d chrome`으로 실행한다. `?page=1`은 악보함, `?page=2&theme=dark`는 다크 뷰어 예제다. page는 0~5다.

- `flutter analyze`
- `flutter test`
- 예제 폴더에서 `flutter analyze`, `flutter test`, `flutter build web --no-web-resources-cdn`

색과 좌표를 고칠 때는 이 패키지의 generated/를 직접 수정하지 않고 저장소 루트에서 `node docs/brand/ddirori-design-system/tools/build.mjs`를 실행한다.

[전체 API와 상태 계약](../../docs/brand/ddirori-design-system/components.md) · [제품 도입](../../docs/brand/ddirori-design-system/adoption.md).

## 기본 세트

예제를 `?components`로 열면 새 기본 세트와 악보함·작품/녹음·설정·사보 패널을 확인한다. `ddiroriTheme(accent: 'violet')`는 여섯 후보 중 하나를 사용하며 생략하면 기존 테마를 유지한다. Input의 readOnly/required/maxLines와 Item의 flat은 opt-in이다. 체크·라디오·스위치·슬라이더·선택·표·탐색은 이 테마 아래에서 native Material 위젯으로 합성한다. [계약·사용법](../../docs/brand/ddirori-design-system/basic-set.md).
