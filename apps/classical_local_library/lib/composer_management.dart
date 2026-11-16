import 'classical_library_models.dart';
import 'composer_library.dart';
import 'library_catalog.dart';

/// Mutations load the latest catalog; callers await completion before closing.
/// No synthetic Work/Recording is required to give a person a composer role.
class ComposerRepository {
  ComposerRepository(
    this.catalog, {
    DateTime Function()? clock,
    this.canonicalWorkId,
  }) : clock = clock ?? DateTime.now;
  final ClassicalCatalogRepository catalog;
  final DateTime Function() clock;
  final String Function(String)? canonicalWorkId;
  Future<void> _tail = Future.value();
  Future<ClassicalLibrary> _write(Future<ClassicalLibrary> Function() action) {
    final next = _tail.then((_) => action());
    _tail = next.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return next;
  }

  Future<ClassicalLibrary> saveComposer({
    required List<LocalAudioFile> files,
    String? personId,
    required String name,
    String? original,
    List<String> aliases = const [],
    required String source,
    PeriodAssessment? period,
  }) => _write(() async {
    if (name.trim().isEmpty ||
        name.length > 300 ||
        (original?.length ?? 0) > 300 ||
        aliases.length > 100 ||
        aliases.any((a) => a.length > 300)) {
      throw const FormatException('작곡가 이름과 별칭을 확인해 주세요.');
    }
    final current = await catalog.load(files);
    final old = personId == null ? null : current.person(personId);
    final id = old?.id ?? 'person.user.${clock().microsecondsSinceEpoch}';
    if (old == null && current.people.any((p) => p.id == id)) {
      throw const FormatException('다시 저장해 주세요.');
    }
    final person = ClassicalPerson(
      id: id,
      name: LocalizedName(
        ko: name.trim(),
        sortName: old?.name.sortName ?? name.trim(),
        original: original?.trim().isEmpty == true ? null : original?.trim(),
        english: old?.name.english,
        aliases: aliases
            .map((a) => a.trim())
            .where((a) => a.isNotEmpty)
            .toSet()
            .toList(),
      ),
      birthYear: old?.birthYear,
      deathYear: old?.deathYear,
      composerProfile: ComposerProfile(
        source: source.trim(),
        period: period,
        confirmedFileIds: old?.composerProfile?.confirmedFileIds ?? [],
        excludedFileIds: old?.composerProfile?.excludedFileIds ?? [],
      ),
    );
    final updated = copyCatalog(
      current,
      people: [
        for (final p in current.people)
          if (p.id != id) p,
        person,
      ],
    );
    await catalog.save(updated);
    return updated;
  });

  Future<ClassicalLibrary> connectFile({
    required List<LocalAudioFile> files,
    required String fileId,
    required String? personId,
  }) => _write(() async {
    if (!files.any((f) => f.id == fileId)) {
      throw const FormatException('음원을 찾지 못했습니다.');
    }
    final current = await catalog.load(files);
    final composers = ComposerNames(current);
    if (personId != null && !composers.people.containsKey(personId)) {
      throw const FormatException('확인된 작곡가를 선택해 주세요.');
    }
    final updated = copyCatalog(
      current,
      people: [
        for (final p in current.people)
          if (composers.people.containsKey(p.id))
            ClassicalPerson(
              id: p.id,
              name: p.name,
              birthYear: p.birthYear,
              deathYear: p.deathYear,
              composerProfile: ComposerProfile(
                source: p.composerProfile?.source ?? '사용자 확인 · 기존 작품의 작곡가',
                period: p.composerProfile?.period,
                confirmedFileIds: [
                  ...p.composerProfile?.confirmedFileIds.where(
                        (id) => id != fileId,
                      ) ??
                      [],
                  if (p.id == personId) fileId,
                ],
                excludedFileIds: [
                  ...p.composerProfile?.excludedFileIds.where(
                        (id) => id != fileId,
                      ) ??
                      [],
                  if (p.id != personId) fileId,
                ],
              ),
            )
          else
            p,
      ],
    );
    await catalog.save(updated);
    return updated;
  });

  Future<ClassicalLibrary> saveWorkPeriod({
    required List<LocalAudioFile> files,
    required String workId,
    required PeriodAssessment? period,
  }) => _write(() async {
    workId = canonicalWorkId?.call(workId) ?? workId;
    final current = await catalog.load(files);
    current.work(workId);
    final updated = copyCatalog(
      current,
      works: [
        for (final w in current.works)
          if (w.id == workId)
            Work(
              id: w.id,
              composerId: w.composerId,
              title: w.title,
              catalogNumber: w.catalogNumber,
              periodLabel: w.periodLabel,
              periodAssessment: period,
              sourceReferences: w.sourceReferences,
            )
          else
            w,
      ],
    );
    await catalog.save(updated);
    return updated;
  });
}

ClassicalLibrary copyCatalog(
  ClassicalLibrary l, {
  List<ClassicalPerson>? people,
  List<Work>? works,
}) => ClassicalLibrary(
  people: people ?? l.people,
  instruments: l.instruments,
  ensembles: l.ensembles,
  works: works ?? l.works,
  workParts: l.workParts,
  albums: l.albums,
  recordings: l.recordings,
  tracks: l.tracks,
  files: l.files,
  playHistory: l.playHistory,
);
