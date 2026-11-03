# BWV 565 실제 Studio 출력 검토

2026-10-30. 문제: 소개 페이지가 외부 조판을 Studio처럼 보이는 프레임 안에 표시했고, 실제 Studio에는 도입부 장식음 손실과 다중 보표 정렬 문제가 있었다.

범위는 첫 마디를 가져오기·저장·화면/PDF로 출력하고 그 실제 결과를 소개 페이지에 사용하는 것이다. 전곡 입력, 음악가의 장식음 연주 해석, 플랫폼 배포·버전 변경은 포함하지 않는다. 기존 진행 중 변경은 보존한다.

| 확인 항목 | 근거 | 결과 |
| --- | --- | --- |
| 프랄트릴러를 버리지 않고 XML과 프로젝트로 왕복 | `src/musicxml/bwv565-opening.test.ts`, 네이티브 캡처 저장 프로젝트 | PASS |
| 전용 글꼴과 올바른 세로선 없는 기호 | 공통 `ornament-glyphs.ts`, 화면/PDF의 E56C·Bravura 검증 | PASS |
| 두 번째 보표의 장식음·페르마타도 출력 | 화면/PDF 각각 장식기호 3개·페르마타 6개 | PASS |
| 같은 박자의 음을 보표 간 정렬 | 가사/코드 없는 실제 샘플의 동일 tick x 차이 1px 미만 | PASS |
| 장식음 위에 페르마타 여백 확보 | 화면/PDF의 실제 글리프 잉크 측정, 최소 약6px | PASS |
| 외부 악보 대신 실제 결과를 소개 | 원본 캡처 PNG, 실제 PDF의 SVG 변환, 사이트 출처·설명 갱신 | PASS |

MusicXML의 `inverted-mordent`는 세로선이 없는 기호다. [W3C MusicXML 4.0](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/inverted-mordent/)에 따라 SMuFL `ornamentShortTrill`로 대응한다. 기존 `mordent`와 서로 바꾸지 않는다. 장식음 팔레트에서도 같은 기호를 사용하고 적용·해제·실행 취소·입력 맥락 보존을 검증한다.

이전 미지원 경고 fixture는 이제 지원하는 `inverted-mordent` 대신 여전히 미지원인 `schleifer`로 바꿨다. 미지원 경고의 수와 보존 검증을 없애지 않았다.

검증 명령과 촬영 재현 방법은 [샘플 안내](README.md)를 따른다. 웹 미리보기에는 현재 개발 빌드의 화면이라는 안내를 유지한다. 외부 원전과 Studio의 지면 배치·줄바꿈까지 같다고 주장하지 않는다.

## 실행 결과

- `npm run build`, `npm run typecheck`: PASS.
- `App.properties.test.tsx` + `App.notation-exchange.test.tsx`: 314 PASS. 새 네 번째 장식음 버튼의 적용·해제·실행 취소 및 비활성 범위를 포함한다.
- BWV 565/XML 경고 fixture·공통 리듬 정렬·보표 잉크·페르마타·슬러 관련 6개 파일: 52 PASS. 별도 MusicXML 기존 테스트와 프로젝트 스키마 테스트도 PASS.
- 오프라인 MusicXML 4.0 XSD(`XML_CATALOG_FILES` 사용): 입력 파일 PASS.
- `capture-ddirori-studio-brand.cjs`: 실제 화면·저장·PDF 검증 PASS. 직전 메뉴 프레임이 찍히지 않도록 새 네이티브 프레임 표시를 기다린다.
- 소개 사이트: 16 표시 조합·114 동작 검사 PASS. 사이트 빌드·기존 콘텐츠/SEO 검사 PASS.
- GitHub CI와 새 설치 파일 배포는 실행하지 않았다. 위 결과는 로컬 개발 빌드와 기존 비공개 Sites 미리보기 범위다.
