import 'dart:math';

enum LocalRepeatMode {
  off(label: '반복 끔'),
  all(label: '전체 반복'),
  one(label: '한 곡 반복');

  const LocalRepeatMode({required this.label});
  final String label;
  LocalRepeatMode get next => values[(index + 1) % values.length];
}

/// Effective queue index -> original occurrence index, not a file/track ID.
class PlaybackOrder {
  PlaybackOrder(Iterable<int> indices) : indices = List.unmodifiable(indices) {
    inverse = List.filled(this.indices.length, 0);
    if (!valid(this.indices, this.indices.length)) {
      throw const FormatException('잘못된 재생 순서입니다.');
    }
    for (var i = 0; i < this.indices.length; i++) {
      inverse[this.indices[i]] = i;
    }
  }
  factory PlaybackOrder.identity(int length) =>
      PlaybackOrder(List.generate(length, (i) => i));
  final List<int> indices;
  late final List<int> inverse;

  static bool valid(List<int> order, int length) =>
      order.length == length &&
      order.toSet().length == length &&
      order.every((i) => i >= 0 && i < length);

  PlaybackOrder shuffled(int currentIndex, Random random) {
    if (indices.isEmpty) return this;
    final end = currentIndex.clamp(0, indices.length - 1) + 1;
    final remaining = indices.sublist(end)..shuffle(random);
    return PlaybackOrder([...indices.take(end), ...remaining]);
  }

  /// New occurrences append to canonical order while occupying an explicit
  /// effective position. Disabling shuffle therefore retains original order.
  PlaybackOrder inserting(int effectiveIndex, int count) {
    final next = indices.toList();
    next.insertAll(
      effectiveIndex,
      List.generate(count, (i) => indices.length + i),
    );
    return PlaybackOrder(next);
  }

  PlaybackOrder removing(Set<int> canonicalIndices) => PlaybackOrder([
    for (final index in indices)
      if (!canonicalIndices.contains(index))
        index - canonicalIndices.where((removed) => removed < index).length,
  ]);

  /// [to] is the final effective index, after removal (not a drag gap index).
  PlaybackOrder moving(int from, int to) {
    final next = indices.toList();
    next.insert(to, next.removeAt(from));
    return PlaybackOrder(next);
  }
}
