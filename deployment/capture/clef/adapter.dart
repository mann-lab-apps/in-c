// Staged only into an isolated checkout by capture_screenshots.py.
// Uses the unchanged production widgets and real PDF renderer/store.
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:in_c_sheet/main.dart' as app;
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdfrx/pdfrx.dart' show pdfrxFlutterInitialize;

Future<List<int>> originalScore(String title, int variant) async {
  final doc = pw.Document();
  for (var page = 0; page < 3; page++) {
    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(42),
        build: (_) => pw.Column(
          children: [
            pw.Text(
              title,
              style: pw.TextStyle(fontSize: 25, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 8),
            pw.Text(
              'Original piano study  /  Andante',
              style: const pw.TextStyle(fontSize: 11),
            ),
            pw.SizedBox(height: 20),
            pw.CustomPaint(
              size: const PdfPoint(510, 570),
              painter: (canvas, size) {
                canvas.setColor(PdfColors.black);
                for (var system = 0; system < 5; system++) {
                  final top = 545.0 - system * 110;
                  canvas.setLineWidth(.7);
                  for (var line = 0; line < 5; line++) {
                    canvas.drawLine(8, top - line * 7, 500, top - line * 7);
                  }
                  for (var bar = 0; bar <= 4; bar++) {
                    final x = 8.0 + bar * 123;
                    canvas.drawLine(x, top, x, top - 28);
                  }
                  canvas.strokePath();
                  for (var note = 0; note < 16; note++) {
                    final x = 30.0 + note * 30;
                    final y =
                        top -
                        14 +
                        (((note + system + variant + page) % 7) - 3) * 3.5;
                    canvas.drawEllipse(x, y, 4.5, 3.2);
                    canvas.fillPath();
                    canvas.drawLine(x + 4, y, x + 4, y + 24);
                    canvas.strokePath();
                  }
                }
              },
            ),
            pw.Spacer(),
            pw.Text(
              'Clef & Staff  /  Original demonstration score  /  ${page + 1}',
              style: const pw.TextStyle(fontSize: 9),
            ),
          ],
        ),
      ),
    );
  }
  return doc.save();
}

Future<void> launch() async {
  await pdfrxFlutterInitialize();
  final store = SheetLibraryStore();
  // This fixture adapter is used only on dedicated capture simulators.
  await store.saveSetlists([]);
  final scores = <SheetScore>[];
  const titles = ['Prelude', 'Waltz', 'Etude'];
  for (var index = 0; index < titles.length; index++) {
    final score = await store.importPdfBytes(
      bytes: await originalScore(titles[index], index),
      fileName: '${titles[index]}.pdf',
    );
    scores.add(
      score.copyWith(
        composer: 'Clef',
        tags: ['피아노', '매일 연습'],
        collection: 'Practice Journal',
        isFavorite: index == 0,
      ),
    );
  }
  await store.saveScores(scores);
  final controller = SheetLibraryController(store: store);
  await controller.load();
  final setlist = await controller.createSetlist('Evening Practice');
  await controller.addScoresToSetlist(setlist, scores);
  final now = DateTime.now();
  await controller.addAnnotationStroke(
    controller.scoreById(scores.first.id),
    SheetAnnotationStroke(
      id: 'practice-phrase',
      pageNumber: 1,
      tool: SheetAnnotationTool.highlighter,
      color: 0xffffd54f,
      width: 12,
      points: const [
        SheetAnnotationPoint(x: .17, y: .30),
        SheetAnnotationPoint(x: .43, y: .30),
      ],
      createdAt: now,
    ),
  );
  await controller.addAnnotationStroke(
    controller.scoreById(scores.first.id),
    SheetAnnotationStroke(
      id: 'practice-slur',
      pageNumber: 1,
      tool: SheetAnnotationTool.pen,
      color: 0xff237a76,
      width: 3,
      points: List.generate(
        21,
        (i) => SheetAnnotationPoint(
          x: .48 + i * .012,
          y: .36 + math.sin(i / 20 * math.pi) * .025,
        ),
      ),
      createdAt: now,
    ),
  );
  await controller.load();
  if (controller.scores.length != 3 ||
      controller.setlistById(setlist.id).scoreIds.length != 3 ||
      controller.scoreById(scores.first.id).annotationLayer.strokes.length !=
          2) {
    throw StateError('Capture fixtures did not persist');
  }
  runApp(app.InCSheetApp(controller: controller));
}
