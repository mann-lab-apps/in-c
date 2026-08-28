import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_auto_scroll.dart';

void main() {
  test('encodes and decodes settings', () {
    const settings = SheetAutoScrollSettings(
      durationSeconds: 180,
      startPage: 2,
      endPage: 8,
      cueSeconds: 5,
      pausePageNumbers: <int>[4, 6],
      repeatSections: <SheetAutoScrollRepeatSection>[
        SheetAutoScrollRepeatSection(startPage: 3, endPage: 5),
      ],
    );

    final decoded = SheetAutoScrollCodec.decode(
      SheetAutoScrollCodec.encode(settings),
    );

    expect(decoded.durationSeconds, 180);
    expect(decoded.startPage, 2);
    expect(decoded.endPage, 8);
    expect(decoded.cueSeconds, 5);
    expect(decoded.pausePageNumbers, <int>[4, 6]);
    expect(decoded.repeatSections.single.startPage, 3);
    expect(decoded.repeatSections.single.endPage, 5);
    expect(decoded.repeatSections.single.repeatCount, 1);
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

  test('normalizes pause markers and repeat sections from persisted JSON', () {
    final settings = SheetAutoScrollSettings.fromJson(<String, Object?>{
      'durationSeconds': 180,
      'startPage': 1,
      'endPage': 8,
      'pausePageNumbers': <Object?>[4, '2', 0, 4, 'bad'],
      'repeatSections': <Object?>[
        <String, Object?>{'startPage': 5, 'endPage': 3, 'repeatCount': 9},
        <String, Object?>{'startPage': '2', 'endPage': '4'},
        'bad',
      ],
    });

    expect(settings.pausePageNumbers, <int>[2, 4]);
    expect(settings.repeatSections, hasLength(2));
    expect(settings.repeatSections.first.startPage, 2);
    expect(settings.repeatSections.first.endPage, 4);
    expect(settings.repeatSections.last.startPage, 5);
    expect(settings.repeatSections.last.endPage, 5);
    expect(settings.repeatSections.last.repeatCount, 4);
  });

  test('copyWith preserves repeat section model objects', () {
    const settings = SheetAutoScrollSettings(
      durationSeconds: 180,
      startPage: 1,
      endPage: 8,
      pausePageNumbers: <int>[4],
      repeatSections: <SheetAutoScrollRepeatSection>[
        SheetAutoScrollRepeatSection(startPage: 2, endPage: 4),
      ],
    );

    final updated = settings.copyWith(durationSeconds: 240);

    expect(updated.pausePageNumbers, <int>[4]);
    expect(updated.repeatSections.single.startPage, 2);
    expect(updated.repeatSections.single.endPage, 4);
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

  test('expands repeat sections into the auto scroll timeline', () {
    const settings = SheetAutoScrollSettings(
      durationSeconds: 120,
      startPage: 1,
      endPage: 4,
      repeatSections: <SheetAutoScrollRepeatSection>[
        SheetAutoScrollRepeatSection(startPage: 2, endPage: 3),
      ],
    );

    final plan = settings.plan(currentPage: 1, pageCount: 4);

    expect(plan.pageTimeline, <int>[1, 2, 3, 2, 3, 4]);
    expect(plan.positionForProgress(0).fromPage, 1);
    expect(plan.positionForProgress(0.2).toPage, 3);
    expect(plan.positionForProgress(0.5).fromPage, 3);
    expect(plan.positionForProgress(0.5).toPage, 2);
    expect(plan.pageForProgress(1), 4);
  });

  test('returns pause markers once after the start page is reached', () {
    const settings = SheetAutoScrollSettings(
      durationSeconds: 120,
      startPage: 1,
      endPage: 4,
      pausePageNumbers: <int>[1, 3],
    );

    final plan = settings.plan(currentPage: 1, pageCount: 4);

    expect(plan.pausePageNumbers, <int>[3]);
    expect(plan.pausePageForProgress(0, consumedPageNumbers: <int>{}), isNull);
    expect(plan.pausePageForProgress(0.7, consumedPageNumbers: <int>{}), 3);
    expect(
      plan.pausePageForProgress(0.7, consumedPageNumbers: <int>{3}),
      isNull,
    );
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
