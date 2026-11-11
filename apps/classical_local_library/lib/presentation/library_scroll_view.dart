part of '../main.dart';

/// Sections render in a single viewport, including editable playlist rows.
abstract interface class _LibrarySliver {}

Widget _librarySliver(Widget child) =>
    child is _LibrarySliver ? child : SliverToBoxAdapter(child: child);

class _LibraryScrollView extends StatelessWidget {
  const _LibraryScrollView({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.all(16),
  });
  final List<Widget> children;
  final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => CustomScrollView(
    slivers: [
      SliverPadding(
        padding: padding,
        sliver: SliverMainAxisGroup(
          slivers: children.map(_librarySliver).toList(),
        ),
      ),
    ],
  );
}

class _LazyLibraryRows extends StatelessWidget implements _LibrarySliver {
  const _LazyLibraryRows({required this.keys, required this.builder});
  final List<String> keys;
  final Widget Function(BuildContext, int) builder;
  @override
  Widget build(BuildContext context) {
    final indices = {
      for (var i = 0; i < keys.length; i++) 'lazy:${keys[i]}': i,
    };
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) => KeyedSubtree(
          key: ValueKey('lazy:${keys[index]}'),
          child: builder(context, index),
        ),
        childCount: keys.length,
        findChildIndexCallback: (key) =>
            key is ValueKey<String> ? indices[key.value] : null,
      ),
    );
  }
}
