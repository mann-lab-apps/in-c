export const SESSION_SIZE = 10
export const DAILY_LIMIT = 1
export const KST_TIME_ZONE = 'Asia/Seoul'
export const TIMER_MAX_DELAY = 2_147_483_647

export const ERA_OPTIONS = ['바로크', '고전', '낭만', '근대']

export const workTaxonomyById = {
  'beethoven-symphony-5-1': { popularityTier: 1, genreKo: '교향곡' },
  'vivaldi-four-seasons-spring': { popularityTier: 1, genreKo: '협주곡' },
  'mozart-eine-kleine': { popularityTier: 1, genreKo: '세레나데' },
  'beethoven-fur-elise': { popularityTier: 1, genreKo: '피아노 소품' },
  'mozart-turkish-march': { popularityTier: 1, genreKo: '피아노 소나타' },
  'chopin-nocturne-op9-2': { popularityTier: 1, genreKo: '피아노 소품' },
  'tchaikovsky-swan-lake': { popularityTier: 1, genreKo: '발레 음악' },
  'bach-air': { popularityTier: 1, genreKo: '관현악 모음곡' },
  'handel-messiah-hallelujah': { popularityTier: 1, genreKo: '오라토리오' },
  'bizet-carmen-habanera': { popularityTier: 1, genreKo: '오페라 아리아' },
  'dvorak-new-world': { popularityTier: 2, genreKo: '교향곡' },
  'grieg-morning-mood': { popularityTier: 1, genreKo: '극음악 모음곡' },
  'debussy-clair-de-lune': { popularityTier: 2, genreKo: '피아노 소품' },
  'satie-gymnopedie-1': { popularityTier: 2, genreKo: '피아노 소품' },
  'bach-minuet-g': { popularityTier: 1, genreKo: '건반 소품' },
  'schubert-ave-maria': { popularityTier: 1, genreKo: '가곡' },
  'mendelssohn-wedding-march': { popularityTier: 1, genreKo: '극음악' },
  'mussorgsky-promenade': { popularityTier: 2, genreKo: '피아노 모음곡' },
  'saint-saens-swan': { popularityTier: 2, genreKo: '실내악 소품' },
  'brahms-hungarian-dance-5': { popularityTier: 2, genreKo: '무곡' },
  'elgar-pomp-circumstance': { popularityTier: 2, genreKo: '행진곡' }
}

export const dailyRoundBlueprints = [
  {
    roundNumber: 1,
    target: 'composer',
    method: 'choice',
    difficultyBand: 'intro',
    maxPopularityTier: 1,
    scoreBase: 100,
    hintPolicy: 'strong',
    label: '작곡가 4지선다',
    briefKo: '아주 유명한 선율에서 작곡가 이름을 먼저 잡는 워밍업입니다.',
    rewardKo: '빠르게 맞히면 스피드 보너스가 붙어요.'
  },
  {
    roundNumber: 2,
    target: 'title',
    method: 'choice',
    difficultyBand: 'intro',
    maxPopularityTier: 1,
    scoreBase: 100,
    hintPolicy: 'strong',
    label: '곡명 4지선다',
    briefKo: '한국어 별칭으로 기억나는 곡명을 고르는 라운드입니다.',
    rewardKo: '친숙한 제목을 바로 누르면 점수가 잘 붙습니다.'
  },
  {
    roundNumber: 3,
    target: 'era',
    method: 'choice',
    difficultyBand: 'easy',
    maxPopularityTier: 1,
    scoreBase: 110,
    hintPolicy: 'category',
    label: '시대 4지선다',
    briefKo: '바로크, 고전, 낭만, 근대의 큰 분위기를 들어봅니다.',
    rewardKo: '분류 문제는 기본 점수가 조금 더 높습니다.'
  },
  {
    roundNumber: 4,
    target: 'genre',
    method: 'choice',
    difficultyBand: 'easy',
    maxPopularityTier: 1,
    scoreBase: 115,
    hintPolicy: 'category',
    label: '장르 4지선다',
    briefKo: '교향곡, 오페라, 무곡처럼 음악의 쓰임새를 맞힙니다.',
    rewardKo: '곡명보다 넓게 들으면 맞히기 좋아요.'
  },
  {
    roundNumber: 5,
    target: 'composer',
    method: 'choice',
    difficultyBand: 'normal',
    maxPopularityTier: 2,
    scoreBase: 120,
    hintPolicy: 'light',
    label: '작곡가 4지선다',
    briefKo: '대중성 2단계 곡까지 섞어 작곡가 감각을 확인합니다.',
    rewardKo: '중반부터 기본 점수가 올라갑니다.'
  },
  {
    roundNumber: 6,
    target: 'title',
    method: 'choice',
    difficultyBand: 'normal',
    maxPopularityTier: 2,
    scoreBase: 125,
    hintPolicy: 'light',
    label: '곡명 4지선다',
    briefKo: '별칭만으로 바로 떠오르지 않는 곡명도 섞입니다.',
    rewardKo: '정식명과 별칭을 함께 기억하면 유리합니다.'
  },
  {
    roundNumber: 7,
    target: 'composer',
    method: 'autocomplete',
    difficultyBand: 'normal',
    maxPopularityTier: 2,
    scoreBase: 145,
    hintPolicy: 'search',
    label: '작곡가 자동완성',
    briefKo: '보기 없이 검색창에서 작곡가를 좁혀 맞힙니다.',
    rewardKo: '자동완성 성공은 4지선다보다 점수가 큽니다.'
  },
  {
    roundNumber: 8,
    target: 'title',
    method: 'autocomplete',
    difficultyBand: 'hard',
    maxPopularityTier: 2,
    scoreBase: 155,
    hintPolicy: 'search',
    label: '곡명 자동완성',
    briefKo: '별칭, 일부 단어, 초성으로 곡명을 찾아봅니다.',
    rewardKo: '곡명 검색 성공은 후반 점수의 핵심입니다.'
  },
  {
    roundNumber: 9,
    target: 'composer',
    method: 'text',
    difficultyBand: 'hard',
    maxPopularityTier: 2,
    scoreBase: 180,
    hintPolicy: 'none',
    label: '작곡가 주관식',
    briefKo: '힌트 없이 작곡가 이름을 직접 적는 고난도 라운드입니다.',
    rewardKo: '주관식 정답은 큰 점수와 연속 정답 보너스를 노릴 수 있어요.'
  },
  {
    roundNumber: 10,
    target: 'title',
    method: 'text',
    difficultyBand: 'hard',
    maxPopularityTier: 2,
    scoreBase: 210,
    hintPolicy: 'none',
    label: '곡명 주관식',
    briefKo: '마지막은 곡명을 직접 적습니다. 별칭도 정답으로 인정합니다.',
    rewardKo: '최종 라운드는 가장 높은 기본 점수입니다.'
  }
]

export const composerAliases = {
  베토벤: ['베토벤', 'beethoven', 'ludwig van beethoven'],
  비발디: ['비발디', 'vivaldi', 'antonio vivaldi'],
  모차르트: ['모차르트', 'mozart', 'wolfgang amadeus mozart'],
  쇼팽: ['쇼팽', 'chopin', 'frederic chopin', 'frederic chopin'],
  차이콥스키: ['차이콥스키', 'tchaikovsky', 'pyotr tchaikovsky'],
  바흐: ['바흐', 'bach', 'johann sebastian bach'],
  헨델: ['헨델', 'handel', 'george frideric handel'],
  비제: ['비제', 'bizet', 'georges bizet'],
  드보르자크: ['드보르자크', '드보르작', 'dvorak', 'antonin dvorak'],
  그리그: ['그리그', 'grieg', 'edvard grieg'],
  드뷔시: ['드뷔시', 'debussy', 'claude debussy'],
  사티: ['사티', 'satie', 'erik satie'],
  슈베르트: ['슈베르트', 'schubert', 'franz schubert'],
  멘델스존: ['멘델스존', 'mendelssohn', 'felix mendelssohn'],
  무소륵스키: ['무소륵스키', '무소르그스키', 'mussorgsky', 'modest mussorgsky'],
  생상스: ['생상스', 'saint saens', 'saint-saens', 'camille saint-saens'],
  브람스: ['브람스', 'brahms', 'johannes brahms'],
  엘가: ['엘가', 'elgar', 'edward elgar']
}

export const modeLabels = {
  daily: '데일리',
  composer: '작곡가 연습',
  title: '곡명 연습',
  review: '오답 복습'
}

export const targetLabels = {
  composer: '작곡가',
  title: '곡명',
  era: '시대',
  genre: '장르'
}

export function createPracticeRound(mode, index = 0) {
  return {
    roundNumber: index + 1,
    target: mode === 'title' ? 'title' : 'composer',
    method: 'choice',
    difficultyBand: index < 4 ? 'intro' : index < 7 ? 'easy' : 'normal',
    maxPopularityTier: index < 6 ? 1 : 2,
    scoreBase: 100,
    hintPolicy: index < 6 ? 'strong' : 'light',
    label: mode === 'title' ? '곡명 4지선다' : '작곡가 4지선다'
  }
}

export function createReviewRound(index = 0) {
  const target = index % 2 === 0 ? 'title' : 'composer'
  return {
    roundNumber: index + 1,
    target,
    method: 'choice',
    difficultyBand: index < 3 ? 'easy' : 'normal',
    maxPopularityTier: 2,
    scoreBase: 90,
    hintPolicy: 'review',
    label: target === 'title' ? '오답 곡명 복습' : '오답 작곡가 복습',
    briefKo: '최근 틀린 곡을 다시 듣고 기억을 고정하는 복습 라운드입니다.',
    rewardKo: '복습에서 다시 맞히면 최근 오답 목록에서 정리됩니다.'
  }
}

export function getRoundPrompt(round) {
  const target = targetLabels[round.target] ?? '정답'

  if (round.method === 'text') {
    return `${target}을 직접 입력하세요`
  }
  if (round.method === 'autocomplete') {
    return `${target}을 검색해서 맞혀보세요`
  }
  return `${target}을 골라보세요`
}

export function getRoundHint(round) {
  if (round.method === 'text') {
    return '힌트 없이 떠오르는 답을 적어보는 마지막 단계입니다'
  }
  if (round.method === 'autocomplete') {
    return '두 글자만 떠올라도 후보를 좁힐 수 있어요'
  }
  if (round.target === 'era') {
    return '바로크, 고전, 낭만, 근대 중 어느 시대의 느낌인지 들어보세요'
  }
  if (round.target === 'genre') {
    return '독주, 교향곡, 오페라, 무곡처럼 쓰임새를 먼저 잡아보세요'
  }
  return round.target === 'composer'
    ? '선율의 분위기보다 작곡가 이름을 먼저 떠올려보세요'
    : '별칭으로 기억나는 제목을 골라도 됩니다'
}
