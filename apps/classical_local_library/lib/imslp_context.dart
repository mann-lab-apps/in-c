import 'classical_library_models.dart';
import 'composer_library.dart';
import 'imslp.dart';

/// Evidence for human confirmation, never an automatic identity/rights verdict.
class ImslpMatchEvidence {
  ImslpMatchEvidence({
    required ClassicalPerson composer,
    Work? work,
    required ImslpWorkSearchResult result,
  }) {
    bool same(String a, String b) =>
        ComposerNames.normalize(a) == ComposerNames.normalize(b);
    final name = result.composerName;
    if (name == null || name.trim().isEmpty) {
      notes.add('IMSLP 작곡가 정보 없음 · 직접 확인 필요');
    } else if (composer.name.searchNames.any((n) => same(n, name))) {
      notes.add('확인된 작곡가 이름·별칭 일치');
    } else {
      notes.add('작곡가 이름 다름: 로컬 ${composer.name.ko} / IMSLP $name');
    }
    if (work != null) {
      notes.add(
        work.title.searchNames.any((n) => same(n, result.title))
            ? '작품명 일치'
            : '작품명 다름: 로컬 ${work.title.ko} / IMSLP ${result.title}',
      );
      if (work.catalogNumber != null) {
        notes.add(
          result.catalogNumber == null
              ? 'IMSLP 작품번호 미확인'
              : same(work.catalogNumber!, result.catalogNumber!)
              ? '작품번호 일치'
              : '작품번호 다름: ${work.catalogNumber} / ${result.catalogNumber}',
        );
      }
    }
    notes.add('작품 페이지 참조입니다. 음원·악보 파일과 권리는 별도 확인합니다.');
  }
  final List<String> notes = [];
  String get summary => notes.join('\n');
}

bool isImslpWorkPage(Uri uri) {
  final normalized = ImslpUrlPolicy.normalizeOfficialHttps(uri.toString());
  if (normalized == null || !normalized.path.startsWith('/wiki/')) return false;
  final title = Uri.decodeComponent(normalized.path.substring(6));
  return title.isNotEmpty &&
      !RegExp(
        r'^(File|Category|Special|IMSLP|Help|User|Template|Talk):',
        caseSensitive: false,
      ).hasMatch(title);
}
