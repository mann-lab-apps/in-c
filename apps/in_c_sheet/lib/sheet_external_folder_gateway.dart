import 'package:flutter/services.dart';

import 'sheet_external_folder_catalog.dart';
import 'sheet_library_controller.dart';

class SheetExternalFolderSelection {
  const SheetExternalFolderSelection({
    required this.folderLabel,
    required this.entries,
    this.providerLabel,
  });

  factory SheetExternalFolderSelection.fromPlatformMap(
    Map<Object?, Object?> value,
  ) {
    final rawEntries = value['entries'];
    final entries = rawEntries is List
        ? rawEntries
              .whereType<Map<Object?, Object?>>()
              .map(SheetExternalFolderSelection._entryFromPlatformMap)
              .whereType<SheetExternalFolderEntry>()
              .toList(growable: false)
        : const <SheetExternalFolderEntry>[];
    return SheetExternalFolderSelection(
      folderLabel: value['folderLabel']?.toString().trim() ?? '',
      providerLabel: value['providerLabel']?.toString().trim(),
      entries: entries,
    );
  }

  static SheetExternalFolderEntry? _entryFromPlatformMap(
    Map<Object?, Object?> value,
  ) {
    final displayName = value['displayName']?.toString().trim() ?? '';
    if (displayName.isEmpty) {
      return null;
    }
    final rawModifiedAt = value['modifiedAt'];
    final parsedModifiedAt = rawModifiedAt is num
        ? DateTime.fromMillisecondsSinceEpoch(rawModifiedAt.toInt())
        : DateTime.tryParse(rawModifiedAt?.toString() ?? '');
    final rawSize = value['sizeBytes'];
    return SheetExternalFolderEntry(
      displayName: displayName,
      documentId: value['documentId']?.toString(),
      providerLabel: value['providerLabel']?.toString(),
      sizeBytes: rawSize is num ? rawSize.toInt() : null,
      modifiedAt: parsedModifiedAt,
      canRead: value['canRead'] is bool ? value['canRead']! as bool : true,
    );
  }

  final String folderLabel;
  final String? providerLabel;
  final List<SheetExternalFolderEntry> entries;
}

class SheetExternalFolderGatewayException implements Exception {
  const SheetExternalFolderGatewayException(this.message);

  final String message;
}

abstract class SheetExternalFolderGateway {
  Future<SheetExternalFolderSelection?> pickFolder();

  Future<List<SheetSharedImportFile>> copySelected(
    Iterable<SheetExternalFolderCopySource> sources,
  );
}

class MethodChannelSheetExternalFolderGateway
    implements SheetExternalFolderGateway {
  MethodChannelSheetExternalFolderGateway({MethodChannel? channel})
    : _channel = channel ?? const MethodChannel('clef/external_folder');

  final MethodChannel _channel;

  @override
  Future<SheetExternalFolderSelection?> pickFolder() async {
    try {
      final response = await _channel.invokeMethod<Object?>('pickFolder');
      if (response is! Map<Object?, Object?>) {
        return null;
      }
      return SheetExternalFolderSelection.fromPlatformMap(response);
    } on PlatformException catch (error) {
      throw SheetExternalFolderGatewayException(
        error.message ?? '폴더를 열지 못했습니다.',
      );
    } on MissingPluginException {
      throw const SheetExternalFolderGatewayException(
        '이 기기에서는 폴더 가져오기를 지원하지 않습니다.',
      );
    }
  }

  @override
  Future<List<SheetSharedImportFile>> copySelected(
    Iterable<SheetExternalFolderCopySource> sources,
  ) async {
    final copySources = sources
        .where((source) {
          return source.documentToken?.trim().isNotEmpty == true;
        })
        .toList(growable: false);
    final documentTokens = copySources
        .map((source) => source.documentToken!.trim())
        .toList(growable: false);
    if (documentTokens.isEmpty) {
      return const <SheetSharedImportFile>[];
    }
    try {
      final response = await _channel.invokeMethod<Object?>('copySelected', {
        'documentTokens': documentTokens,
      });
      final files = normalizeSharedImportPayload(response);
      final sourcesByName = <String, SheetExternalFolderCopySource?>{};
      for (final source in copySources) {
        final name = SheetExternalFolderCatalogPreview.normalizeName(
          source.displayName,
        );
        if (name.isEmpty) continue;
        sourcesByName[name] = sourcesByName.containsKey(name) ? null : source;
      }
      return files
          .map((file) {
            final source =
                sourcesByName[SheetExternalFolderCatalogPreview.normalizeName(
                  file.name,
                )];
            final importSource = source?.toScoreImportSource();
            return importSource == null
                ? file
                : file.copyWith(importSource: importSource);
          })
          .toList(growable: false);
    } on PlatformException catch (error) {
      throw SheetExternalFolderGatewayException(
        error.message ?? '선택한 PDF를 복사하지 못했습니다.',
      );
    } on MissingPluginException {
      throw const SheetExternalFolderGatewayException(
        '이 기기에서는 폴더 가져오기를 지원하지 않습니다.',
      );
    }
  }
}
