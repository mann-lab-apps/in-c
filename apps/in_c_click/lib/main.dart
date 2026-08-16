import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'metronome_audio.dart';
import 'metronome_controller.dart';
import 'preferences.dart';
import 'tempo_marking.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final preferences = ClickPreferences();
  final savedState = await preferences.load();
  final controller = MetronomeController(
    audio: MetronomeAudio(),
    initialState: savedState,
    saveState: preferences.save,
  );

  runApp(InCClickApp(controller: controller));
}

class InCClickApp extends StatelessWidget {
  const InCClickApp({required this.controller, super.key});

  final MetronomeController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'in C - Click',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Pretendard',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xffb43d2f),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xfffffefa),
        useMaterial3: true,
      ),
      home: MetronomeScreen(controller: controller),
    );
  }
}

class MetronomeScreen extends StatefulWidget {
  const MetronomeScreen({required this.controller, super.key});

  final MetronomeController controller;

  @override
  State<MetronomeScreen> createState() => _MetronomeScreenState();
}

class _MetronomeScreenState extends State<MetronomeScreen> {
  MetronomeController get controller => widget.controller;
  bool _isTapTempoOpen = false;
  bool _isMeterEditorOpen = false;

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
      'https://in-c.mannlab.app/utility-apps.html?source=in-c-click',
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openTempoMarkings() async {
    final selected = await showModalBottomSheet<TempoMarking>(
      context: context,
      backgroundColor: const Color(0xfffffefa),
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemBuilder: (context, index) {
              final marking = tempoMarkings[index];
              return ListTile(
                title: Text(
                  marking.displayName,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                subtitle: Text('${marking.rangeLabel} BPM'),
                trailing: Text(
                  '${marking.defaultBpm}',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                onTap: () => Navigator.of(context).pop(marking),
              );
            },
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemCount: tempoMarkings.length,
          ),
        );
      },
    );

    if (selected != null) {
      controller.setBpm(selected.defaultBpm);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = controller.state;

    return Scaffold(
      body: _SketchPaper(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
            children: [
              _TopBannerSlot(onPressed: _openFeedback),
              const SizedBox(height: 14),
              _BpmBoard(
                bpm: state.bpm,
                beat: controller.visibleBeat + 1,
                meter: state.meter,
                isPlaying: controller.isPlaying,
                isAccentBeat: controller.isPlaying &&
                    controller.visibleBeat == 0 &&
                    state.accentFirstBeat,
                onTempoMarkingPressed: _openTempoMarkings,
              ),
              const SizedBox(height: 12),
              _TransportButton(
                isPlaying: controller.isPlaying,
                onPressed: controller.toggle,
              ),
              const SizedBox(height: 14),
              _TempoControls(
                bpm: state.bpm,
                isTapTempoOpen: _isTapTempoOpen,
                onStep: controller.stepBpm,
                onChanged: controller.setBpm,
                onTapTempo: controller.tapTempo,
                onToggleTapTempo: () {
                  setState(() {
                    _isTapTempoOpen = !_isTapTempoOpen;
                  });
                },
              ),
              const SizedBox(height: 12),
              _MeterControls(
                meter: state.meter,
                isMeterEditorOpen: _isMeterEditorOpen,
                accentFirstBeat: state.accentFirstBeat,
                onMeterChanged: controller.setMeter,
                onAccentChanged: controller.setAccentFirstBeat,
                onToggleMeterEditor: () {
                  setState(() {
                    _isMeterEditorOpen = !_isMeterEditorOpen;
                  });
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBannerSlot extends StatelessWidget {
  const _TopBannerSlot({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'in C Click에 필요한 기능 제안하기',
      onTap: onPressed,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: _SketchPanel(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Click에 필요한 기능이 있나요?',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        height: 1.35,
                      ),
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                '기능 제안',
                style: TextStyle(
                  color: Color(0xff9f463d),
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

class _BpmBoard extends StatelessWidget {
  const _BpmBoard({
    required this.bpm,
    required this.beat,
    required this.meter,
    required this.isPlaying,
    required this.isAccentBeat,
    required this.onTempoMarkingPressed,
  });

  final int bpm;
  final int beat;
  final int meter;
  final bool isPlaying;
  final bool isAccentBeat;
  final VoidCallback onTempoMarkingPressed;

  @override
  Widget build(BuildContext context) {
    final marking = tempoMarkingForBpm(bpm);

    return _SketchPanel(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '현재 빠르기',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: const Color(0xff66615a),
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Semantics(
                  label: '현재 빠르기 $bpm BPM',
                  child: Text(
                    '$bpm',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                          color: const Color(0xff282724),
                          fontSize: 96,
                          fontWeight: FontWeight.w900,
                          height: 0.9,
                        ),
                  ),
                ),
                Text(
                  'BPM',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: const Color(0xff66615a),
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.6,
                      ),
                ),
                const SizedBox(height: 10),
                _TempoMarkingChip(
                  marking: marking,
                  onPressed: onTempoMarkingPressed,
                ),
              ],
            ),
          ),
          Column(
            children: [
              _SketchPulse(
                size: 82,
                hatchColor: isAccentBeat
                    ? const Color(0x88b43d2f)
                    : const Color(0x774f8f6b),
              ),
              const SizedBox(height: 12),
              Text(
                '$beat / $meter',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: const Color(0xff66615a),
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SketchPaper extends StatelessWidget {
  const _SketchPaper({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xfffffefa),
      child: child,
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

class _TempoControls extends StatelessWidget {
  const _TempoControls({
    required this.bpm,
    required this.isTapTempoOpen,
    required this.onStep,
    required this.onChanged,
    required this.onTapTempo,
    required this.onToggleTapTempo,
  });

  final int bpm;
  final bool isTapTempoOpen;
  final ValueChanged<int> onStep;
  final ValueChanged<int> onChanged;
  final VoidCallback onTapTempo;
  final VoidCallback onToggleTapTempo;

  @override
  Widget build(BuildContext context) {
    return _SketchPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '빠르기',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _SquareButton(
                  label: '-',
                  semanticLabel: 'BPM 1 낮추기',
                  onPressed: () => onStep(-1)),
              const SizedBox(width: 10),
              Expanded(
                child: Semantics(
                  label: 'BPM 슬라이더',
                  child: Slider(
                    min: MetronomeState.minBpm.toDouble(),
                    max: MetronomeState.maxBpm.toDouble(),
                    divisions: MetronomeState.maxBpm - MetronomeState.minBpm,
                    value: bpm.toDouble(),
                    onChanged: (value) => onChanged(value.round()),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              _SquareButton(
                  label: '+',
                  semanticLabel: 'BPM 1 높이기',
                  onPressed: () => onStep(1)),
            ],
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
              onPressed: onToggleTapTempo,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xff5f312d),
                side: const BorderSide(color: Color(0xff9a8f86), width: 1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(isTapTempoOpen ? '탭 BPM 닫기' : '탭 BPM 열기'),
            ),
          ),
          if (isTapTempoOpen) ...[
            const SizedBox(height: 10),
            Text(
              '탭하면 현재 BPM이 바로 바뀝니다.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xff66615a),
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: onTapTempo,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(54),
                backgroundColor: const Color(0xffffffff),
                foregroundColor: const Color(0xff5f312d),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(
                    color: Color(0xff282724),
                    width: 1.1,
                  ),
                ),
              ),
              child: const CustomPaint(
                foregroundPainter: _ButtonHatchPainter(
                  color: Color(0x33b43d2f),
                ),
                child: SizedBox(
                  height: 54,
                  child: Center(child: Text('탭해서 BPM 맞추기')),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TempoMarkingChip extends StatelessWidget {
  const _TempoMarkingChip({
    required this.marking,
    required this.onPressed,
  });

  final TempoMarking marking;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '빠르기말 ${marking.displayName}, ${marking.rangeLabel} BPM',
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xff282724),
          side: const BorderSide(color: Color(0xff9a8f86), width: 1),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: Text(
          '${marking.name} · ${marking.rangeLabel}',
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
    );
  }
}

class _MeterControls extends StatelessWidget {
  const _MeterControls({
    required this.meter,
    required this.isMeterEditorOpen,
    required this.accentFirstBeat,
    required this.onMeterChanged,
    required this.onAccentChanged,
    required this.onToggleMeterEditor,
  });

  final int meter;
  final bool isMeterEditorOpen;
  final bool accentFirstBeat;
  final ValueChanged<int> onMeterChanged;
  final ValueChanged<bool> onAccentChanged;
  final VoidCallback onToggleMeterEditor;

  @override
  Widget build(BuildContext context) {
    return _SketchPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '박자',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  '현재 박자 ${_meterLabel(meter)}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              OutlinedButton(
                onPressed: onToggleMeterEditor,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xff5f312d),
                  side: const BorderSide(color: Color(0xff9a8f86), width: 1),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(isMeterEditorOpen ? '닫기' : '박자 변경'),
              ),
            ],
          ),
          if (isMeterEditorOpen) ...[
            const SizedBox(height: 10),
            Text(
              '바꾸면 첫 박부터 다시 시작합니다.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xff66615a),
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 2, label: Text('2/4')),
                ButtonSegment(value: 3, label: Text('3/4')),
                ButtonSegment(value: 4, label: Text('4/4')),
                ButtonSegment(value: 6, label: Text('6/8')),
              ],
              selected: {meter},
              onSelectionChanged: (selection) =>
                  onMeterChanged(selection.first),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  '첫 박 강조',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              _SketchToggle(
                value: accentFirstBeat,
                onChanged: onAccentChanged,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TransportButton extends StatelessWidget {
  const _TransportButton({
    required this.isPlaying,
    required this.onPressed,
  });

  final bool isPlaying;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: isPlaying ? '메트로놈 정지' : '메트로놈 시작',
      onTap: onPressed,
      child: _SketchActionButton(
        onPressed: onPressed,
        child: Text(
          isPlaying ? '정지' : '시작',
          style: const TextStyle(
            color: Color(0xfffffdf7),
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _SketchPulse extends StatelessWidget {
  const _SketchPulse({
    required this.size,
    required this.hatchColor,
  });

  final double size;
  final Color hatchColor;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _HatchedCirclePainter(hatchColor: hatchColor),
      child: SizedBox(width: size, height: size),
    );
  }
}

class _HatchedCirclePainter extends CustomPainter {
  const _HatchedCirclePainter({required this.hatchColor});

  final Color hatchColor;

  @override
  void paint(Canvas canvas, Size size) {
    final oval = Rect.fromLTWH(0, 0, size.width, size.height);
    final clip = Path()..addOval(oval);

    canvas.save();
    canvas.clipPath(clip);
    _drawHatch(
      canvas,
      size,
      Paint()
        ..color = hatchColor
        ..strokeWidth = 1.4
        ..strokeCap = StrokeCap.round,
      spacing: 12,
      skew: 0.78,
    );
    canvas.restore();

    final outer = Paint()
      ..color = const Color(0xdd282724)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.35;
    final inner = Paint()
      ..color = const Color(0x77282724)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9;
    canvas.drawOval(oval.deflate(1), outer);
    canvas.drawOval(
      Rect.fromLTWH(4.5, 5.0, size.width - 9, size.height - 10),
      inner,
    );
  }

  @override
  bool shouldRepaint(covariant _HatchedCirclePainter oldDelegate) {
    return oldDelegate.hatchColor != hatchColor;
  }
}

class _SketchActionButton extends StatelessWidget {
  const _SketchActionButton({
    required this.onPressed,
    required this.child,
  });

  final VoidCallback onPressed;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 66,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onPressed,
          child: CustomPaint(
            painter: const _HatchedRoundRectPainter(
              fillColor: Color(0xffb43d2f),
              hatchColor: Color(0x00000000),
              borderColor: Color(0xff7f2c24),
            ),
            foregroundPainter: const _SketchRoundRectBorderPainter(
              color: Color(0xbb282724),
            ),
            child: Center(child: child),
          ),
        ),
      ),
    );
  }
}

class _SketchToggle extends StatelessWidget {
  const _SketchToggle({
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      toggled: value,
      label: '첫 박 강조',
      onTap: () => onChanged(!value),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onChanged(!value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 130),
          curve: Curves.easeOut,
          width: 76,
          height: 44,
          padding: const EdgeInsets.all(3),
          child: CustomPaint(
            painter: _SketchTogglePainter(isOn: value),
          ),
        ),
      ),
    );
  }
}

class _SketchTogglePainter extends CustomPainter {
  const _SketchTogglePainter({required this.isOn});

  final bool isOn;

  @override
  void paint(Canvas canvas, Size size) {
    final track = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 3, size.width, size.height - 6),
      const Radius.circular(22),
    );
    final trackPath = Path()..addRRect(track);

    canvas.drawRRect(track, Paint()..color = const Color(0xffffffff));

    if (isOn) {
      canvas.save();
      canvas.clipPath(trackPath);
      _drawHatch(
        canvas,
        size,
        Paint()
          ..color = const Color(0x9985cbff)
          ..strokeWidth = 1.45
          ..strokeCap = StrokeCap.round,
        spacing: 11,
        skew: 0.72,
      );
      canvas.restore();
    }

    final borderPaint = Paint()
      ..color = const Color(0xdd282724)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.15;
    final secondBorderPaint = Paint()
      ..color = const Color(0x66282724)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;
    canvas.drawRRect(track.deflate(0.7), borderPaint);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(3.5, 6, size.width - 7, size.height - 12),
        const Radius.circular(18),
      ),
      secondBorderPaint,
    );

    final knobSize = 36.0;
    final knobLeft = isOn ? size.width - knobSize : 0.0;
    final knobRect = Rect.fromLTWH(knobLeft, 4, knobSize, knobSize);
    final knobPaint = Paint()..color = const Color(0xffffffff);
    canvas.drawOval(knobRect, knobPaint);
    canvas.drawOval(
      knobRect.deflate(0.8),
      Paint()
        ..color = const Color(0xdd282724)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );
    canvas.drawOval(
      Rect.fromLTWH(knobLeft + 3.5, 7.5, knobSize - 7, knobSize - 7),
      Paint()
        ..color = const Color(0x55282724)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.75,
    );
  }

  @override
  bool shouldRepaint(covariant _SketchTogglePainter oldDelegate) {
    return oldDelegate.isOn != isOn;
  }
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

class _ButtonHatchPainter extends CustomPainter {
  const _ButtonHatchPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        const Radius.circular(8),
      ),
    );
    _drawHatch(
      canvas,
      size,
      Paint()
        ..color = color
        ..strokeWidth = 1
        ..strokeCap = StrokeCap.round,
      spacing: 17,
      skew: 0.55,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _ButtonHatchPainter oldDelegate) {
    return oldDelegate.color != color;
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
      ..strokeWidth = 0.85;

    _drawLooseRect(canvas, size, paint, const Offset(0, 0));
    _drawLooseRect(
      canvas,
      Size(size.width - 8, size.height - 8),
      secondPaint,
      const Offset(4, 4),
    );
  }

  void _drawLooseRect(Canvas canvas, Size size, Paint paint, Offset offset) {
    final left = offset.dx + 0.8;
    final top = offset.dy + 0.7;
    final right = offset.dx + size.width - 0.8;
    final bottom = offset.dy + size.height - 0.8;
    final radius = 8.0;

    final path = Path()
      ..moveTo(left + radius, top)
      ..quadraticBezierTo(size.width * 0.42, top - 0.5, right - radius, top)
      ..quadraticBezierTo(right, top, right, top + radius)
      ..quadraticBezierTo(
          right - 0.3, size.height * 0.55, right, bottom - radius)
      ..quadraticBezierTo(right, bottom, right - radius, bottom)
      ..quadraticBezierTo(
          size.width * 0.58, bottom + 0.4, left + radius, bottom)
      ..quadraticBezierTo(left, bottom, left, bottom - radius)
      ..quadraticBezierTo(left + 0.2, size.height * 0.44, left, top + radius)
      ..quadraticBezierTo(left, top, left + radius, top);

    canvas.drawPath(path, paint);
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
  var line = -size.height;
  var index = 0;
  while (line < size.width + size.height) {
    final wobbleA = switch (index % 4) {
      0 => -1.4,
      1 => 0.6,
      2 => 1.2,
      _ => -0.3,
    };
    final wobbleB = switch (index % 5) {
      0 => 1.1,
      1 => -0.8,
      2 => 0.4,
      3 => -1.2,
      _ => 0.2,
    };
    final start = Offset(line + wobbleA, size.height + wobbleB);
    final end = Offset(line + (size.height * skew) + wobbleB, wobbleA);
    canvas.drawLine(start, end, paint);
    line += spacing + (index.isEven ? 1.5 : -0.7);
    index += 1;
  }
}

String _meterLabel(int meter) {
  return meter == 6 ? '6/8' : '$meter/4';
}

class _SketchPanel extends StatelessWidget {
  const _SketchPanel({
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        boxShadow: [
          BoxShadow(color: Color(0x33e6dcc8), offset: Offset(4, 5)),
        ],
      ),
      child: CustomPaint(
        foregroundPainter: const _SketchBorderPainter(),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: const Color(0xffffffff),
            border: Border.all(color: const Color(0x33282724), width: 1),
            borderRadius: BorderRadius.circular(9),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _SquareButton extends StatelessWidget {
  const _SquareButton({
    required this.label,
    required this.semanticLabel,
    required this.onPressed,
  });

  final String label;
  final String semanticLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      button: true,
      child: SizedBox(
        width: 54,
        height: 54,
        child: OutlinedButton(
          onPressed: onPressed,
          style: OutlinedButton.styleFrom(
            padding: EdgeInsets.zero,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            side: const BorderSide(color: Color(0xff282724), width: 1.1),
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
          ),
        ),
      ),
    );
  }
}
