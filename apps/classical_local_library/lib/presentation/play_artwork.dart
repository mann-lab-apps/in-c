import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../classical_library_models.dart';
import '../library_artwork.dart';

class LibraryArtworkScope extends InheritedWidget {
  const LibraryArtworkScope({
    super.key,
    required this.repository,
    required this.fileForTrack,
    required super.child,
  });
  final LibraryArtworkRepository? repository;
  final LocalAudioFile? Function(String) fileForTrack;
  static LibraryArtworkScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<LibraryArtworkScope>();
  @override
  bool updateShouldNotify(LibraryArtworkScope oldWidget) =>
      repository != oldWidget.repository ||
      fileForTrack != oldWidget.fileForTrack;
}

class PlayArtwork extends StatefulWidget {
  const PlayArtwork({
    super.key,
    this.file,
    this.trackId,
    this.playlistId,
    this.size = 40,
  });
  final LocalAudioFile? file;
  final String? trackId;
  final String? playlistId;
  final double? size;
  @override
  State<PlayArtwork> createState() => _PlayArtworkState();
}

class _PlayArtworkState extends State<PlayArtwork> {
  LibraryArtworkRepository? repository;
  LocalAudioFile? file;
  Future<File?>? future;
  ScrollPosition? scroll;
  bool resolutionScheduled = false;
  void resolveWhenVisible() {
    if (future != null || resolutionScheduled || !mounted) return;
    resolutionScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      resolutionScheduled = false;
      if (!mounted || future != null) return;
      final box = context.findRenderObject();
      if (box is! RenderBox || !box.hasSize || !box.attached) return;
      final rect = box.localToGlobal(Offset.zero) & box.size;
      if (!rect.overlaps(Offset.zero & MediaQuery.sizeOf(context))) return;
      setState(() {
        future = resolve();
      });
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scope = LibraryArtworkScope.maybeOf(context);
    final previousRepository = repository;
    final previousFile = file;
    if (repository != scope?.repository) {
      repository?.removeListener(refresh);
      repository = scope?.repository;
      repository?.addListener(refresh);
    }
    file =
        widget.file ??
        (widget.trackId == null ? null : scope?.fileForTrack(widget.trackId!));
    final nextScroll = Scrollable.maybeOf(context)?.position;
    if (scroll != nextScroll) {
      scroll?.removeListener(resolveWhenVisible);
      scroll = nextScroll;
      scroll?.addListener(resolveWhenVisible);
    }
    if (repository != previousRepository ||
        file != previousFile ||
        future == null) {
      future = null;
      resolveWhenVisible();
    }
  }

  @override
  void didUpdateWidget(covariant PlayArtwork oldWidget) {
    super.didUpdateWidget(oldWidget);
    file =
        widget.file ??
        (widget.trackId == null
            ? null
            : LibraryArtworkScope.maybeOf(context)
                  ?.fileForTrack(widget.trackId!));
    if (widget.file != oldWidget.file ||
        widget.trackId != oldWidget.trackId ||
        widget.playlistId != oldWidget.playlistId) {
      future = null;
      resolveWhenVisible();
    }
  }

  Future<File?>? resolve() => widget.playlistId != null
      ? repository?.playlist(widget.playlistId!)
      : file == null
      ? null
      : repository?.audioFile(file!);
  void refresh() {
    if (mounted) {
      setState(() {
        future = null;
      });
      resolveWhenVisible();
    }
  }

  @override
  void dispose() {
    scroll?.removeListener(resolveWhenVisible);
    repository?.removeListener(refresh);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = DdiroriStyle.of(context);
    Widget placeholder() => ColoredBox(
      color: colors['surfaceMuted'],
      child: const Center(child: Icon(Icons.music_note_outlined)),
    );
    return ExcludeSemantics(
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(DdiroriTokens.radius['control']!),
          child: FutureBuilder<File?>(
            future: future,
            builder: (context, snapshot) => snapshot.data == null
                ? placeholder()
                : Image.file(
                    snapshot.data!,
                    fit: BoxFit.cover,
                    cacheWidth: 512,
                    errorBuilder: (context, error, stack) => placeholder(),
                  ),
          ),
        ),
      ),
    );
  }
}
