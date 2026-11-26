import 'dart:async';
import 'dart:convert';
import 'dart:ffi';
import 'dart:io';

import 'package:pdfrx/pdfrx.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  final manifest = File(
    'build/native_assets/${Platform.operatingSystem}/native_assets.json',
  );

  // Flutter test emits this manifest before starting the test isolate.
  if (Pdfrx.pdfiumModulePath == null && await manifest.exists()) {
    final json =
        jsonDecode(await manifest.readAsString()) as Map<String, dynamic>;
    final assets = json['native-assets'] as Map<String, dynamic>;
    final host = assets[Abi.current().toString()] as Map<String, dynamic>?;
    final pdfium = host?['package:pdfium_dart/libpdfium'] as List<dynamic>?;

    if (pdfium case ['absolute', String library]) {
      Pdfrx.pdfiumModulePath = library;
    }
  }

  await testMain();
}
