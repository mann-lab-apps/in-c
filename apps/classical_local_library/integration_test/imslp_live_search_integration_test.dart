import 'dart:io';

import 'package:classical_local_library/imslp.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('iOS runtime reaches the official IMSLP search API', (
    tester,
  ) async {
    expect(Platform.isIOS, isTrue, reason: '이 smoke test는 iOS 전용입니다.');
    final httpClient = http.Client();
    addTearDown(httpClient.close);
    final client = HttpImslpCatalogClient(client: httpClient);

    final results = await client.searchWorks('Beethoven', limit: 5);

    expect(results, isNotEmpty);
    expect(
      results.every(
        (result) =>
            result.pageUrl.scheme == 'https' &&
            ImslpUrlPolicy.isOfficialHost(result.pageUrl.host),
      ),
      isTrue,
    );
  }, timeout: const Timeout(Duration(seconds: 30)));
}
