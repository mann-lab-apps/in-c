import 'package:file_picker/file_picker.dart';

import 'local_audio_import.dart';

abstract class FolderPicker {
  Future<String?> pickFolder();
}

class PlatformFolderPicker implements FolderPicker {
  const PlatformFolderPicker();

  @override
  Future<String?> pickFolder() {
    return FilePicker.getDirectoryPath(dialogTitle: '음악 폴더 선택');
  }
}

class PlatformAudioFilePicker implements AudioFilePicker {
  const PlatformAudioFilePicker();

  @override
  Future<List<SelectedAudioFile>> pickAudioFiles() async {
    final files = await FilePicker.pickFiles(
      dialogTitle: '음원 파일 선택',
      type: FileType.custom,
      allowedExtensions: const [
        'flac',
        'mp3',
        'm4a',
        'alac',
        'ogg',
        'opus',
        'wav',
      ],
    );
    return [for (final file in files) _PlatformSelectedAudioFile(file)];
  }
}

class _PlatformSelectedAudioFile implements SelectedAudioFile {
  const _PlatformSelectedAudioFile(this.file);

  final PlatformFile file;

  @override
  String get name => file.name;

  @override
  String? get mimeType => null;

  @override
  Future<int> length() => file.length();

  @override
  Stream<List<int>> openRead() => file.readAsByteStream();
}
