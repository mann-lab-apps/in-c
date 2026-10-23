import 'dart:convert';
import 'dart:io';

import 'local_audio_scanner.dart';

class ScanLocation {
  const ScanLocation({
    required this.id,
    required this.path,
    required this.displayName,
    required this.createdAtMillis,
    this.lastScannedAtMillis,
    this.lastScanFileCount = 0,
    this.isActive = true,
  });

  final String id;
  final String path;
  final String displayName;
  final int createdAtMillis;
  final int? lastScannedAtMillis;
  final int lastScanFileCount;
  final bool isActive;

  ScanLocation copyWith({
    String? id,
    String? path,
    String? displayName,
    int? createdAtMillis,
    int? lastScannedAtMillis,
    bool clearLastScannedAt = false,
    int? lastScanFileCount,
    bool? isActive,
  }) {
    return ScanLocation(
      id: id ?? this.id,
      path: path ?? this.path,
      displayName: displayName ?? this.displayName,
      createdAtMillis: createdAtMillis ?? this.createdAtMillis,
      lastScannedAtMillis: clearLastScannedAt
          ? null
          : lastScannedAtMillis ?? this.lastScannedAtMillis,
      lastScanFileCount: lastScanFileCount ?? this.lastScanFileCount,
      isActive: isActive ?? this.isActive,
    );
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'path': path,
      'displayName': displayName,
      'createdAtMillis': createdAtMillis,
      'lastScannedAtMillis': lastScannedAtMillis,
      'lastScanFileCount': lastScanFileCount,
      'isActive': isActive,
    };
  }

  factory ScanLocation.fromJson(Map<String, Object?> json) {
    return ScanLocation(
      id: json['id'] as String,
      path: json['path'] as String,
      displayName: json['displayName'] as String,
      createdAtMillis: json['createdAtMillis'] as int,
      lastScannedAtMillis: json['lastScannedAtMillis'] as int?,
      lastScanFileCount: json['lastScanFileCount'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

abstract class ScanLocationStore {
  Future<List<ScanLocation>> load();

  Future<void> save(List<ScanLocation> locations);
}

class MemoryScanLocationStore implements ScanLocationStore {
  MemoryScanLocationStore([List<ScanLocation> seed = const []])
    : _locations = [...seed];

  List<ScanLocation> _locations;

  @override
  Future<List<ScanLocation>> load() async {
    return [..._locations];
  }

  @override
  Future<void> save(List<ScanLocation> locations) async {
    _locations = [...locations];
  }
}

class JsonScanLocationStore implements ScanLocationStore {
  const JsonScanLocationStore(this.file);

  final File file;

  @override
  Future<List<ScanLocation>> load() async {
    if (!await file.exists()) {
      return [];
    }

    final decoded =
        jsonDecode(await file.readAsString()) as Map<String, Object?>;
    return [
      for (final item in decoded['locations'] as List<Object?>? ?? const [])
        ScanLocation.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<void> save(List<ScanLocation> locations) async {
    await file.parent.create(recursive: true);
    final payload = {
      'schemaVersion': 1,
      'locations': [for (final location in locations) location.toJson()],
    };
    const encoder = JsonEncoder.withIndent('  ');
    await file.writeAsString(encoder.convert(payload));
  }
}

class ScanLocationRepository {
  const ScanLocationRepository(this.store);

  final ScanLocationStore store;

  Future<List<ScanLocation>> load() => store.load();

  Future<List<ScanLocation>> addOrActivate(
    String path, {
    required DateTime now,
  }) async {
    final normalizedPath = normalizeScanPath(path);
    final locations = await store.load();
    final existingIndex = locations.indexWhere(
      (location) => normalizeScanPath(location.path) == normalizedPath,
    );

    if (existingIndex >= 0) {
      locations[existingIndex] = locations[existingIndex].copyWith(
        isActive: true,
      );
    } else {
      locations.add(
        ScanLocation(
          id: scanLocationId(normalizedPath),
          path: normalizedPath,
          displayName: scanLocationDisplayName(normalizedPath),
          createdAtMillis: now.millisecondsSinceEpoch,
        ),
      );
    }

    return _saveSorted(locations);
  }

  Future<List<ScanLocation>> markScanned({
    required String id,
    required int fileCount,
    required DateTime scannedAt,
  }) async {
    return _updateLocation(
      id,
      (location) => location.copyWith(
        lastScannedAtMillis: scannedAt.millisecondsSinceEpoch,
        lastScanFileCount: fileCount,
      ),
    );
  }

  Future<List<ScanLocation>> setActive({
    required String id,
    required bool isActive,
  }) async {
    return _updateLocation(
      id,
      (location) => location.copyWith(isActive: isActive),
    );
  }

  Future<List<ScanLocation>> _updateLocation(
    String id,
    ScanLocation Function(ScanLocation location) update,
  ) async {
    final locations = await store.load();
    final index = locations.indexWhere((location) => location.id == id);
    if (index < 0) {
      return _saveSorted(locations);
    }

    locations[index] = update(locations[index]);
    return _saveSorted(locations);
  }

  Future<List<ScanLocation>> _saveSorted(List<ScanLocation> locations) async {
    final sorted = [...locations]..sort((a, b) => a.path.compareTo(b.path));
    await store.save(sorted);
    return sorted;
  }
}

String normalizeScanPath(String path) {
  var normalized = path.trim().replaceAll('\\', '/');
  while (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.substring(0, normalized.length - 1);
  }
  return normalized;
}

String scanLocationDisplayName(String path) {
  final name = fileNameForPath(path);
  return name.isEmpty ? path : name;
}

String scanLocationId(String path) {
  return 'location.${base64Url.encode(utf8.encode(normalizeScanPath(path)))}';
}
