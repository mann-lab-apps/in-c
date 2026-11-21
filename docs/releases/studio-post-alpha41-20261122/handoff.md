# Studio alpha.41 이후 PNG 진단과 재출력

기준은 `v0.1.0-alpha.41`의 `24971ce6141a0c91b2e1b40d556297d771bc0ad2`다. 이번 구현은 `feature/studio-post-alpha41-20261122`의 미커밋 변경이다. 태그와 릴리즈 검증은 이전 소스의 기록이다.

## 확인한 결함과 구현

- 960×750에서 텍스트 선택 없이 긴 PNG 진단을 휠로 읽으면, 늦은 PDF 실패가 상태줄을 차지한 뒤 같은 진단의 읽던 글자가 화면에서 사라졌다. 스크롤 수치 대신 실제로 보이는 본문 글자의 위치를 기억한다. 같은 진단이 이동하면 기존 스크롤 공개 함수로 해당 글자를 보이게 한다.
- 이전 내보내기 설정의 PNG 진단 레이블과 본문에 걸친 정방향·역방향 선택이 이동 뒤 풀렸다. 같은 진단의 레이블과 본문에서 선택 양끝, 글자 위치와 방향을 유지한다. 기존의 한 본문 안 선택도 계속 검증한다.
- 진단을 읽은 뒤 악보 쪽에서 휠을 움직여도 늦은 PDF 실패가 이전 진단 토글에 초점을 다시 줬다. 새 수동 이동 또는 새 입력란의 초점에 우선권을 준다. 새 문서와 PNG 재시도에서는 끝난 진단의 읽기 상태를 정리한다.

변경은 진단 표시와 읽기 상태에 한정된다. 기존 상태줄 응답 순서, 저장기, 파일 형식, 단축키와 악보 편집 계약을 사용한다. 자동 글자 공개와 별도로 사용자가 토글을 다시 탐색하면 기존 키보드 초점과 링을 확인한다. 긴 본문을 읽는 동안 토글이 화면 밖에 있을 수 있다.

## 실제 앱 재현 방법

앱 빌드는 작업공간 기준 절대 출력 경로를 사용한다. 다음 명령은 루트에서 실행한다.

```sh
npm run build -- --outDir="$PWD/out/post-alpha41-png/reader-scope-build"
runner=docs/releases/studio-post-alpha41-20261122/qa/verify-png-reader.cjs
build=out/post-alpha41-png/reader-scope-build
for mode in scroll range replace; do
  env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron "$runner" \
    --build="$build" --mode="$mode" --out="replay-$mode" --expect-fixed
done
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron "$runner" \
  --build="$build" --mode=scroll --out=replay-outside --outside-control --expect-fixed
for width in 960 1400; do
  env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron "$runner" \
    --build="$build" --mode=help --width="$width" --out="replay-help-$width" --expect-fixed
done
```

새 `--out` 이름을 사용한다. 기본 자료는 [생성 악보](qa/reader-source.chromatics)다. 독립 숨김 Electron·임시 프로필에서 실제 renderer·preload·main과 파일 쓰기를 사용한다. 파일 선택과 응답 지연은 어댑터로 제어한다. PNG·PDF 쓰기 실패는 생성한 디렉터리로 실제 저장을 요청해 재현한다. 진단 읽기는 CDP 휠·키 입력과 DOM Range를 사용한다. 앱 외부 클립보드, 사용자 프로필과 사용자 앱은 실험에 사용하지 않았다.

- 960×750 dark와 coarse 에뮬레이션, 1400×750 light와 fine을 확인한다. 진단 이동 전후 UI 글자 크기는 200%다. 글자 가시성은 실제 hit 위치로 측정한다.
- 기존 오프라인 도움말의 문제 해결을 읽고 Escape로 돌아와 저장 위치와 해상도를 바꾼다. PNG 파일의 크기·pHYs·작성 데이터 일치와 편집 상태를 검사한다.
- 실제 OS 파일 대화상자, 물리 터치, 스크린리더 및 Windows/Linux 실행은 남아 있다. 스크린리더와 대화상자 검증에는 전면 입력과 낭독을 독점할 환경이 필요하다.

나머지 작업은 [실행 큐](execution-queue.md)에 기록한다.

## 이번 소스의 검증 결과

| 검사 | 결과 |
| --- | --- |
| 집중 검사 | App PNG 출력·설정 포커스·MIDI 진단과 기존 진단 선택 유틸리티 4파일 50검사 통과 |
| 생산 빌드와 격리 앱 | 소스 빌드 후 41경로 통과. 읽기·새 필드 12개, 양방향과 대조군 24개, 새 수동 이동 1개, 문서 교체 2개, 도움말 후 재출력 2개 |
| 읽기 위치 | 960에서 늦은 PDF 실패 뒤 본문 오프셋 129를 다시 읽을 수 있다. 1400에서 MusicXML 취소 뒤 오프셋 545가 보인다. 1400 상태줄에서 PageDown을 사용했고 MusicXML 취소 경로는 두 폭에서 휠을 사용했다. |
| 선택 및 포커스 | 레이블·본문 정방향과 역방향의 문자열과 양끝이 유지됐다. 같은 화면에서 Space는 진단 선택을 유지하고 악보로 돌아가면 다시 재생·일시정지를 제어했다. 모든 초기 토글 포커스 링의 4px 영역을 확인했다. |
| 새 수동 이동 | 960에서 다른 영역으로 스크롤한 뒤 악보 제목의 상단이 112.58→112.67 CSS px를 유지했다. 제거된 토글은 포커스를 되찾지 않았다. |
| 읽기 종료와 재시도 | 두 폭에서 프로젝트 교체 시 이전 진단이 풀리고 새 오류는 접힌 상태로 시작했다. 도움말의 PNG 안내 글자를 화면에서 확인하고 Escape로 메뉴 초점을 복원했다. 실제 300dpi PNG는 2480×3508, pHYs는 11811픽셀/m이며 원본·미저장 수정·악보 선택을 보존했다. |
| 출처와 원래 실패 | [로그·캡처·소스·산출물 해시](evidence.json). 진단 줄 손실과 외부 휠 뒤 토글 재집중의 실제 로그, 양방향 선택의 초기 App 실패를 보존했다. |

검증기 개선 기록도 로컬 로그에 남겼다. 새 DOM의 글자 배율이 진단 공개 전에 적용되도록 했고, PageDown이 정착한 뒤 글자 위치를 읽었다. 1400의 MusicXML 취소는 문서 스크롤 경로에서 실제 휠을 사용했다. 이 변경은 진단의 실제 글자 가시성, 선택 범위·방향 및 hit 검사를 유지한다. 최종 빌드의 대표 화면을 직접 확인했다.

## 전체 검사와 인계 상태

`npm run test:all`은 1,722초에 종료 코드 0으로 완료됐다. Vitest 775파일·7,347검사와 Node-native 5검사가 통과했다. 외부 앱 opt-in 1파일·1검사는 건너뛰었다. 원래 종료 결과에 이어 별도 명령으로 고정 소스·검증 자료·빌드 등 1,805개 경로의 SHA256을 확인했다. 실행 전후 해시는 일치했다.

생산 빌드·typecheck와 roadmap, work-queue, manual, backlog 검사 4종을 통과했다. 자체 검사와 Electron 프로세스는 종료됐다. 현재 변경은 지정 worktree에 미커밋 상태로 남아 있다.
