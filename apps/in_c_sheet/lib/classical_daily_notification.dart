import 'dart:async';
import 'dart:convert';

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
      // A repeating reminder opens the current day, not the day it was scheduled.
      'payload': jsonEncode({'version': 1, 'route': 'today'}),
    };
  }
}

abstract class ClassicalDailyNotificationGateway {
  Stream<void> get opens;

  Future<String> currentPermissionStatus();

  Future<String> requestPermission();

  Future<void> scheduleDailyPick(DailyPickNotificationRequest request);

  Future<void> cancelDailyPick();

  Future<String?> consumeLaunchPayload();
}

class MethodChannelClassicalDailyNotificationGateway
    implements ClassicalDailyNotificationGateway {
  const MethodChannelClassicalDailyNotificationGateway();

  static const _channel = MethodChannel('mannlab.in_c/daily_notifications');
  static final StreamController<void> _opens = StreamController<void>.broadcast(
    onListen: () => _channel.setMethodCallHandler((call) async {
      if (call.method == 'dailyPickNotificationOpen') _opens.add(null);
    }),
    onCancel: () => _channel.setMethodCallHandler(null),
  );

  @override
  Stream<void> get opens => _opens.stream;

  @override
  Future<String> currentPermissionStatus() async {
    try {
      return await _channel.invokeMethod<String>('permissionStatus') ??
          'unknown';
    } on MissingPluginException {
      return 'unsupported';
    } on PlatformException {
      return 'unknown';
    }
  }

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
  Stream<void> get opens => const Stream<void>.empty();

  @override
  Future<String> currentPermissionStatus() async => 'unsupported';

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
