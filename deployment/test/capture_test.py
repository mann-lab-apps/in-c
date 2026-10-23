import importlib.util
import json
from pathlib import Path
import plistlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("capture", Path(__file__).parents[1] / "capture_screenshots.py")
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)


class CaptureTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.path = self.root / "screenshots.json"
        self.data = json.loads((capture.ROOT / "apps/clef/screenshots.json").read_text())

    def tearDown(self):
        self.temp.cleanup()

    def load(self):
        self.path.write_text(json.dumps(self.data))
        return capture.load(self.path)

    def test_another_app_uses_same_engine_with_config_and_default_adapter(self):
        self.data.update(app="another-app", source_path="apps/another", bundle_id="com.example.another", adapter="capture/default_adapter.dart")
        self.data["flavor"] = "another"
        self.data["scenes"] = [{"id": "home", "purpose": "App launch", "steps": [], "assertions": [{"by": "text", "value": "Another App", "present": True}]}]
        data = self.load()
        command = capture.drive_command(data, data["devices"][0], "test-udid")
        encoded = next(s.split("=", 2)[2] for s in command if s.startswith("--dart-define=STORE_CAPTURE_PLAN="))
        plan = json.loads(capture.base64.b64decode(encoded))
        self.assertEqual("Another App", plan["scenes"][0]["assertions"][0]["value"])
        self.assertNotIn("Clef", json.dumps(plan))
        self.assertEqual("another-app", data["app"])
        self.assertIn("--flavor=another", command)

    def test_submission_options_and_shell_actions_are_rejected(self):
        self.data["submit_for_review"] = True
        with self.assertRaises(ValueError): self.load()
        del self.data["submit_for_review"]
        self.data["scenes"][0]["steps"] = [{"action": "shell", "command": "anything"}]
        with self.assertRaisesRegex(ValueError, "unsupported UI action"): self.load()

    def test_duplicate_scenes_and_negative_only_assertions_are_rejected(self):
        self.data["scenes"].append(self.data["scenes"][0])
        with self.assertRaisesRegex(ValueError, "duplicate scene"): self.load()
        self.data["scenes"].pop()
        for check in self.data["scenes"][0]["assertions"]: check["present"] = False
        with self.assertRaisesRegex(ValueError, "positive UI assertion"): self.load()

    def test_slot_dimensions_and_family_are_checked_before_build(self):
        self.data["devices"][0]["width"] = 200
        with self.assertRaisesRegex(ValueError, "dimensions"): self.load()
        self.data["devices"][0]["width"] = 1320
        self.data["devices"][0]["family"] = "ipad"
        with self.assertRaisesRegex(ValueError, "family"): self.load()

    def test_adapter_paths_and_symlink_escape_are_rejected(self):
        self.data["adapter"] = "../outside.dart"
        with self.assertRaisesRegex(ValueError, "escapes"): self.load()
        (self.root / "escape").symlink_to("/tmp")
        with self.assertRaisesRegex(ValueError, "escapes"):
            capture.contained(self.root, "escape/secret")

    def test_reserved_capture_defines_cannot_replace_the_scene_contract(self):
        self.data["dart_defines"]["STORE_CAPTURE_PLAN"] = "replacement"
        with self.assertRaisesRegex(ValueError, "Dart defines"): self.load()

    def test_native_image_must_exist_and_match_pixel_size_without_alpha(self):
        image = self.root / "scene.jpg"
        device = self.data["devices"][0]
        with self.assertRaisesRegex(ValueError, "missing/empty"):
            capture.inspect_image(image, device)
        image.write_bytes(b"\xff\xd8" + b"fixture" * 200)
        with patch.object(capture, "run", return_value="pixelWidth: 200\npixelHeight: 300\nhasAlpha: no"):
            with self.assertRaisesRegex(ValueError, "dimensions"):
                capture.inspect_image(image, device)
        with patch.object(capture, "run", return_value="pixelWidth: 1320\npixelHeight: 2868\nhasAlpha: yes"):
            with self.assertRaisesRegex(ValueError, "alpha"):
                capture.inspect_image(image, device)

    def test_installed_source_app_must_match_version_build_and_simulator_sdk(self):
        info = {"CFBundleIdentifier": self.data["bundle_id"], "CFBundleShortVersionString": "1.0.2", "CFBundleVersion": "29", "CFBundleSupportedPlatforms": ["iPhoneSimulator"]}
        path = self.root / "Info.plist"
        path.write_bytes(plistlib.dumps(info))
        self.assertEqual(self.data["bundle_id"], capture.verify_app(self.data, self.root)["CFBundleIdentifier"])
        for field, bad in [("CFBundleIdentifier", "other.app"), ("CFBundleVersion", "30"), ("CFBundleShortVersionString", "1.0.3"), ("CFBundleSupportedPlatforms", ["iPhoneOS"])]:
            path.write_bytes(plistlib.dumps({**info, field: bad}))
            with self.assertRaises(ValueError): capture.verify_app(self.data, self.root)

    def test_wrong_commit_and_dirty_application_source_are_rejected(self):
        app = self.root / "apps/demo"
        app.mkdir(parents=True)
        (app / "main.txt").write_text("original")
        (app / "pubspec.yaml").write_text("version: 1.0.2+29\n")
        commands = [["init", "-q"], ["add", "."], ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-qm", "fixture"]]
        for cmd in commands: subprocess.run(["git", *cmd], cwd=self.root, check=True, capture_output=True)
        data = {**self.data, "source_path": "apps/demo", "source_commit": capture.run(["git", "rev-parse", "HEAD"], cwd=self.root)}
        self.assertEqual(app.resolve(), capture.validate_source(data, self.root))
        with self.assertRaisesRegex(ValueError, "pinned commit"):
            capture.validate_source({**data, "source_commit": "0" * 40}, self.root)
        (app / "main.txt").write_text("dirty")
        with self.assertRaisesRegex(ValueError, "dirty"):
            capture.validate_source(data, self.root)

    def verification_fixture(self):
        self.data["devices"] = self.data["devices"][:1]
        self.data["scenes"] = self.data["scenes"][:1]
        data = self.load()
        image = self.root / "media/iphone-library.jpg"
        image.parent.mkdir()
        image.write_bytes(b"native image fixture, offline only")
        asset = {"kind": "screenshot", "locale": "ko", "device": "iphone", "display_type": "APP_IPHONE_67", "path": "media/iphone-library.jpg", "position": 1, "scene": "library", "reviewed": False, "authentic": True, "source_commit": data["source_commit"], "sha256": capture.sha(image)}
        record = {"status": "captured", "automatic_checks": "passed", "manifest_sha256": capture.sha(self.path), "source_commit": data["source_commit"], "build_mode": "debug_integration", "assets": [asset], "binary_upload": False, "review_submission": False, "release": False}
        result = self.root / "result.json"
        result.write_text(json.dumps(record))
        return data, image, result, record

    def inspect_fixture(self, path, device):
        return {"sha256": capture.sha(path), "width": device["width"], "height": device["height"]}

    def test_capture_alone_cannot_approve_upload_and_review_is_bound_to_exact_bytes(self):
        data, image, result, record = self.verification_fixture()
        with patch.object(capture, "inspect_image", side_effect=self.inspect_fixture):
            report = capture.verify_result(self.path, data, result)
            self.assertFalse(report["ready_for_upload"])
            self.assertFalse(report["assets"][0]["reviewed"])
            review = self.root / "review.json"
            review.write_text(json.dumps({"schema_version": 1, "capture_result_sha256": capture.sha(result), "reviewer": "Visual reviewer", "assets": [{"path": record["assets"][0]["path"], "sha256": capture.sha(image), "approved": True, "notes": "Required UI and fixture visible"}]}))
            approved = capture.verify_result(self.path, data, result, review)
            self.assertTrue(approved["ready_for_upload"])
            self.assertTrue(approved["assets"][0]["reviewed"])
            image.write_bytes(b"changed after review")
            with self.assertRaisesRegex(ValueError, "changed"):
                capture.verify_result(self.path, data, result, review)

    def test_stale_configuration_and_failed_capture_cannot_be_reused(self):
        data, _image, result, record = self.verification_fixture()
        self.path.write_text(self.path.read_text() + "\n")
        with self.assertRaisesRegex(ValueError, "stale"):
            capture.verify_result(self.path, data, result)
        record.update(manifest_sha256=capture.sha(self.path), status="failed")
        result.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, "failed"):
            capture.verify_result(self.path, data, result)

    def test_missing_scene_and_unknown_scene_cannot_pass_verification(self):
        data, _image, result, record = self.verification_fixture()
        record["assets"] = []
        result.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, "coverage"):
            capture.verify_result(self.path, data, result)
        record["assets"] = [{"path": "media/iphone-library.jpg", "scene": "unknown"}]
        result.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, "unexpected"):
            capture.verify_result(self.path, data, result)

    def test_review_of_a_different_result_is_rejected(self):
        data, _image, result, _record = self.verification_fixture()
        review = self.root / "review.json"
        review.write_text(json.dumps({"schema_version": 1, "capture_result_sha256": "0" * 64, "reviewer": "Reviewer", "assets": []}))
        with self.assertRaisesRegex(ValueError, "does not match"):
            capture.verify_result(self.path, data, result, review)

    def test_deferred_callback_cannot_reuse_one_frame_under_different_scene_names(self):
        data, image, result, record = self.verification_fixture()
        second = json.loads(json.dumps(data["scenes"][0]))
        second["id"] = "details"
        data["scenes"].append(second)
        self.path.write_text(json.dumps(data))
        record["manifest_sha256"] = capture.sha(self.path)
        duplicate = image.parent / "iphone-details.jpg"
        duplicate.write_bytes(image.read_bytes())
        record["assets"].append({**record["assets"][0], "path": "media/iphone-details.jpg", "scene": "details", "position": 2})
        result.write_text(json.dumps(record))
        with patch.object(capture, "inspect_image", side_effect=self.inspect_fixture):
            with self.assertRaisesRegex(ValueError, "identical screenshots"):
                capture.verify_result(self.path, data, result)

    def test_original_native_snapshot_change_is_detected(self):
        data, image, result, record = self.verification_fixture()
        raw = image.with_suffix('.png')
        raw.write_bytes(b'original native snapshot fixture')
        record["assets"][0].update(raw_path="media/iphone-library.png", raw_sha256=capture.sha(raw))
        result.write_text(json.dumps(record))
        raw.write_bytes(b'changed raw snapshot')
        with patch.object(capture, "inspect_image", side_effect=self.inspect_fixture):
            with self.assertRaisesRegex(ValueError, "native snapshot changed"):
                capture.verify_result(self.path, data, result)

    def test_generic_scroll_action_is_bounded_and_declarative(self):
        step = {"action": "scroll_to", "by": "text", "value": "Details", "delta": 300}
        self.data["scenes"][0]["steps"].append(step)
        self.load()
        step["delta"] = 100000
        with self.assertRaisesRegex(ValueError, "scroll delta"):
            self.load()

    def test_recompiled_identical_manifest_uses_the_original_capture_location(self):
        data, image, result, record = self.verification_fixture()
        record['manifest_path'] = str(self.path)
        result.write_text(json.dumps(record))
        second = self.root / 'fresh-compilation/screenshots.json'
        second.parent.mkdir()
        second.write_bytes(self.path.read_bytes())
        with patch.object(capture, 'inspect_image', side_effect=self.inspect_fixture):
            report = capture.verify_result(second, data, result)
            self.assertEqual(capture.sha(image), report['assets'][0]['sha256'])
            self.assertEqual('passed', report['status'])
        self.path.write_text(self.path.read_text() + '\n')
        with self.assertRaisesRegex(ValueError, 'original capture manifest changed'):
            capture.verify_result(second, data, result)

    def test_business_capture_fingerprint_must_be_valid(self):
        self.data['content_contract_sha256'] = '0' * 64
        self.load()
        self.data['content_contract_sha256'] = 'invalid'
        with self.assertRaisesRegex(ValueError, 'contract fingerprint'):
            self.load()


if __name__ == "__main__":
    unittest.main()
