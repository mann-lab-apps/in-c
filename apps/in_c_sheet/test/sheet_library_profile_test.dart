import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';

void main() {
  test('decodes malformed profile lists to the default library', () {
    final profiles = SheetLibraryProfileCodec.decode('{bad json');

    expect(profiles.single.id, SheetLibraryProfile.defaultId);
    expect(profiles.single.name, SheetLibraryProfile.defaultName);
  });

  test('normalizes profile names and keeps default first', () {
    final now = DateTime.parse('2026-08-20T10:00:00.000');
    final profiles = SheetLibraryProfile.normalizeProfiles(<SheetLibraryProfile>[
      SheetLibraryProfile(
        id: SheetLibraryProfile.defaultId,
        name: 'Renamed Default',
        createdAt: now,
        updatedAt: now,
      ),
      SheetLibraryProfile(
        id: 'recital',
        name: ' Recital ',
        createdAt: now,
        updatedAt: now,
      ),
      SheetLibraryProfile(
        id: 'lesson',
        name: 'Lessons',
        createdAt: now,
        updatedAt: now,
      ),
    ]);

    expect(profiles.first.name, SheetLibraryProfile.defaultName);
    expect(profiles.map((profile) => profile.id), <String>[
      SheetLibraryProfile.defaultId,
      'lesson',
      'recital',
    ]);
    expect(profiles.last.name, 'Recital');
  });
}
