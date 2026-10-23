import 'package:classical_local_library/presentation/play_library_components.dart';

import 'dart:io';
import 'dart:ui' as ui;

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/sample_classical_library.dart';

void main() {
  for (final entry in [
    ('library', Brightness.light, 390.0, 1.0),
    ('empty', Brightness.dark, 390.0, 1.0),
    ('empty-small', Brightness.dark, 320.0, 2.0),
    ('large', Brightness.dark, 320.0, 2.0),
    ('wide', Brightness.light, 1024.0, 1.0),
  ]) {
    testWidgets('play brand ${entry.$1}, ${entry.$3}px, text ${entry.$4}', (
      t,
    ) async {
      t.view.physicalSize = Size(entry.$3, 1100);
      t.view.devicePixelRatio = 1;
      t.platformDispatcher.platformBrightnessTestValue = entry.$2;
      t.platformDispatcher.textScaleFactorTestValue = entry.$4;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      addTearDown(t.platformDispatcher.clearAllTestValues);
      final path = Platform.environment['DDIRORI_BRAND_FONT'];
      if (path != null) {
        await t.runAsync(() async {
          final loader = FontLoader('DdiroriCapture')
            ..addFont(
              Future.value(
                ByteData.sublistView(await File(path).readAsBytes()),
              ),
            );
          await loader.load();
          final fallback = FontLoader('Roboto')
            ..addFont(
              Future.value(
                ByteData.sublistView(await File(path).readAsBytes()),
              ),
            );
          await fallback.load();
          final iconsPath = Platform.environment['DDIRORI_MATERIAL_FONT'];
          if (iconsPath != null) {
            final icons = FontLoader('MaterialIcons')
              ..addFont(
                Future.value(
                  ByteData.sublistView(await File(iconsPath).readAsBytes()),
                ),
              );
            await icons.load();
          }
        });
      }
      await t.pumpWidget(
        RepaintBoundary(
          key: const Key('brand-capture'),
          child: ClassicalLocalLibraryApp(
            fontFamily: 'DdiroriCapture',
            initialLibrary: entry.$1.startsWith('empty')
                ? emptyClassicalLibrary
                : sampleClassicalLibrary,
            enableDemoFeatures: !entry.$1.startsWith('empty'),
            playbackController: FakeLocalPlayer(),
            scanRepository: ScannedAudioRepository(MemoryScannedAudioStore()),
            scanLocationRepository: ScanLocationRepository(
              MemoryScanLocationStore(),
            ),
            metadataCandidateRepository: MetadataCandidateRepository(
              MemoryMetadataCandidateStore(),
            ),
            fileTrackLinkRepository: AudioFileTrackLinkRepository(
              MemoryAudioFileTrackLinkStore(),
            ),
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.byType(DdiroriProductSignature), findsOneWidget);
      if (entry.$4 == 1) {
        expect(find.text('띠로리 플레이'), findsWidgets);
      } else {
        expect(find.text('띠로리'), findsOneWidget);
        expect(find.text('플레이'), findsOneWidget);
      }
      if (entry.$1.startsWith('empty')) {
        await t.scrollUntilVisible(
          find.byType(DdiroriBachVector),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        await t.pumpAndSettle();
        expect(find.byType(DdiroriBachVector), findsOneWidget);
      }
      expect(t.takeException(), isNull);
      if (Platform.environment['DDIRORI_BRAND_CAPTURE'] == 'true') {
        final boundary = t.renderObject<RenderRepaintBoundary>(
          find.byKey(const Key('brand-capture')),
        );
        await t.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: 1.5);
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          final file = File(
            '${Platform.environment['DDIRORI_BRAND_CAPTURE_OUTPUT'] ?? '../../docs/brand/ddirori-brand-system/evidence'}/play-${entry.$1}-${entry.$2.name}.png',
          );
          await file.parent.create(recursive: true);
          await file.writeAsBytes(bytes!.buffer.asUint8List());
          image.dispose();
        });
      }
      if (entry.$1 == 'library') {
        await t.scrollUntilVisible(
          find.byWidgetPredicate(
            (widget) =>
                widget is PlayWorkRow &&
                widget.work.id == sampleClassicalLibrary.works.first.id,
          ),
          300,
          scrollable: find.byType(Scrollable).first,
          maxScrolls: 30,
        );
        await t.pumpAndSettle();
        expect(t.takeException(), isNull);
        if (Platform.environment['DDIRORI_BRAND_CAPTURE'] == 'true') {
          final boundary = t.renderObject<RenderRepaintBoundary>(
            find.byKey(const Key('brand-capture')),
          );
          await t.runAsync(() async {
            final image = await boundary.toImage(pixelRatio: 1.5);
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            final file = File(
              '${Platform.environment['DDIRORI_BRAND_CAPTURE_OUTPUT'] ?? '../../docs/brand/ddirori-brand-system/evidence'}/play-work-list-light.png',
            );
            await file.writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }
      }
      await t.pumpWidget(const SizedBox());
    });
  }
}
