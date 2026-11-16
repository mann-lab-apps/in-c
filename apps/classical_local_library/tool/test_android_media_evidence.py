import unittest
from android_media_evidence import PACKAGE, TITLE, panel_evidence, wait_for_panel


def hierarchy(title=TITLE, package="com.android.systemui", control=True):
    return ('<hierarchy><node package="com.android.systemui" resource-id="com.android.systemui:id/qs_media_controls"><node package="' + package + '" text="' + title +
            '" resource-id="com.android.systemui:id/header_title"/>' +
            ('<node package="com.android.systemui" resource-id="com.android.systemui:id/actionPlayPause" enabled="true" clickable="true"/>' if control else '') +
            '</node></hierarchy>')


class MediaEvidenceTest(unittest.TestCase):
    def setUp(self):
        self.session = f"  package={PACKAGE}\n    metadata: title={TITLE}\n"

    def test_expected_panel_and_own_session_are_required(self):
        self.assertTrue(panel_evidence(hierarchy(), self.session)["ready"])
        for xml, session in [
            ("<hierarchy/>", self.session),
            ("not xml", self.session),
            (hierarchy("another track"), self.session),
            (hierarchy(package=PACKAGE), self.session),
            (hierarchy(control=False), self.session),
            (hierarchy(), f"  package={PACKAGE}\n  package=other.app\n title={TITLE}"),
            (hierarchy(), f"package={PACKAGE}.other\n title={TITLE}"),
        ]:
            with self.subTest(xml=xml, session=session):
                self.assertFalse(panel_evidence(xml, session)["ready"])

    def test_transition_frame_is_retried_without_real_sleep(self):
        now = [0.0]
        samples = iter([("<hierarchy/>", self.session), (hierarchy(), self.session)])
        result, xml = wait_for_panel(lambda: next(samples), clock=lambda: now[0],
                                    delay=lambda amount: now.__setitem__(0, now[0] + amount))
        self.assertEqual(result["attempts"], 2)
        self.assertEqual(xml, hierarchy())

    def test_timeout_never_returns_pass(self):
        now = [0.0]
        with self.assertRaises(TimeoutError):
            wait_for_panel(lambda: ("<hierarchy/>", self.session), timeout=.5,
                           clock=lambda: now[0], delay=lambda amount: now.__setitem__(0, now[0] + amount))


if __name__ == "__main__":
    unittest.main()
