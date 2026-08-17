# in C - Click 배포 준비 체크리스트

작성일: 2026-08-17

## 목적

`in C - Click`을 App Store / Play Store 테스트 배포까지 올리기 전에 필요한
기술·정책·스토어 준비 항목을 정리한다.

## 현재 준비된 것

- Flutter iOS/Android 앱: `apps/in_c_click`
- Bundle/Application ID: `com.mannlab.inc.click`
- 표시 이름: `in C - Click`
- 앱 버전: `0.1.0+1`
- 앱 아이콘: iOS AppIcon, Android launcher icon
- 로컬 설정 저장: BPM, 박자, 첫 박 강조
- 앱 내 개인정보 입력 없음
- 앱 내 계정/결제/광고/마이크/파일/위치/알림 권한 없음
- 상단 기능 제안 링크: `https://in-c.mannlab.app/utility-apps.html?source=in-c-click#utility-app-form`
- iOS privacy manifest: `ios/Runner/PrivacyInfo.xcprivacy`
- Android release signing 설정 템플릿: `android/key.properties.example`
- iOS 기본 화면 원본 스크린샷:
  `apps/in_c_click/store-assets/ios/screenshots/raw/iphone-16-pro-main.png`

## 배포 전 결정

### 1. 출시 채널

권장 순서:

1. iOS TestFlight 내부 테스트
2. Android internal testing
3. 가까운 음악가 3-5명 수동 테스트
4. 스토어 공개 여부 결정

처음부터 공개 스토어 출시까지 밀기보다, 오디오 지연·화면 꺼짐·무대 사용성 피드백을
짧게 받는다.

### 2. 연주 모드 포함 여부

1차 공개 전에는 필수는 아니다. 다만 다음 기능은 후속 이슈로 분리한다.

- 화면 꺼짐 방지
- 큰 시각 pulse
- 위험 조작 숨김
- 첫 박/일반 박 색상 대비
- haptic 또는 flash 필요성

백그라운드/잠금화면 재생은 iOS/Android 정책과 네이티브 오디오 동작을 추가로 봐야 하므로
1차 내부 테스트 이후 판단한다.

## Android 준비

현재 Android 배포는 보류한다. 아래 항목은 Play Store 진행을 재개할 때 사용한다.

### 1. 업로드 키 생성

실제 비밀번호는 git에 커밋하지 않는다.

```sh
cd apps/in_c_click/android
keytool -genkeypair \
  -v \
  -keystore upload-keystore.jks \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload
cp key.properties.example key.properties
```

`key.properties`를 실제 값으로 채운다.

```properties
storePassword=...
keyPassword=...
keyAlias=upload
storeFile=../upload-keystore.jks
```

### 2. App Bundle 빌드

```sh
cd apps/in_c_click
flutter build appbundle --release
```

산출물:

```text
apps/in_c_click/build/app/outputs/bundle/release/app-release.aab
```

### 3. Play Console 입력

- 앱 이름: `in C - Click`
- 카테고리: Music & Audio 또는 Tools 중 선택
- Data safety: 앱 자체는 개인정보를 수집하지 않음
- 권한: 앱 본체 release manifest 기준 민감 권한 없음
- Privacy Policy URL: `https://in-c.mannlab.app/in-c-click-privacy.html`
- App signing: Google Play App Signing 사용, upload key로 AAB 서명

## iOS 준비

2026-08-17 로컬 확인 결과, `flutter build ipa --release`는 코드 서명 단계에서
중단됐다.

확인된 blocker:

- Team `ZRA4DHHKQ4`에 등록된 테스트 기기가 없음
- `com.mannlab.inc.click`에 맞는 iOS Development provisioning profile 없음

다음 중 하나를 먼저 처리한다.

- 실제 iPhone을 연결해 Xcode가 development profile을 만들게 한다.
- Apple Developer > Certificates, Identifiers & Profiles에서 테스트 기기 UDID를
  등록한다.
- App Store Connect/TestFlight로 바로 갈 경우 Bundle ID와 App Store distribution
  profile을 준비한다.

### 1. App Store Connect 앱 생성

- Bundle ID: `com.mannlab.inc.click`
- SKU 후보: `in-c-click-ios`
- 앱 이름: `in C - Click`
- 카테고리: Music 또는 Utilities 중 선택
- Privacy Policy URL: `https://in-c.mannlab.app/in-c-click-privacy.html`

### 2. Privacy

앱 본체 기준:

- Data collection: 앱 자체는 개인정보를 수집하지 않음
- Tracking: 없음
- Required reason API: `UserDefaults`
  - 이유: 앱 내부 설정 저장
  - manifest: `ios/Runner/PrivacyInfo.xcprivacy`

상단 기능 제안 링크를 통해 웹 폼으로 이동하면 웹 개인정보 고지의 적용을 받는다.

### 3. Archive

Xcode에서 `apps/in_c_click/ios/Runner.xcworkspace`를 열고 다음을 확인한다.

- Team: `ZRA4DHHKQ4` 또는 실제 배포 계정 team
- Signing: Automatic
- Version/Build: `0.1.0 / 1`
- Target: Runner
- Destination: Any iOS Device

이후 Archive -> Validate App -> Distribute App -> TestFlight 순서로 진행한다.

CLI 확인:

```sh
cd apps/in_c_click
flutter build ipa --release
```

Apple 계정/프로비저닝이 로컬에 준비되지 않았으면 이 명령은 실패할 수 있다. 이 경우
Xcode Organizer에서 계정 상태를 먼저 맞춘다.

## 제출 전 검증 명령

```sh
cd apps/in_c_click
dart format lib test
flutter analyze
flutter test
flutter build ios --simulator --debug
flutter build apk --debug
```

스토어 계정 준비 후:

```sh
flutter build appbundle --release
flutter build ipa --release
```

사이트와 정책 페이지:

```sh
npm run site:build
npm run verify:site-content
npm run verify:site-seo
git diff --check
```

## 스토어 설명 초안

### 한 줄

연습을 바로 시작할 수 있는 무료 메트로놈.

### 짧은 설명

BPM, 박자, 첫 박 강조, 빠르기말 확인, 탭 기반 BPM 맞추기를 조정하고 연습을 바로
시작하는 무료 메트로놈입니다.

### 키워드 후보

- 메트로놈
- 빠르기
- BPM
- 클래식
- 연습
- 박자
- tempo
- metronome

## 1차 내부 테스트 질문

- 180 BPM 이상에서도 박이 밀린다고 느끼는가?
- 첫 박 강조가 충분히 구분되는가?
- Tap BPM과 박자 변경이 실수로 눌리지 않는가?
- 빠르기말 표시가 실제 연습에 도움이 되는가?
- 화면이 꺼지는 것이 불편한가?
- 연주 모드가 있으면 쓸 것 같은가?
- Click에 가장 먼저 필요한 다음 기능은 무엇인가?

## 참고

- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- Apple Privacy Manifest:
  https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk
- Google Play User Data / Data safety:
  https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play App Signing:
  https://support.google.com/googleplay/android-developer/answer/9842756
