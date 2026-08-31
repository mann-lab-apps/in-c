import 'classical_concert_import.dart';
import 'classical_discovery_data_source.dart';
import 'classical_discovery_models.dart';
import 'classical_discovery_validation.dart';
import 'classical_promotion_reporting.dart';

class ClassicalCatalogOpsSummary {
  const ClassicalCatalogOpsSummary({
    required this.catalog,
    required this.validationReport,
    required this.workCount,
    required this.composerCount,
    required this.concertCount,
    required this.promotionCount,
    required this.minimumWorkTarget,
    required this.launchWorkTarget,
    required this.previewLinkCount,
    required this.previewCoveragePercent,
    required this.concertLinkedWorkCount,
    required this.worksMissingListeningMoments,
    required this.worksMissingExternalLinks,
    required this.worksMissingScoreLinks,
    required this.concertsWithRawText,
    required this.expectedProgramItems,
    required this.matchedProgramItems,
    required this.promotionsMissingDisclosure,
    required this.promotionReports,
    required this.recentEventTypes,
  });

  factory ClassicalCatalogOpsSummary.fromCatalog({
    required ClassicalCatalogSnapshot catalog,
    required List<DiscoveryEvent> recentEvents,
    ClassicalCatalogValidator validator = const ClassicalCatalogValidator(),
    ConcertProgramMatcher matcher = const ConcertProgramMatcher(),
  }) {
    final validationReport = validator.validate(
      composers: catalog.composers,
      works: catalog.works,
      concerts: catalog.concerts,
      promotions: catalog.promotions,
    );
    var expectedProgramItems = 0;
    var matchedProgramItems = 0;
    for (final concert in catalog.concerts) {
      expectedProgramItems += concert.programWorkIds.length;
      final matched = matcher
          .matchWorkIds(
            programRawText: concert.programRawText,
            works: catalog.works,
          )
          .toSet();
      matchedProgramItems += concert.programWorkIds
          .where(matched.contains)
          .length;
    }
    final previewLinkCount = catalog.works
        .where(
          (work) =>
              work.externalLinks.any(
                (link) => (link.previewUrl ?? '').isNotEmpty,
              ) ||
              work.recordings.any(
                (recording) => (recording.previewUrl ?? '').isNotEmpty,
              ),
        )
        .length;

    return ClassicalCatalogOpsSummary(
      catalog: catalog,
      validationReport: validationReport,
      workCount: catalog.works.length,
      composerCount: catalog.composers.length,
      concertCount: catalog.concerts.length,
      promotionCount: catalog.promotions.length,
      minimumWorkTarget: 300,
      launchWorkTarget: 1000,
      previewLinkCount: previewLinkCount,
      previewCoveragePercent: catalog.works.isEmpty
          ? 0
          : previewLinkCount / catalog.works.length,
      concertLinkedWorkCount: catalog.works
          .where((work) => work.concertIds.isNotEmpty)
          .length,
      worksMissingListeningMoments: catalog.works
          .where((work) => work.listeningMoments.length < 2)
          .length,
      worksMissingExternalLinks: catalog.works
          .where(
            (work) =>
                work.externalLinks
                    .where((link) => link.linkType.startsWith('listen'))
                    .length <
                3,
          )
          .length,
      worksMissingScoreLinks: catalog.works
          .where((work) => work.scoreLinks.isEmpty)
          .length,
      concertsWithRawText: catalog.concerts
          .where((concert) => concert.programRawText.isNotEmpty)
          .length,
      expectedProgramItems: expectedProgramItems,
      matchedProgramItems: matchedProgramItems,
      promotionsMissingDisclosure: catalog.promotions
          .where((promotion) => promotion.sponsorLabel.trim().isEmpty)
          .length,
      promotionReports: const PromotionReportBuilder().build(
        promotions: catalog.promotions,
        concerts: catalog.concerts,
        events: recentEvents,
      ),
      recentEventTypes: recentEvents
          .map((event) => event.eventType)
          .take(8)
          .toList(growable: false),
    );
  }

  final ClassicalCatalogSnapshot catalog;
  final CatalogValidationReport validationReport;
  final int workCount;
  final int composerCount;
  final int concertCount;
  final int promotionCount;
  final int minimumWorkTarget;
  final int launchWorkTarget;
  final int previewLinkCount;
  final double previewCoveragePercent;
  final int concertLinkedWorkCount;
  final int worksMissingListeningMoments;
  final int worksMissingExternalLinks;
  final int worksMissingScoreLinks;
  final int concertsWithRawText;
  final int expectedProgramItems;
  final int matchedProgramItems;
  final int promotionsMissingDisclosure;
  final List<PromotionReportSummary> promotionReports;
  final List<String> recentEventTypes;
}
