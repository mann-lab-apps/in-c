import 'dart:convert';
import 'dart:async';

import 'sheet_metronome.dart';
import 'sheet_viewer_input.dart';

enum SheetDeviceCheckStatus { pass, warn, fail, manual, notTested }

extension SheetDeviceCheckStatusLabel on SheetDeviceCheckStatus {
  String get code {
    return switch (this) {
      SheetDeviceCheckStatus.pass => 'PASS',
      SheetDeviceCheckStatus.warn => 'WARN',
      SheetDeviceCheckStatus.fail => 'FAIL',
      SheetDeviceCheckStatus.manual => 'MANUAL',
      SheetDeviceCheckStatus.notTested => 'NOT_TESTED',
    };
  }

  String get koreanLabel {
    return switch (this) {
      SheetDeviceCheckStatus.pass => '정상',
      SheetDeviceCheckStatus.warn => '확인 필요',
      SheetDeviceCheckStatus.fail => '문제 있음',
      SheetDeviceCheckStatus.manual => '직접 확인 필요',
      SheetDeviceCheckStatus.notTested => '아직 실행 안 함',
    };
  }
}

class SheetDeviceCheckItem {
  const SheetDeviceCheckItem({
    required this.id,
    required this.title,
    required this.status,
    required this.details,
  });

  final String id;
  final String title;
  final SheetDeviceCheckStatus status;
  final String details;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'title': title,
      'status': status.code,
      'details': sanitizeDeviceCheckText(details),
    };
  }

  String toMarkdownLine() {
    final safeDetails = sanitizeDeviceCheckText(details);
    return '- $title: ${status.code}${safeDetails.isEmpty ? '' : ' $safeDetails'}';
  }
}

class SheetDeviceCheckReport {
  const SheetDeviceCheckReport({
    required this.appVersion,
    required this.platform,
    required this.osVersion,
    required this.buildMode,
    required this.checkedAt,
    required this.items,
    this.notes = '',
  });

  final String appVersion;
  final String platform;
  final String osVersion;
  final String buildMode;
  final DateTime checkedAt;
  final List<SheetDeviceCheckItem> items;
  final String notes;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'app': 'Clef & Staff',
      'appVersion': appVersion,
      'platform': sanitizeDeviceCheckText(platform),
      'osVersion': sanitizeDeviceCheckText(osVersion),
      'buildMode': sanitizeDeviceCheckText(buildMode),
      'checkedAt': checkedAt.toIso8601String(),
      'items': items.map((item) => item.toJson()).toList(),
      if (notes.trim().isNotEmpty) 'notes': sanitizeDeviceCheckText(notes),
    };
  }

  String toMarkdown() {
    final buffer = StringBuffer()
      ..writeln('# Clef & Staff 앱 상태 점검')
      ..writeln()
      ..writeln('App: Clef & Staff $appVersion')
      ..writeln('Platform: ${sanitizeDeviceCheckText(platform)}')
      ..writeln('OS: ${sanitizeDeviceCheckText(osVersion)}')
      ..writeln('Build: ${sanitizeDeviceCheckText(buildMode)}')
      ..writeln('Checked at: ${checkedAt.toIso8601String()}')
      ..writeln()
      ..writeln('## Summary')
      ..writeln();

    for (final item in items) {
      buffer.writeln(item.toMarkdownLine());
    }

    buffer
      ..writeln()
      ..writeln('## Manual checks still needed')
      ..writeln()
      ..writeln('- 실제 메트로놈 청감과 이어폰/스피커/Bluetooth 출력')
      ..writeln('- 드론 음량')
      ..writeln('- Bluetooth/USB 페달 호환성')
      ..writeln('- stylus/S Pen/Apple Pencil 필기감')
      ..writeln('- 튜너 정확도와 연습실 주변 소음 반응')
      ..writeln('- 장시간 연주 안정성');

    final safeNotes = sanitizeDeviceCheckText(notes.trim());
    if (safeNotes.isNotEmpty) {
      buffer
        ..writeln()
        ..writeln('## Notes')
        ..writeln()
        ..writeln(safeNotes);
    }

    buffer
      ..writeln()
      ..writeln('## JSON')
      ..writeln()
      ..writeln('```json')
      ..writeln(const JsonEncoder.withIndent('  ').convert(toJson()))
      ..writeln('```');
    return buffer.toString().trim();
  }
}

class SheetMetronomeTimingAnalysis {
  const SheetMetronomeTimingAnalysis({
    required this.bpm,
    required this.expectedIntervalMs,
    required this.intervalsMs,
    required this.averageIntervalMs,
    required this.maxJitterMs,
    required this.status,
  });

  final int bpm;
  final double expectedIntervalMs;
  final List<double> intervalsMs;
  final double averageIntervalMs;
  final double maxJitterMs;
  final SheetDeviceCheckStatus status;

  SheetDeviceCheckItem toCheckItem() {
    return SheetDeviceCheckItem(
      id: 'metronome-$bpm',
      title: 'Metronome $bpm BPM',
      status: status,
      details:
          'expected ${expectedIntervalMs.toStringAsFixed(1)}ms, '
          'avg ${averageIntervalMs.toStringAsFixed(1)}ms, '
          'max jitter ${maxJitterMs.toStringAsFixed(1)}ms',
    );
  }
}

class SheetDeviceCheckTimingSampler {
  Timer? _timer;
  Completer<List<DateTime>>? _pending;

  Future<List<DateTime>> collect({required int bpm, required int tickCount}) {
    cancel();
    if (tickCount <= 0) {
      return Future<List<DateTime>>.value(const <DateTime>[]);
    }

    final ticks = <DateTime>[];
    final completer = Completer<List<DateTime>>();
    _pending = completer;
    final interval = Duration(
      milliseconds: (60000 / SheetMetronomeSettings.clampBpm(bpm)).round(),
    );
    _timer = Timer.periodic(interval, (timer) {
      ticks.add(DateTime.now());
      if (ticks.length >= tickCount) {
        timer.cancel();
        if (identical(_pending, completer)) {
          _timer = null;
          _pending = null;
        }
        if (!completer.isCompleted) {
          completer.complete(List<DateTime>.unmodifiable(ticks));
        }
      }
    });
    return completer.future;
  }

  void cancel() {
    _timer?.cancel();
    _timer = null;
    final pending = _pending;
    _pending = null;
    if (pending != null && !pending.isCompleted) {
      pending.complete(const <DateTime>[]);
    }
  }
}

SheetMetronomeTimingAnalysis analyzeMetronomeTiming({
  required int bpm,
  required List<DateTime> ticks,
  double warnJitterMs = 16,
  double failJitterMs = 36,
}) {
  final normalizedBpm = SheetMetronomeSettings.clampBpm(bpm);
  final expectedIntervalMs = 60000 / normalizedBpm;
  if (ticks.length < 3) {
    return SheetMetronomeTimingAnalysis(
      bpm: normalizedBpm,
      expectedIntervalMs: expectedIntervalMs,
      intervalsMs: const <double>[],
      averageIntervalMs: 0,
      maxJitterMs: double.infinity,
      status: SheetDeviceCheckStatus.notTested,
    );
  }

  final intervals = <double>[];
  for (var i = 1; i < ticks.length; i += 1) {
    intervals.add(ticks[i].difference(ticks[i - 1]).inMicroseconds / 1000);
  }
  final average =
      intervals.reduce((value, element) => value + element) / intervals.length;
  final maxJitter = intervals
      .map((interval) => (interval - expectedIntervalMs).abs())
      .reduce((value, element) => value > element ? value : element);
  final status = maxJitter >= failJitterMs
      ? SheetDeviceCheckStatus.fail
      : maxJitter >= warnJitterMs
      ? SheetDeviceCheckStatus.warn
      : SheetDeviceCheckStatus.pass;
  return SheetMetronomeTimingAnalysis(
    bpm: normalizedBpm,
    expectedIntervalMs: expectedIntervalMs,
    intervalsMs: List<double>.unmodifiable(intervals),
    averageIntervalMs: average,
    maxJitterMs: maxJitter,
    status: status,
  );
}

SheetDeviceCheckItem deviceCheckItemForKeyInput(
  SheetViewerInputDiagnosticEntry? entry,
) {
  if (entry == null) {
    return const SheetDeviceCheckItem(
      id: 'page-key-input',
      title: 'Page key input',
      status: SheetDeviceCheckStatus.notTested,
      details: '방향키, PageUp/PageDown, Space, Enter 또는 페달을 눌러보세요.',
    );
  }
  final action = entry.action == SheetViewerInputAction.none
      ? 'unmapped'
      : entry.action.value;
  return SheetDeviceCheckItem(
    id: 'page-key-input',
    title: 'Page key input',
    status: entry.action == SheetViewerInputAction.none
        ? SheetDeviceCheckStatus.warn
        : SheetDeviceCheckStatus.pass,
    details: '${entry.inputId} -> $action',
  );
}

String sanitizeDeviceCheckText(String value) {
  var sanitized = value.replaceAll(RegExp(r'[\r\n]+'), ' ').trim();
  sanitized = sanitized.replaceAll(
    RegExp(r'(/private/|/Users/|file://)[^\s,;]+'),
    '[redacted-path]',
  );
  return sanitized;
}
