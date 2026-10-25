import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'components.dart';
import 'theme.dart';
import 'generated/ddirori_tokens.dart';

/// Checkbox/Radio/Switch/Select/Slider use native Material widgets under
/// ddiroriTheme. Their values and persistence belong to the host.
class DdiroriStack extends StatelessWidget {
  const DdiroriStack({
    super.key,
    required this.children,
    this.gap = 12,
    this.inline = false,
  });
  final List<Widget> children;
  final double gap;
  final bool inline;
  @override
  Widget build(BuildContext context) => inline
      ? Wrap(
          spacing: gap,
          runSpacing: gap,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: children,
        )
      : Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < children.length; i++) ...[
              if (i > 0) SizedBox(height: gap),
              children[i],
            ],
          ],
        );
}

class DdiroriContainer extends StatelessWidget {
  const DdiroriContainer({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.topCenter,
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: DdiroriTokens.layout['contentMax']!,
      ),
      child: Padding(
        padding: EdgeInsets.all(DdiroriTokens.layout['pageGutter']!),
        child: child,
      ),
    ),
  );
}

class DdiroriAvatar extends StatelessWidget {
  const DdiroriAvatar({super.key, required this.name, this.image});
  final String name;
  final ImageProvider? image;
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final fallback = Center(
      child: Text(
        name.trim().characters.take(2).toString(),
        style: Theme.of(context).textTheme.labelLarge,
      ),
    );
    return Semantics(
      label: name,
      image: true,
      child: ExcludeSemantics(
        child: ClipOval(
          child: SizedBox(
            width: 48,
            height: 48,
            child: ColoredBox(
              color: c['surfaceMuted'],
              child: image == null
                  ? fallback
                  : Image(
                      image: image!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, error, stack) => fallback,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class DdiroriList extends StatelessWidget {
  const DdiroriList({super.key, required this.children, required this.label});
  final List<Widget> children;
  final String label;
  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: label,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const Divider(height: 1),
          children[i],
        ],
      ],
    ),
  );
}

class DdiroriAccordion extends StatelessWidget {
  const DdiroriAccordion({
    super.key,
    required this.title,
    required this.open,
    required this.onChanged,
    required this.child,
  });
  final String title;
  final bool open;
  final ValueChanged<bool> onChanged;
  final Widget child;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Semantics(
        expanded: open,
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: DdiroriButton(
            label: '$title ${open ? '−' : '+'}',
            kind: DdiroriButtonKind.quiet,
            onPressed: () => onChanged(!open),
          ),
        ),
      ),
      if (open)
        Padding(padding: const EdgeInsets.only(bottom: 16), child: child),
      const Divider(height: 1),
    ],
  );
}

class DdiroriTab {
  const DdiroriTab({
    required this.id,
    required this.label,
    required this.child,
    this.enabled = true,
  });
  final String id, label;
  final Widget child;
  final bool enabled;
}

/// Automatic activation, wrapping labels, roving focus, disabled tabs skipped.
class DdiroriTabs extends StatefulWidget {
  const DdiroriTabs({
    super.key,
    required this.label,
    required this.tabs,
    required this.value,
    required this.onChanged,
  });
  final String label, value;
  final List<DdiroriTab> tabs;
  final ValueChanged<String> onChanged;
  @override
  State<DdiroriTabs> createState() => _DdiroriTabsState();
}

class _DdiroriTabsState extends State<DdiroriTabs> {
  final Map<String, FocusNode> _nodes = {};
  @override
  void dispose() {
    for (final node in _nodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant DdiroriTabs old) {
    super.didUpdateWidget(old);
    for (final id in _nodes.keys.toList()) {
      if (!widget.tabs.any((t) => t.id == id)) {
        _nodes.remove(id)!.dispose();
      }
    }
  }

  KeyEventResult _key(String id, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final tabs = widget.tabs.where((t) => t.enabled).toList();
    if (tabs.isEmpty) return KeyEventResult.ignored;
    final current = tabs.indexWhere((t) => t.id == id);
    int? next;
    if (event.logicalKey == LogicalKeyboardKey.arrowRight ||
        event.logicalKey == LogicalKeyboardKey.arrowDown) {
      next = (current + 1) % tabs.length;
    }
    if (event.logicalKey == LogicalKeyboardKey.arrowLeft ||
        event.logicalKey == LogicalKeyboardKey.arrowUp) {
      next = (current - 1 + tabs.length) % tabs.length;
    }
    if (event.logicalKey == LogicalKeyboardKey.home) next = 0;
    if (event.logicalKey == LogicalKeyboardKey.end) next = tabs.length - 1;
    if (next == null) return KeyEventResult.ignored;
    _nodes[tabs[next].id]?.requestFocus();
    widget.onChanged(tabs[next].id);
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final enabled = widget.tabs.where((t) => t.enabled).toList();
    final entry = enabled.any((t) => t.id == widget.value)
        ? widget.value
        : (enabled.isEmpty ? null : enabled.first.id);
    return DdiroriStack(
      children: [
        Semantics(
          container: true,
          label: widget.label,
          child: Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              for (final tab in widget.tabs)
                Focus(
                  onKeyEvent: (_, event) => _key(tab.id, event),
                  skipTraversal: true,
                  child: Semantics(
                    selected: tab.id == widget.value,
                    child: TextButton(
                      focusNode: _nodes.putIfAbsent(tab.id, () => FocusNode())
                        ..skipTraversal = tab.id != entry,
                      onPressed: tab.enabled
                          ? () => widget.onChanged(tab.id)
                          : null,
                      style: TextButton.styleFrom(
                        minimumSize: Size(0, c.control),
                        foregroundColor: tab.id == widget.value
                            ? c['onSelection']
                            : c['text'],
                        backgroundColor: tab.id == widget.value
                            ? c['selection']
                            : Colors.transparent,
                      ),
                      child: Text(tab.label),
                    ),
                  ),
                ),
            ],
          ),
        ),
        for (final tab in widget.tabs)
          if (tab.id == widget.value)
            Semantics(container: true, label: tab.label, child: tab.child),
      ],
    );
  }
}

class DdiroriSkeleton extends StatelessWidget {
  const DdiroriSkeleton({super.key, this.label = '불러오는 중', this.lines = 3});
  final String label;
  final int lines;
  @override
  Widget build(BuildContext context) => Semantics(
    label: label,
    liveRegion: true,
    child: ExcludeSemantics(
      child: DdiroriStack(
        gap: 8,
        children: [
          for (var i = 0; i < lines.clamp(1, 10); i++)
            FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: i == lines - 1 ? 0.65 : 1,
              child: Container(
                height: 16,
                decoration: BoxDecoration(
                  color: DdiroriStyle.of(context)['surfaceMuted'],
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

class DdiroriInlineMessage extends StatelessWidget {
  const DdiroriInlineMessage({
    super.key,
    required this.message,
    this.error = false,
  });
  final String message;
  final bool error;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Text(
      message,
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
        color: DdiroriStyle.of(context)[error ? 'error' : 'muted'],
      ),
    ),
  );
}

/// Native ScaffoldMessenger handles announcement, queueing and safe area.
void showDdiroriToast(
  BuildContext context, {
  required String message,
  SnackBarAction? action,
}) {
  final c = DdiroriStyle.of(context);
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message, style: TextStyle(color: c['text'])),
      action: action,
      backgroundColor: c['surface'],
      showCloseIcon: true,
      closeIconColor: c['text'],
      persist: true,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: c['controlBorder']),
        borderRadius: BorderRadius.circular(12),
      ),
    ),
  );
}

/// An anchored form uses a focus-managed dialog role, never menuitem semantics.
class DdiroriPopover extends StatefulWidget {
  const DdiroriPopover({super.key, required this.label, required this.builder});
  final String label;
  final WidgetBuilder builder;
  @override
  State<DdiroriPopover> createState() => _DdiroriPopoverState();
}

class _DdiroriPopoverState extends State<DdiroriPopover> {
  final _anchor = GlobalKey();
  final _focus = FocusNode();
  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  Future<void> _open() async {
    final box = _anchor.currentContext!.findRenderObject()! as RenderBox;
    final point = box.localToGlobal(Offset.zero);
    final theme = Theme.of(context);
    await showDialog<void>(
      context: context,
      builder: (ctx) => LayoutBuilder(
        builder: (ctx, limits) {
          final width = (limits.maxWidth - 32).clamp(0.0, 320.0);
          final left = point.dx.clamp(
            16.0,
            (limits.maxWidth - width - 16).clamp(16.0, double.infinity),
          );
          final top = (point.dy + box.size.height + 8).clamp(
            16.0,
            (limits.maxHeight - 200).clamp(16.0, double.infinity),
          );
          return Theme(
            data: theme,
            child: Stack(
              children: [
                Positioned(
                  left: left,
                  top: top,
                  width: width,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: (limits.maxHeight - top - 16).clamp(
                        0.0,
                        double.infinity,
                      ),
                    ),
                    child: Material(
                      color: DdiroriStyle.of(context)['surface'],
                      elevation: 4,
                      borderRadius: BorderRadius.circular(16),
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Semantics(
                          scopesRoute: true,
                          explicitChildNodes: true,
                          namesRoute: true,
                          label: widget.label,
                          child: widget.builder(ctx),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
    if (mounted) _focus.requestFocus();
  }

  @override
  Widget build(BuildContext context) => TextButton(
    key: _anchor,
    focusNode: _focus,
    onPressed: _open,
    child: Text(widget.label),
  );
}
