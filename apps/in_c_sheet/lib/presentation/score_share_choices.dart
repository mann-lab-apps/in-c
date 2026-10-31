import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../sheet_library_store.dart';

/// Candidate policy and file access belong to the app, never to this sheet.
Future<SheetScoreShareCandidate?> showScoreShareChoices({
  required BuildContext context,
  required List<SheetScoreShareCandidate> candidates,
  required IconData Function(SheetScoreShareCandidate) iconFor,
}) {
  if (candidates.length == 1) {
    return Future.value(candidates.single);
  }
  return showDdiroriSheet<SheetScoreShareCandidate>(
    context: context,
    title: '공유할 파일 선택',
    child: Builder(
      builder: (sheetContext) {
        Widget item(int index) {
          final candidate = candidates[index];
          return DdiroriItem(
            leading: Icon(iconFor(candidate)),
            title: candidate.label,
            subtitle: candidate.fileName,
            flat: true,
            onTap: () => Navigator.of(sheetContext).pop(candidate),
          );
        }

        return DdiroriStack(
          children: [
            const DdiroriBanner(message: '공유할 파일을 선택해 주세요.'),
            if (candidates.length <= 20)
              for (var i = 0; i < candidates.length; i++) item(i)
            else
              SizedBox(
                height: MediaQuery.sizeOf(sheetContext).height * .45,
                child: ListView.builder(
                  primary: false,
                  itemCount: candidates.length,
                  itemBuilder: (_, i) => item(i),
                ),
              ),
            DdiroriButton(
              label: '취소',
              kind: DdiroriButtonKind.quiet,
              onPressed: () => Navigator.of(sheetContext).pop(),
            ),
          ],
        );
      },
    ),
  );
}
