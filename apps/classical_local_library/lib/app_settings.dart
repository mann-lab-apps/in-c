import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'local_data_control.dart';
import 'library_backup.dart';
import 'library_backup_io.dart';

const appVersionLabel = String.fromEnvironment(
  'APP_VERSION_LABEL',
  defaultValue: '0.1.0 (1)',
);
const privacyPolicyUrl = String.fromEnvironment('PRIVACY_POLICY_URL');
const supportUrl = String.fromEnvironment('SUPPORT_URL');

Uri? parsePublicHttpsUrl(String value) {
  final uri = Uri.tryParse(value.trim());
  if (uri == null ||
      uri.scheme != 'https' ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty) {
    return null;
  }
  return uri;
}

class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({
    super.key,
    required this.dataControl,
    required this.onResetComplete,
    this.onBeforeReset,
    this.backupService,
    this.backupTransport,
    this.onBackupImported,
  });

  final LocalDataControlService dataControl;
  final Future<void> Function() onResetComplete;
  final Future<void> Function()? onBeforeReset;
  final LibraryBackupService? backupService;
  final LibraryBackupTransport? backupTransport;
  final Future<void> Function()? onBackupImported;

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  LocalDataSummary? summary;
  bool isResetting = false;
  bool isBackingUp = false;
  String? status;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    try {
      final next = await widget.dataControl.summary();
      if (mounted) setState(() => summary = next);
    } catch (_) {
      if (mounted) setState(() => status = '저장 공간 정보를 불러오지 못했습니다.');
    }
  }

  Future<void> _openConfiguredUrl(String value) async {
    try {
      final uri = parsePublicHttpsUrl(value);
      if (uri != null &&
          await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        return;
      }
    } catch (_) {
      // Platform failures use the same path-free user-facing message.
    }
    if (mounted) setState(() => status = '설정된 링크를 열지 못했습니다.');
  }

  Future<void> _confirmReset() async {
    var confirmation = '';
    final confirmed = await showDdiroriDialog<bool>(
      context: context,
      title: '전체 로컬 데이터 초기화',
      child: StatefulBuilder(
        builder: (context, setDialogState) => Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '앱 관리 음원 복사본, 카탈로그, 파일 연결과 감상 기록을 삭제합니다. '
              '파일 선택기나 음악 폴더의 외부 원본은 삭제하지 않습니다.',
            ),
            const SizedBox(height: 16),
            DdiroriInput(
              value: confirmation,
              label: '확인하려면 초기화 입력',
              onChanged: (value) => setDialogState(() => confirmation = value),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                DdiroriButton(
                  label: '취소',
                  kind: DdiroriButtonKind.quiet,
                  onPressed: () => Navigator.pop(context, false),
                ),
                const SizedBox(width: 8),
                DdiroriButton(
                  label: '모두 삭제',
                  kind: DdiroriButtonKind.danger,
                  onPressed: confirmation.trim() == '초기화'
                      ? () => Navigator.pop(context, true)
                      : null,
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      isResetting = true;
      status = '로컬 데이터를 초기화하는 중입니다.';
    });
    try {
      await widget.onBeforeReset?.call();
      await widget.dataControl.reset();
      await widget.onResetComplete();
      if (!mounted) return;
      setState(() {
        summary = const LocalDataSummary(managedFileCount: 0, managedBytes: 0);
        status = '로컬 데이터를 초기화했습니다.';
      });
    } on LocalDataResetException catch (error) {
      if (mounted) setState(() => status = error.message);
    } catch (_) {
      if (mounted) {
        setState(() => status = '로컬 데이터를 초기화하지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => isResetting = false);
    }
  }

  Future<void> _exportBackup(Rect? sharePositionOrigin) async {
    final service = widget.backupService;
    final transport = widget.backupTransport;
    if (service == null || transport == null || isBackingUp) return;
    setState(() {
      isBackingUp = true;
      status = '라이브러리 백업을 준비하는 중입니다.';
    });
    try {
      final source = await service.exportJson();
      final result = await transport.export(
        source,
        sharePositionOrigin: sharePositionOrigin,
      );
      if (mounted) setState(() => status = result.userMessage);
    } catch (_) {
      if (mounted) setState(() => status = '백업을 내보내지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => isBackingUp = false);
    }
  }

  Future<void> _importBackup() async {
    final service = widget.backupService;
    final transport = widget.backupTransport;
    if (service == null || transport == null || isBackingUp) return;
    setState(() {
      isBackingUp = true;
      status = '백업 파일을 확인하는 중입니다.';
    });
    try {
      final source = await transport.pickImport();
      if (source == null) {
        if (mounted) setState(() => status = '백업 가져오기를 취소했습니다.');
        return;
      }
      final preview = await service.previewImport(source);
      if (!preview.canImport) {
        if (mounted) {
          setState(
            () => status = '기존 데이터와 충돌하는 항목 ${preview.conflicts}개를 확인해 주세요.',
          );
        }
        return;
      }
      if (!mounted) return;
      final confirmed = await showDdiroriDialog<bool>(
        context: context,
        title: '라이브러리 백업 가져오기',
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '추가 ${preview.added}개 · 갱신 ${preview.merged}개 · '
              '동일 ${preview.skipped}개',
            ),
            const SizedBox(height: 8),
            const Text(
              '음원 파일과 원래 폴더 위치는 백업에 포함되지 않습니다. '
              '가져온 파일 연결은 재생 전에 다시 확인해야 합니다.',
            ),
            const SizedBox(height: 16),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              runSpacing: 8,
              children: [
                DdiroriButton(
                  label: '취소',
                  kind: DdiroriButtonKind.quiet,
                  onPressed: () => Navigator.pop(context, false),
                ),
                DdiroriButton(
                  label: '가져오기',
                  icon: Icons.settings_backup_restore,
                  onPressed: () => Navigator.pop(context, true),
                ),
              ],
            ),
          ],
        ),
      );
      if (confirmed != true) {
        if (mounted) setState(() => status = '백업 가져오기를 취소했습니다.');
        return;
      }
      final result = await service.importJson(source);
      await widget.onBackupImported?.call();
      if (mounted) {
        setState(() {
          status = '백업을 가져왔습니다. 추가 ${result.added}개 · 갱신 ${result.merged}개';
        });
        await _loadSummary();
      }
    } on LibraryBackupException catch (error) {
      if (mounted) setState(() => status = error.message);
    } on FormatException {
      if (mounted) setState(() => status = '백업 파일을 읽지 못했습니다.');
    } catch (_) {
      if (mounted) setState(() => status = '백업을 가져오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => isBackingUp = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final storage = summary;
    final privacyUri = parsePublicHttpsUrl(privacyPolicyUrl);
    final supportUri = parsePublicHttpsUrl(supportUrl);
    return Scaffold(
      appBar: AppBar(title: const Text('앱 정보 및 데이터')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          const DdiroriItem(
            leading: Icon(Icons.info_outline),
            title: '띠로리 플레이',
            subtitle: '내부 베타 · 버전 $appVersionLabel',
          ),
          if (widget.backupService != null &&
              widget.backupTransport != null) ...[
            const Divider(),
            DdiroriSettingsRow(
              title: '라이브러리 백업',
              description:
                  '카탈로그, 교정, 파일 연결과 감상 기록을 JSON으로 보관합니다. '
                  '음원과 원래 폴더 위치는 포함하지 않습니다.',
              control: Builder(
                builder: (context) => Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    DdiroriButton(
                      label: '내보내기',
                      icon: Icons.ios_share_outlined,
                      busy: isBackingUp,
                      onPressed: isBackingUp
                          ? null
                          : () {
                              final box =
                                  context.findRenderObject() as RenderBox?;
                              final origin = box == null
                                  ? null
                                  : box.localToGlobal(Offset.zero) & box.size;
                              return _exportBackup(origin);
                            },
                    ),
                    DdiroriButton(
                      label: '가져오기',
                      icon: Icons.settings_backup_restore,
                      kind: DdiroriButtonKind.quiet,
                      onPressed: isBackingUp ? null : _importBackup,
                    ),
                  ],
                ),
              ),
            ),
          ],
          DdiroriItem(
            leading: const Icon(Icons.storage_outlined),
            title: '앱 관리 음원',
            subtitle: storage == null
                ? '용량 계산 중'
                : '${storage.managedFileCount}개 · ${_formatBytes(storage.managedBytes)}',
          ),
          const Divider(),
          const DdiroriItem(
            leading: Icon(Icons.shield_outlined),
            title: '로컬 데이터와 개인정보',
            subtitle:
                '음원, 파일 경로, 카탈로그와 감상 기록은 기기에 저장됩니다. '
                '분석, 광고, 계정 또는 자체 클라우드 업로드를 사용하지 않습니다.',
          ),
          const DdiroriItem(
            leading: Icon(Icons.public_outlined),
            title: '외부 서비스',
            subtitle:
                'MusicBrainz에는 사용자가 선택한 검색어와 식별자만 전송하며, '
                'IMSLP에는 자료 검색과 다운로드 요청만 보냅니다. 로컬 전체 경로는 전송하지 않습니다. '
                'AcoustID 지문 조회는 현재 비활성 상태입니다.',
          ),
          DdiroriItem(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: '개인정보 처리 안내',
            subtitle: privacyUri == null
                ? '공개 HTTPS URL 준비 중'
                : privacyUri.toString(),
            onTap: privacyUri == null
                ? null
                : () => _openConfiguredUrl(privacyUri.toString()),
          ),
          DdiroriItem(
            leading: const Icon(Icons.support_agent_outlined),
            title: '지원',
            subtitle: supportUri == null
                ? '공개 HTTPS URL 준비 중'
                : supportUri.toString(),
            onTap: supportUri == null
                ? null
                : () => _openConfiguredUrl(supportUri.toString()),
          ),
          DdiroriItem(
            leading: const Icon(Icons.description_outlined),
            title: '오픈소스 라이선스',
            onTap: () => showLicensePage(
              context: context,
              applicationName: '띠로리 플레이',
              applicationVersion: appVersionLabel,
            ),
          ),
          const Divider(),
          DdiroriSettingsRow(
            title: '전체 로컬 데이터 초기화',
            description: '외부 원본은 유지하고 앱 내부 복사본과 메타데이터를 삭제합니다.',
            control: DdiroriButton(
              label: '초기화',
              icon: Icons.delete_forever_outlined,
              kind: DdiroriButtonKind.danger,
              busy: isResetting,
              onPressed: isResetting ? null : _confirmReset,
            ),
          ),
          if (status != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: DdiroriBanner(
                message: status!,
                kind: status!.contains('못') || status!.contains('실패')
                    ? DdiroriNoticeKind.error
                    : DdiroriNoticeKind.info,
              ),
            ),
        ],
      ),
    );
  }
}

String _formatBytes(int bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
  if (bytes >= 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  return '$bytes B';
}
