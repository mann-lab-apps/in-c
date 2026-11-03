# 표시 이름과 기술 식별자

| 위치 | 현재 표시/정책 | 유지한 호환 경계 |
| --- | --- | --- |
| productName / 앱 이름 / HTML 초기 제목 / BrowserWindow | 띠로리 Studio | package name `in-c`, 버전0.1.0-alpha.38 |
| 창 제목 | 시작 화면은 앱 이름, 문서는 기존 제목·dirty 별표 + 앱 이름 | 문서 제목·dirty 저장 정책 |
| macOS bundle / executable | 띠로리 Studio, builder 파일명과 CFBundleName은 NFD 일치 | `com.mannlab.inc`, CFBundleDisplayName의 NFC 표기 |
| userData / sessionData | appData 아래 기존 `in-C`를 ready 전에 명시 | 자동 이동·새 저장소 생성 없음 |
| 프로젝트 / bridge | `.chromatics`, native schema와 `window.inC` 유지 | 기존 파일·IPC·자동저장·백업·최근 파일 |
| Windows executable | `in-C.exe` 기술 파일명 유지, 제품 설명은 Studio | appId 기반 설치 식별자·기존 실행 경로 |
| Linux executable / desktopName | `in-c` / `in-c.desktop` 유지, 제품 표시는 Studio | 기존 실행·desktop 식별자 |
| 다운로드 파일명 | `Ddirori-Studio-<version>-<os>-<arch>` | 표시 이름과 ASCII 기술 파일명 분리 |
| 아이콘 | 현재 blue pencil SVG → PNG/ICNS/ICO | 원본 벡터 무변형, 과거/v8 후보·브랜드 manifest 보존 |

실제 macOS UI와 bundle 검사는 캡처·mounted smoke로 확인했다. Windows/Linux는 설정 검사 범위다. 역사적 로그·원본 악보 작곡가·서드파티·호환용 in-C 문자열을 일괄 치환하지 않았다.
