import 'classical_library_models.dart';

const beethoven = ClassicalPerson(
  id: 'person.beethoven',
  name: LocalizedName(
    ko: '루트비히 판 베토벤',
    original: 'Ludwig van Beethoven',
    english: 'Ludwig van Beethoven',
    sortName: '베토벤',
    aliases: ['베토벤', 'Beethoven'],
  ),
  birthYear: 1770,
  deathYear: 1827,
);

const dvorak = ClassicalPerson(
  id: 'person.dvorak',
  name: LocalizedName(
    ko: '안토닌 드보르자크',
    original: 'Antonin Dvorak',
    english: 'Antonin Dvorak',
    sortName: '드보르자크',
    aliases: ['드보르작', 'Dvorak', 'Dvorak'],
  ),
  birthYear: 1841,
  deathYear: 1904,
);

const carlosKleiber = ClassicalPerson(
  id: 'person.carlos-kleiber',
  name: LocalizedName(
    ko: '카를로스 클라이버',
    original: 'Carlos Kleiber',
    english: 'Carlos Kleiber',
    sortName: '클라이버, 카를로스',
    aliases: ['Carlos Kleiber'],
  ),
);

const furtwangler = ClassicalPerson(
  id: 'person.furtwangler',
  name: LocalizedName(
    ko: '빌헬름 푸르트벵글러',
    original: 'Wilhelm Furtwangler',
    english: 'Wilhelm Furtwangler',
    sortName: '푸르트벵글러, 빌헬름',
    aliases: ['Furtwangler', '푸르트뱅글러'],
  ),
);

const brendel = ClassicalPerson(
  id: 'person.brendel',
  name: LocalizedName(
    ko: '알프레트 브렌델',
    original: 'Alfred Brendel',
    english: 'Alfred Brendel',
    sortName: '브렌델, 알프레트',
    aliases: ['Brendel'],
  ),
);

const viennaPhil = Ensemble(
  id: 'ensemble.vienna-phil',
  name: LocalizedName(
    ko: '빈 필하모닉 오케스트라',
    original: 'Wiener Philharmoniker',
    english: 'Vienna Philharmonic',
    sortName: '빈 필하모닉 오케스트라',
    aliases: ['빈필', 'Vienna Philharmonic'],
  ),
);

const berlinPhil = Ensemble(
  id: 'ensemble.berlin-phil',
  name: LocalizedName(
    ko: '베를린 필하모닉 오케스트라',
    original: 'Berliner Philharmoniker',
    english: 'Berlin Philharmonic',
    sortName: '베를린 필하모닉 오케스트라',
    aliases: ['베를린필', 'Berlin Philharmonic'],
  ),
);

const piano = Instrument(
  id: 'instrument.piano',
  name: LocalizedName(
    ko: '피아노',
    english: 'Piano',
    sortName: '피아노',
    aliases: ['Piano'],
  ),
);

const orchestra = Instrument(
  id: 'instrument.orchestra',
  name: LocalizedName(
    ko: '관현악',
    english: 'Orchestra',
    sortName: '관현악',
    aliases: ['오케스트라', 'Orchestra'],
  ),
);

const beethovenSymphony5 = Work(
  id: 'work.beethoven.symphony5',
  composerId: 'person.beethoven',
  title: LocalizedName(
    ko: '교향곡 5번 다단조',
    original: 'Symphony No. 5 in C minor',
    english: 'Symphony No. 5 in C minor',
    sortName: '교향곡 05',
    aliases: ['운명', 'Beethoven 5', 'Symphony 5', 'Op.67'],
  ),
  catalogNumber: 'Op. 67',
  periodLabel: '고전',
  sourceReferences: [
    SourceReference(
      kind: SourceKind.imslp,
      url:
          'https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)',
      copyrightStatus: 'Public Domain score candidates',
      regionNote: '한국에서의 이용 가능 여부는 자료별 확인이 필요할 수 있음',
    ),
  ],
);

const beethovenMoonlight = Work(
  id: 'work.beethoven.moonlight',
  composerId: 'person.beethoven',
  title: LocalizedName(
    ko: '피아노 소나타 14번 올림다단조',
    original: 'Piano Sonata No. 14 in C-sharp minor',
    english: 'Piano Sonata No. 14 in C-sharp minor',
    sortName: '피아노 소나타 14',
    aliases: ['월광', 'Moonlight Sonata', 'Op.27 No.2'],
  ),
  catalogNumber: 'Op. 27 No. 2',
  periodLabel: '고전',
);

const dvorakNewWorld = Work(
  id: 'work.dvorak.new-world',
  composerId: 'person.dvorak',
  title: LocalizedName(
    ko: '교향곡 9번 마단조',
    original: 'Symphony No. 9 in E minor',
    english: 'Symphony No. 9 in E minor',
    sortName: '교향곡 09',
    aliases: ['신세계', 'From the New World', 'New World Symphony', 'Op.95'],
  ),
  catalogNumber: 'Op. 95, B. 178',
  periodLabel: '낭만',
);

const beethovenSymphony5Parts = [
  WorkPart(
    id: 'part.beethoven.symphony5.1',
    workId: 'work.beethoven.symphony5',
    sequenceNumber: 1,
    title: LocalizedName(
      ko: '1악장 Allegro con brio',
      original: 'I. Allegro con brio',
      sortName: '01 Allegro con brio',
      aliases: ['1악장', '운명 1악장'],
    ),
  ),
  WorkPart(
    id: 'part.beethoven.symphony5.2',
    workId: 'work.beethoven.symphony5',
    sequenceNumber: 2,
    title: LocalizedName(
      ko: '2악장 Andante con moto',
      original: 'II. Andante con moto',
      sortName: '02 Andante con moto',
      aliases: ['2악장'],
    ),
  ),
  WorkPart(
    id: 'part.beethoven.symphony5.3',
    workId: 'work.beethoven.symphony5',
    sequenceNumber: 3,
    title: LocalizedName(
      ko: '3악장 Scherzo. Allegro',
      original: 'III. Scherzo. Allegro',
      sortName: '03 Scherzo Allegro',
      aliases: ['3악장'],
    ),
  ),
  WorkPart(
    id: 'part.beethoven.symphony5.4',
    workId: 'work.beethoven.symphony5',
    sequenceNumber: 4,
    title: LocalizedName(
      ko: '4악장 Allegro',
      original: 'IV. Allegro',
      sortName: '04 Allegro',
      aliases: ['4악장'],
    ),
  ),
];

const beethovenMoonlightParts = [
  WorkPart(
    id: 'part.beethoven.moonlight.1',
    workId: 'work.beethoven.moonlight',
    sequenceNumber: 1,
    title: LocalizedName(
      ko: '1악장 Adagio sostenuto',
      original: 'I. Adagio sostenuto',
      sortName: '01 Adagio sostenuto',
      aliases: ['월광 1악장'],
    ),
  ),
  WorkPart(
    id: 'part.beethoven.moonlight.2',
    workId: 'work.beethoven.moonlight',
    sequenceNumber: 2,
    title: LocalizedName(
      ko: '2악장 Allegretto',
      original: 'II. Allegretto',
      sortName: '02 Allegretto',
      aliases: ['월광 2악장'],
    ),
  ),
  WorkPart(
    id: 'part.beethoven.moonlight.3',
    workId: 'work.beethoven.moonlight',
    sequenceNumber: 3,
    title: LocalizedName(
      ko: '3악장 Presto agitato',
      original: 'III. Presto agitato',
      sortName: '03 Presto agitato',
      aliases: ['월광 3악장'],
    ),
  ),
];

const dvorakNewWorldParts = [
  WorkPart(
    id: 'part.dvorak.new-world.1',
    workId: 'work.dvorak.new-world',
    sequenceNumber: 1,
    title: LocalizedName(
      ko: '1악장 Adagio - Allegro molto',
      original: 'I. Adagio - Allegro molto',
      sortName: '01 Adagio Allegro molto',
      aliases: ['신세계 1악장'],
    ),
  ),
  WorkPart(
    id: 'part.dvorak.new-world.2',
    workId: 'work.dvorak.new-world',
    sequenceNumber: 2,
    title: LocalizedName(
      ko: '2악장 Largo',
      original: 'II. Largo',
      sortName: '02 Largo',
      aliases: ['신세계 2악장', '라르고'],
    ),
  ),
];

const sampleAlbums = [
  AlbumRelease(
    id: 'album.beethoven5.kleiber',
    title: LocalizedName(
      ko: '베토벤: 교향곡 5번과 7번',
      original: 'Beethoven: Symphonies Nos. 5 & 7',
      sortName: '베토벤 교향곡 5 7 클라이버',
    ),
    label: 'Local sample',
    releaseYear: 1975,
  ),
  AlbumRelease(
    id: 'album.beethoven5.furtwangler',
    title: LocalizedName(
      ko: '베토벤: 교향곡 5번 라이브',
      original: 'Beethoven: Symphony No. 5 Live',
      sortName: '베토벤 교향곡 5 푸르트벵글러',
    ),
    label: 'Local sample',
    releaseYear: 1954,
  ),
  AlbumRelease(
    id: 'album.moonlight.brendel',
    title: LocalizedName(
      ko: '베토벤: 피아노 소나타집',
      original: 'Beethoven: Piano Sonatas',
      sortName: '베토벤 피아노 소나타 브렌델',
    ),
    label: 'Local sample',
    releaseYear: 1995,
  ),
];

const sampleRecordings = [
  Recording(
    id: 'recording.beethoven5.kleiber',
    workId: 'work.beethoven.symphony5',
    title: LocalizedName(
      ko: '클라이버 / 빈 필하모닉 연주 녹음',
      original: 'Carlos Kleiber / Vienna Philharmonic',
      sortName: '클라이버 빈필',
    ),
    albumId: 'album.beethoven5.kleiber',
    ensembleId: 'ensemble.vienna-phil',
    recordedYear: 1974,
    credits: [
      RecordingCredit(
        personId: 'person.carlos-kleiber',
        role: RecordingRole.conductor,
      ),
    ],
    trackIds: [
      'track.beethoven5.kleiber.1',
      'track.beethoven5.kleiber.2',
      'track.beethoven5.kleiber.3',
      'track.beethoven5.kleiber.4',
    ],
  ),
  Recording(
    id: 'recording.beethoven5.furtwangler',
    workId: 'work.beethoven.symphony5',
    title: LocalizedName(
      ko: '푸르트벵글러 / 베를린 필하모닉 연주 녹음',
      original: 'Wilhelm Furtwangler / Berlin Philharmonic',
      sortName: '푸르트벵글러 베를린필',
    ),
    albumId: 'album.beethoven5.furtwangler',
    ensembleId: 'ensemble.berlin-phil',
    recordedYear: 1943,
    credits: [
      RecordingCredit(
        personId: 'person.furtwangler',
        role: RecordingRole.conductor,
      ),
    ],
    trackIds: ['track.beethoven5.furtwangler.joined'],
  ),
  Recording(
    id: 'recording.moonlight.brendel',
    workId: 'work.beethoven.moonlight',
    title: LocalizedName(
      ko: '브렌델 피아노 연주 녹음',
      original: 'Alfred Brendel piano recording',
      sortName: '브렌델 피아노',
    ),
    albumId: 'album.moonlight.brendel',
    recordedYear: 1994,
    credits: [
      RecordingCredit(
        personId: 'person.brendel',
        role: RecordingRole.performer,
        instrumentId: 'instrument.piano',
      ),
    ],
    trackIds: [
      'track.moonlight.brendel.1',
      'track.moonlight.brendel.2',
      'track.moonlight.brendel.3',
    ],
  ),
];

const sampleFiles = [
  LocalAudioFile(
    id: 'file.beethoven5.kleiber.1',
    path: 'Music/Beethoven/Symphony 5 - Kleiber/01.flac',
    format: 'FLAC',
  ),
  LocalAudioFile(
    id: 'file.beethoven5.kleiber.2',
    path: 'Music/Beethoven/Symphony 5 - Kleiber/02.flac',
    format: 'FLAC',
  ),
  LocalAudioFile(
    id: 'file.beethoven5.kleiber.3',
    path: 'Music/Beethoven/Symphony 5 - Kleiber/03.flac',
    format: 'FLAC',
  ),
  LocalAudioFile(
    id: 'file.beethoven5.kleiber.4',
    path: 'Music/Beethoven/Symphony 5 - Kleiber/04.flac',
    format: 'FLAC',
  ),
  LocalAudioFile(
    id: 'file.beethoven5.furtwangler.joined',
    path: 'Music/Beethoven/Symphony 5 - Furtwangler/full.opus',
    format: 'OPUS',
  ),
  LocalAudioFile(
    id: 'file.moonlight.brendel.1',
    path: 'Music/Beethoven/Moonlight - Brendel/01.m4a',
    format: 'ALAC',
  ),
  LocalAudioFile(
    id: 'file.moonlight.brendel.2',
    path: 'Music/Beethoven/Moonlight - Brendel/02.m4a',
    format: 'ALAC',
  ),
  LocalAudioFile(
    id: 'file.moonlight.brendel.3',
    path: 'Music/Beethoven/Moonlight - Brendel/03.m4a',
    format: 'ALAC',
  ),
];

const sampleTracks = [
  Track(
    id: 'track.beethoven5.kleiber.1',
    recordingId: 'recording.beethoven5.kleiber',
    fileId: 'file.beethoven5.kleiber.1',
    sequenceNumber: 1,
    workPartIds: ['part.beethoven.symphony5.1'],
  ),
  Track(
    id: 'track.beethoven5.kleiber.2',
    recordingId: 'recording.beethoven5.kleiber',
    fileId: 'file.beethoven5.kleiber.2',
    sequenceNumber: 2,
    workPartIds: ['part.beethoven.symphony5.2'],
  ),
  Track(
    id: 'track.beethoven5.kleiber.3',
    recordingId: 'recording.beethoven5.kleiber',
    fileId: 'file.beethoven5.kleiber.3',
    sequenceNumber: 3,
    workPartIds: ['part.beethoven.symphony5.3'],
  ),
  Track(
    id: 'track.beethoven5.kleiber.4',
    recordingId: 'recording.beethoven5.kleiber',
    fileId: 'file.beethoven5.kleiber.4',
    sequenceNumber: 4,
    workPartIds: ['part.beethoven.symphony5.4'],
  ),
  Track(
    id: 'track.beethoven5.furtwangler.joined',
    recordingId: 'recording.beethoven5.furtwangler',
    fileId: 'file.beethoven5.furtwangler.joined',
    sequenceNumber: 1,
    workPartIds: [
      'part.beethoven.symphony5.1',
      'part.beethoven.symphony5.2',
      'part.beethoven.symphony5.3',
      'part.beethoven.symphony5.4',
    ],
  ),
  Track(
    id: 'track.moonlight.brendel.1',
    recordingId: 'recording.moonlight.brendel',
    fileId: 'file.moonlight.brendel.1',
    sequenceNumber: 1,
    workPartIds: ['part.beethoven.moonlight.1'],
  ),
  Track(
    id: 'track.moonlight.brendel.2',
    recordingId: 'recording.moonlight.brendel',
    fileId: 'file.moonlight.brendel.2',
    sequenceNumber: 2,
    workPartIds: ['part.beethoven.moonlight.2'],
  ),
  Track(
    id: 'track.moonlight.brendel.3',
    recordingId: 'recording.moonlight.brendel',
    fileId: 'file.moonlight.brendel.3',
    sequenceNumber: 3,
    workPartIds: ['part.beethoven.moonlight.3'],
  ),
];

const sampleClassicalLibrary = ClassicalLibrary(
  people: [beethoven, dvorak, carlosKleiber, furtwangler, brendel],
  instruments: [piano, orchestra],
  ensembles: [viennaPhil, berlinPhil],
  works: [beethovenSymphony5, beethovenMoonlight, dvorakNewWorld],
  workParts: [
    ...beethovenSymphony5Parts,
    ...beethovenMoonlightParts,
    ...dvorakNewWorldParts,
  ],
  albums: sampleAlbums,
  recordings: sampleRecordings,
  tracks: sampleTracks,
  files: sampleFiles,
);
