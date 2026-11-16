#!/usr/bin/env python3
"""Encode our PCM fixture with an explicitly supplied, installed LAME library.

No binary download, private audio input, or app linkage. --check needs no encoder.
API: https://github.com/lameproject/lame/blob/master/include/lame.h
"""
import argparse
import ctypes as c
import hashlib
import json
import re
from pathlib import Path
import subprocess
import sys
import wave


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lame-library', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    folder = Path(__file__).resolve().parent.parent / 'assets/audio_test'
    source = folder / 'movement_1.wav'
    target = folder / 'movement_1.mp3'
    manifest = folder / 'mp3-provenance.json'
    if args.check:
        report = json.loads(manifest.read_text())
        assert report['sourceSha256'] == digest(source.read_bytes())
        assert report['fixtureSha256'] == digest(target.read_bytes())
        assert report['originalSyntheticAudio'] is True
        assert target.read_bytes()[0] == 255 and len(target.read_bytes()) < 100000
        print('MP3 synthetic source/provenance/hash verified; native decoder verified separately')
        return
    if args.lame_library is None:
        parser.error('Provide an existing, trusted local --lame-library; nothing is downloaded')
    team = None
    if sys.platform == 'darwin':
        subprocess.run(['codesign', '--verify', '--strict', str(args.lame_library)], check=True)
        identity = subprocess.run(['codesign', '-dv', '--verbose=2', str(args.lame_library)], capture_output=True, text=True, check=True)
        match = re.search(r'TeamIdentifier=([^\n]+)', identity.stderr)
        team = match.group(1) if match else None
    lib = c.CDLL(str(args.lame_library))
    lib.get_lame_version.restype = c.c_char_p
    lib.lame_init.restype = c.c_void_p
    pointer = lib.lame_init()
    assert pointer
    def call(name, types, result=c.c_int):
        fn = getattr(lib, name)
        fn.argtypes, fn.restype = [c.c_void_p, *types], result
        return fn
    close = call('lame_close', [])
    try:
        with wave.open(str(source), 'rb') as audio:
            assert audio.getnchannels() == 1 and audio.getsampwidth() == 2
            samples = audio.getnframes()
            rate = audio.getframerate()
            pcm = (c.c_short * samples).from_buffer_copy(audio.readframes(samples))
        for name, value in [('num_channels', 1), ('in_samplerate', rate), ('out_samplerate', rate), ('brate', 96), ('quality', 2), ('mode', 3), ('bWriteVbrTag', 1)]:
            assert call('lame_set_' + name, [c.c_int])(pointer, value) == 0
        call('lame_set_write_id3tag_automatic', [c.c_int], None)(pointer, 0)
        assert call('lame_set_num_samples', [c.c_ulong])(pointer, samples) == 0
        assert call('lame_init_params', [])(pointer) == 0
        size = int(1.25 * samples + 7200)
        output = (c.c_ubyte * size)()
        encode = call('lame_encode_buffer', [c.POINTER(c.c_short), c.POINTER(c.c_short), c.c_int, c.POINTER(c.c_ubyte), c.c_int])
        used = encode(pointer, pcm, pcm, samples, output, size)
        assert used >= 0
        data = bytes(output[:used])
        used = call('lame_encode_flush', [c.POINTER(c.c_ubyte), c.c_int])(pointer, output, size)
        assert used >= 0
        data += bytes(output[:used])
        tag_size = call('lame_get_lametag_frame', [c.POINTER(c.c_ubyte), c.c_size_t], c.c_size_t)(pointer, output, size)
        assert 0 < tag_size <= len(data)
        data = bytes(output[:tag_size]) + data[tag_size:]
        target.write_bytes(data)
        manifest.write_text(json.dumps({
            'schemaVersion': 1, 'fixture': target.name, 'source': source.name,
            'originalSyntheticAudio': True,
            'sourceSha256': digest(source.read_bytes()), 'fixtureSha256': digest(data),
            'encoder': 'LAME ' + lib.get_lame_version().decode(),
            'encoderLibrarySha256': digest(args.lame_library.read_bytes()),
            'encoderProvenance': 'Existing Unity FSBTool' if '/Unity.app/' in str(args.lame_library) else 'Explicitly supplied local library',
            'encoderLibraryName': args.lame_library.name, 'verifiedSigningTeam': team,
            'encoderLicense': 'LGPL-2.0-or-later; https://github.com/lameproject/lame/blob/master/COPYING',
            'encoderBundledWithApp': False, 'sampleRate': rate, 'channels': 1,
            'sourceSamples': samples, 'bitrateKbps': 96,
            'generation': 'python3 tool/generate_mp3_fixture.py --lame-library <trusted-local-library>',
        }, indent=2) + '\n')
        print(f'Generated {target.name}, {len(data)} bytes from our synthetic PCM; no encoder copied')
    finally:
        close(pointer)


if __name__ == '__main__':
    main()
