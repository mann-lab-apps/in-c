require 'minitest/autorun'
require 'tmpdir'
require_relative '../lib/release'

class FakePipeline < Deployment::Pipeline
  attr_accessor :dirty, :actual_commit, :candidate, :baseline
  def capture(*args, **kwargs)
    return actual_commit || manifest['source_commit'] if args[0, 2] == %w[git rev-parse]
    return dirty ? ' M app/file' : '' if args[0, 2] == %w[git status]
    super
  end

  def inspect_artifact(path)
    info = File.basename(path).start_with?('baseline') ? baseline : candidate
    info.merge('path' => File.realpath(path))
  end

  def external_credential(_name) = '/external/test-credential.json'
end

class AndroidFakePipeline < FakePipeline
  def perform_preflight
    record['preflight'] = 'passed'
  end
end

class ReleaseTest < Minitest::Test
  def setup
    @temp = Dir.mktmpdir('in-c-deployment-test-')
    @data = JSON.parse(File.read(File.join(Deployment::ROOT, 'apps/clef/release.json')))
    @data['app'] = 'fixture'
    @manifest_dir = File.join(@temp, 'manifest')
    FileUtils.cp_r(File.join(Deployment::ROOT, 'apps/clef'), @manifest_dir)
    @manifest = File.join(@manifest_dir, 'release.json')
    @app = File.join(@temp, @data['source_path'])
    FileUtils.mkdir_p(File.join(@app, 'ios/Runner.xcodeproj'))
    FileUtils.mkdir_p(File.join(@app, 'lib'))
    File.write(File.join(@app, 'pubspec.yaml'), "version: #{@data['version']}+#{@data['build_number']}\n")
    File.write(File.join(@app, 'lib/main.dart'), "const String _clefAppVersion = '#{@data['version']}+#{@data['build_number']}';")
    File.write(File.join(@app, 'ios/Runner.xcodeproj/project.pbxproj'), "PRODUCT_BUNDLE_IDENTIFIER = #{@data['ios']['bundle_id']};")
    @artifact = File.join(@temp, 'app.ipa')
    @baseline_path = File.join(@temp, 'baseline.ipa')
    File.write(@artifact, 'verified payload')
    File.write(@baseline_path, 'manual payload')
    @data['ios']['baseline_sha256'] = Digest::SHA256.file(@baseline_path).hexdigest
    File.write(File.join(@manifest_dir, 'notes/1.0.2+29.txt'), '검증된 변경 내역')
    @calls = []
    write_manifest
    @pipeline = pipeline
    @pipeline.candidate = {
      'platform' => 'ios', 'identifier' => @data['ios']['bundle_id'], 'version' => @data['version'],
      'build_number' => @data['build_number'], 'display_name' => @data['display_name'],
      'team_id' => @data['ios']['team_id'], 'profile' => @data['ios']['profile'], 'debuggable' => false,
      'sha256' => Digest::SHA256.file(@artifact).hexdigest
    }
    @pipeline.baseline = @pipeline.candidate.merge('sha256' => @data['ios']['baseline_sha256'])
    write_build_evidence
    @approval = File.join(@temp, 'approval.json')
    write_approval
  end

  def teardown
    FileUtils.rm_rf(@temp)
    FileUtils.rm_rf(@pipeline.output) if @pipeline&.output
  end

  def write_manifest
    File.write(@manifest, JSON.pretty_generate(@data))
  end

  def pipeline(extra = {})
    FakePipeline.new({ 'manifest' => @manifest, 'source_root' => @temp, 'artifact' => @artifact,
                       'baseline' => @baseline_path, 'approval' => File.join(@temp, 'approval.json') }.merge(extra),
                     actions: ->(name, **args) { @calls << [name, args] }, output_root: File.join(@temp, 'output'))
  end

  def write_build_evidence
    File.write(File.join(@temp, 'result.json'), JSON.generate({
      'action' => 'export', 'status' => 'passed', 'manifest_sha256' => @pipeline.manifest.digest,
      'source_commit' => @data['source_commit'], 'artifact' => @pipeline.candidate
    }))
  end

  def write_approval(changes = {})
    File.write(@approval, JSON.generate({
      'app' => 'fixture', 'channel' => 'testflight', 'version' => '1.0.2+29',
      'artifact_sha256' => @pipeline.candidate['sha256'], 'manifest_sha256' => @pipeline.manifest.digest,
      'metadata_sha256' => @pipeline.metadata_digest, 'source_commit' => @data['source_commit'],
      'approved' => true, 'approved_by' => 'test human', 'expires_at' => (Time.now + 3600).utc.iso8601
    }.merge(changes)))
  end

  def run_action(action)
    capture_io { @pipeline.run(action) }
  end

  def assert_blocked(action)
    assert_raises(Deployment::Error, KeyError, Errno::ENOENT) { run_action(action) }
    assert_empty @calls
  end

  def test_plan_does_not_execute_build_or_upload
    run_action('plan')
    assert_equal 'planned', @pipeline.record['status']
    assert_empty @calls
  end

  def test_current_identity_and_version_pass_preflight
    run_action('preflight')
    assert_equal 'passed', @pipeline.record['status']
  end

  def test_dirty_source_is_blocked
    @pipeline.dirty = true
    assert_blocked('preflight')
    assert_equal 'failed', JSON.parse(File.read(File.join(@pipeline.output, 'result.json')))['status']
  end

  def test_wrong_source_commit_is_blocked
    @pipeline.actual_commit = 'b' * 40
    assert_blocked('preflight')
  end

  def test_wrong_native_identity_is_blocked
    File.write(File.join(@app, 'ios/Runner.xcodeproj/project.pbxproj'), 'PRODUCT_BUNDLE_IDENTIFIER = other.app;')
    assert_blocked('preflight')
  end

  def test_in_app_version_must_match
    File.write(File.join(@app, 'lib/main.dart'), "const String _clefAppVersion = '0.0.0+1';")
    assert_blocked('preflight')
  end

  def test_export_destination_upload_is_blocked
    p = File.join(@manifest_dir, 'ExportOptions.plist')
    File.write(p, File.read(p).sub('<string>export</string>', '<string>upload</string>'))
    assert_blocked('preflight')
  end

  def test_production_actions_and_options_are_rejected
    assert_blocked('production')
    assert_blocked('submit_review')
    assert_raises(Deployment::Error) { pipeline('track' => 'production') }
    assert_raises(Deployment::Error) { pipeline('release_status' => 'completed') }
  end

  def test_secret_or_unknown_manifest_fields_rejected
    @data['api_key'] = 'never allowed'
    write_manifest
    assert_raises(Deployment::Error) { pipeline }
  end

  def test_relative_manifest_is_resolved_from_deployment_root
    real = Deployment::Pipeline.new({ 'manifest' => 'apps/clef/release.json' })
    assert_equal 'clef', real.manifest['app']
  end

  def test_path_escape_is_rejected
    @data['metadata'] = '../../outside'
    write_manifest
    assert_raises(Deployment::Error) { pipeline }
  end

  def test_second_app_joins_with_only_configuration
    @data['app'] = 'second-app'
    @data['display_name'] = 'Second App'
    @data['source_path'] = 'apps/second'
    @data['ios']['bundle_id'] = 'example.second'
    second = File.join(@temp, 'apps/second')
    FileUtils.cp_r(@app, second)
    File.write(File.join(second, 'ios/Runner.xcodeproj/project.pbxproj'), 'PRODUCT_BUNDLE_IDENTIFIER = example.second;')
    plist = File.join(@manifest_dir, 'ExportOptions.plist')
    File.write(plist, File.read(plist).sub('com.mannlab.inc.clefandstaff', 'example.second'))
    write_manifest
    @pipeline = pipeline
    run_action('preflight')
    assert_equal 'passed', @pipeline.record['status']
    run_action('plan')
    assert_equal 'second-app', @pipeline.record['app']
    run_action('metadata')
    assert File.file?(File.join(@pipeline.output, 'metadata/ios/ko/name.txt'))
    assert_empty @calls
  end

  def test_android_missing_signing_cannot_fall_back_to_debug
    FileUtils.mkdir_p(File.join(@app, 'android/app'))
    File.write(File.join(@app, 'android/app/build.gradle.kts'), 'applicationId = "com.mannlab.clef"')
    @pipeline = pipeline('platform' => 'android')
    assert_blocked('preflight')
  end

  def test_comparison_checks_semantics_without_demanding_identical_zip
    run_action('compare')
    assert @pipeline.record['comparison']['passed']
    refute @pipeline.record['comparison']['byte_identical']
  end

  def test_wrong_baseline_hash_is_rejected
    @pipeline.baseline['sha256'] = 'e' * 64
    assert_blocked('compare')
  end

  def test_entitlement_change_is_rejected
    @pipeline.candidate['entitlements'] = { 'new-capability' => true }
    assert_blocked('compare')
  end

  def test_missing_approval_prevents_store_call
    File.delete(@approval)
    assert_blocked('testflight')
  end

  def test_wrong_artifact_hash_prevents_store_call
    write_approval('artifact_sha256' => 'e' * 64)
    assert_blocked('testflight')
  end

  def test_expired_approval_prevents_store_call
    write_approval('expires_at' => (Time.now - 1).utc.iso8601)
    assert_blocked('testflight')
  end

  def test_wrong_channel_prevents_store_call
    write_approval('channel' => 'production')
    assert_blocked('testflight')
  end

  def test_changed_notes_invalidate_approval
    File.write(File.join(@manifest_dir, 'notes/1.0.2+29.txt'), 'different verified notes')
    assert_blocked('testflight')
  end

  def test_draft_notes_prevent_store_call
    File.write(File.join(@manifest_dir, 'notes/1.0.2+29.txt'), '[DRAFT]')
    write_approval
    assert_blocked('testflight')
  end

  def test_imported_artifact_without_build_evidence_cannot_upload
    File.delete(File.join(@temp, 'result.json'))
    assert_blocked('testflight')
  end

  def test_file_changed_after_inspection_is_blocked
    File.write(@artifact, 'tampered payload')
    assert_blocked('testflight')
  end

  def test_testflight_is_upload_only_with_no_external_distribution
    run_action('testflight')
    name, args = @calls.fetch(0)
    assert_equal :upload_to_testflight, name
    assert_equal true, args[:skip_submission]
    assert_equal false, args[:distribute_external]
    assert_equal false, args[:notify_external_testers]
    assert_equal @pipeline.candidate['sha256'], Digest::SHA256.file(args[:ipa]).hexdigest
  end

  def test_failed_upload_retains_attempt_without_serializing_remote_error
    calls = 0
    broken = FakePipeline.new({ 'manifest' => @manifest, 'source_root' => @temp, 'artifact' => @artifact,
      'baseline' => @baseline_path, 'approval' => @approval }, output_root: File.join(@temp, 'output'),
      actions: ->(_name, **_args) { calls += 1; raise StandardError, 'private-token-in-remote-error' })
    broken.candidate = @pipeline.candidate
    broken.baseline = @pipeline.baseline
    @pipeline = broken
    assert_raises(StandardError) { run_action('testflight') }
    text = File.read(File.join(@pipeline.output, 'result.json'))
    evidence = JSON.parse(text)
    assert_equal 1, calls
    assert_equal 'failed', evidence['status']
    assert_equal 'attempted', evidence['store_operation']
    refute_includes text, 'private-token-in-remote-error'
  end

  def test_source_lock_blocks_concurrent_deployment
    lock_id = Digest::SHA256.hexdigest(File.realpath(@temp))
    FileUtils.mkdir_p(File.join(@temp, 'output'))
    File.open(File.join(@temp, 'output', "#{lock_id}.lock"), 'w') do |lock|
      lock.flock(File::LOCK_EX)
      assert_blocked('plan')
    end
  end

  def test_internal_track_is_draft_and_review_retry_is_disabled
    @data['android']['baseline_sha256'] = @data['ios']['baseline_sha256']
    write_manifest
    android = AndroidFakePipeline.new({ 'manifest' => @manifest, 'source_root' => @temp,
      'platform' => 'android', 'artifact' => @artifact, 'baseline' => @baseline_path, 'approval' => @approval },
      actions: ->(name, **args) { @calls << [name, args] }, output_root: File.join(@temp, 'output'))
    android.candidate = @pipeline.candidate.merge('platform' => 'android',
      'identifier' => @data['android']['package_name'],
      'upload_certificate_sha1' => @data['android']['upload_certificate_sha1'])
    android.baseline = android.candidate.merge('sha256' => @data['android']['baseline_sha256'])
    @pipeline = android
    write_build_evidence
    evidence = JSON.parse(File.read(File.join(@temp, 'result.json')))
    evidence['action'] = 'aab'
    File.write(File.join(@temp, 'result.json'), JSON.generate(evidence))
    write_approval('channel' => 'internal-draft')
    run_action('internal')
    name, args = @calls.fetch(0)
    assert_equal :upload_to_play_store, name
    assert_equal 'internal', args[:track]
    assert_equal 'draft', args[:release_status]
    assert_equal true, args[:changes_not_sent_for_review]
    assert_equal false, args[:rescue_changes_not_sent_for_review]
    assert_equal true, args[:skip_upload_metadata]
    assert_equal true, args[:skip_upload_changelogs]
  end
end
