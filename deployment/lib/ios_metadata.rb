require 'yaml'
require 'tempfile'
require_relative 'ios_package'

module Deployment
  # Human-maintained YAML -> immutable, self-contained inputs for existing lanes.
  # This compiler never reads API credentials or invokes a store mutation.
  class IOSMetadata
    attr_reader :data, :path

    def initialize(path)
      @path = File.realpath(File.expand_path(path, ROOT))
      raw = File.read(@path)
      raise Error, 'private key material does not belong in metadata' if raw.match?(/-----BEGIN .*PRIVATE KEY-----/)
      check_duplicate_keys(Psych.parse_stream(raw))
      @data = YAML.safe_load(raw, permitted_classes: [], aliases: false)
      validate
    rescue Psych::Exception
      raise Error, 'invalid metadata YAML (aliases, objects and implicit dates are unsupported)'
    end

    def check_duplicate_keys(node)
      if node.is_a?(Psych::Nodes::Mapping)
        names = node.children.each_slice(2).map { |key, _| key.value if key.is_a?(Psych::Nodes::Scalar) }
        raise Error, 'duplicate or non-scalar YAML key' if names.include?(nil) || names.uniq.length != names.length
      end
      Array(node.children).each { |child| check_duplicate_keys(child) } if node.respond_to?(:children)
    end

    def fields(value, keys, label)
      raise Error, "invalid #{label} fields" unless value.is_a?(Hash) && value.keys.sort == keys.split.sort
    end

    def boolean(value, label)
      raise Error, "#{label} must be boolean" unless [true, false].include?(value)
    end

    def text(value, label)
      raise Error, "#{label} must be nonempty text" unless value.is_a?(String) && !value.strip.empty?
    end

    def validate
      fields(data, 'schema_version app source store content declarations review testflight screenshots videos manual artifacts secrets policy', 'metadata')
      raise Error, 'unsupported metadata schema' unless data['schema_version'] == 1
      raise Error, 'invalid metadata app slug' unless data['app'].is_a?(String) && data['app'].match?(/\A[a-z][a-z0-9_-]*\z/)
      source = data['source']
      fields(source, 'state path commit version build_number bundle_id dart_defines flavor', 'source')
      raise Error, 'source state must be pinned or pending' unless %w[pinned pending].include?(source['state'])
      Deployment.contained(REPO, source['path'])
      raise Error, 'source commit must be an explicit product checkpoint' unless source['commit'].is_a?(String) && source['commit'].match?(/\A[0-9a-f]{40}\z/)
      raise Error, 'invalid source version/build' unless source['version'].is_a?(String) && source['version'].match?(/\A\d+\.\d+\.\d+\z/) && source['build_number'].is_a?(Integer) && source['build_number'].positive?
      store = data['store']
      fields(store, 'app_id bundle_id expected_name version first_release test_only', 'store')
      %w[first_release test_only].each { |key| boolean(store[key], key) }
      %w[bundle_id expected_name version].each { |key| text(store[key], "store.#{key}") }
      raise Error, 'invalid store app ID' unless store['app_id'].nil? || (store['app_id'].is_a?(String) && store['app_id'].match?(/\A\d+\z/))
      unless store['test_only'] || (source['version'] == store['version'] && source['bundle_id'] == store['bundle_id'])
        raise Error, 'production metadata and capture source must share bundle ID/version'
      end
      content = data['content']
      fields(content, 'reviewed copyright locales', 'content')
      boolean(content['reviewed'], 'content.reviewed')
      text(content['copyright'], 'copyright')
      raise Error, 'at least one metadata locale required' unless content['locales'].is_a?(Hash) && !content['locales'].empty?
      content['locales'].each do |locale, values|
        raise Error, 'invalid locale' unless locale.match?(/\A[a-z]{2}(?:-[A-Za-z0-9]+)*\z/)
        raise Error, 'unknown listing field' unless values.is_a?(Hash) && (values.keys - IOSPackage::TEXT.keys).empty?
        values.each { |key, value| raise Error, "#{locale}.#{key} must be text or null" unless value.nil? || value.is_a?(String) }
      end
      declarations = data['declarations']
      fields(declarations, 'reviewed primary_category secondary_category content_rights age_rating', 'declarations')
      boolean(declarations['reviewed'], 'declarations.reviewed')
      raise Error, 'age_rating must be explicit answers or null' unless declarations['age_rating'].nil? || declarations['age_rating'].is_a?(Hash)
      fields(data['review'], 'reviewed demo_account_required notes', 'review')
      %w[reviewed demo_account_required].each { |key| boolean(data['review'][key], "review.#{key}") }
      text(data['review']['notes'], 'review notes')
      fields(data['testflight'], 'reviewed description test_notes feedback_email build_id', 'testflight')
      boolean(data['testflight']['reviewed'], 'testflight.reviewed')
      %w[description test_notes].each { |key| text(data['testflight'][key], "testflight.#{key}") }
      shots = data['screenshots']
      fields(shots, 'engine adapter devices scenes', 'screenshots')
      Deployment.contained(ROOT, shots['adapter'])
      raise Error, 'screenshots require devices and scenes' unless shots['devices'].is_a?(Array) && !shots['devices'].empty? && shots['scenes'].is_a?(Array) && !shots['scenes'].empty?
      raise Error, 'capture locales must have listing content' unless shots['devices'].all? { |d| content['locales'].key?(d['locale']) }
      shots['scenes'].each do |scene|
        fields(scene, 'id purpose route fixture must_show exclude steps assertions', 'screenshot scene')
        %w[id purpose route fixture].each { |key| text(scene[key], "scene.#{key}") }
        %w[must_show exclude].each do |key|
          raise Error, "scene.#{key} requires explicit criteria" unless scene[key].is_a?(Array) && !scene[key].empty? && scene[key].all? { |s| s.is_a?(String) && !s.strip.empty? }
        end
      end
      fields(data['videos'], 'app_preview review_video', 'videos')
      fields(data['videos']['app_preview'], 'required storyboard', 'app preview')
      fields(data['videos']['review_video'], 'required scene reason', 'review video')
      %w[app_preview review_video].each { |key| boolean(data['videos'][key]['required'], "#{key}.required") }
      fields(data['manual'], IOSPackage::MANUAL.join(' '), 'manual checks')
      data['manual'].each do |key, value|
        fields(value, 'status evidence', "manual.#{key}")
        raise Error, 'invalid manual check status/evidence' unless %w[pending verified not_applicable].include?(value['status']) && value['evidence'].is_a?(String)
        raise Error, 'completed manual check needs evidence' if value['status'] != 'pending' && value['evidence'].strip.empty?
      end
      fields(data['artifacts'], 'capture_verification', 'artifacts')
      artifact = data['artifacts']['capture_verification']
      Deployment.contained(ROOT, artifact) if artifact
      fields(data['secrets'], 'api_credentials_env review_details_env', 'secret references')
      data['secrets'].each_value { |value| raise Error, 'secrets contain environment variable names only' unless value.is_a?(String) && value.match?(/\A[A-Z][A-Z0-9_]*\z/) }
      fields(data['policy'], 'submit_for_review release', 'policy')
      raise Error, 'metadata cannot authorize submission or release' unless data['policy'].values.all? { |v| v == false }
      Tempfile.create(['ios-metadata-capture-', '.json']) do |file|
        file.write(JSON.pretty_generate(capture_data) + "\n")
        file.flush
        _, _, status = Open3.capture3('python3', File.join(ROOT, 'capture_screenshots.py'), 'plan', '--manifest', file.path)
        raise Error, 'invalid screenshot device/scene configuration' unless status.success?
      end
      self
    end

    def canonical(value)
      case value
      when Hash then value.keys.sort.to_h { |key| [key, canonical(value[key])] }
      when Array then value.map { |item| canonical(item) }
      else value
      end
    end

    def capture_data
      source, shots = data.values_at('source', 'screenshots')
      contract = { 'source' => source, 'screenshots' => shots }
      { 'schema_version' => 1, 'app' => data['app'], 'engine' => shots['engine'],
        'source_commit' => source['commit'], 'source_path' => source['path'], 'bundle_id' => source['bundle_id'],
        'version' => source['version'], 'build_number' => source['build_number'], 'dart_defines' => source['dart_defines'], 'flavor' => source['flavor'],
        'adapter' => shots['adapter'], 'devices' => shots['devices'],
        'scenes' => shots['scenes'].map { |scene| scene.slice('id', 'purpose', 'steps', 'assertions') },
        'content_contract_sha256' => Digest::SHA256.hexdigest(JSON.generate(canonical(contract))) }
    end

    def checked_capture(override = nil)
      relative = override || data['artifacts']['capture_verification']
      return nil unless relative
      proof = JSON.parse(File.read(Deployment.contained(ROOT, relative)))
      raise Error, 'a visually verified capture is required' unless proof['status'] == 'passed' && proof['visual_review_passed'] == true && proof['ready_for_upload'] == true && proof['app'] == data['app'] && proof['source_commit'] == data['source']['commit']
      result = File.realpath(proof.fetch('capture_result'))
      raise Error, 'capture result must be inside deployment output' unless result.start_with?(File.join(ROOT, 'output') + '/')
      raise Error, 'capture result changed after verification' unless Digest::SHA256.file(result).hexdigest == proof['capture_result_sha256']
      record = JSON.parse(File.read(result))
      manifest = File.realpath(record.fetch('manifest_path'))
      raise Error, 'capture manifest must be inside deployment' unless manifest.start_with?(ROOT + '/')
      raise Error, 'capture contract changed; recapture the updated scenes/source' unless JSON.parse(File.read(manifest)) == capture_data
      review = File.realpath(proof.fetch('visual_review_file'))
      raise Error, 'visual review changed' unless Digest::SHA256.file(review).hexdigest == proof['visual_review_sha256']
      # Reuse the capture engine's file/scene/review checks rather than trusting a stale report.
      code = "import importlib.util,json,sys; s=importlib.util.spec_from_file_location('capture',sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps(m.verify_result(sys.argv[2],m.load(sys.argv[2]),sys.argv[3],sys.argv[4])))"
      stdout, _, status = Open3.capture3('python3', '-c', code, File.join(ROOT, 'capture_screenshots.py'), manifest, result, review)
      raise Error, 'captured files or visual review no longer verify' unless status.success?
      checked = JSON.parse(stdout)
      { 'assets' => checked.fetch('assets'), 'directory' => File.dirname(manifest), 'result_sha256' => Digest::SHA256.file(result).hexdigest }
    end

    def compile(output_root: File.join(ROOT, 'output'), capture_verification: nil)
      raise Error, 'source is pending; pin the committed product checkpoint before preparing executable inputs' unless data['source']['state'] == 'pinned'
      proof = checked_capture(capture_verification)
      directory = File.join(output_root, data['app'], "metadata-#{Time.now.utc.strftime('%Y%m%dT%H%M%S')}-#{SecureRandom.hex(4)}")
      FileUtils.mkdir_p(directory)
      write = lambda do |relative, content|
        file = Deployment.contained(directory, relative)
        FileUtils.mkdir_p(File.dirname(file))
        File.write(file, content)
      end
      dump = ->(relative, value) { write.call(relative, JSON.pretty_generate(value) + "\n") }
      dump.call('screenshots.json', capture_data)
      # The same engine validation is used for YAML and legacy JSON inputs.
      _, _, status = Open3.capture3('python3', File.join(ROOT, 'capture_screenshots.py'), 'plan', '--manifest', File.join(directory, 'screenshots.json'))
      raise Error, 'invalid screenshot device/scene configuration' unless status.success?
      data['content']['locales'].each do |locale, values|
        values.each { |field, value| write.call("metadata/ios/#{locale}/#{field}.txt", value.strip + "\n") unless value.nil? }
      end
      write.call('metadata/ios/copyright.txt', data['content']['copyright'].strip + "\n")
      write.call('review-notes.txt', data['review']['notes'].strip + "\n")
      write.call('testflight-description.txt', data['testflight']['description'].strip + "\n")
      write.call('testflight-test-notes.txt', data['testflight']['test_notes'].strip + "\n")
      declarations = data['declarations'].dup
      if declarations['age_rating']
        dump.call('age-rating.json', declarations['age_rating'])
        declarations['age_rating'] = 'age-rating.json'
      end
      assets = (proof ? proof['assets'] : []).map do |asset|
        origin = Deployment.contained(proof['directory'], asset['path'])
        raise Error, 'capture changed before snapshot' unless Digest::SHA256.file(origin).hexdigest == asset['sha256']
        relative = "media/verified/#{asset['locale']}/#{asset['device']}/#{asset['display_type']}/#{asset['position']}-#{File.basename(origin)}"
        write.call(relative, File.binread(origin))
        asset.merge('path' => relative)
      end
      scenes = data['screenshots']['scenes'].map do |scene|
        scene.slice('id', 'purpose', 'route', 'fixture', 'must_show', 'exclude').merge('verified' => !proof.nil?)
      end
      dump.call('shot-plan.json', { 'schema_version' => 1, 'source_commit' => data['source']['commit'], 'scenes' => scenes }.merge(data['videos']))
      store = data['store']
      release = { 'schema_version' => 1, 'app' => data['app'], 'app_id' => store['app_id'], 'bundle_id' => store['bundle_id'],
        'expected_name' => store['expected_name'], 'version' => store['version'], 'first_release' => store['first_release'], 'test_only' => store['test_only'],
        'source_commit' => data['source']['commit'], 'content_reviewed' => data['content']['reviewed'],
        'devices' => data['screenshots']['devices'].map { |d| d['family'] }.uniq, 'locales' => data['content']['locales'].keys,
        'metadata_dir' => 'metadata/ios', 'declarations' => declarations,
        'review' => data['review'].slice('reviewed', 'demo_account_required').merge('notes_file' => 'review-notes.txt'),
        'testflight' => data['testflight'].slice('reviewed', 'feedback_email', 'build_id').merge('description_file' => 'testflight-description.txt', 'test_notes_file' => 'testflight-test-notes.txt'),
        'assets' => assets, 'shot_plan' => 'shot-plan.json', 'manual' => data['manual'] }
      dump.call('ios-release.json', release)
      package = IOSPackage.new(File.join(directory, 'ios-release.json')).prepare
      write.call('metadata-source.yaml', File.read(path))
      result = { 'schema_version' => 1, 'action' => 'prepare_ios_metadata', 'app' => data['app'], 'status' => 'prepared',
        'source_metadata' => path, 'source_metadata_sha256' => Digest::SHA256.file(path).hexdigest,
        'source_commit' => data['source']['commit'], 'capture_contract_sha256' => capture_data['content_contract_sha256'],
        'capture_result_sha256' => proof && proof['result_sha256'],
        'ios_release' => File.join(directory, 'ios-release.json'), 'screenshots' => File.join(directory, 'screenshots.json'),
        'secrets' => data['secrets'], 'readiness' => package.report,
        'binary_upload' => false, 'review_submission' => false, 'release' => false }
      dump.call('result.json', result)
      File.open(File.join(output_root, 'ledger.jsonl'), 'a', 0o600) do |ledger|
        ledger.flock(File::LOCK_EX)
        ledger.puts(JSON.generate(result.merge('result' => File.join(directory, 'result.json'))))
        ledger.flush
        ledger.fsync
      end
      result
    end
  end
end
