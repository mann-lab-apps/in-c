require 'json'
require 'open3'
require 'fileutils'
require 'digest'
require 'time'
require 'securerandom'
require 'shellwords'

module Deployment
  ROOT = File.expand_path('..', __dir__)
  REPO = File.expand_path('..', ROOT)
  class Error < StandardError; end

  def self.contained(base, relative)
    raise Error, 'path must be relative' unless relative.is_a?(String) && !relative.empty? && !relative.start_with?('/')
    path = File.expand_path(relative, base)
    raise Error, 'path escapes configured root' unless path.start_with?(File.expand_path(base) + '/')
    # Existing symlink components must also remain inside the configured root.
    cursor = path
    cursor = File.dirname(cursor) until File.exist?(cursor)
    raise Error, 'symlink escapes configured root' unless File.realpath(cursor).start_with?(File.realpath(base) + '/') || File.realpath(cursor) == File.realpath(base)
    path
  end

  class Manifest
    attr_reader :data, :path, :directory
    def initialize(path)
      @path = File.expand_path(path)
      @directory = File.dirname(@path)
      @data = JSON.parse(File.read(@path))
      allowed = %w[schema_version app display_name source_path source_commit version build_number entrypoint dart_defines version_constant ios android metadata release_notes]
      raise Error, 'unknown manifest fields' unless (data.keys - allowed).empty?
      raise Error, 'schema_version must be 1' unless data['schema_version'] == 1
      %w[app display_name source_path source_commit version entrypoint metadata release_notes].each do |key|
        raise Error, "missing #{key}" unless data[key].is_a?(String) && !data[key].empty?
      end
      raise Error, 'invalid app slug' unless data['app'].match?(/\A[a-z][a-z0-9_-]*\z/)
      raise Error, 'invalid source commit' unless data['source_commit'].match?(/\A[0-9a-f]{40}\z/)
      raise Error, 'invalid version' unless data['version'].match?(/\A\d+\.\d+\.\d+\z/)
      raise Error, 'invalid build number' unless data['build_number'].is_a?(Integer) && data['build_number'].between?(1, 2_100_000_000)
      raise Error, 'dart_defines must be string map' unless data['dart_defines'].is_a?(Hash) && data['dart_defines'].all? { |k, v| k.match?(/\A[A-Z][A-Z0-9_]*\z/) && v.is_a?(String) }
      { 'ios' => %w[bundle_id scheme configuration team_id profile export_options baseline baseline_sha256],
        'android' => %w[package_name upload_certificate_sha1 baseline baseline_sha256] }.each do |platform, fields|
        config = data[platform]
        raise Error, "invalid #{platform} fields" unless config.is_a?(Hash) && config.keys.sort == fields.sort && config.values.all? { |v| v.is_a?(String) && !v.empty? }
        raise Error, 'invalid baseline hash' unless config['baseline_sha256'].match?(/\A[0-9a-f]{64}\z/)
      end
      raise Error, 'invalid upload certificate fingerprint' unless data.dig('android', 'upload_certificate_sha1').match?(/\A[0-9A-F]{40}\z/)
      asset('metadata')
      asset('release_notes')
      Deployment.contained(directory, data.dig('ios', 'export_options'))
    end

    def [](key) = data.fetch(key)
    def digest = Digest::SHA256.file(path).hexdigest
    def asset(key) = Deployment.contained(directory, self[key])
    def version = "#{self['version']}+#{self['build_number']}"
  end

  class Pipeline
    ACTIONS = %w[plan preflight metadata archive export aab compare testflight internal].freeze
    attr_reader :manifest, :source_root, :app_path, :output, :record

    def initialize(options = {}, actions: nil, output_root: File.join(ROOT, 'output'))
      options = options.transform_keys(&:to_s)
      unknown = options.keys - %w[manifest source_root platform artifact baseline approval archive]
      raise Error, "unknown options: #{unknown.join(', ')}" unless unknown.empty?
      %w[manifest source_root artifact baseline approval archive].each do |key|
        options[key] = File.expand_path(options[key], ROOT) if options[key]
      end
      @options = options
      @manifest = Manifest.new(options.fetch('manifest', File.join(ROOT, 'apps/clef/release.json')))
      @source_root = File.realpath(options.fetch('source_root', REPO))
      @app_path = Deployment.contained(source_root, manifest['source_path'])
      @actions = actions
      @output_root = output_root
    end

    def capture(*argv, cwd: app_path)
      stdout, _stderr, status = Open3.capture3({ 'LC_ALL' => 'C', 'LANG' => 'en_US.UTF-8' }, *argv, chdir: cwd)
      raise Error, "#{File.basename(argv.first)} failed (exit #{status.exitstatus}); inspect local tools/signing" unless status.success?
      stdout
    end

    def command(*argv)
      puts Shellwords.join(argv)
      raise Error, "#{argv.first} failed" unless system(*argv, chdir: app_path)
    end

    def platform
      value = @options.fetch('platform', 'ios')
      raise Error, 'platform must be ios or android' unless %w[ios android].include?(value)
      value
    end

    def run(action)
      raise Error, 'unsupported action (production/review actions are unavailable)' unless ACTIONS.include?(action)
      @output = File.join(@output_root, manifest['app'], "#{Time.now.utc.strftime('%Y%m%dT%H%M%S')}-#{SecureRandom.hex(4)}")
      FileUtils.mkdir_p(output)
      # One lock per source checkout prevents Flutter generated-file races across apps/platforms.
      lock_id = Digest::SHA256.hexdigest(source_root)
      File.open(File.join(@output_root, "#{lock_id}.lock"), 'w') do |lock|
        raise Error, 'another deployment is using this checkout' unless lock.flock(File::LOCK_EX | File::LOCK_NB)
        @record = { 'schema_version' => 1, 'run_id' => File.basename(output), 'app' => manifest['app'],
                    'action' => action, 'platform' => platform, 'version' => manifest.version,
                    'manifest_sha256' => manifest.digest, 'started_at' => Time.now.utc.iso8601,
                    'status' => 'running', 'store_operation' => false }
        files = %w[lib/release.rb lib/artifact.py fastlane/Fastfile Gemfile.lock]
        record['pipeline_sha256'] = Digest::SHA256.hexdigest(files.map { |p| Digest::SHA256.file(File.join(ROOT, p)).hexdigest }.join)
        File.write(File.join(output, 'release-manifest.json'), JSON.pretty_generate(manifest.data) + "\n")
        begin
          record['source_commit'] = capture('git', 'rev-parse', 'HEAD', cwd: source_root).strip
          send("perform_#{action}")
          record['status'] = action == 'plan' ? 'planned' : 'passed'
        rescue StandardError => e
          record['status'] = 'failed'
          # Store a controlled failure class, never remote errors containing credentials.
          record['failure_class'] = e.class.name
          raise
        ensure
          record['finished_at'] = Time.now.utc.iso8601
          File.write(File.join(output, 'result.json'), JSON.pretty_generate(record) + "\n")
          File.open(File.join(@output_root, 'ledger.jsonl'), 'a', 0o600) do |ledger|
            ledger.flock(File::LOCK_EX)
            ledger.puts(JSON.generate(record.merge('result' => File.join(output, 'result.json'))))
            ledger.flush
            ledger.fsync
          end
          puts "Result: #{File.join(output, 'result.json')}"
        end
      end
    end

    def perform_plan
      record['plan'] = {
        'source_path' => manifest['source_path'], 'expected_source_commit' => manifest['source_commit'],
        'flutter_args' => flutter_args, 'ios' => manifest['ios'], 'android' => manifest['android'],
        'uploads_require' => 'fresh artifact comparison + hash-scoped local approval + non-draft notes',
        'production_available' => false
      }
      puts JSON.pretty_generate(record['plan'])
    end

    def perform_preflight
      raise Error, 'source commit differs from manifest' unless record['source_commit'] == manifest['source_commit']
      dirty = capture('git', 'status', '--porcelain', '--untracked-files=normal', cwd: source_root)
      raise Error, 'source checkout must be clean; use an isolated checkout' unless dirty.empty?
      pubspec = File.read(File.join(app_path, 'pubspec.yaml'))
      raise Error, 'source version differs from manifest' unless pubspec.match?(/^version:\s*#{Regexp.escape(manifest.version)}\s*$/)
      Deployment.contained(app_path, manifest['entrypoint'])
      if manifest.data['version_constant']
        main = File.read(File.join(app_path, manifest['entrypoint']))
        expected = /#{Regexp.escape(manifest['version_constant'])}\s*=\s*['"]#{Regexp.escape(manifest.version)}['"]/
        raise Error, 'in-app version differs from manifest' unless main.match?(expected)
      end
      if platform == 'ios'
        config = manifest['ios']
        project = File.read(File.join(app_path, 'ios/Runner.xcodeproj/project.pbxproj'))
        raise Error, 'iOS bundle identifier differs from manifest' unless project.include?("PRODUCT_BUNDLE_IDENTIFIER = #{config['bundle_id']};")
        options = export_options
        raise Error, 'export destination must be local export' unless options['destination'] == 'export'
        raise Error, 'export options differ from manifest' unless options['method'] == 'app-store-connect' && options['teamID'] == config['team_id'] && options['signingStyle'] == 'manual' && options['signingCertificate'] == 'Apple Distribution' && options['provisioningProfiles'] == { config['bundle_id'] => config['profile'] }
        allowed = %w[destination method teamID signingStyle signingCertificate provisioningProfiles stripSwiftSymbols uploadSymbols manageAppVersionAndBuildNumber]
        raise Error, 'unexpected export options' unless (options.keys - allowed).empty?
        raise Error, 'automatic build-number mutation forbidden' if options['manageAppVersionAndBuildNumber'] == true
      else
        gradle = File.read(File.join(app_path, 'android/app/build.gradle.kts'))
        raise Error, 'Android package differs from manifest' unless gradle.match?(/applicationId\s*=\s*"#{Regexp.escape(manifest['android']['package_name'])}"/)
        signing = File.join(app_path, 'android/key.properties')
        raise Error, 'release signing missing; debug fallback forbidden' unless File.file?(signing)
        raise Error, 'signing configuration must be ignored by git' unless system('git', 'check-ignore', '-q', signing, chdir: source_root)
        properties = File.readlines(signing).filter_map do |line|
          next if line.strip.start_with?('#', '!') || !line.include?('=')
          line.strip.split('=', 2)
        end.to_h
        raise Error, 'incomplete Android signing properties' unless %w[storeFile storePassword keyAlias keyPassword].all? { |key| properties[key] && !properties[key].empty? }
        store = File.expand_path(properties['storeFile'], File.join(app_path, 'android'))
        raise Error, 'Android upload keystore missing' unless File.file?(store)
        raise Error, 'BUNDLETOOL_JAR must point to external bundletool jar' unless File.file?(ENV.fetch('BUNDLETOOL_JAR', ''))
      end
      record['preflight'] = 'passed'
      record['source_clean'] = true
    end

    def export_options
      file = Deployment.contained(manifest.directory, manifest['ios']['export_options'])
      JSON.parse(capture('plutil', '-convert', 'json', '-o', '-', file))
    end

    def flutter_args
      ['--release', '--target', manifest['entrypoint'], "--build-name=#{manifest['version']}",
       "--build-number=#{manifest['build_number']}"] + manifest['dart_defines'].map { |key, value| "--dart-define=#{key}=#{value}" }
    end

    def perform_metadata
      FileUtils.cp_r(manifest.asset('metadata'), File.join(output, 'metadata'))
      FileUtils.cp(manifest.asset('release_notes'), File.join(output, 'release-notes.txt'))
      record['metadata_sha256'] = metadata_digest
      record['metadata_status'] = 'local draft; no store update'
    end

    def metadata_digest
      paths = Dir.glob(File.join(manifest.asset('metadata'), '**/*')).select { |p| File.file?(p) }.sort
      raise Error, 'metadata is empty' if paths.empty?
      text = paths.map { |p| "#{p.delete_prefix(manifest.directory + '/')}\0#{Digest::SHA256.file(p).hexdigest}" }.join("\n")
      Digest::SHA256.hexdigest(text + "\n" + File.read(manifest.asset('release_notes')))
    end

    def perform_archive
      raise Error, 'archive requires ios' unless platform == 'ios'
      perform_preflight
      raise Error, 'builds require bundle exec fastlane' unless @actions
      record_toolchain
      command('flutter', 'pub', 'get', '--enforce-lockfile')
      command('flutter', 'build', 'ios', '--config-only', *flutter_args)
      config = manifest['ios']
      workspace = File.join(app_path, 'ios/Runner.xcworkspace')
      settings = JSON.parse(capture('xcodebuild', '-workspace', workspace, '-scheme', config['scheme'], '-configuration', config['configuration'], '-sdk', 'iphoneos', '-showBuildSettings', '-json'))
      target = settings.find { |s| s['target'] == 'Runner' }.fetch('buildSettings')
      { 'PRODUCT_BUNDLE_IDENTIFIER' => config['bundle_id'], 'DEVELOPMENT_TEAM' => config['team_id'],
        'PROVISIONING_PROFILE_SPECIFIER' => config['profile'] }.each do |k, v|
        raise Error, "resolved Xcode #{k} differs from manifest" unless target[k] == v
      end
      archive = File.join(output, 'app.xcarchive')
      @actions.call(:build_app, workspace: workspace, scheme: config['scheme'], configuration: config['configuration'],
                    archive_path: archive, skip_package_ipa: true, clean: true, xcodebuild_formatter: '',
                    buildlog_path: File.join(output, 'logs'))
      record['archive'] = archive
      # The signed archive is useful independently from the exported IPA.
      app = Dir.glob(File.join(archive, 'Products/Applications/*.app')).fetch(0)
      command('codesign', '--verify', '--deep', '--strict', app)
    end

    def perform_export
      raise Error, 'export requires ios' unless platform == 'ios'
      perform_preflight
      raise Error, 'builds require bundle exec fastlane' unless @actions
      record_toolchain
      archive = File.realpath(@options.fetch('archive'))
      evidence_path = File.join(File.dirname(archive), 'result.json')
      evidence = JSON.parse(File.read(evidence_path))
      raise Error, 'archive must come from a successful matching archive run' unless evidence.values_at('action', 'status', 'manifest_sha256', 'source_commit', 'archive') == ['archive', 'passed', manifest.digest, record['source_commit'], archive]
      # gym 2.241.1 rejects Xcode's app-store-connect method when given a plist.
      # Run the native export inside this lane to preserve the manual export contract.
      command('xcodebuild', '-exportArchive', '-archivePath', archive, '-exportPath', output,
              '-exportOptionsPlist', Deployment.contained(manifest.directory, manifest['ios']['export_options']))
      ipas = Dir.glob(File.join(output, '*.ipa'))
      raise Error, 'expected exactly one exported IPA' unless ipas.length == 1
      FileUtils.mv(ipas.first, File.join(output, 'app.ipa')) unless File.basename(ipas.first) == 'app.ipa'
      record['artifact'] = inspect_artifact(File.join(output, 'app.ipa'))
      assert_identity(record['artifact'])
    end

    def perform_aab
      raise Error, 'aab requires android' unless platform == 'android'
      perform_preflight
      record_toolchain
      kotlin_cache = File.join(app_path, 'android/.kotlin')
      cache_existed = File.exist?(kotlin_cache)
      begin
        command('flutter', 'pub', 'get', '--enforce-lockfile')
        command('flutter', 'build', 'appbundle', *flutter_args)
      ensure
        # Kotlin creates this untracked cache even in otherwise clean historical checkouts.
        FileUtils.rm_rf(kotlin_cache) unless cache_existed
      end
      target = File.join(output, 'app.aab')
      FileUtils.cp(File.join(app_path, 'build/app/outputs/bundle/release/app-release.aab'), target)
      record['artifact'] = inspect_artifact(target)
      assert_identity(record['artifact'])
    end

    def record_toolchain
      record['tools'] = { 'ruby' => RUBY_VERSION, 'fastlane' => defined?(Fastlane::VERSION) ? Fastlane::VERSION : nil,
                          'flutter' => JSON.parse(capture('flutter', '--version', '--machine')) }
      record['tools'][platform == 'ios' ? 'xcode' : 'java'] =
        platform == 'ios' ? capture('xcodebuild', '-version').strip : capture('java', '--version').strip
      if platform == 'android'
        record['tools']['flutter_android_java'] = capture('flutter', 'doctor', '-v').lines.grep(/Java binary at:|Java version/).map(&:strip)
      end
    end

    def inspect_artifact(path)
      JSON.parse(capture('python3', File.join(ROOT, 'lib/artifact.py'), platform, File.realpath(path)))
    end

    def assert_identity(artifact)
      expected = platform == 'ios' ? manifest['ios']['bundle_id'] : manifest['android']['package_name']
      raise Error, 'artifact identifier/version differs from manifest' unless artifact.values_at('identifier', 'version', 'build_number') == [expected, manifest['version'], manifest['build_number']]
      if platform == 'ios'
        raise Error, 'artifact signing differs from manifest' unless artifact.values_at('team_id', 'profile') == manifest['ios'].values_at('team_id', 'profile')
        raise Error, 'artifact name differs from manifest' unless artifact['display_name'] == manifest['display_name']
      else
        raise Error, 'upload certificate differs from manifest' unless artifact['upload_certificate_sha1'] == manifest['android']['upload_certificate_sha1']
      end
    end

    def perform_compare
      candidate = inspect_artifact(@options.fetch('artifact'))
      assert_identity(candidate)
      baseline_path = @options.fetch('baseline', Deployment.contained(REPO, manifest[platform]['baseline']))
      baseline = inspect_artifact(baseline_path)
      raise Error, 'baseline differs from pinned manual artifact' unless baseline['sha256'] == manifest[platform]['baseline_sha256']
      record['artifact'] = candidate
      build_record = File.join(File.dirname(candidate['path']), 'result.json')
      if File.file?(build_record)
        evidence = JSON.parse(File.read(build_record))
        if evidence['status'] == 'passed' && evidence.dig('artifact', 'sha256') == candidate['sha256']
          record['artifact_source_commit'] = evidence['source_commit']
        end
      end
      # Compare semantic distribution properties; signed ZIPs need not be byte-identical.
      fields = %w[identifier debuggable]
      fields += platform == 'ios' ? %w[display_name team_id profile device_families minimum_os entitlements] : %w[upload_certificate_sha1 permissions minimum_sdk]
      differences = fields.reject { |key| candidate[key] == baseline[key] }
      record['comparison'] = { 'passed' => differences.empty?, 'fields' => fields, 'differences' => differences,
                               'baseline_sha256' => baseline['sha256'], 'candidate_sha256' => candidate['sha256'],
                               'baseline_version' => "#{baseline['version']}+#{baseline['build_number']}",
                               'byte_identical' => candidate['sha256'] == baseline['sha256'] }
      raise Error, "manual artifact parity failed: #{differences.join(', ')}" unless differences.empty?
    end

    def authorize_upload!(channel)
      perform_preflight
      perform_compare
      artifact_path = record['artifact']['path']
      build = JSON.parse(File.read(File.join(File.dirname(artifact_path), 'result.json')))
      expected_action = platform == 'ios' ? 'export' : 'aab'
      raise Error, 'artifact must come from matching successful build evidence' unless build.values_at('action', 'status', 'manifest_sha256', 'source_commit') == [expected_action, 'passed', manifest.digest, record['source_commit']] && build.dig('artifact', 'sha256') == record['artifact']['sha256']
      notes = File.read(manifest.asset('release_notes')).strip
      raise Error, 'release notes are empty or draft' if notes.empty? || notes.match?(/DRAFT|초안|검수 필요/i)
      approval = JSON.parse(File.read(File.realpath(@options.fetch('approval'))))
      expected = { 'app' => manifest['app'], 'channel' => channel, 'version' => manifest.version,
                   'artifact_sha256' => record['artifact']['sha256'], 'manifest_sha256' => manifest.digest,
                   'metadata_sha256' => metadata_digest, 'source_commit' => record['source_commit'] }
      raise Error, 'approval scope differs from this release' unless expected.all? { |k, v| approval[k] == v }
      raise Error, 'approval must name approver and explicitly authorize upload' unless approval['approved'] == true && approval['approved_by'].is_a?(String) && !approval['approved_by'].strip.empty?
      expiry = Time.iso8601(approval.fetch('expires_at'))
      raise Error, 'approval expired or exceeds 24 hours' unless expiry > Time.now && expiry <= Time.now + 86_400
      raise Error, 'uploads require bundle exec fastlane' unless @actions
      record['approval'] = expected.merge('approved_by' => approval['approved_by'], 'expires_at' => approval['expires_at'])
      # Copy the verified file into this run; use exactly these bytes for upload.
      artifact = File.join(output, "upload.#{platform == 'ios' ? 'ipa' : 'aab'}")
      FileUtils.cp(record['artifact']['path'], artifact)
      raise Error, 'artifact changed during verification' unless Digest::SHA256.file(artifact).hexdigest == expected['artifact_sha256']
      artifact
    end

    def external_credential(name)
      path = File.realpath(ENV.fetch(name))
      raise Error, "#{name} must be outside git checkout" if [REPO, source_root].any? { |root| path.start_with?(root + '/') }
      path
    end

    def perform_testflight
      raise Error, 'testflight requires ios' unless platform == 'ios'
      artifact = authorize_upload!('testflight')
      key = external_credential('ASC_API_KEY_JSON')
      record['store_operation'] = 'attempted'
      @actions.call(:upload_to_testflight, api_key_path: key, ipa: artifact,
                    app_identifier: manifest['ios']['bundle_id'], skip_submission: true,
                    distribute_external: false, notify_external_testers: false,
                    skip_waiting_for_build_processing: true)
      record['store_operation'] = 'uploaded; processing/distribution unverified'
    end

    def perform_internal
      raise Error, 'internal requires android' unless platform == 'android'
      artifact = authorize_upload!('internal-draft')
      key = external_credential('PLAY_SERVICE_ACCOUNT_JSON')
      record['store_operation'] = 'attempted'
      @actions.call(:upload_to_play_store, json_key: key, package_name: manifest['android']['package_name'],
                    aab: artifact, track: 'internal', release_status: 'draft',
                    changes_not_sent_for_review: true, rescue_changes_not_sent_for_review: false,
                    skip_upload_apk: true, skip_upload_metadata: true, skip_upload_changelogs: true,
                    skip_upload_images: true, skip_upload_screenshots: true)
      record['store_operation'] = 'uploaded internal draft; no review requested'
    end
  end
end
