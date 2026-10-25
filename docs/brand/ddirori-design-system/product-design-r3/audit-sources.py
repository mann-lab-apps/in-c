"""Record R3 source evidence without updating any historical manifest."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCES = {
    'README.md': ['cross-app data sharing'],
    'apps/classical_local_library/README.md': ['로컬', 'import'],
    'apps/classical_local_library/lib/main.dart': ['ENABLE_DEMO_LIBRARY', 'Future<void> _importAudioFiles', 'Future<void> _openCatalogRegistration'],
    'apps/classical_local_library/lib/folder_picker.dart': ['class PlatformAudioFilePicker'],
    'apps/classical_local_library/lib/local_audio_import.dart': ['class LocalAudioImportPolicy', 'Future<LocalAudioImportBatchResult> _importFiles', 'Future<ManagedAudioExportFile> exportFileFor', 'Future<LocalAudioImportItemResult> _copySelection'],
    'apps/classical_local_library/lib/local_audio_export.dart': ['class SharePlusManagedAudioExporter'],
    'apps/classical_local_library/lib/local_audio_scanner.dart': ['audioExtensionForPath'],
    'apps/classical_local_library/lib/catalog_registration_screen.dart': ['String? _required', "'라이브러리에 저장'"],
    'apps/classical_local_library/lib/library_management.dart': ['Future<void> _exportManagedFile', 'Future<void> _editLink'],
    'apps/classical_local_library/lib/imslp.dart': ['enum ImslpResourceKind'],
    'apps/classical_local_library/lib/imslp_download.dart': ['_isSupportedExtension'],
    'apps/classical_local_library/ios/Runner/Info.plist': ['CFBundleDisplayName'],
    'apps/classical_local_library/android/app/src/main/AndroidManifest.xml': ['android.intent.action.MAIN'],
    'apps/classical_local_library/pubspec.yaml': ['url_launcher'],
    'apps/in_c_sheet/README.md': ['Known limitations'],
    'apps/in_c_sheet/lib/main.dart': ['_sharedImportChannel =', 'Future<void> _importSharedFiles', 'Future<void> _showPracticeTools'],
    'apps/in_c_sheet/lib/sheet_library_controller.dart': ['Future<SheetScore?> importPdf', 'Future<List<SheetScore>> importSharedPdfFiles', 'Future<SheetLinkedFile?> addLinkedFile', 'Future<void> _replace('],
    'apps/in_c_sheet/lib/sheet_library_store.dart': ['Future<SheetScore?> importPdf', 'Future<SheetLinkedFile?> pickLinkedFile', 'Future<SheetLinkedFile> importLinkedFileBytes', 'Future<String> _writeImportedPdf', 'Future<String> _writeLinkedFile'],
    'apps/in_c_sheet/lib/sheet_file_import.dart': ['class SheetFileImportPolicy'],
    'apps/in_c_sheet/lib/sheet_audio_player.dart': ['class'],
    'apps/in_c_sheet/ios/Runner/Info.plist': ['CFBundleDocumentTypes'],
    'apps/in_c_sheet/ios/Runner/ClefSharedImportBridge.swift': ['private func copySharedPdfToCache'],
    'apps/in_c_sheet/android/app/src/main/AndroidManifest.xml': ['android.intent.action.VIEW', 'android.intent.action.SEND'],
    'apps/in_c_sheet/android/app/src/main/kotlin/com/mannlab/clef/MainActivity.kt': ['private fun copySharedPdfToCache'],
    'src/renderer/src/App.tsx': ['const openNewScoreWizard', 'const submitNewScoreWizard', 'const saveNativeProject', 'const savePdf', 'function createDefaultNewScoreDraft'],
    'src/renderer/src/editor/new-score.ts': ['export'],
    'src/renderer/src/editor/file-lifecycle.ts': ['export'],
    'src/main/index.ts': ["const savePdfChannel =", 'printToPDF'],
    'src/preload/index.ts': ['pdf:', 'project:'],
    'package.json': ['"build":', '"productName":'],
    'packages/ddirori_web/src/index.tsx': ['export function ServiceLink'],
    'packages/ddirori_ui/lib/src/brand_family.dart': ['class DdiroriServiceLink'],
    'docs/brand/ddirori-design-system/specifications/patterns.md': ['PAT-LINK'],
}

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

data = {'atUtc': datetime.now(timezone.utc).isoformat(),
        'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'scope': 'Read-only repository capability audit; no native integration/device proof', 'files': {}}
lines = ['# 소스 근거 색인', '', '실제 기준과 SHA256은 [source-audit.json](evidence/source-audit.json). 함수 위치는 조사 시점의 탐색용이며 현재 파일이 바뀌면 본문과 해시를 다시 대조한다.', '']
for name, needles in SOURCES.items():
    p = ROOT / name
    if not p.is_file():
        # Fail rather than silently declaring a nonexistent implementation as evidence.
        raise SystemExit('Missing audit source: ' + name)
    content = p.read_text()
    anchors = [{'text': n, 'lines': [i for i, line in enumerate(content.splitlines(), 1) if n in line][:5]} for n in needles]
    data['files'][name] = {'sha256': sha(p), 'anchors': anchors}
    lines.append(f'- [{name}](../../../../{name})' + ' — ' + '; '.join(f"`{a['text']}` {a['lines'] or '(목차/인접 코드 확인)'}" for a in anchors))
(HERE / 'evidence/source-audit.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
(HERE / 'source-index.md').write_text('\n'.join(lines) + '\n')
print('Recorded', len(data['files']), 'source files; historical revisions untouched')
