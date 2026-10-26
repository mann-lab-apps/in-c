import 'dart:async';

import 'package:flutter/material.dart';

import 'brand.dart';
import 'generated/ddirori_tokens.dart';
import 'theme.dart';

enum DdiroriButtonKind { primary, secondary, danger, quiet }

class DdiroriButton extends StatefulWidget {
  const DdiroriButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.kind = DdiroriButtonKind.primary,
    this.busy = false,
    this.selected = false,
    this.onError,
  });
  final String label;
  final FutureOr<void> Function()? onPressed;
  final IconData? icon;
  final DdiroriButtonKind kind;
  final bool busy, selected;
  final void Function(Object, StackTrace)? onError;
  @override
  State<DdiroriButton> createState() => _DdiroriButtonState();
}

class _DdiroriButtonState extends State<DdiroriButton> {
  bool _pending = false;
  Future<void> _run() async {
    if (_pending || widget.busy || widget.onPressed == null) return;
    setState(() => _pending = true);
    try {
      await widget.onPressed!();
    } catch (e, s) {
      if (widget.onError != null) {
        widget.onError!(e, s);
      } else {
        rethrow;
      }
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = widget.busy || _pending;
    final c = DdiroriStyle.of(context);
    final child = Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      children: [
        if (busy)
          const SizedBox.square(
            dimension: 20,
            child: Icon(Icons.hourglass_top, size: 18),
          )
        else if (widget.icon != null)
          Icon(widget.icon, size: 20),
        Text(busy ? '${widget.label} · 처리 중' : widget.label),
      ],
    );
    final action = widget.onPressed == null || busy ? null : _run;
    final selectedStyle = widget.selected
        ? ButtonStyle(
            backgroundColor: WidgetStateProperty.resolveWith(
              (states) => states.contains(WidgetState.disabled)
                  ? c['disabled']
                  : c['selection'],
            ),
            foregroundColor: WidgetStateProperty.resolveWith(
              (states) => states.contains(WidgetState.disabled)
                  ? c['onDisabled']
                  : c['onSelection'],
            ),
            side: WidgetStateProperty.resolveWith(
              (states) => BorderSide(
                color: states.contains(WidgetState.focused)
                    ? c['focus']
                    : c['border'],
                width:
                    DdiroriTokens.control[states.contains(WidgetState.focused)
                        ? 'focusWidth'
                        : 'borderWidth']!,
              ),
            ),
          )
        : null;
    final neutralStyle = ButtonStyle(
      foregroundColor: WidgetStateProperty.resolveWith(
        (states) =>
            states.contains(WidgetState.disabled) ? c['onDisabled'] : c['text'],
      ),
    );
    final button = switch (widget.kind) {
      DdiroriButtonKind.secondary => OutlinedButton(
        style: selectedStyle ?? neutralStyle,
        onPressed: action,
        child: child,
      ),
      DdiroriButtonKind.quiet => TextButton(
        style: selectedStyle ?? neutralStyle,
        onPressed: action,
        child: child,
      ),
      DdiroriButtonKind.danger => OutlinedButton(
        onPressed: action,
        style:
            selectedStyle ??
            ButtonStyle(
              foregroundColor: WidgetStateProperty.resolveWith(
                (states) => states.contains(WidgetState.disabled)
                    ? c['onDisabled']
                    : c['error'],
              ),
            ),
        child: child,
      ),
      DdiroriButtonKind.primary => FilledButton(
        style: selectedStyle,
        onPressed: action,
        child: child,
      ),
    };
    return Semantics(selected: widget.selected, child: button);
  }
}

class DdiroriIconButton extends StatelessWidget {
  const DdiroriIconButton({
    super.key,
    required this.label,
    required this.icon,
    this.onPressed,
    this.selected = false,
    this.glyph,
  });
  final String label;
  final IconData icon;
  final Widget? glyph;
  final VoidCallback? onPressed;
  final bool selected;
  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: label,
    onPressed: onPressed,
    isSelected: selected,
    selectedIcon: glyph ?? Icon(icon),
    icon: glyph ?? Icon(icon),
  );
}

/// Controlled value: parent echoes onChanged; external changes sync without reset-on-build.
class DdiroriInput extends StatefulWidget {
  const DdiroriInput({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.hint,
    this.error,
    this.help,
    this.clearable = false,
    this.enabled = true,
    this.search = false,
    this.readOnly = false,
    this.required = false,
    this.maxLines = 1,
    this.onSubmitted,
    this.keyboardType,
  });
  final String value, label;
  final String? hint, error, help;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool clearable, enabled, search, readOnly, required;
  final int maxLines;
  final TextInputType? keyboardType;
  @override
  State<DdiroriInput> createState() => _DdiroriInputState();
}

class _DdiroriInputState extends State<DdiroriInput> {
  late final _controller = TextEditingController(text: widget.value);
  @override
  void didUpdateWidget(covariant DdiroriInput old) {
    super.didUpdateWidget(old);
    if (widget.value != old.value && widget.value != _controller.text) {
      final p = _controller.selection.extentOffset.clamp(
        0,
        widget.value.length,
      );
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: p),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TextField(
    controller: _controller,
    enabled: widget.enabled,
    readOnly: widget.readOnly,
    maxLines: widget.maxLines,
    keyboardType: widget.keyboardType,
    onSubmitted: widget.onSubmitted == null
        ? null
        : (value) {
            if (!widget.enabled ||
                widget.readOnly ||
                (_controller.value.composing.isValid &&
                    !_controller.value.composing.isCollapsed)) {
              return;
            }
            widget.onSubmitted!(value);
          },
    onChanged: (v) {
      setState(() {});
      widget.onChanged(v);
    },
    decoration: InputDecoration(
      labelText: widget.required ? '${widget.label} (필수)' : widget.label,
      hintText: widget.hint,
      errorText: widget.error,
      helperText: widget.help,
      prefixIcon: widget.search ? const Icon(Icons.search) : null,
      suffixIcon: widget.clearable && _controller.text.isNotEmpty
          ? IconButton(
              tooltip: '${widget.label} 지우기',
              icon: const Icon(Icons.close),
              onPressed: widget.enabled && !widget.readOnly
                  ? () {
                      _controller.clear();
                      setState(() {});
                      widget.onChanged('');
                    }
                  : null,
            )
          : null,
    ),
  );
}

class DdiroriSearch extends StatelessWidget {
  const DdiroriSearch({
    super.key,
    required this.value,
    required this.onChanged,
    this.label = '검색',
  });
  final String value, label;
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) => DdiroriInput(
    value: value,
    onChanged: onChanged,
    label: label,
    search: true,
    clearable: true,
  );
}

class DdiroriChoices<T> extends StatelessWidget {
  const DdiroriChoices({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
    this.multiple = false,
  });
  final Map<T, String> options;
  final Set<T> selected;
  final ValueChanged<Set<T>>? onChanged;
  final bool multiple;
  @override
  Widget build(BuildContext context) => FocusTraversalGroup(
    child: Wrap(
      spacing: DdiroriTokens.spacing['sm']!,
      runSpacing: DdiroriTokens.spacing['sm']!,
      children: options.entries
          .map(
            (e) => FilterChip(
              label: Text(e.value),
              selected: selected.contains(e.key),
              onSelected: onChanged == null
                  ? null
                  : (v) {
                      final next = multiple ? {...selected} : <T>{};
                      if (v) {
                        next.add(e.key);
                      } else {
                        next.remove(e.key);
                      }
                      onChanged!(next);
                    },
            ),
          )
          .toList(),
    ),
  );
}

class DdiroriSegments<T> extends StatelessWidget {
  const DdiroriSegments({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
    this.allowEmpty = false,
    this.icons = const {},
    this.showSelectedIcon = false,
  });
  final Map<T, String> options;
  final Set<T> selected;
  final ValueChanged<Set<T>>? onChanged;
  final bool allowEmpty;
  final Map<T, IconData> icons;
  final bool showSelectedIcon;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: SegmentedButton<T>(
      segments: options.entries
          .map(
            (e) => ButtonSegment(
              value: e.key,
              label: Text(e.value),
              icon: icons[e.key] == null ? null : Icon(icons[e.key]),
            ),
          )
          .toList(),
      selected: selected,
      onSelectionChanged: onChanged,
      emptySelectionAllowed: allowEmpty,
      showSelectedIcon: showSelectedIcon,
    ),
  );
}

class DdiroriPageHeader extends StatelessWidget {
  const DdiroriPageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.actions = const [],
  });

  final String title;
  final String? subtitle;
  final Widget? leading;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final heading = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (leading != null) ...[
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 12),
            child: leading!,
          ),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: Theme.of(context).textTheme.bodyMedium
                      ?.copyWith(color: DdiroriStyle.of(context)['muted']),
                ),
              ],
            ],
          ),
        ),
      ],
    );
    return LayoutBuilder(
      builder: (context, constraints) {
        if (actions.isEmpty) return heading;
        if (constraints.maxWidth < 560) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              heading,
              const SizedBox(height: 12),
              DdiroriAdaptiveActions(children: actions),
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: heading),
            const SizedBox(width: 16),
            Flexible(child: DdiroriAdaptiveActions(children: actions)),
          ],
        );
      },
    );
  }
}

class DdiroriAdaptiveActions extends StatelessWidget {
  const DdiroriAdaptiveActions({
    super.key,
    required this.children,
    this.label = '작업',
    this.breakpoint = 420,
  });

  final List<Widget> children;
  final String label;
  final double breakpoint;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: label,
    child: LayoutBuilder(
      builder: (context, constraints) {
        final gap = DdiroriStyle.of(context).gap;
        if (constraints.hasBoundedWidth && constraints.maxWidth < breakpoint) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = 0; index < children.length; index++) ...[
                SizedBox(width: double.infinity, child: children[index]),
                if (index != children.length - 1) SizedBox(height: gap),
              ],
            ],
          );
        }
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          alignment: WrapAlignment.end,
          children: children,
        );
      },
    ),
  );
}

class DdiroriSection extends StatelessWidget {
  const DdiroriSection({
    super.key,
    required this.title,
    required this.children,
    this.subtitle,
    this.trailing,
    this.spacing = 8,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final List<Widget> children;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    return Material(
      color: c['surfaceMuted'],
      shape: RoundedRectangleBorder(
        side: BorderSide(color: c['border']),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: EdgeInsets.all(DdiroriTokens.layout['rowPadding']!),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          title,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          subtitle!,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: c['muted']),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) ...[
                  const SizedBox(width: 12),
                  Flexible(child: trailing!),
                ],
              ],
            ),
            if (children.isNotEmpty) SizedBox(height: spacing),
            for (var index = 0; index < children.length; index++) ...[
              children[index],
              if (index != children.length - 1) SizedBox(height: spacing),
            ],
          ],
        ),
      ),
    );
  }
}

class DdiroriMetric extends StatelessWidget {
  const DdiroriMetric({
    super.key,
    required this.label,
    required this.value,
    this.icon,
  });

  final String label;
  final String value;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    return Semantics(
      label: '$label $value',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: c['surface'],
          border: Border.all(color: c['border']),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 4,
          children: [
            if (icon != null) Icon(icon, size: 18, color: c['muted']),
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

@immutable
class DdiroriMetricData {
  const DdiroriMetricData({
    required this.label,
    required this.value,
    this.icon,
  });

  final String label;
  final String value;
  final IconData? icon;
}

class DdiroriMetricGroup extends StatelessWidget {
  const DdiroriMetricGroup({
    super.key,
    required this.metrics,
    this.label = '요약',
    this.minItemWidth = 132,
  });

  final List<DdiroriMetricData> metrics;
  final String label;
  final double minItemWidth;

  @override
  Widget build(BuildContext context) {
    final gap = DdiroriStyle.of(context).gap;
    return Semantics(
      container: true,
      label: label,
      child: LayoutBuilder(
        builder: (context, constraints) {
          if (!constraints.hasBoundedWidth) {
            return Wrap(
              spacing: gap,
              runSpacing: gap,
              children: [for (final metric in _metrics()) metric],
            );
          }
          final columns = ((constraints.maxWidth + gap) / (minItemWidth + gap))
              .floor()
              .clamp(1, metrics.length.clamp(1, 6));
          final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [
              for (final metric in _metrics())
                SizedBox(width: width, child: metric),
            ],
          );
        },
      ),
    );
  }

  Iterable<DdiroriMetric> _metrics() => metrics.map(
    (metric) => DdiroriMetric(
      label: metric.label,
      value: metric.value,
      icon: metric.icon,
    ),
  );
}

class DdiroriToolbar extends StatelessWidget {
  const DdiroriToolbar({
    super.key,
    required this.children,
    this.label = '도구',
    this.scroll = false,
  });
  final List<Widget> children;
  final String label;
  final bool scroll;
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final content = scroll
        ? SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(mainAxisSize: MainAxisSize.min, children: children),
          )
        : Wrap(
            spacing: c.gap,
            runSpacing: c.gap,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: children,
          );
    return Semantics(
      container: true,
      label: label,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: c['surfaceMuted'],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: FocusTraversalGroup(child: content),
        ),
      ),
    );
  }
}

class DdiroriItem extends StatelessWidget {
  const DdiroriItem({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.actions = const [],
    this.selected = false,
    this.selecting = false,
    this.enabled = true,
    this.flat = false,
    this.onTap,
    this.onSelected,
  });
  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final List<Widget> actions;
  final bool selected, selecting, enabled, flat;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onSelected;
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final item = Card(
      color: selected ? c['selection'] : c['surface'],
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: BorderSide(
          color: flat
              ? Colors.transparent
              : (selected ? c['action'] : c['border']),
          width: flat ? 0 : (selected ? 2 : 1),
        ),
        borderRadius: BorderRadius.circular(
          flat ? 0 : DdiroriTokens.radius['card']!,
        ),
      ),
      margin: flat ? EdgeInsets.zero : null,
      child: Padding(
        padding: EdgeInsets.all(DdiroriTokens.layout['rowPadding']!),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (selecting)
                  Checkbox(
                    semanticLabel: '$title 선택',
                    value: selected,
                    onChanged: !enabled || onSelected == null
                        ? null
                        : (v) => onSelected!(v ?? false),
                  )
                else if (leading != null)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 12),
                    child: leading!,
                  ),
                Expanded(
                  child: InkWell(
                    onTap: enabled ? onTap : null,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          if (subtitle != null)
                            Text(
                              subtitle!,
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: c['muted']),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (trailing != null) ...[
                  const SizedBox(width: 8),
                  Flexible(child: trailing!),
                ],
              ],
            ),
            if (actions.isNotEmpty)
              Wrap(
                spacing: 4,
                runSpacing: 4,
                alignment: WrapAlignment.end,
                children: actions,
              ),
          ],
        ),
      ),
    );
    return Semantics(
      selected: selected,
      enabled: enabled,
      child: ExcludeFocus(
        excluding: !enabled,
        child: IgnorePointer(
          ignoring: !enabled,
          child: AnimatedOpacity(
            opacity: enabled ? 1 : .56,
            duration: Duration(
              milliseconds: MediaQuery.disableAnimationsOf(context)
                  ? 0
                  : DdiroriTokens.motion['feedbackMs']!.round(),
            ),
            child: item,
          ),
        ),
      ),
    );
  }
}

enum DdiroriNoticeKind { info, success, warning, error }

enum DdiroriStatusTone { neutral, info, success, warning, error }

class DdiroriStatusBadge extends StatelessWidget {
  const DdiroriStatusBadge({
    super.key,
    required this.label,
    this.tone = DdiroriStatusTone.neutral,
    this.icon,
    this.semanticLabel,
  });

  final String label;
  final DdiroriStatusTone tone;
  final IconData? icon;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final toneColor = switch (tone) {
      DdiroriStatusTone.neutral => c['muted'],
      DdiroriStatusTone.info => c['action'],
      DdiroriStatusTone.success => c['success'],
      DdiroriStatusTone.warning => c['warning'],
      DdiroriStatusTone.error => c['error'],
    };
    final toneIcon =
        icon ??
        switch (tone) {
          DdiroriStatusTone.neutral => Icons.circle_outlined,
          DdiroriStatusTone.info => Icons.info_outline,
          DdiroriStatusTone.success => Icons.check_circle_outline,
          DdiroriStatusTone.warning => Icons.warning_amber_outlined,
          DdiroriStatusTone.error => Icons.error_outline,
        };
    return Semantics(
      container: true,
      label: semanticLabel ?? '상태: $label',
      child: ExcludeSemantics(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: c['surface'],
            border: Border.all(color: toneColor),
            borderRadius: BorderRadius.circular(DdiroriTokens.radius['pill']!),
          ),
          child: Wrap(
            spacing: 5,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Icon(toneIcon, size: 15, color: toneColor),
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium
                    ?.copyWith(color: toneColor, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DdiroriMenuButton<T> extends StatelessWidget {
  const DdiroriMenuButton({
    super.key,
    required this.label,
    required this.itemBuilder,
    this.onSelected,
    this.icon = Icons.more_vert,
    this.enabled = true,
  });

  final String label;
  final PopupMenuItemBuilder<T> itemBuilder;
  final PopupMenuItemSelected<T>? onSelected;
  final IconData icon;
  final bool enabled;

  @override
  Widget build(BuildContext context) => PopupMenuButton<T>(
    tooltip: label,
    enabled: enabled,
    icon: Icon(icon),
    onSelected: onSelected,
    itemBuilder: itemBuilder,
  );
}

class DdiroriBanner extends StatelessWidget {
  const DdiroriBanner({
    super.key,
    required this.message,
    this.kind = DdiroriNoticeKind.info,
    this.action,
  });
  final String message;
  final DdiroriNoticeKind kind;
  final Widget? action;
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final icon = switch (kind) {
      DdiroriNoticeKind.info => Icons.info_outline,
      DdiroriNoticeKind.success => Icons.check_circle_outline,
      DdiroriNoticeKind.warning => Icons.warning_amber,
      DdiroriNoticeKind.error => Icons.error_outline,
    };
    final tone = c[kind.name];
    return Semantics(
      liveRegion: kind == DdiroriNoticeKind.error,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c['surfaceMuted'],
          border: Border.all(color: tone),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: tone),
                const SizedBox(width: 10),
                Expanded(child: Text(message)),
              ],
            ),
            if (action != null)
              Align(alignment: AlignmentDirectional.centerEnd, child: action!),
          ],
        ),
      ),
    );
  }
}

class DdiroriStatePanel extends StatelessWidget {
  const DdiroriStatePanel({
    super.key,
    required this.title,
    required this.message,
    this.action,
    this.diagnostic,
    this.error = false,
    this.bach = false,
  });
  final String title, message;
  final Widget? action;
  final String? diagnostic;
  final bool error, bach;
  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 520),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (bach)
              const DdiroriBach()
            else
              Icon(error ? Icons.error_outline : Icons.folder_open, size: 40),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            if (action != null)
              Padding(padding: const EdgeInsets.only(top: 16), child: action!),
            if (diagnostic != null)
              ExpansionTile(
                title: const Text('진단 정보'),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: SelectableText(diagnostic!),
                  ),
                ],
              ),
          ],
        ),
      ),
    ),
  );
}

class DdiroriSettingsRow extends StatelessWidget {
  const DdiroriSettingsRow({
    super.key,
    required this.title,
    required this.control,
    this.description,
  });
  final String title;
  final String? description;
  final Widget control;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: LayoutBuilder(
      builder: (context, c) {
        final text = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (description != null) Text(description!),
          ],
        );
        return c.maxWidth < 560
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [text, const SizedBox(height: 8), control],
              )
            : Row(
                children: [
                  Expanded(child: text),
                  const SizedBox(width: 16),
                  Flexible(child: control),
                ],
              );
      },
    ),
  );
}

Future<T?> showDdiroriSheet<T>({
  required BuildContext context,
  required String title,
  required Widget child,
  List<Widget> actions = const [],
}) => showModalBottomSheet<T>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  useSafeArea: true,
  builder: (context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .85,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 20),
            child,
            const SizedBox(height: 20),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              runSpacing: 8,
              children: actions,
            ),
          ],
        ),
      ),
    ),
  ),
);
Future<T?> showDdiroriDialog<T>({
  required BuildContext context,
  required String title,
  required Widget child,
  List<Widget> actions = const [],
}) => showDialog<T>(
  context: context,
  builder: (context) => AlertDialog(
    scrollable: true,
    title: Text(title),
    content: child,
    actions: actions,
  ),
);

Future<bool> showDdiroriConfirmDialog({
  required BuildContext context,
  required String title,
  required String message,
  required String confirmLabel,
  String cancelLabel = '취소',
  bool danger = false,
}) async =>
    (await showDdiroriDialog<bool>(
      context: context,
      title: title,
      child: Text(message),
      actions: [
        DdiroriButton(
          label: cancelLabel,
          kind: DdiroriButtonKind.quiet,
          onPressed: () => Navigator.of(context).pop(false),
        ),
        DdiroriButton(
          label: confirmLabel,
          kind: danger ? DdiroriButtonKind.danger : DdiroriButtonKind.primary,
          onPressed: () => Navigator.of(context).pop(true),
        ),
      ],
    )) ??
    false;

class DdiroriNumber extends StatefulWidget {
  const DdiroriNumber({
    super.key,
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    this.step = 1,
    this.unit = '',
    this.enabled = true,
  }) : assert(min < max),
       assert(step > 0);
  final String label, unit;
  final double value, min, max, step;
  final ValueChanged<double> onChanged;
  final bool enabled;
  @override
  State<DdiroriNumber> createState() => _DdiroriNumberState();
}

class _DdiroriNumberState extends State<DdiroriNumber> {
  late String _draft = _format(widget.value);
  String? _error;
  bool _dirty = false;
  String _format(double n) =>
      n == n.roundToDouble() ? n.round().toString() : n.toStringAsFixed(2);
  @override
  void didUpdateWidget(covariant DdiroriNumber old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) {
      _draft = _format(widget.value);
      _dirty = false;
      _error = null;
    }
  }

  void _commit(String raw) {
    if (!widget.enabled || !_dirty) return;
    final n = double.tryParse(raw);
    if (n == null || !n.isFinite || n < widget.min || n > widget.max) {
      setState(() => _error = '${widget.min}~${widget.max} 범위로 입력해주세요');
      return;
    }
    setState(() {
      _dirty = false;
      _error = null;
      _draft = _format(n);
    });
    if (n != widget.value) widget.onChanged(n);
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DdiroriIconButton(
            label: '${widget.label} 낮추기',
            icon: Icons.remove,
            onPressed: widget.enabled && widget.value > widget.min
                ? () => widget.onChanged(
                    (widget.value - widget.step).clamp(widget.min, widget.max),
                  )
                : null,
          ),
          Expanded(
            child: DdiroriInput(
              label: '${widget.label} ${widget.unit}'.trim(),
              value: _draft,
              error: _error,
              enabled: widget.enabled,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              onChanged: (v) => setState(() {
                _dirty = true;
                _draft = v;
              }),
              onSubmitted: _commit,
            ),
          ),
          DdiroriIconButton(
            label: '${widget.label} 높이기',
            icon: Icons.add,
            onPressed: widget.enabled && widget.value < widget.max
                ? () => widget.onChanged(
                    (widget.value + widget.step).clamp(widget.min, widget.max),
                  )
                : null,
          ),
        ],
      ),
      Slider(
        label: '${_format(widget.value)} ${widget.unit}',
        value: widget.value.clamp(widget.min, widget.max),
        min: widget.min,
        max: widget.max,
        divisions: ((widget.max - widget.min) / widget.step).round().clamp(
          1,
          10000,
        ),
        onChanged: widget.enabled ? widget.onChanged : null,
      ),
    ],
  );
}
