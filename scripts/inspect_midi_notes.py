"""Read note timing for external-app QA using Mido, without playing MIDI."""

import json
import sys
from collections import defaultdict, deque

from mido import MidiFile


def inspect(filename):
    midi = MidiFile(filename)
    if midi.type not in (0, 1) or midi.ticks_per_beat <= 0:
        raise ValueError("QA requires synchronous PPQN MIDI")
    notes = []
    for track_index, track in enumerate(midi.tracks):
        tick = 0
        pending = defaultdict(deque)
        for message in track:
            tick += message.time
            if message.type == "note_on" and message.velocity > 0:
                pending[(message.channel, message.note)].append(tick)
            elif message.type == "note_off" or (
                message.type == "note_on" and message.velocity == 0
            ):
                key = (message.channel, message.note)
                if not pending[key]:
                    raise ValueError(f"Unmatched note off: track {track_index}, {key}")
                start = pending[key].popleft()
                notes.append({
                    "track": track_index,
                    "channel": message.channel,
                    "pitch": message.note,
                    "startBeat": start / midi.ticks_per_beat,
                    "durationBeats": (tick - start) / midi.ticks_per_beat,
                })
        if any(pending.values()):
            raise ValueError(f"Unclosed notes in track {track_index}")
    return {
        "ticksPerBeat": midi.ticks_per_beat,
        "notes": sorted(notes, key=lambda note: (note["startBeat"], note["track"], note["pitch"])),
    }


if __name__ == "__main__":
    print(json.dumps(inspect(sys.argv[1])))
