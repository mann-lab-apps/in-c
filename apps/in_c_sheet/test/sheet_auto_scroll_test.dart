import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';

void main() {
  test('encodes and decodes settings', () {
    const settings = SheetAutoScrollSettings(
      durationSeconds: 180,
      startPage: 2,
      endPage: 8,
      cueSeconds: 5,
    );

    final decoded = SheetAutoScrollCodec.decode(
      SheetAutoScrollCodec.encode(settings),
    );

    expect(decoded.durationSeconds, 180);
    expect(decoded.startPage, 2);
    expect(decoded.endPage, 8);
    expect(decoded.cueSeconds, 5);
  });

  test('falls back to default settings for legacy values', () {
    final decoded = SheetAutoScrollCodec.decode(null);

    expect(decoded.durationSeconds, 240);
    expect(decoded.startPage, 1);
    expect(decoded.endPage, 0);
    expect(decoded.cueSeconds, 0);
  });

  test('falls back to default settings for malformed JSON', () {
    expect(
      SheetAutoScrollCodec.decode('{bad json').durationSeconds,
      SheetAutoScrollSettings.defaultSettings.durationSeconds,
    );
    expect(
      SheetAutoScrollCodec.decode('[]').cueSeconds,
      SheetAutoScrollSettings.defaultSettings.cueSeconds,
    );
  });

  test('clamps duration and page range', () {
    final settings = SheetAutoScrollSettings.fromJson(<String, Object?>{
      'durationSeconds': 8,
      'startPage': -4,
      'endPage': -2,
      'cueSeconds': 40,
    });

    expect(settings.durationSeconds, 30);
    expect(settings.startPage, 1);
    expect(settings.endPage, 0);
    expect(settings.cueSeconds, 30);
  });

  test('normalizes decimal JSON numbers', () {
    final settings = SheetAutoScrollSettings.fromJson(<String, Object?>{
      'durationSeconds': 119.6,
      'startPage': 1.2,
      'endPage': 4.7,
      'cueSeconds': 4.6,
    });

    expect(settings.durationSeconds, 120);
    expect(settings.startPage, 1);
    expect(settings.endPage, 5);
    expect(settings.cueSeconds, 5);
  });

  test('normalizes numeric strings from persisted settings', () {
    final settings = SheetAutoScrollSettings.fromJson(<String, Object?>{
      'durationSeconds': '300',
      'startPage': '2',
      'endPage': '9',
      'cueSeconds': '10',
    });

    expect(settings.durationSeconds, 300);
    expect(settings.startPage, 2);
    expect(settings.endPage, 9);
    expect(settings.cueSeconds, 10);
  });

  test('normalizes plan against current document page count', () {
    const settings = SheetAutoScrollSettings(
      durationSeconds: 120,
      startPage: 7,
      endPage: 3,
    );

    final plan = settings.plan(currentPage: 4, pageCount: 5);

    expect(plan.durationSeconds, 120);
    expect(plan.startPage, 5);
    expect(plan.endPage, 5);
  });

  test('maps elapsed progress to page range', () {
    const plan = SheetAutoScrollPlan(
      durationSeconds: 100,
      startPage: 2,
      endPage: 6,
    );

    expect(plan.progressForElapsed(const Duration(seconds: 25)), 0.25);
    expect(plan.pageForProgress(0), 2);
    expect(plan.pageForProgress(0.5), 4);
    expect(plan.pageForProgress(1), 6);
  });

  test('derives duration presets from BPM and page span', () {
    expect(
      SheetAutoScrollSettings.durationForBpmPreset(
        bpm: 120,
        startPage: 2,
        endPage: 4,
        beatsPerPage: 32,
      ),
      48,
    );
    expect(
      SheetAutoScrollSettings.durationForBpmPreset(
        bpm: 240,
        startPage: 1,
        endPage: 1,
        beatsPerPage: 4,
      ),
      30,
    );
  });
}
