import 'dart:convert';

String? flutterTestFailure(int exitCode, String report) {
  if (exitCode != 0) {
    return 'Flutter test exited with code $exitCode.';
  }
  var started = false;
  var finished = false;
  var passed = 0;
  final activeTests = <int>{};
  final seenTests = <int>{};
  try {
    for (final line in const LineSplitter().convert(report)) {
      if (line.trim().isEmpty) {
        continue;
      }
      final event = jsonDecode(line);
      if (event is! Map<String, dynamic> || event['type'] is! String) {
        return 'Invalid Flutter test reporter event.';
      }
      if (finished || (!started && event['type'] != 'start')) {
        return 'Flutter test report has invalid start/end ordering.';
      }
      switch (event['type']) {
        case 'start':
          if (started) {
            return 'Flutter test report contains multiple runs.';
          }
          started = true;
        case 'testStart':
          final test = event['test'];
          if (test is! Map<String, dynamic> || test['id'] is! int) {
            return 'Invalid Flutter test identity.';
          }
          final id = test['id'] as int;
          if (!seenTests.add(id)) {
            return 'Flutter test report repeats a test identity.';
          }
          activeTests.add(id);
        case 'testDone':
          if (event['testID'] is! int ||
              !activeTests.remove(event['testID']) ||
              event['result'] != 'success' ||
              event['hidden'] is! bool ||
              event['skipped'] is! bool) {
            return 'Flutter test failed or has an invalid completion event.';
          }
          if (event['hidden'] == false && event['skipped'] == false) {
            passed += 1;
          }
        case 'error':
          return 'Flutter test reported an error, including after completion.';
        case 'done':
          if (event['success'] != true ||
              activeTests.isNotEmpty ||
              passed == 0) {
            return 'Flutter tests did not complete successfully with executed tests.';
          }
          finished = true;
      }
    }
  } on FormatException {
    return 'Flutter test JSON report is malformed or truncated.';
  }
  return finished ? null : 'Flutter test completion evidence is missing.';
}
