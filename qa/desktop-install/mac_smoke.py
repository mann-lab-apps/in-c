"""Run an isolated packaged-app probe and keep evidence even if it times out."""

import json
import os
from pathlib import Path
import signal
import subprocess
import time

STAGE = 'PACKAGED_APP_SMOKE_STAGE '
SUCCESS = 'PACKAGED_APP_SMOKE_OK '


def capture_timeout(directory, name, pid, app_exit):
    try:
        processes = subprocess.run(
            ['/bin/ps', '-axo', 'pid=,pgid=,stat=,comm='],
            capture_output=True, text=True, timeout=3, check=True,
        ).stdout.splitlines()
        group = [line for line in processes if line.split(maxsplit=3)[1] == str(pid)]
        (directory / f'{name}-processes.txt').write_text('\n'.join(group) + '\n')
        if app_exit is None:
            sample = directory / f'{name}-sample.txt'
            subprocess.run(['/usr/bin/sample', str(pid), '2', '1', '-file', str(sample)],
                           capture_output=True, timeout=7, check=True)
    except (OSError, subprocess.SubprocessError) as error:
        (directory / f'{name}-capture-error.txt').write_text(str(error) + '\n')


def as_text(value):
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='replace')
    return value or ''


def run_smoke(directory, name, command, env, timeout=60, capture=capture_timeout):
    directory = Path(directory)
    start = time.monotonic()
    with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env,
                          start_new_session=True) as app:
        app_exit_at_timeout = None
        timed_out = False
        try:
            stdout, stderr = app.communicate(timeout=timeout)
        except subprocess.TimeoutExpired as error:
            timed_out = True
            app_exit_at_timeout = app.poll()
            stdout, stderr = error.stdout, error.stderr
            (directory / f'{name}.log').write_text(as_text(stdout) + as_text(stderr))
            try:
                capture(directory, name, app.pid, app_exit_at_timeout)
            finally:
                try:
                    os.killpg(app.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                try:
                    stdout, stderr = app.communicate(timeout=5)
                except subprocess.TimeoutExpired as cleanup:
                    stdout, stderr = cleanup.stdout, cleanup.stderr
                    app.wait(timeout=5)

    log = as_text(stdout) + as_text(stderr)
    (directory / f'{name}.log').write_text(log)
    stages = [line.removeprefix(STAGE) for line in log.splitlines() if line.startswith(STAGE)]
    marker = next((line.removeprefix(SUCCESS) for line in log.splitlines() if line.startswith(SUCCESS)), None)
    result = {
        'exitCode': app.returncode,
        'exitAtTimeout': app_exit_at_timeout,
        'timedOut': timed_out,
        'limitSeconds': timeout,
        'elapsedSeconds': round(time.monotonic() - start, 3),
        'stages': stages,
        'lastStage': stages[-1] if stages else None,
        'smoke': json.loads(marker) if marker else None,
    }
    (directory / f'{name}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result
