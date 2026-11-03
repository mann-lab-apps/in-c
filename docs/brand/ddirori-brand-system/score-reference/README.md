# 브랜드용 악보 기준

2026-10-30 사용자 결정. **브랜딩에서 악보를 보여줄 때는 항상 J. S. Bach 「토카타와 푸가 d단조」 BWV 565 도입부를 사용한다.** 띠로리 음형이 나오는 구간을 포함하고, 제목만 적고 다른 음악을 넣지 않는다.

- 대상: 소개 페이지, 배너, 스토어 이미지, 브랜드 목업, 홍보용 제품 캡처와 디자인 시스템의 대표 악보 예시.
- 도입 음형이 잘리지 않게 자른다. 제목·작곡가·BWV 번호는 지면 또는 함께 제공하는 설명에 표시한다.
- 브랜드 심벌은 기존 승인 원본의 높음–낮음–높음, **64·64·점32**, 점·연결선·기둥을 보존한다. 원전의 장식음 표기와 브랜드 심벌의 펼친 음가 표현은 구분한다. 원전 자체를 심벌과 같게 고쳐서 원본이라고 표시하지 않는다.
- 실제 앱 캡처는 해당 악보를 앱에서 불러와 촬영한다. 앱이 표기를 지원하지 못하면 한계를 기록한다. 악보 영역을 그림으로 덮은 이미지를 실제 앱 캡처로 제시하지 않는다.
- 소개용 악보 그래픽은 앱 캡처와 구분해 표시한다. 임의의 음표를 나열해 원곡 악보처럼 만들지 않는다.
- 제품의 실제 사용자 악보와 음악적 다양성을 검증하는 기능 테스트까지 이 곡으로 제한하지 않는다. 브랜드에 노출할 대표 샘플에 적용하는 규칙이다.

## 기준 자산과 출처

[도입부가 있는 첫 페이지 SVG](bwv565-opening-page.svg)는 [Mutopia BWV 565](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1780)의 [A4 PDF 첫 페이지](https://www.mutopiaproject.org/ftp/BachJS/BWV565/ToccataFugue/ToccataFugue-a4.pdf)를 `pdftocairo -f 1 -l 1 -svg`로 변환했다. 음악 내용과 기호는 수정하지 않았다. PDF 1페이지가 SVG의 고정 지면이며, 글자는 윤곽선으로 포함된다.

원본 식별자: Mutopia-2011/09/11-1780. 원전: Bach-Gesellschaft Ausgabe, 1867. Mutopia는 이 조판을 **Public Domain**으로 명시한다. 현대 편집본이나 다른 연주·녹음의 권리까지 포함하는 근거로 확대하지 않는다.

이 외부 조판 SVG는 대조용 원전이다. **현재 소개 사이트는 아래 실제 Studio 캡처와 Studio PDF 출력물을 사용한다.** 외부 조판을 실제 앱 결과물로 제시하지 않는다. 사이트 자산 출처는 `site/public/ddirori/assets/sources.json`에 남긴다.

## 실제 Studio 샘플과 재촬영

[bwv565-opening.musicxml](bwv565-opening.musicxml)은 위 원전의 첫 마디를 직접 입력한 재현용 샘플이다. 두 번째 음형까지의 Manual 두 보표와 Pedal 한 보표를 포함한다. 원전의 첫 음 장식기호는 `inverted-mordent`로 유지한다. 브랜드 로고처럼 음가를 펼쳐 쓴 판본이 아니다.

같은 높낮이·음가의 첫 오른손 옥타브 두 성부는 하나의 옥타브 화음으로 묶었다. 원전에서 비워 둔 왼손 첫 반 마디는 명시적인 2분쉼표로 표시한다. 줄 나눔·기둥 방향·기호의 자동 배치는 Studio 조판을 따른다. 외부 SVG와 픽셀 단위로 동일한 판본이라고 설명하지 않는다.

```sh
npm run build
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron scripts/capture-ddirori-studio-brand.cjs
pdftocairo -f 1 -l 1 -svg out/ddirori-studio-brand/bwv565-opening-studio.pdf out/ddirori-studio-brand/studio-export-bwv565.svg
```

촬영 스크립트는 격리된 사용자 설정으로 실제 Electron 앱을 실행해 공개 MusicXML 가져오기·프로젝트 저장·PDF 변환 동선을 거친다. 악보 DOM이나 출력 비트맵을 교체하지 않는다. 첫 마디의 기호 수, 64분음표 구간, 같은 박자의 보표 간 가로 정렬, Bravura 장식기호와 페르마타 사이 여백을 확인한다. `capture.json`의 창 크기는 OS가 실제 허용한 크기다.

- [실제 Studio 캡처](captures/studio-bwv565.png)
- [실제 Studio PDF](captures/bwv565-opening-studio.pdf)
- [Studio PDF에서 변환한 SVG](captures/studio-export-bwv565.svg)
- [저장한 프로젝트](captures/bwv565-opening.chromatics)
- [촬영 시각·입력과 결과 해시·렌더러 빌드](captures/capture.json)
- [화면 기호·정렬 검증](captures/screen-ink.json) / [PDF 기호·정렬 검증](captures/print-ink.json)

이번 확인은 첫 마디의 악보 표시·저장·출력에 대한 것이다. BWV 565 전곡 가져오기나 장식음의 실제 연주 재현을 검증한 것으로 확대하지 않는다. 다운로드 페이지의 기존 공개 설치 파일에는 이번 수정이 아직 들어 있지 않다.
