import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';

import '../tool/rc_flutter_test_evidence.dart';

void main() {
  test('complete successful report requires a zero exit code', () {
    expect(flutterTestFailure(0, _report()), isNull);
    expect(flutterTestFailure(1, _report()), isNotNull);
  });

  for (final success in [false, null]) {
    test('failed or interrupted run cannot pass with zero exit: $success', () {
      expect(flutterTestFailure(0, _report(success: success)), isNotNull);
    });
  }

  test('empty or truncated report cannot pass', () {
    for (final report in ['', '{}', '{', _report(includeDone: false)]) {
      expect(flutterTestFailure(0, report), isNotNull);
    }
  });

  test('failure event cannot be masked by a successful final event', () {
    for (final result in ['failure', 'error']) {
      expect(flutterTestFailure(0, _report(result: result)), isNotNull);
    }
  });

  test('late asynchronous error invalidates a completed test', () {
    expect(
      flutterTestFailure(
        0,
        _report(
          afterTest: [
            {'type': 'error'},
          ],
        ),
      ),
      isNotNull,
    );
  });

  test('report must start and end with the runner events', () {
    final withoutStart = _report().split('\n').skip(1).join('\n');
    expect(flutterTestFailure(0, withoutStart), isNotNull);
    expect(flutterTestFailure(0, '${_report()}\n{"type":"error"}'), isNotNull);
  });

  test('hidden loader or skipped tests alone cannot qualify a release', () {
    expect(flutterTestFailure(0, _report(hidden: true)), isNotNull);
    expect(flutterTestFailure(0, _report(skipped: true)), isNotNull);
  });

  test('unfinished tests invalidate a success summary', () {
    expect(flutterTestFailure(0, _report(afterTest: [_start(2)])), isNotNull);
  });

  test(
    'ordinary diagnostic messages and forward compatible events are valid',
    () {
      expect(
        flutterTestFailure(
          0,
          _report(
            afterTest: [
              {'type': 'print', 'message': 'All tests passed!'},
              {'type': 'futureEvent'},
            ],
          ),
        ),
        isNull,
      );
    },
  );

  test('duplicate identities and malformed event values fail closed', () {
    for (final event in <Object?>[
      null,
      [],
      {'type': 'start'},
      _start(1),
      {
        'type': 'testStart',
        'test': {'id': '2'},
      },
      {'type': 'testDone', 'testID': 99, 'result': 'success'},
    ]) {
      final report =
          '${_report(includeDone: false)}\n${jsonEncode(event)}\n'
          '{"type":"done","success":true}';
      expect(flutterTestFailure(0, report), isNotNull);
    }
  });

  test('interleaved hidden and skipped tests may accompany executed tests', () {
    final events = [
      {'type': 'start'},
      _start(1),
      _start(2),
      _start(3),
      for (final id in [2, 3, 1])
        {
          'type': 'testDone',
          'testID': id,
          'result': 'success',
          'hidden': id == 2,
          'skipped': id == 3,
        },
      {'type': 'done', 'success': true},
    ];
    expect(flutterTestFailure(0, events.map(jsonEncode).join('\r\n')), isNull);
  });
}

Map<String, Object?> _start(int id) => {
  'type': 'testStart',
  'test': {'id': id},
};

String _report({
  bool? success = true,
  bool includeDone = true,
  bool hidden = false,
  bool skipped = false,
  String result = 'success',
  List<Map<String, Object?>> afterTest = const [],
}) => [
  {'type': 'start'},
  _start(1),
  {
    'type': 'testDone',
    'testID': 1,
    'result': result,
    'hidden': hidden,
    'skipped': skipped,
  },
  ...afterTest,
  if (includeDone) {'type': 'done', 'success': success},
].map(jsonEncode).join('\n');
