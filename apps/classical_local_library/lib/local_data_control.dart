import 'dart:io';

import 'package:sqflite/sqflite.dart' as sqflite;

class LocalDataSummary {
  const LocalDataSummary({
    required this.managedFileCount,
    required this.managedBytes,
  });

  final int managedFileCount;
  final int managedBytes;
}

class LocalDataResetException implements Exception {
  const LocalDataResetException(this.message);

  final String message;
}

typedef ManagedDirectoryCleaner = Future<void> Function(Directory directory);

class LocalDataControlService {
  const LocalDataControlService({
    required this.database,
    required this.managedDirectories,
    this.directoryCleaner = _deleteDirectory,
  });

  final sqflite.Database database;
  final List<Directory> managedDirectories;
  final ManagedDirectoryCleaner directoryCleaner;

  Future<LocalDataSummary> summary() async {
    var count = 0;
    var bytes = 0;
    for (final directory in managedDirectories) {
      if (!await directory.exists()) continue;
      await for (final entity in directory.list(recursive: true)) {
        if (entity is! File) continue;
        count += 1;
        try {
          bytes += await entity.length();
        } on FileSystemException {
          // A concurrent cleanup can remove a file after it was listed.
        }
      }
    }
    return LocalDataSummary(managedFileCount: count, managedBytes: bytes);
  }

  Future<void> reset() async {
    await database.transaction((transaction) async {
      for (final table in _resetDeleteOrder) {
        await transaction.delete(table);
      }
      await transaction.insert('app_reset_state', {
        'id': 1,
        'pending_file_cleanup': 1,
        'started_at_millis': DateTime.now().millisecondsSinceEpoch,
      }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
    });
    await _finishFileCleanup();
  }

  Future<bool> recoverPendingReset() async {
    final pending = await database.query(
      'app_reset_state',
      where: 'id = ? AND pending_file_cleanup = 1',
      whereArgs: [1],
      limit: 1,
    );
    if (pending.isEmpty) return false;
    await _finishFileCleanup();
    return true;
  }

  Future<void> _finishFileCleanup() async {
    try {
      for (final directory in managedDirectories) {
        await directoryCleaner(directory);
      }
    } on FileSystemException {
      throw const LocalDataResetException(
        '관리 음원 정리를 완료하지 못했습니다. 앱을 다시 열어 재시도해 주세요.',
      );
    }
    await database.delete('app_reset_state', where: 'id = ?', whereArgs: [1]);
  }

  static Future<void> _deleteDirectory(Directory directory) async {
    if (await directory.exists()) await directory.delete(recursive: true);
  }
}

const _resetDeleteOrder = [
  'playback_queue_state',
  'local_playlists',
  'catalog_recording_credits',
  'catalog_tracks',
  'catalog_recordings',
  'catalog_work_parts',
  'catalog_works',
  'catalog_albums',
  'catalog_ensembles',
  'catalog_instruments',
  'catalog_people',
  'audio_file_track_links',
  'metadata_overrides',
  'metadata_candidates',
  'library_entity_merges',
  'playback_history',
  'playback_positions',
  'playback_history_preferences',
  'imslp_resources',
  'imslp_imports',
  'imslp_work_links',
  'local_audio_imports',
  'scan_locations',
  'scanned_audio_files',
  'musicbrainz_cache',
];
