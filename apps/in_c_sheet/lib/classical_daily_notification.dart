import 'package:flutter/services.dart';

import 'classical_discovery_models.dart';

class DailyPickNotificationRequest {
  const DailyPickNotificationRequest({
    required this.pick,
    required this.title,
    required this.body,
    required this.hour,
    required this.minute,
  });

  final DailyPick pick;
  final String title;
  final String body;
  final int hour;
  final int minute;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': pick.id,
      'workId': pick.workId,
      'momentId': pick.momentId,
      'date': pick.date.toIso8601String(),
      'title': title,
      'body': body,
      'hour': hour,
      'minute': minute,
      'payload':
          'dailyPickId=${pick.id};workId=${pick.workId};date=${pick.date.toIso8601String()}',
    };
  }
}

abstract class ClassicalDailyNotificationGateway {
  Future<String> requestPermission();

  Future<void> scheduleDailyPick(DailyPickNotificationRequest request);

  Future<void> cancelDailyPick();

  Future<String?> consumeLaunchPayload();
}

class MethodChannelClassicalDailyNotificationGateway
    implements ClassicalDailyNotificationGateway {
  const MethodChannelClassicalDailyNotificationGateway();

  static const _channel = MethodChannel('mannlab.in_c/daily_notifications');

  @override
  Future<String> requestPermission() async {
    try {
      final result = await _channel.invokeMethod<String>('requestPermission');
      return result ?? 'unknown';
    } on MissingPluginException {
      return 'unsupported';
    } on PlatformException catch (error) {
      return error.code;
    }
  }

  @override
  Future<void> scheduleDailyPick(DailyPickNotificationRequest request) async {
    try {
      await _channel.invokeMethod<void>('scheduleDailyPick', request.toJson());
    } on MissingPluginException {
      throw PlatformException(
        code: 'unsupported',
        message: 'Daily Pick notifications are not available on this platform.',
      );
    }
  }

  @override
  Future<void> cancelDailyPick() async {
    try {
      await _channel.invokeMethod<void>('cancelDailyPick');
    } on MissingPluginException {
      return;
    }
  }

  @override
  Future<String?> consumeLaunchPayload() async {
    try {
      return await _channel.invokeMethod<String>('consumeLaunchPayload');
    } on MissingPluginException {
      return null;
    }
  }
}

class DisabledClassicalDailyNotificationGateway
    implements ClassicalDailyNotificationGateway {
  const DisabledClassicalDailyNotificationGateway();

  @override
  Future<String> requestPermission() async => 'unsupported';

  @override
  Future<void> scheduleDailyPick(DailyPickNotificationRequest request) async {
    throw PlatformException(
      code: 'unsupported',
      message: 'Daily Pick notifications are disabled in this environment.',
    );
  }

  @override
  Future<void> cancelDailyPick() async {}

  @override
  Future<String?> consumeLaunchPayload() async => null;
}
