import 'package:flutter/foundation.dart';

import 'sheet_library_store.dart';
import 'sheet_score.dart';

class SheetLibraryController extends ChangeNotifier {
  SheetLibraryController({required this.store});

  final SheetLibraryStore store;

  List<SheetScore> _scores = const <SheetScore>[];
  String _query = '';
  bool _isLoading = true;
  bool _isImporting = false;
  String? _errorMessage;

  List<SheetScore> get scores => _scores;
  String get query => _query;
  bool get isLoading => _isLoading;
  bool get isImporting => _isImporting;
  String? get errorMessage => _errorMessage;

  List<SheetScore> get filteredScores {
    return _scores
        .where((score) => score.matches(_query))
        .toList(growable: false);
  }

  Future<void> load() async {
    _setLoading(true);
    try {
      _scores = await store.loadScores();
      _errorMessage = null;
    } catch (error) {
      _errorMessage = '라이브러리를 불러오지 못했습니다.';
    } finally {
      _setLoading(false);
    }
  }

  Future<SheetScore?> importPdf() async {
    if (_isImporting) {
      return null;
    }

    _isImporting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final score = await store.importPdf();
      if (score == null) {
        return null;
      }

      _scores = <SheetScore>[score, ..._scores];
      await store.saveScores(_scores);
      return score;
    } catch (error) {
      _errorMessage = 'PDF를 가져오지 못했습니다.';
      return null;
    } finally {
      _isImporting = false;
      notifyListeners();
    }
  }

  Future<void> markOpened(SheetScore score) async {
    await _replace(score.copyWith(lastOpenedAt: DateTime.now()));
  }

  Future<void> updateLastPage(SheetScore score, int pageNumber) async {
    if (pageNumber < 1 || score.lastPage == pageNumber) {
      return;
    }

    await _replace(
      score.copyWith(
        lastPage: pageNumber,
        lastOpenedAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> toggleFavorite(SheetScore score) async {
    await _replace(
      score.copyWith(isFavorite: !score.isFavorite, updatedAt: DateTime.now()),
    );
  }

  void updateQuery(String value) {
    _query = value;
    notifyListeners();
  }

  SheetScore scoreById(String id) {
    return _scores.firstWhere((score) => score.id == id);
  }

  Future<void> _replace(SheetScore updated) async {
    _scores = _scores
        .map((score) => score.id == updated.id ? updated : score)
        .toList(growable: false);
    await store.saveScores(_scores);
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
