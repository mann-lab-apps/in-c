import 'dart:convert';

import 'classical_library_models.dart';

/// Exact, confirmed name aliases only. Ambiguous names never claim a person ID.
class ComposerNames {
  ComposerNames(ClassicalLibrary? library) {
    if (library == null) return;
    final composerIds = library.works.map((w) => w.composerId).toSet();
    for (final person in library.people.where(
      (p) => composerIds.contains(p.id) || p.composerProfile != null,
    )) {
      people[person.id] = person;
      for (final fileId
          in person.composerProfile?.confirmedFileIds ?? <String>[]) {
        explicitFiles.putIfAbsent(fileId, () => {}).add(person.id);
      }
      excludedFiles[person.id] = {...?person.composerProfile?.excludedFileIds};
      for (final name in person.name.searchNames) {
        matches.putIfAbsent(normalize(name), () => {}).add(person.id);
      }
    }
  }
  final people = <String, ClassicalPerson>{};
  final matches = <String, Set<String>>{};
  final explicitFiles = <String, Set<String>>{};
  final excludedFiles = <String, Set<String>>{};
  static String normalize(String value) =>
      value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
  String? personId(String? value) {
    final ids = matches[normalize(value ?? '')];
    return ids?.length == 1 ? ids!.single : null;
  }

  String? forFile(String fileId, String? value) {
    final explicit = explicitFiles[fileId] ?? <String>{};
    if (explicit.isNotEmpty) {
      return explicit.length == 1 ? explicit.single : null;
    }
    final ids = (matches[normalize(value ?? '')] ?? <String>{})
        .where((id) => !(excludedFiles[id]?.contains(fileId) ?? false))
        .toList();
    return ids.length == 1 ? ids.single : null;
  }

  String fileKey(String fileId, String? value) {
    final id = forFile(fileId, value);
    return id == null
        ? (value == null || value.trim().isEmpty
              ? 'unknown'
              : 'name:${normalize(value)}')
        : 'person:$id';
  }

  String key(String? value) {
    if (value == null || value.trim().isEmpty) return 'unknown';
    final id = personId(value);
    return id == null ? 'name:${normalize(value)}' : 'person:$id';
  }

  String label(String? value) =>
      people[personId(value)]?.name.ko ?? value?.trim() ?? '작곡가 정보 없음';
}

class LibraryPeriods {
  LibraryPeriods(
    ClassicalLibrary? library, {
    Map<String, String> workAliases = const {},
  }) {
    if (library == null) return;
    final works = {for (final w in library.works) w.id: w};
    final recordings = {for (final r in library.recordings) r.id: r};
    for (final t in library.tracks) {
      final workId = recordings[t.recordingId]?.workId;
      final work = works[workAliases[workId] ?? workId];
      if (work != null) workByFile[t.fileId] = work;
    }
  }
  final Map<String, Work> workByFile = {};
  ResolvedPeriod resolve(String fileId, ClassicalPerson? composer) {
    final work = workByFile[fileId];
    final p = work?.periodAssessment;
    if (p != null) {
      return ResolvedPeriod(
        p.eras,
        '작품 시대',
        p.source,
        estimated: p.certainty == PeriodCertainty.estimated,
      );
    }
    final raw = work?.periodLabel?.trim();
    if (raw != null && raw.isNotEmpty) {
      const names = {
        'baroque': MusicEra.baroque,
        '바로크': MusicEra.baroque,
        'classical': MusicEra.classical,
        '고전': MusicEra.classical,
        'romantic': MusicEra.romantic,
        '낭만': MusicEra.romantic,
        'medieval': MusicEra.medieval,
        '중세': MusicEra.medieval,
        'renaissance': MusicEra.renaissance,
        '르네상스': MusicEra.renaissance,
        'modern': MusicEra.modern,
        '근현대': MusicEra.modern,
      };
      final era = names[raw.toLowerCase()];
      return ResolvedPeriod(
        era == null ? [] : [era],
        '기존 작품 시대 · $raw',
        '기존 periodLabel (확인 출처 미기록)',
        estimated: true,
      );
    }
    final activity = composer?.composerProfile?.period;
    if (activity != null) {
      return ResolvedPeriod(
        activity.eras,
        '작곡가 활동 시대 기준 · 작품 시대 미확인',
        activity.source,
        estimated: true,
      );
    }
    return const ResolvedPeriod([], '시대 미분류', '확인 정보 없음');
  }
}

/// A route snapshot, not a persisted Work/Recording or album identity.
class ComposerTarget {
  const ComposerTarget(this.composer, {this.kind, this.group});
  final String composer;
  final String? kind, group;
  String get encoded =>
      kind == null ? composer : jsonEncode([composer, kind, group]);
  factory ComposerTarget.decode(String value) {
    if (!value.startsWith('[')) return ComposerTarget(value);
    final fields = (jsonDecode(value) as List).cast<String>();
    return ComposerTarget(fields[0], kind: fields[1], group: fields[2]);
  }
}
