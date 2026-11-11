import 'dart:async';
import 'dart:io';

import 'package:classical_local_library/library_search_backend.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../tool/large_library_fixture.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'iOS worker searches 20k files without blocking event processing',
    (tester) async {
      expect(Platform.isIOS, isTrue);
      final fixture = buildLargeLibraryFixture(composerCount: 400);
      final snapshot = LibrarySearchSnapshot(
        revision: 1,
        library: fixture.library,
        files: fixture.library.files,
        candidates: [],
      );
      final worker = IsolateLibrarySearchBackend();
      addTearDown(worker.dispose);
      var beats = 0;
      final timer = Timer.periodic(
        const Duration(milliseconds: 5),
        (_) => beats++,
      );
      addTearDown(timer.cancel);
      final first = await worker.search(snapshot, '작곡가 99 작품 999');
      expect(first.results, isNotEmpty);
      expect(first.prepareMicros, greaterThan(0));
      expect(beats, greaterThan(0));
      final second = await worker.search(snapshot, 'file');
      expect(second.prepareMicros, 0);
      expect(second.results, hasLength(12));
      expect(second.fileIds, hasLength(20000));
      expect(second.fileIds.toSet(), hasLength(20000));
    },
  );
}
