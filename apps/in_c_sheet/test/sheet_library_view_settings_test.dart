import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_score.dart';

void main() {
  test('encodes and decodes library view settings', () {
    const settings = SheetLibraryViewSettings(
      sortMode: SheetLibrarySortMode.rating,
      favoriteOnly: true,
      tagQuery: 'lesson',
      collectionQuery: 'Methods',
      groupQuery: 'Warmup',
      minimumRating: 4,
    );

    final decoded = SheetLibraryViewSettingsCodec.decode(
      SheetLibraryViewSettingsCodec.encode(settings),
    );

    expect(decoded.sortMode, SheetLibrarySortMode.rating);
    expect(decoded.favoriteOnly, isTrue);
    expect(decoded.tagQuery, 'lesson');
    expect(decoded.collectionQuery, 'Methods');
    expect(decoded.groupQuery, 'Warmup');
    expect(decoded.minimumRating, 4);
  });

  test('falls back to default settings for malformed JSON', () {
    expect(
      SheetLibraryViewSettingsCodec.decode('{bad json').sortMode,
      SheetLibraryViewSettings.defaultSettings.sortMode,
    );
    expect(SheetLibraryViewSettingsCodec.decode('[]').hasAnyFilter, isFalse);
  });

  test('ignores invalid persisted field types', () {
    final settings = SheetLibraryViewSettings.fromJson(<String, Object?>{
      'sortMode': 7,
      'favoriteOnly': 'true',
      'tagQuery': 4,
      'collectionQuery': <String>['book'],
      'groupQuery': false,
      'minimumRating': 3.6,
    });

    expect(settings.sortMode, SheetLibrarySortMode.recent);
    expect(settings.favoriteOnly, isFalse);
    expect(settings.tagQuery, isEmpty);
    expect(settings.collectionQuery, isEmpty);
    expect(settings.groupQuery, isEmpty);
    expect(settings.minimumRating, 4);
  });

  test('matches and serializes trimmed direct filter values', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    const settings = SheetLibraryViewSettings(
      sortMode: SheetLibrarySortMode.recent,
      favoriteOnly: false,
      tagQuery: ' lesson ',
      collectionQuery: ' methods ',
      groupQuery: ' WARMUP ',
      minimumRating: 4,
    );
    final score = SheetScore(
      id: 'score-1',
      title: 'Etude',
      composer: 'Composer',
      tags: const <String>['Lesson'],
      note: '',
      filePath: '/tmp/etude.pdf',
      collection: 'Methods',
      group: 'Warmup',
      rating: 4,
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
    );
    final json = settings.toJson();

    expect(settings.matches(score), isTrue);
    expect(json['tagQuery'], 'lesson');
    expect(json['collectionQuery'], 'methods');
    expect(json['groupQuery'], 'WARMUP');
    expect(json['minimumRating'], 4);
  });

  test('encodes and decodes performance preset templates', () {
    final templates = SheetPerformancePresetTemplateCodec.decode(
      SheetPerformancePresetTemplateCodec.encode(
        const <SheetPerformancePresetTemplate>[
          SheetPerformancePresetTemplate(
            id: 'preset-2',
            name: 'Tablet',
            deviceProfile: 'Galaxy Tab',
            viewerSettings: SheetViewerSettings(
              displayMode: 'twoPage',
              halfPageTurn: true,
              pageScale: SheetViewerSettings.fitWidthScale,
              pedalMapping: SheetViewerSettings.setlistPedalMapping,
              autoAdvanceSetlist: true,
            ),
          ),
          SheetPerformancePresetTemplate(
            id: 'preset-1',
            name: 'Stage',
            viewerSettings: SheetViewerSettings(
              displayMode: 'continuousVertical',
              halfPageTurn: false,
            ),
          ),
        ],
      ),
    );

    expect(templates.map((template) => template.name), <String>[
      'Stage',
      'Tablet',
    ]);
    expect(templates.last.deviceProfile, 'Galaxy Tab');
    expect(
      templates.last.viewerSettings.pedalMapping,
      SheetViewerSettings.setlistPedalMapping,
    );
    expect(templates.last.viewerSettings.autoAdvanceSetlist, isTrue);
  });

  test('normalizes malformed performance preset template JSON', () {
    final templates = SheetPerformancePresetTemplate.decodeJsonList(<Object?>[
      <String, Object?>{
        'id': '',
        'name': '',
        'viewerSettings': <String, Object?>{
          'displayMode': 'bad',
          'halfPageTurn': 'true',
          'pageScale': 'fullscreen',
        },
      },
      'bad',
    ]);

    expect(templates.single.id, 'performance-preset');
    expect(templates.single.name, SheetPerformancePresetTemplate.defaultName);
    expect(templates.single.viewerSettings.displayMode, 'auto');
    expect(templates.single.viewerSettings.halfPageTurn, isFalse);
    expect(
      templates.single.viewerSettings.pageScale,
      SheetViewerSettings.fullscreenScale,
    );
    expect(SheetPerformancePresetTemplateCodec.decode('{bad'), isEmpty);
  });
}
