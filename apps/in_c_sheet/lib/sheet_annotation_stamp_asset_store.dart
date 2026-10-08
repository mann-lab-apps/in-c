import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as image;
import 'package:path_provider/path_provider.dart';

import 'sheet_annotation.dart';

class SheetImageStampAssetImportResult {
  const SheetImageStampAssetImportResult({
    required this.didStore,
    this.didReplaceExistingAsset = false,
    this.plan,
    this.userStamp,
    this.assetPath,
    this.failureReason = '',
  });

  final bool didStore;
  final bool didReplaceExistingAsset;
  final SheetAnnotationImageStampAssetPlan? plan;
  final SheetAnnotationUserStamp? userStamp;
  final String? assetPath;
  final String failureReason;

  bool get didReuseExistingAsset {
    return didStore && !didReplaceExistingAsset;
  }
}

class SheetAnnotationStampAssetStore {
  const SheetAnnotationStampAssetStore({this.rootDirectory});

  final Directory? rootDirectory;

  static const sourceMissingReason = 'sourceMissing';
  static const unsupportedExtensionReason = 'unsupportedExtension';
  static const unsupportedImageReason = 'unsupportedImage';
  static const oversizedImageReason = 'oversizedImage';
  static const invalidImageDimensionsReason = 'invalidImageDimensions';
  static const invalidAssetMetadataReason = 'invalidAssetMetadata';

  Future<SheetImageStampAssetImportResult> importImageStampAsset({
    required File sourceFile,
    required String packId,
    required String stampId,
    required String label,
    String category = '',
    String licenseLabel = '',
    String sourceUrl = '',
    List<String> keywords = const <String>[],
  }) async {
    if (!sourceFile.existsSync()) {
      return const SheetImageStampAssetImportResult(
        didStore: false,
        failureReason: sourceMissingReason,
      );
    }

    final fileName = _fileName(sourceFile);
    final extension = _extension(fileName);
    if (!SheetAnnotationStampPack.allowedImageAssetExtensions.contains(
      extension,
    )) {
      return const SheetImageStampAssetImportResult(
        didStore: false,
        failureReason: unsupportedExtensionReason,
      );
    }

    final bytes = await sourceFile.readAsBytes();
    if (bytes.length > SheetAnnotationStampPack.maxImageAssetBytes) {
      return const SheetImageStampAssetImportResult(
        didStore: false,
        failureReason: oversizedImageReason,
      );
    }

    final decoded = image.decodeImage(bytes);
    if (decoded == null) {
      return const SheetImageStampAssetImportResult(
        didStore: false,
        failureReason: unsupportedImageReason,
      );
    }
    if (decoded.width <= 0 ||
        decoded.height <= 0 ||
        decoded.width > SheetAnnotationStampPack.maxImageAssetDimensionPixels ||
        decoded.height >
            SheetAnnotationStampPack.maxImageAssetDimensionPixels ||
        decoded.width * decoded.height >
            SheetAnnotationStampPack.maxImageAssetPixels) {
      return const SheetImageStampAssetImportResult(
        didStore: false,
        failureReason: invalidImageDimensionsReason,
      );
    }

    final checksum = sha256.convert(bytes).toString();
    final plan = SheetAnnotationImageStampAssetPlan.forImport(
      packId: packId,
      stampId: stampId,
      sourceFileName: fileName,
      checksum: checksum,
      assetSizeBytes: bytes.length,
      assetWidthPixels: decoded.width,
      assetHeightPixels: decoded.height,
    );
    if (!plan.hasSupportedExtension) {
      return const SheetImageStampAssetImportResult(
        didStore: false,
        failureReason: unsupportedExtensionReason,
      );
    }
    final userStamp = plan.toUserStamp(
      label: label,
      category: category,
      licenseLabel: licenseLabel,
      sourceUrl: sourceUrl,
      keywords: keywords,
    );
    final pack = SheetAnnotationStampPack(
      id: plan.packId,
      name: plan.packId,
      version: 1,
      createdAt: DateTime.fromMillisecondsSinceEpoch(0),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(0),
      stamps: <SheetAnnotationUserStamp>[userStamp],
    );
    if (!pack.validate(allowImageStamps: true).isValid) {
      return SheetImageStampAssetImportResult(
        didStore: false,
        plan: plan,
        userStamp: userStamp,
        failureReason: invalidAssetMetadataReason,
      );
    }

    final destination = await assetFileForRef(plan.assetRef);
    if (destination.existsSync()) {
      final existingChecksum = sha256
          .convert(await destination.readAsBytes())
          .toString();
      if (existingChecksum == checksum) {
        return SheetImageStampAssetImportResult(
          didStore: true,
          plan: plan,
          userStamp: userStamp,
          assetPath: destination.path,
        );
      }
    }

    await destination.parent.create(recursive: true);
    final tempFile = File('${destination.path}.tmp');
    await tempFile.writeAsBytes(bytes, flush: true);
    if (destination.existsSync()) {
      await destination.delete();
      await tempFile.rename(destination.path);
      return SheetImageStampAssetImportResult(
        didStore: true,
        didReplaceExistingAsset: true,
        plan: plan,
        userStamp: userStamp,
        assetPath: destination.path,
      );
    }
    await tempFile.rename(destination.path);
    return SheetImageStampAssetImportResult(
      didStore: true,
      plan: plan,
      userStamp: userStamp,
      assetPath: destination.path,
    );
  }

  Future<File> assetFileForRef(String assetRef) async {
    final normalized = _normalizeAssetRef(assetRef);
    final root = await _assetRoot();
    return File('${root.path}/$normalized');
  }

  Future<bool> assetExists(String assetRef) async {
    return (await assetFileForRef(assetRef)).exists();
  }

  Future<bool> deleteAssetIfUnreferenced({
    required String assetRef,
    required Iterable<String> referencedAssetRefs,
  }) async {
    final normalized = _normalizeAssetRef(assetRef);
    final references = <String>{};
    for (final reference in referencedAssetRefs) {
      try {
        references.add(_normalizeAssetRef(reference));
      } catch (_) {
        // Ignore stale or unsafe references; they cannot own this asset.
      }
    }
    if (references.contains(normalized)) {
      return false;
    }
    final file = await assetFileForRef(normalized);
    if (!await file.exists()) {
      return false;
    }
    await file.delete();
    return true;
  }

  Future<Directory> _assetRoot() async {
    final root = rootDirectory ?? await getApplicationDocumentsDirectory();
    return Directory('${root.path}/annotation-stamps');
  }

  static String _normalizeAssetRef(String assetRef) {
    final normalized = assetRef.replaceAll('\\', '/');
    final uri = Uri.tryParse(normalized);
    if (uri?.hasScheme == true ||
        normalized.startsWith('/') ||
        !normalized.startsWith(SheetAnnotationStampPack.imageAssetPathPrefix) ||
        normalized.split('/').contains('..')) {
      throw ArgumentError.value(assetRef, 'assetRef', 'Unsafe asset ref');
    }
    return normalized;
  }

  static String _fileName(File file) {
    final normalized = file.path.replaceAll('\\', '/');
    final slash = normalized.lastIndexOf('/');
    return slash < 0 ? normalized : normalized.substring(slash + 1);
  }

  static String _extension(String fileName) {
    final dot = fileName.lastIndexOf('.');
    if (dot < 0 || dot == fileName.length - 1) {
      return '';
    }
    return fileName.substring(dot + 1).toLowerCase();
  }
}
