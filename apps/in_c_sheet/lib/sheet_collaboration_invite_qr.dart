import 'package:flutter/material.dart';

import 'sheet_collaboration_session.dart';

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
