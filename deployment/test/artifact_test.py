import importlib.util
import os
from pathlib import Path
import plistlib
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("artifact", Path(__file__).parents[1] / "lib/artifact.py")
artifact = importlib.util.module_from_spec(spec)
spec.loader.exec_module(artifact)


class ArtifactTest(unittest.TestCase):
    def test_sha256_streams_existing_file(self):
        with tempfile.NamedTemporaryFile() as f:
            f.write(b"abc")
            f.flush()
            self.assertEqual("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", artifact.sha256(f.name))

    def ios_fixture(self, app, debuggable=False):
        (app / "Info.plist").write_bytes(plistlib.dumps({
            "CFBundleIdentifier": "test.app", "CFBundleDisplayName": "Test",
            "CFBundleShortVersionString": "1.0.0", "CFBundleVersion": "1"}))
        ent = {"application-identifier": "TEAM.test.app", "com.apple.developer.team-identifier": "TEAM", "get-task-allow": debuggable}
        profile = {"Name": "Test Profile", "TeamIdentifier": ["TEAM"]}
        return ent, profile

    def test_ios_rejects_development_signature(self):
        with tempfile.TemporaryDirectory() as d:
            ent, profile = self.ios_fixture(Path(d), debuggable=True)
            with patch.object(artifact, "run", side_effect=[b"", plistlib.dumps(ent), plistlib.dumps(profile)]):
                with self.assertRaisesRegex(ValueError, "debuggable"):
                    artifact.ios_app(Path(d))

    def test_ios_rejects_ad_hoc_profile(self):
        with tempfile.TemporaryDirectory() as d:
            ent, profile = self.ios_fixture(Path(d))
            profile["ProvisionedDevices"] = ["a-device"]
            with patch.object(artifact, "run", side_effect=[b"", plistlib.dumps(ent), plistlib.dumps(profile)]):
                with self.assertRaisesRegex(ValueError, "App Store"):
                    artifact.ios_app(Path(d))

    def test_android_rejects_unsigned_bundle(self):
        with tempfile.NamedTemporaryFile() as f, patch.dict(os.environ, {"BUNDLETOOL_JAR": f.name}):
            xml = b'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application/></manifest>'
            with patch.object(artifact, "run", side_effect=[b"", xml, b"jar is unsigned."]):
                with self.assertRaisesRegex(ValueError, "unsigned"):
                    artifact.inspect(f.name, "android")

    def test_android_rejects_debuggable_bundle(self):
        with tempfile.NamedTemporaryFile() as f, patch.dict(os.environ, {"BUNDLETOOL_JAR": f.name}):
            xml = b'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:debuggable="true"/></manifest>'
            with patch.object(artifact, "run", side_effect=[b"", xml]):
                with self.assertRaisesRegex(ValueError, "debuggable"):
                    artifact.inspect(f.name, "android")


if __name__ == "__main__":
    unittest.main()
