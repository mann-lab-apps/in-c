# 레퍼런스 조사와 채택 원칙

확인일 2026-10-24. 공식 대한민국 App Store의 서비스별 등록 이미지와 판매자 정보를 Apple lookup으로 확인하고 원본을 열어 비교했다. 조회 URL·artwork URL·판매자·앱 ID는 [reference-sources.json](reference-sources.json). `references/` 이미지는 조사·비교용이며 생성/배포 export에 포함하지 않는다.

## 카카오 다섯 앱

아래는 현재 등록 이미지를 보고 한 조형 관찰이다. 카카오 전체가 공개적으로 하나의 수치 체계를 사용한다는 주장은 아니다. 스토어 이미지의 시스템 효과와 플랫폼별 실제 설치 외형도 구분한다.

| 레퍼런스·공식 출처 | 관찰 | 가져올 원칙 / 가져오지 않을 것 |
| --- | --- | --- |
| [카카오톡](https://apps.apple.com/kr/app/id362057947) | 노랑 바탕·짙은 말풍선·TALK. 큰 외곽 안에 텍스트가 들어감. 현재 등록 이미지에는 광택/깊이가 보임 | 중심의 큰 덩어리와 강한 대비. 말풍선·TALK·노랑·광택은 복제하지 않음 |
| [카카오맵](https://apps.apple.com/kr/app/id304608425) | 노랑과 파랑, 큰 위치 핀과 중앙 구멍. 단순한 외곽과 뚜렷한 빈 공간 | 색 외에도 실루엣·내부 틈으로 역할 전달. 위치 핀 형태는 채택하지 않음 |
| [카카오페이](https://apps.apple.com/kr/app/id1464496236) | 노랑 위 검정 말풍선+pay의 가로 조합. 다른 심벌보다 좌우가 넓음 | 공통 인상 안에서도 폭/비례가 다를 수 있음. 작은 글자가 있는 아이콘을 우리 세 앱의 해법으로 삼지 않음 |
| [카카오뱅크](https://apps.apple.com/kr/app/id1258016944) | 노랑 위 굵은 B 형태와 세로 빈 공간. 큰 단일 덩어리 | 굵은 면·확실한 틈·광학 보정. B/I나 고유 비례는 복제하지 않음 |
| [카카오 T](https://apps.apple.com/kr/app/id981110422) | 짙은 남색 바탕과 노랑 T, 분리된 수평 막대. 색의 전경/배경 관계가 앞 네 앱과 다름 | 같은 제품군도 반드시 같은 배경색은 아님. 구조적 일관성과 예외의 이유를 기록. T 형태는 채택하지 않음 |

[카카오뱅크 공식 브랜드 가이드](https://m.kakaobank.com/view/about/brand/resource)는 심벌의 B/I 의미와 아이콘 프레임별 시각 보정, 비율·위치·색상 사용 규칙을 설명한다. 띠로리는 이 관리 방식만 참고해 geometry source·regular/small·export 계약을 둔다. 그 브랜드의 숫자나 심벌을 우리 자산 규칙으로 옮기지 않는다.

[카카오 공식 서비스 소개](https://www.kakaocorp.com/page/service/service)는 Talk·Map 등 여러 서비스의 목적을 구분한다. 띠로리는 Play·Studio·Score를 이름 없이 비교할 때도 서로 다른 역할의 실루엣으로 만들되, 모브랜드·캐릭터·개별 기능 아이콘이 모든 역할을 겸하지 않도록 했다.

## 플랫폼 근거와 실제 저장소 적용

| 출처 | 확인 내용 | 이번 적용 / 제한 |
| --- | --- | --- |
| [Android Adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive?hl=en) | 108dp 전경/배경과 중앙 안전 영역, monochrome 레이어, 테마·런처 지원 조건 | Play/Score의 두 레이어와 monochrome XML. 66dp 안전 원 안의 실제 알파 픽셀을 검사. 기기 런처 검수는 별도 |
| [Google Play icon specification](https://developer.android.com/distribute/google-play/resources/icon-design-specifications) | 스토어 아이콘 규격과 런처 adaptive 자산의 구분 | 기존 파이프라인에 맞춘512 PNG를 별도 제공, 런처 전경과 혼용 안 함 |
| [Apple App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) | 명확한 전경·단순성·플랫폼 시스템 마스크와 레이어 | 마스크 없는 SVG 레이어와 기존 catalog용 불투명 bitmap 분리. 모든 파일의 투명도 규칙을 통일하지 않음 |
| [Apple Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer) | SVG 레이어·구성·플랫폼별 appearance 작업 | 레이어 재료만 제공. .icon 파일 생성/실제 Liquid Glass 검증을 주장하지 않음 |
| [electron-builder Icons & Images](https://www.electron.build/docs/features/icons-and-images/) | ICNS/ICO/PNG 플랫폼 자산 관리 | 저장소 package.json의 현행 mac/win/linux 경로를 우선해 호환 후보를 제작. 최신 문서의 새 도구 기능을 현행26.15.3에서 사용 가능하다고 가정하지 않음 |

현재 앱들의 설정을 조사한 결과 Play/Score는 기존 AppIcon catalog·Android resource, Studio는 mac ICNS와 win/Linux PNG 경로를 사용한다. Apple의 최신 레이어 방식 때문에 기존 프로젝트 설정을 임의로 마이그레이션하지 않았다. legacy ICNS 프레임과 새 마스크 없는 레이어는 목적이 다른 산출물이다.

## 디자인 시스템 레퍼런스의 역할 유지

당근/SEED의 가벼운 조작과 간결한 정보, MUI의 계약·상태·API 구조, Excalidraw의 콘텐츠/도구 색 분리는 기존 [system-review](../../ddirori-design-system/system-review.md)의 공식 근거와 역할을 유지했다. 이번에 해당 라이브러리를 설치·교체하거나 색 체계를 다시 만들지 않았다. 카카오는 앱 제품군의 식별 방식에 한정해 추가 비교했다.
