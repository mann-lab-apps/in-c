export const AUDIO_STATUS = {
  DEMO: 'demo',
  CANDIDATE: 'candidate',
  NEEDS_REVIEW: 'needs-review',
  CLEARED_OPEN: 'cleared-open',
  CLEARED_CONTRACT: 'cleared-contract',
  BLOCKED: 'blocked'
}

export const clearedAudioByWorkId = {
  'beethoven-symphony-5-1': {
    audioUrl:
      'https://upload.wikimedia.org/wikipedia/commons/e/e6/Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor%2C_op._67_-_i._allegro_con_brio.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 8824613,
    audioDurationSeconds: 430,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 8,
    sourceName: 'Wikimedia Commons / Musopen',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor,_op._67_-_i._allegro_con_brio.ogg',
    license: 'Public domain / PD-author',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'Skidmore College orchestra',
    performerUrl:
      'https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor,_op._67_-_i._allegro_con_brio.ogg',
    attributionRequired: true,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      'Commons 파일 페이지 기준 작품 PD와 녹음 권리자 공개가 분리 표시되어 있습니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  },
  'beethoven-fur-elise': {
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/FurElise.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 2144088,
    audioDurationSeconds: 177,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 8,
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:FurElise.ogg',
    license: 'Public domain / CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'V Gao / Gaodifan',
    performerUrl: 'https://commons.wikimedia.org/wiki/File:FurElise.ogg',
    attributionRequired: false,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      '연주자가 직접 제작한 파일을 공공영역/CC0로 공개한 것으로 표시됩니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  },
  'dvorak-new-world': {
    audioUrl:
      'https://upload.wikimedia.org/wikipedia/commons/1/17/Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27%2C_op._95_-_iv._allegro_con_fuoco.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 15295639,
    audioDurationSeconds: 569,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 9,
    sourceName: 'Wikimedia Commons / Musopen',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27,_op._95_-_iv._allegro_con_fuoco.ogg',
    license: 'Public domain / PD-author',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'Musopen',
    performerUrl: 'https://musopen.org/',
    attributionRequired: false,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      'Commons 파일 페이지에 Musopen 권리자 공개와 VRT 확인 흔적이 있습니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  },
  'bach-air': {
    audioUrl:
      'https://upload.wikimedia.org/wikipedia/commons/e/ec/Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3',
    localAudioPath: '',
    audioFormat: 'mp3',
    audioSizeBytes: 7539726,
    audioDurationSeconds: 183,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 9,
    sourceName: 'Wikimedia Commons / United States Air Force Band',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3',
    license: 'Public domain / U.S. federal government work',
    licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force',
    rightsVerifiedAt: '2026-09-07',
    performer: 'United States Air Force Band, Air Force Strings',
    performerUrl: 'https://www.music.af.mil/Multimedia/Music/Public-Domain-Music/',
    attributionRequired: false,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      '미 공군 공식 직무 저작물로 공공영역 표시되어 있습니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  },
  'handel-messiah-hallelujah': {
    audioUrl:
      'https://upload.wikimedia.org/wikipedia/commons/3/3f/Handel_Messiah_Hallelujah_by_Oratorio_Chorus.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 1781664,
    audioDurationSeconds: 181,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 8,
    sourceName: 'Wikimedia Commons / Internet Archive',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Handel_Messiah_Hallelujah_by_Oratorio_Chorus.ogg',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'Oratorio Chorus',
    performerUrl: 'https://archive.org/',
    attributionRequired: false,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      '1916 역사적 녹음으로 Commons가 관련 권리 제한 없음으로 표시합니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  },
  'debussy-clair-de-lune': {
    audioUrl:
      'https://upload.wikimedia.org/wikipedia/commons/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 15740765,
    audioDurationSeconds: 304,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 10,
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'Laurens Goedhart',
    performerUrl:
      'https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg',
    attributionRequired: true,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      '작품 PD와 녹음 CC BY 3.0이 분리 표시됩니다. 앱에서 저작자/라이선스/변경 여부를 표시해야 합니다.'
  },
  'satie-gymnopedie-1': {
    audioUrl:
      'https://upload.wikimedia.org/wikipedia/commons/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 3696351,
    audioDurationSeconds: 197,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 9,
    sourceName: 'Wikimedia Commons / Musopen',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg',
    license: 'Public domain by performer / Musopen',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'Robin Alciatore',
    performerUrl:
      'https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg',
    attributionRequired: false,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      '연주자/권리자가 공공영역으로 공개한 Musopen 계열 파일로 표시됩니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  },
  'mussorgsky-promenade': {
    audioUrl:
      'https://upload.wikimedia.org/wikipedia/commons/d/df/Modest_Mussorgsky_-_pictures_at_an_exhibition_-_promenade_-_moderato_comodo_e_con_delicatezza.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 1136659,
    audioDurationSeconds: 58,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 8,
    sourceName: 'Wikimedia Commons / Musopen',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_promenade_-_moderato_comodo_e_con_delicatezza.ogg',
    license: 'Public domain / PD-author',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'Musopen',
    performerUrl: 'https://musopen.org/',
    attributionRequired: false,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      '작품과 녹음 모두 공공영역 공개로 표시되고 VRT 확인 흔적이 있습니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  },
  'brahms-hungarian-dance-5': {
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Brahms_nikisch_hd5.ogg',
    localAudioPath: '',
    audioFormat: 'ogg',
    audioSizeBytes: 3129355,
    audioDurationSeconds: 197,
    audioChecksum: '',
    clipStart: 0,
    clipDuration: 8,
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Brahms_nikisch_hd5.ogg',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    rightsVerifiedAt: '2026-09-07',
    performer: 'Artur Nikisch / Welte-Mignon reproducing piano',
    performerUrl: 'https://commons.wikimedia.org/wiki/File:Brahms_nikisch_hd5.ogg',
    attributionRequired: false,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    shareAlikeRequired: false,
    verifiedAudioStatus: AUDIO_STATUS.CLEARED_OPEN,
    rightsNotes:
      '1906 재생 피아노 기록으로 Commons가 관련 권리 제한 없음으로 표시합니다. 한국 서비스 최종 법률 검토는 별도입니다.'
  }
}

export function isClearedAudio(work) {
  return (
    work?.verifiedAudioStatus === AUDIO_STATUS.CLEARED_OPEN ||
    work?.verifiedAudioStatus === AUDIO_STATUS.CLEARED_CONTRACT ||
    work?.verifiedAudioStatus === 'cleared'
  )
}
