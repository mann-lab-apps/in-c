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
      final context = t.element(find.text('보관함').first);
      final theme = Theme.of(context);
      final colors = DdiroriStyle.of(context);
      expect(theme.colorScheme.primary, colors['action']);
      expect(colors['brand'], const Color(0xFFA5D8FF));
      expect(
        colors['action'],
        entry.$2 == Brightness.light
            ? const Color(0xFF1971C2)
            : const Color(0xFFA5D8FF),
      );
      expect(
        colors['selection'],
        entry.$2 == Brightness.light
            ? const Color(0xFFE7F5FF)
            : const Color(0xFF233344),
      );
      expect(
        colors['info'],
        entry.$2 == Brightness.light
            ? const Color(0xFF616161)
            : const Color(0xFFB8B8B8),
      );
      expect(find.text('띠로리 플레이'), findsNothing);
      expect(find.text('보관함'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Image &&
              widget.image is AssetImage &&
              (widget.image as AssetImage).assetName ==
                  'assets/branding/app_icon_provisional.png',
        ),
        findsNothing,
      );
      if (entry.$1.startsWith('empty')) {
        expect(find.text('보관함이 비어 있습니다'), findsOneWidget);
        expect(find.text('음악 가져오기'), findsOneWidget);
        expect(find.byType(DdiroriBachVector), findsNothing);
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
