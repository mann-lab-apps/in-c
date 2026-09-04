import 'package:flutter/material.dart';

import 'classical_discovery_controller.dart';
import 'classical_discovery_screen.dart';
import 'classical_discovery_store.dart';

class ClassicalDiscoveryApp extends StatefulWidget {
  const ClassicalDiscoveryApp({super.key, this.controller});

  final ClassicalDiscoveryController? controller;

  @override
  State<ClassicalDiscoveryApp> createState() => _ClassicalDiscoveryAppState();
}

class _ClassicalDiscoveryAppState extends State<ClassicalDiscoveryApp> {
  late final ClassicalDiscoveryController _controller =
      widget.controller ??
      ClassicalDiscoveryController(store: ClassicalDiscoveryStore());
  late final Future<void> _load = _controller.isLoading
      ? _controller.load()
      : Future<void>.value();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'in C',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff2f6f73),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xfffbfbf7),
        useMaterial3: true,
      ),
      home: FutureBuilder<void>(
        future: _load,
        builder: (context, snapshot) {
          return ClassicalDiscoveryAppShell(controller: _controller);
        },
      ),
    );
  }
}

class ClassicalDiscoveryAppShell extends StatelessWidget {
  const ClassicalDiscoveryAppShell({required this.controller, super.key});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    return ClassicalDiscoveryScreen(controller: controller);
  }
}
