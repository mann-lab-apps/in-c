# 음악 유틸앱 시장 조사와 in C 무료 웹도구 후보

작성일: 2026-08-16

## 조사 목적

in C가 클래식 연주회 홍보 서비스로 바로 좁혀 들어가기 전에, 음악가가 반복적으로 겪는 작은 문제를 무료 공개 웹도구로 해결할 수 있는지 확인하기 위한 조사다. 목표는 메이저 음악 앱을 복제하는 것이 아니라, 이미 시장에서 반복 사용이 증명된 문제를 파악하고 그중 하루에서 사흘 안에 만들 수 있는 작은 기능을 in C식으로 재해석하는 것이다.

이 문서는 다음 실험과 연결된다.

- 무료 음악 도구 제안 랜딩: `site/utility-apps.html`
- 유틸앱 실험 방향성: `docs/product/util-app-experiment-plan.md`
- 장기 전략: 유틸앱 포트폴리오를 만든 뒤 in C 다크나이트, 공연 홍보, 커뮤니티로 이어가기

조사 기준일은 2026-08-16이다. 가격은 지역, 환율, 앱스토어 가격 티어, 프로모션에 따라 달라질 수 있다. 가능한 경우 공식 사이트, App Store, Google Play listing을 우선했고, 공식 listing에서 가격/언어가 충분히 노출되지 않은 경우 신뢰 가능한 보조 출처를 함께 보았다.

## 시장/앱 카테고리 맵

| 문제 영역 | 대표 앱 | 시장의 주된 BM | in C에 유리한 작은 재해석 |
| --- | --- | --- | --- |
| 박자 유지/연습 루틴 | Soundbrenner, Pro Metronome, PolyNome, Practice Pro | 무료+구독, 유료 다운로드, 하드웨어 연동 | 곡별 연습 타이머, 리허설 구간 타이머, 쉬는 시간 포함 루틴 |
| 조율/드론/톤 체크 | TonalEnergy, GuitarTuna, Fender Tune, Pano Tuner, Cleartune | 유료 앱, 광고 제거, 구독, 교육/기타 브랜드 유입 | 마이크 없는 드론/기준음, 조율 체크리스트 |
| 악보/PDF 뷰어/페이지 넘김 | forScore, Newzik, MobileSheets, OnSong | 유료 앱, 구독, 클라우드, 기관/팀 요금제 | 프로그램 순서표, 페이지 넘김 체크리스트, 세트리스트 공유 |
| 코드/반주/느린 연습 | iReal Pro, Anytune, Moises, Songsterr, Ultimate Guitar | 유료 앱, 콘텐츠/IAP, 구독, AI 크레딧, 광고 | 코드 진행 메모, 루프 연습 계획표, 저작권 없는 템포 루틴 |
| 청음/시창/이론 | Perfect Ear, Complete Ear Trainer, EarMaster, Tenuto | 무료+IAP, 일회성 구매, 구독/교육기관 | 오늘의 5문제, 선율 contour, 계이름/음정 미니 연습 |
| 연습 기록/레슨 운영 | Modacity, BandHelper, Andante, Instrumentive, Practice Time | 구독, 일회성 구매, B2B/그룹 | 연습 후 3줄 회고, 다음 연습 카드, 레슨 숙제 체크 |
| 작곡/아이디어/사보 | StaffPad, Dorico, Notion, Flat, MuseScore | 유료 앱, 구독, 콘텐츠/클라우드, IAP | 작곡 메모, 악상 카드, 공개 도메인 한 줄 스케치 |
| 녹음/아이디어 캡처 | Dolby On, BandLab, GarageBand, Koala Sampler | 무료 생태계, 구독/멤버십, 샘플팩/IAP | 녹음 파일 자체 저장 없는 리허설 기록표 |

## 메이저 앱 목록

| 앱 | 개발사/운영사 | 플랫폼 | 카테고리 | 메이저 신호 | 한국어 지원 |
| --- | --- | --- | --- | --- | --- |
| TonalEnergy Tuner & Metronome | TonalEnergy, Inc. | iOS/iPadOS/Apple Watch/Android/Amazon | 튜너, 메트로놈, 드론, 녹음 | App Store US Music #1, 58K ratings 4.8, Google Play all-in-one 설명 | 공식 listing에서 한국어 확인 불가 |
| Soundbrenner Metronome | Soundbrenner | iOS/iPadOS/Android, 하드웨어 | 메트로놈, 튜너, 연습 트래커 | Google Play 1,000만+ 신뢰 문구, 하드웨어 생태계 | 한국어 공식 확인 불가 |
| Pro Metronome | EUMLab | iOS/Android | 메트로놈, 리듬 트레이너 | 공식 사이트 1억 5천만+ 사용 주장, iOS/Android 양쪽 | 한국어 공식 확인 불가 |
| PolyNome | PolyNome Ltd | iOS/iPadOS/Mac/Vision | 고급 메트로놈 | 유명 드러머/세션 지향, 유료 고급 앱 | 한국어 미지원, English only |
| GuitarTuna | Ovelin/Yousician 계열 | iOS/Android | 기타 튜너, 코드/탭/레슨 | Google Play 1억+ 다운로드, Apple IAP 다수 | 한국어 지원 |
| Fender Tune | Fender | iOS/Android | 기타/베이스/우쿨렐레 튜너 | Fender 브랜드, 무료 튜너+계정/교육 리소스 | 한국어 지원으로 보조 출처 확인 |
| Pano Tuner | Soundlim | iOS/Android | 크로매틱 튜너 | 단순 무료 튜너, Android 무료+광고 제거 | 한국어 지원으로 보조 출처 확인 |
| Cleartune | Bitcount ltd. | iOS/Android | 크로매틱 튜너 | 오래된 유료 튜너, iOS Music chart 노출 | 한국어 공식 확인 불가 |
| forScore | forScore, LLC | iOS/iPadOS/Mac/Vision | PDF 악보 뷰어 | iPad 악보 뷰어 대표 앱 | 한국어 지원으로 보조 출처 확인 |
| Newzik | Syncsing/Newzik | iOS/iPadOS/Web/Vision | 악보 뷰어, 협업, LiveScores | 오케스트라/기관 협업 지향, 가격 페이지 명확 | 한국어 지원 |
| MobileSheets | Zubersoft/Michael Zuber | Android/iOS/Windows/macOS | 악보 뷰어 | Android 태블릿 악보 뷰어 대표, 크로스 플랫폼 | 한국어 지원 |
| OnSong | OnSong | iOS/iPadOS/Web 일부 | 코드차트, 세트리스트, 공연 | 400,000+ users, Top 5 iPad Music App Store 문구 | 28+ 언어, 한국어는 공식 확인 불가 |
| MuseScore | Muse Group | iOS/Android/Web/Desktop | 악보 플랫폼/뷰어 | 수백만 악보, Google Play/웹 대형 플랫폼 | 한국어 공식 확인 불가 |
| iReal Pro | Technimo | iOS/iPadOS/Mac/Android/Windows/Linux | 코드 차트, 반주 | 82,000+ 평균 ratings, 200만+ musicians, No subscription | 한국어 공식 확인 불가 |
| Anytune | Anytune Inc. | iOS/iPadOS/Apple Watch/Android | 속도/피치 조절, 루프 | 연습용 음악 플레이어 대표 | 한국어 지원 |
| Moises | Moises Systems | iOS/Android/Web | AI stem 분리, 코드/가사/클릭 | Google Play 5,000만+ 다운로드, App Store Editors' Choice | 한국어 공식 확인 불가 |
| Songsterr | Songsterr | iOS/Android/Web | 탭/코드, 플레이어 | 100만+ 탭/코드, subscription based | 한국어 공식 확인 불가 |
| Ultimate Guitar | Ultimate Guitar USA/Muse Group | iOS/Android/Web | 탭/코드, 레슨, 커뮤니티 | 200만+ free tabs/chords, 대형 기타 커뮤니티 | 한국어 공식 확인 불가 |
| Perfect Ear | Crazy Ootka Software AB | iOS/iPadOS/Mac/Android | 청음, 리듬, 시창, 이론 | Google Play 86K+ reviews 4.6 | 한국어 미지원 |
| Complete Ear Trainer | Binary Guilt | iOS/Android/Huawei/Amazon/Desktop 묶음 | 청음 | 게임형 청음 앱, 일회성 unlock | 한국어 미지원 |
| EarMaster | EarMaster ApS | iOS/Android/Desktop/Web/Cloud | 청음, 시창, 이론, 기관 | 학교/기관 사용, Android 100K+ 다운로드 | 한국어 미지원 |
| Tenuto | musictheory.net | iOS/iPadOS | 이론/청음 연습, 계산기 | musictheory.net의 모바일 유료 앱 | 한국어 미지원으로 추정 |
| Modacity | Modacity | iOS/Android | 연습 기록, deliberate practice | 보수적 음악 연습 앱 대표 | 한국어 공식 확인 불가 |
| BandHelper | Arlo Media | iOS/Android/Web | 밴드 운영, 세트리스트, 일정 | 팀/밴드 운영 SaaS | 한국어 미지원 |
| Practice Pro | Dynamic App Design | iOS | 연습 위젯 대시보드 | Verge 소개, 튜너/메트로놈/녹음 위젯 | 한국어 공식 확인 불가 |
| StaffPad | StaffPad Ltd. | iPadOS/Windows | 필기 사보/작곡 | 프리미엄 필기 사보 앱 | 한국어 공식 확인 불가 |
| Dorico for iPad | Steinberg/Yamaha | iPadOS/Desktop 별도 | 사보/작곡 | 전문 사보 프로그램 모바일판 | 한국어 미지원 |
| Notion/Fender Notion | PreSonus/Fender | iOS/iPadOS/macOS/Android/Windows/Linux | 무료 사보/작곡 | 무료 크로스 플랫폼 사보 | 한국어 공식 확인 불가 |
| Flat | Tutteo | Web/iOS/Android/Windows | 클라우드 사보/협업 | 한국 App Store 언어/가격 노출 | 한국어 지원 |
| BandLab | BandLab Technologies | Web/iOS/Android | 무료 DAW/협업 | 1억+ 사용자/다운로드 신호 | 한국어 공식 확인 불가 |
| Dolby On | Dolby | iOS/Android | 녹음/자동 보정 | 무료 Dolby 녹음 앱 | 한국어 공식 확인 불가 |
| GarageBand | Apple | iOS/iPadOS/macOS | 무료 DAW | Apple 기본 음악 제작 앱 | 한국어 지원 |

## 가격/BM/언어 지원 요약표

| 앱 | 가격/과금 형태 | BM/수익 모델 | 가격 확인 메모 | 언어/한국어 |
| --- | --- | --- | --- | --- |
| TonalEnergy | iOS US $6.99 유료 다운로드, Android는 Google Play에서 $5.99로 노출된 사례 있음. Google Play 설명에는 subscription based 문구도 있어 지역/플랫폼 확인 필요. | 유료 앱, 구독 가능성, 교육기관용 앱/라이선스 | App Store US, Google Play, 공식 사이트. 확인일 2026-08-16 | Apple listing: EN + 8 More. 한국어 공식 확인 불가 |
| Soundbrenner | 무료 기능+Soundbrenner Plus 구독. 하드웨어 Pulse $119, Core 2 $229 등. 구독 가격은 공식 가격표 확인 불가, 리뷰/보조 출처에서 월/연 구독 언급. | 프리미엄 기능 구독, 하드웨어 판매, 앱-웨어러블 생태계 | Google Play, Soundbrenner 공식 쇼핑 페이지. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| Pro Metronome | 무료 기본 기능+Pro 업그레이드. 공식 사이트는 iOS/Android 다운로드와 무료 기본 기능을 강조. | 무료 배포 후 Pro 기능 잠금 해제/IAP | Google Play, App Store, EUMLab. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| PolyNome | App Store US $9.99 유료 다운로드+Premium 1 Year $39.99, Lifetime $179. | 유료 앱, 고급 기능 구독, lifetime unlock | App Store. 확인일 2026-08-16 | English only, 한국어 미지원 |
| GuitarTuna | 무료+광고+IAP/구독. App Store US: Pro Subscription $6.49, Play Yearly $39.99, Learn Yearly $139.99 등. | 광고, Pro 구독, 교육/레슨 구독, 기타 학습 생태계 | App Store, Google Play. 확인일 2026-08-16 | 한국어 지원 |
| Fender Tune | 무료 튜너. | Fender 계정/교육 리소스/제품 생태계 유입, 브랜드 마케팅 | Fender support, Google Play/App Store. 확인일 2026-08-16 | 보조 출처 기준 한국어 지원 |
| Pano Tuner | 무료+광고, 일회성 광고 제거. | 광고, 광고 제거 IAP | Google Play. 확인일 2026-08-16 | 보조 출처 기준 한국어 지원 |
| Cleartune | App Store US $3.99 유료 다운로드. Android도 유료로 알려짐. | 유료 앱 | App Store, 리뷰/보조 출처. 확인일 2026-08-16 | EN + 9 More, 한국어 공식 확인 불가 |
| forScore | $24.99 일회성 구매+forScore Pro $14.99/year부터. App Store IAP에 Pro 30-Day Pass도 있음. | 유료 앱, Pro 구독, 클라우드/고급 기능 | forScore 공식 KB, App Store. 확인일 2026-08-16 | 보조 출처 기준 한국어 지원 |
| Newzik | 무료 체험. Essentials €29.99 lifetime, Premium €49.99/year 또는 €9.99/month, Premium Lifetime €199. | lifetime unlock, 프리미엄 구독, 기관/앙상블 협업 라이선스 | Newzik 공식 가격. 확인일 2026-08-16 | 한국어 지원 |
| MobileSheets | Trial 있음. Android 보조 출처 $15.99, iOS 지역별 일회성 구매. 구독 없음. | 유료 앱, 무료 trial | Zubersoft, App Store, AppBrain. 확인일 2026-08-16 | 한국어 지원 |
| OnSong | 무료 다운로드/수신·보기 제한. Essentials $3/month annual 또는 $3.99 monthly, Premium $5/month annual 또는 $5.99 monthly, 그룹 할인. | 월/연 구독 SaaS, 그룹/팀 요금제 | OnSong 공식 help. 확인일 2026-08-16 | 28+ languages, 한국어 공식 확인 불가 |
| MuseScore | 무료 악보 접근+Pro/Pro+ 구독 및 일부 콘텐츠 결제. 보조 출처 기준 Pro+ Weekly $5.99, Annual $99.99. | 구독, 악보/콘텐츠 접근, 마켓플레이스/커뮤니티, 광고 가능성 | Google Play, App Store, 보조 출처. 확인일 2026-08-16 | 공식 모바일 언어 목록에 한국어 확인 불가 |
| iReal Pro | App Store/Google Play $21.99 유료 다운로드+추가 style pack IAP. 공식 사이트는 no subscription, no ads. | 유료 앱, style pack IAP | App Store, Google Play, iReal Pro 공식. 확인일 2026-08-16 | EN + 9 More, 한국어 공식 확인 불가 |
| Anytune | Android core free+ads, Pro 구독 또는 기간 한정 일회성 구매. iOS Pro+는 보조 출처 $14.99. | 광고, Pro 구독, 일회성 Pro unlock | Google Play, Anytune Zendesk, App Store. 확인일 2026-08-16 | 한국어 지원 |
| Moises | 무료 tier+유료 구독. 공식 가격표는 로그인 필요. Google Play 50M+ 다운로드와 IAP 확인. | AI 기능 구독, 크레딧/사용량 제한, 프리미엄 기능 | Moises 공식 FAQ, Google Play/App Store. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| Songsterr | 무료 playback+Plus 구독. App Store US $9.99/month. Android 과거 one-time premium과 웹/iOS 구독 분리 이슈 있음. | 구독, 탭/코드 콘텐츠 접근, 프리미엄 플레이어 기능 | App Store, Songsterr Plus/help. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| Ultimate Guitar | 무료 tabs/chords+Premium/Pro 구독. | 광고, Premium/Pro 구독, 탭/코드 콘텐츠, 레슨/커뮤니티 | Google Play, App Store, help. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| Perfect Ear | 무료+Premium IAP. App Store US Premium $14.99, Canada $19.99. | 무료 배포 후 Premium 기능 unlock/IAP | App Store, Google Play. 확인일 2026-08-16 | 한국어 미지원 |
| Complete Ear Trainer | 무료 첫 챕터+5.99EUR/$6.99 lifetime unlock. | 무료 체험 후 일회성 lifetime unlock | 공식 사이트. 확인일 2026-08-16 | 11개 언어, 한국어 미지원 |
| EarMaster | 무료 시작+모듈 IAP. App Store: Beginner Course $7.99, General/Jazz/Vocal bundles $14.99 등. Desktop/Cloud 구독 별도. | 코스/모듈 IAP, desktop/cloud 구독, 교육기관 라이선스 | App Store, Google Play. 확인일 2026-08-16 | 한국어 미지원 |
| Tenuto | iOS 유료 다운로드, 보조 출처 $4.99. Android 없음. | 유료 앱 | musictheory.net, 보조 리뷰/App Store mirror. 확인일 2026-08-16 | 한국어 미지원으로 판단 |
| Modacity | 14일 trial. Free 제한 후 Premium $12.99/month 또는 $129/year, 공식 웹 PayPal 연 $143.88 표기. | 연습 기록/분석 구독 | App Store/Google Play, Modacity 공식. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| BandHelper | 구독 SaaS. Solo $2.25/month 또는 $16/year부터, 사용자 수/기능별 상승. 앱 내 결제는 더 비쌀 수 있음. | B2B/팀 운영 SaaS, 사용자 수/기능별 구독 | BandHelper 공식 pricing. 확인일 2026-08-16 | 한국어 미지원 |
| Practice Pro | iOS 유료 다운로드. 출시 소개 기준 $0.99 introductory, 향후 $9.99 예정. | 유료 앱 | Verge/RouteNote, App Store. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| StaffPad | App Store US $49.99+IAP sound libraries. Android 없음. | 프리미엄 유료 앱, 사운드 라이브러리 IAP | App Store, StaffPad 공식. 확인일 2026-08-16 | EN + 13 More, 한국어 공식 확인 불가 |
| Dorico for iPad | 무료 1-2 players, 구독 $3.99/month 또는 $39.99/year, lifetime $119.99 보조 출처. | freemium, 구독, lifetime unlock, desktop 제품 생태계 | Steinberg, Dorico blog/Scoring Notes. 확인일 2026-08-16 | 공식 사이트 언어 선택에 한국어 없음 |
| Notion/Fender Notion | 무료 기본 사보+IAP/추가 기능 가능. | 무료 사보 앱, IAP/추가 기능, Fender/PreSonus 생태계 | Fender Notion, App Store/Google Play. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| Flat | 무료+Flat Power. 한국 App Store: Monthly 12,500원, Yearly 39,000원/64,000원, PDF credits 17,000원. | 구독, PDF credit/IAP, 교육/협업 클라우드 | App Store KR, Google Play. 확인일 2026-08-16 | 한국어 지원 |
| BandLab | 무료 DAW+Membership/Distribution/AI/platform perks. | 무료 플랫폼, 멤버십, 배포/크리에이터 서비스, AI/부가 기능 | Google Play, BandLab 공식/보조 출처. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| Dolby On | 무료 녹음/자동 보정. | 무료 브랜드/생태계 유입, Dolby 기술 홍보 | Google Play, App Store. 확인일 2026-08-16 | 한국어 공식 확인 불가 |
| GarageBand | Apple 생태계 무료. | Apple 기기 생태계 강화, 무료 번들 앱 | App Store/Apple. 확인일 2026-08-16 | 한국어 지원 |

## 카테고리별 사용자 문제

### 박자와 루틴

메트로놈 앱은 이미 많고 기본 기능은 무료가 많다. 유료화는 setlist, practice tracking, mute beat trainer, advanced polyrhythm, MIDI/Ableton Link, hardware sync 쪽으로 간다. in C가 단순 메트로놈을 만들면 차별화가 약하다. 대신 “오늘 리허설 순서대로 8분/12분/쉬는 시간/다시 5분”처럼 맥락화된 루틴 도구가 더 낫다.

### 조율과 드론

튜너는 반복 사용이 강하지만 마이크 입력, 피치 검출 정확도, 악기별 반응성, 소음 환경 문제가 있다. TonalEnergy, Pano Tuner, GuitarTuna처럼 강한 앱이 많다. in C의 첫 앱으로는 피해야 한다. 다만 마이크 없는 기준음/드론/튜닝 체크리스트는 작게 가능하다.

### 악보와 세트리스트

forScore, Newzik, MobileSheets, OnSong은 강력하지만 PDF 저장, 주석, 저작권 악보, 클라우드 동기화, 페이지 넘김, 페달, 기관 협업으로 범위가 커진다. 무료 웹도구로는 악보 파일을 저장하지 않고 “프로그램 순서표”, “연습 순서표”, “페이지 넘김 체크리스트”, “공연 당일 준비 카드”를 만드는 쪽이 안전하다.

### 코드/반주/느린 연습

iReal Pro는 코드 진행+반주를 유료 일회성으로 잘 묶었고, Anytune/Moises는 음원 조작을 연습 효용으로 판다. 이 영역은 저작권 있는 음원/차트/탭을 다루기 쉽다. in C는 콘텐츠를 저장하거나 변환하지 않고 루프 연습 계획, 템포 단계표, 조옮김 메모 정도로 시작해야 한다.

### 청음/시창/이론

Perfect Ear, Complete Ear Trainer, EarMaster, Tenuto는 한국어 미지원이 많다. 기능적으로는 intervals, chords, scales, rhythm, solfege, sight reading이 공통이다. 한국어로 낮은 위압감의 “오늘 5문제”, “소리의 윤곽 듣기”, “방금 소리가 올라갔나요?” 같은 입문 도구는 차별점이 있다.

### 연습 기록/레슨 운영

Modacity, Andante, Instrumentive, Practis류는 연습 시간을 기록하고 다음 행동을 남긴다. 구독형이 많지만 실제 첫 MVP는 매우 작다. “오늘 무엇을 했고 다음엔 무엇을 할지”를 한 장 카드로 남기는 웹도구가 가능하다.

### 작곡/사보

StaffPad, Dorico, Notion, Flat은 전문 도구로 바로 따라가면 Chromatics와 충돌한다. in C가 여기서 가져올 수 있는 것은 사보 기능 자체가 아니라 “아이디어를 음악적으로 이름 붙이는 작은 카드”다.

## 앱별 상세 요약과 in C 관점

### TonalEnergy

- 기능: 튜너, 메트로놈, 드론/톤 generator, 녹음, 분석, 악기별 tuning page.
- 가격/BM: iOS 유료 다운로드, Android는 유료/구독 노출 혼재. 교육기관용 TE for Education도 있음.
- 참고할 점: 하나의 연습 세션 안에서 조율, 박자, 드론, 녹음이 연결된다.
- 따라 하면 안 되는 점: 피치 분석 정확도와 악기별 튜너 깊이를 그대로 경쟁하려 하면 안 된다.
- in C 후보: 마이크 없는 “오늘 기준음 드론+연습 목표 카드”.

### Soundbrenner

- 기능: 메트로놈, practice tracker, setlist, MIDI/Ableton Link, wearable vibration.
- 가격/BM: 무료 기능+Plus 구독+하드웨어 판매.
- 참고할 점: 앱이 하드웨어와 결합되며 반복 사용/브랜드 접점을 만든다.
- 따라 하면 안 되는 점: 범용 메트로놈 자체와 하드웨어 동기화 경쟁.
- in C 후보: “리허설 타이머+다음 곡 알림” 웹도구.

### Pro Metronome / PolyNome / Tempo

- 기능: 고정밀 metronome, polyrhythm, setlist, mute beat, voice count, stage mode.
- 가격/BM: 무료+IAP 또는 유료 앱+프리미엄. PolyNome은 고급 유료+Premium.
- 참고할 점: 메트로놈의 유료화는 단순 클릭보다 연습 패턴/공연 setlist에서 나온다.
- 따라 하면 안 되는 점: 고급 리듬 엔진과 드러머용 복잡한 polyrhythm.
- in C 후보: “쉬는 마디를 포함한 박자 감각 훈련” 또는 “3분 루틴”.

### GuitarTuna / Fender Tune / Pano Tuner / Cleartune

- 기능: 악기 튜너, 코드/탭/교육 리소스, 광고 제거, 프리미엄 레슨.
- 가격/BM: 무료+광고/IAP/구독, 또는 유료 다운로드.
- 참고할 점: 한국어 지원이 있는 튜너는 진입장벽이 낮다.
- 따라 하면 안 되는 점: 마이크 pitch detection 첫 앱화.
- in C 후보: 조율 앱이 아니라 “오케스트라 리허설 전 A 기준음/드론 페이지”.

### forScore / Newzik / MobileSheets / OnSong

- 기능: PDF 악보 뷰어, annotation, setlist, page turn, cloud sync, 협업, lyrics/chords.
- 가격/BM: 유료 다운로드, 구독, cloud storage, institution/group licensing.
- 참고할 점: 악보 앱의 반복 사용은 “자료를 찾고 정리하고 공연 순서대로 보는 것”에서 나온다.
- 따라 하면 안 되는 점: 저작권 악보 저장/뷰어/주석/페달 전체.
- in C 후보: 파일 저장 없는 “프로그램 순서표 공유 링크”, “연주 당일 체크리스트”.

### MuseScore / Ultimate Guitar / Songsterr

- 기능: 악보/탭/코드 콘텐츠 플랫폼, playback, transpose, print/download, official tabs.
- 가격/BM: 콘텐츠 접근/다운로드/프리미엄 기능 구독, 광고, marketplace.
- 참고할 점: 콘텐츠 라이브러리는 강력한 유입 자산이다.
- 따라 하면 안 되는 점: 저작권 있는 악보/탭/가사 라이브러리.
- in C 후보: public-domain 곡만 대상으로 “한 줄 듣기 질문 카드”.

### iReal Pro

- 기능: 코드 차트, 자동 반주, transpose, tempo, playlist, 교육/세션 활용.
- 가격/BM: 일회성 구매+style pack IAP, no subscription.
- 참고할 점: “반주가 있는 코드 차트”는 반복 연습에서 강력하다.
- 따라 하면 안 되는 점: iReal 포맷/커뮤니티 차트/상업곡 코드 라이브러리 복제.
- in C 후보: 저작권 없는 진행 또는 사용자가 직접 입력한 “코드 진행 연습 타이머”.

### Anytune / Moises

- 기능: 느리게 듣기, pitch shift, loop, stem separation, smart metronome, lyric/chord detection.
- 가격/BM: 무료 core+광고/구독/AI 크레딧/일회성 Pro.
- 참고할 점: 연습자는 “전체 곡”보다 “어려운 구간 반복”을 원한다.
- 따라 하면 안 되는 점: 음원 업로드/분리/저장. 저작권과 서버 비용이 크다.
- in C 후보: “어려운 구간 루프 계획표”처럼 파일을 받지 않는 도구.

### Perfect Ear / Complete Ear Trainer / EarMaster / Tenuto

- 기능: interval, chord, scale, rhythm, sight reading, solfege, melodic dictation.
- 가격/BM: 무료 일부+일회성 unlock/IAP/교육기관/구독.
- 참고할 점: 한국어 미지원이 많고, 용어/UX가 초보자에게 딱딱하다.
- 따라 하면 안 되는 점: 수백 문제 bank와 게임 시스템을 한 번에 만들기.
- in C 후보: “Contour: 선율 윤곽 5문제”, “계이름이 아니라 올라감/내려감 먼저 듣기”.

### Modacity / BandHelper / Practice Pro / Andante

- 기능: 연습 루틴, practice log, notes/recording, setlist, gig schedule, stage plots.
- 가격/BM: 구독 SaaS 또는 유료 앱.
- 참고할 점: 음악가의 반복 불편은 연습실보다 “다음에 뭘 해야 하는지 기억하는 것”에도 있다.
- 따라 하면 안 되는 점: 팀 운영 SaaS 전체, 파일/채팅/결제/권한 관리.
- in C 후보: “오늘 연습 3줄 회고”, “다음 리허설 준비 카드”.

### StaffPad / Dorico / Notion / Flat

- 기능: 작곡/사보/재생/공유.
- 가격/BM: 프리미엄 유료 앱, 무료+IAP, 구독/클라우드.
- 참고할 점: 입력보다 “아이디어를 잃지 않는 것”이 작은 도구화 가능.
- 따라 하면 안 되는 점: 사보 엔진, 필기 인식, MusicXML 복잡도.
- in C 후보: “악상 메모 카드”, “리듬/동기 스케치 텍스트화”.

### BandLab / GarageBand / Dolby On

- 기능: 무료 녹음/DAW/협업/자동 보정.
- 가격/BM: 무료 생태계, 멤버십, distribution, platform perks.
- 참고할 점: 무료로 강력한 기능을 주고 생태계/유입을 만든다.
- 따라 하면 안 되는 점: DAW, 오디오 편집, 클라우드 협업 전체.
- in C 후보: 녹음 자체가 아니라 “리허설 녹음 후 무엇을 확인할지 체크리스트”.

## in C식 무료 웹도구 재해석 후보

| 후보 | 원형 앱/문제 | 첫 MVP | 난이도 | 리스크 | 배너/유입 자연스러움 |
| --- | --- | --- | --- | --- | --- |
| 연습 루틴 타이머 | Soundbrenner, Practice Pro, Modacity | 제목, 구간명, 분 단위, 쉬는 시간, 시작/다음 버튼 | 낮음 | 낮음 | 높음 |
| 리허설 런시트 | BandHelper, OnSong, forScore | 곡/구간/메모/시간을 입력해 한 페이지 진행표 생성 | 낮음 | 낮음 | 높음 |
| 선율 Contour 청음 | Perfect Ear, Complete Ear Trainer | 3-5음 멜로디 듣고 상승/하강/산/골짜기 선택 | 낮음~중간 | 낮음 | 중간~높음 |
| 오늘의 계이름/음정 5문제 | Tenuto, EarMaster | Web Audio로 문제 생성, 점수와 오답 표시 | 낮음~중간 | 낮음 | 중간 |
| 기준음/드론 페이지 | TonalEnergy, tuner apps | A=440/442, C/G/D 등 지속음 재생 | 낮음 | 낮음 | 중간 |
| 템포 단계표 | Anytune, iReal Pro, metronome apps | 시작 BPM, 목표 BPM, 증가폭으로 연습 단계 생성 | 낮음 | 낮음 | 높음 |
| 프로그램 순서표 공유 | forScore, Newzik, MobileSheets | 곡명/작곡가/연주자/소요시간 입력 후 공유 가능한 HTML | 낮음 | 중간, 개인정보/저작권 주의 | 높음 |
| 연습 후 3줄 회고 | Modacity, Andante | 오늘 한 것/막힌 것/다음 행동 저장 없이 복사 | 낮음 | 낮음 | 높음 |
| 레슨 숙제 카드 | Practice Space류, Better Practice | 선생님/학생이 다음 주 과제를 한 장으로 정리 | 낮음 | 중간, 학생 개인정보 주의 | 높음 |
| 조옮김 메모 카드 | iReal Pro, Anytune | 원키/목표키/악기 조옮김 관계 표시 | 낮음 | 낮음 | 중간 |
| 공연 당일 체크리스트 | BandHelper, OnSong | 악보/의상/스탠드/페달/홍보링크 체크 | 낮음 | 낮음 | 매우 높음 |
| 저작권 없는 한 줄 듣기 질문 | MuseScore/public domain 맥락 | in C가 준비한 public-domain 선율 1개와 질문 1개 | 중간 | 저작권 검토 필요 | 높음 |

## P0/P1/P2 우선순위

### P0: 즉시 실험

1. **연습 루틴 타이머**
   - 이유: 구현이 가장 쉽고, 음악가의 반복 사용과 in C 배너 노출이 자연스럽다.
   - 첫 버전: 루틴 이름, 구간 3개, 각 구간 시간, 큰 시작/다음 버튼, 완료 후 피드백 링크.

2. **리허설 런시트/연습 순서표**
   - 이유: BandHelper/OnSong/forScore의 무거운 팀 운영 기능을 파일 저장 없이 작게 가져올 수 있다.
   - 첫 버전: 곡/구간/소요시간/메모 입력 후 한 화면 진행표. 링크 공유는 나중에.

3. **선율 Contour 청음**
   - 이유: 한국어 UX 빈틈이 크고 in C의 “몰라도 솔직하게 듣기” 철학과 잘 맞는다.
   - 첫 버전: Web Audio로 4개 유형만 출제. 음정 이름 대신 모양을 고르게 한다.

4. **공연 당일 체크리스트**
   - 이유: 공연 홍보 랜딩과 가장 직접적으로 연결된다.
   - 첫 버전: 클래식 연주회 준비 체크 기본 템플릿+개별 항목 추가+복사.

### P1: 검증 후 확장

1. **기준음/드론 페이지**
   - 튜너 대신 안전한 기준음 도구. Web Audio로 가능하지만 소리 품질/모바일 autoplay를 확인해야 한다.

2. **템포 단계표/루프 계획표**
   - Anytune/Moises의 파일 조작 없이 연습 계획만 제공. 초반 효용은 명확하지만 습관화가 관건이다.

3. **프로그램 순서표 공유**
   - 공연 홍보와 직접 연결되지만 외부 공유와 개인정보 노출 범위 설계가 필요하다.

4. **연습 후 3줄 회고**
   - 구현은 쉽지만 사용자가 스스로 반복 입력할 동기가 약할 수 있다.

5. **레슨 숙제 카드**
   - 음악 교육 시장에 잘 맞지만 미성년자/교사/학생 개인정보와 공유 범위가 중요하다.

### P2: 보류

1. **마이크 기반 튜너**
   - 경쟁 강함. 정확도와 악기별 반응성 요구가 높다.

2. **PDF 악보 뷰어/페이지 넘김**
   - forScore/MobileSheets/Newzik와 직접 경쟁. 파일 저장, 주석, 페달, 저작권 문제가 커진다.

3. **음원 느리게 듣기/AI stem 분리**
   - Anytune/Moises와 경쟁. 저작권, 서버 비용, 브라우저 파일 처리 리스크가 크다.

4. **악보/탭/코드 라이브러리**
   - MuseScore/Songsterr/Ultimate Guitar 영역. 권리와 콘텐츠 운영이 핵심이라 MVP가 커진다.

5. **사보/작곡 에디터**
   - StaffPad/Dorico/Flat/Notion 영역. Chromatics와도 충돌한다.

## 첫 3개 추천 후보

### 1. 연습 루틴 타이머

가장 먼저 만들기 좋다. “메트로놈”이 아니라 “오늘 연습을 어떻게 나눌지”에 집중하면 차별화가 생긴다. 예를 들어 `스케일 8분 -> 문제 구간 12분 -> 쉬기 3분 -> 처음부터 5분`을 큰 버튼으로 넘기는 도구다.

- 예상 구현: 하루
- 저장: 없음 또는 URL hash/localStorage
- in C 배너: “이런 작은 음악 도구를 더 만들어보고 있습니다”
- 검증 지표: 시작 클릭, 완료 클릭, 재방문, 피드백

### 2. 리허설 런시트/연습 순서표

BandHelper나 OnSong처럼 팀 운영 전체로 가지 않고, 리허설 당일 필요한 순서와 시간을 한 장으로 정리한다. 클래식 합주, 실내악, 합창, 발표회 준비에 바로 쓸 수 있다.

- 예상 구현: 하루~이틀
- 저장: 처음엔 없음. 복사/인쇄 중심.
- in C 배너: “연주회 준비와 홍보도 같이 정리해볼까요?”
- 검증 지표: 항목 추가 수, 인쇄/복사 클릭, 공유 요청

### 3. 선율 Contour 청음

한국어 UX가 빈틈이고 in C답다. 정답주의 청음이 아니라 “소리의 모양 알아차리기”로 시작한다. 앱 이름도 `in C Contour`가 가능하다.

- 예상 구현: 이틀~사흘
- 저장: 점수만 세션 내 표시
- in C 배너: “클래식을 잘 듣는 척보다, 들은 것을 자기 말로 말하는 연습”
- 검증 지표: 문제 완료율, 재시도율, 공유/피드백

## 한국어 UX/국내 클래식 사용자 관점의 기회

1. 청음/이론 앱은 한국어 미지원이 많다.
   - Perfect Ear, Complete Ear Trainer, EarMaster, Tenuto 모두 한국어가 공식 지원 목록에 없거나 확인되지 않는다.
   - 한국어로 “장3도”, “완전5도” 이전에 “올라갔다/내려갔다/멈췄다” 같은 언어를 제공할 수 있다.

2. 악보 앱은 강력하지만 “공연 준비 말”은 비어 있다.
   - forScore/Newzik/MobileSheets는 악보 보관과 공연 사용에 강하다.
   - in C는 악보 자체보다 `이 연주를 어떻게 준비하고 누구에게 말할지`를 정리하는 도구로 차별화할 수 있다.

3. 구독 피로가 크다.
   - 메트로놈/연습/악보/AI 앱들이 월/연 구독으로 이동하고 있다.
   - in C의 무료, 광고 없음, 공개 웹도구 포지션은 작지만 신뢰를 만들 수 있다.

4. 클래식 전용 맥락은 아직 약하다.
   - 많은 앱이 기타/팝/밴드 중심이다.
   - 클래식 연주자에게 필요한 “리허설 순서”, “공연 당일 준비”, “프로그램 말하기”, “청음 압박 낮추기”는 별도 기회다.

## 피해야 할 복제/리스크

- 기존 앱의 UI, 아이콘, 카피, paywall 구조를 복제하지 않는다.
- 저작권 있는 악보, 탭, 가사, 반주, 음원을 저장하거나 제공하지 않는다.
- 마이크 권한, 파일 업로드, 계정 저장은 첫 P0에서 제외한다.
- “무료로 앱 제작”을 개인 납품처럼 보이게 만들지 않는다. 모든 결과물은 무료 공개 웹도구라는 원칙을 유지한다.
- metronome/tuner처럼 경쟁이 강한 기능은 맥락 없는 범용 도구로 만들지 않는다.
- 미성년자 레슨/숙제 도구는 개인정보와 공유 범위를 별도로 검토하기 전까지 단순 복사형으로 제한한다.

## 이후 구현 이슈로 쪼갤 수 있는 작업 목록

1. `in C Tools` 정보 구조 정의
   - `/tools/` 또는 `tools.html` 허브
   - 각 도구 공통 헤더/푸터/배너

2. 연습 루틴 타이머 MVP
   - 구간 추가/삭제
   - 큰 현재 구간 표시
   - 시작/일시정지/다음/완료
   - 완료 후 피드백 CTA

3. 리허설 런시트 MVP
   - 곡/구간/시간/메모 입력
   - 총 시간 계산
   - 인쇄/복사
   - 기본 템플릿 2개: 실내악, 합창

4. in C Contour MVP
   - Web Audio oscillator
   - 네 가지 contour 유형
   - 5문제 세션
   - 오답 설명 문구

5. 공연 당일 체크리스트 MVP
   - 악보/의상/보면대/페달/리허설콜/홍보링크 기본 항목
   - 항목 추가
   - 복사/인쇄

6. 무료 도구 제안 폼 운영 루프
   - 제안 분류: practice, lesson, rehearsal, performance, promotion
   - P0 후보와 연결
   - 제안자에게 “선정/보류/추가 질문” 상태를 남기는 관리자 메모

7. 지표 정의
   - 도구별 page view
   - start/complete/copy/print/share
   - in C 배너 클릭
   - 도구 제안 폼 전환

## 주요 출처

- TonalEnergy Google Play listing: https://play.google.com/store/apps/details?id=com.sonosaurus.tonalenergytuner
- TonalEnergy 공식 사이트: https://www.tonalenergy.com/te-mobile
- Soundbrenner Google Play listing: https://play.google.com/store/apps/details?id=com.soundbrenner.pulse
- Soundbrenner 공식 스토어: https://www.soundbrenner.com/
- Pro Metronome 공식 사이트: https://eumlab.com/pro-metronome/
- PolyNome App Store listing: https://apps.apple.com/us/app/polynome-the-metronome/id488165644
- forScore 구매 안내: https://forscore.co/kb/how-to-buy/
- forScore Pro: https://forscore.co/pro/
- Newzik 공식 가격: https://newzik.com/en
- MobileSheets 공식 사이트: https://www.zubersoft.com/mobilesheets/
- MobileSheets 구매 안내: https://www.zubersoft.com/mobilesheets/buy/
- OnSong 가격 안내: https://onsongapp.zendesk.com/hc/en-us/articles/360043713513-How-much-does-OnSong-cost
- BandHelper 가격: https://www.bandhelper.com/main/pricing.html
- iReal Pro 공식 사이트: https://www.irealpro.com/
- iReal Pro App Store listing: https://apps.apple.com/us/app/ireal-pro/id298206806
- Anytune Google Play listing: https://play.google.com/store/apps/details?id=app.anytune.musicplayer
- Anytune Android 구독 안내: https://anytune.zendesk.com/hc/en-us/articles/4417991633677-Anytune-Pro-on-Android-Subscribe
- Moises 공식 FAQ: https://moises.ai/
- Moises Google Play listing: https://play.google.com/store/apps/details?id=ai.moises
- GuitarTuna Google Play listing: https://play.google.com/store/apps/details?id=com.ovelin.guitartuna
- GuitarTuna App Store listing: https://apps.apple.com/us/app/guitartuna-tune-play-guitar/id527588389
- Fender Tune Google Play listing: https://play.google.com/store/apps/details?id=com.fender.tuner
- Pano Tuner Google Play listing: https://play.google.com/store/apps/details?id=com.soundlim.panotuner
- Cleartune App Store listing: https://apps.apple.com/us/app/cleartune/id286799607
- MuseScore Google Play listing: https://play.google.com/store/apps/details?id=com.musescore.playerlite
- MuseScore mobile apps: https://musescore.com/apps
- Ultimate Guitar Google Play listing: https://play.google.com/store/apps/details?id=com.ultimateguitar.tabs
- Ultimate Guitar App Store listing: https://apps.apple.com/us/app/ultimate-guitar-chords-tabs/id357828853
- Songsterr App Store listing: https://apps.apple.com/us/app/songsterr-tabs-chords/id399211291
- Songsterr Plus: https://www.songsterr.com/plus
- Perfect Ear Google Play listing: https://play.google.com/store/apps/details?id=com.evilduck.musiciankit
- Perfect Ear App Store listing: https://apps.apple.com/us/app/perfect-ear-music-rhythm/id1440768353
- Complete Ear Trainer 공식 사이트: https://completeeartrainer.com/
- EarMaster App Store listing: https://apps.apple.com/us/app/earmaster-music-theory/id1105030163
- EarMaster Google Play listing: https://play.google.com/store/apps/details?id=com.earmaster.android
- Tenuto 공식 사이트: https://www.musictheory.net/products/tenuto
- Modacity App Store listing: https://apps.apple.com/us/app/modacity-pro-music-practice/id1351617981
- Modacity 구독 안내: https://www.modacity.co/subscriptions
- Practice Pro App Store listing: https://apps.apple.com/us/app/practice-pro-metronome-tuner/id1615430454
- StaffPad App Store listing: https://apps.apple.com/us/app/staffpad/id1442074103
- StaffPad 공식 사이트: https://www.staffpad.net/
- Dorico for iPad 공식 사이트: https://www.steinberg.net/dorico/ipad/
- Dorico 가격 참고: https://blog.dorico.com/2022/06/dorico-for-ipad-2-3-introduces-one-off-purchase-lifetime-unlock-option/
- Fender Notion: https://www.fender.com/pages/fender-notion
- Flat App Store KR listing: https://apps.apple.com/kr/app/flat-music-score-tab-editor/id1177592149
- Flat Google Play listing: https://play.google.com/store/apps/details?id=com.tutteo.flat
- BandLab Google Play listing: https://play.google.com/store/apps/details?id=com.bandlab.bandlab
- BandLab 공식 사이트: https://www.bandlab.com/
- Dolby On Google Play listing: https://play.google.com/store/apps/details?id=com.dolby.dolby234
- Dolby On App Store listing: https://apps.apple.com/us/app/dolby-on-record-audio-video/id1443964192
- GarageBand App Store listing: https://apps.apple.com/us/app/garageband/id408709785
