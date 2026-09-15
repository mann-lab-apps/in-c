import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_catalog.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'TestFlight founder preview is reproducible and never a real listen',
    () async {
      final store = _MemoryStore();
      final controller = ClassicalDiscoveryController(
        store: store,
        clock: () => DateTime(2026, 9, 15, 9),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      addTearDown(controller.dispose);
      await controller.load();
      final before = store.state;
      final writesBefore = store.writes;
      final week = controller.founderSevenDayPreview();
      final repeated = controller.founderSevenDayPreview();
      final known = controller
          .previewTasteStart(FounderTasteProfile.current.favoriteInputs)!
          .items
          .map((item) => item.matchedWorkId)
          .whereType<String>()
          .toSet();

      expect(week, hasLength(7));
      expect(week.map((day) => day.work.id).toSet(), hasLength(7));
      expect(
        week.map((day) => day.work.id),
        repeated.map((day) => day.work.id),
      );
      expect(
        week.take(3).map((day) => day.work.composerId).toSet(),
        hasLength(3),
      );
      for (final day in week.take(3)) {
        expect(known, isNot(contains(day.work.id)));
        expect(day.pick.reason.trim(), isNotEmpty);
        expect(day.pick.listenFor.trim(), isNotEmpty);
      }
      expect(store.state, same(before));
      expect(store.writes, writesBefore);
      expect(controller.tasteIntakeItems, isEmpty);
      expect(
        controller.founderDailyPickQualitySnapshot().founderApproval,
        'NOT_VERIFIED',
      );

      // This is a diagnostic of the shipped ranking, not a curated or heard playlist.
      // ignore: avoid_print
      print(
        jsonEncode({
          'evidence': 'SIMULATION_ONLY',
          'date': '2026-09-15',
          'days': [
            for (final day in week)
              {
                'day': day.day,
                'workId': day.work.id,
                'title': day.work.titleKo,
                'reason': day.pick.reason,
                'sourceEvidence': day.pick.sourceEvidence,
                'listenFor': day.pick.listenFor,
              },
          ],
        }),
      );
    },
  );

  test(
    'sparse composer rotation keeps the bridge and same-day pin on reopen',
    () async {
      final works = ClassicalDiscoveryCatalog.works
          .where(
            (work) => {
              'beethoven-symphony-9',
              'beethoven-moonlight',
              'beethoven-fur-elise',
            }.contains(work.id),
          )
          .toList();
      final store = _MemoryStore();
      var now = DateTime(2026, 9, 15, 9);
      ClassicalDiscoveryController create() => ClassicalDiscoveryController(
        store: store,
        works: works,
        clock: () => now,
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      final source = create();
      final intake = source.previewTasteStart(['베토벤 교향곡 9번'])!;
      store.state = store.state.copyWith(tasteIntakeItems: intake.items);
      source.dispose();
      final controller = create();
      addTearDown(controller.dispose);
      await controller.load();
      final first = await controller.ensureDailyPick();
      now = DateTime(2026, 9, 16, 9);
      final second = await controller.ensureDailyPick();
      expect(second.workId, isNot(first.workId));
      expect(controller.workById(second.workId)!.composerId, 'beethoven');
      expect(second.sourceEvidence, contains('베토벤 교향곡 9번'));
      final reopened = create();
      addTearDown(reopened.dispose);
      await reopened.load();
      expect(reopened.dailyPick().workId, second.workId);
      expect(store.state.tasteIntakeItems.single.rawInput, '베토벤 교향곡 9번');
    },
  );
}

class _MemoryStore extends ClassicalDiscoveryStore {
  UserDiscoveryState state = UserDiscoveryState.defaultState;
  int writes = 0;

  @override
  Future<UserDiscoveryState> loadState() async => state;

  @override
  Future<void> saveState(UserDiscoveryState value) async {
    writes += 1;
    state = value;
  }
}
