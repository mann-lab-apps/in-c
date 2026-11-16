"""Fail-closed readiness checks for a disposable emulator's media capture.

These assertions prove SystemUI content and an app-owned media session, not
audibility or a physical notification-button tap. Never run on personal devices.
"""
import re
import time
import xml.etree.ElementTree as ET

PACKAGE = "app.inc.classical_local_library"
TITLE = "합성 음원 0"


def panel_evidence(xml, session, title=TITLE):
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return {"ready": False, "reason": "invalidHierarchy"}
    panels = [n for n in root.iter("node")
              if n.get("package") == "com.android.systemui"
              and n.get("resource-id", "").split("/")[-1] in
              {"qs_media_controls", "media_player"}]
    nodes = [n for panel in panels for n in panel.iter("node")
             if n.get("package") == "com.android.systemui"]
    titles = [n for n in nodes if n.get("text") == title
              and n.get("resource-id", "").split("/")[-1] in
              {"media_title", "header_title"}]
    controls = [n for n in nodes if n.get("enabled") == "true"
                and n.get("clickable") == "true"
                and ("action" in n.get("resource-id", "").lower()
                     or "play_pause" in n.get("resource-id", "").lower())]
    # Match the package and metadata inside ONE media-session record. A title in
    # another app's session must not satisfy Play's assertion.
    records = re.split(r"(?m)(?=^\s*package=)", session)
    owned = any(re.search(r"package=" + re.escape(PACKAGE) + r"(?:\s|$)", record)
                and title in record for record in records)
    ready = bool(titles and controls and owned)
    return {"ready": ready, "systemUiTitleVisible": bool(titles),
            "enabledMediaControls": len(controls), "appOwnedSession": owned,
            "reason": "ready" if ready else "mediaContentNotReady"}


def wait_for_panel(read, *, timeout=12, clock=time.monotonic, delay=time.sleep):
    deadline = clock() + timeout
    attempts = 0
    last = {"ready": False}
    while True:
        attempts += 1
        xml, session = read()
        last = panel_evidence(xml, session)
        if last["ready"]:
            return {**last, "attempts": attempts}, xml
        if clock() >= deadline:
            raise TimeoutError(f"SystemUI media content not ready: {last}")
        delay(.2)
