import 'package:flutter/material.dart';

import 'generated/ddirori_tokens.dart';

enum DdiroriDensity { comfortable, compact }

@immutable
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

  @override
  DdiroriStyle copyWith({
    Map<String, int>? colors,
    DdiroriDensity? density,
    bool? touch,
  }) => DdiroriStyle(
    colors: colors ?? this.colors,
    density: density ?? this.density,
    touch: touch ?? this.touch,
  );
  @override
  DdiroriStyle lerp(covariant DdiroriStyle? other, double t) => other == null
      ? this
      : DdiroriStyle(
          colors: {
            for (final k in colors.keys)
              k: Color.lerp(this[k], other[k], t)!.toARGB32(),
          },
          density: t < .5 ? density : other.density,
          touch: t < .5 ? touch : other.touch,
        );
}

/// Visual role only; callers set Text semantics/header separately.
TextStyle ddiroriTextStyle(DdiroriTextRole role, {String? fontFamily}) {
  final value = DdiroriTokens.textStyles[role]!;
  return TextStyle(
    fontFamily: fontFamily,
    fontSize: value['size'],
    fontWeight: FontWeight.values[(value['weight']! / 100).round() - 1],
    height: value['lineHeight'],
    letterSpacing: value['size']! * value['tracking']!,
    fontFeatures: role == DdiroriTextRole.numeric
        ? const [FontFeature.tabularFigures()]
        : null,
  );
}

ThemeData ddiroriTheme({
  Brightness brightness = Brightness.light,
  DdiroriDensity density = DdiroriDensity.comfortable,
  bool touch = true,
  String? fontFamily,
  String? accent,
}) {
  final c = DdiroriStyle(
    colors: accent == null
        ? (brightness == Brightness.dark
              ? DdiroriTokens.dark
              : DdiroriTokens.light)
        : (DdiroriTokens.accents[accent] ??
              (throw ArgumentError.value(
                accent,
                'accent',
              )))[brightness == Brightness.dark ? 'dark' : 'light']!,
    density: density,
    touch: touch,
  );
  final shape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(DdiroriTokens.radius['control']!),
  );
  final base = ThemeData(
    brightness: brightness,
    useMaterial3: true,
    fontFamily: fontFamily,
  );
  final type = DdiroriTokens.typography;
  final control = DdiroriTokens.control;
  FontWeight weight(String role) =>
      FontWeight.values[(type[role]! / 100).round() - 1];
  final scheme = ColorScheme(
    brightness: brightness,
    primary: c['action'],
    onPrimary: c['onAction'],
    secondary: c['sky'],
    onSecondary: c['onPastel'],
    secondaryContainer: c['selection'],
    onSecondaryContainer: c['onSelection'],
    tertiary: c['peach'],
    onTertiary: c['onPastel'],
    tertiaryContainer: c['surfaceMuted'],
    onTertiaryContainer: c['text'],
    error: c['error'],
    onError: c['background'],
    surface: c['surface'],
    surfaceTint: Colors.transparent,
    surfaceContainerLowest: c['background'],
    surfaceContainerLow: c['surface'],
    surfaceContainer: c['surface'],
    surfaceContainerHigh: c['surfaceMuted'],
    onSurface: c['text'],
    surfaceContainerHighest: c['surfaceMuted'],
    onSurfaceVariant: c['muted'],
    outline: c['controlBorder'],
    outlineVariant: c['border'],
    primaryContainer: c['selection'],
    onPrimaryContainer: c['onSelection'],
  );
  final style = ButtonStyle(
    minimumSize: WidgetStatePropertyAll(Size(c.control, c.control)),
    padding: WidgetStatePropertyAll(
      EdgeInsets.symmetric(
        horizontal: control['buttonPaddingX']!,
        vertical: control['buttonPaddingY']!,
      ),
    ),
    shape: WidgetStatePropertyAll(shape),
    textStyle: WidgetStatePropertyAll(
      TextStyle(
        fontFamily: fontFamily,
        fontSize: c.labelSize,
        fontWeight: weight('actionWeight'),
        height: type['controlLineHeight'],
      ),
    ),
    side: WidgetStateProperty.resolveWith(
      (s) => s.contains(WidgetState.focused)
          ? BorderSide(color: c['focus'], width: control['focusWidth']!)
          : BorderSide.none,
    ),
  );
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(DdiroriTokens.radius['control']!),
        borderSide: BorderSide(color: color, width: width),
      );
  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: c['background'],
    extensions: [c],
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: touch
        ? MaterialTapTargetSize.padded
        : MaterialTapTargetSize.shrinkWrap,
    textTheme: base.textTheme
        .copyWith(
          bodyLarge: ddiroriTextStyle(DdiroriTextRole.body),
          bodyMedium: ddiroriTextStyle(DdiroriTextRole.body),
          bodySmall: ddiroriTextStyle(DdiroriTextRole.description),
          labelLarge: ddiroriTextStyle(DdiroriTextRole.label),
          labelMedium: ddiroriTextStyle(DdiroriTextRole.label),
          labelSmall: ddiroriTextStyle(DdiroriTextRole.caption),
          titleSmall: ddiroriTextStyle(DdiroriTextRole.itemTitle),
          titleMedium: ddiroriTextStyle(DdiroriTextRole.sectionTitle),
          titleLarge: ddiroriTextStyle(DdiroriTextRole.screenTitle),
          displaySmall: ddiroriTextStyle(DdiroriTextRole.display),
        )
        .apply(
          fontFamily: fontFamily,
          bodyColor: c['text'],
          displayColor: c['text'],
        ),
    filledButtonTheme: FilledButtonThemeData(
      style: style.copyWith(
        backgroundColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.disabled)
              ? c['disabled']
              : s.contains(WidgetState.pressed)
              ? c['actionPressed']
              : s.contains(WidgetState.hovered)
              ? c['actionHover']
              : c['action'],
        ),
        foregroundColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.disabled)
              ? c['onDisabled']
              : c['onAction'],
        ),
        side: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.focused)
              ? BorderSide(color: c['onAction'], width: control['focusWidth']!)
              : BorderSide.none,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: style.copyWith(
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.disabled)
              ? c['onDisabled']
              : c['text'],
        ),
        side: WidgetStateProperty.resolveWith(
          (s) => BorderSide(
            color: s.contains(WidgetState.focused)
                ? c['focus']
                : c['controlBorder'],
            width: s.contains(WidgetState.focused)
                ? control['focusWidth']!
                : control['borderWidth']!,
          ),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: style),
    iconButtonTheme: IconButtonThemeData(
      style: style.copyWith(
        padding: WidgetStatePropertyAll(
          EdgeInsets.all(control['iconPadding']!),
        ),
        iconSize: WidgetStatePropertyAll(DdiroriTokens.icon['default']!),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(control['toolRadius']!),
          ),
        ),
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.disabled)
              ? c['disabled']
              : states.contains(WidgetState.selected)
              ? c['selection']
              : states.contains(WidgetState.pressed)
              ? c['interactionPressed']
              : states.contains(WidgetState.hovered)
              ? c['interactionHover']
              : Colors.transparent,
        ),
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.disabled)
              ? c['onDisabled']
              : states.contains(WidgetState.selected)
              ? c['onSelection']
              : c['text'],
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationThemeData(
      filled: true,
      fillColor: c['surface'],
      labelStyle: TextStyle(fontFamily: fontFamily, color: c['muted']),
      hintStyle: TextStyle(fontFamily: fontFamily, color: c['muted']),
      helperStyle: TextStyle(fontFamily: fontFamily, color: c['muted']),
      contentPadding: EdgeInsets.all(control['fieldPadding']!),
      enabledBorder: border(c['controlBorder']),
      border: border(c['controlBorder']),
      focusedBorder: border(c['focus'], control['focusWidth']!),
      errorBorder: border(c['error'], 2),
      focusedErrorBorder: border(c['error'], 2),
      disabledBorder: border(c['border']),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: c['surface'],
      selectedColor: c['selection'],
      disabledColor: c['disabled'],
      checkmarkColor: c['onSelection'],
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      pressElevation: 0,
      side: WidgetStateBorderSide.resolveWith(
        (states) => BorderSide(
          color: states.contains(WidgetState.focused)
              ? c['focus']
              : c['border'],
          width: states.contains(WidgetState.focused)
              ? control['focusWidth']!
              : control['borderWidth']!,
        ),
      ),
      labelStyle: ddiroriTextStyle(
        DdiroriTextRole.label,
        fontFamily: fontFamily,
      ).copyWith(color: c['text']),
      labelPadding: EdgeInsets.symmetric(
        horizontal: DdiroriTokens.spacing['xs']!,
      ),
      padding: EdgeInsets.symmetric(
        horizontal: control['choicePaddingX']! - DdiroriTokens.spacing['xs']!,
        vertical: 2,
      ),
      shape: const StadiumBorder(),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        minimumSize: WidgetStatePropertyAll(
          Size(
            control['choiceCompactHeight']!,
            touch ? control['touchTarget']! : control['choiceCompactHeight']!,
          ),
        ),
        textStyle: WidgetStatePropertyAll(
          ddiroriTextStyle(DdiroriTextRole.label, fontFamily: fontFamily),
        ),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(control['toolRadius']!),
          ),
        ),
        side: WidgetStateProperty.resolveWith(
          (states) => BorderSide(
            color: states.contains(WidgetState.focused)
                ? c['focus']
                : c['border'],
            width: states.contains(WidgetState.focused)
                ? control['focusWidth']!
                : control['borderWidth']!,
          ),
        ),
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.disabled)
              ? c['disabled']
              : states.contains(WidgetState.selected)
              ? c['selection']
              : c['surface'],
        ),
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.disabled)
              ? c['onDisabled']
              : c['text'],
        ),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: c['surface'],
      surfaceTintColor: Colors.transparent,
      elevation: DdiroriTokens.elevation['modal'],
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(DdiroriTokens.radius['panel']!),
      ),
      titleTextStyle: ddiroriTextStyle(
        DdiroriTextRole.sectionTitle,
        fontFamily: fontFamily,
      ).copyWith(color: c['text']),
      contentTextStyle: ddiroriTextStyle(
        DdiroriTextRole.body,
        fontFamily: fontFamily,
      ).copyWith(color: c['text']),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c['surface'],
      modalBackgroundColor: c['surface'],
      surfaceTintColor: Colors.transparent,
      elevation: DdiroriTokens.elevation['modal'],
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(DdiroriTokens.radius['panel']!),
        ),
      ),
    ),
    sliderTheme: base.sliderTheme.copyWith(
      activeTrackColor: c['action'],
      thumbColor: c['action'],
      inactiveTrackColor: c['controlBorder'],
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: c['action']),
    dividerColor: c['border'],
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(
        color: c['overlay'],
        borderRadius: BorderRadius.circular(control['toolRadius']!),
      ),
      textStyle: TextStyle(fontFamily: fontFamily, color: c['onOverlay']),
    ),
  );
}
