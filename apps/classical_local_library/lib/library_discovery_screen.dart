import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import 'library_discovery.dart';
import 'presentation/play_activity_components.dart';

class DiscoverySection {
  const DiscoverySection({required this.title, required this.results});

  final String title;
  final List<DiscoveryResult> results;
}

class LibraryDiscoveryScreen extends StatelessWidget {
  const LibraryDiscoveryScreen({
    super.key,
    required this.sections,
    required this.onOpen,
    required this.onPlay,
  });

  final List<DiscoverySection> sections;
  final ValueChanged<DiscoveryResult> onOpen;
  final ValueChanged<DiscoveryResult> onPlay;

  @override
  Widget build(BuildContext context) {
    final visible = [
      for (final section in sections)
        if (section.results.isNotEmpty) section,
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('음악 발견')),
      body: SafeArea(
        child: visible.isEmpty
            ? const DdiroriStatePanel(
                title: '아직 추천할 음악이 없습니다',
                message: '감상 이력이나 연결된 메타데이터가 쌓이면 관련 작품과 녹음을 보여드립니다.',
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                itemCount: visible.length,
                separatorBuilder: (_, _) => const Divider(height: 28),
                itemBuilder: (context, index) {
                  final section = visible[index];
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        section.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      for (final result in section.results)
                        PlayDiscoveryResultRow(
                          result: result,
                          onOpen: () => onOpen(result),
                          onPlay: () => onPlay(result),
                        ),
                    ],
                  );
                },
              ),
      ),
    );
  }
}
