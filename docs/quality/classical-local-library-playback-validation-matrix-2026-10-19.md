# Classical Local Library Playback Validation Matrix

Date: 2026-10-19

## Evidence Layers

| Layer | Automated evidence | Not proven |
| --- | --- | --- |
| Fixture bytes | RIFF header, PCM layout, duration, marker frequencies, silence, deterministic generator check | Speaker output |
| Reference state model | Three fixed seeds, explicit edge-case prelude, state/invariant comparison with `FakeLocalPlayer` | Native decoder, acoustic output |
| Native decoder and state | Real `just_audio` integration test: load, position advance, pause/resume, seek, next, completion, SQLite persistence and recovery | Human-perceived quality |
| Bounded native soak | Ten alternating WAV/AAC load/play/seek/pause/resume/stop iterations with a 45-second test bound | Long-duration stability, physical route behavior |
| Acoustic output | None | Speaker/headphone sound, volume, distortion, route selection, Bluetooth behavior |

`PlaybackStateTrace` and seeded scenario tests are an additional pure-Dart
evidence layer. They make state failures reproducible with a command trace,
one of seeds `20261019`, `20261020`, `20261021`, scenario index, and command
index; they do not decode audio or determine whether a person heard sound.

The bounded native soak passed on the iPhone 17 Simulator and Pixel Tablet
Android 15 emulator. The local report validator labels iOS/Android synthetic
fixtures as `automated-native-passed`; reports with platform `other` are labeled
`platform-not-covered` and do not inherit emulator evidence.

## Format Policy

| Extension | Scanner accepts | Player attempts local playback | iOS Simulator native run | Android emulator native run | Physical-device validation | Notes |
| --- | --- | --- | --- | --- | --- |
| WAV | Yes | Yes | Synthetic PCM WAV passed | Synthetic PCM WAV passed | Required | One of two automatically verified container/codec paths |
| MP3 | Yes | Yes | Not run | Not run | Required | No licensed deterministic fixture available in this environment |
| M4A/AAC | Yes | Yes | Synthetic AAC-in-M4A passed | Synthetic AAC-in-M4A passed | Required | 22,050 Hz mono AAC generated from repository PCM source |
| FLAC | Yes | Yes | Not run | Not run | Required | Platform decoder behavior still needs a fixture and device checks |
| ALAC/M4A | Yes | Yes | Synthetic ALAC-in-M4A passed | Not run | Required | 22,050 Hz mono ALAC generated from repository PCM source |
| OGG | Yes | Yes | Not run | Not run | Required | Container/codec combinations vary by platform |
| OPUS | Yes | Yes | Not run | Not run | Required | Container and platform support must be verified separately |

“Player attempts” means the local queue validator accepts the extension and
the production adapter hands the URI to the operating-system decoder. It is not
a compatibility promise.

Both emulator runs also supplied a deliberately malformed `.wav` file. The
adapter exposed a structured `loadFailed` state and accepted a subsequent valid
queue, so corrupt-container failure recovery is evidenced for the tested path.

## Fixture Policy

- Existing fixtures are generated synthetic PCM signals, created specifically
  for this repository; no third-party recording or performance is included.
- The environment did not contain `ffmpeg`, `ffprobe`, `sox`, `lame`, `flac`,
  `opusenc`, or `oggenc`, and no
  provenance-cleared multi-format fixture source was added.
- `/usr/bin/afconvert` and `/usr/bin/afinfo` are available. `afconvert` made
  the AAC and ALAC fixtures from the repository PCM source. No external
  substitute was downloaded or committed for MP3, FLAC, OGG, or Opus.
- Do not commit downloaded audio without an auditable license, source, compact
  reproducible form, and checksum.
- A future multi-format fixture should retain the same marker contract and add
  source/generator command, version, checksum, and per-platform results.
- `movement_1_aac.m4a` is generated with macOS `/usr/bin/afconvert -f m4af -d aac`
  from `movement_1.wav`; the recorded SHA-256 is
  `741077e7bbbb31e9358c2d4af111c25ad7140216f1d580da440757b57b0ffce7`.
  AAC metadata is not byte-stable across encoder invocations, so `--check`
  verifies codec, sample rate, and duration with `afinfo` instead of equality.
- `movement_1_alac.m4a` is generated with macOS `/usr/bin/afconvert -f m4af -d alac`
  and `--check` verifies 22,050 Hz mono ALAC and 2.4-second duration with
  `afinfo`. It passed native load/position/stop on the iOS Simulator; Android
  and physical-device support are not inferred.
- The in-app diagnostic copies only the repository's WAV/AAC/ALAC fixtures to its
  temporary directory. It does not inspect a user's library, persist diagnostic
  results, or send telemetry.
- Its copied strict JSON schema permits only schema version, generic platform,
  fixture ID, container/codec, transport booleans, structured failure kind,
  and explicit listening feedback. Paths, titles, tags, history, device names,
  identifiers, account data, and native exception text are forbidden.
- A local stdin-only validator checks the schema, privacy boundary, fixture
  result, listening selection, and this known synthetic fixture matrix. A
  failure is a fixture regression candidate, not a codec-wide conclusion.

## Remaining Risks

1. Actual-device codec behavior for all formats, plus Android ALAC and automated MP3/FLAC/OGG/Opus coverage.
2. Acoustic output, Bluetooth/headphone routing, audio focus, and interruption.
3. Gapless transition and crossfade quality are not implemented or assessed.
4. Very large history tables need performance measurement on real libraries.
5. Background and lock-screen playback are intentionally out of scope.

## Synthetic Library Scale Check

SQLite tests use 240 synthetic scanned files, metadata candidates, file-track
links, and playback positions, plus 12 locations and 600 synthetic history
sessions. Recent-history, grouped statistics, retention deletion, position
and preference preservation, and the recent-history index query plan are
checked without personal paths or audio. UI call-count tests also ensure
position events do not reload all history/statistics, and diagnostic tests
ensure no listening session is created. This is a correctness/index-use check,
not a device performance benchmark.
