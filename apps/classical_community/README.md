# in C Community

Separate Flutter app prototype for a classical music community surface.

This app is intentionally split from `apps/in_c_sheet` and the classical
discovery prototype. It focuses on:

- a community feed for listening notes, questions, and post-concert reflections
- work rooms where people gather around a specific piece
- sponsored concert cards that stay clearly labeled as ads
- local-only post creation for the first prototype slice

## Commands

```sh
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
flutter build ios --debug --no-codesign
```

The intended application id is `com.mannlab.inc.classical_community`.
