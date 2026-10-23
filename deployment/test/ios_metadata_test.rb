require 'minitest/autorun'
require 'tmpdir'
require 'pathname'
require_relative '../lib/ios_metadata'

class IOSMetadataTest < Minitest::Test
  def setup
    @temp = Dir.mktmpdir('ios-authored-metadata-', File.join(Deployment::ROOT, 'output'))
    @data = YAML.safe_load(File.read(File.join(Deployment::ROOT, 'apps/clef/ios-metadata.yaml')), aliases: false)
    # Compiler tests use a pinned fixture regardless of the editable authored file.
    @data['source']['state'] = 'pinned'
    @path = File.join(@temp, 'ios-metadata.yaml')
    save
  end

  def teardown = FileUtils.rm_rf(@temp)
  def save = File.write(@path, YAML.dump(@data))
  def metadata = Deployment::IOSMetadata.new(@path)
  def compile = metadata.compile(output_root: @temp)

  def test_one_file_generates_matching_release_text_capture_and_shot_criteria
    result = compile
    package = Deployment::IOSPackage.new(result['ios_release']).prepare
    capture = JSON.parse(File.read(result['screenshots']))
    plan = JSON.parse(File.read(File.join(File.dirname(result['ios_release']), 'shot-plan.json')))
    assert_equal @data['source']['commit'], package.data['source_commit']
    assert_equal package.data['source_commit'], capture['source_commit']
    assert_equal @data['content']['locales']['ko']['description'], package.prepared['metadata']['ko']['description']
    assert_equal @data['screenshots']['scenes'][0]['must_show'], plan['scenes'][0]['must_show']
    refute plan['scenes'][0]['verified']
    assert_includes package.blockers['metadata'], 'metadata content requires review'
    assert_empty package.data['assets']
    refute result['binary_upload']
    refute result['review_submission']
    refute result['release']
  end

  def test_changed_capture_intent_invalidates_fingerprint_but_listing_edits_do_not
    before = metadata.capture_data
    @data['content']['locales']['ko']['description'] = "새 기능 설명\n새 문단"
    save
    assert_equal before, metadata.capture_data
    @data['screenshots']['scenes'][0]['must_show'] << '새 필터가 실제로 적용된 결과'
    save
    refute_equal before['content_contract_sha256'], metadata.capture_data['content_contract_sha256']
  end

  def test_pending_product_checkpoint_is_editable_but_not_executable
    @data['source']['state'] = 'pending'
    save
    assert_equal 'pending', metadata.data['source']['state']
    assert_raises(Deployment::Error) { compile }
    assert_empty Dir[File.join(@temp, 'clef', 'metadata-*')]
  end

  def test_duplicate_keys_objects_and_aliases_are_rejected
    File.write(@path, "app: clef\napp: other\n")
    assert_raises(Deployment::Error) { metadata }
    File.write(@path, "--- !ruby/object:Object {}\n")
    assert_raises(Deployment::Error) { metadata }
    File.write(@path, "a: &shared [one]\nb: *shared\n")
    assert_raises(Deployment::Error) { metadata }
  end

  def test_unknown_fields_and_private_key_material_are_rejected
    @data['content']['locales']['ko']['release_note'] = 'typo'
    save
    assert_raises(Deployment::Error) { metadata }
    @data['content']['locales']['ko'].delete('release_note')
    @data['review']['notes'] = '-----BEGIN ' + 'PRIVATE KEY-----'
    save
    assert_raises(Deployment::Error) { metadata }
  end

  def test_secrets_are_environment_references_and_never_inlined
    @data['secrets']['api_credentials_env'] = '/outside/private-api.json'
    save
    assert_raises(Deployment::Error) { metadata }
    @data['secrets']['api_credentials_env'] = 'API_CONFIG'
    @data['review']['demoAccountPassword'] = 'not permitted'
    save
    assert_raises(Deployment::Error) { metadata }
  end

  def test_metadata_cannot_grant_submission_or_release_permission
    @data['policy']['submit_for_review'] = true
    save
    assert_raises(Deployment::Error) { metadata }
    @data['policy'].merge!('submit_for_review' => false, 'release' => true)
    save
    assert_raises(Deployment::Error) { metadata }
  end

  def test_production_version_or_bundle_mismatch_cannot_be_hidden
    @data['store']['version'] = '9.0.0'
    save
    assert_raises(Deployment::Error) { metadata }
    @data['store']['test_only'] = true
    save
    assert_equal '9.0.0', metadata.data['store']['version']
  end

  def test_paths_and_false_manual_completion_are_rejected
    @data['screenshots']['adapter'] = '../outside.dart'
    save
    assert_raises(Deployment::Error) { metadata }
    @data['screenshots']['adapter'] = 'capture/default_adapter.dart'
    @data['manual']['privacy_labels']['status'] = 'verified'
    save
    assert_raises(Deployment::Error) { metadata }
  end

  def test_scene_steps_are_validated_during_authoring_check
    @data['screenshots']['scenes'][0]['steps'] = [{ 'action' => 'shell', 'command' => 'unsupported' }]
    save
    assert_raises(Deployment::Error) { metadata }
  end

  def test_a_second_app_uses_the_same_authoring_format_and_default_adapter
    @data['app'] = 'another-app'
    @data['source'].merge!('path' => 'apps/another_app', 'bundle_id' => 'com.example.another')
    @data['store'].merge!('app_id' => nil, 'bundle_id' => 'com.example.another', 'expected_name' => 'Another App')
    @data['content']['locales']['ko']['name'] = 'Another App'
    @data['screenshots']['adapter'] = 'capture/default_adapter.dart'
    save
    result = compile
    assert_equal 'another-app', result['app']
    assert_equal 'capture/default_adapter.dart', JSON.parse(File.read(result['screenshots']))['adapter']
    assert_includes result['readiness']['blockers']['metadata'], 'App Store Connect app_id not configured'
  end

  def test_unreviewed_captures_cannot_be_promoted_to_release_assets
    proof = File.join(@temp, 'unreviewed.json')
    File.write(proof, JSON.generate({ 'status' => 'passed', 'visual_review_passed' => false }))
    relative = Pathname.new(proof).relative_path_from(Pathname.new(Deployment::ROOT)).to_s
    assert_raises(Deployment::Error) { metadata.compile(output_root: @temp, capture_verification: relative) }
  end

  def test_modified_capture_criteria_cannot_reuse_a_previous_review
    original = metadata.capture_data
    manifest = File.join(@temp, 'previous-screenshots.json')
    File.write(manifest, JSON.pretty_generate(original) + "\n")
    result = File.join(@temp, 'capture-result.json')
    File.write(result, JSON.generate({ 'manifest_path' => manifest }))
    proof = File.join(@temp, 'previous-review.json')
    File.write(proof, JSON.generate({ 'status' => 'passed', 'visual_review_passed' => true, 'ready_for_upload' => true,
      'app' => @data['app'], 'source_commit' => @data['source']['commit'], 'capture_result' => result,
      'capture_result_sha256' => Digest::SHA256.file(result).hexdigest }))
    @data['screenshots']['scenes'][0]['exclude'] << '업데이트로 없어진 버튼'
    save
    relative = Pathname.new(proof).relative_path_from(Pathname.new(Deployment::ROOT)).to_s
    error = assert_raises(Deployment::Error) { metadata.compile(output_root: @temp, capture_verification: relative) }
    assert_match(/capture contract changed/, error.message)
  end
end
