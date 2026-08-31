import 'classical_discovery_models.dart';

class PromotionReportSummary {
  const PromotionReportSummary({
    required this.promotionId,
    required this.concertId,
    required this.advertiserName,
    required this.impressions,
    required this.clicks,
    required this.saves,
    required this.dismisses,
    required this.ticketClicks,
  });

  final String promotionId;
  final String concertId;
  final String advertiserName;
  final int impressions;
  final int clicks;
  final int saves;
  final int dismisses;
  final int ticketClicks;

  double get ctr => impressions == 0 ? 0 : clicks / impressions;
  double get saveRate => impressions == 0 ? 0 : saves / impressions;
  double get dismissRate => impressions == 0 ? 0 : dismisses / impressions;
}

class PromotionReportBuilder {
  const PromotionReportBuilder();

  List<PromotionReportSummary> build({
    required List<ConcertPromotion> promotions,
    required List<ClassicalConcert> concerts,
    required List<DiscoveryEvent> events,
  }) {
    return promotions
        .map((promotion) {
          final concertId = concerts
              .where((concert) => concert.id == promotion.concertId)
              .map((concert) => concert.id)
              .cast<String?>()
              .firstOrNull;
          return PromotionReportSummary(
            promotionId: promotion.id,
            concertId: promotion.concertId,
            advertiserName: promotion.advertiserName,
            impressions: _count(events, 'promotion_impression', promotion.id),
            clicks: _count(events, 'promotion_click', promotion.id),
            saves: concertId == null
                ? 0
                : _count(events, 'concert_save', concertId),
            dismisses: _count(events, 'promotion_dismiss', promotion.id),
            ticketClicks: concertId == null
                ? 0
                : _count(events, 'ticket_destination_click', concertId),
          );
        })
        .toList(growable: false);
  }

  int _count(List<DiscoveryEvent> events, String eventType, String entityId) {
    return events
        .where((event) => event.eventType == eventType)
        .where((event) => event.entityId == entityId)
        .length;
  }
}
