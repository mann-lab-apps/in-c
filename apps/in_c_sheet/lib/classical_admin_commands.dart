import 'classical_discovery_data_source.dart';
import 'classical_discovery_models.dart';

class AdminCatalogCommand {
  const AdminCatalogCommand({
    required this.type,
    required this.entityId,
    this.fields = const <String, String>{},
  });

  final String type;
  final String entityId;
  final Map<String, String> fields;
}

class AdminCommandValidationResult {
  const AdminCommandValidationResult({required this.errors});

  final List<String> errors;

  bool get isValid => errors.isEmpty;
}

class AdminCatalogCommandResult {
  const AdminCatalogCommandResult({
    required this.catalog,
    required this.applied,
    required this.errors,
    this.message = '',
  });

  final ClassicalCatalogSnapshot catalog;
  final bool applied;
  final List<String> errors;
  final String message;

  bool get isValid => errors.isEmpty;
}

class AdminCatalogCommandValidator {
  const AdminCatalogCommandValidator();

  AdminCommandValidationResult validate(AdminCatalogCommand command) {
    final errors = <String>[];
    if (command.entityId.trim().isEmpty) {
      errors.add('entityId is required.');
    }
    switch (command.type) {
      case 'work_create':
        _require(command, errors, 'titleKo');
        _require(command, errors, 'titleOriginal');
        _require(command, errors, 'composerId');
        _require(command, errors, 'composerNameKo');
        _require(command, errors, 'composerNameOriginal');
        _require(command, errors, 'instrumentation');
      case 'work_metadata_update':
        _requireAny(command, errors, [
          'titleKo',
          'titleOriginal',
          'composerId',
          'composerNameKo',
          'composerNameOriginal',
          'period',
          'instrumentation',
          'durationSeconds',
          'catalogNumber',
          'aliases',
          'moodTags',
          'contextTags',
        ]);
      case 'external_link_upsert':
        _require(command, errors, 'platformId');
        _require(command, errors, 'url');
      case 'score_link_upsert':
        _require(command, errors, 'url');
      case 'concert_create':
        _require(command, errors, 'title');
        _require(command, errors, 'venue');
        _require(command, errors, 'region');
        _require(command, errors, 'startsAt');
        _require(command, errors, 'ticketUrl');
      case 'concert_program_raw_text_update':
        _require(command, errors, 'programRawText');
      case 'promotion_create':
        _require(command, errors, 'concertId');
        _require(command, errors, 'advertiserName');
        _require(command, errors, 'sponsorLabel');
      case 'promotion_update':
        _requireAny(command, errors, [
          'advertiserName',
          'sponsorLabel',
          'targetWorkIds',
          'targetComposerIds',
          'targetInstruments',
          'targetRegions',
          'active',
        ]);
      case 'promotion_pause':
      case 'catalog_import_preview':
        break;
      default:
        errors.add('Unsupported command type: ${command.type}');
    }
    return AdminCommandValidationResult(errors: List.unmodifiable(errors));
  }

  void _require(
    AdminCatalogCommand command,
    List<String> errors,
    String field,
  ) {
    if ((command.fields[field] ?? '').trim().isEmpty) {
      errors.add('$field is required.');
    }
  }

  void _requireAny(
    AdminCatalogCommand command,
    List<String> errors,
    List<String> fields,
  ) {
    if (!fields.any(
      (field) => (command.fields[field] ?? '').trim().isNotEmpty,
    )) {
      errors.add('At least one of ${fields.join(', ')} is required.');
    }
  }
}

class AdminCatalogCommandReducer {
  const AdminCatalogCommandReducer({
    this.validator = const AdminCatalogCommandValidator(),
  });

  final AdminCatalogCommandValidator validator;

  AdminCatalogCommandResult apply(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    final validation = validator.validate(command);
    if (!validation.isValid) {
      return AdminCatalogCommandResult(
        catalog: catalog,
        applied: false,
        errors: validation.errors,
      );
    }
    return switch (command.type) {
      'work_create' => _createWork(catalog, command),
      'work_metadata_update' => _updateWorkMetadata(catalog, command),
      'external_link_upsert' => _upsertLink(catalog, command, scoreLink: false),
      'score_link_upsert' => _upsertLink(catalog, command, scoreLink: true),
      'concert_create' => _createConcert(catalog, command),
      'concert_program_raw_text_update' => _updateConcert(catalog, command),
      'promotion_create' => _createPromotion(catalog, command),
      'promotion_update' => _updatePromotion(catalog, command),
      'promotion_pause' => _pausePromotion(catalog, command),
      'catalog_import_preview' => AdminCatalogCommandResult(
        catalog: catalog,
        applied: true,
        errors: const <String>[],
        message: 'Import preview accepted. Apply imported rows separately.',
      ),
      _ => AdminCatalogCommandResult(
        catalog: catalog,
        applied: false,
        errors: ['Unsupported command type: ${command.type}'],
      ),
    };
  }

  AdminCatalogCommandResult _createWork(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    if (catalog.works.any((work) => work.id == command.entityId)) {
      return _error(catalog, 'work already exists: ${command.entityId}');
    }
    final fields = command.fields;
    final duration = _int(fields['durationSeconds'], fallback: 240);
    final work = ClassicalWork(
      id: command.entityId,
      titleKo: fields['titleKo']!,
      titleOriginal: fields['titleOriginal']!,
      composerId: fields['composerId']!,
      composerNameKo: fields['composerNameKo']!,
      composerNameOriginal: fields['composerNameOriginal']!,
      period: fields['period'] ?? '미분류',
      instrumentation: fields['instrumentation']!,
      durationSeconds: duration,
      catalogNumber: fields['catalogNumber'] ?? '',
      movements: [
        ClassicalMovement(
          id: '${command.entityId}-main',
          title: '주요 악장/구간',
          order: 1,
          durationSeconds: duration,
        ),
      ],
      moodTags: _csv(fields['moodTags']),
      contextTags: _csv(fields['contextTags']),
      difficultyForListening: _int(
        fields['difficultyForListening'],
        fallback: 2,
      ),
      aliases: _csv(fields['aliases']),
      listeningMoments: [
        ListeningMoment(
          id: '${command.entityId}-30s',
          label: '처음 붙잡을 30초',
          startSeconds: 0,
          endSeconds: duration < 30 ? duration : 30,
          prompt: fields['prompt'] ?? '첫 30초에서 가장 먼저 들리는 악기를 찾아보세요.',
          tags: [fields['instrumentation']!],
        ),
        ListeningMoment(
          id: '${command.entityId}-3m',
          label: '3분으로 익숙해지기',
          startSeconds: 0,
          endSeconds: duration < 180 ? duration : 180,
          prompt: '처음 들린 지점이 다시 돌아오는지 기다려 보세요.',
          tags: const ['repeat'],
        ),
      ],
      externalLinks: const <ExternalLink>[],
      recordings: const <ClassicalRecording>[],
      relatedWorkIds: _csv(fields['relatedWorkIds']),
      scoreLinks: const <ExternalLink>[],
      concertIds: _csv(fields['concertIds']),
      catalogStatusTags: const [
        'launch_candidate',
        'needs_direct_link',
        'needs_preview',
        'needs_concert_match',
      ],
    );
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(catalog, works: [...catalog.works, work]),
      applied: true,
      errors: const <String>[],
    );
  }

  AdminCatalogCommandResult _updateWorkMetadata(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    final index = catalog.works.indexWhere(
      (work) => work.id == command.entityId,
    );
    if (index < 0) {
      return _error(catalog, 'work not found: ${command.entityId}');
    }
    final work = catalog.works[index];
    final updated = _copyWork(
      work,
      titleKo: command.fields['titleKo'],
      titleOriginal: command.fields['titleOriginal'],
      composerId: command.fields['composerId'],
      composerNameKo: command.fields['composerNameKo'],
      composerNameOriginal: command.fields['composerNameOriginal'],
      period: command.fields['period'],
      instrumentation: command.fields['instrumentation'],
      durationSeconds: _optionalInt(command.fields['durationSeconds']),
      catalogNumber: command.fields['catalogNumber'],
      aliases: _optionalCsv(command.fields['aliases']),
      moodTags: _optionalCsv(command.fields['moodTags']),
      contextTags: _optionalCsv(command.fields['contextTags']),
    );
    final works = [...catalog.works];
    works[index] = updated;
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(catalog, works: works),
      applied: true,
      errors: const <String>[],
    );
  }

  AdminCatalogCommandResult _upsertLink(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command, {
    required bool scoreLink,
  }) {
    final index = catalog.works.indexWhere(
      (work) => work.id == command.entityId,
    );
    if (index < 0) {
      return _error(catalog, 'work not found: ${command.entityId}');
    }
    final work = catalog.works[index];
    final platformId =
        command.fields['platformId'] ?? (scoreLink ? 'score' : 'external');
    final id = command.fields['id'] ?? '${work.id}-$platformId';
    final link = ExternalLink(
      id: id,
      platformId: platformId,
      label: command.fields['label'] ?? platformId,
      url: command.fields['url']!,
      linkType:
          command.fields['linkType'] ?? (scoreLink ? 'score_search' : 'listen'),
      previewUrl: _optional(command.fields['previewUrl']),
      embedUrl: _optional(command.fields['embedUrl']),
      deepLink: _optional(command.fields['deepLink']),
      openMode: command.fields['openMode'] ?? 'external',
    );
    final links = [...(scoreLink ? work.scoreLinks : work.externalLinks)];
    final linkIndex = links.indexWhere((existing) => existing.id == id);
    if (linkIndex < 0) {
      links.add(link);
    } else {
      links[linkIndex] = link;
    }
    final works = [...catalog.works];
    works[index] = scoreLink
        ? _copyWork(work, scoreLinks: links)
        : _copyWork(work, externalLinks: links);
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(catalog, works: works),
      applied: true,
      errors: const <String>[],
    );
  }

  AdminCatalogCommandResult _createConcert(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    if (catalog.concerts.any((concert) => concert.id == command.entityId)) {
      return _error(catalog, 'concert already exists: ${command.entityId}');
    }
    final fields = command.fields;
    final startsAt = DateTime.tryParse(fields['startsAt'] ?? '');
    if (startsAt == null) {
      return _error(catalog, 'startsAt must be ISO-8601.');
    }
    final concert = ClassicalConcert(
      id: command.entityId,
      title: fields['title']!,
      venue: fields['venue']!,
      region: fields['region']!,
      startsAt: startsAt,
      performers: _csv(fields['performers']),
      programWorkIds: _csv(fields['programWorkIds']),
      composerIds: _csv(fields['composerIds']),
      instrumentTags: _csv(fields['instrumentTags']),
      ticketUrl: fields['ticketUrl']!,
      programRawText: fields['programRawText'] ?? '',
    );
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(catalog, concerts: [...catalog.concerts, concert]),
      applied: true,
      errors: const <String>[],
    );
  }

  AdminCatalogCommandResult _updateConcert(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    final index = catalog.concerts.indexWhere(
      (concert) => concert.id == command.entityId,
    );
    if (index < 0) {
      return _error(catalog, 'concert not found: ${command.entityId}');
    }
    final concert = catalog.concerts[index];
    final concerts = [...catalog.concerts];
    concerts[index] = _copyConcert(
      concert,
      programRawText: command.fields['programRawText'],
      programWorkIds: _optionalCsv(command.fields['programWorkIds']),
      composerIds: _optionalCsv(command.fields['composerIds']),
      instrumentTags: _optionalCsv(command.fields['instrumentTags']),
    );
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(catalog, concerts: concerts),
      applied: true,
      errors: const <String>[],
    );
  }

  AdminCatalogCommandResult _createPromotion(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    if (catalog.promotions.any(
      (promotion) => promotion.id == command.entityId,
    )) {
      return _error(catalog, 'promotion already exists: ${command.entityId}');
    }
    final promotion = ConcertPromotion(
      id: command.entityId,
      concertId: command.fields['concertId']!,
      advertiserName: command.fields['advertiserName']!,
      sponsorLabel: command.fields['sponsorLabel']!,
      targetWorkIds: _csv(command.fields['targetWorkIds']),
      targetComposerIds: _csv(command.fields['targetComposerIds']),
      targetInstruments: _csv(command.fields['targetInstruments']),
      targetRegions: _csv(command.fields['targetRegions']),
    );
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(
        catalog,
        promotions: [...catalog.promotions, promotion],
      ),
      applied: true,
      errors: const <String>[],
    );
  }

  AdminCatalogCommandResult _updatePromotion(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    final index = catalog.promotions.indexWhere(
      (promotion) => promotion.id == command.entityId,
    );
    if (index < 0) {
      return _error(catalog, 'promotion not found: ${command.entityId}');
    }
    if (command.fields['active'] == 'false') {
      return _pausePromotion(catalog, command);
    }
    final promotion = catalog.promotions[index];
    final promotions = [...catalog.promotions];
    promotions[index] = _copyPromotion(
      promotion,
      advertiserName: command.fields['advertiserName'],
      sponsorLabel: command.fields['sponsorLabel'],
      targetWorkIds: _optionalCsv(command.fields['targetWorkIds']),
      targetComposerIds: _optionalCsv(command.fields['targetComposerIds']),
      targetInstruments: _optionalCsv(command.fields['targetInstruments']),
      targetRegions: _optionalCsv(command.fields['targetRegions']),
    );
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(catalog, promotions: promotions),
      applied: true,
      errors: const <String>[],
    );
  }

  AdminCatalogCommandResult _pausePromotion(
    ClassicalCatalogSnapshot catalog,
    AdminCatalogCommand command,
  ) {
    final promotions = catalog.promotions
        .where((promotion) => promotion.id != command.entityId)
        .toList(growable: false);
    if (promotions.length == catalog.promotions.length) {
      return _error(catalog, 'promotion not found: ${command.entityId}');
    }
    return AdminCatalogCommandResult(
      catalog: _copyCatalog(catalog, promotions: promotions),
      applied: true,
      errors: const <String>[],
      message: 'Promotion paused by removing it from the active catalog.',
    );
  }

  AdminCatalogCommandResult _error(
    ClassicalCatalogSnapshot catalog,
    String error,
  ) {
    return AdminCatalogCommandResult(
      catalog: catalog,
      applied: false,
      errors: [error],
    );
  }
}

ClassicalCatalogSnapshot _copyCatalog(
  ClassicalCatalogSnapshot catalog, {
  List<ClassicalComposer>? composers,
  List<ClassicalWork>? works,
  List<ClassicalConcert>? concerts,
  List<ConcertPromotion>? promotions,
}) {
  return ClassicalCatalogSnapshot(
    composers: composers ?? catalog.composers,
    works: works ?? catalog.works,
    concerts: concerts ?? catalog.concerts,
    promotions: promotions ?? catalog.promotions,
  );
}

ClassicalWork _copyWork(
  ClassicalWork work, {
  String? titleKo,
  String? titleOriginal,
  String? composerId,
  String? composerNameKo,
  String? composerNameOriginal,
  String? period,
  String? instrumentation,
  int? durationSeconds,
  String? catalogNumber,
  List<ClassicalMovement>? movements,
  List<String>? moodTags,
  List<String>? contextTags,
  int? difficultyForListening,
  List<String>? aliases,
  List<ListeningMoment>? listeningMoments,
  List<ExternalLink>? externalLinks,
  List<ClassicalRecording>? recordings,
  List<String>? relatedWorkIds,
  List<ExternalLink>? scoreLinks,
  List<String>? concertIds,
  List<String>? catalogStatusTags,
}) {
  return ClassicalWork(
    id: work.id,
    titleKo: titleKo ?? work.titleKo,
    titleOriginal: titleOriginal ?? work.titleOriginal,
    composerId: composerId ?? work.composerId,
    composerNameKo: composerNameKo ?? work.composerNameKo,
    composerNameOriginal: composerNameOriginal ?? work.composerNameOriginal,
    period: period ?? work.period,
    instrumentation: instrumentation ?? work.instrumentation,
    durationSeconds: durationSeconds ?? work.durationSeconds,
    catalogNumber: catalogNumber ?? work.catalogNumber,
    movements: movements ?? work.movements,
    moodTags: moodTags ?? work.moodTags,
    contextTags: contextTags ?? work.contextTags,
    difficultyForListening:
        difficultyForListening ?? work.difficultyForListening,
    aliases: aliases ?? work.aliases,
    listeningMoments: listeningMoments ?? work.listeningMoments,
    externalLinks: externalLinks ?? work.externalLinks,
    recordings: recordings ?? work.recordings,
    relatedWorkIds: relatedWorkIds ?? work.relatedWorkIds,
    scoreLinks: scoreLinks ?? work.scoreLinks,
    concertIds: concertIds ?? work.concertIds,
    catalogStatusTags: catalogStatusTags ?? work.catalogStatusTags,
  );
}

ClassicalConcert _copyConcert(
  ClassicalConcert concert, {
  String? programRawText,
  List<String>? programWorkIds,
  List<String>? composerIds,
  List<String>? instrumentTags,
}) {
  return ClassicalConcert(
    id: concert.id,
    title: concert.title,
    venue: concert.venue,
    region: concert.region,
    startsAt: concert.startsAt,
    performers: concert.performers,
    programWorkIds: programWorkIds ?? concert.programWorkIds,
    composerIds: composerIds ?? concert.composerIds,
    instrumentTags: instrumentTags ?? concert.instrumentTags,
    ticketUrl: concert.ticketUrl,
    programRawText: programRawText ?? concert.programRawText,
    ticketDestinations: concert.ticketDestinations,
  );
}

ConcertPromotion _copyPromotion(
  ConcertPromotion promotion, {
  String? advertiserName,
  String? sponsorLabel,
  List<String>? targetWorkIds,
  List<String>? targetComposerIds,
  List<String>? targetInstruments,
  List<String>? targetRegions,
}) {
  return ConcertPromotion(
    id: promotion.id,
    concertId: promotion.concertId,
    advertiserName: advertiserName ?? promotion.advertiserName,
    sponsorLabel: sponsorLabel ?? promotion.sponsorLabel,
    targetWorkIds: targetWorkIds ?? promotion.targetWorkIds,
    targetComposerIds: targetComposerIds ?? promotion.targetComposerIds,
    targetInstruments: targetInstruments ?? promotion.targetInstruments,
    targetRegions: targetRegions ?? promotion.targetRegions,
  );
}

List<String> _csv(String? value) {
  if (value == null || value.trim().isEmpty) {
    return const <String>[];
  }
  return value
      .split(',')
      .map((item) => item.trim())
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}

List<String>? _optionalCsv(String? value) {
  if (value == null) {
    return null;
  }
  return _csv(value);
}

String? _optional(String? value) {
  if (value == null || value.trim().isEmpty) {
    return null;
  }
  return value;
}

int _int(String? value, {required int fallback}) {
  return int.tryParse(value ?? '') ?? fallback;
}

int? _optionalInt(String? value) {
  return value == null ? null : int.tryParse(value);
}
