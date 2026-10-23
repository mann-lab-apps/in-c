# 띠로리 Flutter 카탈로그

ddirori_ui를 실제 path dependency로 사용하는 독립 예제다.

`flutter pub get`, `flutter run -d chrome`으로 실행한다. 상단 메뉴에서 컴포넌트·악보함·뷰어·연습·사보·플레이를 선택하고 테마와 밀도를 바꾼다. 컴포넌트 화면에는 페이지 헤더, 반응형 action, 상태 배지와 metric group이 있으며 플레이 화면에서 full/compact transport와 buffered progress를 비교한다.

웹 빌드에서는 `?page=0`부터 `?page=5`, `theme=dark`를 사용한다. 테스트는 밝은/다크·390/1440 폭·200% 글자를 확인한다.

파일·마이크·실제 오디오·제품 저장소는 연결하지 않는다. 샘플의 조작 상태는 화면 메모리에만 있다. 제품 이행과 메타데이터는 [전체 시스템](../../../docs/brand/ddirori-design-system/README.md)을 따른다.
