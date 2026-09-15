import 'dart:convert';
import 'dart:io';

import 'package:in_c_sheet/classical_discovery_catalog.dart';

void main() {
  final works = ClassicalDiscoveryCatalog.works.where(
    (work) => work.catalogStatusTags.contains('founder_pick'),
  );
  stdout.writeln(
    const JsonEncoder.withIndent('  ').convert([
      for (final work in works)
        {
          'workId': work.id,
          'title': '${work.composerNameKo}: ${work.titleKo}',
          'catalogNumber': work.catalogNumber,
          'instrumentation': work.instrumentation,
          'moment': work.primaryMoment?.prompt,
          'range':
              '${work.primaryMoment?.startSeconds}-${work.primaryMoment?.endSeconds}',
          'links': [
            for (final link in work.externalLinks)
              {
                'provider': link.platformId,
                'type': link.linkType,
                'url': link.url,
              },
          ],
          'relatedWorks': work.relatedWorkIds,
          'sourceVerification': 'NOT_VERIFIED',
          'playbackVerification': 'NOT_VERIFIED',
        },
    ]),
  );
}
