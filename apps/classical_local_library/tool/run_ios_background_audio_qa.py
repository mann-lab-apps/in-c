#!/usr/bin/env python3
"""Run native audio QA with an actual simulator app switch, without user files."""
import argparse
import json
from pathlib import Path
import queue
import subprocess
import threading
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', required=True, help='Dedicated simulator UDID')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    app = Path(__file__).resolve().parent.parent
    args.output.mkdir(parents=True, exist_ok=True)
    command = ['flutter', 'test', '--no-pub',
               'integration_test/ios_background_audio_integration_test.dart',
               '-d', args.device, '--dart-define=EXPECT_OS_BACKGROUND=true',
               '--reporter=expanded']
    process = subprocess.Popen(command, cwd=app, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, text=True, bufsize=1)
    lines = queue.Queue()

    def read_output():
        for line in process.stdout:
            lines.put(line)
        lines.put(None)

    threading.Thread(target=read_output, daemon=True).start()
    deadline = time.monotonic() + 600
    foreground_at = None
    native_result = None
    switched = False
    log = args.output / 'native-background.log'
    try:
        with log.open('w') as stream:
            while True:
                if time.monotonic() > deadline:
                    raise TimeoutError('native QA exceeded ten minutes')
                if foreground_at and time.monotonic() >= foreground_at:
                    subprocess.run(['xcrun', 'simctl', 'launch', args.device,
                                    'com.mannlab.ddirori.play'], check=True,
                                   capture_output=True, text=True)
                    foreground_at = None
                try:
                    line = lines.get(timeout=0.2)
                except queue.Empty:
                    continue
                if line is None:
                    break
                stream.write(line)
                stream.flush()
                print(line, end='', flush=True)
                if 'DDIRORI_BACKGROUND_READY' in line and not switched:
                    subprocess.run(['xcrun', 'simctl', 'launch', args.device,
                                    'com.apple.Preferences'], check=True,
                                   capture_output=True, text=True)
                    switched = True
                    foreground_at = time.monotonic() + 6
                marker = 'DDIRORI_BACKGROUND_RESULT '
                if marker in line:
                    native_result = json.loads(line.split(marker, 1)[1])
        code = process.wait(timeout=20)
        passed = (code == 0 and switched and native_result is not None
                  and native_result.get('completed') is True
                  and 'paused' in native_result.get('lifecycle', [])
                  and 'resumed' in native_result.get('lifecycle', []))
        result = {'environment': 'iOS Simulator', 'actual_os_app_switch': switched,
                  'background_seconds_requested': 6, 'native_result': native_result,
                  'flutter_exit_code': code, 'passed': passed,
                  'physical_lock_or_audibility_verified': False}
        (args.output / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        return 0 if passed else 1
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == '__main__':
    raise SystemExit(main())
