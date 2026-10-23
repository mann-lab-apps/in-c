import 'audio_tags.dart';
import 'metadata_candidates.dart';

enum MetadataField {
  composer(label: '작곡가'),
  workTitle(label: '작품명'),
  catalogNumber(label: '작품 번호'),
  movementTitle(label: '악장명'),
  movementNumber(label: '악장 순서'),
  performer(label: '연주자'),
  conductor(label: '지휘자'),
  ensemble(label: '앙상블'),
  year(label: '녹음·발매 연도');

  const MetadataField({required this.label});
  final String label;
}

enum MetadataValueSource {
  inferred(label: '자동 추론'),
  tag(label: '원본 태그'),
  musicBrainz(label: 'MusicBrainz 승인'),
  user(label: '사용자 교정');

  const MetadataValueSource({required this.label});
  final String label;
}

class MetadataOverride {
  MetadataOverride({
    required this.fileId,
    required Map<MetadataField, Object> values,
    required Map<MetadataField, MetadataValueSource> sources,
    required this.updatedAtMillis,
    Map<MetadataField, Object> fallbackValues = const {},
    Map<MetadataField, MetadataValueSource> fallbackSources = const {},
    this.musicBrainzRecordingId,
    this.musicBrainzWorkId,
    this.musicBrainzReleaseId,
  }) : values = Map.unmodifiable(values),
       sources = Map.unmodifiable(sources),
       fallbackValues = Map.unmodifiable(fallbackValues),
       fallbackSources = Map.unmodifiable(fallbackSources) {
    if (!values.keys.every(sources.containsKey) ||
        sources.keys.any((field) => !values.containsKey(field))) {
      throw const FormatException('metadata 값과 출처가 일치하지 않습니다.');
    }
    MetadataOverrideValidator.validate(values);
    if (!fallbackValues.keys.every(fallbackSources.containsKey) ||
        fallbackSources.keys.any(
          (field) => !fallbackValues.containsKey(field),
        )) {
      throw const FormatException('metadata fallback 값과 출처가 일치하지 않습니다.');
    }
    if (fallbackSources.values.any(
      (source) => source == MetadataValueSource.user,
    )) {
      throw const FormatException('사용자 교정값은 fallback으로 저장할 수 없습니다.');
    }
    MetadataOverrideValidator.validate(fallbackValues);
  }

  final String fileId;
  final Map<MetadataField, Object> values;
  final Map<MetadataField, MetadataValueSource> sources;
  final Map<MetadataField, Object> fallbackValues;
  final Map<MetadataField, MetadataValueSource> fallbackSources;
  final int updatedAtMillis;
  final String? musicBrainzRecordingId;
  final String? musicBrainzWorkId;
  final String? musicBrainzReleaseId;

  bool get isEmpty => values.isEmpty;

  Object? value(MetadataField field) => values[field];

  String? text(MetadataField field) => values[field] as String?;

  int? number(MetadataField field) => values[field] as int?;

  MetadataValueSource? source(MetadataField field) => sources[field];
}

class EffectiveFileMetadata {
  EffectiveFileMetadata({
    required Map<MetadataField, Object> values,
    required Map<MetadataField, MetadataValueSource> sources,
  }) : values = Map.unmodifiable(values),
       sources = Map.unmodifiable(sources);

  final Map<MetadataField, Object> values;
  final Map<MetadataField, MetadataValueSource> sources;

  String? text(MetadataField field) => values[field] as String?;

  int? number(MetadataField field) => values[field] as int?;

  MetadataValueSource? source(MetadataField field) => sources[field];

  String get summary {
    final parts = [
      text(MetadataField.composer),
      text(MetadataField.workTitle),
      if (number(MetadataField.movementNumber) case final number?) '$number번',
      text(MetadataField.movementTitle),
    ].whereType<String>().where((value) => value.isNotEmpty).toList();
    return parts.isEmpty ? '후보 없음' : parts.join(' · ');
  }

  static EffectiveFileMetadata resolve({
    MetadataCandidate? candidate,
    AudioTagMetadata? tag,
    MetadataOverride? override,
  }) {
    final values = <MetadataField, Object>{};
    final sources = <MetadataField, MetadataValueSource>{};

    void set(MetadataField field, Object? value, MetadataValueSource source) {
      if (value == null || value is String && value.trim().isEmpty) return;
      values[field] = value;
      sources[field] = source;
    }

    set(
      MetadataField.composer,
      candidate?.composerText,
      MetadataValueSource.inferred,
    );
    set(
      MetadataField.workTitle,
      candidate?.workTitleText,
      MetadataValueSource.inferred,
    );
    set(
      MetadataField.movementTitle,
      candidate?.movementText,
      MetadataValueSource.inferred,
    );
    set(
      MetadataField.movementNumber,
      candidate?.trackNumber,
      MetadataValueSource.inferred,
    );
    set(
      MetadataField.performer,
      candidate?.artistText,
      MetadataValueSource.inferred,
    );
    set(MetadataField.year, candidate?.year, MetadataValueSource.inferred);

    set(MetadataField.composer, tag?.composer, MetadataValueSource.tag);
    set(MetadataField.workTitle, tag?.work, MetadataValueSource.tag);
    set(
      MetadataField.movementTitle,
      tag?.movementTitle,
      MetadataValueSource.tag,
    );
    set(
      MetadataField.movementNumber,
      tag?.movementNumber,
      MetadataValueSource.tag,
    );
    set(MetadataField.performer, tag?.artist, MetadataValueSource.tag);
    set(MetadataField.year, tag?.year, MetadataValueSource.tag);

    if (override != null) {
      for (final entry in override.values.entries) {
        values[entry.key] = entry.value;
        sources[entry.key] = override.sources[entry.key]!;
      }
    }
    return EffectiveFileMetadata(values: values, sources: sources);
  }
}

class MetadataOverrideValidator {
  const MetadataOverrideValidator._();

  static final RegExp _controlCharacters = RegExp(
    r'[\x00-\x08\x0b\x0c\x0e-\x1f]',
  );

  static void validate(Map<MetadataField, Object> values) {
    for (final entry in values.entries) {
      final value = entry.value;
      if (entry.key == MetadataField.movementNumber) {
        if (value is! int || value < 1 || value > 999) {
          throw const FormatException('악장 순서는 1부터 999 사이여야 합니다.');
        }
        continue;
      }
      if (entry.key == MetadataField.year) {
        if (value is! int || value < 1000 || value > 3000) {
          throw const FormatException('연도는 1000부터 3000 사이여야 합니다.');
        }
        continue;
      }
      if (value is! String) {
        throw FormatException('${entry.key.label} 값이 올바르지 않습니다.');
      }
      final trimmed = value.trim();
      if (trimmed.isEmpty || trimmed.length > 200) {
        throw FormatException('${entry.key.label}은 1자 이상 200자 이하여야 합니다.');
      }
      if (_controlCharacters.hasMatch(trimmed)) {
        throw FormatException('${entry.key.label}에 허용하지 않는 문자가 있습니다.');
      }
    }
  }
}

abstract interface class MetadataOverrideStore {
  Future<List<MetadataOverride>> load();

  Future<void> upsert(MetadataOverride override);

  Future<void> delete(String fileId);
}

class MemoryMetadataOverrideStore implements MetadataOverrideStore {
  MemoryMetadataOverrideStore([List<MetadataOverride> seed = const []])
    : _items = {for (final item in seed) item.fileId: item};

  final Map<String, MetadataOverride> _items;

  @override
  Future<List<MetadataOverride>> load() async => _items.values.toList();

  @override
  Future<void> upsert(MetadataOverride override) async {
    _items[override.fileId] = override;
  }

  @override
  Future<void> delete(String fileId) async {
    _items.remove(fileId);
  }
}

class MetadataOverrideRepository {
  const MetadataOverrideRepository(this.store, {this.clock = DateTime.now});

  final MetadataOverrideStore store;
  final DateTime Function() clock;

  Future<List<MetadataOverride>> load() => store.load();

  Future<MetadataOverride?> forFile(String fileId) async {
    for (final item in await store.load()) {
      if (item.fileId == fileId) return item;
    }
    return null;
  }

  Future<List<MetadataOverride>> saveUserValues(
    String fileId,
    Map<MetadataField, Object> userValues,
  ) async {
    MetadataOverrideValidator.validate(userValues);
    final existing = await forFile(fileId);
    final values = <MetadataField, Object>{};
    final sources = <MetadataField, MetadataValueSource>{};
    final fallbackValues = <MetadataField, Object>{};
    final fallbackSources = <MetadataField, MetadataValueSource>{};
    if (existing != null) {
      for (final entry in existing.values.entries) {
        if (existing.sources[entry.key] == MetadataValueSource.user) {
          if (userValues.containsKey(entry.key)) {
            if (existing.fallbackValues.containsKey(entry.key)) {
              fallbackValues[entry.key] = existing.fallbackValues[entry.key]!;
              fallbackSources[entry.key] = existing.fallbackSources[entry.key]!;
            }
          } else if (existing.fallbackValues.containsKey(entry.key)) {
            values[entry.key] = existing.fallbackValues[entry.key]!;
            sources[entry.key] = existing.fallbackSources[entry.key]!;
          }
        } else {
          values[entry.key] = entry.value;
          sources[entry.key] = existing.sources[entry.key]!;
        }
      }
    }
    for (final entry in userValues.entries) {
      if (existing != null &&
          existing.sources[entry.key] != MetadataValueSource.user &&
          existing.values.containsKey(entry.key)) {
        fallbackValues[entry.key] = existing.values[entry.key]!;
        fallbackSources[entry.key] = existing.sources[entry.key]!;
      }
      values[entry.key] = entry.value;
      sources[entry.key] = MetadataValueSource.user;
    }
    await _saveOrDelete(
      fileId,
      values,
      sources,
      fallbackValues: fallbackValues,
      fallbackSources: fallbackSources,
      existing: existing,
    );
    return load();
  }

  Future<List<MetadataOverride>> applyMusicBrainzValues({
    required String fileId,
    required Map<MetadataField, Object> values,
    String? recordingId,
    String? workId,
    String? releaseId,
  }) async {
    MetadataOverrideValidator.validate(values);
    final existing = await forFile(fileId);
    final mergedValues = <MetadataField, Object>{...?existing?.values};
    final mergedSources = <MetadataField, MetadataValueSource>{
      ...?existing?.sources,
    };
    final fallbackValues = <MetadataField, Object>{
      ...?existing?.fallbackValues,
    };
    final fallbackSources = <MetadataField, MetadataValueSource>{
      ...?existing?.fallbackSources,
    };
    for (final entry in values.entries) {
      if (mergedSources[entry.key] == MetadataValueSource.user) {
        fallbackValues[entry.key] = entry.value;
        fallbackSources[entry.key] = MetadataValueSource.musicBrainz;
        continue;
      }
      mergedValues[entry.key] = entry.value;
      mergedSources[entry.key] = MetadataValueSource.musicBrainz;
    }
    await store.upsert(
      MetadataOverride(
        fileId: fileId,
        values: mergedValues,
        sources: mergedSources,
        fallbackValues: fallbackValues,
        fallbackSources: fallbackSources,
        updatedAtMillis: clock().millisecondsSinceEpoch,
        musicBrainzRecordingId: recordingId ?? existing?.musicBrainzRecordingId,
        musicBrainzWorkId: workId ?? existing?.musicBrainzWorkId,
        musicBrainzReleaseId: releaseId ?? existing?.musicBrainzReleaseId,
      ),
    );
    return load();
  }

  Future<List<MetadataOverride>> clearUserValues(String fileId) async {
    final existing = await forFile(fileId);
    if (existing == null) return load();
    final values = <MetadataField, Object>{};
    final sources = <MetadataField, MetadataValueSource>{};
    for (final entry in existing.values.entries) {
      if (existing.sources[entry.key] != MetadataValueSource.user) {
        values[entry.key] = entry.value;
        sources[entry.key] = existing.sources[entry.key]!;
      } else if (existing.fallbackValues.containsKey(entry.key)) {
        values[entry.key] = existing.fallbackValues[entry.key]!;
        sources[entry.key] = existing.fallbackSources[entry.key]!;
      }
    }
    await _saveOrDelete(
      fileId,
      values,
      sources,
      fallbackValues: const {},
      fallbackSources: const {},
      existing: existing,
    );
    return load();
  }

  Future<void> _saveOrDelete(
    String fileId,
    Map<MetadataField, Object> values,
    Map<MetadataField, MetadataValueSource> sources, {
    Map<MetadataField, Object>? fallbackValues,
    Map<MetadataField, MetadataValueSource>? fallbackSources,
    MetadataOverride? existing,
  }) async {
    if (values.isEmpty &&
        existing?.musicBrainzRecordingId == null &&
        existing?.musicBrainzWorkId == null &&
        existing?.musicBrainzReleaseId == null) {
      await store.delete(fileId);
      return;
    }
    await store.upsert(
      MetadataOverride(
        fileId: fileId,
        values: values,
        sources: sources,
        fallbackValues: fallbackValues ?? existing?.fallbackValues ?? const {},
        fallbackSources:
            fallbackSources ?? existing?.fallbackSources ?? const {},
        updatedAtMillis: clock().millisecondsSinceEpoch,
        musicBrainzRecordingId: existing?.musicBrainzRecordingId,
        musicBrainzWorkId: existing?.musicBrainzWorkId,
        musicBrainzReleaseId: existing?.musicBrainzReleaseId,
      ),
    );
  }
}
