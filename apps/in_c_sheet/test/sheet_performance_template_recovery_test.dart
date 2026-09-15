import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _original = SheetPerformancePresetTemplate(
  id: 'original',
  name: 'Concert',
  viewerSettings: SheetViewerSettings.defaultSettings,
);

List<Object?> _json(List<SheetPerformancePresetTemplate> templates) =>
    templates.map((template) => template.toJson()).toList();

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late _TemplateStore store;
  late SheetLibraryController controller;
  late String origin;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    store = _TemplateStore();
    origin = (await store.loadActiveLibraryProfile()).id;
    await store.savePerformancePresetTemplates([_original]);
    controller = SheetLibraryController(store: store);
    await controller.load();
  });
  tearDown(() => controller.dispose());

  Future<Object?> edit(String action) => action == 'delete'
      ? controller.deletePerformancePresetTemplate(_original.id)
      : controller.savePerformancePresetTemplate(
          name: _original.name,
          viewerSettings: const SheetViewerSettings(
            displayMode: 'singlePage',
            halfPageTurn: true,
          ),
        );

  for (final action in ['save', 'delete']) {
    test('$action failure recovers persisted templates and retries', () async {
      final gate = store.nextWrite = _Gate();
      final pending = edit(action);
      final checked = expectLater(pending, throwsStateError);
      await gate.entered.future;
      gate.fail();
      await checked;
      expect(_json(controller.performancePresetTemplates), _json([_original]));
      expect(
        _json(await store.loadPerformancePresetTemplates()),
        _json([_original]),
      );
      await edit(action);
      expect(
        _json(controller.performancePresetTemplates),
        _json(await store.loadPerformancePresetTemplates()),
      );
      if (action == 'delete') {
        expect(controller.performancePresetTemplates, isEmpty);
      } else {
        expect(
          controller
              .performancePresetTemplates
              .single
              .viewerSettings
              .halfPageTurn,
          isTrue,
        );
      }
    });

    for (final fails in [false, true]) {
      test('late $action fails=$fails stays in origin library', () async {
        final gate = store.nextWrite = _Gate();
        final pending = edit(action);
        final checked = fails
            ? expectLater(pending, throwsStateError)
            : pending;
        await gate.entered.future;
        await controller.createLibraryProfile('Other');
        await controller.savePerformancePresetTemplate(
          name: 'Other template',
          viewerSettings: SheetViewerSettings.defaultSettings,
        );
        final destination = _json(controller.performancePresetTemplates);
        fails ? gate.fail() : gate.complete();
        await checked;
        expect(_json(controller.performancePresetTemplates), destination);
        expect(
          _json(await store.loadPerformancePresetTemplates()),
          destination,
        );
        await controller.switchLibraryProfile(origin);
        if (fails) {
          expect(
            _json(controller.performancePresetTemplates),
            _json([_original]),
          );
        } else if (action == 'delete') {
          expect(controller.performancePresetTemplates, isEmpty);
        } else {
          expect(
            controller
                .performancePresetTemplates
                .single
                .viewerSettings
                .halfPageTurn,
            isTrue,
          );
        }
      });
    }
  }

  test('old failed save preserves newer successful edit', () async {
    final gate = store.nextWrite = _Gate();
    final pending = edit('save');
    final checked = expectLater(pending, throwsStateError);
    await gate.entered.future;
    await controller.savePerformancePresetTemplate(
      name: 'Newer',
      viewerSettings: SheetViewerSettings.defaultSettings,
    );
    final newer = _json(controller.performancePresetTemplates);
    gate.fail();
    await checked;
    expect(_json(controller.performancePresetTemplates), newer);
    expect(_json(await store.loadPerformancePresetTemplates()), newer);
  });

  test('newer failed delete recovers older successful save', () async {
    final olderGate = store.nextWrite = _Gate();
    final older = edit('save');
    await olderGate.entered.future;
    final newerGate = store.nextWrite = _Gate();
    final newer = edit('delete');
    final checked = expectLater(newer, throwsStateError);
    await newerGate.entered.future;
    olderGate.complete();
    await older;
    newerGate.fail();
    await checked;
    expect(
      controller.performancePresetTemplates.single.viewerSettings.halfPageTurn,
      isTrue,
    );
    expect(
      _json(controller.performancePresetTemplates),
      _json(await store.loadPerformancePresetTemplates()),
    );
  });

  for (final change in ['edit', 'switch', 'read-failure']) {
    test('late recovery preserves $change', () async {
      final write = store.nextWrite = _Gate();
      final pending = edit('delete');
      final checked = expectLater(pending, throwsStateError);
      await write.entered.future;
      final read = store.nextRead = _Gate();
      write.fail();
      // If recovery is absent this timeout fails instead of hanging the suite.
      await read.entered.future.timeout(const Duration(seconds: 2));
      if (change == 'edit') {
        await controller.savePerformancePresetTemplate(
          name: 'Newer',
          viewerSettings: SheetViewerSettings.defaultSettings,
        );
      } else if (change == 'switch') {
        await controller.createLibraryProfile('Other');
      }
      final before = _json(controller.performancePresetTemplates);
      change == 'read-failure' ? read.fail() : read.complete();
      await checked;
      expect(_json(controller.performancePresetTemplates), before);
    });
  }
}

class _Gate {
  final entered = Completer<void>();
  final release = Completer<void>();
  Future<void> wait() {
    entered.complete();
    return release.future;
  }

  void complete() => release.complete();
  void fail() => release.completeError(StateError('injected failure'));
}

class _TemplateStore extends SheetLibraryStore {
  _Gate? nextWrite;
  _Gate? nextRead;

  @override
  Future<void> savePerformancePresetTemplates(
    List<SheetPerformancePresetTemplate> templates, {
    String? libraryId,
  }) async {
    final gate = nextWrite;
    nextWrite = null;
    if (gate != null) await gate.wait();
    await super.savePerformancePresetTemplates(templates, libraryId: libraryId);
  }

  @override
  Future<List<SheetPerformancePresetTemplate>>
  loadPerformancePresetTemplates() async {
    final snapshot = await super.loadPerformancePresetTemplates();
    final gate = nextRead;
    nextRead = null;
    if (gate != null) await gate.wait();
    return snapshot;
  }
}
