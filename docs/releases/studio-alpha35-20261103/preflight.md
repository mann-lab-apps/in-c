# Studio alpha.35 준비

사용자가 커밋·푸시·릴리즈를 승인했다. 별도 release/studio-alpha35-20261103 브랜치와 worktree에서 검증된 Studio 소스·필수 공통 UI/토큰/피아노 자산만 고정했다. 원본 작업 폴더·다른 worktree·미커밋 모바일/브랜드 원본과 live out은 변경하지 않았다. raw 역사적 QA 산출물 전체를 저장소에 추가하지 않고 최신 833 인계와 검증 소스 manifest를 보존한다.

기준 HEAD와 파일별 해시는 validated-inputs.json에 있다. 이전 Studio 전체 결과는 352파일3767검사/외부opt-in1skip/Node5 PASS다. 후보에서는 fresh npm ci와 type/build가 통과했다. 보안 감사에서 런타임 Zod 4.6.2의 고위험 collection 메모리 소진 문제가 확인돼 후보에만 4.6.7을 적용했다. production audit은 수정 후 0건이다. 이어서 devDependency로 선언됐지만 실제 앱에 포함되는 Electron도 별도로 확인해 42.4.1에서 같은 42 계열의 42.11.18로 업데이트했다. 개발 도구 감사의 잔여 28건을 숨기거나 production audit 0건을 전체 의존성의 무취약점으로 해석하지 않는다. 원래 감사 JSON과 수정 후 JSON을 함께 보존한다.

macOS의 Developer ID/공증 설정은 공개 alpha.34의 workflow를 기준으로 보존했다. 로컬 secret/env 파일은 읽지 않고 기존 GitHub Actions secret 참조를 사용한다. 로컬 unpacked arm64 검사는 identity=null/notarize=false 명시적 override이며, 게시된 universal 서명/공증 검증을 대신하지 않는다.

최종 버전 commit은 package.json/package-lock.json만 변경하며 v0.1.0-alpha.35 태그는 그 commit을 가리킨다. 기존 태그는 이동·삭제·재사용하지 않는다. fresh dependency와 서명 설정·패키지 후보의 전체 회귀, 실제 packaged bridge/피아노와 CI 결과는 이어서 기록한다. Release 실패 시 게시 성공으로 보고하지 않는다.

## 실제 패키지 검증 경로 이전

기존 smoke script는 제거된 category tab, 예전 wizard label 및 backup dialog selector에 의존했다. 실제 전역 메뉴, 표시된 combobox/option, 공통 Dialog로 진입하도록 main의 smoke 전용 adapter를 이전했다. controlled input의 확정은 두 animation frame을 기다리고, 음표 선택 뒤 악보 설정을 다시 여는 실제 흐름을 사용한다. 이전 실패 a/b 로그를 보존하며 native lifecycle, 960/1400 backup containment, 두 페이지 PDF, MusicXML/MXL/MIDI, part layout, undo와 autosave assertions는 유지했다. migration-c의 실제 unpacked 앱 smoke가 통과했다. 이후 Electron 업데이트를 포함하는 최종 패키지를 다시 검증한다.

로컬 packaged 검사는 임시 userData, 별도 앱 복제본과 음소거를 사용한다. 피아노 검사는 12초 오프라인 자산/오디오 그래프 검사이며 실제 청음이나 605초 내구 검사를 대신하지 않는다. 설치 파일의 최종 universal 서명/공증은 원격 workflow에서 확인한다.

staged 신규 파일까지 검사한 결과 제품/fixture 다섯 파일의 EOF 빈 줄만 정리했다. pinned 원본 MusicXML XSD의 CRLF 및 upstream whitespace는 해시 검증 계약 때문에 바꾸지 않았다. scoped whitespace gate는 이 vendor schema 디렉터리만 제외한다. 원본 Studio 소스와의 차이는 보안 의존성, smoke adapter, EOF 정리와 배포 설정이며, 후보의 전체 검사를 별도로 수행한다.
