# Windows Dev Server Audit Note

검토일: 2026-07-14

## 결과

`npm audit --audit-level=moderate`는 통과한다. 다만 low severity 경고 1건이 남아
있다.

- advisory: `GHSA-g7r4-m6w7-qqqr`
- package path: `vite@7.3.5 -> esbuild@0.27.7`
- 영향: Windows에서 Vite 개발 서버를 노출 실행할 때 임의 파일 읽기 가능성
- 현재 상태: macOS 로컬 개발, production build, Electron package 검증은 차단하지 않음

`npm audit fix`를 실행했지만 2026-07-14 현재 lockfile은 변경되지 않았고 경고가
남았다. `electron-vite`가 사용하는 esbuild는 `0.25.12`로 별도 경로다.

## 운영 기준

- Windows에서 `npm run dev` 또는 `npm run site:dev`를 실행할 때는 개발 서버를
  신뢰할 수 없는 네트워크에 노출하지 않는다.
- dev server는 기본처럼 `127.0.0.1` 또는 로컬 전용으로 사용한다.
- Vite가 esbuild advisory를 해결한 버전으로 올라가면 patch/minor 업데이트를 우선
  적용한다.
- `npm audit --audit-level=moderate`가 실패로 바뀌면 릴리즈 차단으로 본다.
