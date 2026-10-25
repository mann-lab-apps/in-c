# Flutter API 원문

공개 export 파일의 실제 constructor·필드와 함수 서명이다. `required`, nullable 타입, constructor 기본값이 계약이다. Widget의 key는 Flutter 규칙을 따른다. 아래 선언은 구현을 복제하는 코드가 아닌 소스 조사 자료이며 타입별 동작은 컴포넌트 명세를 따른다.

Import: `package:ddirori_ui/ddirori_ui.dart`; Material 합성은 `package:flutter/material.dart`. 생성 토큰은 [토큰 부록](token-reference.md).

<a id="DdiroriDensity"></a>
## DdiroriDensity

소스: [packages/ddirori_ui/lib/src/theme.dart](../../../../packages/ddirori_ui/lib/src/theme.dart) · 조사 당시 5행.

```dart
enum DdiroriDensity { comfortable, compact }
```

<a id="DdiroriStyle"></a>
## DdiroriStyle

소스: [packages/ddirori_ui/lib/src/theme.dart](../../../../packages/ddirori_ui/lib/src/theme.dart) · 조사 당시 8행.

```dart
class DdiroriStyle extends ThemeExtension<DdiroriStyle> {
const DdiroriStyle({
    required this.colors,
    this.density = DdiroriDensity.comfortable,
    this.touch = true,
  });
  final Map<String, int> colors;
  final DdiroriDensity density;
  final bool touch;
  Color operator [](String role) => Color(colors[role]!);
  double get control => density == DdiroriDensity.compact && !touch
      ? DdiroriTokens.compactControl
      : DdiroriTokens.comfortableControl;
  double get gap => density == DdiroriDensity.compact
      ? DdiroriTokens.compactGap
      : DdiroriTokens.comfortableGap;
  double get labelSize => density == DdiroriDensity.compact
      ? DdiroriTokens.compactFont
      : DdiroriTokens.comfortableFont;
  static DdiroriStyle of(BuildContext context) {
    final theme = Theme.of(context);
    return theme.extension<DdiroriStyle>() ??
        DdiroriStyle(
          colors: theme.brightness == Brightness.dark
              ? DdiroriTokens.dark
              : DdiroriTokens.light,
        );
  }
}
```

필드 타입: `Map<String, int> colors`, `DdiroriDensity density`, `bool touch`.

<a id="ddiroriTextStyle"></a>
## ddiroriTextStyle

소스: [packages/ddirori_ui/lib/src/theme.dart](../../../../packages/ddirori_ui/lib/src/theme.dart) · 조사 당시 61행.

```dart
TextStyle ddiroriTextStyle(DdiroriTextRole role, {String? fontFamily})
```

<a id="ddiroriTheme"></a>
## ddiroriTheme

소스: [packages/ddirori_ui/lib/src/theme.dart](../../../../packages/ddirori_ui/lib/src/theme.dart) · 조사 당시 75행.

```dart
ThemeData ddiroriTheme({
  Brightness brightness = Brightness.light,
  DdiroriDensity density = DdiroriDensity.comfortable,
  bool touch = true,
  String? fontFamily,
  String? accent,
})
```

<a id="DdiroriMark"></a>
## DdiroriMark

소스: [packages/ddirori_ui/lib/src/brand.dart](../../../../packages/ddirori_ui/lib/src/brand.dart) · 조사 당시 10행.

```dart
class DdiroriMark extends StatelessWidget {
const DdiroriMark({
    super.key,
    this.size = 48,
    this.color,
    this.phase = 0,
    this.pulse = false,
  });
  final double size;
  final Color? color;
  final double phase;
  final bool pulse;
}
```

필드 타입: `double size`, `Color? color`, `double phase`, `bool pulse`.

<a id="DdiroriBach"></a>
## DdiroriBach

소스: [packages/ddirori_ui/lib/src/brand.dart](../../../../packages/ddirori_ui/lib/src/brand.dart) · 조사 당시 106행.

```dart
class DdiroriBach extends StatelessWidget {
const DdiroriBach({super.key, this.size = 64, this.label = '놀란 바흐'});
  final double size;
  final String label;
}
```

필드 타입: `double size`, `String label`.

<a id="DdiroriProgress"></a>
## DdiroriProgress

소스: [packages/ddirori_ui/lib/src/brand.dart](../../../../packages/ddirori_ui/lib/src/brand.dart) · 조사 당시 115행.

```dart
class DdiroriProgress extends StatefulWidget {
const DdiroriProgress({
    super.key,
    this.value,
    this.label = '불러오는 중',
    this.size = 40,
  });
  final double? value;
  final String label;
  final double size;
}
```

필드 타입: `double? value`, `String label`, `double size`.

<a id="DdiroriButtonKind"></a>
## DdiroriButtonKind

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 9행.

```dart
enum DdiroriButtonKind { primary, secondary, danger, quiet }
```

<a id="DdiroriButton"></a>
## DdiroriButton

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 11행.

```dart
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
}
```

필드 타입: `String label`, `FutureOr<void> Function()? onPressed`, `IconData? icon`, `DdiroriButtonKind kind`, `bool busy, selected`, `void Function(Object, StackTrace)? onError`.

<a id="DdiroriIconButton"></a>
## DdiroriIconButton

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 134행.

```dart
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
}
```

필드 타입: `String label`, `IconData icon`, `Widget? glyph`, `VoidCallback? onPressed`, `bool selected`.

<a id="DdiroriInput"></a>
## DdiroriInput

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 159행.

```dart
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
}
```

필드 타입: `String value, label`, `String? hint, error, help`, `ValueChanged<String> onChanged`, `ValueChanged<String>? onSubmitted`, `bool clearable, enabled, search, readOnly, required`, `int maxLines`, `TextInputType? keyboardType`.

<a id="DdiroriSearch"></a>
## DdiroriSearch

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 256행.

```dart
class DdiroriSearch extends StatelessWidget {
const DdiroriSearch({
    super.key,
    required this.value,
    required this.onChanged,
    this.label = '검색',
  });
  final String value, label;
  final ValueChanged<String> onChanged;
}
```

필드 타입: `String value, label`, `ValueChanged<String> onChanged`.

<a id="DdiroriChoices"></a>
## DdiroriChoices

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 275행.

```dart
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
}
```

필드 타입: `Map<T, String> options`, `Set<T> selected`, `ValueChanged<Set<T>>? onChanged`, `bool multiple`.

<a id="DdiroriSegments"></a>
## DdiroriSegments

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 315행.

```dart
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
}
```

필드 타입: `Map<T, String> options`, `Set<T> selected`, `ValueChanged<Set<T>>? onChanged`, `bool allowEmpty`, `Map<T, IconData> icons`, `bool showSelectedIcon`.

<a id="DdiroriPageHeader"></a>
## DdiroriPageHeader

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 352행.

```dart
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
}
```

필드 타입: `String title`, `String? subtitle`, `Widget? leading`, `List<Widget> actions`.

<a id="DdiroriAdaptiveActions"></a>
## DdiroriAdaptiveActions

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 427행.

```dart
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
}
```

필드 타입: `List<Widget> children`, `String label`, `double breakpoint`.

<a id="DdiroriSection"></a>
## DdiroriSection

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 468행.

```dart
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
}
```

필드 타입: `String title`, `String? subtitle`, `Widget? trailing`, `List<Widget> children`, `double spacing`.

<a id="DdiroriMetric"></a>
## DdiroriMetric

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 541행.

```dart
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
}
```

필드 타입: `String label`, `String value`, `IconData? icon`.

<a id="DdiroriMetricData"></a>
## DdiroriMetricData

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 585행.

```dart
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
```

필드 타입: `String label`, `String value`, `IconData? icon`.

<a id="DdiroriMetricGroup"></a>
## DdiroriMetricGroup

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 597행.

```dart
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
}
```

필드 타입: `List<DdiroriMetricData> metrics`, `String label`, `double minItemWidth`.

<a id="DdiroriToolbar"></a>
## DdiroriToolbar

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 650행.

```dart
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
}
```

필드 타입: `List<Widget> children`, `String label`, `bool scroll`.

<a id="DdiroriItem"></a>
## DdiroriItem

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 691행.

```dart
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
}
```

필드 타입: `String title`, `String? subtitle`, `Widget? leading`, `Widget? trailing`, `List<Widget> actions`, `bool selected, selecting, enabled, flat`, `VoidCallback? onTap`, `ValueChanged<bool>? onSelected`.

<a id="DdiroriNoticeKind"></a>
## DdiroriNoticeKind

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 816행.

```dart
enum DdiroriNoticeKind { info, success, warning, error }
```

<a id="DdiroriStatusTone"></a>
## DdiroriStatusTone

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 818행.

```dart
enum DdiroriStatusTone { neutral, info, success, warning, error }
```

<a id="DdiroriStatusBadge"></a>
## DdiroriStatusBadge

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 820행.

```dart
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
}
```

필드 타입: `String label`, `DdiroriStatusTone tone`, `IconData? icon`, `String? semanticLabel`.

<a id="DdiroriMenuButton"></a>
## DdiroriMenuButton

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 882행.

```dart
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
}
```

필드 타입: `String label`, `PopupMenuItemBuilder<T> itemBuilder`, `PopupMenuItemSelected<T>? onSelected`, `IconData icon`, `bool enabled`.

<a id="DdiroriBanner"></a>
## DdiroriBanner

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 908행.

```dart
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
}
```

필드 타입: `String message`, `DdiroriNoticeKind kind`, `Widget? action`.

<a id="DdiroriStatePanel"></a>
## DdiroriStatePanel

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 957행.

```dart
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
}
```

필드 타입: `String title, message`, `Widget? action`, `String? diagnostic`, `bool error, bach`.

<a id="DdiroriSettingsRow"></a>
## DdiroriSettingsRow

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 1011행.

```dart
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
}
```

필드 타입: `String title`, `String? description`, `Widget control`.

<a id="DdiroriNumber"></a>
## DdiroriNumber

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 1130행.

```dart
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
}
```

필드 타입: `String label, unit`, `double value, min, max, step`, `ValueChanged<double> onChanged`, `bool enabled`.

<a id="showDdiroriSheet"></a>
## showDdiroriSheet

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 1050행.

```dart
Future<T?> showDdiroriSheet<T>({
  required BuildContext context,
  required String title,
  required Widget child,
  List<Widget> actions = const [],
})
```

<a id="showDdiroriDialog"></a>
## showDdiroriDialog

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 1088행.

```dart
Future<T?> showDdiroriDialog<T>({
  required BuildContext context,
  required String title,
  required Widget child,
  List<Widget> actions = const [],
})
```

<a id="showDdiroriConfirmDialog"></a>
## showDdiroriConfirmDialog

소스: [packages/ddirori_ui/lib/src/components.dart](../../../../packages/ddirori_ui/lib/src/components.dart) · 조사 당시 1103행.

```dart
Future<bool> showDdiroriConfirmDialog({
  required BuildContext context,
  required String title,
  required String message,
  required String confirmLabel,
  String cancelLabel = '취소',
  bool danger = false,
})
```

<a id="DdiroriPageControls"></a>
## DdiroriPageControls

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 7행.

```dart
class DdiroriPageControls extends StatelessWidget {
const DdiroriPageControls({
    super.key,
    required this.page,
    required this.onPrevious,
    required this.onNext,
    this.pageCount,
    this.performance = false,
  });
  final int page;
  final int? pageCount;
  final VoidCallback? onPrevious, onNext;
  final bool performance;
}
```

필드 타입: `int page`, `int? pageCount`, `VoidCallback? onPrevious, onNext`, `bool performance`.

<a id="DdiroriAnnotationTools"></a>
## DdiroriAnnotationTools

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 63행.

```dart
class DdiroriAnnotationTools extends StatelessWidget {
const DdiroriAnnotationTools({
    super.key,
    required this.tool,
    required this.onToolChanged,
    required this.color,
    required this.onColorChanged,
    required this.width,
    required this.onWidthChanged,
    this.onUndo,
    this.onRedo,
  });
  final String tool;
  final ValueChanged<String> onToolChanged;
  final Color color;
  final ValueChanged<Color> onColorChanged;
  final double width;
  final ValueChanged<double> onWidthChanged;
  final VoidCallback? onUndo, onRedo;
}
```

필드 타입: `String tool`, `ValueChanged<String> onToolChanged`, `Color color`, `ValueChanged<Color> onColorChanged`, `double width`, `ValueChanged<double> onWidthChanged`, `VoidCallback? onUndo, onRedo`.

<a id="DdiroriTransportVariant"></a>
## DdiroriTransportVariant

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 142행.

```dart
enum DdiroriTransportVariant { full, compact }
```

<a id="DdiroriPlaybackProgress"></a>
## DdiroriPlaybackProgress

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 156행.

```dart
class DdiroriPlaybackProgress extends StatefulWidget {
const DdiroriPlaybackProgress({
    super.key,
    required this.position,
    this.duration,
    this.bufferedPosition,
    this.onSeek,
    this.enabled = true,
    this.statusLabel,
    this.sliderKey,
  });

  final Duration position;
  final Duration? duration;
  final Duration? bufferedPosition;
  final ValueChanged<Duration>? onSeek;
  final bool enabled;
  final String? statusLabel;
  final Key? sliderKey;
}
```

필드 타입: `Duration position`, `Duration? duration`, `Duration? bufferedPosition`, `ValueChanged<Duration>? onSeek`, `bool enabled`, `String? statusLabel`, `Key? sliderKey`.

<a id="DdiroriTransport"></a>
## DdiroriTransport

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 288행.

```dart
class DdiroriTransport extends StatelessWidget {
const DdiroriTransport({
    super.key,
    required this.playing,
    required this.onToggle,
    this.position = Duration.zero,
    this.duration,
    this.onSeek,
    this.onPrevious,
    this.onNext,
    this.bufferedPosition,
    this.statusLabel,
    this.variant = DdiroriTransportVariant.full,
  });
  final bool playing;
  final VoidCallback? onToggle, onPrevious, onNext;
  final Duration position;
  final Duration? duration;
  final Duration? bufferedPosition;
  final String? statusLabel;
  final DdiroriTransportVariant variant;
  final ValueChanged<Duration>? onSeek;
}
```

필드 타입: `bool playing`, `VoidCallback? onToggle, onPrevious, onNext`, `Duration position`, `Duration? duration`, `Duration? bufferedPosition`, `String? statusLabel`, `DdiroriTransportVariant variant`, `ValueChanged<Duration>? onSeek`.

<a id="DdiroriBeatIndicator"></a>
## DdiroriBeatIndicator

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 351행.

```dart
class DdiroriBeatIndicator extends StatelessWidget {
const DdiroriBeatIndicator({
    super.key,
    required this.beats,
    required this.currentBeat,
    this.running = false,
  }) : assert(beats > 0);
  final int beats, currentBeat;
  final bool running;
}
```

필드 타입: `int beats, currentBeat`, `bool running`.

<a id="DdiroriTunerStatus"></a>
## DdiroriTunerStatus

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 401행.

```dart
enum DdiroriTunerStatus { flat, centered, sharp, noSignal, lowConfidence }
```

<a id="DdiroriTunerMeter"></a>
## DdiroriTunerMeter

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 403행.

```dart
class DdiroriTunerMeter extends StatelessWidget {
const DdiroriTunerMeter({
    super.key,
    required this.status,
    this.cents,
    this.note = 'A4',
  });
  final DdiroriTunerStatus status;
  final double? cents;
  final String note;
}
```

필드 타입: `DdiroriTunerStatus status`, `double? cents`, `String note`.

<a id="formatDdiroriDuration"></a>
## formatDdiroriDuration

소스: [packages/ddirori_ui/lib/src/music.dart](../../../../packages/ddirori_ui/lib/src/music.dart) · 조사 당시 144행.

```dart
String formatDdiroriDuration(Duration duration)
```

<a id="DdiroriProduct"></a>
## DdiroriProduct

소스: [packages/ddirori_ui/lib/src/brand_family.dart](../../../../packages/ddirori_ui/lib/src/brand_family.dart) · 조사 당시 7행.

```dart
enum DdiroriProduct { play, score, studio, talk, stage, click, chime }
```

<a id="DdiroriBachExpression"></a>
## DdiroriBachExpression

소스: [packages/ddirori_ui/lib/src/brand_family.dart](../../../../packages/ddirori_ui/lib/src/brand_family.dart) · 조사 당시 9행.

```dart
enum DdiroriBachExpression { surprised, calm, happy }
```

<a id="DdiroriProductGlyph"></a>
## DdiroriProductGlyph

소스: [packages/ddirori_ui/lib/src/brand_family.dart](../../../../packages/ddirori_ui/lib/src/brand_family.dart) · 조사 당시 11행.

```dart
class DdiroriProductGlyph extends StatelessWidget {
const DdiroriProductGlyph({
    super.key,
    required this.product,
    this.size = 32,
    this.color,
  });
  final DdiroriProduct product;
  final double size;
  final Color? color;
}
```

필드 타입: `DdiroriProduct product`, `double size`, `Color? color`.

<a id="DdiroriProductSignature"></a>
## DdiroriProductSignature

소스: [packages/ddirori_ui/lib/src/brand_family.dart](../../../../packages/ddirori_ui/lib/src/brand_family.dart) · 조사 당시 90행.

```dart
class DdiroriProductSignature extends StatelessWidget {
const DdiroriProductSignature({
    super.key,
    required this.product,
    required this.name,
    this.subtitle,
  });
  final DdiroriProduct product;
  final String name;
  final String? subtitle;
}
```

필드 타입: `DdiroriProduct product`, `String name`, `String? subtitle`.

<a id="DdiroriBachVector"></a>
## DdiroriBachVector

소스: [packages/ddirori_ui/lib/src/brand_family.dart](../../../../packages/ddirori_ui/lib/src/brand_family.dart) · 조사 당시 149행.

```dart
class DdiroriBachVector extends StatelessWidget {
const DdiroriBachVector({
    super.key,
    this.size = 64,
    this.expression = DdiroriBachExpression.surprised,
    this.label,
  });
  final double size;
  final DdiroriBachExpression expression;
  final String? label;
}
```

필드 타입: `double size`, `DdiroriBachExpression expression`, `String? label`.

<a id="DdiroriServiceAvailability"></a>
## DdiroriServiceAvailability

소스: [packages/ddirori_ui/lib/src/brand_family.dart](../../../../packages/ddirori_ui/lib/src/brand_family.dart) · 조사 당시 224행.

```dart
enum DdiroriServiceAvailability { available, external, install, unavailable }
```

<a id="DdiroriServiceLink"></a>
## DdiroriServiceLink

소스: [packages/ddirori_ui/lib/src/brand_family.dart](../../../../packages/ddirori_ui/lib/src/brand_family.dart) · 조사 당시 226행.

```dart
class DdiroriServiceLink extends StatelessWidget {
const DdiroriServiceLink({
    super.key,
    required this.product,
    required this.name,
    required this.description,
    this.availability = DdiroriServiceAvailability.available,
    this.onOpen,
  });
  final DdiroriProduct product;
  final String name;
  final String description;
  final DdiroriServiceAvailability availability;
  final VoidCallback? onOpen;
}
```

필드 타입: `DdiroriProduct product`, `String name`, `String description`, `DdiroriServiceAvailability availability`, `VoidCallback? onOpen`.

<a id="DdiroriStack"></a>
## DdiroriStack

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 10행.

```dart
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
}
```

필드 타입: `List<Widget> children`, `double gap`, `bool inline`.

<a id="DdiroriContainer"></a>
## DdiroriContainer

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 39행.

```dart
class DdiroriContainer extends StatelessWidget {
const DdiroriContainer({super.key, required this.child});
  final Widget child;
}
```

필드 타입: `Widget child`.

<a id="DdiroriAvatar"></a>
## DdiroriAvatar

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 57행.

```dart
class DdiroriAvatar extends StatelessWidget {
const DdiroriAvatar({super.key, required this.name, this.image});
  final String name;
  final ImageProvider? image;
}
```

필드 타입: `String name`, `ImageProvider? image`.

<a id="DdiroriList"></a>
## DdiroriList

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 95행.

```dart
class DdiroriList extends StatelessWidget {
const DdiroriList({super.key, required this.children, required this.label});
  final List<Widget> children;
  final String label;
}
```

필드 타입: `List<Widget> children`, `String label`.

<a id="DdiroriAccordion"></a>
## DdiroriAccordion

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 115행.

```dart
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
}
```

필드 타입: `String title`, `bool open`, `ValueChanged<bool> onChanged`, `Widget child`.

<a id="DdiroriTab"></a>
## DdiroriTab

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 149행.

```dart
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
```

필드 타입: `String id, label`, `Widget child`, `bool enabled`.

<a id="DdiroriTabs"></a>
## DdiroriTabs

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 162행.

```dart
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
}
```

필드 타입: `String label, value`, `List<DdiroriTab> tabs`, `ValueChanged<String> onChanged`.

<a id="DdiroriSkeleton"></a>
## DdiroriSkeleton

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 271행.

```dart
class DdiroriSkeleton extends StatelessWidget {
const DdiroriSkeleton({super.key, this.label = '불러오는 중', this.lines = 3});
  final String label;
  final int lines;
}
```

필드 타입: `String label`, `int lines`.

<a id="DdiroriInlineMessage"></a>
## DdiroriInlineMessage

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 301행.

```dart
class DdiroriInlineMessage extends StatelessWidget {
const DdiroriInlineMessage({
    super.key,
    required this.message,
    this.error = false,
  });
  final String message;
  final bool error;
}
```

필드 타입: `String message`, `bool error`.

<a id="DdiroriPopover"></a>
## DdiroriPopover

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 346행.

```dart
class DdiroriPopover extends StatefulWidget {
const DdiroriPopover({super.key, required this.label, required this.builder});
  final String label;
  final WidgetBuilder builder;
}
```

필드 타입: `String label`, `WidgetBuilder builder`.

<a id="showDdiroriToast"></a>
## showDdiroriToast

소스: [packages/ddirori_ui/lib/src/basic.dart](../../../../packages/ddirori_ui/lib/src/basic.dart) · 조사 당시 322행.

```dart
void showDdiroriToast(
  BuildContext context, {
  required String message,
  SnackBarAction? action,
})
```
