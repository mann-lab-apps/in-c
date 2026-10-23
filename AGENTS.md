# iOS 배포 메타데이터 유지

iOS 앱의 기능·화면 동선·출시 문구·권한·개인정보 처리·심사 동선에 영향을 주는 작업을 할 때는
해당 앱의 `deployment/apps/<app>/ios-metadata.yaml`도 같은 작업에서 갱신한다.
`source.path`로 앱을 찾는다. Clef & Staff는 `deployment/apps/clef/ios-metadata.yaml`이며,
현재 소스 경로는 `apps/in_c_sheet`다. 다른 앱의 메타데이터가 없으면
`deployment/apps/_template/ios-metadata.yaml`을 바탕으로 준비한다.

- 제품 코드가 바뀌면 `source.state: pending`, `content.reviewed: false`로 되돌린다.
  커밋된 제품 checkpoint를 확정한 뒤에만 `source.commit`을 고정하고 `state: pinned`로 바꾼다.
  메타데이터 변경을 포함할 미래 커밋 해시를 추측하거나 metadata만 갱신한 사실을 제품 변경으로 취급하지 않는다.
- 실제 기능에 맞게 설명·지원 URL·심사/테스트 동선·변경 사항을 갱신한다. 첫 출시가 아니면
  `content.locales.<locale>.release_notes`에 해당 출시의 변경 사항을 작성한다. 출시 버전/빌드 번호는 임의로 올리지 않는다.
- UI 변경 시 `screenshots.scenes`의 목적·진입 경로·샘플 데이터·필수 표시 내용·제외 내용과
  자동화 `steps`/`assertions`를 함께 갱신한다. 확인하지 않은 플랫폼/하드웨어 기능을 캡처로 증명했다고 쓰지 않는다.
- 영향받은 `manual` 항목은 `pending`으로 되돌리고 근거를 갱신한다. 확인하지 않은 설문·연락처·권리 답변을 만들지 않는다.
- 이미지 해시·촬영 결과·검수 통과를 수동으로 꾸미지 않는다. 촬영/검수 산출물은 파이프라인에서 만든다.
  생성된 runtime JSON/txt 대신 YAML을 수정한다. 기존 JSON-only 경로는 이전 검증 기록의 호환용이다.
- 인증서·API 키·데모 계정 비밀번호·비공개 연락처는 YAML에 넣지 않는다. 외부 파일과 환경 변수 참조를 사용한다.
- 작업 후 `cd deployment && bundle exec fastlane prepare_ios_metadata manifest:apps/<app>/ios-metadata.yaml mode:check`로
  형식/촬영 설정을 검증한다. 원격 업로드·심사 제출·출시 권한은 메타데이터 편집에서 추론하지 않는다.

자세한 형식과 실행 방법은 `deployment/METADATA.md`를 참고한다.
