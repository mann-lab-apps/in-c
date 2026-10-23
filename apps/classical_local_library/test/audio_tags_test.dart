import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:audio_metadata_reader/audio_metadata_reader.dart' as audio;
import 'package:classical_local_library/audio_tags.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('audio_metadata_reader 결과를 앱 메타데이터 모델로 변환한다', () async {
    final source = audio.AudioMetadata(
      file: File('/synthetic/01.flac'),
      title: '  I. Allegro con brio  ',
      artist: 'Carlos Kleiber',
      album: 'Beethoven: Symphony No. 5',
      albumArtist: 'Vienna Philharmonic',
      year: DateTime(1975),
      trackNumber: 1,
      trackTotal: 4,
      discNumber: 1,
      totalDisc: 1,
    )..genres = ['Classical'];
    final reader = AudioMetadataReaderAudioTagReader(
      readMetadata: (_, {getImage = false}) => source,
    );

    final result = await reader.read('/synthetic/01.flac');

    expect(result.status, AudioTagReadStatus.read);
    expect(result.metadata?.title, 'I. Allegro con brio');
    expect(result.metadata?.artist, 'Carlos Kleiber');
    expect(result.metadata?.albumArtist, 'Vienna Philharmonic');
    expect(result.metadata?.trackNumber, 1);
    expect(result.metadata?.trackTotal, 4);
    expect(result.metadata?.year, 1975);
  });

  test('태그가 비어 있으면 noTags로 정규화한다', () async {
    final reader = AudioMetadataReaderAudioTagReader(
      readMetadata: (_, {getImage = false}) =>
          audio.AudioMetadata(file: File('/synthetic/empty.wav'), title: ' '),
    );

    expect(
      (await reader.read('/synthetic/empty.wav')).status,
      AudioTagReadStatus.noTags,
    );
  });

  test('parser 오류를 내부 오류 종류로 제한해 노출한다', () async {
    final invalidPathReader = AudioMetadataReaderAudioTagReader(
      readMetadata: (_, {getImage = false}) =>
          throw const FileSystemException('private'),
    );
    final unsupportedReader = AudioMetadataReaderAudioTagReader(
      readMetadata: (file, {getImage = false}) =>
          throw audio.NoMetadataParserException(track: file),
    );
    final unreadableReader = AudioMetadataReaderAudioTagReader(
      readMetadata: (file, {getImage = false}) =>
          throw audio.MetadataParserException(
            track: file,
            message: 'private parser detail',
          ),
    );

    expect(
      (await invalidPathReader.read('/missing')).failureKind,
      AudioTagFailureKind.invalidPath,
    );
    expect(
      (await unsupportedReader.read('/synthetic/unknown.bin')).status,
      AudioTagReadStatus.unsupported,
    );
    expect(
      (await unreadableReader.read('/synthetic/corrupt.flac')).failureKind,
      AudioTagFailureKind.unreadable,
    );
  });

  test('합성 WAV 임시 복사본의 실제 태그를 기록하고 해독한다', () async {
    final directory = await Directory.systemTemp.createTemp(
      'classical_audio_tag_test_',
    );
    addTearDown(() async {
      if (await directory.exists()) {
        await directory.delete(recursive: true);
      }
    });
    final source = File('assets/audio_test/movement_1.wav');
    final tagged = File('${directory.path}/tagged.wav');
    await tagged.writeAsBytes(
      _withRiffInfo(await source.readAsBytes(), const {
        'INAM': 'Synthetic Allegro',
        'IART': 'Synthetic Orchestra',
        'IPRD': 'Synthetic Symphony',
        'ITRK': '1',
        'ICRD': '2026-01-01',
        'IGNR': 'Classical',
      }),
      flush: true,
    );

    final result = await const AudioMetadataReaderAudioTagReader().read(
      tagged.path,
    );

    expect(result.status, AudioTagReadStatus.read);
    expect(result.metadata?.title, 'Synthetic Allegro');
    expect(result.metadata?.artist, 'Synthetic Orchestra');
    expect(result.metadata?.album, 'Synthetic Symphony');
    expect(result.metadata?.trackNumber, 1);
    expect(result.metadata?.year, 2026);
  });
}

Uint8List _withRiffInfo(List<int> source, Map<String, String> fields) {
  final info = BytesBuilder()..add(ascii.encode('INFO'));
  for (final entry in fields.entries) {
    final value = [...utf8.encode(entry.value), 0];
    if (value.length.isOdd) value.add(0);
    info
      ..add(ascii.encode(entry.key))
      ..add(_uint32le(value.length))
      ..add(value);
  }
  final payload = info.takeBytes();
  final result = BytesBuilder()
    ..add(source)
    ..add(ascii.encode('LIST'))
    ..add(_uint32le(payload.length))
    ..add(payload);
  final bytes = result.takeBytes();
  bytes.setRange(4, 8, _uint32le(bytes.length - 8));
  return bytes;
}

Uint8List _uint32le(int value) {
  final data = ByteData(4)..setUint32(0, value, Endian.little);
  return data.buffer.asUint8List();
}
