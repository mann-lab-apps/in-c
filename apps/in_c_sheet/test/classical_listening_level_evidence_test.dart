import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'intake, saves and repeated external attempts do not raise listening level',
    () async {
      final store = _MemoryStore();
      final controller = _controller(store, () => DateTime(2026, 9, 15, 9));
      await controller.load();
      await controller.addTasteIntakeInputs([
        for (var i = 0; i < 12; i++) 'unknown favorite $i',
      ]);
      final work = controller.workById('bach-air')!;
      for (var i = 0; i < 20; i++) {
        await controller.recordProviderClick(work, work.externalLinks.first);
      }
      for (final candidate in controller.works.take(10)) {
        await controller.toggleSaveWork(candidate.id);
      }
      expect(controller.listeningLevelSnapshot().level, '첫 입구');
      expect(controller.listeningLevelSnapshot().confidence, 0);
      final reopened = _controller(store, () => DateTime(2026, 9, 15, 9));
      await reopened.load();
      expect(reopened.listeningLevelSnapshot().level, '첫 입구');
      expect(reopened.listeningLevelSnapshot().confidence, 0);
      reopened.dispose();
      controller.dispose();
    },
  );

  test(
    'same-day repeated reactions and completions are one confirmed day',
    () async {
      final controller = _controller(
        _MemoryStore(),
        () => DateTime(2026, 9, 15, 9),
      );
      await controller.load();
      final work = controller.workById('bach-air')!;
      for (var i = 0; i < 10; i++) {
        await controller.addReaction(work.id, 'liked');
        await controller.completeMoment(work.id, work.primaryMoment!.id);
      }
      await controller.addReaction('chopin-nocturne-op9-2', 'liked');
      expect(controller.listeningLevelSnapshot().level, '첫 입구');
      expect(controller.listeningLevelSnapshot().confidence, 1);
      controller.dispose();
    },
  );

  test(
    'confirmed days survive recent-history compaction and reaction correction',
    () async {
      var now = DateTime(2026, 9, 13, 9);
      final store = _MemoryStore();
      final controller = _controller(store, () => now);
      await controller.load();
      for (var day = 13; day <= 15; day++) {
        now = DateTime(2026, 9, day, 9);
        await controller.addReaction('bach-air', 'liked');
      }
      expect(controller.listeningLevelSnapshot().level, '익숙해지는 중');
      expect(controller.listeningLevelSnapshot().confidence, 3);
      await controller.updateReaction(
        controller.state.reactions.first.id,
        'unsure',
      );
      expect(controller.listeningLevelSnapshot().confidence, 3);
      expect(controller.listeningLevelSnapshot().level, '익숙해지는 중');
      store.state = controller.state.copyWith(reactions: [], events: []);
      final reopened = _controller(store, () => now);
      await reopened.load();
      expect(reopened.listeningLevelSnapshot().level, '익숙해지는 중');
      expect(reopened.listeningLevelSnapshot().confidence, 3);
      reopened.dispose();
      controller.dispose();
    },
  );

  test(
    'future-dated confirmation does not advance current listening level',
    () async {
      var now = DateTime(2026, 9, 16, 9);
      final controller = _controller(_MemoryStore(), () => now);
      await controller.load();
      await controller.addReaction('bach-air', 'liked');
      now = DateTime(2026, 9, 15, 9);
      expect(controller.listeningLevelSnapshot().level, '첫 입구');
      expect(controller.listeningLevelSnapshot().confidence, 0);
      controller.dispose();
    },
  );
}

ClassicalDiscoveryController _controller(
  _MemoryStore store,
  DateTime Function() clock,
) => ClassicalDiscoveryController(
  store: store,
  clock: clock,
  notificationGateway: const DisabledClassicalDailyNotificationGateway(),
);

class _MemoryStore extends ClassicalDiscoveryStore {
  UserDiscoveryState state = UserDiscoveryState.defaultState;
  @override
  Future<UserDiscoveryState> loadState() async => state;
  @override
  Future<void> saveState(UserDiscoveryState value) async => state = value;
}
