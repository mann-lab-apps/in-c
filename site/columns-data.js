export const columnMap = [
  {
    id: 'start',
    title: '처음 듣기',
    description: '클래식이 멀게 느껴질 때 들어갈 수 있는 가장 낮은 문턱',
    columns: ['why-classical-feels-hard', 'listen-with-one-question']
  },
  {
    id: 'language',
    title: '음악의 언어',
    description: '선율, 리듬, 화성처럼 악보와 감상이 만나는 기본 단어',
    columns: ['melody-before-theory']
  },
  {
    id: 'people',
    title: '작곡가와 시대',
    description: '사람의 삶과 시대가 음악의 표정이 되는 순간',
    columns: ['mozart-as-a-person']
  },
  {
    id: 'practice',
    title: '연주와 악보',
    description: '듣는 음악을 직접 만지고 연주하는 경험으로 연결하기',
    columns: ['open-a-simple-score']
  }
]

export const columns = [
  {
    slug: 'why-classical-feels-hard',
    status: 'public',
    title: '클래식은 왜 어렵게 느껴질까',
    summary:
      '어려운 지식 때문이 아니라, 어디서부터 들어가야 할지 보이지 않기 때문일 수 있습니다.',
    category: '처음 듣기',
    tags: ['입문', '감상', '지도'],
    publishedAt: '2026-07-07',
    readingMinutes: 4,
    relatedWorks: ['드뷔시: 달빛', '모차르트: 작은별 변주곡'],
    relatedComposers: ['Claude Debussy', 'Wolfgang Amadeus Mozart'],
    relatedPerformances: ['처음 듣는 클래식 플레이리스트'],
    body: `
## 지식보다 먼저 필요한 것

클래식이 어려운 이유는 용어가 많아서만은 아닙니다. 더 큰 문제는 **지금 내가 어디에 서 있는지** 알기 어렵다는 점입니다.

어떤 사람은 멜로디에서 시작하고, 어떤 사람은 작곡가의 삶에서 시작하고, 또 어떤 사람은 직접 연주할 수 있는 짧은 악보에서 시작합니다.

Columns는 하나의 정답 순서를 강요하기보다, 클래식을 이해하는 지도를 보여주고 사용자가 원하는 입구를 고르게 하려 합니다.

## 읽는 순서보다 중요한 것

- 익숙한 곡 하나를 고릅니다.
- 그 곡에서 궁금한 질문 하나만 붙잡습니다.
- 질문이 생기면 다음 칼럼이나 악보로 이동합니다.

공부가 아니라 탐색에 가깝게 시작하면, 클래식은 조금 더 친근한 세계가 됩니다.
`
  },
  {
    slug: 'listen-with-one-question',
    status: 'public',
    title: '한 곡을 들을 때 질문 하나만 가져가기',
    summary:
      '감상을 잘하려고 애쓰기보다, 오늘 들을 질문 하나만 정해도 음악이 다르게 들립니다.',
    category: '처음 듣기',
    tags: ['감상법', '초보자', '듣기'],
    publishedAt: '2026-07-07',
    readingMinutes: 3,
    relatedWorks: ['베토벤: 교향곡 5번 1악장'],
    relatedComposers: ['Ludwig van Beethoven'],
    relatedPerformances: ['공연장에 가기 전 10분 듣기'],
    body: `
## 질문이 귀를 열어줍니다

처음부터 구조, 조성, 형식을 모두 이해하려고 하면 감상은 금방 숙제가 됩니다.

대신 오늘은 질문 하나만 가져가도 충분합니다.

- 이 곡에서 가장 자주 돌아오는 리듬은 무엇일까?
- 가장 조용해지는 순간은 어디일까?
- 처음과 끝의 분위기는 얼마나 달라졌을까?

질문이 하나 생기면 음악은 배경음이 아니라 사건이 됩니다.
`
  },
  {
    slug: 'melody-before-theory',
    status: 'public',
    title: '이론보다 먼저 선율을 따라가기',
    summary:
      '선율은 클래식 입문의 가장 좋은 실마리입니다. 악보를 몰라도 흥얼거릴 수 있다면 이미 시작한 것입니다.',
    category: '음악의 언어',
    tags: ['선율', '악보', '이론'],
    publishedAt: '2026-07-07',
    readingMinutes: 5,
    relatedWorks: ['한국 민요: 아리랑', '드보르자크: 신세계 교향곡 2악장'],
    relatedComposers: ['Antonin Dvorak'],
    relatedPerformances: ['선율 따라 부르기 워크숍'],
    body: `
## 선율은 기억에 남는 길입니다

악보의 모든 기호를 알지 못해도 선율은 따라갈 수 있습니다. 올라가고, 내려가고, 멈추고, 다시 시작하는 흐름을 듣는 것만으로도 음악의 큰 길이 보입니다.

Chromatics가 단선율 악보를 먼저 잘 다루려는 이유도 여기에 있습니다. 복잡한 편곡 전에, 한 줄의 선율을 직접 적고 들어보는 경험이 클래식과 가까워지는 좋은 출발점이기 때문입니다.
`
  },
  {
    slug: 'mozart-as-a-person',
    status: 'public',
    title: '모차르트를 천재가 아니라 사람으로 듣기',
    summary:
      '작곡가를 신화로만 보면 음악은 멀어집니다. 사람의 일과 고민으로 보면 다시 가까워집니다.',
    category: '작곡가와 시대',
    tags: ['작곡가', '모차르트', '이야기'],
    publishedAt: '2026-07-07',
    readingMinutes: 4,
    relatedWorks: ['모차르트: 피아노 소나타 K.545'],
    relatedComposers: ['Wolfgang Amadeus Mozart'],
    relatedPerformances: ['모차르트 입문 리사이틀'],
    body: `
## 천재라는 말의 거리감

모차르트를 천재라고만 부르면 설명은 쉬워지지만, 음악은 오히려 멀어질 수 있습니다.

그도 마감이 있었고, 청중이 있었고, 생계를 고민했습니다. 그렇게 보면 작품은 박물관의 유물이 아니라 어떤 사람이 남긴 선택의 기록이 됩니다.
`
  },
  {
    slug: 'open-a-simple-score',
    status: 'public',
    title: '짧은 악보 하나를 열어보는 일',
    summary:
      '듣기에서 끝나지 않고 한 줄의 악보를 열어보면, 음악은 훨씬 구체적인 물건이 됩니다.',
    category: '연주와 악보',
    tags: ['Chromatics', 'MusicXML', '연주'],
    publishedAt: '2026-07-07',
    readingMinutes: 3,
    relatedWorks: ['퍼블릭 도메인 민요 모음'],
    relatedComposers: ['Traditional'],
    relatedPerformances: ['동네 합주 모임'],
    body: `
## 악보는 감상을 방해하지 않습니다

악보를 읽는 일은 시험이 아니라 관찰입니다. 같은 선율이 몇 번 반복되는지, 어디서 쉬는지, 어느 음이 오래 머무는지를 눈으로 확인할 수 있습니다.

Columns에서 만난 곡을 Chromatics로 열어보고, 직접 음표 하나를 바꿔보는 흐름이 in C가 만들고 싶은 첫 경험입니다.
`
  },
  {
    slug: 'concert-note-taking',
    status: 'private',
    title: '공연장에서 메모하는 법',
    summary: '공연 전후의 짧은 메모를 다음 감상으로 연결하는 방법을 다룹니다.',
    category: '연주와 악보',
    tags: ['공연', '메모'],
    publishedAt: null,
    readingMinutes: 4,
    relatedWorks: [],
    relatedComposers: [],
    relatedPerformances: [],
    body: ''
  }
]
