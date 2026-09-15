import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'classical_discovery_controller.dart';

class ClassicalDataControlsScreen extends StatefulWidget {
  const ClassicalDataControlsScreen({required this.controller, super.key});
  final ClassicalDiscoveryController controller;

  @override
  State<ClassicalDataControlsScreen> createState() =>
      _ClassicalDataControlsScreenState();
}

class _ClassicalDataControlsScreenState
    extends State<ClassicalDataControlsScreen> {
  String? _result;

  Future<void> _erase() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('in C 기록을 지울까요?'),
        content: const SingleChildScrollView(
          child: Text(
            '취향, 저장한 작품, 감상지도, 반응, 사용 기록과 이 앱의 내부 백업을 지우고 알림을 해제합니다. 되돌릴 수 없습니다. Clef 악보와 외부 음악 서비스의 기록은 지우지 않습니다.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('기록 삭제'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _result = null);
    try {
      await widget.controller.eraseLocalData();
      if (mounted) setState(() => _result = '이 기기의 in C 기록을 지웠어요.');
    } catch (_) {
      if (mounted) {
        setState(() => _result = widget.controller.persistenceMessage);
      }
    }
  }

  Future<void> _export() async {
    try {
      final text = widget.controller.exportLocalData();
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(
              title: const Text('내 기록 JSON'),
              actions: [
                Builder(
                  builder: (context) => IconButton(
                    tooltip: '내 기록 복사',
                    icon: const Icon(Icons.copy),
                    onPressed: () async {
                      try {
                        await Clipboard.setData(ClipboardData(text: text));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('기록을 복사했어요.')),
                          );
                        }
                      } catch (_) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('복사하지 못했어요.')),
                          );
                        }
                      }
                    },
                  ),
                ),
              ],
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: SelectableText(text),
            ),
          ),
        ),
      );
    } catch (_) {
      if (mounted) setState(() => _result = '기록을 불러온 뒤 다시 시도해 주세요.');
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) => PopScope(
      canPop: !widget.controller.resettingData,
      child: Scaffold(
        appBar: AppBar(title: const Text('내 기록 관리')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_result != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Semantics(liveRegion: true, child: Text(_result!)),
              ),
            if (widget.controller.persistenceMessage != null && _result == null)
              Text(widget.controller.persistenceMessage!),
            const Text('기록은 이 기기에 저장됩니다. 현재 계정 동기화는 연결되어 있지 않습니다.'),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.data_object),
              title: const Text('내 기록 JSON 보기'),
              subtitle: const Text('취향, 감상 기록, 설정과 최근 사용 기록'),
              enabled:
                  !widget.controller.resettingData &&
                  !widget.controller.loadFailed,
              onTap: _export,
            ),
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.delete_outline),
              title: const Text('in C 기록 지우기'),
              enabled: !widget.controller.resettingData,
              onTap: _erase,
            ),
            const SizedBox(height: 16),
            const Text('별도로 복사한 기록과 운영체제·다른 기기의 백업은 이 동작으로 삭제되지 않습니다.'),
            if (widget.controller.resettingData)
              const Padding(
                padding: EdgeInsets.all(16),
                child: LinearProgressIndicator(),
              ),
          ],
        ),
      ),
    ),
  );
}
