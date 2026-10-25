const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim();
const app = 'apps/classical_local_library';
const design = 'docs/brand/ddirori-design-system/product-design-r2';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, file))).digest('hex');
function filesIn(relative) {
  const full = path.resolve(root, relative);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [relative];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap(entry =>
    entry.isSymbolicLink() ? [] : filesIn(`${relative}/${entry.name}`));
}

// Match tool/run_local_qa.dart, including its relative path names and exclusions.
function qaFingerprint() {
  const directories = ['lib', 'test', 'integration_test', 'tool', 'assets', 'ios/Runner', '../../packages/ddirori_ui/lib', '../../packages/ddirori_ui/assets'];
  const names = directories.flatMap(dir => filesIn(`${app}/${dir}`).map(p => p.slice(app.length + 1)))
    .filter(p => !p.endsWith('/.DS_Store') && !['ios/Runner/GeneratedPluginRegistrant.h', 'ios/Runner/GeneratedPluginRegistrant.m'].includes(p));
  names.push('pubspec.yaml', 'pubspec.lock', 'ios/Runner.xcodeproj/project.pbxproj');
  return crypto.createHash('sha256').update(names.sort().map(p => `${p}:${hash(`${app}/${p}`)}`).join('\n')).digest('hex');
}

if (process.argv.length !== 3) throw new Error('Usage: node collect-evidence.cjs <app-relative build/local_qa/run-directory>');
const qaDirectory = path.resolve(root, app, process.argv[2]);
const report = JSON.parse(fs.readFileSync(path.join(qaDirectory, 'report.json')));
if (report.status !== 'passed' || report.sourceSha256Before !== report.sourceSha256After || qaFingerprint() !== report.sourceSha256After) {
  throw new Error('QA must pass on the unchanged current source');
}
for (const check of report.checks) {
  if (hash(path.join(qaDirectory, check.log)) !== check.logSha256) throw new Error(`QA log changed: ${check.id}`);
}
fs.mkdirSync(path.join(__dirname, 'qa'), { recursive: true });
for (const name of fs.readdirSync(qaDirectory)) fs.copyFileSync(path.join(qaDirectory, name), path.join(__dirname, 'qa', name));
for (const [source, destination] of [
  ['r2-capture.log', 'capture.log'], ['r2-state-capture.log', 'state-capture.log'], ['r2-metadata.log', 'metadata-check.log'],
]) fs.copyFileSync(path.resolve(root, app, 'build', source), path.join(__dirname, destination));

const manifestPath = `${design}/revision.json`;
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath)));
fs.copyFileSync(path.join(root, manifestPath), path.join(__dirname, 'design-revision.snapshot.json'));
const groups = { design: manifest.designSources, dependencies: manifest.dependencies, artifacts: manifest.artifacts };
for (const [service, sources] of Object.entries(manifest.productCaptureSources)) groups[`product:${service}`] = sources;
const differences = [];
for (const [group, sources] of Object.entries(groups)) for (const [file, expected] of Object.entries(sources)) {
  const actual = fs.existsSync(path.resolve(root, file)) ? hash(file) : null;
  if (actual !== expected) differences.push({ group, file, expected, actual, classification: file.startsWith(`${app}/`) ? 'implemented-play-change' : 'concurrent-change-review-required' });
}
fs.writeFileSync(path.join(__dirname, 'baseline-comparison.json'), JSON.stringify({ manifestSha256: hash(manifestPath), differences }, null, 2) + '\n');

const sources = [
  'lib/main.dart', 'lib/library_detail_screen.dart', 'lib/presentation/library_home_components.dart',
  'lib/presentation/play_library_components.dart', 'lib/presentation/play_playback_components.dart',
  'lib/presentation/play_playback_layout.dart', 'test/home_screen_test.dart', 'test/play_playback_components_test.dart',
  'test/product_design_r1_test.dart', 'test/product_design_r2_test.dart',
  'integration_test/capture_fixture.dart', 'integration_test/screenshot_scene_contract_integration_test.dart',
  'README.md', 'CHANGELOG.md',
].map(p => `${app}/${p}`);
sources.push('deployment/apps/classical-local-library/ios-metadata.yaml');
const tracked = sources.filter(p => {
  try { execFileSync('git', ['ls-files', '--error-unmatch', '--', p], { cwd: root, stdio: 'pipe' }); return true; } catch { return false; }
});
let diff = execFileSync('git', ['diff', 'HEAD', '--', ...tracked], { cwd: root, encoding: 'utf8' });
for (const file of sources.filter(p => !tracked.includes(p))) {
  try { diff += execFileSync('git', ['diff', '--no-index', '--', '/dev/null', file], { cwd: root, encoding: 'utf8' }); }
  catch (error) { if (error.status !== 1) throw error; diff += error.stdout; }
}
fs.writeFileSync(path.join(__dirname, 'implementation.diff'), diff);

const screens = filesIn(path.relative(root, path.join(__dirname, 'screens'))).filter(p => p.endsWith('.png')).sort().map(file => {
  const bytes = fs.readFileSync(path.resolve(root, file));
  const name = path.basename(file);
  const matrix = name.match(/-(320|390|1024)-(1|2)-(light|dark)\.png$/);
  return {
    file: path.relative(__dirname, path.resolve(root, file)), sha256: hash(file),
    viewport: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)], dpr: 1,
    theme: name.includes('dark') ? 'dark' : 'light', textScale: matrix ? Number(matrix[2]) : name.includes('200') ? 2 : 1,
    kind: file.includes('/states/') ? 'actual-widget-with-explicit-state-fixture' : 'actual-product-widget-with-fake-player',
    fixture: file.includes('/states/') ? 'test/product_design_r1_test.dart' : 'test/product_design_r2_test.dart',
    accent: 'existing palette',
  };
});
const fontFiles = Object.fromEntries(['DDIRORI_BRAND_FONT', 'DDIRORI_MATERIAL_FONT'].map(name => {
  const file = process.env[name];
  if (!file) throw new Error(`Set ${name} to the file used for capture`);
  return [name, { file: path.basename(file), sha256: hash(file) }];
}));
const versionLog = fs.readFileSync(path.join(qaDirectory, 'flutter-version.log'), 'utf8');
const version = JSON.parse(versionLog.slice(versionLog.indexOf('{')));
const result = {
  service: 'play', status: 'implemented-awaiting-review', designRevision: 'product-design-r2', backlog: ['P01 preserved', 'P02 implemented', 'P03 implemented'],
  generatedAt: new Date().toISOString(), baselineCommit: '827ad18203e673b1e923d00cbcf0fd7f3af755d7',
  observedHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  implementationCommit: 'uncommitted', designManifestSha256: hash(manifestPath),
  runtime: { flutter: version.frameworkVersion, dart: version.dartSdkVersion },
  captureEnvironment: { fontFiles, platform: 'Flutter test renderer on macOS',
    commands: [
      'flutter test test/product_design_r2_test.dart (DDIRORI_R2_CAPTURE_OUTPUT=screens)',
      "flutter test test/product_design_r1_test.dart --name 'R1 (transport|first empty)' (DDIRORI_R1_CAPTURE_OUTPUT=screens/states)",
    ],
    reducedMotion: 'enabled in textScale 2 matrix',
  },
  qaSourceSha256: report.sourceSha256After, sourceHashes: Object.fromEntries(sources.map(p => [p, hash(p)])),
  diff: { file: 'implementation.diff', sha256: hash(path.join(__dirname, 'implementation.diff')) },
  screenshots: screens, qa: { file: 'qa/report.json', sha256: hash(path.join(__dirname, 'qa/report.json')), checks: report.checks.length },
  logs: Object.fromEntries(['capture.log', 'state-capture.log', 'metadata-check.log'].map(p => [p, hash(path.join(__dirname, p))])),
  physicalDeviceVerified: false, storeCaptureApproved: false,
};
fs.writeFileSync(path.join(__dirname, 'evidence.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ screenshots: screens.length, qaChecks: report.checks.length, baselineDifferences: differences.length, sourceFingerprintMatches: true }));
