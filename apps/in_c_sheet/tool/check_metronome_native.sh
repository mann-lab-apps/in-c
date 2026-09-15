#!/usr/bin/env bash
set -euo pipefail

# Use an installed Kotlin compiler classpath and Android SDK, without Gradle/app builds.
: "${ANDROID_JAR:?Set ANDROID_JAR to an installed platform android.jar}"
: "${KOTLIN_COMPILER_CP:?Set KOTLIN_COMPILER_CP to compiler/runtime dependency jars}"
cd "$(dirname "$0")/.."
out="$(mktemp -d "${TMPDIR:-/tmp}/clef-native-check.XXXXXX")"
trap 'rm -rf "$out"' EXIT
"${JAVA:-java}" -cp "$KOTLIN_COMPILER_CP" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-stdlib -no-reflect -classpath "$ANDROID_JAR:$KOTLIN_COMPILER_CP" \
  -d "$out/check.jar" \
  android/app/src/main/kotlin/com/mannlab/clef/ClefMetronomePlayer.kt \
  tool/MetronomeNativeCheck.kt
"${JAVA:-java}" -cp "$out/check.jar:$ANDROID_JAR:$KOTLIN_COMPILER_CP" \
  com.mannlab.clef.MetronomeNativeCheckKt
