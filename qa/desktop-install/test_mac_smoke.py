import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from unittest import TestCase, main

from mac_smoke import run_smoke


class PackagedAppProbeTest(TestCase):
    def test_timeout_keeps_partial_output_and_stops_owned_app(self):
        with TemporaryDirectory() as temporary:
            directory = Path(temporary)
            observed = []

            def capture(_directory, _name, pid, app_exit):
                observed.append((pid, app_exit))
                self.assertIn('renderer-loaded', (directory / 'probe.log').read_text())

            probe = run_smoke(directory, 'probe', [sys.executable, '-u', '-c',
                "import time; print('PACKAGED_APP_SMOKE_STAGE renderer-loaded'); time.sleep(30)"],
                os.environ, timeout=1, capture=capture)
            self.assertTrue(probe['timedOut'])
            self.assertIsNone(probe['exitAtTimeout'])
            self.assertEqual(probe['lastStage'], 'renderer-loaded')
            self.assertEqual(len(observed), 1)
            with self.assertRaises(ProcessLookupError):
                os.kill(observed[0][0], 0)

    def test_timeout_distinguishes_app_exit_from_inherited_output_pipes(self):
        with TemporaryDirectory() as temporary:
            program = """import subprocess, sys
subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'])
print('PACKAGED_APP_SMOKE_OK {"hasMxlRoundTrip": true}')
"""
            probe = run_smoke(temporary, 'probe', [sys.executable, '-c', program],
                              os.environ, timeout=1, capture=lambda *_: None)
            self.assertTrue(probe['timedOut'])
            self.assertEqual(probe['exitAtTimeout'], 0)
            self.assertEqual(probe['smoke'], {'hasMxlRoundTrip': True})

    def test_success_requires_an_exit_and_collects_result(self):
        with TemporaryDirectory() as temporary:
            probe = run_smoke(temporary, 'probe', [sys.executable, '-c',
                'print(\'PACKAGED_APP_SMOKE_OK {"hasMxlRoundTrip": true}\')'], os.environ)
            self.assertEqual(probe['exitCode'], 0)
            self.assertFalse(probe['timedOut'])
            self.assertEqual(probe['smoke'], {'hasMxlRoundTrip': True})


if __name__ == '__main__':
    main()
