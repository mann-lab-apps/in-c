# Ddirori React UI

같은 의미 토큰을 쓰는 React 참조 구현이다. 공개 소스는 `src/index.tsx`, scoped 스타일은 `src/styles.css`다. 현재 저장소의 React·Vite·TypeScript 도구를 사용하며 루트 패키지를 변경하지 않는다.

호스트를 `<div className="ddirori" data-theme="light" data-density="comfortable">`로 감싼다. 독립적으로 중첩하는 호스트에는 theme와 density를 명시한다. 스타일은 .ddirori 밖에 적용되지 않는다.

`Search`는 controlled value/onChange, `Button`은 void 또는 Promise callback, `Choices`는 선택 배열을 받는다. `Dialog`는 open/title/onClose를 사용한다. 앱 모델·파일·오디오·Electron bridge를 import하지 않는다.

이 폴더에서:
- `npm run dev`: 127.0.0.1:8058 개발 카탈로그.
- `npm test`: 상호작용 계약.
- `npm run build`: 타입 검사 뒤 docs/brand/ddirori-design-system/preview 생성.
- `npm run dev:studio`: 127.0.0.1:8062/studio.html 사보 전용 상태 카탈로그.
- `npm run build:studio`: 독립 사보 카탈로그 빌드. 제품 앱 빌드가 아니다.
- `npm run verify:studio`: 실행 중인 사보 카탈로그의 브라우저 회귀 검사.

사보 전용 예제와 제품 이행 경계는 [사보 디자인 명세](../../docs/brand/ddirori-design-system/chromatics-studio.md)에 정리했다.

빌드는 현재 시스템의 preview/만 재생성한다. 토큰·로고·글꼴·바흐는 디자인 시스템 경로에서 읽어 번들에 포함한다. 다른 저장소로 배포할 때는 assets와 generated 경로를 함께 패키징하는 별도 배포 작업이 필요하다.

[컴포넌트 API](../../docs/brand/ddirori-design-system/components.md) · [실제 카탈로그](../../docs/brand/ddirori-design-system/preview/index.html).
