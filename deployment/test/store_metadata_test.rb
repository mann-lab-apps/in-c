require 'minitest/autorun'
require 'tmpdir'
require_relative '../lib/store_metadata'

class FakeMetadataAPI
  attr_reader :writes
  attr_accessor :app, :infos, :versions, :build, :info, :version_info, :fail_reads, :ignore_writes, :fail_second_write

  def initialize
    @writes = []
    @app = { 'id' => '6825212101', 'attributes' => { 'name' => 'Deployment Test', 'bundleId' => 'com.mannlab.deployment-test', 'primaryLocale' => 'ko' } }
    @infos = [{ 'id' => 'aa-11', 'attributes' => { 'state' => 'PREPARE_FOR_SUBMISSION' } }]
    @versions = [{ 'id' => 'bb-22', 'attributes' => { 'versionString' => '1.0', 'platform' => 'IOS', 'appVersionState' => 'PREPARE_FOR_SUBMISSION' } }]
    @info = [{ 'id' => 'cc-33', 'attributes' => { 'locale' => 'ko', 'name' => 'Deployment Test', 'subtitle' => nil } }]
    @version_info = [{ 'id' => 'dd-44', 'attributes' => { 'locale' => 'ko', 'description' => nil, 'keywords' => nil, 'promotionalText' => nil } }]
  end

  def get(path)
    raise Deployment::Error, 'HTTP 403' if fail_reads
    data = case path
           when '/v1/apps/6825212101' then app
           when '/v1/apps/6825212101/appInfos' then infos
           when '/v1/apps/6825212101/appStoreVersions' then versions
           when '/v1/appStoreVersions/bb-22/build' then build
           when '/v1/appInfos/aa-11/appInfoLocalizations' then info
           when '/v1/appStoreVersions/bb-22/appStoreVersionLocalizations' then version_info
           else raise "unexpected GET: #{path}"
           end
    { 'data' => Marshal.load(Marshal.dump(data)) }
  end

  def patch(type, id, values)
    raise Deployment::Error, 'remote secret-containing error' if fail_second_write && writes.length == 1
    writes << [type, id, values]
    return if ignore_writes
    target = type == 'appInfoLocalizations' ? info : version_info
    target.first['attributes'].merge!(values)
  end
end

class StoreMetadataTest < Minitest::Test
  def setup
    @temp = Dir.mktmpdir('store-metadata-test-')
    @data = JSON.parse(File.read(File.join(Deployment::ROOT, 'apps/deployment-test/store.json')))
    @path = File.join(@temp, 'store.json')
    @api = FakeMetadataAPI.new
    write_manifest
  end

  def teardown = FileUtils.rm_rf(@temp)

  def write_manifest = File.write(@path, JSON.pretty_generate(@data))

  def service
    Deployment::StoreMetadata.new(@path, api: @api, output_root: File.join(@temp, 'output'))
  end

  def run_service(mode)
    @service = service
    capture_io { @service.run(mode) }
  end

  def test_inspect_reads_without_writing
    run_service('inspect')
    assert_empty @api.writes
    assert_equal 'inspected', @service.record['status']
    assert_nil @service.record.dig('before', 'app_info', 'attributes', 'subtitle')
  end

  def test_apply_updates_only_two_metadata_resources_and_reads_back
    run_service('apply')
    assert_equal %w[appInfoLocalizations appStoreVersionLocalizations], @api.writes.map(&:first)
    assert_equal 'passed', @service.record['status']
    assert_equal true, @service.record.dig('verification', 'passed')
    assert_equal @data['version_info']['description'], @service.record.dig('after', 'version_info', 'attributes', 'description')
    assert_equal false, @service.record['binary_upload']
    assert_equal false, @service.record['review_submission']
    assert_equal false, @service.record['release']
  end

  def test_second_apply_is_idempotent
    run_service('apply')
    @api.writes.clear
    run_service('apply')
    assert_empty @api.writes
    assert @service.record.dig('verification', 'passed')
  end

  def test_wrong_bundle_is_blocked_before_any_write
    @api.app['attributes']['bundleId'] = 'com.mannlab.clef'
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_wrong_app_id_is_blocked
    @api.app['id'] = '1111'
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_wrong_name_is_blocked
    @api.app['attributes']['name'] = 'Production App'
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_live_app_is_blocked
    @api.infos.first['attributes']['state'] = 'READY_FOR_DISTRIBUTION'
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_in_review_version_is_blocked
    @api.versions.first['attributes']['appVersionState'] = 'IN_REVIEW'
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_wrong_version_is_blocked
    @api.versions.first['attributes']['versionString'] = '2.0'
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_selected_binary_is_blocked
    @api.build = { 'id' => 'a-build' }
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_missing_locale_blocks_all_writes
    @api.version_info.first['attributes']['locale'] = 'en-US'
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
  end

  def test_permission_error_blocks_all_writes_and_is_recorded
    @api.fail_reads = true
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_empty @api.writes
    assert_equal 'failed', JSON.parse(File.read(File.join(@service.output, 'result.json')))['status']
  end

  def test_readback_difference_is_a_failure
    @api.ignore_writes = true
    assert_raises(Deployment::Error) { run_service('apply') }
    assert_equal false, @service.record.dig('verification', 'passed')
    assert_includes @service.record.dig('verification', 'differences'), 'app_info.subtitle'
  end

  def test_partial_update_failure_keeps_before_and_progress_without_secret
    @api.fail_second_write = true
    assert_raises(Deployment::Error) { run_service('apply') }
    data = File.read(File.join(@service.output, 'result.json'))
    assert_nil @service.record.dig('before', 'app_info', 'attributes', 'subtitle')
    assert_equal ['app_info'], @service.record['writes_completed']
    assert_equal %w[app_info version_info], @service.record['writes_attempted']
    refute_includes data, 'remote secret-containing error'
  end

  def test_release_fields_and_unknown_options_are_rejected
    @data['version_info']['releaseType'] = 'AFTER_APPROVAL'
    write_manifest
    assert_raises(Deployment::Error) { service }
  end

  def test_metadata_limits_and_types_are_checked
    @data['app_info']['subtitle'] = '가' * 31
    write_manifest
    assert_raises(Deployment::Error) { service }
    @data['app_info']['subtitle'] = false
    write_manifest
    assert_raises(Deployment::Error) { service }
  end

  def test_api_key_cannot_be_added_to_store_manifest
    @data['private_key'] = 'must not be saved'
    write_manifest
    assert_raises(Deployment::Error) { service }
  end

  def test_transport_rejects_review_and_release_paths
    api = Deployment::StoreMetadataAPI.allocate
    assert_raises(Deployment::Error) { api.get('/v1/reviewSubmissions') }
    assert_raises(Deployment::Error) { api.patch('appStoreVersionReleaseRequests', 'aa-11', {}) }
    assert_raises(Deployment::Error) { api.patch('appInfoLocalizations', 'aa-11', { 'submitForReview' => true }) }
  end
end
