window.FEATURE_STATUS_META = {
  "지원": "현재 앱에서 기본 흐름을 사용할 수 있다.",
  "부분 지원": "동작은 있으나 예외 상황, UX, 자동화, 확장성이 아직 부족하다.",
  "미지원": "아직 사용자 기능으로 제공하지 않는다.",
  "실험": "방향을 검증 중인 기능이나 문서 체계다.",
  "보류": "현재 방향에서는 의도적으로 뒤로 미룬다."
};

window.FEATURE_MAP = [
  {
    id: "score-authoring",
    title: "악보 작성",
    sections: [
      {
        id: "score-setup",
        title: "시작과 악보 설정",
        items: [
          {
            name: "시작화면",
            status: "지원",
            acceptance: ["docs/product/acceptance/start-and-recovery.feature"],
            docs: ["docs/architecture/project-file.md"]
          },
          {
            name: "새 악보 만들기",
            status: "지원",
            acceptance: ["docs/product/acceptance/score-setup.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "제목과 부제목 수정",
            status: "지원",
            acceptance: ["docs/product/acceptance/score-setup.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "박자표 선택",
            status: "지원",
            acceptance: ["docs/product/acceptance/score-setup.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "조표 선택",
            status: "지원",
            acceptance: ["docs/product/acceptance/score-setup.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "생성 후 박자표 변경",
            status: "지원",
            acceptance: ["docs/product/acceptance/score-setup.feature"],
            docs: ["docs/architecture/rhythmic-timeline.md"]
          },
          {
            name: "생성 후 조표 변경",
            status: "지원",
            acceptance: ["docs/product/acceptance/score-setup.feature"],
            docs: ["docs/musicxml-mvp.md"]
          },
          {
            name: "full-measure rest 실제 길이 처리",
            status: "부분 지원",
            acceptance: ["docs/product/acceptance/rest-to-note.feature"],
            docs: ["docs/architecture/rhythmic-timeline.md"]
          }
        ]
      },
      {
        id: "note-input",
        title: "입력",
        items: [
          {
            name: "음가 선택",
            status: "지원",
            acceptance: ["docs/product/acceptance/note-input.feature"],
            docs: ["docs/architecture/note-input-state.md"]
          },
          {
            name: "A-G 음표 입력",
            status: "지원",
            acceptance: ["docs/product/acceptance/note-input.feature"],
            docs: ["docs/architecture/note-input-state.md"]
          },
          {
            name: "선택 음표 음높이 변경",
            status: "지원",
            acceptance: ["docs/product/acceptance/note-input.feature"],
            docs: ["docs/architecture/note-input-state.md"]
          },
          {
            name: "Inspector 선택 이벤트 속성 편집",
            status: "지원",
            acceptance: ["docs/product/acceptance/note-input.feature"],
            docs: ["docs/product/acceptance/note-input.feature"]
          },
          {
            name: "선택 쉼표를 음표로 변환",
            status: "지원",
            acceptance: ["docs/product/acceptance/rest-to-note.feature"],
            docs: ["docs/architecture/note-input-state.md"],
            flow: {
              id: "rest-to-note-flow",
              title: "선택 쉼표를 음표로 변환",
              summary:
                "쉼표가 선택된 상태에서 A-G를 입력하면 선택된 쉼표와 같은 음가의 음표로 바뀐다.",
              steps: [
                {
                  label: "쉼표 선택",
                  note: "편집 대상 이벤트가 rest인지 확인한다."
                },
                {
                  label: "A-G 입력",
                  note: "한글 입력 상태에서도 음이름 입력으로 해석한다."
                },
                {
                  label: "음가 유지",
                  note: "선택된 쉼표의 duration을 새 음표에 그대로 사용한다."
                },
                {
                  label: "음표로 교체",
                  note: "마디 길이는 늘리지 않고 같은 위치의 이벤트만 바꾼다."
                },
                {
                  label: "새 음표 선택",
                  note: "변환된 음표가 계속 선택되어 후속 편집을 이어간다."
                }
              ]
            }
          },
          {
            name: "R 쉼표 입력과 변환",
            status: "지원",
            acceptance: ["docs/product/acceptance/note-input.feature"],
            docs: ["docs/architecture/note-input-state.md"]
          },
          {
            name: "마지막 이벤트 뒤 입력 커서",
            status: "지원",
            acceptance: ["docs/product/acceptance/note-input.feature"],
            docs: ["docs/architecture/note-input-state.md"]
          },
          {
            name: "한글 입력 상태의 핵심 단축키",
            status: "지원",
            acceptance: [
              "docs/product/acceptance/note-input.feature",
              "docs/product/acceptance/rest-to-note.feature"
            ],
            docs: ["docs/brand/korean-product-language.md"]
          }
        ]
      }
    ]
  },
  {
    id: "score-editing",
    title: "악보 편집",
    sections: [
      {
        id: "rhythm-editing",
        title: "리듬 편집",
        items: [
          {
            name: "선택 이벤트 음가 변경",
            status: "지원",
            acceptance: ["docs/product/acceptance/rhythm-duration.feature"],
            docs: ["docs/architecture/rhythm-editing-transactions.md"]
          },
          {
            name: "짧아진 음가의 남은 시간 쉼표 채움",
            status: "지원",
            acceptance: ["docs/product/acceptance/rhythm-duration.feature"],
            docs: ["docs/architecture/rhythm-editing-transactions.md"]
          },
          {
            name: "길어진 음가의 뒤 이벤트 소비",
            status: "지원",
            acceptance: ["docs/product/acceptance/rhythm-duration.feature"],
            docs: ["docs/architecture/rhythm-editing-transactions.md"]
          },
          {
            name: "Backspace 삭제와 앞 이벤트 병합",
            status: "지원",
            acceptance: ["docs/product/acceptance/delete-event.feature"],
            docs: ["docs/architecture/delete-rest-policy.md"]
          },
          {
            name: "첫 이벤트 삭제와 뒤 이벤트 당김",
            status: "지원",
            acceptance: ["docs/product/acceptance/delete-event.feature"],
            docs: ["docs/architecture/delete-rest-policy.md"]
          },
          {
            name: "타이 인접 구간 삭제",
            status: "지원",
            acceptance: ["docs/product/acceptance/delete-event.feature"],
            docs: ["docs/architecture/ties-and-measure-splitting.md"]
          },
          {
            name: "점음표와 겹점음표",
            status: "지원",
            acceptance: ["docs/product/acceptance/augmentation-dots.feature"],
            docs: ["docs/architecture/augmentation-dots.md"]
          },
          {
            name: "셋잇단음표 기본 입력",
            status: "지원",
            acceptance: ["docs/product/acceptance/tuplets.feature"],
            docs: ["docs/architecture/tuplets.md"]
          },
          {
            name: "셋잇단음표 해제와 예외 안내",
            status: "지원",
            acceptance: ["docs/product/acceptance/tuplets.feature"],
            docs: ["docs/architecture/tuplets.md"]
          },
          {
            name: "범위 선택 기반 삭제",
            status: "지원",
            acceptance: ["docs/product/acceptance/range-selection.feature"],
            docs: ["docs/architecture/measure-selection.md"]
          },
          {
            name: "범위 선택 기반 복사·붙여넣기",
            status: "지원",
            acceptance: ["docs/product/acceptance/range-selection.feature"],
            docs: ["docs/architecture/measure-selection.md"]
          },
          {
            name: "범위 선택 기반 쉼표 일괄 변환",
            status: "지원",
            acceptance: ["docs/product/acceptance/range-selection.feature"],
            docs: ["docs/architecture/measure-selection.md"]
          },
          {
            name: "범위 선택 기반 고급 일괄 편집",
            status: "미지원",
            acceptance: ["docs/product/acceptance/range-selection.feature"],
            docs: ["docs/architecture/measure-selection.md"]
          }
        ]
      },
      {
        id: "layout-rendering",
        title: "악보 배치와 렌더링",
        items: [
          {
            name: "자동 system 줄바꿈",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/measure-systems.md"]
          },
          {
            name: "system 마지막 마디 폭 채움",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/measure-systems.md"]
          },
          {
            name: "내용 기반 마디 폭 계산",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/measure-systems.md"]
          },
          {
            name: "기본 자동 빔",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/automatic-beaming.md"]
          },
          {
            name: "복잡한 박자와 리듬의 빔 안정성",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/automatic-beaming.md"]
          },
          {
            name: "오선 밖 음표와 덧줄 렌더링",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/testing/single-voice-mvp-regression.md"]
          },
          {
            name: "선택 이벤트, 입력 커서, 재생 커서 표시",
            status: "지원",
            acceptance: [
              "docs/product/acceptance/layout-rendering.feature",
              "docs/product/acceptance/playback.feature"
            ],
            docs: ["docs/architecture/note-input-state.md"]
          },
          {
            name: "수동 system break",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/measure-systems.md"]
          },
          {
            name: "수동 page break",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/measure-systems.md"]
          },
          {
            name: "페이지 크기, 여백, PDF 페이지 설정",
            status: "미지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: ["docs/architecture/measure-systems.md"]
          },
          {
            name: "마디 기준 리허설 마크",
            status: "지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: []
          },
          {
            name: "일반 텍스트와 스태프 텍스트",
            status: "미지원",
            acceptance: ["docs/product/acceptance/layout-rendering.feature"],
            docs: []
          }
        ]
      }
    ]
  },
  {
    id: "review-output",
    title: "확인과 출력",
    sections: [
      {
        id: "playback",
        title: "재생",
        items: [
          {
            name: "재생",
            status: "지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "일시정지",
            status: "지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "정지",
            status: "지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "템포 조절",
            status: "지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "전역 템포 마킹 입력과 MusicXML 왕복",
            status: "지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "마디 중간 템포 변경과 tempo map 재생",
            status: "미지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/research/single-voice-mvp-requirements.md"]
          },
          {
            name: "타이와 셋잇단음표 playback 반영",
            status: "부분 지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/testing/single-voice-mvp-regression.md"]
          },
          {
            name: "재생 커서와 편집 선택 동기화",
            status: "부분 지원",
            acceptance: ["docs/product/acceptance/playback.feature"],
            docs: ["docs/testing/single-voice-mvp-regression.md"]
          }
        ]
      },
      {
        id: "import-export",
        title: "저장, 가져오기, 내보내기",
        items: [
          {
            name: "MusicXML 가져오기",
            status: "지원",
            acceptance: ["docs/product/acceptance/import-export.feature"],
            docs: ["docs/musicxml-mvp.md"]
          },
          {
            name: "MusicXML 문서 순서와 음악 시간 순서 검증",
            status: "지원",
            acceptance: ["docs/product/acceptance/import-export.feature"],
            docs: ["docs/musicxml-mvp.md"]
          },
          {
            name: "MusicXML 내보내기",
            status: "지원",
            acceptance: ["docs/product/acceptance/import-export.feature"],
            docs: ["docs/musicxml-mvp.md"]
          },
          {
            name: "PDF 변환",
            status: "지원",
            acceptance: ["docs/product/acceptance/import-export.feature"],
            docs: ["docs/musicxml-mvp.md"]
          },
          {
            name: "PNG 이미지 내보내기",
            status: "미지원",
            acceptance: ["docs/product/acceptance/import-export.feature"],
            docs: ["docs/architecture/image-export.md"]
          },
          {
            name: "앱 내부 자동저장 복구",
            status: "지원",
            acceptance: ["docs/product/acceptance/start-and-recovery.feature"],
            docs: ["docs/architecture/project-file.md"]
          },
          {
            name: "전용 프로젝트 파일",
            status: "보류",
            acceptance: [],
            docs: ["docs/architecture/project-file.md"]
          },
          {
            name: "최근 파일과 예제 악보 진입점",
            status: "지원",
            acceptance: ["docs/product/acceptance/start-and-recovery.feature"],
            docs: ["docs/architecture/project-file.md"]
          }
        ]
      }
    ]
  },
  {
    id: "distribution-ops",
    title: "배포와 운영",
    sections: [
      {
        id: "distribution-page",
        title: "배포와 소개 페이지",
        items: [
          {
            name: "GitHub prerelease",
            status: "지원",
            acceptance: ["docs/product/acceptance/distribution-download.feature"],
            docs: ["docs/distribution.md"]
          },
          {
            name: "macOS 패키징",
            status: "지원",
            acceptance: ["docs/product/acceptance/distribution-download.feature"],
            docs: ["docs/distribution.md"]
          },
          {
            name: "Windows 패키징",
            status: "지원",
            acceptance: ["docs/product/acceptance/distribution-download.feature"],
            docs: ["docs/distribution.md"]
          },
          {
            name: "Linux 패키징",
            status: "지원",
            acceptance: ["docs/product/acceptance/distribution-download.feature"],
            docs: ["docs/distribution.md"]
          },
          {
            name: "다운로드 페이지",
            status: "지원",
            acceptance: ["docs/product/acceptance/distribution-download.feature"],
            docs: ["docs/site.md"]
          },
          {
            name: "Columns 클래식 이해 지도",
            status: "지원",
            acceptance: ["docs/product/acceptance/columns.feature"],
            docs: ["docs/site.md", "docs/product/columns/authoring-workflow.md"]
          },
          {
            name: "Compositions 후보 수집 파이프라인",
            status: "지원",
            acceptance: [],
            docs: ["docs/product/compositions/collection-pipeline.md"]
          },
          {
            name: "Compositions 단선율 악보 라이브러리",
            status: "지원",
            acceptance: ["docs/product/acceptance/compositions.feature"],
            docs: [
              "docs/product/compositions/collection-pipeline.md",
              "docs/product/analytics-events.md"
            ]
          },
          {
            name: "Google Analytics 기본 이벤트",
            status: "지원",
            acceptance: ["docs/product/acceptance/distribution-download.feature"],
            docs: ["docs/site.md", "docs/product/analytics-events.md"]
          }
        ]
      },
      {
        id: "product-docs",
        title: "제품 문서와 검토 방식",
        items: [
          {
            name: "Gherkin 인수 시나리오",
            status: "실험",
            acceptance: ["docs/product/acceptance/rest-to-note.feature"],
            docs: ["docs/product/acceptance/README.md"]
          },
          {
            name: "Gherkin 자동 테스트 매핑",
            status: "실험",
            acceptance: ["docs/product/acceptance/rest-to-note.feature"],
            docs: [
              "docs/product/acceptance/README.md",
              "docs/product/acceptance/automation-map.json"
            ]
          },
          {
            name: "AI Agent 협업 워크플로우",
            status: "실험",
            acceptance: [],
            docs: ["docs/product/agent-workflow.md"]
          }
        ]
      }
    ]
  }
];
