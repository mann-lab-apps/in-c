import 'dart:io';

import 'package:flutter/services.dart';

abstract class BackupExclusionPolicy {
  const BackupExclusionPolicy();

  Future<void> exclude(String path);
}

class PlatformBackupExclusionPolicy extends BackupExclusionPolicy {
  const PlatformBackupExclusionPolicy();

  static const _channel = MethodChannel(
    'app.inc.classical_local_library/backup_policy',
  );

  @override
  Future<void> exclude(String path) async {
    if (!Platform.isIOS) return;
    await _channel.invokeMethod<void>('excludeFromBackup', {'path': path});
  }
}

class NoopBackupExclusionPolicy extends BackupExclusionPolicy {
  const NoopBackupExclusionPolicy();

  @override
  Future<void> exclude(String path) async {}
}
