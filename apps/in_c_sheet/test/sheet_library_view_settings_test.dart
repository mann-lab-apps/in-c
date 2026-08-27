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
}
