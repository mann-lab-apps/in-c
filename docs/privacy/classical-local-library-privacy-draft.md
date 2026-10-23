# 띠로리 플레이 개인정보 처리 안내 초안

작성일: 2026-10-23

이 문서는 내부 베타 `0.1.0+1` 구현을 기준으로 한 배포 준비 초안이다. 공개 출시 전
운영 주체, 연락처, 공개 URL, 관할 법률 검토를 확정해야 한다.

## 기본 원칙

- 계정, 광고, 분석 SDK, 추적 SDK와 자체 클라우드 동기화를 사용하지 않는다.
- 사용자의 음원, 파일명·로컬 경로, 앱 내부 카탈로그, 재생 위치와 감상 기록은 기기에
  저장한다.
- 원본 오디오 파일과 원본 태그를 수정하거나 삭제하지 않는다.
- 앱이 관리하는 복사본만 사용자의 명시적 전체 초기화 또는 개별 삭제로 제거한다.

## 외부 전송

- MusicBrainz 검색을 실행하면 사용자가 확인한 작곡가·작품·녹음 검색어와 외부
  식별자를 MusicBrainz에 보낼 수 있다. 로컬 전체 경로와 감상 기록은 보내지 않는다.
- IMSLP 검색·다운로드를 실행하면 검색어, 작품 페이지 및 자료 URL에 대한 HTTPS 요청을
  IMSLP에 보낸다. 권리 상태가 불명확한 자료를 자동으로 수집하지 않는다.
- AcoustID는 현재 production에서 비활성이다. API key나 검증된 fingerprint adapter가
  없으며 음원 지문을 전송하지 않는다.
- 네트워크 오류 전문, 기기 식별자와 사용자 파일 경로를 진단 보고서에 넣지 않는다.
- 앱 시작, 스캔, 초기화와 외부 링크 오류는 사용자에게 경로와 native 예외를 제외한 한국어
  복구 문구로 표시한다.

## 기기 저장과 백업

- SQLite에는 스캔 결과, 내부 메타데이터, 작품·녹음·악장 카탈로그, 파일 연결, 감상
  기록과 외부 자료 provenance가 저장된다.
- 운영체제 백업 기능이 켜져 있으면 SQLite 메타데이터는 사용자의 기기 백업에 포함될 수
  있다.
- 용량이 큰 앱 관리 음원 폴더 `managed_audio`와 IMSLP 가져오기 폴더
  `imslp_imports`는 Android cloud/device-transfer backup과 iOS backup에서 제외한다.
- iOS 제외 표시는 파일 생성 후 완료 경로에 적용하며, 앱 시작 시 기존 관리 폴더에도
  다시 적용한다.

## 사용자 통제

- 설정의 `전체 로컬 데이터 초기화`는 `초기화` 확인 입력 뒤 SQLite 사용자 데이터와 앱
  관리 음원 복사본을 삭제한다.
- 초기화 도중 파일 정리가 중단되면 다음 앱 시작에서 정리를 재개한다.
- 파일 선택기 또는 사용자가 등록한 음악 폴더의 외부 원본은 전체 초기화 대상이 아니다.
- 앱 관리 복사본은 파일 정리 화면에서 개별 내보내기 또는 삭제할 수 있다.

## 스토어 고지 초안

- Apple App Privacy: 운영자 수집 데이터 없음, tracking 없음. 단, MusicBrainz와 IMSLP를
  사용자가 호출하면 해당 제3자에게 요청 정보가 직접 전송된다.
- Google Play Data safety: 앱 개발자가 수집하거나 공유하는 사용자 데이터 없음으로
  검토하되, 제3자 외부 링크·요청과 OS 백업 동작을 최신 정책 질문에 맞춰 다시 답한다.
- iOS `PrivacyInfo.xcprivacy`는 tracking과 수집 데이터를 선언하지 않고, 앱이 직접 쓰는
  파일 timestamp API에 `C617.1`(앱 container)과 `3B52.1`(사용자 승인 파일)을 기록한다.
- 2026-10-23의 unsigned release bundle에는 앱, Flutter, `file_picker_darwin`,
  `share_plus`, `sqflite_darwin`, `url_launcher_ios`의 privacy manifest가 포함되었고,
  `UIBackgroundModes`, 사용 목적 권한 문구와 임의 네트워크 허용은 없었다.
- `path_provider_foundation`은 현재 Dart FFI 경로라 별도 native bundle manifest가 없다.
  앱 manifest가 직접 사용하는 file timestamp 이유를 포괄하지만, signed archive의 privacy
  report와 App Store upload validation은 배포 계정이 준비된 뒤 다시 확인한다.
- 개인정보 처리방침과 지원 링크는 공개 `https` URL만 활성화한다. 링크가 없거나 유효하지
  않으면 앱은 준비 중 상태를 표시한다.
- 물리 기기 출시 피드백은 generic platform/device class, OS major, 자체 fixture 또는 format,
  제한된 결과 enum과 P0–P3만 허용한다. 파일 경로·파일명·곡 metadata·감상 이력·기기 ID·
  자유 형식 native 오류는 schema와 validator에서 거부하며 앱이 저장하거나 전송하지 않는다.

2026-10-23 확인 근거:

- [Apple third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- [Required reason API의 File timestamp 이유](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons)
- [Privacy manifest 추가 방법](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk)
- [App Review Guidelines 5.1.1](https://developer.apple.com/app-store/review/guidelines/)
- [Flutter Swift Package Manager plugin 안내](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-plugin-authors)

## 공개 출시 전 차단 항목

- 개인정보 처리방침과 지원 페이지의 실제 HTTPS URL
- 운영 주체와 문의 연락처
- Apple/Google 콘솔의 최신 개인정보 설문 답변 검토
- 실제 archive/AAB에 포함된 SDK와 privacy manifest 최종 점검
- 사용자 피드백에 따른 문서 제공자, 삭제와 복원 동작 확인
