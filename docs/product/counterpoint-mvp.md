# Counterpoint MVP

Counterpoint는 PDF와 이미지 악보를 편집 가능한 MusicXML 초안으로 변환하는
독립 웹앱 프로토타입이다. 장기적으로는 Chromatics의 `Import PDF/Image` 흐름과
연결하거나 Chromatics 내부 기능으로 흡수할 수 있게 한다.

## MVP 범위

- 입력: PDF, JPG, PNG
- 출력: `.musicxml` 또는 Audiveris가 생성한 `.mxl`/`.musicxml`
- 상태: `queued`, `processing`, `complete`, `failed`
- 결과 리포트: `pages`, `engine`, `warnings`, `output filename`, `mode`
- 기본 모드: mock MusicXML 생성
- 선택 모드: `AUDIVERIS_BIN` 환경 변수가 있을 때 Audiveris CLI 실행

Counterpoint의 결과는 최종 악보가 아니라 편집 가능한 초안이다. 사용자는 원본
악보와 변환 결과를 대조하고, Chromatics나 다른 MusicXML 호환 편집기에서 검수해야
한다.

## 실행 방법

로컬 서버를 실행한다.

```bash
node tools/counterpoint-server.mjs
```

브라우저에서 연다.

```text
http://127.0.0.1:4174/counterpoint.html
```

기본 포트를 바꾸려면 `COUNTERPOINT_PORT`를 설정한다.

```bash
COUNTERPOINT_PORT=4180 node tools/counterpoint-server.mjs
```

업로드와 결과 파일은 `.tmp/counterpoint/` 아래에 저장된다. 이 폴더는 개발용 임시
작업 공간이며 장기 저장소가 아니다.

## API 개요

```text
POST /api/counterpoint/jobs
GET /api/counterpoint/jobs/:id
GET /api/counterpoint/jobs/:id/download
```

현재 `POST /api/counterpoint/jobs`는 프로토타입 단순화를 위해 JSON/base64 본문을
받는다.

```json
{
  "filename": "score.pdf",
  "mimeType": "application/pdf",
  "dataBase64": "..."
}
```

## Mock Mode

`AUDIVERIS_BIN`이 없으면 서버는 실제 OMR을 수행하지 않고 mock MusicXML을 생성한다.
이 모드는 업로드, job polling, 다운로드, 결과 리포트 UI를 검증하기 위한 것이다.

mock 결과에는 원본 파일명과 SHA-256 checksum이 MusicXML metadata로 들어간다.

## Audiveris 연동

Audiveris CLI가 설치되어 있으면 다음처럼 실행한다.

```bash
AUDIVERIS_BIN=/path/to/audiveris node tools/counterpoint-server.mjs
```

서버는 다음 형태로 Audiveris를 호출한다.

```text
AUDIVERIS_BIN -batch -export -output <job-output-dir> <input-file>
```

Audiveris가 `.mxl`, `.musicxml`, `.xml` 결과를 만들면 그 파일을 다운로드 대상으로
사용한다. 결과가 없거나 CLI가 실패하면 job은 `failed`가 된다.

Audiveris는 AGPL-3.0 라이선스의 오픈소스 OMR 엔진이다. 제품 배포, 서버 운영,
앱 내장 전에는 라이선스 의무와 배포 구조를 별도로 검토해야 한다.

## 제한사항

- 현재는 multipart form upload가 아니라 JSON/base64 upload를 사용한다.
- mock mode는 실제 OMR 품질을 대표하지 않는다.
- Audiveris 출력 위치와 확장자는 설치 버전에 따라 다를 수 있어 추가 검증이 필요하다.
- 변환 결과의 마디/리듬 오류 검출은 아직 `src/musicxml` 검증 파이프라인과 연결되지 않았다.
- Chromatics에서 바로 열기 버튼은 UI 자리만 있고 비활성 상태다.

## Chromatics 연동 계획

1. Counterpoint 결과를 `src/musicxml` parser로 읽어 score model 검증을 수행한다.
2. 리듬 합 불일치, unsupported direction, 성부 누락 후보를 리포트에 추가한다.
3. Counterpoint 결과 화면에 `Open in Chromatics` deep link 또는 파일 전달 흐름을 붙인다.
4. Chromatics의 `File > Import PDF/Image...`에서 같은 local API 또는 engine adapter를 호출한다.
5. 안정화 후 local engine pack, cloud worker, 자체 OMR adapter를 같은 인터페이스로 교체 가능하게 한다.
