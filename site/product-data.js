export const works = [
  {
    id: 'work:amazing-grace',
    slug: 'amazing-grace',
    title: 'Amazing Grace',
    originalTitle: 'NEW BRITAIN hymn tune',
    summary:
      '익숙한 찬송 선율을 한 줄 악보로 열어보며 반복과 호흡을 확인하는 초급 작품입니다.',
    era: '19세기 hymn tune',
    genre: 'hymn tune',
    key: 'F major',
    meter: '3/4',
    copyrightStatus: 'public-domain melody',
    listeningPoint: '첫 두 마디의 상승과 하강이 뒤 문장에서도 어떻게 돌아오는지 들어봅니다.',
    scores: ['amazing-grace'],
    columns: ['open-a-simple-score', 'melody-before-theory'],
    creators: ['creator:traditional-melody'],
    concerts: ['concert:first-listening-night']
  },
  {
    id: 'work:arirang',
    slug: 'arirang',
    title: '아리랑',
    originalTitle: 'traditional Korean folk song',
    summary:
      '한국 전통 선율을 단선율로 열어보고, 익숙함 속에서 음의 머무름을 관찰합니다.',
    era: 'traditional',
    genre: 'folk song',
    key: 'C major',
    meter: '3/4',
    copyrightStatus: 'traditional melody',
    listeningPoint: '긴 음이 문장을 멈추는 지점과 다시 움직이게 만드는 지점을 찾습니다.',
    scores: ['arirang'],
    columns: ['melody-before-theory', 'listen-with-one-question'],
    creators: ['creator:traditional-melody'],
    concerts: ['concert:folk-melody-preview']
  },
  {
    id: 'work:sakura-sakura',
    slug: 'sakura-sakura',
    title: 'Sakura Sakura',
    originalTitle: 'traditional Japanese melody',
    summary:
      '좁은 음역 안에서 색채가 달라지는 전통 선율을 Chromatics로 열어봅니다.',
    era: 'traditional',
    genre: 'folk song',
    key: 'A minor / miyako-bushi color',
    meter: '4/4',
    copyrightStatus: 'traditional melody',
    listeningPoint: '큰 도약보다 작은 움직임이 분위기를 만드는 방식을 들어봅니다.',
    scores: ['sakura-sakura'],
    columns: ['melody-before-theory'],
    creators: ['creator:traditional-melody'],
    concerts: []
  },
  {
    id: 'work:the-ash-grove',
    slug: 'the-ash-grove',
    title: 'The Ash Grove',
    originalTitle: 'traditional Welsh melody',
    summary:
      '웨일스 전통 선율을 한 줄 악보로 열어보고, 문장 끝의 호흡과 반복을 살펴보는 초급 작품입니다.',
    era: 'traditional',
    genre: 'folk song',
    key: 'F major',
    meter: '4/4',
    copyrightStatus: 'public-domain traditional melody',
    listeningPoint: '같은 리듬형이 문장마다 어떻게 방향을 바꾸는지 들어봅니다.',
    scores: ['the-ash-grove'],
    columns: ['melody-before-theory'],
    creators: ['creator:traditional-melody'],
    concerts: ['concert:folk-melody-preview']
  },
  {
    id: 'work:shenandoah',
    slug: 'shenandoah',
    title: 'Shenandoah',
    originalTitle: 'traditional American folk song',
    summary:
      '넓게 흐르는 미국 전통 선율을 Chromatics로 열어 긴 음과 도약의 균형을 확인합니다.',
    era: 'traditional',
    genre: 'folk song',
    key: 'C major',
    meter: '4/4',
    copyrightStatus: 'public-domain traditional melody',
    listeningPoint: '긴 음 뒤에 이어지는 움직임이 선율의 폭을 어떻게 만드는지 들어봅니다.',
    scores: ['shenandoah'],
    columns: ['melody-before-theory'],
    creators: ['creator:traditional-melody'],
    concerts: ['concert:folk-melody-preview']
  }
]

export const creators = [
  {
    id: 'creator:traditional-melody',
    slug: 'traditional-melody',
    displayName: 'Traditional Melody',
    roles: ['source tradition', 'public domain repertoire'],
    summary:
      '작곡가 개인보다 공동체와 전승이 만든 선율을 묶어 소개하는 초기 Creator 프로필입니다.',
    works: [
      'work:amazing-grace',
      'work:arirang',
      'work:sakura-sakura',
      'work:the-ash-grove',
      'work:shenandoah'
    ],
    concerts: ['concert:first-listening-night', 'concert:folk-melody-preview'],
    columns: ['melody-before-theory', 'open-a-simple-score'],
    classes: ['class:first-melody-listening']
  },
  {
    id: 'creator:in-c-editorial',
    slug: 'in-c-editorial',
    displayName: 'in C Editorial',
    roles: ['editor', 'listening guide'],
    summary:
      'Columns, 공연 프리뷰, 감상 질문을 엮어 처음 듣는 사용자의 입구를 설계하는 운영 프로필입니다.',
    works: ['work:amazing-grace', 'work:arirang'],
    concerts: ['concert:first-listening-night'],
    columns: ['why-classical-feels-hard', 'listen-with-one-question'],
    classes: ['class:first-melody-listening']
  }
]

export const concerts = [
  {
    id: 'concert:first-listening-night',
    slug: 'first-listening-night',
    title: '처음 듣는 선율의 밤',
    dateLabel: '2026년 7월 프리뷰 후보',
    venue: '온라인 프리뷰',
    city: 'in C',
    summary:
      'Amazing Grace와 아리랑처럼 익숙한 선율에서 반복, 쉼, 긴 음을 하나씩 붙잡아 보는 공연 프리뷰입니다.',
    listeningPoint: '오늘은 멜로디가 다시 시작되는 순간만 찾아봅니다.',
    works: ['work:amazing-grace', 'work:arirang'],
    creators: ['creator:in-c-editorial'],
    columns: ['listen-with-one-question', 'open-a-simple-score'],
    externalUrl: null
  },
  {
    id: 'concert:folk-melody-preview',
    slug: 'folk-melody-preview',
    title: '민요 한 줄 미리듣기',
    dateLabel: '2026년 7월 프리뷰 후보',
    venue: '온라인 프리뷰',
    city: 'in C',
    summary:
      '전통 선율을 악보 한 줄과 함께 보고, 공연 전에 들을 지점을 하나만 정하는 프리뷰입니다.',
    listeningPoint: '긴 음과 짧은 음이 번갈아 나오는 곳을 표시해 봅니다.',
    works: ['work:arirang', 'work:sakura-sakura', 'work:the-ash-grove', 'work:shenandoah'],
    creators: ['creator:traditional-melody'],
    columns: ['melody-before-theory'],
    externalUrl: null
  }
]

export const classes = [
  {
    id: 'class:first-melody-listening',
    slug: 'first-melody-listening',
    title: '처음 듣는 사람을 위한 선율 읽기',
    type: '감상 클래스',
    format: '온라인 정보형',
    level: '입문',
    summary:
      '신청과 결제 없이, 작품 페이지와 Columns를 따라가는 정보형 클래스 후보입니다.',
    works: ['work:amazing-grace', 'work:arirang', 'work:the-ash-grove'],
    creators: ['creator:in-c-editorial'],
    columns: ['why-classical-feels-hard', 'melody-before-theory'],
    outline: [
      '안 들리는 지점을 숨기지 않고 질문으로 바꿉니다.',
      '한 줄 선율에서 반복, 쉼, 긴 음을 찾습니다.',
      'Columns와 Works를 오가며 다음 감상 경로를 고릅니다.'
    ]
  }
]
