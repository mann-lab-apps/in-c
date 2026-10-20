import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'sheet_collaboration_invite_qr.dart';
import 'sheet_collaboration_session.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';

class SheetCollaborationLabScreen extends StatefulWidget {
  const SheetCollaborationLabScreen({
    required this.setlists,
    required this.scores,
    this.now,
    super.key,
  });

  final List<SheetSetlist> setlists;
  final List<SheetScore> scores;
  final DateTime Function()? now;

  @override
  State<SheetCollaborationLabScreen> createState() =>
      _SheetCollaborationLabScreenState();
}

class _SheetCollaborationLabScreenState
    extends State<SheetCollaborationLabScreen> {
  String? _setlistId;

  DateTime _now() => widget.now?.call() ?? DateTime.now().toUtc();

  SheetSetlist? get _selectedSetlist {
    if (widget.setlists.isEmpty) return null;
    final selectedId = _setlistId;
    if (selectedId != null) {
      for (final setlist in widget.setlists) {
        if (setlist.id == selectedId) return setlist;
      }
    }
    return widget.setlists.first;
  }

  SheetCollaborationInvite _inviteFor(SheetSetlist setlist) {
    final createdAt = _now();
    return SheetCollaborationInvite(
      sessionId: 'local-${setlist.id}-${createdAt.microsecondsSinceEpoch}',
      leaderDeviceId: 'same-device-preview',
      setlistId: setlist.id,
      createdAt: createdAt,
      expiresAt: createdAt.add(const Duration(minutes: 10)),
    );
  }

  Future<void> _copyInvite(String payload) async {
    await Clipboard.setData(ClipboardData(text: payload));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('로컬 시뮬레이션 초대 코드를 복사했습니다.')));
    }
  }

  Future<void> _runSimulation(
    SheetSetlist setlist,
    SheetCollaborationInvite invite,
  ) async {
    final scoresById = <String, SheetScore>{
      for (final score in widget.scores) score.id: score,
    };
    final start = _now();
    final actions = <SheetCollaborationSimulationAction>[];
    var seconds = 1;
    for (final scoreId in setlist.scoreIds) {
      final score = scoresById[scoreId];
      if (score == null) continue;
      actions.add(
        SheetCollaborationSimulationAction.leaderPage(
          scoreId: scoreId,
          page: score.lastPage < 1 ? 1 : score.lastPage,
          timestamp: start.add(Duration(seconds: seconds++)),
        ),
      );
    }
    actions.add(
      SheetCollaborationSimulationAction.disconnect(
        timestamp: start.add(Duration(seconds: seconds++)),
      ),
    );
    String? firstAvailableId;
    for (final scoreId in setlist.scoreIds) {
      if (scoresById.containsKey(scoreId)) {
        firstAvailableId = scoreId;
        break;
      }
    }
    if (firstAvailableId != null) {
      actions.add(
        SheetCollaborationSimulationAction.leaderPage(
          scoreId: firstAvailableId,
          page: scoresById[firstAvailableId]!.lastPage < 1
              ? 1
              : scoresById[firstAvailableId]!.lastPage,
          timestamp: start.add(Duration(seconds: seconds)),
        ),
      );
    }
    final report = SheetCollaborationLocalSimulationReport.run(
      invite: invite,
      initialFollowerScoreIds: widget.scores.map((score) => score.id).toSet(),
      actions: actions,
    );
    if (!mounted) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          appBar: AppBar(title: const Text('협업 시뮬레이션 결과')),
          body: SheetCollaborationSimulationReportView(report: report),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selectedSetlist;
    return Scaffold(
      appBar: AppBar(title: const Text('협업 준비 실험')),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              color: Theme.of(context).colorScheme.secondaryContainer,
              padding: const EdgeInsets.all(12),
              child: const Text(
                '개발자용 한 기기 시뮬레이션입니다. 실제 태블릿 연결이나 페이지 전송은 하지 않습니다.',
              ),
            ),
            if (selected == null)
              const Expanded(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('검증할 세트리스트를 먼저 만들어주세요.'),
                  ),
                ),
              )
            else ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: DropdownButtonFormField<String>(
                  key: ValueKey(selected.id),
                  initialValue: selected.id,
                  decoration: const InputDecoration(
                    labelText: '검증할 세트리스트',
                    border: OutlineInputBorder(),
                  ),
                  items: widget.setlists
                      .map(
                        (setlist) => DropdownMenuItem<String>(
                          value: setlist.id,
                          child: Text(
                            '${setlist.title} · ${setlist.scoreIds.length}곡',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(growable: false),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _setlistId = value;
                    });
                  },
                ),
              ),
              Expanded(child: _buildPreview(selected)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPreview(SheetSetlist setlist) {
    final invite = _inviteFor(setlist);
    final preview = SheetCollaborationSessionPreview.forInvite(
      invite: invite,
      leaderScoreIds: setlist.scoreIds,
      followerScoreIds: widget.scores.map((score) => score.id).toSet(),
    );
    return SheetCollaborationSessionPreviewView(
      key: ValueKey(setlist.id),
      preview: preview,
      onCopyFallback: () => _copyInvite(preview.qrPlan.copyFallbackPayload),
      onStartLocalSimulation: () => _runSimulation(setlist, invite),
    );
  }
}
