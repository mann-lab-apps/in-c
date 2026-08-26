import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'chime_audio.dart';
import 'chime_controller.dart';
import 'preferences.dart';
import 'tone_model.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final preferences = ChimePreferences();
  final savedState = await preferences.load();
  final controller = ChimeController(
    audio: ChimeAudio(),
    initialState: savedState,
    saveState: preferences.save,
  );

  runApp(InCChimeApp(controller: controller));
}

class InCChimeApp extends StatelessWidget {
  const InCChimeApp({required this.controller, super.key});

  final ChimeController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'in C - Chime',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff2f766e),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xfffffefa),
        useMaterial3: true,
      ),
      home: ChimeScreen(controller: controller),
    );
  }
}

class ChimeScreen extends StatefulWidget {
  const ChimeScreen({required this.controller, super.key});

  final ChimeController controller;

  @override
  State<ChimeScreen> createState() => _ChimeScreenState();
}

class _ChimeScreenState extends State<ChimeScreen> {
  ChimeController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    controller.addListener(_handleControllerChange);
  }

  @override
  void dispose() {
    controller.removeListener(_handleControllerChange);
    controller.dispose();
    super.dispose();
  }

  void _handleControllerChange() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _openFeedback() async {
    final uri = Uri.parse(
      'https://in-c.mannlab.app/utility-apps.html?source=in-c-chime#utility-app-form',
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final state = controller.state;
    final tone = state.tone;

    return Scaffold(
      body: _ChimePaper(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
            children: [
              _TopBanner(onPressed: _openFeedback),
              const SizedBox(height: 14),
              _ToneBoard(
                tone: tone,
                toneColor: state.toneColor,
              ),
              const SizedBox(height: 12),
              _TransportControls(
                isDronePlaying: controller.isDronePlaying,
                onChime: controller.playChime,
                onDrone: controller.toggleDrone,
              ),
              const SizedBox(height: 14),
              _PitchGrid(
                selected: state.pitch,
                onSelected: controller.setPitch,
              ),
              const SizedBox(height: 12),
              _TuningControls(
                octave: state.octave,
                referenceA: state.referenceA,
                toneColor: state.toneColor,
                volume: state.volume,
                onOctaveChanged: controller.setOctave,
                onReferenceAChanged: controller.setReferenceA,
                onToneColorChanged: controller.setToneColor,
                onVolumeChanged: controller.setVolume,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBanner extends StatelessWidget {
  const _TopBanner({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'in C Chime에 필요한 소리 제안하기',
      onTap: onPressed,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: _SketchPanel(
          padding: const EdgeInsets.fromLTRB(18, 13, 18, 13),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Chime에 필요한 소리가 있나요?',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: const Color(0xff242a27),
                        fontWeight: FontWeight.w900,
                        height: 1.3,
                      ),
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                '기능 제안',
                style: TextStyle(
                  color: Color(0xff2f766e),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ToneBoard extends StatelessWidget {
  const _ToneBoard({
    required this.tone,
    required this.toneColor,
  });

  final ChimeTone tone;
  final ToneColor toneColor;

  @override
  Widget build(BuildContext context) {
    return _SketchPanel(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '현재 기준음',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: const Color(0xff62635d),
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Semantics(
              label: '현재 기준음 ${tone.label}',
              child: Text(
                tone.label,
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: const Color(0xff202321),
                      fontSize: 92,
                      fontWeight: FontWeight.w900,
                      height: 0.9,
                    ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '${tone.frequencyLabel} · A=${tone.referenceA} · ${toneColor.label}',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: const Color(0xff62635d),
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

class _TransportControls extends StatelessWidget {
  const _TransportControls({
    required this.isDronePlaying,
    required this.onChime,
    required this.onDrone,
  });

  final bool isDronePlaying;
  final VoidCallback onChime;
  final VoidCallback onDrone;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ActionButton(
            label: 'Chime',
            icon: Icons.notifications_none_rounded,
            color: const Color(0xffc39636),
            semanticLabel: '선택한 기준음 짧게 재생',
            onPressed: onChime,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ActionButton(
            label: isDronePlaying ? 'Stop' : 'Drone',
            icon: isDronePlaying
                ? Icons.stop_rounded
                : Icons.radio_button_checked_rounded,
            color:
                isDronePlaying ? const Color(0xff8e3731) : const Color(0xff2f766e),
            semanticLabel: isDronePlaying ? '드론 정지' : '드론 시작',
            onPressed: onDrone,
          ),
        ),
      ],
    );
  }
}

class _PitchGrid extends StatelessWidget {
  const _PitchGrid({
    required this.selected,
    required this.onSelected,
  });

  final PitchName selected;
  final ValueChanged<PitchName> onSelected;

  @override
  Widget build(BuildContext context) {
    return _SketchPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '음',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 4,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.72,
            children: [
              for (final pitch in PitchName.values)
                _PitchButton(
                  pitch: pitch,
                  selected: pitch == selected,
                  onPressed: () => onSelected(pitch),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TuningControls extends StatelessWidget {
  const _TuningControls({
    required this.octave,
    required this.referenceA,
    required this.toneColor,
    required this.volume,
    required this.onOctaveChanged,
    required this.onReferenceAChanged,
    required this.onToneColorChanged,
    required this.onVolumeChanged,
  });

  final int octave;
  final int referenceA;
  final ToneColor toneColor;
  final double volume;
  final ValueChanged<int> onOctaveChanged;
  final ValueChanged<int> onReferenceAChanged;
  final ValueChanged<ToneColor> onToneColorChanged;
  final ValueChanged<double> onVolumeChanged;

  @override
  Widget build(BuildContext context) {
    return _SketchPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '설정',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          _ControlLabel(label: '옥타브', value: '$octave'),
          const SizedBox(height: 8),
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 2, label: Text('2')),
              ButtonSegment(value: 3, label: Text('3')),
              ButtonSegment(value: 4, label: Text('4')),
              ButtonSegment(value: 5, label: Text('5')),
            ],
            selected: {octave},
            onSelectionChanged: (selection) => onOctaveChanged(selection.first),
          ),
          const SizedBox(height: 14),
          _ControlLabel(label: 'A 기준', value: '$referenceA Hz'),
          const SizedBox(height: 8),
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 440, label: Text('440')),
              ButtonSegment(value: 441, label: Text('441')),
              ButtonSegment(value: 442, label: Text('442')),
            ],
            selected: {referenceA},
            onSelectionChanged: (selection) =>
                onReferenceAChanged(selection.first),
          ),
          const SizedBox(height: 14),
          _ControlLabel(label: '음색', value: toneColor.label),
          const SizedBox(height: 8),
          SegmentedButton<ToneColor>(
            segments: const [
              ButtonSegment(value: ToneColor.pure, label: Text('Pure')),
              ButtonSegment(value: ToneColor.warm, label: Text('Warm')),
              ButtonSegment(value: ToneColor.bright, label: Text('Bright')),
            ],
            selected: {toneColor},
            onSelectionChanged: (selection) =>
                onToneColorChanged(selection.first),
          ),
          const SizedBox(height: 14),
          _ControlLabel(
            label: '볼륨',
            value: '${(volume * 100).round()}%',
          ),
          Slider(
            min: 0,
            max: 1,
            divisions: 20,
            value: volume,
            onChanged: onVolumeChanged,
          ),
        ],
      ),
    );
  }
}

class _ControlLabel extends StatelessWidget {
  const _ControlLabel({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: const Color(0xff62635d),
                  fontWeight: FontWeight.w900,
                ),
          ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: const Color(0xff202321),
                fontWeight: FontWeight.w900,
              ),
        ),
      ],
    );
  }
}

class _PitchButton extends StatelessWidget {
  const _PitchButton({
    required this.pitch,
    required this.selected,
    required this.onPressed,
  });

  final PitchName pitch;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: '${pitch.label} 선택',
      onTap: onPressed,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onPressed,
          child: CustomPaint(
            painter: _HatchedRoundRectPainter(
              fillColor: selected ? const Color(0xffe3f2df) : Colors.white,
              hatchColor:
                  selected ? const Color(0x665fb48a) : const Color(0x00000000),
              borderColor:
                  selected ? const Color(0xff2f766e) : const Color(0xff9a8f86),
            ),
            child: Center(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    pitch.label,
                    style: TextStyle(
                      color: selected
                          ? const Color(0xff183e39)
                          : const Color(0xff282724),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.semanticLabel,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final Color color;
  final String semanticLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      onTap: onPressed,
      child: SizedBox(
        height: 66,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: onPressed,
            child: CustomPaint(
              painter: _HatchedRoundRectPainter(
                fillColor: color,
                hatchColor: const Color(0x00000000),
                borderColor: const Color(0xff282724),
              ),
              foregroundPainter: const _SketchRoundRectBorderPainter(
                color: Color(0xbb282724),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, color: const Color(0xfffffdf7), size: 24),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: const TextStyle(
                      color: Color(0xfffffdf7),
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChimePaper extends StatelessWidget {
  const _ChimePaper({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xfffffefa),
      child: child,
    );
  }
}

class _SketchPanel extends StatelessWidget {
  const _SketchPanel({
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: const _SketchBorderPainter(),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );
  }
}

class _SketchBorderPainter extends CustomPainter {
  const _SketchBorderPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final outer = Paint()
      ..color = const Color(0xaa282724)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.25;
    final inner = Paint()
      ..color = const Color(0x66282724)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9;

    _drawLooseRoundRect(canvas, size, outer, 0);
    _drawLooseRoundRect(
      canvas,
      Size(size.width - 10, size.height - 10),
      inner,
      1,
      offset: const Offset(5, 5),
    );
  }

  void _drawLooseRoundRect(
    Canvas canvas,
    Size size,
    Paint paint,
    int variant, {
    Offset offset = Offset.zero,
  }) {
    final inset = variant == 0 ? 0.8 : 0.0;
    final left = offset.dx + inset;
    final top = offset.dy + inset + (variant == 0 ? 0.4 : 0);
    final right = offset.dx + size.width - inset;
    final bottom = offset.dy + size.height - inset;
    final radius = variant == 0 ? 9.0 : 7.0;

    final path = Path()
      ..moveTo(left + radius, top + 0.2)
      ..quadraticBezierTo(
        offset.dx + size.width * 0.35,
        top - 0.8,
        right - radius,
        top + 0.4,
      )
      ..quadraticBezierTo(right + 0.5, top + 0.5, right, top + radius)
      ..quadraticBezierTo(
        right - 0.5,
        offset.dy + size.height * 0.54,
        right - 0.4,
        bottom - radius,
      )
      ..quadraticBezierTo(right - 0.4, bottom + 0.2, right - radius, bottom)
      ..quadraticBezierTo(
        offset.dx + size.width * 0.54,
        bottom + 0.7,
        left + radius,
        bottom - 0.2,
      )
      ..quadraticBezierTo(left - 0.4, bottom - 0.4, left, bottom - radius)
      ..quadraticBezierTo(
        left + 0.3,
        offset.dy + size.height * 0.45,
        left + 0.2,
        top + radius,
      )
      ..quadraticBezierTo(left + 0.2, top, left + radius, top + 0.2);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SketchBorderPainter oldDelegate) => false;
}

class _HatchedRoundRectPainter extends CustomPainter {
  const _HatchedRoundRectPainter({
    required this.fillColor,
    required this.hatchColor,
    required this.borderColor,
  });

  final Color fillColor;
  final Color hatchColor;
  final Color borderColor;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(8));
    final clip = Path()..addRRect(rrect);

    canvas.drawRRect(rrect, Paint()..color = fillColor);
    canvas.save();
    canvas.clipPath(clip);
    _drawHatch(
      canvas,
      size,
      Paint()
        ..color = hatchColor
        ..strokeWidth = 1.2
        ..strokeCap = StrokeCap.round,
      spacing: 15,
      skew: 0.62,
    );
    canvas.restore();

    canvas.drawRRect(
      rrect.deflate(0.5),
      Paint()
        ..color = borderColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );
  }

  @override
  bool shouldRepaint(covariant _HatchedRoundRectPainter oldDelegate) {
    return oldDelegate.fillColor != fillColor ||
        oldDelegate.hatchColor != hatchColor ||
        oldDelegate.borderColor != borderColor;
  }
}

class _SketchRoundRectBorderPainter extends CustomPainter {
  const _SketchRoundRectBorderPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1;
    final secondPaint = Paint()
      ..color = color.withAlpha(95)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.75;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0.8, 0.8, size.width - 1.6, size.height - 1.6),
        const Radius.circular(8),
      ),
      paint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(5, 5, size.width - 10, size.height - 10),
        const Radius.circular(6),
      ),
      secondPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _SketchRoundRectBorderPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

void _drawHatch(
  Canvas canvas,
  Size size,
  Paint paint, {
  required double spacing,
  required double skew,
}) {
  for (var x = -size.height; x < size.width + size.height; x += spacing) {
    canvas.drawLine(
      Offset(x, size.height),
      Offset(x + (size.height * skew), 0),
      paint,
    );
  }
}
