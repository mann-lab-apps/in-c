import 'package:flutter/material.dart';
import '../../generated/doyo_tokens.dart';

/// Reference adapter. Copy with generated/ intact; never derive the palette
/// with fromSeed when exact Doyo colors are required.
@immutable
class DoyoColors extends ThemeExtension<DoyoColors> {
  DoyoColors(Map<String, int> source)
      : colors = Map.unmodifiable(source.map((key, value) => MapEntry(key, Color(value))));
  const DoyoColors._(this.colors);
  final Map<String, Color> colors;
  Color operator [](String role) => colors[role]!;
  Color get scorePaper => Color(DoyoTokens.score['paper']!);
  Color get scoreNotation => Color(DoyoTokens.score['notation']!);

  @override
  DoyoColors copyWith({Map<String, Color>? colors}) =>
      DoyoColors._(Map.unmodifiable({...this.colors, ...?colors}));

  @override
  DoyoColors lerp(covariant DoyoColors? other, double t) {
    if (other == null) return this;
    return DoyoColors._(Map.unmodifiable({
      for (final key in colors.keys) key: Color.lerp(this[key], other[key], t)!,
    }));
  }
}

ThemeData doyoTheme({
  Brightness brightness = Brightness.light,
  bool compact = false,
  bool touch = true,
  String? fontFamily,
}) {
  final c = DoyoColors(brightness == Brightness.dark ? DoyoTokens.dark : DoyoTokens.light);
  final size = compact && !touch ? DoyoTokens.compactControl : DoyoTokens.comfortableControl;
  final radius = RoundedRectangleBorder(borderRadius: BorderRadius.circular(8));
  final scheme = ColorScheme(
    brightness: brightness,
    primary: c['action'], onPrimary: c['onAction'],
    primaryContainer: c['selected'], onPrimaryContainer: c['onSelected'],
    secondary: c['action'], onSecondary: c['onAction'],
    secondaryContainer: c['surfaceMuted'], onSecondaryContainer: c['text'],
    tertiary: c['warning'], onTertiary: c['background'],
    error: c['error'], onError: c['onAction'],
    errorContainer: c['errorSurface'], onErrorContainer: c['error'],
    surface: c['surface'], onSurface: c['text'], onSurfaceVariant: c['muted'],
    surfaceContainerLowest: c['background'], surfaceContainerLow: c['background'],
    surfaceContainer: c['surface'], surfaceContainerHigh: c['surfaceMuted'],
    surfaceContainerHighest: c['surfaceMuted'],
    outline: c['controlBorder'], outlineVariant: c['border'],
    surfaceTint: Colors.transparent,
  );
  Color actionBackground(Set<WidgetState> states) {
    if (states.contains(WidgetState.disabled)) return c['disabled'];
    if (states.contains(WidgetState.pressed)) return c['actionPressed'];
    if (states.contains(WidgetState.hovered)) return c['actionHover'];
    return c['action'];
  }
  final buttonStyle = ButtonStyle(
    minimumSize: WidgetStatePropertyAll(Size(size, size)),
    padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
    shape: WidgetStatePropertyAll(radius),
    textStyle: WidgetStatePropertyAll(TextStyle(fontSize: compact && !touch ? 14 : 16, fontWeight: FontWeight.w600)),
    tapTargetSize: compact && !touch ? MaterialTapTargetSize.shrinkWrap : MaterialTapTargetSize.padded,
    elevation: const WidgetStatePropertyAll(0),
  );
  final base = ThemeData(
    useMaterial3: true, brightness: brightness, colorScheme: scheme,
    scaffoldBackgroundColor: c['background'], fontFamily: fontFamily,
    visualDensity: VisualDensity.standard,
    extensions: <ThemeExtension<dynamic>>[c],
  );
  final text = base.textTheme.apply(bodyColor: c['text'], displayColor: c['text']).copyWith(
    bodyLarge: TextStyle(fontSize: 16, height: 1.55, color: c['text']),
    bodyMedium: TextStyle(fontSize: 14, height: 1.55, color: c['text']),
    bodySmall: TextStyle(fontSize: 13, height: 1.55, color: c['muted']),
    titleLarge: TextStyle(fontSize: 28, height: 1.25, fontWeight: FontWeight.w700, color: c['text']),
  );
  OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: color, width: width),
  );
  return base.copyWith(
    textTheme: text.apply(fontFamily: fontFamily),
    appBarTheme: AppBarTheme(backgroundColor: c['surface'], foregroundColor: c['text'], surfaceTintColor: Colors.transparent, elevation: 0),
    cardTheme: CardThemeData(color: c['surface'], surfaceTintColor: Colors.transparent, elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: c['border']))),
    filledButtonTheme: FilledButtonThemeData(style: buttonStyle.copyWith(
      backgroundColor: WidgetStateProperty.resolveWith(actionBackground),
      foregroundColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.disabled) ? c['onDisabled'] : c['onAction']),
      side: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.focused) ? BorderSide(color: c['onAction'], width: 2) : BorderSide.none),
    )),
    outlinedButtonTheme: OutlinedButtonThemeData(style: buttonStyle.copyWith(
      foregroundColor: WidgetStatePropertyAll(c['text']),
      side: WidgetStateProperty.resolveWith((states) => BorderSide(color: states.contains(WidgetState.focused) ? c['focus'] : c['controlBorder'], width: states.contains(WidgetState.focused) ? 2 : 1)),
    )),
    textButtonTheme: TextButtonThemeData(style: buttonStyle.copyWith(foregroundColor: WidgetStatePropertyAll(c['action']))),
    iconButtonTheme: IconButtonThemeData(style: buttonStyle.copyWith(foregroundColor: WidgetStatePropertyAll(c['text']))),
    inputDecorationTheme: InputDecorationThemeData(
      filled: true, fillColor: c['surface'], contentPadding: const EdgeInsets.all(12),
      constraints: BoxConstraints(minHeight: size),
      labelStyle: TextStyle(color: c['muted']), hintStyle: TextStyle(color: c['muted']),
      errorStyle: TextStyle(color: c['error']),
      border: border(c['controlBorder']), enabledBorder: border(c['controlBorder']),
      focusedBorder: border(c['focus'], 2), errorBorder: border(c['error'], 2),
      focusedErrorBorder: border(c['error'], 2), disabledBorder: border(c['border']),
    ),
    dividerColor: c['border'],
    sliderTheme: SliderThemeData(activeTrackColor: c['action'], thumbColor: c['action'], inactiveTrackColor: c['controlBorder']),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: c['action']),
  );
}
