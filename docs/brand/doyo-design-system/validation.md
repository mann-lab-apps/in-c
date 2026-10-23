# 검증과 남은 적용 확인

2026-10-22 · 디자인 참조 구현 검증 · 제품·실기기·스토어 QA와 구별

## 확인한 결과

- [브라우저·대비 기록](evidence/validation.json): 79개 검사 통과, 14개 실제 Chromium 캡처. 지정한 밝은/다크 의미 색 34쌍과 흰 악보 위 오버레이 3쌍, 화면·상태 검사를 포함한다.
- [Flutter 기록](evidence/flutter-validation.json): Flutter 3.47.2 / Dart 3.13.2에서 analyze 성공, 두 테스트 통과. 선택 색·글꼴 전달·터치/데스크톱 밀도·disabled 색, 실제 프레임의 변화와 움직임 줄이기에서의 정지·상태 문구를 확인했다.
- 생성 TypeScript 토큰은 저장소의 tsc로 독립 noEmit 검사했다. 미리보기 JS는 node --check를 통과했다.
- 로컬 링크, 원본 JSON에서 생성한 파일의 재현성과 자산 해시는 tools/verify-artifacts.py로 확인한다. 실행 결과는 evidence/artifact-validation.json에 기록한다.

브라우저 캡처 중 [컴포넌트](evidence/components-light.png), [모바일 다크](evidence/components-mobile-dark.png), [다크 열람](evidence/reader-dark.png), [사보](evidence/studio-light.png), [도요 로딩 중간 프레임](evidence/loader-mid-cycle.png)을 직접 열어 검토했다.

## 동작 검사 범위

밝은/다크의 기준·컴포넌트·열람·사보를 데스크톱과 390px 폭에서 확인했다. 200% 글자 크기의 가로 넘침, 키보드 focus, 모드의 aria-pressed, 로딩 중복 실행 억제·취소·완료 상태, 도요 몸통·앞다리·뒷다리의 독립 움직임, reduced motion의 정지와 문구, 열람의 48px 대상·페이지 표시·연습 패널·템포 값, 사보의 키보드 선택·입력 caret·재생 cursor·Escape·네이티브 dialog를 검사했다. coarse pointer에서는 compact 조작부도 48 이상으로 커지는지 확인했다.

HTML은 독립 목업이며 검색·파일 가져오기·주석 획·악보 편집·음원 재생을 구현하지 않는다. 일부 버튼은 스타일·배치 예시이고, 연결한 상태 전환만 실제 작동한다. 페이지 이동은 동일 예제 악보를 반복 사용한다.

브라우저 149.0.7827.55와 별도 임시 도구 환경의 Playwright 1.59.1을 사용했다. 제품 package.json·lockfile에 의존성을 추가하지 않았다. 내장 브라우저의 js 실행 도구가 노출되지 않아 독립 Chromium으로 렌더링했다.

## 재현

먼저 저장소 루트에서 정적 서버를 실행한다.

```sh
python3 -m http.server 8057 --bind 127.0.0.1
```

다른 터미널에서:

```sh
python3 docs/brand/doyo-design-system/tools/build.py
DOYO_PLAYWRIGHT_PATH=/path/to/playwright/index.mjs \
DOYO_BROWSER_PATH=/path/to/chrome-headless-shell \
node docs/brand/doyo-design-system/tools/verify.mjs
python3 docs/brand/doyo-design-system/tools/verify-flutter.py
python3 docs/brand/doyo-design-system/tools/verify-artifacts.py
```

Playwright와 Chromium은 별도 환경에 준비한다. 기본 browser 설치가 있으면 DOYO_BROWSER_PATH를 생략할 수 있다. Flutter 검증 도구는 임시 패키지를 만들고 offline pub get, analyze, test를 수행한 뒤 정리한다. SDK와 테스트 의존성 캐시가 없는 환경에서는 먼저 해당 개발 환경이 필요하다. 생성 토큰·어댑터는 앱에 가져오기 전 참조 구현의 범위로 검증했다.

## 아직 제품에서 확인할 것

- 실제 VoiceOver/TalkBack, 플랫폼 고유 focus, 시스템 글자 배율·외부 키보드.
- 최종 앱 아이콘의 24/32/48px 식별과 마스크·최종 워드마크 레터링.
- 로딩 작업의 정확한 생명주기·취소·오류 복구·큰 파일·프레임 비용.
- 실제 PDF 렌더링과 페이지/주석 좌표, 공연 중 페달·하드웨어와 회전 복귀.
- 실제 사보 모델의 선택·입력·undo/redo·저장/재열기·MusicXML/PDF 출력.
- 실제 음악 앱의 파일·오디오·메타데이터·네이티브 기능 회귀.
- 악보 지면의 눈부심과 다크 조합, 색각 차이에 대한 사용자 검토.

디자인 도구의 성공을 해당 제품 기능이나 접근성 전체의 검증 완료로 기록하지 않는다. 첫 실제 앱 적용의 범위와 iOS 메타데이터 작업은 [adoption.md](adoption.md)를 따른다.
