# 레퍼런스와 적용 원칙

2026-10-24 확인. 공식 자료에서 관찰한 사실과 띠로리 제작 판단을 구분한다.

## 카카오 계열

[카카오톡](https://apps.apple.com/kr/app/id362057947), [카카오맵](https://apps.apple.com/kr/app/id304608425), [카카오페이](https://apps.apple.com/kr/app/id1464496236)의 공식 App Store 페이지를 다시 확인했다. 같은 날 수집한 [공식 이미지 및 URL](../icon-family-v2/reference-sources.json)을 재사용한다. [카카오뱅크 브랜드 리소스](https://m.kakaobank.com/view/about/brand/resource)는 B와 I를 결합한 심벌의 의미, 여백, 프레임 안의 배치 규칙을 공개한다.

- 관찰: 노란 바탕·선명한 전경과 서로 다른 기능 의미가 가족성을 만든다. 모든 앱이 같은 모양이나 정확히 같은 색 규칙을 쓰는 것은 아니다.
- 적용: 세 앱의 배경·심벌 무게·여백을 공유하고, 띠로리 고유 음형의 한 구성 요소에서 기능을 구분한다. 의미를 한 형태에 결합한다는 점은 카카오뱅크의 구조에서 참고했다.
- 차이: 음형의 기능별 변형은 띠로리 자체의 해법이다. 카카오 아이콘이 같은 음형처럼 구성된다고 주장하지 않는다. 노랑·말풍선·문자 형태·입체 효과를 복제하지 않는다.

## 플랫폼

- [Apple App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons): 명확한 경계, 벡터 전경, 배경/전경 레이어와 시스템 마스크. HTML 본문이 JS 안내여서 공식 Markdown 본문을 추가로 읽었다. 전경·배경 SVG를 분리했으며 자체 사각 마스크를 원본에 굳히지 않았다. legacy ICNS 프레임과 Icon Composer 입력 레이어를 구분한다. 이 작업은 .icon 컴파일·OS 효과 검증을 수행하지 않는다.
- [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive): 전경·배경과 monochrome, 108dp 레이어와 핵심 안전 영역을 참고했다. 두 방향을 같은 크기 규칙으로 미리 보고 추천 A의 실제 후보 XML을 출력했다.
- [Google Play 규격](https://developer.android.com/distribute/google-play/resources/icon-design-specifications): 512×512, 32-bit PNG, sRGB, 최대1024KB, 완전한 사각형, 자체 모서리·그림자 제외. 후보 출력에서 규격을 검사한다.

소형에서 디테일을 모두 읽게 만드는 보편적인 최소 픽셀 규칙을 출처에 덧씌우지 않는다. 16·24·32·48px 구분은 이번 음형의 실제 축소 비교에서 정한 잠정 제작 기준이다. 플랫폼 규격 검사는 인지도·접근성 전체 승인이나 실제 설치 검증이 아니다.
