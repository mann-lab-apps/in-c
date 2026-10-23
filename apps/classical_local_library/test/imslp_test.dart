import 'dart:convert';

import 'package:classical_local_library/imslp.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('official MediaWiki search response becomes work candidates', () {
    final results = HttpImslpCatalogClient.parseSearchResponse(
      jsonEncode({
        'query': {
          'search': [
            {
              'title': 'Symphony No.5, Op.67 (Beethoven, Ludwig van)',
              'unknownFutureField': true,
            },
            {'title': ''},
          ],
        },
      }),
    );

    expect(results, hasLength(1));
    expect(results.single.title, 'Symphony No.5, Op.67');
    expect(results.single.composerName, 'Beethoven, Ludwig van');
    expect(results.single.pageUrl.host, 'imslp.org');
    expect(results.single.pageUrl.path, contains('Symphony_No.5'));
  });

  test('missing search list is an empty result and malformed JSON fails', () {
    expect(HttpImslpCatalogClient.parseSearchResponse('{}'), isEmpty);
    expect(
      () => HttpImslpCatalogClient.parseSearchResponse('not-json'),
      throwsFormatException,
    );
  });

  test('official URL policy rejects lookalike hosts and credentials', () {
    expect(
      ImslpUrlPolicy.normalizeOfficialHttps(
        'https://imslp.org/wiki/Symphony_No.5',
      ),
      isNotNull,
    );
    expect(
      ImslpUrlPolicy.normalizeOfficialHttps(
        'https://s9.imslp.org/files/score.pdf#fragment',
      )?.fragment,
      isEmpty,
    );
    expect(
      ImslpUrlPolicy.normalizeOfficialHttps(
        'https://imslp.org.evil.example/score.pdf',
      ),
      isNull,
    );
    expect(
      ImslpUrlPolicy.normalizeOfficialHttps(
        'https://user:secret@imslp.org/score.pdf',
      ),
      isNull,
    );
    expect(
      ImslpUrlPolicy.normalizeOfficialHttps('http://imslp.org/score.pdf'),
      isNull,
    );
  });

  test(
    'rights policy never treats unknown or regional status as downloadable',
    () {
      const policy = ImslpDownloadPolicy();
      expect(
        policy.decide(_resource(ImslpRightsStatus.publicDomain)),
        ImslpDownloadDecision.requiresConfirmation,
      );
      expect(
        policy.decide(_resource(ImslpRightsStatus.freeLicense)),
        ImslpDownloadDecision.requiresConfirmation,
      );
      expect(
        policy.decide(_resource(ImslpRightsStatus.regionalRestriction)),
        ImslpDownloadDecision.externalPageRequired,
      );
      expect(
        policy.decide(_resource(ImslpRightsStatus.unknown)),
        ImslpDownloadDecision.externalPageRequired,
      );
      expect(
        policy.decide(_resource(ImslpRightsStatus.unavailable)),
        ImslpDownloadDecision.blocked,
      );
    },
  );

  test('sound recording always exposes related-rights warning', () {
    final resource = _resource(
      ImslpRightsStatus.publicDomain,
      isSoundRecording: true,
    );
    expect(resource.rightsNotice, contains('녹음·실연 권리는 별도로'));
  });

  test('memory store warns when one IMSLP work is linked twice', () async {
    final store = MemoryImslpStore();
    await store.upsertWorkLink(_link('work-1'));

    expect(
      () => store.upsertWorkLink(_link('work-2')),
      throwsA(isA<ImslpLinkConflictException>()),
    );
  });

  test('unknown persisted enum values fall back safely', () {
    expect(imslpRightsStatusFromName('futureValue'), ImslpRightsStatus.unknown);
    expect(imslpResourceKindFromName('futureValue'), ImslpResourceKind.other);
    expect(
      imslpTransferStatusFromName('futureValue'),
      ImslpTransferStatus.failed,
    );
  });
}

ImslpResource _resource(
  ImslpRightsStatus status, {
  bool isSoundRecording = false,
}) {
  return ImslpResource(
    id: 'resource-1',
    workId: 'work-1',
    pageUrl: 'https://imslp.org/wiki/Test',
    kind: isSoundRecording ? ImslpResourceKind.audio : ImslpResourceKind.score,
    rightsStatus: status,
    fetchedAtMillis: 1,
    directDownloadUrl: 'https://s9.imslp.org/files/test.pdf',
    originalFileName: 'test.pdf',
    isSoundRecording: isSoundRecording,
  );
}

ImslpWorkLink _link(String workId) => ImslpWorkLink(
  workId: workId,
  externalId: 'Symphony No.5, Op.67 (Beethoven, Ludwig van)',
  pageUrl: 'https://imslp.org/wiki/Test',
  workTitle: 'Symphony No.5, Op.67',
  linkedAtMillis: 1,
);
