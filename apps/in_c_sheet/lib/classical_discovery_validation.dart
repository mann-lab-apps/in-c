import 'classical_discovery_models.dart';

enum CatalogValidationSeverity { warning, error }

class CatalogValidationIssue {
  const CatalogValidationIssue({
    required this.severity,
    required this.entityType,
    required this.entityId,
    required this.message,
  });

  final CatalogValidationSeverity severity;
  final String entityType;
  final String entityId;
  final String message;
}

class CatalogValidationReport {
  const CatalogValidationReport({required this.issues});

  final List<CatalogValidationIssue> issues;

  bool get hasErrors =>
      issues.any((issue) => issue.severity == CatalogValidationSeverity.error);

  int get errorCount => issues
      .where((issue) => issue.severity == CatalogValidationSeverity.error)
      .length;

  int get warningCount => issues
      .where((issue) => issue.severity == CatalogValidationSeverity.warning)
      .length;
}

class ClassicalCatalogValidator {
  const ClassicalCatalogValidator();

  CatalogValidationReport validate({
    required List<ClassicalComposer> composers,
    required List<ClassicalWork> works,
    required List<ClassicalConcert> concerts,
    required List<ConcertPromotion> promotions,
  }) {
    final issues = <CatalogValidationIssue>[];
    final composerIds = composers.map((composer) => composer.id).toSet();
    final workIds = works.map((work) => work.id).toSet();
    final concertIds = concerts.map((concert) => concert.id).toSet();
    final composerCatalogNumbers = <String, String>{};
    final aliases = <String, String>{};

    _addDuplicateIssues(
      issues: issues,
      entityType: 'composer',
      ids: composers.map((composer) => composer.id),
    );
    _addDuplicateIssues(
      issues: issues,
      entityType: 'work',
      ids: works.map((work) => work.id),
    );
    _addDuplicateIssues(
      issues: issues,
      entityType: 'concert',
      ids: concerts.map((concert) => concert.id),
    );
    _addDuplicateIssues(
      issues: issues,
      entityType: 'promotion',
      ids: promotions.map((promotion) => promotion.id),
    );

    for (final work in works) {
      _validateWork(issues, work, composerIds, workIds, concertIds);
      final catalogNumber = normalizeDiscoveryText(work.catalogNumber);
      if (catalogNumber.isNotEmpty) {
        final catalogKey = '${work.composerId}:$catalogNumber';
        final previousWorkId = composerCatalogNumbers[catalogKey];
        if (previousWorkId != null) {
          _error(
            issues,
            'work',
            work.id,
            'composer 안에서 catalogNumber가 $previousWorkId와 중복됩니다.',
          );
        } else {
          composerCatalogNumbers[catalogKey] = work.id;
        }
      }
      for (final alias in work.aliases) {
        final normalizedAlias = normalizeDiscoveryText(alias);
        if (normalizedAlias.length < 3) {
          continue;
        }
        final previousWorkId = aliases[normalizedAlias];
        if (previousWorkId != null && previousWorkId != work.id) {
          _warning(
            issues,
            'work',
            work.id,
            'alias "$alias"가 $previousWorkId와 중복됩니다.',
          );
        } else {
          aliases[normalizedAlias] = work.id;
        }
      }
    }
    for (final concert in concerts) {
      _validateConcert(issues, concert, composerIds, workIds);
    }
    for (final promotion in promotions) {
      _validatePromotion(issues, promotion, composerIds, workIds, concertIds);
    }

    return CatalogValidationReport(issues: List.unmodifiable(issues));
  }

  void _validateWork(
    List<CatalogValidationIssue> issues,
    ClassicalWork work,
    Set<String> composerIds,
    Set<String> workIds,
    Set<String> concertIds,
  ) {
    _require(issues, 'work', work.id, work.titleKo, '한국어 작품명이 없습니다.');
    _require(issues, 'work', work.id, work.titleOriginal, '원어 작품명이 없습니다.');
    _require(issues, 'work', work.id, work.composerId, 'composerId가 없습니다.');
    if (!composerIds.contains(work.composerId)) {
      _error(
        issues,
        'work',
        work.id,
        'composerId ${work.composerId}가 composer catalog에 없습니다.',
      );
    }
    if (work.movements.isEmpty) {
      _error(issues, 'work', work.id, '악장/구간 정보가 없습니다.');
    }
    if (work.listeningMoments.length < 2) {
      _error(issues, 'work', work.id, '30초/3분 listening moment가 부족합니다.');
    }
    if (work.externalLinks
            .where((link) => link.linkType.startsWith('listen'))
            .length <
        3) {
      _error(issues, 'work', work.id, '외부 청취 플랫폼 link가 3개 미만입니다.');
    }
    if (work.scoreLinks.isEmpty) {
      _warning(issues, 'work', work.id, '악보/연습 link placeholder가 없습니다.');
    }
    for (final relatedId in work.relatedWorkIds) {
      if (!workIds.contains(relatedId)) {
        _error(
          issues,
          'work',
          work.id,
          'relatedWorkId $relatedId가 catalog에 없습니다.',
        );
      }
    }
    for (final concertId in work.concertIds) {
      if (!concertIds.contains(concertId)) {
        _error(
          issues,
          'work',
          work.id,
          'concertId $concertId가 concert catalog에 없습니다.',
        );
      }
    }
    for (final moment in work.listeningMoments) {
      if (moment.startSeconds < 0 ||
          moment.endSeconds <= moment.startSeconds ||
          moment.endSeconds > work.durationSeconds) {
        _error(
          issues,
          'work',
          work.id,
          'listeningMoment ${moment.id}의 시간 범위가 작품 길이와 맞지 않습니다.',
        );
      }
      if ((moment.fallbackExternalLinkId ?? '').isNotEmpty &&
          !work.externalLinks.any(
            (link) => link.id == moment.fallbackExternalLinkId,
          )) {
        _error(
          issues,
          'work',
          work.id,
          'fallbackExternalLinkId ${moment.fallbackExternalLinkId}가 없습니다.',
        );
      }
      if ((moment.recommendedRecordingId ?? '').isNotEmpty &&
          !work.recordings.any(
            (recording) => recording.id == moment.recommendedRecordingId,
          )) {
        _error(
          issues,
          'work',
          work.id,
          'recommendedRecordingId ${moment.recommendedRecordingId}가 없습니다.',
        );
      }
    }
    for (final link in [...work.externalLinks, ...work.scoreLinks]) {
      _validateUrl(issues, 'work', work.id, link.url, '${link.id} URL');
      final previewUrl = link.previewUrl;
      if (previewUrl != null) {
        _validateUrl(
          issues,
          'work',
          work.id,
          previewUrl,
          '${link.id} preview URL',
        );
      }
      final embedUrl = link.embedUrl;
      if (embedUrl != null) {
        _validateUrl(issues, 'work', work.id, embedUrl, '${link.id} embed URL');
      }
      final deepLink = link.deepLink;
      if (deepLink != null) {
        _validateUrl(issues, 'work', work.id, deepLink, '${link.id} deep link');
      }
    }
    for (final recording in work.recordings) {
      _validateUrl(
        issues,
        'work',
        work.id,
        recording.url,
        '${recording.id} URL',
      );
      final previewUrl = recording.previewUrl;
      if (previewUrl != null) {
        _validateUrl(
          issues,
          'work',
          work.id,
          previewUrl,
          '${recording.id} preview URL',
        );
      }
    }
  }

  void _validateConcert(
    List<CatalogValidationIssue> issues,
    ClassicalConcert concert,
    Set<String> composerIds,
    Set<String> workIds,
  ) {
    _require(issues, 'concert', concert.id, concert.title, '공연명이 없습니다.');
    _require(issues, 'concert', concert.id, concert.venue, '공연장이 없습니다.');
    _require(issues, 'concert', concert.id, concert.region, '지역이 없습니다.');
    final ticketUri = Uri.tryParse(concert.ticketUrl);
    if (ticketUri == null || !ticketUri.hasScheme) {
      _error(issues, 'concert', concert.id, '예매처 URL이 올바르지 않습니다.');
    }
    for (final destination in concert.ticketDestinations) {
      _validateUrl(
        issues,
        'concert',
        concert.id,
        destination.url,
        '${destination.id} 예매처 URL',
      );
    }
    for (final workId in concert.programWorkIds) {
      if (!workIds.contains(workId)) {
        _error(
          issues,
          'concert',
          concert.id,
          'programWorkId $workId가 catalog에 없습니다.',
        );
      }
    }
    for (final composerId in concert.composerIds) {
      if (!composerIds.contains(composerId)) {
        _error(
          issues,
          'concert',
          concert.id,
          'composerId $composerId가 composer catalog에 없습니다.',
        );
      }
    }
    if (concert.programRawText.isEmpty) {
      _warning(issues, 'concert', concert.id, '공연 프로그램 raw text가 없습니다.');
    }
  }

  void _validatePromotion(
    List<CatalogValidationIssue> issues,
    ConcertPromotion promotion,
    Set<String> composerIds,
    Set<String> workIds,
    Set<String> concertIds,
  ) {
    if (!concertIds.contains(promotion.concertId)) {
      _error(issues, 'promotion', promotion.id, '연결된 concertId가 없습니다.');
    }
    _require(
      issues,
      'promotion',
      promotion.id,
      promotion.advertiserName,
      '광고주명이 없습니다.',
    );
    _require(
      issues,
      'promotion',
      promotion.id,
      promotion.sponsorLabel,
      'sponsored disclosure label이 없습니다.',
    );
    for (final workId in promotion.targetWorkIds) {
      if (!workIds.contains(workId)) {
        _error(
          issues,
          'promotion',
          promotion.id,
          'targetWorkId $workId가 없습니다.',
        );
      }
    }
    for (final composerId in promotion.targetComposerIds) {
      if (!composerIds.contains(composerId)) {
        _error(
          issues,
          'promotion',
          promotion.id,
          'targetComposerId $composerId가 없습니다.',
        );
      }
    }
  }

  void _addDuplicateIssues({
    required List<CatalogValidationIssue> issues,
    required String entityType,
    required Iterable<String> ids,
  }) {
    final seen = <String>{};
    for (final id in ids) {
      if (!seen.add(id)) {
        _error(issues, entityType, id, '중복 id입니다.');
      }
    }
  }

  void _require(
    List<CatalogValidationIssue> issues,
    String entityType,
    String entityId,
    String value,
    String message,
  ) {
    if (value.trim().isEmpty) {
      _error(issues, entityType, entityId, message);
    }
  }

  void _validateUrl(
    List<CatalogValidationIssue> issues,
    String entityType,
    String entityId,
    String value,
    String label,
  ) {
    final uri = Uri.tryParse(value);
    if (uri == null || !uri.hasScheme) {
      _error(issues, entityType, entityId, '$label이 올바르지 않습니다.');
    }
  }

  void _error(
    List<CatalogValidationIssue> issues,
    String entityType,
    String entityId,
    String message,
  ) {
    issues.add(
      CatalogValidationIssue(
        severity: CatalogValidationSeverity.error,
        entityType: entityType,
        entityId: entityId,
        message: message,
      ),
    );
  }

  void _warning(
    List<CatalogValidationIssue> issues,
    String entityType,
    String entityId,
    String message,
  ) {
    issues.add(
      CatalogValidationIssue(
        severity: CatalogValidationSeverity.warning,
        entityType: entityType,
        entityId: entityId,
        message: message,
      ),
    );
  }
}
