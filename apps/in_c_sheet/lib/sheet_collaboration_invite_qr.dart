import 'package:flutter/material.dart';

import 'sheet_collaboration_session.dart';

class SheetCollaborationSessionPreviewView extends StatelessWidget {
  const SheetCollaborationSessionPreviewView({
    super.key,
    required this.preview,
    this.onStartLocalSimulation,
    this.onCopyFallback,
  });

  final SheetCollaborationSessionPreview preview;
  final VoidCallback? onStartLocalSimulation;
  final VoidCallback? onCopyFallback;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final canStart =
        preview.canStartLocalSimulation && onStartLocalSimulation != null;
    return Semantics(
      label: '협업 세션 미리보기',
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('협업 세션 미리보기', style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                '실제 네트워크 연결 전, 같은 악보와 세트리스트를 갖췄는지 먼저 확인합니다.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              _CollaborationStatusBlock(
                icon: preview.preflightCheck.canFollow
                    ? Icons.check_circle_outline
                    : Icons.error_outline,
                title: preview.preflightCheck.headline,
                lines: preview.preflightCheck.reviewLines,
                attention: !preview.preflightCheck.canFollow,
              ),
              const SizedBox(height: 12),
              _CollaborationStatusBlock(
                icon: preview.followerReview.requiresAttention
                    ? Icons.warning_amber_outlined
                    : Icons.sync_alt,
                title: preview.followerReview.headline,
                lines: preview.followerReview.reviewLines,
                attention: preview.followerReview.requiresAttention,
              ),
              if (preview.blockingReasons.isNotEmpty) ...[
                const SizedBox(height: 12),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: colorScheme.errorContainer,
                    border: Border.all(color: colorScheme.error),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '시작 전 확인 필요',
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: colorScheme.onErrorContainer,
                          ),
                        ),
                        const SizedBox(height: 6),
                        ...preview.blockingReasons.map(
                          (reason) => Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              reason,
                              style: TextStyle(
                                color: colorScheme.onErrorContainer,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              SheetCollaborationInviteQrView(
                plan: preview.qrPlan,
                onCopyFallback: onCopyFallback,
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: canStart ? onStartLocalSimulation : null,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('로컬 시뮬레이션 시작'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SheetCollaborationSimulationReportView extends StatelessWidget {
  const SheetCollaborationSimulationReportView({
    super.key,
    required this.report,
  });

  final SheetCollaborationLocalSimulationReport report;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: '협업 시뮬레이션 결과',
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('협업 시뮬레이션 결과', style: theme.textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(report.headline, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 16),
              _CollaborationStatusBlock(
                icon: report.finalRequiresAttention
                    ? Icons.warning_amber_outlined
                    : Icons.check_circle_outline,
                title: '요약',
                lines: report.reviewLines,
                attention: report.finalRequiresAttention,
              ),
              if (report.steps.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text('단계별 결과', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                ...report.steps.map(
                  (step) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _CollaborationStatusBlock(
                      icon: step.requiresAttention
                          ? Icons.error_outline
                          : Icons.sync_alt,
                      title: step.label,
                      lines: <String>[
                        step.review.headline,
                        ...step.review.reviewLines,
                      ],
                      attention: step.requiresAttention,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _CollaborationStatusBlock extends StatelessWidget {
  const _CollaborationStatusBlock({
    required this.icon,
    required this.title,
    required this.lines,
    required this.attention,
  });

  final IconData icon;
  final String title;
  final List<String> lines;
  final bool attention;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final foreground = attention ? colorScheme.error : colorScheme.primary;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: foreground),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: theme.textTheme.titleSmall),
                  const SizedBox(height: 6),
                  ...lines.map(
                    (line) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(line),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SheetCollaborationInviteQrView extends StatelessWidget {
  const SheetCollaborationInviteQrView({
    super.key,
    required this.plan,
    this.onCopyFallback,
  });

  final SheetCollaborationInviteQrPlan plan;
  final VoidCallback? onCopyFallback;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final foreground = colorScheme.onSurface;
    final background = colorScheme.surface;

    return Semantics(
      label: plan.canRenderQr ? '협업 초대 QR' : '협업 초대 코드 복사',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            plan.canRenderQr ? '초대 QR' : '초대 코드',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          if (plan.canRenderQr)
            Center(
              child: SizedBox.square(
                dimension: plan.minimumPixelSize.clamp(160, 260).toDouble(),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: background,
                      border: Border.all(color: colorScheme.outlineVariant),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: CustomPaint(
                        painter: SheetCollaborationInviteQrPainter(
                          modules: plan.modules,
                          foreground: foreground,
                          background: background,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            )
          else
            SelectableText(
              plan.copyFallbackPayload,
              maxLines: 4,
              style: theme.textTheme.bodySmall,
            ),
          const SizedBox(height: 12),
          ...plan.reviewLines.map(
            (line) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(line),
            ),
          ),
          if (onCopyFallback != null) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: onCopyFallback,
                icon: const Icon(Icons.copy_outlined),
                label: const Text('코드 복사'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class SheetCollaborationInviteQrPainter extends CustomPainter {
  const SheetCollaborationInviteQrPainter({
    required this.modules,
    required this.foreground,
    required this.background,
  });

  final List<List<bool>> modules;
  final Color foreground;
  final Color background;

  @override
  void paint(Canvas canvas, Size size) {
    final moduleCount = modules.length;
    if (moduleCount == 0) {
      canvas.drawRect(Offset.zero & size, Paint()..color = background);
      return;
    }
    final cell = size.shortestSide / moduleCount;
    final xOffset = (size.width - cell * moduleCount) / 2;
    final yOffset = (size.height - cell * moduleCount) / 2;
    final backgroundPaint = Paint()..color = background;
    final foregroundPaint = Paint()..color = foreground;
    canvas.drawRect(Offset.zero & size, backgroundPaint);
    for (var row = 0; row < moduleCount; row += 1) {
      for (var column = 0; column < modules[row].length; column += 1) {
        if (!modules[row][column]) {
          continue;
        }
        canvas.drawRect(
          Rect.fromLTWH(
            xOffset + column * cell,
            yOffset + row * cell,
            cell,
            cell,
          ),
          foregroundPaint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(SheetCollaborationInviteQrPainter oldDelegate) {
    return modules != oldDelegate.modules ||
        foreground != oldDelegate.foreground ||
        background != oldDelegate.background;
  }
}
