import tempfile
import unittest
from pathlib import Path

from mido import Message, MidiFile, MidiTrack
from inspect_midi_notes import inspect


class MidiInspectionTests(unittest.TestCase):
    def inspect_tracks(self, tracks, midi_type=1):
        midi = MidiFile(type=midi_type, ticks_per_beat=960)
        midi.tracks.extend(MidiTrack(messages) for messages in tracks)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "notes.mid"
            midi.save(path)
            return inspect(path)

    def test_normalizes_resolution_and_velocity_zero_note_off(self):
        result = self.inspect_tracks([[
            Message("note_on", note=60, velocity=80, time=960),
            Message("note_on", note=60, velocity=0, time=1920),
        ]])
        self.assertEqual(result["notes"], [{"track": 0, "channel": 0,
            "pitch": 60, "startBeat": 1, "durationBeats": 2}])

    def test_tracks_channels_and_overlapping_unisons_keep_independent_clocks(self):
        result = self.inspect_tracks([[
            Message("note_on", note=60, time=0),
            Message("note_on", note=60, time=480),
            Message("note_off", note=60, time=480),
            Message("note_off", note=60, time=480),
        ], [
            Message("note_on", channel=1, note=60, time=960),
            Message("note_off", channel=1, note=60, time=960),
        ]])
        self.assertEqual([(n["track"], n["channel"], n["startBeat"], n["durationBeats"])
            for n in result["notes"]], [(0, 0, 0, 1), (0, 0, 0.5, 1), (1, 1, 1, 1)])

    def test_rejects_missing_note_off(self):
        with self.assertRaisesRegex(ValueError, "Unclosed"):
            self.inspect_tracks([[Message("note_on", note=60)]])

    def test_rejects_unmatched_note_off(self):
        with self.assertRaisesRegex(ValueError, "Unmatched"):
            self.inspect_tracks([[Message("note_off", note=60)]])

    def test_rejects_asynchronous_tracks(self):
        with self.assertRaisesRegex(ValueError, "synchronous"):
            self.inspect_tracks([[]], midi_type=2)


if __name__ == "__main__":
    unittest.main()
