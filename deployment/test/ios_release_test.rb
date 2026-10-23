require 'minitest/autorun'
require 'tmpdir'
require 'zlib'
require_relative '../lib/ios_release'

class FakeIOSAPI
  attr_reader :writes, :resources
  attr_accessor :ignore_writes, :processing

  def initialize
    @writes = []
    @resources = {
      '/v1/apps/6825212101' => { 'id' => '6825212101', 'attributes' => { 'name' => 'Deployment Test', 'bundleId' => 'com.mannlab.deployment-test' } },
      '/v1/apps/6825212101/appInfos' => [{ 'id' => 'aa-11', 'attributes' => { 'state' => 'PREPARE_FOR_SUBMISSION' }, 'relationships' => {} }],
      '/v1/apps/6825212101/appStoreVersions' => [{ 'id' => 'bb-22', 'attributes' => { 'platform' => 'IOS', 'versionString' => '1.0', 'appVersionState' => 'PREPARE_FOR_SUBMISSION', 'releaseType' => 'MANUAL' } }],
      '/v1/appStoreVersions/bb-22' => { 'id' => 'bb-22', 'attributes' => {} },
      '/v1/appInfos/aa-11/appInfoLocalizations' => [{ 'id' => 'cc-33', 'attributes' => { 'locale' => 'ko', 'name' => 'Deployment Test' } }],
      '/v1/appStoreVersions/bb-22/appStoreVersionLocalizations' => [{ 'id' => 'dd-44', 'attributes' => { 'locale' => 'ko' } }],
      '/v1/appInfos/aa-11/ageRatingDeclaration' => { 'id' => 'ee-55', 'attributes' => {} },
      '/v1/appStoreVersions/bb-22/appStoreReviewDetail' => { 'id' => 'ff-66', 'attributes' => {} },
      '/v1/apps/6825212101/betaAppLocalizations' => [{ 'id' => 'ab-12', 'attributes' => { 'locale' => 'ko' } }],
      '/v1/apps/6825212101/betaAppReviewDetail' => { 'id' => 'ac-13', 'attributes' => {} },
      '/v1/builds/bb-99/app' => { 'id' => '6825212101', 'attributes' => {} },
      '/v1/builds/bb-99/betaBuildLocalizations' => [{ 'id' => 'ad-14', 'attributes' => { 'locale' => 'ko' } }],
      '/v1/appStoreVersionLocalizations/dd-44/appScreenshotSets' => [{ 'id' => 'ae-15', 'attributes' => { 'screenshotDisplayType' => 'APP_IPHONE_67' } }],
      '/v1/appScreenshotSets/ae-15/appScreenshots' => []
    }
    @resources['/v1/appStoreVersions/bb-22'] = @resources['/v1/apps/6825212101/appStoreVersions'].first
  end

  def get(path)
    { 'data' => Marshal.load(Marshal.dump(resources.fetch(path))) }
  end
  def optional(path) = resources.key?(path) ? get(path)['data'] : nil

  def patch(type, id, attributes)
    writes << [type, id, attributes]
    rows = resources.values.flat_map { |v| v.is_a?(Array) ? v : [v] }
    row = rows.find { |r| r['id'] == id }
    row['attributes'].merge!(attributes) unless ignore_writes
    if attributes['uploaded']
      row['attributes']['assetDeliveryState'] = { 'state' => processing ? 'PROCESSING' : 'COMPLETE' }
    end
    row
  end

  def categories(id, primary, secondary)
    writes << ['categories', id, { 'primary' => primary, 'secondary' => secondary }]
    row = resources['/v1/apps/6825212101/appInfos'].first
    row['relationships'] = { 'primaryCategory' => { 'data' => { 'id' => primary } } }
    row['relationships']['secondaryCategory'] = { 'data' => { 'id' => secondary } } if secondary
    row
  end

  def create(type, parent, attrs)
    writes << [type, parent, attrs]
    id = "fa-#{90 + writes.length}"
    row = { 'id' => id, 'attributes' => attrs.merge('uploadOperations' => []) }
    case type
    when 'appScreenshots' then resources.fetch("/v1/appScreenshotSets/#{parent}/appScreenshots") << row
    when 'appInfoLocalizations' then resources.fetch("/v1/appInfos/#{parent}/appInfoLocalizations") << row
    when 'appStoreVersionLocalizations' then resources.fetch("/v1/appStoreVersions/#{parent}/appStoreVersionLocalizations") << row
    when 'betaAppLocalizations' then resources.fetch("/v1/apps/#{parent}/betaAppLocalizations") << row
    else raise "unhandled create #{type}"
    end
    row
  end

  def upload_operations(_operations, _path) = nil
end

class IOSReleaseTest < Minitest::Test
  def setup
    @temp = Dir.mktmpdir('ios-release-test-')
    @path = File.join(@temp, 'ios-release.json')
    @data = JSON.parse(File.read(File.join(Deployment::ROOT, 'apps/deployment-test/ios-release.json')))
    @data['assets'] = []
    @data['devices'] = ['iphone']
    @data.delete('test_only')
    @data['declarations'] = { 'reviewed' => true, 'primary_category' => 'MUSIC', 'secondary_category' => nil,
      'content_rights' => 'DOES_NOT_USE_THIRD_PARTY_CONTENT', 'age_rating' => 'age.json' }
    @data['review']['reviewed'] = true
    @data['testflight']['reviewed'] = true
    @data['testflight']['feedback_email'] = 'qa@example.com'
    @data['testflight']['build_id'] = 'bb-99'
    @data['manual'].each_value { |v| v.merge!('status' => 'verified', 'evidence' => 'fixture-only test evidence') }
    folder = File.join(@temp, 'metadata/ios/ko')
    FileUtils.mkdir_p(folder)
    { 'name' => 'Deployment Test', 'description' => "한글\n줄바꿈", 'keywords' => 'test',
      'support_url' => 'https://example.com/support', 'privacy_url' => 'https://example.com/privacy' }.each { |k, v| File.write(File.join(folder, "#{k}.txt"), v) }
    File.write(File.join(@temp, 'metadata/ios/copyright.txt'), '2026 Fixture Author')
    File.write(File.join(@temp, 'age.json'), JSON.generate({ 'advertising' => false }))
    File.write(File.join(@temp, 'review-notes.txt'), 'Import a self-authored PDF.')
    File.write(File.join(@temp, 'testflight-description.txt'), 'Beta description')
    File.write(File.join(@temp, 'testflight-test-notes.txt'), 'What to Test')
    File.write(File.join(@temp, 'shot-plan.json'), JSON.generate({ 'scenes' => [{ 'id' => 'library', 'verified' => true }] }))
    @private = File.join(@temp, 'contacts.json')
    File.write(@private, JSON.generate({ 'contactFirstName' => 'Private Name', 'contactLastName' => 'Tester', 'contactPhone' => '+123456789', 'contactEmail' => 'private@example.com' }))
    @api = FakeIOSAPI.new
    save
  end

  def teardown = FileUtils.rm_rf(@temp)
  def save = File.write(@path, JSON.pretty_generate(@data))
  def package = Deployment::IOSPackage.new(@path).prepare(private_details: @private)

  def run_mode(mode, sections)
    @package = package
    @run = Deployment::IOSRelease.new(@package, api: @api, output_root: File.join(@temp, 'output'))
    capture_io { @run.run(mode, sections: sections) }
  end

  def test_plan_requires_no_store_access_and_reports_missing_assets
    run_mode('plan', ['metadata'])
    assert_equal false, @run.record.dig('readiness', 'information_complete')
    assert_includes @package.blockers['media'], 'ko/iphone: screenshots required'
    assert_empty @api.writes
  end

  def test_scoped_metadata_sync_preserves_other_sections_and_reads_back
    run_mode('sync', ['metadata'])
    assert @run.record.dig('verification', 'passed')
    assert_equal '한글' + "\n" + '줄바꿈', @api.resources['/v1/appStoreVersions/bb-22/appStoreVersionLocalizations'].first.dig('attributes', 'description')
    assert @api.writes.all? { |w| %w[appStoreVersions appInfoLocalizations appStoreVersionLocalizations].include?(w.first) }
    refute @run.record['review_submission']
    refute @run.record['binary_upload']
  end

  def test_idempotent_metadata_update
    run_mode('sync', ['metadata'])
    @api.writes.clear
    run_mode('sync', ['metadata'])
    assert_empty @api.writes
  end

  def test_released_version_can_coexist_with_selected_editable_version
    @api.resources['/v1/apps/6825212101/appStoreVersions'] << { 'id' => 'ab-88', 'attributes' => { 'versionString' => '0.9', 'platform' => 'IOS', 'appVersionState' => 'READY_FOR_DISTRIBUTION' } }
    run_mode('sync', ['metadata'])
    assert @run.record.dig('verification', 'passed')
    refute @api.writes.any? { |w| w[1] == 'ab-88' }
  end

  def test_wrong_bundle_and_review_state_block_all_writes
    @api.resources['/v1/apps/6825212101']['attributes']['bundleId'] = 'other.app'
    assert_raises(Deployment::Error) { run_mode('sync', ['metadata']) }
    assert_empty @api.writes
  end

  def test_in_review_draft_is_not_modified
    @api.resources['/v1/apps/6825212101/appStoreVersions'].first['attributes']['appVersionState'] = 'IN_REVIEW'
    assert_raises(Deployment::Error) { run_mode('sync', ['metadata']) }
    assert_empty @api.writes
  end

  def test_missing_privacy_url_and_draft_text_block_upload
    File.delete(File.join(@temp, 'metadata/ios/ko/privacy_url.txt'))
    File.write(File.join(@temp, 'metadata/ios/ko/description.txt'), 'DRAFT pending')
    assert_raises(Deployment::Error) { run_mode('sync', ['metadata']) }
    assert_empty @api.writes
  end

  def test_unreviewed_authored_content_blocks_metadata_writes
    @data['content_reviewed'] = false
    save
    assert_raises(Deployment::Error) { run_mode('sync', ['metadata']) }
    assert_empty @api.writes
  end

  def test_first_release_rejects_whats_new
    File.write(File.join(@temp, 'metadata/ios/ko/release_notes.txt'), 'Update notes')
    assert package.blockers['metadata'].any? { |s| s.include?('not accepted') }
  end

  def test_update_requires_release_notes
    @data['first_release'] = false
    save
    assert package.blockers['metadata'].any? { |s| s.include?('release_notes: missing') }
  end

  def test_review_and_beta_contacts_are_redacted_in_results
    run_mode('sync', %w[review testflight])
    assert @run.record.dig('verification', 'passed')
    text = File.read(File.join(@run.output, 'result.json'))
    refute_includes text, 'private@example.com'
    refute_includes text, 'Private Name'
    assert_equal 'What to Test', @api.resources['/v1/builds/bb-99/betaBuildLocalizations'].first.dig('attributes', 'whatsNew')
  end

  def test_testflight_build_ownership_is_checked
    @api.resources['/v1/builds/bb-99/app']['id'] = '999'
    assert_raises(Deployment::Error) { run_mode('sync', ['testflight']) }
    assert_empty @api.writes
  end

  def test_app_level_testflight_information_needs_no_binary_but_build_notes_still_do
    @data['testflight']['build_id'] = nil
    save
    assert_raises(Deployment::Error) { run_mode('sync', ['testflight']) }
    assert_empty @api.writes
    run_mode('sync', ['testflight_app'])
    assert @run.record.dig('verification', 'passed')
    assert @api.writes.all? { |w| %w[betaAppLocalizations betaAppReviewDetails].include?(w.first) }
    refute @run.record['binary_upload']
    refute @run.record['review_submission']
    @api.writes.clear
    run_mode('sync', ['testflight_app'])
    assert_empty @api.writes
  end

  def test_first_beta_locale_can_be_created_without_a_binary
    @data['testflight']['build_id'] = nil
    save
    @api.resources['/v1/apps/6825212101/betaAppLocalizations'].clear
    run_mode('sync', ['testflight_app'])
    assert @run.record.dig('verification', 'passed')
    assert_equal 'ko', @api.resources['/v1/apps/6825212101/betaAppLocalizations'].first.dig('attributes', 'locale')
  end

  def test_missing_contact_details_block_review_upload
    File.write(@private, '{}')
    assert_raises(Deployment::Error) { run_mode('sync', ['review']) }
    assert_empty @api.writes
  end

  def test_age_rating_is_not_guessed_and_can_be_updated_from_reviewed_answers
    run_mode('sync', ['declarations'])
    assert @run.record.dig('verification', 'passed')
    assert_equal false, @api.resources['/v1/appInfos/aa-11/ageRatingDeclaration'].dig('attributes', 'advertising')
  end

  def test_app_info_reads_request_category_relationship_data
    api = Deployment::IOSReleaseAPI.allocate
    paths = []
    api.define_singleton_method(:request) { |_method, path| paths << path; { 'data' => [] } }
    api.get('/v1/apps/6825212101/appInfos')
    api.get('/v1/apps/6825212101')
    assert_equal ['/v1/apps/6825212101/appInfos?include=primaryCategory,secondaryCategory', '/v1/apps/6825212101'], paths
    assert_raises(Deployment::Error) { api.get('/v1/apps/6825212101/appInfos?include=appStoreVersions') }
  end

  def test_declarations_repeat_without_writes_when_categories_match
    run_mode('sync', ['declarations'])
    @api.writes.clear
    run_mode('sync', ['declarations'])
    assert_empty @api.writes
    assert @run.record.dig('verification', 'passed')
  end

  def test_null_age_rating_answers_cannot_be_uploaded
    File.write(File.join(@temp, 'age.json'), JSON.generate({ 'advertising' => nil }))
    assert_raises(Deployment::Error) { run_mode('sync', ['declarations']) }
    assert_empty @api.writes
  end

  def test_readback_mismatch_is_a_failure
    @api.ignore_writes = true
    assert_raises(Deployment::Error) { run_mode('sync', ['metadata']) }
    assert_equal false, @run.record.dig('verification', 'passed')
  end

  def test_required_review_video_cannot_be_silently_omitted
    File.write(File.join(@temp, 'shot-plan.json'), JSON.generate({ 'scenes' => [], 'review_video' => { 'required' => true, 'scene' => 'hardware' } }))
    assert package.blockers['media'].any? { |s| s.include?('reviewer demo video') }
  end

  def test_unknown_and_release_fields_are_rejected
    @data['submit_for_review'] = true
    save
    assert_raises(Deployment::Error) { package }
    api = Deployment::IOSReleaseAPI.allocate
    assert_raises(Deployment::Error) { api.create('reviewSubmissions', 'aa-11', {}) }
    assert_raises(Deployment::Error) { api.patch('appStoreVersions', 'bb-22', { 'releaseType' => 'AFTER_APPROVAL' }) }
    assert_raises(Deployment::Error) { api.get('/v1/reviewSubmissions') }
  end

  def test_path_escape_is_rejected
    @data['metadata_dir'] = '../../outside'
    save
    assert_raises(Deployment::Error) { package }
  end

  def add_screenshot(alpha: false)
    # Synthetic image only for the offline fake API; never uploaded to a store.
    chunk = ->(kind, bytes) { [bytes.bytesize].pack('N') + kind + bytes + [Zlib.crc32(kind + bytes)].pack('N') }
    width, height = 1320, 2868
    channels = alpha ? 4 : 3
    raw = ("\x00" + "\x00" * width * channels) * height
    png = "\x89PNG\r\n\x1a\n".b + chunk.call('IHDR', [width, height, 8, alpha ? 6 : 2, 0, 0, 0].pack('NNCCCCC')) + chunk.call('IDAT', Zlib::Deflate.deflate(raw)) + chunk.call('IEND', ''.b)
    file = File.join(@temp, 'fixture.png')
    File.binwrite(file, png)
    @data['assets'] = [{ 'kind' => 'screenshot', 'locale' => 'ko', 'device' => 'iphone', 'display_type' => 'APP_IPHONE_67',
      'path' => 'fixture.png', 'position' => 1, 'scene' => 'library', 'sha256' => Digest::SHA256.file(file).hexdigest,
      'reviewed' => true, 'authentic' => true, 'source_commit' => @data['source_commit'] }]
    save
  end

  def test_screenshot_reservation_upload_commit_and_apple_state_readback
    add_screenshot
    run_mode('sync', ['media'])
    assert @run.record.dig('verification', 'passed')
    assert_equal %w[appScreenshots appScreenshots], @api.writes.map(&:first)
    assert_equal true, @api.writes.last.last['uploaded']
    assert_equal Digest::MD5.file(File.join(@temp, 'fixture.png')).hexdigest, @api.writes.last.last['sourceFileChecksum']
  end

  def test_imported_store_image_is_explicitly_test_only_and_not_a_verified_capture
    add_screenshot
    asset = @data['assets'].first
    asset['provenance'] = { 'type' => 'app_store_connect_asset', 'app_id' => '6808164371', 'version' => '1.0.2', 'asset_id' => 'aa-77' }
    asset['authentic'] = false
    asset['source_commit'] = nil
    save
    assert_raises(Deployment::Error) { run_mode('sync', ['media']) }
    assert_empty @api.writes
    @data['test_only'] = true
    save
    run_mode('sync', ['media'])
    assert @run.record['test_only']
    assert @run.record.dig('verification', 'passed')
    assert_equal false, @run.record['assets'].first['authentic']
    assert_nil @run.record['assets'].first['source_commit']
    assert_equal '6808164371', @run.record['assets'].first.dig('provenance', 'app_id')
    asset['source_commit'] = @data['source_commit']
    save
    assert package.blockers['media'].any? { |reason| reason.include?('must not claim') }
  end

  def test_screenshot_second_sync_does_not_duplicate_upload
    add_screenshot
    run_mode('sync', ['media'])
    @api.writes.clear
    run_mode('sync', ['media'])
    assert_empty @api.writes
  end

  def test_processing_asset_is_not_claimed_complete_and_verify_does_not_upload_again
    add_screenshot
    @api.processing = true
    assert_raises(Deployment::Error) { run_mode('sync', ['media']) }
    refute @run.record.dig('verification', 'passed')
    @api.resources['/v1/appScreenshotSets/ae-15/appScreenshots'].first['attributes']['assetDeliveryState']['state'] = 'COMPLETE'
    @api.writes.clear
    run_mode('verify', ['media'])
    assert_empty @api.writes
    assert @run.record.dig('verification', 'passed')
  end

  def test_wrong_asset_hash_and_alpha_channel_block_upload
    add_screenshot
    @data['assets'].first['sha256'] = 'a' * 64
    save
    assert_raises(Deployment::Error) { run_mode('sync', ['media']) }
    assert_empty @api.writes
    add_screenshot(alpha: true)
    assert_raises(Deployment::Error) { run_mode('sync', ['media']) }
    assert_empty @api.writes
  end

  def test_unreviewed_or_wrong_source_capture_is_blocked
    add_screenshot
    @data['assets'].first['source_commit'] = 'b' * 40
    @data['assets'].first['reviewed'] = false
    save
    assert_raises(Deployment::Error) { run_mode('sync', ['media']) }
    assert_empty @api.writes
  end

  def test_conflicting_remote_media_is_not_deleted_or_overwritten
    add_screenshot
    @api.resources['/v1/appScreenshotSets/ae-15/appScreenshots'] << { 'id' => 'f1-12', 'attributes' => { 'sourceFileChecksum' => 'other-file' } }
    assert_raises(Deployment::Error) { run_mode('sync', ['media']) }
    assert_empty @api.writes
  end

  def test_preview_constraints_and_review_video_have_different_duration_rules
    path = File.join(@temp, 'fixture.mp4')
    File.write(path, 'offline video inspection fixture')
    valid = ->(_p) { { 'width' => 886, 'height' => 1920, 'codec' => 'h264', 'duration' => 20.0, 'fps' => 30.0 } }
    assert_equal 20.0, Deployment::IOSAssets.inspect_file(path, 'preview', 'IPHONE_67', probe: valid)['duration']
    long = ->(_p) { { 'width' => 886, 'height' => 1920, 'codec' => 'h264', 'duration' => 90.0, 'fps' => 30.0 } }
    assert_raises(Deployment::Error) { Deployment::IOSAssets.inspect_file(path, 'preview', 'IPHONE_67', probe: long) }
    assert_equal 90.0, Deployment::IOSAssets.inspect_file(path, 'review_attachment', nil, probe: long)['duration']
  end

  def test_unknown_sync_mode_or_section_cannot_invoke_api
    @run = Deployment::IOSRelease.new(package, api: @api, output_root: File.join(@temp, 'output'))
    assert_raises(Deployment::Error) { @run.run('submit') }
    assert_raises(Deployment::Error) { @run.run('sync', sections: ['production']) }
    assert_empty @api.writes
  end

  def test_missing_remote_dependency_blocks_other_selected_sections_before_writes
    @api.resources['/v1/apps/6825212101/betaAppReviewDetail'] = nil
    assert_raises(Deployment::Error) { run_mode('sync', %w[metadata testflight]) }
    assert_empty @api.writes
  end

  def test_delegated_upload_sends_only_requested_byte_range_without_asc_bearer
    file = File.join(@temp, 'bytes.bin')
    File.write(file, 'abcdefgh')
    requests = []
    api = Deployment::IOSReleaseAPI.allocate
    api.define_singleton_method(:upload_request) do |_uri, req|
      requests << req
      Net::HTTPOK.new('1.1', '200', 'OK')
    end
    operation = { 'method' => 'PUT', 'url' => 'https://upload.apple.com/asset', 'offset' => 2, 'length' => 3,
      'requestHeaders' => [{ 'name' => 'Content-Type', 'value' => 'application/octet-stream' }] }
    api.upload_operations([operation], file)
    assert_equal 'cde', requests.first.body
    assert_nil requests.first['Authorization']
  end

  def test_untrusted_asset_host_and_invalid_ranges_are_rejected
    file = File.join(@temp, 'bytes.bin')
    File.write(file, 'abcdefgh')
    api = Deployment::IOSReleaseAPI.allocate
    operation = { 'method' => 'PUT', 'url' => 'https://attacker.example/file', 'offset' => 0, 'length' => 3, 'requestHeaders' => [] }
    assert_raises(Deployment::Error) { api.upload_operations([operation], file) }
    operation['url'] = 'https://upload.apple.com/file'
    operation['length'] = 100
    assert_raises(Deployment::Error) { api.upload_operations([operation], file) }
  end
end
