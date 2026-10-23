"""Analyze and test the reference adapters in a disposable package, offline."""
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime, timezone
import json
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
report = {'generatedAt': datetime.now(timezone.utc).isoformat(),
          'scope': 'Reference adapters only; no production app or device tests', 'commands': []}
try:
    with TemporaryDirectory(prefix='doyo-flutter-') as temporary:
        temp = Path(temporary)
        for name in ['generated', 'adapters/flutter']:
            shutil.copytree(root / name, temp / 'lib' / name)
        (temp / 'test').mkdir()
        shutil.copy2(root / 'tools/adapter_test.dart', temp / 'test/adapter_test.dart')
        (temp / 'pubspec.yaml').write_text('''name: doyo_design_review
environment:
  sdk: ">=3.10.0 <4.0.0"
dependencies:
  flutter:
    sdk: flutter
dev_dependencies:
  flutter_test:
    sdk: flutter
''')
        for command in [['flutter', '--version'], ['flutter', 'pub', 'get', '--offline'],
                        ['flutter', 'analyze', '--no-pub'], ['flutter', 'test', '--reporter', 'expanded']]:
            print('Running ' + ' '.join(command), flush=True)
            result = subprocess.run(command, cwd=temp, text=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT, timeout=120)
            report['commands'].append({'command': command, 'exitCode': result.returncode,
                                       'output': result.stdout})
            print(result.stdout, flush=True)
            if result.returncode:
                raise RuntimeError(f'{command} exited {result.returncode}')
    report['status'] = 'passed'
except Exception as error:
    report['status'] = 'failed'
    report['failure'] = str(error)
    raise
finally:
    (root / 'evidence/flutter-validation.json').write_text(json.dumps(report, indent=2) + '\n')
