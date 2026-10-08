import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_annotation_stamp_asset_store.dart';

void main() {
  test('stores image stamp assets under a deterministic safe path', () async {
    final root = await Directory.systemTemp.createTemp('clef-stamp-assets-');
    addTearDown(() async {
      if (root.existsSync()) {
        await root.delete(recursive: true);
      }
    });
    final source = File('${root.path}/source/unsafe name.png');
    await source.parent.create(recursive: true);
    final bytes = _pngBytes(width: 2, height: 1);
    await source.writeAsBytes(bytes, flush: true);
    const store = SheetAnnotationStampAssetStore();
    final result = await SheetAnnotationStampAssetStore(rootDirectory: root)
        .importImageStampAsset(
          sourceFile: source,
          packId: 'My Pack!',
          stampId: '../Cue 1',
          label: 'Cue image',
          category: 'Rehearsal',
          licenseLabel: 'Original',
          keywords: const <String>[' Cue ', 'cue', 'entrance'],
        );

    expect(store.rootDirectory, isNull);
    expect(result.didStore, isTrue);
    expect(result.didReplaceExistingAsset, isFalse);
    expect(result.failureReason, isEmpty);
    expect(result.plan, isNotNull);
    expect(result.plan!.assetRef, 'stamps/my-pack/cue-1.png');
    expect(result.plan!.assetSizeBytes, bytes.length);
    expect(result.plan!.assetWidthPixels, 2);
    expect(result.plan!.assetHeightPixels, 1);
    expect(result.userStamp, isNotNull);
    expect(result.userStamp!.kind, SheetAnnotationUserStamp.imageKind);
    expect(result.userStamp!.label, 'Cue image');
    expect(result.userStamp!.keywords, <String>['cue', 'entrance']);
    expect(result.assetPath, isNotNull);
    expect(await File(result.assetPath!).readAsBytes(), bytes);
    expect(
      await SheetAnnotationStampAssetStore(rootDirectory: root)
          .assetExists(result.plan!.assetRef),
      isTrue,
    );
  });

  test(
    'reuses identical assets and atomically replaces changed assets',
    () async {
      final root = await Directory.systemTemp.createTemp(
        'clef-stamp-assets-replace-',
      );
      addTearDown(() async {
        if (root.existsSync()) {
          await root.delete(recursive: true);
        }
      });
      final store = SheetAnnotationStampAssetStore(rootDirectory: root);
      final source = File('${root.path}/source/photo.png');
      await source.parent.create(recursive: true);
      final firstBytes = _pngBytes(width: 1, height: 1, color: 0xffff0000);
      await source.writeAsBytes(firstBytes, flush: true);

      final first = await store.importImageStampAsset(
        sourceFile: source,
        packId: 'pack',
        stampId: 'photo',
        label: 'Photo',
        licenseLabel: 'Original',
      );
      final reused = await store.importImageStampAsset(
        sourceFile: source,
        packId: 'pack',
        stampId: 'photo',
        label: 'Photo',
        licenseLabel: 'Original',
      );

      final secondBytes = _pngBytes(width: 1, height: 1, color: 0xff0000ff);
      await source.writeAsBytes(secondBytes, flush: true);
      final replaced = await store.importImageStampAsset(
        sourceFile: source,
        packId: 'pack',
        stampId: 'photo',
        label: 'Photo',
        licenseLabel: 'Original',
      );

      expect(first.didStore, isTrue);
      expect(first.didReplaceExistingAsset, isFalse);
      expect(reused.didStore, isTrue);
      expect(reused.didReuseExistingAsset, isTrue);
      expect(replaced.didStore, isTrue);
      expect(replaced.didReplaceExistingAsset, isTrue);
      expect(replaced.assetPath, first.assetPath);
      expect(await File(replaced.assetPath!).readAsBytes(), secondBytes);
    },
  );

  test(
    'rejects unsafe or unsupported image stamp assets before writing',
    () async {
      final root = await Directory.systemTemp.createTemp(
        'clef-stamp-assets-reject-',
      );
      addTearDown(() async {
        if (root.existsSync()) {
          await root.delete(recursive: true);
        }
      });
      final store = SheetAnnotationStampAssetStore(rootDirectory: root);
      final unsupported = File('${root.path}/source/photo.gif');
      final invalid = File('${root.path}/source/not-image.png');
      final oversized = File('${root.path}/source/huge.png');
      await unsupported.parent.create(recursive: true);
      await unsupported.writeAsBytes(_pngBytes(), flush: true);
      await invalid.writeAsString('not an image', flush: true);
      await oversized.writeAsBytes(
        List<int>.filled(SheetAnnotationStampPack.maxImageAssetBytes + 1, 0),
        flush: true,
      );

      final missingResult = await store.importImageStampAsset(
        sourceFile: File('${root.path}/missing.png'),
        packId: 'pack',
        stampId: 'missing',
        label: 'Missing',
      );
      final unsupportedResult = await store.importImageStampAsset(
        sourceFile: unsupported,
        packId: 'pack',
        stampId: 'gif',
        label: 'GIF',
      );
      final invalidResult = await store.importImageStampAsset(
        sourceFile: invalid,
        packId: 'pack',
        stampId: 'invalid',
        label: 'Invalid',
      );
      final oversizedResult = await store.importImageStampAsset(
        sourceFile: oversized,
        packId: 'pack',
        stampId: 'oversized',
        label: 'Oversized',
      );

      expect(missingResult.failureReason, 'sourceMissing');
      expect(unsupportedResult.failureReason, 'unsupportedExtension');
      expect(invalidResult.failureReason, 'unsupportedImage');
      expect(oversizedResult.failureReason, 'oversizedImage');
      expect(Directory('${root.path}/annotation-stamps').existsSync(), isFalse);
    },
  );

  test('throws before resolving unsafe stored asset refs', () async {
    final root = await Directory.systemTemp.createTemp(
      'clef-stamp-assets-ref-',
    );
    addTearDown(() async {
      if (root.existsSync()) {
        await root.delete(recursive: true);
      }
    });
    final store = SheetAnnotationStampAssetStore(rootDirectory: root);

    expect(store.assetFileForRef('../outside.png'), throwsArgumentError);
    expect(
      store.assetFileForRef('https://example.invalid/photo.png'),
      throwsArgumentError,
    );
  });
}

List<int> _pngBytes({int width = 1, int height = 1, int color = 0xff00ff00}) {
  final bitmap = image.Image(width: width, height: height);
  final red = (color >> 16) & 0xff;
  final green = (color >> 8) & 0xff;
  final blue = color & 0xff;
  for (var y = 0; y < height; y += 1) {
    for (var x = 0; x < width; x += 1) {
      bitmap.setPixelRgb(x, y, red, green, blue);
    }
  }
  return image.encodePng(bitmap);
}
