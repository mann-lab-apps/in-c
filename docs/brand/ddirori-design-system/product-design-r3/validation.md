# R3 검증 기록

2026-10-25. 이번 완료 범위는 설계·공통 UI 기반 메모리 시안·명세·인계다. 실제 제품의 파일 전달/첫 사용 구현과 사람 대상 검증은 후속이다.

## 기준과 변경 범위

착수 HEAD `827ad18203e673b1e923d00cbcf0fd7f3af755d7`, 세 worktree와 기존 dirty 작업을 확인했다. Play/Score/Studio R2 구현이 진행 중이라 현재 소스·반환 자료를 우선 읽었다. 서비스 작업의 변경을 R3의 제품 수정으로 보고하지 않는다. 원래 baseline은 task out 폴더에, 최종 보존 범위는 `evidence/workspace-scope.json`에 기록한다.

R3가 소유한 변경은 `product-design-r3/`, `catalog/product-r3.{html,tsx,css}`, `product-r3.config.ts`와 상위 README의 R3 진입 링크다. 제품 코드·shared API·iOS YAML·기존 R1/R2 manifest/시안은 편집하지 않았다. 커밋·푸시·worktree 제거·배포 없음.

[source-index](source-index.md)·`evidence/source-audit.json`·revision에 실제 함수 위치와 파일 SHA256을 기록한다. 이후 소스가 바뀌면 함수 의미와 반환 자료를 재검토한다. 역사적 R2 검사 실패를 없애려고 R2를 재생성하지 않는다.

## 직접 실행

| 검사 | 결과·범위 |
| --- | --- |
| 공통 Web typecheck | 통과. R3 entry를 포함한 `tsc --noEmit`, 최종 로그 `evidence/typecheck.log` |
| 독립 Vite build | 통과. R3 outDir만 생성. 실제 입력 해시/전후 안정 여부는 `evidence/build-inputs.json` |
| Play local_audio_import_test | 17개 통과. copy/checksum·부분/취소·rollback·관리 파일 수명 등 domain fixture 검사. 실제 chooser/codec/오디오 테스트 아님 |
| Score sheet_file_import_test | 6개 통과. 형식/파일명·이미지 PDF 변환 등 정책 검사. pdfrx 지면·주석 저장·OS PDF 수신 검증 아님 |
| Studio new-score/file-lifecycle | 2files/7tests 통과. 생성/손실 확인 정책. 실제 Electron 파일 dialog/프로젝트 저장 검증 아님 |
| R3 browser | 통과. 핵심 흐름·36 layout, console/resource 오류0. 최종 결과는 `evidence/review/results.json`, 로그 `evidence/review-check.log` |
| 문서·소스·산출물 | 로컬 링크·빌드 경로·manifest 확인. R1/R2 manifest 재고정 없음 |

제품 domain 검사에서 얻은 결과를 R3 UI 시안이나 새 제품 구현의 통합 성공으로 합산하지 않는다. Score import persistence 전 모델 갱신은 코드로 확인한 후속 점검 항목이며 위6개 테스트가 이를 검증한 것은 아니다. 기존 root 전체 테스트 실패/Studio IME 관련 결과는 R2/서비스 반환 자료의 별도 범위다.

## Browser 검증 범위

실제 @ddirori/ui를 사용한다. 별도 headless Chrome/profile로 검증했고 사용자의 브라우저 세션·개인 파일·오디오·계정에 접근하지 않았다. Browser 스킬을 읽고 연결 도구를 두 차례 탐색했으나 Node 실행 도구가 제공되지 않아 독립 Playwright 검증을 사용했다.

- picker 대체 dialog 취소/focus 복귀, form local draft 취소와 required/첫 invalid field focus.
- Play 등록 실패/retry, 다른 앱을 보는 동안 source-owned 완료, partial 결과·실패 파일 재시도.
- Score 가져온 파일 보존/열기 실패·retry, 페이지/주석 draft 저장 실패·retry, 기존 사용자 소개 생략·resume·외부 PDF 완료 snapshot.
- Studio Enter 생성, 첫 음표, 파일 저장 취소·실패·retry와 성공 안내.
- 초기화 후 오래된 메모리 task 결과 억제. 조건 변경은 이미 진행 중 요청에 소급 적용하지 않음.
- PDF 수동 안내·dialog Escape focus 복귀, 미설치/설치 unknown 구분, 수신 실패 후 파일 보존, 메모리 동일 전달 replay 방지.
- 음원 다른 형식 선택·취소·재시도, 출발 앱의42초 일시정지 맥락 보존.
- 전체 지도/세 앱 첫 사용/두 연결 ×320/840/1440 ×light/dark =36 layout. reduced-motion의 실제 음형 animation none. CSS zoom200 레이아웃 stress.
- 로딩 중·오류·부분·성공·수신 화면의 캡처. 이미지 로딩과 레이아웃 안정 후 촬영, 콘솔/리소스 오류 확인.

CSS zoom은 OS 글자 확대 검사가 아니다. 현재 시안은 파일/설치 조건을 사용자가 지정하는 예제이며 실제 availability 탐지 결과가 아니다. 450ms 메모리 task는 시연용이고 제품 timeout/브랜드 대기 규칙이 아니다. 시각 검토는 대표 map·첫 사용·오류·성공·전달·좁은/dark 화면을 직접 확인하는 범위다.

## 콘텐츠·폰트

- Score PNG는 저장소의 short-score.pdf를 Poppler로 렌더했던 R2 raster를 R3 assets로 복사했다. 세 파일 원본/해시는 `asset-provenance.json`. 실제 PDF 엔진 없이 정적 페이지를 보여준다.
- Studio 보표는 R3 코드의 정적 SVG, note boolean은 메모리 입력 예제. score-core 결과나 engraving 개선 증거가 아니다.
- 오디오 파일은 가상 표시명이며 실제 음원이 없다. 실제 재생·진행률·권한을 꾸미지 않았다.
- 서체/아이콘/바흐는 공통 Web package의 실제 자산·API를 사용. 별도 이미지 생성·외부 캐릭터 자산을 추가하지 않았다. 임시 강조색 lime 유지, 새 대표색 승인 아님.

## 재실행

```sh
npm run typecheck --prefix packages/ddirori_web
# packages/ddirori_web에서
npx vite --config product-r3.config.ts
npx vite build --config product-r3.config.ts
# 저장소 루트에서 정적 빌드 제공
python3 -m http.server 8097 --bind 127.0.0.1
```

```sh
# 저장소 루트. 환경에 설치된 실제 경로로 치환 가능
DDIRORI_PLAYWRIGHT=/tmp/ddirori-brand-tools/node_modules/playwright \
DDIRORI_BROWSER='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
DDIRORI_REVIEW_URL='http://127.0.0.1:8097/docs/brand/ddirori-design-system/product-design-r3/preview/catalog/product-r3.html' \
node docs/brand/ddirori-design-system/product-design-r3/verify-review.cjs
python3 docs/brand/ddirori-design-system/product-design-r3/revision.py
```

소스 조사/캡처 재실행은 R3 evidence를 갱신하므로 기존 manifest와 다르면 먼저 원인을 확인한다. 새 검토·검증 후에만 R3의 새 기준을 기록한다. 서비스 구현 담당자가 역사적 manifest를 자동 재생성해서는 안 된다.

## 미실행

실제 앱 간/기기 간 파일 이동, OS chooser/share 결과·permission/URI 수명, Score PDF ready·annotation 좌표/저장, Play 실제 codec·오디오 세션, Studio native save/reopen/PDF 출력, 물리 IME·VoiceOver/TalkBack·스크린리더·사람 관찰은 이번 범위에서 미실행. 현재 검증은 이를 대체하지 않는다. 사람 대상 과제와 미확정 정책은 [user-validation](user-validation.md)에 분리했다.
