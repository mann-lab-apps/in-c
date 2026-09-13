import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_c_sheet/classical_daily_notification.dart';
import 'package:in_c_sheet/classical_discovery_controller.dart';
import 'package:in_c_sheet/classical_discovery_app.dart';
import 'package:in_c_sheet/classical_discovery_screen.dart';
import 'package:in_c_sheet/classical_discovery_models.dart';
import 'package:in_c_sheet/classical_discovery_store.dart';
import 'package:in_c_sheet/classical_discovery_repository.dart';
import 'package:in_c_sheet/classical_discovery_ops.dart';
import 'package:in_c_sheet/classical_discovery_data_source.dart';
import 'package:in_c_sheet/classical_link_launcher.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('successful save clears a recovered-backup warning', () async {
    const key = 'in_c_recovery_warning_test';
    final snapshot = UserDiscoveryState.defaultState.copyWith(region: '부산');
    SharedPreferences.setMockInitialValues({
      key: 'broken',
      '${key}_backup': UserDiscoveryState.encode(snapshot),
    });
    final store = ClassicalDiscoveryStore(storageKey: key);
    final recovered = await store.loadState();
    expect(store.recoveryMessage, isNotNull);
    expect(recovered.region, '부산');
    await store.saveState(recovered);
    expect(store.recoveryMessage, isNull);
    expect((await store.loadState()).region, '부산');
  });

  test(
    'equal-time unlink wins a conflicting selection in either merge order',
    () {
      final selected = TasteIntakeItem(
        id: 'same',
        label: 'zzzz',
        rawInput: 'b',
        sourceType: 'catalog_match',
        confidence: 100,
        createdAt: DateTime(2026, 9, 1),
        updatedAt: DateTime(2026, 9, 2),
        matchOrigin: 'user_selected',
        matchedWorkId: 'bach-air',
        matchedComposerId: 'bach',
      );
      final cleared = TasteIntakeItem.fromJson({
        ...selected.toJson(),
        'label': 'b',
        'sourceType': 'free_text',
        'confidence': 0,
        'matchedWorkId': null,
        'matchedComposerId': null,
        'matchOrigin': 'user_unlinked',
      });
      final a = UserDiscoveryState.defaultState.copyWith(
        tasteIntakeItems: [selected],
      );
      final b = UserDiscoveryState.defaultState.copyWith(
        tasteIntakeItems: [cleared],
      );
      const merger = DiscoveryStateMerger();
      expect(
        merger.merge(a, b).tasteIntakeItems.single.matchOrigin,
        'user_unlinked',
      );
      expect(
        merger.merge(b, a).tasteIntakeItems.single.matchOrigin,
        'user_unlinked',
      );
    },
  );

  test(
    'unlink removes inferred axes and retry preserves explicit replacement',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final store = MemoryStore();
      final controller = buildController(store, clock: () => now);
      await controller.load();
      await controller.addTasteIntakeInputs(['바흐 푸가']);
      final id = controller.tasteIntakeItems.single.id;
      expect(controller.tasteAxisScores(), isNotEmpty);
      final earlier = store.state;
      final earlierNext = controller
          .nextThreeRecommendations()
          .map((r) => r.work.id)
          .toList();
      await controller.correctTasteIntakeMatch(id);
      expect(controller.tasteAxisScores(), isEmpty);
      expect(
        controller.listeningMapProgress().userState.openedNodeIds,
        isEmpty,
      );
      store.failWrites = true;
      await controller.correctTasteIntakeMatch(
        id,
        workId: 'debussy-clair-de-lune',
      );
      expect(controller.persistenceMessage, isNotNull);
      expect(store.state.tasteIntakeItems.single.matchOrigin, 'user_unlinked');
      store.failWrites = false;
      await controller.retryPersistence();
      expect(controller.persistenceMessage, isNull);
      final selected = store.state;
      final next = controller
          .nextThreeRecommendations()
          .map((r) => r.work.id)
          .toList();
      expect(next, isNot(earlierNext));
      const merger = DiscoveryStateMerger();
      await controller.correctTasteIntakeMatch(id);
      final cleared = store.state;
      final a = merger.merge(merger.merge(earlier, selected), cleared);
      final b = merger.merge(earlier, merger.merge(selected, cleared));
      expect(jsonEncode(a.toJson()), jsonEncode(b.toJson()));
      expect(a.tasteIntakeItems.single.matchOrigin, 'user_unlinked');
      expect(
        merger.merge(a, selected).tasteIntakeItems.single.matchOrigin,
        'user_unlinked',
      );
      now = DateTime(2026, 9, 2, 9);
      expect(controller.dailyPick().reason, isNot(contains('연결을 수정')));
      controller.dispose();
    },
  );

  testWidgets('taste connections can select and unlink on a small screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = buildController(MemoryStore());
    await controller.load();
    await controller.addTasteIntakeInputs(['b']);
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.6)),
          child: child!,
        ),
        home: ClassicalTasteConnectionsScreen(controller: controller),
      ),
    );
    await tester.tap(find.byType(ListTile));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '비발디 봄');
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byType(ListTile).first);
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    expect(controller.tasteIntakeItems.single.matchedWorkId, 'vivaldi-spring');
    expect(controller.tasteIntakeItems.single.matchOrigin, 'user_selected');
    await tester.tap(find.byType(ListTile));
    await tester.pumpAndSettle();
    await tester.tap(find.text('연결 없이 원문만 남기기'));
    await tester.pumpAndSettle();
    expect(controller.tasteIntakeItems.single.rawInput, 'b');
    expect(controller.tasteIntakeItems.single.matchedWorkId, isNull);
    expect(find.textContaining('연결 해제'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });

  test(
    'legacy taste correction preserves raw history and survives stale merges',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final store = MemoryStore();
      final controller = buildController(store, clock: () => now);
      await controller.load();
      await controller.addTasteIntakeInputs(['드뷔시 달빛']);
      final original = store.state.tasteIntakeItems.single;
      final legacyJson = original.toJson()
        ..['rawInput'] = 'b'
        ..remove('matchOrigin')
        ..remove('updatedAt');
      store.state = store.state.copyWith(
        tasteIntakeItems: [TasteIntakeItem.fromJson(legacyJson)],
      );
      controller.dispose();
      final edited = buildController(store, clock: () => now);
      await edited.load();
      final stale = store.state;
      final pick = edited.dailyPick();
      await edited.toggleSaveWork(original.matchedWorkId!);
      final workStates = jsonEncode(store.state.toJson()['workStates']);
      final previousScore = edited.tasteAxisScores().fold(
        0,
        (sum, axis) => sum + axis.score,
      );
      expect(edited.tasteIntakeItems.single.matchOrigin, 'legacy');
      now = now.add(const Duration(minutes: 1));
      await edited.correctTasteIntakeMatch(original.id);
      final unlinked = edited.tasteIntakeItems.single;
      expect(unlinked.rawInput, 'b');
      expect(unlinked.matchedWorkId, isNull);
      expect(unlinked.matchedComposerId, isNull);
      expect(unlinked.matchOrigin, 'user_unlinked');
      expect(jsonEncode(store.state.toJson()['workStates']), workStates);
      expect(edited.dailyPick().workId, pick.workId);
      expect(edited.dailyPick().reason, contains('연결을 수정'));
      expect(
        edited.tasteAxisScores().fold(0, (sum, axis) => sum + axis.score),
        lessThan(previousScore),
      );
      const merger = DiscoveryStateMerger();
      final corrected = store.state;
      for (final merged in [
        merger.merge(stale, corrected),
        merger.merge(corrected, stale),
      ]) {
        store.state = UserDiscoveryState.fromJson(merged.toJson());
        final reopened = buildController(store, clock: () => now);
        await reopened.load();
        expect(reopened.tasteIntakeItems.single.matchOrigin, 'user_unlinked');
        expect(reopened.tasteIntakeItems.single.matchedWorkId, isNull);
        expect(reopened.dailyPick().workId, pick.workId);
        reopened.dispose();
      }
      await edited.correctTasteIntakeMatch(
        original.id,
        workId: 'vivaldi-spring',
      );
      expect(edited.tasteIntakeItems.single.matchOrigin, 'user_selected');
      expect(edited.tasteIntakeItems.single.rawInput, 'b');
      expect(edited.tasteIntakeItems.single.matchedComposerId, 'vivaldi');
      await edited.correctTasteIntakeMatch(original.id);
      expect(
        edited.tasteIntakeItems.single.updatedAt!.isAfter(unlinked.updatedAt!),
        isTrue,
      );
      expect(
        merger
            .merge(corrected, store.state)
            .tasteIntakeItems
            .single
            .matchedWorkId,
        isNull,
      );
      expect(
        () => edited.correctTasteIntakeMatch(original.id, workId: 'missing'),
        throwsArgumentError,
      );
      edited.dispose();
    },
  );

  test('first-day reminder does not claim a missed previous day', () async {
    var now = DateTime(2026, 9, 1, 9);
    final controller = buildController(MemoryStore(), clock: () => now);
    await controller.load();
    await controller.skipOnboarding();
    expect(controller.dailyPickReminderMessage(), '오늘 한 곡만 열어볼까요?');
    now = DateTime(2026, 9, 2, 9);
    expect(controller.dailyPickReminderMessage(), contains('잠시 쉬었어도'));
    expect(controller.dailyPickReminderMessage(), isNot(contains('어제')));
    controller.dispose();
  });

  test(
    'taste intake does not turn fuzzy search fragments into asserted favorites',
    () {
      final controller = buildController(MemoryStore());
      for (final input in ['Bachata Rosa', 'Ravelry', 'b', '하이']) {
        final item = controller.previewTasteStart([input])!.items.single;
        expect(item.matchedComposerId, isNull, reason: input);
        expect(item.matchedWorkId, isNull, reason: input);
        expect(item.rawInput, input);
      }
      final fragment = controller.previewTasteStart(['비발디 여'])!.items.single;
      expect(fragment.matchedComposerId, 'vivaldi');
      expect(fragment.matchedWorkId, isNull);
      expect(controller.searchWorks('여'), isNotEmpty);
      for (final input in ['Bach', '바흐 푸가']) {
        final item = controller.previewTasteStart([input])!.items.single;
        expect(item.matchedComposerId, 'bach');
      }
      controller.dispose();
    },
  );
  test(
    'ambiguous or different Chopin nocturnes do not invent an Op9 No2 favorite',
    () {
      final controller = buildController(MemoryStore());
      for (final input in [
        '쇼팽 야상곡',
        '쇼팽 야상곡 20번',
        '쇼팽 녹턴 Op. 48 No. 1',
        '쇼팽 야상곡 9-20번',
        '쇼팽 야상곡 999999999999999999999999999999999999번',
      ]) {
        final item = controller.previewTasteStart([input])!.items.single;
        expect(item.matchedWorkId, isNull, reason: input);
        expect(item.matchedComposerId, 'chopin');
        expect(item.rawInput, input);
      }
      for (final input in ['쇼팽 야상곡 9-2번', '쇼팽 녹턴 Op. 9 No. 2']) {
        expect(
          controller.previewTasteStart([input])!.items.single.matchedWorkId,
          'chopin-nocturne-op9-2',
        );
      }
      controller.dispose();
    },
  );

  test('numbered nicknames do not match longer different work numbers', () {
    final controller = buildController(MemoryStore());
    for (final input in ['베토벤 교향곡 90번', '드보르작 교향곡 90번', '라흐마니노프 피아노협주곡 20번']) {
      expect(
        controller.previewTasteStart([input])!.items.single.matchedWorkId,
        isNull,
        reason: input,
      );
    }
    controller.dispose();
  });

  test('composer plus title intake matches work but composer-only does not invent one', () async {
    final controller = buildController(MemoryStore());
    await controller.load();
    final expected = {
      '비발디 봄': 'vivaldi-spring',
      '봄 비발디': 'vivaldi-spring',
      'Vivaldi Spring': 'vivaldi-spring',
      '드뷔시 달빛': 'debussy-clair-de-lune',
    };
    for (final entry in expected.entries) {
      final item = controller.previewTasteStart([entry.key])!.items.single;
      expect(item.matchedWorkId, entry.value, reason: entry.key);
      expect(controller.searchWorks(entry.key).first.id, entry.value);
    }
    final composer = controller.previewTasteStart(['비발디'])!.items.single;
    expect(composer.matchedWorkId, isNull);
    expect(composer.matchedComposerId, 'vivaldi');
    expect(
      controller
          .previewTasteStart(['비발디 알려지지 않은 작품'])!
          .items
          .single
          .matchedWorkId,
      isNull,
    );
    controller.dispose();
  });

  for (final change in [
    'removed',
    'unreviewed',
    'bad-moment',
    'missing-moment',
  ]) {
    test(
      'catalog revision replaces $change Daily without losing prior listening',
      () async {
        final store = MemoryStore();
        final original = buildController(store);
        await original.load();
        await original.skipOnboarding();
        final before = original.dailyPick();
        await original.addReaction(before.workId, 'liked');
        final saved = store.state;
        final works = original.works
            .where((work) => change != 'removed' || work.id != before.workId)
            .map((work) {
              if (work.id != before.workId) return work;
              if (change == 'unreviewed') {
                return work.copyWith(catalogStatusTags: ['needs_copy_review']);
              }
              return work.copyWith(
                listeningMoments: change == 'missing-moment'
                    ? []
                    : work.listeningMoments
                          .map(
                            (moment) => ListeningMoment(
                              id: moment.id,
                              label: moment.label,
                              startSeconds: moment.startSeconds,
                              endSeconds: -1,
                              prompt: moment.prompt,
                              tags: moment.tags,
                            ),
                          )
                          .toList(),
              );
            })
            .toList();
        final revised = ClassicalDiscoveryController(
          store: store,
          works: works,
          clock: () => DateTime(2026, 9, 1, 10),
          notificationGateway:
              const DisabledClassicalDailyNotificationGateway(),
        );
        await revised.load();
        final replacement = revised.dailyPick();
        expect(replacement.workId, isNot(before.workId));
        expect(replacement.isCompleted, isFalse);
        expect(replacement.catalogRevision, 1);
        expect(replacement.replacedWorkId, before.workId);
        expect(replacement.replacementNotice, isNotNull);
        expect(
          revised.state.events.where(
            (e) => e.eventType == 'daily_pick_replaced',
          ),
          hasLength(1),
        );
        expect(
          revised.state.stateForWork(before.workId).confirmedListenDays,
          saved.stateForWork(before.workId).confirmedListenDays,
        );
        expect(
          revised.state.reactions.map((reaction) => reaction.id),
          saved.reactions.map((reaction) => reaction.id),
        );
        final reloaded = ClassicalDiscoveryController(
          store: store,
          works: works,
          clock: () => DateTime(2026, 9, 1, 11),
          notificationGateway:
              const DisabledClassicalDailyNotificationGateway(),
        );
        await reloaded.load();
        expect(reloaded.dailyPick().toJson(), replacement.toJson());
        expect(
          reloaded.state.events.where(
            (e) => e.eventType == 'daily_pick_replaced',
          ),
          hasLength(1),
        );
        const merger = DiscoveryStateMerger();
        for (final merged in [
          merger.merge(saved, store.state),
          merger.merge(store.state, saved),
        ]) {
          expect(merged.dailyPicks.single.toJson(), replacement.toJson());
          expect(
            merger.merge(merged, saved).dailyPicks.single.toJson(),
            replacement.toJson(),
          );
        }
        reloaded.dispose();
        revised.dispose();
        original.dispose();
      },
    );
  }

  testWidgets(
    'withdrawn Daily has no stale card without candidates and recovers on notification',
    (tester) async {
      final store = MemoryStore();
      final source = buildController(store);
      await source.load();
      await source.skipOnboarding();
      final original = source.dailyPick();
      final unavailable = ClassicalDiscoveryController(
        store: store,
        works: const [],
        clock: () => DateTime(2026, 9, 1, 10),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await unavailable.load();
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: unavailable));
      await tester.pumpAndSettle();
      expect(find.text('지금은 추천할 작품을 준비 중이에요'), findsOneWidget);
      expect(tester.takeException(), isNull);
      expect(store.state.dailyPicks.single.toJson(), original.toJson());
      await tester.pumpWidget(const SizedBox.shrink());
      unavailable.dispose();
      final gateway = NotificationGateway()
        ..payload = jsonEncode({'version': 1, 'route': 'today'});
      var now = DateTime(2026, 9, 1, 11);
      final recovered = ClassicalDiscoveryController(
        store: store,
        works: source.works
            .where((work) => work.id != original.workId)
            .toList(),
        clock: () => now,
        notificationGateway: gateway,
      );
      await recovered.load();
      final replacement = recovered.dailyPick();
      expect(replacement.workId, isNot(original.workId));
      expect(replacement.openedFromNotification, isTrue);
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: recovered));
      await tester.pumpAndSettle();
      expect(find.text(replacement.replacementNotice!), findsWidgets);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('daily-pick-replacement-notice')),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      now = DateTime(2026, 9, 2, 11);
      final tomorrow = await recovered.ensureDailyPick();
      expect(tomorrow.date.day, 2);
      expect(tomorrow.catalogRevision, 0);
      expect(tomorrow.replacementNotice, isNull);
      expect(recovered.state.dailyPicks, hasLength(2));
      await tester.pumpWidget(const SizedBox.shrink());
      recovered.dispose();
      source.dispose();
      await gateway.signals.close();
    },
  );

  test(
    'valid same-day Daily survives unrelated catalog additions unchanged',
    () async {
      final store = MemoryStore();
      final source = buildController(store);
      await source.load();
      await source.skipOnboarding();
      final pick = source.dailyPick();
      final restored = ClassicalDiscoveryController(
        store: store,
        works: source.works.reversed.toList(),
        clock: () => DateTime(2026, 9, 1, 12),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await restored.load();
      expect(restored.dailyPick().toJson(), pick.toJson());
      expect(
        restored.state.events.where(
          (e) => e.eventType == 'daily_pick_replaced',
        ),
        isEmpty,
      );
      restored.dispose();
      source.dispose();
    },
  );

  test('equal-timestamp work and preference conflicts converge in either direction', () {
    final now = DateTime(2026, 9, 1);
    final left = UserDiscoveryState.defaultState.copyWith(
      preferredPlatformId: 'spotify',
      preferencesUpdatedAt: now,
      workStates: {
        'bach-air': UserWorkState(
          workId: 'bach-air',
          saved: true,
          familiarityLevel: 1,
          updatedAt: now,
        ),
      },
    );
    final right = left.copyWith(
      preferredPlatformId: 'youtube',
      workStates: {
        'bach-air': left.workStates['bach-air']!.copyWith(saved: false),
      },
    );
    const merger = DiscoveryStateMerger();
    final a = merger.merge(left, right);
    final b = merger.merge(right, left);
    expect(a.preferredPlatformId, b.preferredPlatformId);
    expect(
      a.stateForWork('bach-air').toJson(),
      b.stateForWork('bach-air').toJson(),
    );
    expect(a.stateForWork('bach-air').saved, isFalse);
  });

  test(
    'three-way work merges do not use accumulated days to choose a revision',
    () {
      final now = DateTime(2026, 9, 1);
      UserDiscoveryState snapshot(String day, String reaction) =>
          UserDiscoveryState.defaultState.copyWith(
            workStates: {
              'bach-air': UserWorkState(
                workId: 'bach-air',
                saved: false,
                familiarityLevel: 1,
                updatedAt: now,
                confirmedListenDays: {day},
                latestReactionType: reaction,
              ),
            },
          );
      final a = snapshot('2026-01-01', 'liked');
      final b = snapshot('2026-02-01', 'repeat');
      final c = snapshot('2026-01-15', 'unsure');
      const merger = DiscoveryStateMerger();
      final left = merger.merge(merger.merge(a, b), c);
      final right = merger.merge(a, merger.merge(b, c));
      expect(
        left.stateForWork('bach-air').latestReactionType,
        right.stateForWork('bach-air').latestReactionType,
      );
      expect(left.stateForWork('bach-air').confirmedListenDays, {
        '2026-01-01',
        '2026-01-15',
        '2026-02-01',
      });
      expect(
        merger.merge(left, a).stateForWork('bach-air').latestReactionType,
        left.stateForWork('bach-air').latestReactionType,
      );
    },
  );

  test('immutable ID conflicts converge and cannot certify human evidence', () {
    final now = DateTime(2026, 9, 1);
    UserDiscoveryState snapshot(String variant, String kind) =>
        UserDiscoveryState.defaultState.copyWith(
          tasteIntakeItems: [
            TasteIntakeItem(
              id: 'input',
              label: variant,
              rawInput: variant,
              sourceType: 'free_text',
              confidence: 20,
              createdAt: now,
            ),
          ],
          postConcertReflections: [
            PostConcertReflection(
              id: 'reflection',
              workId: 'bach-air',
              reactionType: 'liked',
              occurredAt: now,
              note: variant,
            ),
          ],
          reactions: [
            ClassicalReaction(
              id: 'reaction',
              workId: variant,
              type: 'liked',
              occurredAt: now,
            ),
          ],
          events: [
            DiscoveryEvent(
              id: 'event',
              eventType: 'feedback_submit',
              entityType: 'user',
              entityId: 'founder',
              occurredAt: now,
              context: 'founder_intent',
              properties: {
                'testerId': 'founder',
                'evidenceKind': kind,
                'wouldTryThreeDays': 'true',
                'note': variant,
              },
            ),
          ],
        );
    final a = snapshot('a', 'simulation');
    final b = snapshot('b', 'observed');
    const merger = DiscoveryStateMerger();
    final merged = merger.merge(a, b);
    expect(merged.toJson(), merger.merge(b, a).toJson());
    expect(merged.toJson(), merger.merge(merged, a).toJson());
    expect(merged.toJson(), merger.merge(b, merged).toJson());
    final reopened = UserDiscoveryState.fromJson(merged.toJson());
    expect(reopened.toJson(), merged.toJson());
    expect(merged.events.single.properties['mergeConflict'], 'true');
    expect(
      latestClassicalHumanObservations(merged.events, 'founder_intent'),
      isEmpty,
    );
  });

  test(
    'equal-clock retained histories have deterministic bounds and merge order',
    () {
      final now = DateTime(2026, 9, 1);
      UserDiscoveryState snapshot(int start) =>
          UserDiscoveryState.defaultState.copyWith(
            tasteIntakeItems: [
              for (var i = start; i < start + 100; i++)
                TasteIntakeItem(
                  id: 'input-$i',
                  label: '$i',
                  rawInput: '$i',
                  sourceType: 'free_text',
                  confidence: 20,
                  createdAt: now,
                ),
            ],
            postConcertReflections: [
              for (var i = start; i < start + 100; i++)
                PostConcertReflection(
                  id: 'reflection-$i',
                  workId: 'bach-air',
                  reactionType: 'liked',
                  occurredAt: now,
                ),
            ],
            reactions: [
              for (var i = start; i < start + 100; i++)
                ClassicalReaction(
                  id: 'reaction-$i',
                  workId: 'bach-air',
                  type: 'liked',
                  occurredAt: now,
                ),
            ],
            events: [
              for (var i = start; i < start + 180; i++)
                DiscoveryEvent(
                  id: 'event-$i',
                  eventType: 'app_open',
                  entityType: 'user',
                  entityId: 'fixture',
                  occurredAt: now,
                ),
            ],
          );
      const merger = DiscoveryStateMerger();
      final a = snapshot(0), b = snapshot(100);
      final result = merger.merge(a, b);
      expect(result.toJson(), merger.merge(b, a).toJson());
      expect(result.toJson(), merger.merge(result, a).toJson());
      expect(result.tasteIntakeItems, hasLength(24));
      expect(result.reactions, hasLength(80));
      expect(result.postConcertReflections, hasLength(80));
      expect(result.events, hasLength(200));
    },
  );

  test(
    'merge retains bounded observations independently of routine events',
    () {
      final now = DateTime(2026, 9, 1);
      final observed = DiscoveryEvent(
        id: 'observed',
        eventType: 'feedback_submit',
        entityType: 'user',
        entityId: 'tester-fixture',
        occurredAt: now,
        properties: const {'evidenceKind': 'observed'},
      );
      final remote = UserDiscoveryState.defaultState.copyWith(
        events: [observed],
      );
      final local = UserDiscoveryState.defaultState.copyWith(
        events: [
          for (var i = 0; i < 405; i++)
            DiscoveryEvent(
              id: 'routine-$i',
              eventType: 'app_open',
              entityType: 'user',
              entityId: 'local',
              occurredAt: now.add(Duration(minutes: i + 1)),
            ),
        ],
      );
      final result = const DiscoveryStateMerger().merge(local, remote);
      expect(result.events.map((event) => event.id), contains('observed'));
      expect(result.events, hasLength(201));
    },
  );

  test(
    'founder excerpts identify the reviewed scene without inventing playback',
    () {
      final controller = buildController(MemoryStore());
      final swan = controller.workById('tchaikovsky-swan-lake')!;
      expect(swan.titleKo, contains('2막 10번'));
      expect(swan.titleOriginal, contains('Act II, No. 10'));
      expect(swan.catalogNumber, 'Op. 20');
      expect(swan.primaryMoment!.prompt, contains('오보에'));
      expect(
        swan.externalLinks.every((link) => link.linkType == 'listen_search'),
        isTrue,
      );
      final dance = controller.workById('brahms-hungarian-dance-5')!;
      expect(dance.primaryMoment!.prompt, isNot(contains('느린 듯 시작')));
      expect(dance.primaryMoment!.prompt, contains('선율'));
      controller.dispose();
    },
  );

  test('founder Brahms guide does not prescribe an unsupported emotional progression', () {
    final controller = buildController(MemoryStore());
    final prompt = controller
        .workById('brahms-symphony-3-iii')!
        .primaryMoment!
        .prompt;
    expect(prompt, isNot(contains('어두워')));
    expect(prompt, contains('선율'));
    controller.dispose();
  });

  testWidgets(
    'empty and unreviewed catalogs preserve history and show an unavailable state',
    (tester) async {
      final source = buildController(MemoryStore());
      final pending = source.works.first.copyWith(
        catalogStatusTags: ['needs_copy_review'],
      );
      for (final works in <List<ClassicalWork>>[
        [],
        [pending],
        [pending.copyWith(listeningMoments: [], catalogStatusTags: [])],
      ]) {
        final store = MemoryStore()
          ..state = UserDiscoveryState.defaultState.copyWith(
            onboardingCompleted: true,
            savedConcertIds: {'kept-concert'},
          );
        final controller = ClassicalDiscoveryController(
          store: store,
          works: works,
          notificationGateway:
              const DisabledClassicalDailyNotificationGateway(),
        );
        await controller.load();
        await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('지금은 추천할 작품을 준비 중이에요'), findsOneWidget);
        expect(controller.state.dailyPicks, isEmpty);
        expect(store.state.savedConcertIds, contains('kept-concert'));
        await tester.tap(find.byTooltip('Catalog Ops'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
        controller.dispose();
      }
      source.dispose();
    },
  );

  test('unmatched intake preview does not claim a musical bridge', () async {
    final controller = buildController(MemoryStore());
    await controller.load();
    final preview = controller.previewTasteStart(['unknown music 123'])!;
    expect(preview.dailyStep.reason, contains('아직 곡을 연결하지 못해'));
    for (final item in preview.nextThree) {
      expect(item.sourceEvidence, contains('아직 곡을 연결하지 못해'));
    }
    controller.dispose();
  });

  test(
    'sparse catalog labels an unrelated candidate as an open start',
    () async {
      final source = buildController(MemoryStore());
      final anchor = source.workById('debussy-clair-de-lune')!;
      final candidate = source.workById('ravel-bolero')!;
      final controller = ClassicalDiscoveryController(
        store: MemoryStore(),
        works: [anchor, candidate],
        clock: () => DateTime(2026, 9, 1),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await controller.load();
      await controller.addTasteIntakeInputs(['드뷔시 달빛']);
      final pick = await controller.ensureDailyPick();
      expect(pick.workId, candidate.id);
      expect(pick.pickType, 'open_start');
      expect(pick.reason, contains('연결할 근거가 부족'));
      expect(pick.distanceLabel, '새로 열어보기');
      controller.dispose();
      source.dispose();
    },
  );

  test('concert unsave survives stale snapshots, reload, and either merge direction', () async {
    var now = DateTime(2026, 9, 1, 9);
    final store = MemoryStore();
    final controller = buildController(store, clock: () => now);
    await controller.load();
    final concertId = controller.concerts.first.id;
    await controller.toggleSaveConcert(concertId);
    final saved = controller.state;
    now = now.add(const Duration(seconds: 1));
    await controller.toggleSaveConcert(concertId);
    final removed = UserDiscoveryState.decode(
      UserDiscoveryState.encode(store.state),
    );
    const merger = DiscoveryStateMerger();
    for (final pair in [(removed, saved), (saved, removed)]) {
      expect(
        merger.merge(pair.$1, pair.$2).savedConcertIds,
        isNot(contains(concertId)),
      );
    }
    now = now.add(const Duration(seconds: 1));
    await controller.toggleSaveConcert(concertId);
    expect(
      merger.merge(controller.state, removed).savedConcertIds,
      contains(concertId),
    );
    controller.dispose();
  });

  testWidgets(
    'keyboard opens and dismisses the listening guide without claiming completion',
    (tester) async {
      final controller = buildController(MemoryStore());
      await controller.load();
      await controller.skipOnboarding();
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
      await tester.pumpAndSettle();
      const key = ValueKey('daily-listening-step-preview');
      bool primaryHasFocus() {
        final context = FocusManager.instance.primaryFocus?.context;
        if (context == null) return false;
        var found = context.widget.key == key;
        context.visitAncestorElements((element) {
          if (element.widget.key == key) found = true;
          return !found;
        });
        return found;
      }

      for (var i = 0; i < 30 && !primaryHasFocus(); i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
      }
      expect(primaryHasFocus(), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(find.byType(BottomSheet), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.byType(BottomSheet), findsNothing);
      expect((await controller.ensureDailyPick()).isCompleted, isFalse);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  test('next-three explanations use selected work prompts instead of invented era techniques', () async {
    final controller = buildController(MemoryStore());
    await controller.load();
    await controller.addTasteIntakeInputs(['쇼팽 야상곡 9-2번', '선율']);
    final recommendations = controller.nextThreeRecommendations();
    expect(recommendations, hasLength(3));
    for (final item in recommendations.skip(1)) {
      expect(item.reason, contains(item.work.primaryMoment!.prompt));
      expect(item.reason, isNot(contains('에서 자주 보이는')));
      expect(item.reason, isNot(contains('선율을 더 길게 끌고')));
    }
    controller.dispose();
  });

  test('newer preview-route edits survive stale remote snapshots', () async {
    final controller = buildController(MemoryStore());
    await controller.load();
    final route = await controller.createPreviewRouteFromConcert(
      controller.concerts.first.id,
    );
    expect(route, isNotNull);
    final newer = route!.copyWith(
      completionState: ConcertPreviewRouteCompletionState.completed,
      updatedAt: route.updatedAt.add(const Duration(hours: 1)),
    );
    final local = controller.state.copyWith(previewRoutes: [newer]);
    final stale = controller.state.copyWith(previewRoutes: [route]);
    for (final pair in [(local, stale), (stale, local)]) {
      expect(
        const DiscoveryStateMerger()
            .merge(pair.$1, pair.$2)
            .previewRoutes
            .single
            .completionState,
        ConcertPreviewRouteCompletionState.completed,
      );
    }
    controller.dispose();
  });

  testWidgets(
    'primary listening controls meet iOS tap and semantic label guidelines',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final controller = buildController(MemoryStore());
        await controller.load();
        await controller.skipOnboarding();
        await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
        await tester.pumpAndSettle();
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await tester.tap(
          find.byKey(const ValueKey('daily-listening-step-preview')),
        );
        await tester.pumpAndSettle();
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        expect(find.text('Melon에서 검색'), findsOneWidget);
        expect(find.text('Melon 검색에서 검색'), findsNothing);
        await tester.pumpWidget(const SizedBox.shrink());
        controller.dispose();
      } finally {
        semantics.dispose();
      }
    },
  );

  test('daily merge preserves the original pick and confirmed completion in both merge directions', () async {
    final controller = buildController(MemoryStore());
    await controller.load();
    final pick = await controller.ensureDailyPick();
    final completed = pick.copyWith(
      completedAt: DateTime(2026, 9, 1, 10),
      completionConfirmed: true,
    );
    final stale = controller.state.copyWith(dailyPicks: [pick]);
    final newer = controller.state.copyWith(dailyPicks: [completed]);
    const merger = DiscoveryStateMerger();
    for (final pair in [(newer, stale), (stale, newer)]) {
      expect(
        merger.merge(pair.$1, pair.$2).dailyPicks.single.isCompleted,
        isTrue,
      );
    }
    final other = pick.copyWith(
      workId: 'bach-air',
      createdAt: pick.createdAt.add(const Duration(hours: 1)),
    );
    final conflicting = controller.state.copyWith(dailyPicks: [other]);
    for (final pair in [(newer, conflicting), (conflicting, newer)]) {
      expect(
        merger.merge(pair.$1, pair.$2).dailyPicks.single.workId,
        pick.workId,
      );
    }
    controller.dispose();
  });

  test('early recommendations retain an independent metadata bridge across contrasting tastes', () async {
    for (final anchorId in [
      'chopin-nocturne-op9-2',
      'debussy-clair-de-lune',
      'beethoven-symphony-9',
    ]) {
      final controller = buildController(MemoryStore());
      await controller.load();
      final anchor = controller.workById(anchorId)!;
      await controller.addTasteIntakeInputs([
        '${anchor.composerNameKo} ${anchor.titleKo}',
      ]);
      expect(controller.state.tasteIntakeItems.first.matchedWorkId, anchorId);
      final week = controller.founderSevenDayPreview();
      for (final day in week.take(3)) {
        final candidate = day.work;
        final sharedMood = candidate.moodTags.toSet().intersection(
          anchor.moodTags.toSet(),
        );
        final bridge =
            candidate.composerId == anchor.composerId ||
            candidate.instrumentation == anchor.instrumentation ||
            candidate.period == anchor.period ||
            sharedMood.isNotEmpty;
        // This is a metadata constraint, not a verdict on whether a person likes it.
        expect(
          bridge,
          isTrue,
          reason:
              '$anchorId -> ${candidate.id} has no evidenced musical bridge',
        );
        expect(candidate.id, isNot(anchorId));
        expect(candidate.difficultyForListening, lessThanOrEqualTo(3));
      }
      for (final day in week.where((day) => day.pick.pickType == 'surprise')) {
        expect(
          day.work.period != anchor.period ||
              day.work.instrumentation != anchor.instrumentation,
          isTrue,
        );
        expect(day.pick.sourceEvidence, contains(anchor.titleKo));
        expect(
          day.work.catalogStatusTags,
          isNot(contains('needs_copy_review')),
        );
      }
      controller.dispose();
    }
  });

  testWidgets(
    'per-day preview assessment requires a real choice and submits without completing listening',
    (tester) async {
      final controller = buildController(MemoryStore());
      await controller.load();
      await controller.skipOnboarding();
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Catalog Ops'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('첫 7일 추천 미리보기'),
        500,
        scrollable: find.byType(Scrollable).last,
        maxScrolls: 100,
      );
      await tester.pumpAndSettle();
      final action = find.byTooltip('추천 거리 평가').first;
      await tester.ensureVisible(action);
      await tester.pumpAndSettle();
      await tester.tap(action);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, '관찰 저장'))
            .onPressed,
        isNull,
      );
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('너무 멂').last);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField).last,
        'Widget fixture, not a real user response',
      );
      await tester.ensureVisible(find.widgetWithText(FilledButton, '관찰 저장'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '관찰 저장'));
      await tester.pumpAndSettle();
      final evaluation = controller.state.events.firstWhere(
        (event) => event.context == 'daily_distance',
      );
      expect(evaluation.properties['distance'], 'too_far');
      expect(evaluation.properties['evidenceKind'], 'observed_preview');
      expect(controller.state.workStates, isEmpty);
      expect(
        controller.state.dailyPicks.every((pick) => !pick.isCompleted),
        isTrue,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  test('observations are not counted as complaint volume', () {
    final summary = ClassicalCatalogOpsSummary.fromCatalog(
      catalog: const SeedClassicalCatalogDataSource().loadCatalog(),
      recentEvents: [
        for (var index = 0; index < 5; index++)
          DiscoveryEvent(
            id: '$index',
            eventType: 'feedback_submit',
            entityType: 'app',
            entityId: 'in-c',
            occurredAt: DateTime(2026, 9, 1),
            context: 'founder_quality',
            properties: {
              'testerId': 'fixture$index',
              'evidenceKind': 'observed',
              'reasonAccepted': 'true',
            },
          ),
      ],
    );
    expect(summary.feedbackSummary.blockerCount, 0);
    expect(summary.founderQualityGate.reasonAcceptedCount, 5);
    expect(summary.founderQualityGate.ready, isFalse);
  });

  testWidgets('privacy notice is available in My Music and fits small screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 650);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = buildController(MemoryStore());
    await controller.load();
    await controller.skipOnboarding();
    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.text('My Music').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('개인정보와 콘텐츠'));
    await tester.pumpAndSettle();
    expect(find.byType(ClassicalPrivacySheet), findsOneWidget);
    expect(find.text('개인정보와 콘텐츠 안내'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });

  testWidgets('demonstration concert has no actionable ticket destination', (
    tester,
  ) async {
    final controller = buildController(MemoryStore());
    await controller.load();
    final concert = controller.concerts.first;
    expect(concert.isDemonstration, isTrue);
    await tester.pumpWidget(
      MaterialApp(
        home: ClassicalConcertDetailScreen(
          controller: controller,
          concert: concert,
        ),
      ),
    );
    expect(find.text('예시 공연 · 실제 일정이 아닙니다'), findsOneWidget);
    for (var index = 0; index < 6; index++) {
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pumpAndSettle();
    }
    expect(find.text('실제 예매 정보가 없는 예시입니다.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    expect(
      controller.state.events.where(
        (e) => e.eventType == 'ticket_destination_click',
      ),
      isEmpty,
    );
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });

  test(
    'scheduled reminder follows new and corrected reactions without reopening',
    () async {
      final gateway = NotificationGateway();
      final controller = buildController(MemoryStore(), gateway: gateway);
      await controller.load();
      await controller.configureDailyPickReminder(enabled: true);
      final workId = controller.dailyPick().workId;
      await controller.addReaction(workId, 'unsure');
      expect(gateway.scheduled!.body, contains('가까운 곡'));
      await controller.updateReaction(
        controller.state.reactions.first.id,
        'liked',
      );
      expect(gateway.scheduled!.body, contains('좋았던 감각'));
      await controller.configureDailyPickReminder(enabled: false);
      await controller.addReaction(workId, 'unsure');
      expect(gateway.scheduled, isNull);
      controller.dispose();
      await gateway.signals.close();
    },
  );

  test('completed Daily step survives trimmed events and reactions', () async {
    final store = MemoryStore();
    final controller = buildController(store);
    await controller.load();
    final pick = await controller.ensureDailyPick();
    await controller.addReaction(pick.workId, 'liked');
    store.state = controller.state.copyWith(events: [], reactions: []);
    final restored = buildController(store);
    await restored.load();
    expect(restored.dailyPick().workId, pick.workId);
    expect(restored.dailyListeningStep().isCompleted, isTrue);
    expect(restored.continuitySummary().completedToday, isTrue);
    controller.dispose();
    restored.dispose();
  });

  test('preview judgement is human input tied to its exact snapshot, not listening evidence', () async {
    final store = MemoryStore();
    final controller = buildController(store);
    await controller.load();
    final pick = controller.founderSevenDayPreview().first.pick;
    expect(controller.dailyDistanceAssessment(pick), contains('평가 전'));
    await controller.recordDailyDistanceEvaluation(
      pick: pick,
      testerId: 'fixture-founder',
      distance: 'too_far',
      notes: 'Unit fixture response only',
    );
    expect(controller.dailyDistanceAssessment(pick), contains('너무 멂'));
    expect(
      controller.dailyDistanceAssessment(
        pick.copyWith(reason: 'changed reason'),
      ),
      contains('평가 전'),
    );
    expect(controller.state.dailyPicks, isEmpty);
    expect(controller.state.workStates, isEmpty);
    expect(
      controller.founderDailyPickQualitySnapshot().founderApproval,
      'NOT_VERIFIED',
    );
    for (var i = 0; i < 205; i++) {
      await controller.submitFeedback(
        category: 'fixture',
        message: 'routine $i',
      );
    }
    final restored = buildController(store);
    await restored.load();
    expect(restored.dailyDistanceAssessment(pick), contains('너무 멂'));
    expect(controller.state.events.length, 201);
    controller.dispose();
    restored.dispose();
  });

  test('UTC event timestamps use local daily boundaries', () async {
    final local = DateTime(2026, 9, 2, 0, 30);
    final store = MemoryStore();
    final controller = buildController(store, clock: () => local);
    await controller.load();
    final pick = await controller.ensureDailyPick();
    store.state = controller.state.copyWith(
      reactions: [
        ClassicalReaction(
          id: 'utc',
          workId: pick.workId,
          type: 'liked',
          occurredAt: local.toUtc(),
        ),
      ],
    );
    final restored = buildController(store, clock: () => local);
    await restored.load();
    expect(restored.dailyPick().isCompleted, isTrue);
    expect(restored.dailyListeningStep().isCompleted, isTrue);
    controller.dispose();
    restored.dispose();
  });

  test(
    'legacy link-only completion never unlocks surprise or daily completion',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final store = MemoryStore();
      final controller = buildController(store, clock: () => now);
      await controller.load();
      final legacy = <DailyPick>[];
      for (var day = 0; day < 3; day++) {
        now = DateTime(2026, 9, day + 1, 9);
        legacy.add(
          (await controller.ensureDailyPick()).copyWith(completedAt: now),
        );
      }
      store.state = controller.state.copyWith(dailyPicks: legacy);
      final restored = buildController(store, clock: () => now);
      await restored.load();
      expect(restored.dailyPick().isCompleted, isFalse);
      now = DateTime(2026, 9, 4, 9);
      expect((await restored.ensureDailyPick()).pickType, isNot('surprise'));
      await restored.addReaction(restored.dailyPick().workId, 'liked');
      expect(restored.dailyPick().isCompleted, isTrue);
      final reopened = buildController(store, clock: () => now);
      await reopened.load();
      expect(reopened.dailyPick().isCompleted, isTrue);
      controller.dispose();
      restored.dispose();
      reopened.dispose();
    },
  );

  test(
    'quality evidence counts identified latest observations, never simulations',
    () async {
      final controller = buildController(MemoryStore());
      await controller.load();
      expect(
        controller.founderDailyPickQualitySnapshot().founderApproval,
        'NOT_VERIFIED',
      );
      await controller.recordQualityObservation(
        category: 'founder_intent',
        testerId: 'founder',
        answers: {'wouldTryThreeDays': false},
        notes: 'Fixture response, not real founder feedback',
      );
      expect(
        controller.founderDailyPickQualitySnapshot().founderApproval,
        'NO',
      );
      DiscoveryEvent probe(
        String id,
        String? tester,
        DateTime at,
        bool accepted,
        String kind,
      ) => DiscoveryEvent(
        id: id,
        eventType: 'feedback_submit',
        entityType: 'app',
        entityId: 'in-c',
        occurredAt: at,
        context: 'founder_quality',
        properties: {
          'testerId': tester ?? '',
          'evidenceKind': kind,
          'reasonAccepted': accepted.toString(),
        },
      );
      final newer = probe('new', 'u1', DateTime(2026, 9, 2), false, 'observed');
      final older = probe('old', 'u1', DateTime(2026, 9, 1), true, 'observed');
      final samples = [
        newer,
        older,
        for (var index = 0; index < 5; index++)
          probe(
            'sim$index',
            's$index',
            DateTime(2026, 9, 2),
            true,
            'simulation',
          ),
        probe('anonymous', null, DateTime(2026, 9, 2), true, 'observed'),
      ];
      for (final rows in [samples, samples.reversed.toList()]) {
        final gate = ClassicalFounderQualityGate.fromEvents(rows);
        expect(gate.testedUserCount, 1);
        expect(gate.reasonAcceptedCount, 0);
        expect(gate.ready, isFalse);
      }
    },
  );

  testWidgets('operator observation cannot be submitted with default answers', (
    tester,
  ) async {
    final controller = buildController(MemoryStore());
    await controller.load();
    await tester.pumpWidget(
      MaterialApp(home: ClassicalCatalogOpsScreen(controller: controller)),
    );
    await tester.tap(find.byTooltip('관찰 기록'));
    await tester.pumpAndSettle();
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '관찰 저장'),
    );
    expect(button.onPressed, isNull);
    expect(controller.state.events, isEmpty);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });

  test('map progress survives recent log compaction and state codec', () async {
    var now = DateTime(2026, 9, 1, 9);
    final store = MemoryStore();
    final controller = buildController(store, clock: () => now);
    await controller.load();
    await controller.toggleSaveWork('bach-air');
    await controller.addReaction('bach-air', 'liked');
    now = DateTime(2026, 9, 2, 9);
    await controller.addReaction('bach-air', 'liked');
    store.state = UserDiscoveryState.decode(
      UserDiscoveryState.encode(
        controller.state.copyWith(reactions: [], events: []),
      ),
    );
    final restored = buildController(store, clock: () => now);
    await restored.load();
    expect(
      restored.conqueredWorks().map((work) => work.id),
      contains('bach-air'),
    );
    expect(restored.continuitySummary().completedToday, isTrue);
    expect(restored.listeningMapProgress().familiarCount, greaterThan(0));
  });

  test('sync retains independent listening days and newer reaction edits', () {
    final original = ClassicalReaction(
      id: 'r',
      workId: 'bach-air',
      type: 'liked',
      occurredAt: DateTime(2026, 9, 1),
    );
    final correction = ClassicalReaction(
      id: 'r',
      workId: 'bach-air',
      type: 'unsure',
      occurredAt: original.occurredAt,
      updatedAt: DateTime(2026, 9, 3),
    );
    UserDiscoveryState state(ClassicalReaction reaction, String day) =>
        UserDiscoveryState.defaultState.copyWith(
          reactions: [reaction],
          workStates: {
            'bach-air': UserWorkState(
              workId: 'bach-air',
              saved: true,
              familiarityLevel: 1,
              confirmedListenDays: {day},
              updatedAt: DateTime(2026, 9, 2),
            ),
          },
        );
    final local = state(correction, '2026-09-01');
    final remote = state(original, '2026-09-02');
    for (final merged in [
      const DiscoveryStateMerger().merge(local, remote),
      const DiscoveryStateMerger().merge(remote, local),
    ]) {
      expect(merged.reactions.single.type, 'unsure');
      expect(merged.stateForWork('bach-air').confirmedListenDays, {
        '2026-09-01',
        '2026-09-02',
      });
    }
  });

  test(
    'unconfigured remote storage never pretends a write succeeded',
    () async {
      const remote = SupabaseDiscoveryStateRepository();
      await expectLater(remote.loadState(), throwsUnsupportedError);
      await expectLater(
        remote.saveState(UserDiscoveryState.defaultState),
        throwsUnsupportedError,
      );
    },
  );

  test(
    'unknown songs remain recorded without inventing taste or map evidence',
    () async {
      final controller = buildController(MemoryStore());
      await controller.load();
      await controller.addTasteIntakeInputs(['Travis - Sailing Away']);
      expect(
        controller.state.tasteIntakeItems.single.rawInput,
        'Travis - Sailing Away',
      );
      expect(controller.tasteAxisScores(), isEmpty);
      expect(
        controller.listeningMapProgress().userState.openedNodeIds,
        isEmpty,
      );
      expect(controller.dailyPick().reason, contains('아직 곡을 연결하지 못해'));
      expect(controller.dailyListeningStep().moment.prompt, isNotEmpty);
      await controller.addTasteIntakeInputs(['리듬']);
      expect(controller.tasteAxisScores().first.axis, '리듬형');
    },
  );

  for (final width in [320.0, 390.0]) {
    testWidgets('Daily, guide and map fit width $width with enlarged text', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = Size(width, 844);
      tester.platformDispatcher.textScaleFactorTestValue = 1.6;
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final controller = buildController(MemoryStore());
      await controller.load();
      await controller.addTasteIntakeInputs(['쇼팽 야상곡']);
      await controller.skipOnboarding();
      await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final guide = find.byKey(const ValueKey('daily-listening-step-preview'));
      await tester.ensureVisible(guide);
      await tester.pumpAndSettle();
      await tester.tap(guide);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      Navigator.of(tester.element(find.byType(BottomSheet))).pop();
      await tester.pumpAndSettle();
      await tester.tap(find.text('My Music').last);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Concerts').last);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    });
  }

  test('only reviewed provider content routes sort ahead of safe searches', () async {
    final controller = buildController(MemoryStore());
    await controller.load();
    ExternalLink link(String id, String platform, String url, String type) =>
        ExternalLink(
          id: id,
          platformId: platform,
          label: platform,
          url: url,
          linkType: type,
        );
    // Synthetic policy fixtures, not provider records or release-catalog URLs.
    final work = controller.works.first.copyWith(
      externalLinks: [
        link(
          'search',
          'spotify',
          'https://open.spotify.com/search/Bach',
          'listen_search',
        ),
        link(
          'other',
          'youtube',
          'https://www.youtube.com/watch?v=fixture',
          'listen_direct',
        ),
        link('preferred', 'spotify', 'spotify:track:fixture', 'listen_direct'),
        link(
          'candidate',
          'spotify',
          'https://open.spotify.com/track/fixture',
          'listen_candidate',
        ),
        link('home', 'youtube', 'https://www.youtube.com/', 'listen_direct'),
        link(
          'fake-host',
          'spotify',
          'https://spotify.com.example.org/search/Bach',
          'listen_search',
        ),
        link(
          'mislabelled',
          'spotify',
          'https://open.spotify.com/search/Bach',
          'listen_direct',
        ),
      ],
    );
    expect(work.linksForPreferredPlatform('spotify').map((link) => link.id), [
      'preferred',
      'other',
      'search',
    ]);
    expect(
      preferredClassicalLaunchMode(
        Uri.parse('https://open.spotify.com/track/fixture'),
        surface: ClassicalLinkSurface.listening,
        verifiedDirect: true,
      ),
      LaunchMode.externalApplication,
    );
    expect(
      preferredClassicalLaunchMode(
        Uri.parse('https://open.spotify.com/search/Bach'),
        surface: ClassicalLinkSurface.listening,
      ),
      LaunchMode.inAppWebView,
    );
  });

  test('single-session clicks and reactions cannot claim revisited or personal repertoire', () async {
    var now = DateTime(2026, 9, 1, 9);
    final controller = buildController(MemoryStore(), clock: () => now);
    await controller.load();
    final work = controller.workById('bach-air')!;
    await controller.toggleSaveWork(work.id);
    for (var i = 0; i < 3; i++) {
      await controller.recordProviderClick(work, work.externalLinks.first);
      await controller.addReaction(work.id, 'liked');
    }
    expect(controller.conqueredWorks(), isEmpty);
    expect(
      controller.listeningMapProgress().userState.familiarNodeIds,
      isEmpty,
    );
    now = DateTime(2026, 9, 2, 9);
    await controller.addReaction(work.id, 'liked');
    expect(controller.conqueredWorks().map((w) => w.id), contains(work.id));
    expect(
      controller.listeningMapProgress().userState.familiarNodeIds,
      isNotEmpty,
    );
    await controller.updateReaction(
      controller.state.reactions.first.id,
      'unsure',
    );
    expect(controller.conqueredWorks(), isEmpty);
  });

  test(
    'malformed record collections never silently become empty history',
    () async {
      for (final value in [
        {'workStates': 'broken'},
        {
          'workStates': [
            {'saved': true},
          ],
        },
        {
          'reactions': [null],
        },
        {
          'dailyPicks': [
            {'id': 'pick'},
          ],
        },
        {
          'savedConcertIds': [12],
        },
        for (final revision in [-1, 1.5, '1'])
          {
            'dailyPicks': [
              {
                'id': 'pick',
                'workId': 'bach-air',
                'date': '2026-09-01',
                'catalogRevision': revision,
              },
            ],
          },
      ]) {
        final raw = jsonEncode(value);
        SharedPreferences.setMockInitialValues({
          'clef_classical_discovery_state': raw,
        });
        await expectLater(
          ClassicalDiscoveryStore().loadState(),
          throwsFormatException,
        );
        expect(
          (await SharedPreferences.getInstance()).getString(
            'clef_classical_discovery_state',
          ),
          raw,
        );
      }
    },
  );

  test('external link attempt is not listening completion', () async {
    final controller = buildController(MemoryStore());
    await controller.load();
    await controller.skipOnboarding();
    final pick = controller.dailyPick();
    final work = controller.workById(pick.workId)!;
    await controller.recordProviderClick(work, work.externalLinks.first);
    expect(controller.dailyPick().isCompleted, isFalse);
    expect(controller.dailyListeningStep().isCompleted, isFalse);
    expect(controller.state.stateForWork(work.id).lastListenedAt, isNull);
    expect(controller.state.events.first.eventType, 'external_platform_click');
    await controller.addReaction(work.id, 'liked');
    expect(controller.dailyPick().isCompleted, isTrue);
  });

  test(
    'unreviewed catalog backfill cannot become a daily recommendation',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final controller = buildController(MemoryStore(), clock: () => now);
      await controller.load();
      final draft = controller.works.firstWhere(
        (work) => work.catalogStatusTags.contains('catalog_backfill'),
      );
      await controller.toggleSaveWork(draft.id);
      await controller.addTasteIntakeInputs(['피아노 소나타']);
      for (var day = 1; day <= 21; day++) {
        now = DateTime(2026, 9, day, 9);
        final pick = await controller.ensureDailyPick();
        final work = controller.workById(pick.workId)!;
        expect(work.catalogStatusTags, isNot(contains('catalog_backfill')));
        expect(work.catalogStatusTags, isNot(contains('needs_copy_review')));
        await controller.addReaction(work.id, 'liked');
      }
    },
  );

  testWidgets('foreground midnight rotates the pinned pick without restart', (
    tester,
  ) async {
    var now = DateTime(2026, 9, 1, 23, 59, 59);
    final controller = buildController(MemoryStore(), clock: () => now);
    await controller.load();
    await controller.skipOnboarding();
    final first = controller.dailyPick();
    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    now = DateTime(2026, 9, 2);
    await tester.pump(const Duration(seconds: 2));
    await tester.pumpAndSettle();
    expect(controller.state.dailyPicks.first.date, DateTime(2026, 9, 2));
    expect(controller.dailyPick().workId, isNot(first.workId));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });

  test('saving is not listening and correcting a reaction updates the map after reopen', () async {
    final store = MemoryStore();
    final controller = buildController(store);
    await controller.load();
    await controller.toggleSaveWork('bach-air');
    expect(controller.state.stateForWork('bach-air').firstListenedAt, isNull);
    await controller.addReaction('bach-air', 'unsure');
    final reaction = controller.state.reactions.single;
    final unknown = controller
        .listeningMapProgress()
        .userState
        .unfamiliarNodeIds;
    expect(unknown, isNotEmpty);
    await controller.updateReaction(reaction.id, 'liked');
    expect(controller.state.stateForWork('bach-air').reactionCounts, {
      'liked': 1,
    });
    expect(controller.state.reactions.single.occurredAt, reaction.occurredAt);
    expect(
      controller.listeningMapProgress().userState.unfamiliarNodeIds,
      isEmpty,
    );
    final reopened = buildController(store);
    await reopened.load();
    expect(
      reopened.listeningMapProgress().userState.unfamiliarNodeIds,
      isEmpty,
    );
    expect(reopened.state.reactions.single.type, 'liked');
  });

  test(
    'same-clock actions have independent IDs for sync deduplication',
    () async {
      final controller = buildController(MemoryStore());
      await controller.load();
      await controller.addReaction('bach-air', 'unsure');
      await controller.addReaction('bach-air', 'liked');
      expect(controller.state.reactions.map((r) => r.id).toSet(), hasLength(2));
      expect(controller.state.events.map((e) => e.id).toSet(), hasLength(2));
      expect(
        controller.listeningMapProgress().userState.unfamiliarNodeIds,
        isEmpty,
      );
      await controller.addTasteIntakeInputs(['one unknown song']);
      await controller.addTasteIntakeInputs(['another unknown song']);
      expect(
        controller.state.tasteIntakeItems.map((item) => item.id).toSet(),
        hasLength(2),
      );
      for (var i = 0; i < 2; i++) {
        await controller.addPostConcertReflection(
          workId: 'bach-air',
          reactionType: 'liked',
          note: 'fixture $i',
        );
      }
      expect(
        controller.state.postConcertReflections.map((item) => item.id).toSet(),
        hasLength(2),
      );
      controller.dispose();
    },
  );

  test(
    'Daily listening card stays on its pinned work after another work reaction',
    () async {
      final controller = buildController(MemoryStore());
      await controller.load();
      await controller.addTasteIntakeInputs(['쇼팽 야상곡']);
      final pick = controller.dailyPick();
      final other = controller.works.firstWhere((w) => w.id != pick.workId);
      await controller.addReaction(other.id, 'liked');
      expect(controller.dailyListeningStep().work.id, pick.workId);
    },
  );

  test(
    'corrupt persisted history is preserved and load failure stays visible',
    () async {
      SharedPreferences.setMockInitialValues({
        'clef_classical_discovery_state': '{broken',
      });
      final controller = ClassicalDiscoveryController(
        store: ClassicalDiscoveryStore(),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await controller.load();
      expect(controller.loadFailed, isTrue);
      expect(controller.isLoading, isFalse);
      await controller.toggleSaveWork('bach-air');
      expect(
        (await SharedPreferences.getInstance()).getString(
          'clef_classical_discovery_state',
        ),
        '{broken',
      );
      expect(controller.persistenceMessage, isNotNull);
      controller.dispose();
    },
  );

  test(
    'last valid backup restores saved works without claiming complete recovery',
    () async {
      final seed = MemoryStore();
      final first = buildController(seed);
      await first.load();
      await first.toggleSaveWork('bach-air');
      SharedPreferences.setMockInitialValues({
        'clef_classical_discovery_state': 'broken',
        'clef_classical_discovery_state_backup': UserDiscoveryState.encode(
          seed.state,
        ),
      });
      final store = ClassicalDiscoveryStore();
      final restored = await store.loadState();
      expect(restored.stateForWork('bach-air').saved, isTrue);
      expect(store.recoveryMessage, contains('최근 변경은 빠져'));
      first.dispose();
    },
  );

  test(
    'failed write preserves in-memory edits and retry persists them',
    () async {
      final store = MemoryStore()..failWrites = true;
      final controller = buildController(store);
      await controller.load();
      await controller.toggleSaveWork('bach-air');
      expect(controller.savedWorks.single.id, 'bach-air');
      expect(store.state.workStates, isEmpty);
      expect(controller.persistenceMessage, contains('저장하지 못했습니다'));
      store.failWrites = false;
      await controller.retryPersistence();
      final restored = buildController(store);
      await restored.load();
      expect(restored.savedWorks.single.id, 'bach-air');
      expect(controller.persistenceMessage, isNull);
    },
  );

  for (final primary in [null, 42]) {
    test('backup survives absent or wrong-type primary: $primary', () async {
      final state = UserDiscoveryState.defaultState.copyWith(
        workStates: {
          'bach-air': const UserWorkState(
            workId: 'bach-air',
            saved: true,
            familiarityLevel: 0,
          ),
        },
      );
      final encoded = UserDiscoveryState.encode(state);
      SharedPreferences.setMockInitialValues({
        'clef_classical_discovery_state': ?primary,
        'clef_classical_discovery_state_backup': encoded,
      });
      final store = ClassicalDiscoveryStore();
      expect((await store.loadState()).stateForWork('bach-air').saved, isTrue);
      expect(store.recoveryMessage, contains('최근 변경은 빠져'));
      final preferences = await SharedPreferences.getInstance();
      expect(preferences.get('clef_classical_discovery_state'), primary);
      expect(
        preferences.getString('clef_classical_discovery_state_backup'),
        encoded,
      );
      await store.saveState(state);
      expect((await store.loadState()).stateForWork('bach-air').saved, isTrue);
      expect(store.recoveryMessage, isNull);
    });
  }

  test(
    'unrecoverable backup is not silently treated as a first launch',
    () async {
      SharedPreferences.setMockInitialValues({
        'clef_classical_discovery_state_backup': '{broken',
      });
      final controller = ClassicalDiscoveryController(
        store: ClassicalDiscoveryStore(),
        notificationGateway: const DisabledClassicalDailyNotificationGateway(),
      );
      await controller.load();
      expect(controller.loadFailed, isTrue);
      await controller.toggleSaveWork('bach-air');
      final preferences = await SharedPreferences.getInstance();
      expect(
        preferences.containsKey('clef_classical_discovery_state'),
        isFalse,
      );
      expect(
        preferences.getString('clef_classical_discovery_state_backup'),
        '{broken',
      );
      controller.dispose();
    },
  );

  test(
    'invalid new snapshot cannot rotate or overwrite valid saved history',
    () async {
      final previous = UserDiscoveryState.encode(
        UserDiscoveryState.defaultState,
      );
      SharedPreferences.setMockInitialValues({
        'clef_classical_discovery_state': previous,
        'clef_classical_discovery_state_backup': previous,
      });
      final invalid = UserDiscoveryState.defaultState.copyWith(
        workStates: {
          '': const UserWorkState(
            workId: '',
            saved: false,
            familiarityLevel: 0,
          ),
        },
      );
      await expectLater(
        ClassicalDiscoveryStore().saveState(invalid),
        throwsFormatException,
      );
      final preferences = await SharedPreferences.getInstance();
      expect(preferences.getString('clef_classical_discovery_state'), previous);
      expect(
        preferences.getString('clef_classical_discovery_state_backup'),
        previous,
      );
    },
  );

  test(
    'concurrent edits persist in order despite an older slow write',
    () async {
      final store = MemoryStore()..writeBarrier = Completer<void>();
      final controller = buildController(store);
      await controller.load();
      final first = controller.toggleSaveWork('bach-air');
      await Future<void>.delayed(Duration.zero);
      final second = controller.toggleSaveWork('mozart-symphony-40');
      store.writeBarrier!.complete();
      await Future.wait([first, second]);
      expect(store.state.stateForWork('bach-air').saved, isTrue);
      expect(store.state.stateForWork('mozart-symphony-40').saved, isTrue);
    },
  );
  test(
    'simulation neither approves the founder nor mutates real history',
    () async {
      final store = MemoryStore();
      final controller = buildController(store);
      await controller.load();
      final before = UserDiscoveryState.encode(controller.state);
      final report = controller.founderDailyPickQualitySnapshot();
      expect(report.founderApproval, 'NOT_VERIFIED');
      expect(report.exportText, contains('SIMULATION'));
      expect(UserDiscoveryState.encode(controller.state), before);
      expect(store.state.dailyPicks, isEmpty);
    },
  );

  test(
    'reminder cancel wins after an earlier delayed permission request',
    () async {
      final gateway = NotificationGateway()..permission = Completer<String>();
      final controller = buildController(MemoryStore(), gateway: gateway);
      await controller.load();
      final enable = controller.configureDailyPickReminder(enabled: true);
      await Future<void>.delayed(Duration.zero);
      final disable = controller.configureDailyPickReminder(enabled: false);
      gateway.permission!.complete('granted');
      await Future.wait([enable, disable]);
      expect(gateway.scheduled, isNull);
      expect(controller.reminderPreference.enabled, isFalse);
      expect(gateway.calls, ['schedule', 'cancel']);
      controller.dispose();
      await gateway.signals.close();
    },
  );

  test('reminder updates replace time and use a current-day route', () async {
    final gateway = NotificationGateway();
    final controller = buildController(MemoryStore(), gateway: gateway);
    await controller.load();
    await controller.configureDailyPickReminder(
      enabled: true,
      timeLabel: '08:30',
    );
    await controller.configureDailyPickReminder(
      enabled: true,
      timeLabel: '21:15',
    );
    expect(gateway.scheduled!.hour, 21);
    expect(gateway.scheduled!.minute, 15);
    expect(jsonDecode(gateway.scheduled!.toJson()['payload']! as String), {
      'version': 1,
      'route': 'today',
    });
    controller.dispose();
    await gateway.signals.close();
  });

  test(
    'permission lookup error does not break loading or local music',
    () async {
      final gateway = NotificationGateway()..permissionFailure = true;
      final controller = buildController(MemoryStore(), gateway: gateway);
      await controller.load();
      await controller.configureDailyPickReminder(enabled: true);
      expect(controller.reminderPreference.deliveryStatus, 'permission-error');
      expect(controller.reminderPreference.enabled, isFalse);
      await controller.toggleSaveWork('bach-air');
      expect(controller.savedWorks.single.id, 'bach-air');
      controller.dispose();
      await gateway.signals.close();
    },
  );

  test(
    'warm notification is consumed once and malformed payload is ignored',
    () async {
      final gateway = NotificationGateway();
      final controller = buildController(MemoryStore(), gateway: gateway);
      await controller.load();
      gateway.payload = '{"version":1,"route":"today"}';
      gateway.signals.add(null);
      gateway.signals.add(null);
      await Future<void>.delayed(Duration.zero);
      await controller.consumePendingDailyPickNotification();
      expect(
        controller.notificationDestination.value!.workId,
        controller.dailyPick().workId,
      );
      expect(
        controller.state.events.where(
          (e) => e.eventType == 'daily_pick_notification_open',
        ),
        hasLength(1),
      );
      gateway.payload = 'not-an-in-c-route';
      await controller.consumePendingDailyPickNotification();
      expect(
        controller.state.events.where(
          (e) => e.eventType == 'daily_pick_notification_open',
        ),
        hasLength(1),
      );
      controller.dispose();
      await gateway.signals.close();
    },
  );

  testWidgets('notification tap from My Music opens the current work detail', (
    tester,
  ) async {
    final gateway = NotificationGateway();
    final controller = buildController(MemoryStore(), gateway: gateway);
    await controller.load();
    await controller.skipOnboarding();
    await tester.pumpWidget(ClassicalDiscoveryApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.text('My Music').last);
    await tester.pumpAndSettle();
    gateway.payload = '{"version":1,"route":"today"}';
    gateway.signals.add(null);
    await tester.pumpAndSettle();
    expect(find.byType(ClassicalWorkDetailScreen), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
    await gateway.signals.close();
  });
  test(
    'first intake pick is persisted before another action or restart',
    () async {
      final store = MemoryStore();
      final controller = buildController(store);
      await controller.load();
      await controller.addTasteIntakeInputs(['쇼팽 야상곡']);
      final shown = controller.dailyPick();
      expect(store.state.dailyPicks.single.workId, shown.workId);
      await controller.toggleSaveWork('bach-air');
      expect(controller.dailyPick().workId, shown.workId);
      final reloaded = buildController(store);
      await reloaded.load();
      expect(reloaded.dailyPick().toJson(), controller.dailyPick().toJson());
    },
  );

  test('saved unopened work cannot occupy every day of the week', () async {
    var now = DateTime(2026, 9, 1, 9);
    final controller = buildController(MemoryStore(), clock: () => now);
    await controller.load();
    await controller.addTasteIntakeInputs(['쇼팽 야상곡']);
    await controller.toggleSaveWork('bach-air');
    final ids = <String>[];
    for (var day = 1; day <= 7; day++) {
      now = DateTime(2026, 9, day, 9);
      ids.add((await controller.ensureDailyPick()).workId);
    }
    expect(ids.toSet(), hasLength(7));
  });

  for (final profile in ['founder', 'piano', 'strings']) {
    test('$profile first week has grounded bridges and recovers after surprise', () async {
      var now = DateTime(2026, 9, 1, 9);
      final controller = buildController(MemoryStore(), clock: () => now);
      await controller.load();
      await controller.addTasteIntakeInputs(switch (profile) {
        'founder' => controller.founderTasteProfile.favoriteInputs,
        'piano' => ['쇼팽 야상곡 9-2번'],
        _ => ['비발디 봄'],
      });
      final anchors = controller.state.tasteIntakeItems
          .map((item) => controller.workById(item.matchedWorkId ?? ''))
          .whereType<ClassicalWork>()
          .toList();
      final picks = <DailyPick>[];
      ClassicalWork? surprise;
      for (var day = 1; day <= 7; day++) {
        now = DateTime(2026, 9, day, 9);
        final pick = await controller.ensureDailyPick();
        final work = controller.workById(pick.workId)!;
        picks.add(pick);
        expect(['wagner', 'mahler'], isNot(contains(work.composerId)));
        if (day <= 3) {
          // Independent metadata contract, not proof that a person enjoys the bridge.
          expect(
            anchors.any(
              (a) =>
                  a.composerId == work.composerId ||
                  a.instrumentation == work.instrumentation ||
                  a.moodTags.any(work.moodTags.contains),
            ),
            isTrue,
            reason:
                '$profile day $day ${work.id} must bridge the input or a previously liked work',
          );
        }
        if (surprise != null &&
            picks[picks.length - 2].pickType == 'surprise') {
          expect(pick.pickType, 'recovery');
          expect(work.id, isNot(surprise.id));
          expect(
            work.difficultyForListening,
            lessThanOrEqualTo(surprise.difficultyForListening.clamp(1, 3)),
          );
        }
        if (pick.pickType == 'surprise') {
          expect(day, greaterThanOrEqualTo(4));
          surprise = work;
          await controller.addReaction(work.id, 'unsure');
        } else {
          await controller.addReaction(work.id, 'liked');
          anchors.add(work);
        }
      }
      expect(picks.map((p) => p.workId).toSet(), hasLength(7));
      expect(
        picks.where((p) => p.pickType == 'surprise').length,
        lessThanOrEqualTo(1),
      );
      if (profile == 'piano') {
        expect(
          surprise,
          isNotNull,
          reason: 'exercise the surprise-to-unsure branch, not a vacuous pass',
        );
      }
      expect(
        controller.state.events.where(
          (e) => e.properties['evidenceKind'] == 'observed',
        ),
        isEmpty,
      );
      controller.dispose();
    });
  }

  test(
    'unsure recovery explores instead of repeating the same anchor',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final controller = buildController(MemoryStore(), clock: () => now);
      await controller.load();
      await controller.addTasteIntakeInputs(['쇼팽 야상곡']);
      await controller.addReaction(controller.dailyPick().workId, 'unsure');
      final picks = <DailyPick>[];
      for (var day = 2; day <= 4; day++) {
        now = DateTime(2026, 9, day, 9);
        picks.add(await controller.ensureDailyPick());
      }
      expect(picks.map((p) => p.workId).toSet(), hasLength(3));
      expect(picks.first.pickType, 'recovery');
      expect(picks.any((p) => p.pickType == 'surprise'), isFalse);
    },
  );

  test(
    'opening daily picks without listening does not unlock surprise',
    () async {
      var now = DateTime(2026, 9, 1, 9);
      final controller = buildController(MemoryStore(), clock: () => now);
      await controller.load();
      await controller.addTasteIntakeInputs(['쇼팽 야상곡']);
      for (var day = 1; day <= 7; day++) {
        now = DateTime(2026, 9, day, 9);
        expect(
          (await controller.ensureDailyPick()).pickType,
          isNot('surprise'),
        );
      }
    },
  );
}

ClassicalDiscoveryController buildController(
  MemoryStore store, {
  DateTime Function()? clock,
  ClassicalDailyNotificationGateway? gateway,
}) => ClassicalDiscoveryController(
  store: store,
  clock: clock ?? () => DateTime(2026, 9, 1, 9),
  notificationGateway:
      gateway ?? const DisabledClassicalDailyNotificationGateway(),
);

class MemoryStore extends ClassicalDiscoveryStore {
  UserDiscoveryState state = UserDiscoveryState.defaultState;
  bool failWrites = false;
  Completer<void>? writeBarrier;
  @override
  Future<UserDiscoveryState> loadState() async => state;
  @override
  Future<void> saveState(UserDiscoveryState next) async {
    if (failWrites) throw StateError('disk unavailable');
    await writeBarrier?.future;
    state = next;
  }
}

class NotificationGateway implements ClassicalDailyNotificationGateway {
  final signals = StreamController<void>.broadcast();
  Completer<String>? permission;
  bool permissionFailure = false;
  String? payload;
  DailyPickNotificationRequest? scheduled;
  final calls = <String>[];
  @override
  Stream<void> get opens => signals.stream;
  @override
  Future<String> requestPermission() async {
    if (permissionFailure) throw StateError('permission lookup failed');
    return permission?.future ?? Future.value('granted');
  }

  @override
  Future<String> currentPermissionStatus() => requestPermission();
  @override
  Future<void> scheduleDailyPick(DailyPickNotificationRequest request) async {
    calls.add('schedule');
    scheduled = request;
  }

  @override
  Future<void> cancelDailyPick() async {
    calls.add('cancel');
    scheduled = null;
  }

  @override
  Future<String?> consumeLaunchPayload() async {
    final result = payload;
    payload = null;
    return result;
  }
}
