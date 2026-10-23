import 'dart:io';

import 'package:classical_local_library/scan_locations.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp(
      'classical_locations_test_',
    );
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('등록된 스캔 경로를 JSON 저장소에 저장하고 다시 읽는다', () async {
    final file = File('${tempDir.path}/scan-locations.json');
    final repository = ScanLocationRepository(JsonScanLocationStore(file));
    final createdAt = DateTime.utc(2026, 10, 13, 1, 2);

    final saved = await repository.addOrActivate(
      '/Users/me/Music/Bach/',
      now: createdAt,
    );
    final loaded = await ScanLocationRepository(JsonScanLocationStore(file))
        .load();

    expect(saved, hasLength(1));
    expect(loaded, hasLength(1));
    expect(loaded.single.path, '/Users/me/Music/Bach');
    expect(loaded.single.displayName, 'Bach');
    expect(loaded.single.createdAtMillis, createdAt.millisecondsSinceEpoch);
    expect(loaded.single.isActive, isTrue);
  });

  test('마지막 스캔 시각과 파일 수를 갱신하고 경로를 비활성화한다', () async {
    final repository = ScanLocationRepository(MemoryScanLocationStore());
    final created = await repository.addOrActivate(
      '/music/Classical',
      now: DateTime.utc(2026, 10, 13),
    );

    final scannedAt = DateTime.utc(2026, 10, 13, 3, 4);
    final scanned = await repository.markScanned(
      id: created.single.id,
      fileCount: 12,
      scannedAt: scannedAt,
    );
    final inactive = await repository.setActive(
      id: created.single.id,
      isActive: false,
    );

    expect(scanned.single.lastScanFileCount, 12);
    expect(
      scanned.single.lastScannedAtMillis,
      scannedAt.millisecondsSinceEpoch,
    );
    expect(inactive.single.isActive, isFalse);
  });

  test('같은 경로를 다시 추가하면 중복하지 않고 활성화한다', () async {
    final repository = ScanLocationRepository(MemoryScanLocationStore());
    final added = await repository.addOrActivate(
      r'C:\Music\Classical\',
      now: DateTime.utc(2026, 10, 13),
    );
    await repository.setActive(id: added.single.id, isActive: false);

    final reactivated = await repository.addOrActivate(
      'C:/Music/Classical',
      now: DateTime.utc(2026, 10, 14),
    );

    expect(reactivated, hasLength(1));
    expect(reactivated.single.path, 'C:/Music/Classical');
    expect(reactivated.single.isActive, isTrue);
  });
}
