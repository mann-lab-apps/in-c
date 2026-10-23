require_relative 'release'
require 'net/http'
require 'uri'

module Deployment
  # A separate metadata contract needs no app source, build, or signing credentials.
  class StoreMetadata
    INFO_FIELDS = { 'name' => 30, 'subtitle' => 30 }.freeze
    VERSION_FIELDS = { 'description' => 4000, 'keywords' => 100, 'promotionalText' => 170 }.freeze
    STATE = 'PREPARE_FOR_SUBMISSION'
    attr_reader :manifest, :output, :record

    def initialize(path, api:, output_root: File.join(ROOT, 'output'))
      @manifest_path = File.expand_path(path, ROOT)
      @manifest = JSON.parse(File.read(@manifest_path))
      @api = api
      @output_root = output_root
      fields = %w[schema_version app app_id bundle_id expected_name locale version app_info version_info]
      raise Error, 'invalid store manifest fields' unless manifest.keys.sort == fields.sort
      raise Error, 'invalid store schema' unless manifest['schema_version'] == 1
      %w[app app_id bundle_id expected_name locale version].each do |key|
        raise Error, "invalid #{key}" unless manifest[key].is_a?(String) && !manifest[key].empty?
      end
      raise Error, 'invalid app slug' unless manifest['app'].match?(/\A[a-z][a-z0-9_-]*\z/)
      raise Error, 'invalid app ID' unless manifest['app_id'].match?(/\A\d+\z/)
      raise Error, 'invalid locale' unless manifest['locale'].match?(/\A[a-z]{2}(?:-[A-Za-z0-9]+)*\z/)
      { 'app_info' => INFO_FIELDS, 'version_info' => VERSION_FIELDS }.each do |group, allowed|
        values = manifest[group]
        raise Error, "invalid #{group}" unless values.is_a?(Hash) && (values.keys - allowed.keys).empty?
        values.each do |key, value|
          raise Error, "invalid metadata #{key}" unless value.is_a?(String) && !value.strip.empty? && value.length <= allowed[key]
        end
      end
      raise Error, 'metadata cannot be empty' if manifest['app_info'].empty? && manifest['version_info'].empty?
      if manifest['app_info'].key?('name') && manifest['app_info']['name'] != manifest['expected_name']
        raise Error, 'this verification lane cannot rename an app'
      end
    end

    def run(mode)
      raise Error, 'mode must be inspect or apply' unless %w[inspect apply].include?(mode)
      @output = File.join(@output_root, manifest['app'], "#{Time.now.utc.strftime('%Y%m%dT%H%M%S')}-#{SecureRandom.hex(4)}")
      FileUtils.mkdir_p(output)
      File.open(File.join(@output_root, "store-#{manifest['app_id']}.lock"), 'w') do |lock|
        raise Error, 'another metadata run is using this app' unless lock.flock(File::LOCK_EX | File::LOCK_NB)
        @record = { 'schema_version' => 1, 'action' => 'store_metadata', 'mode' => mode,
                    'app' => manifest['app'], 'app_id' => manifest['app_id'], 'bundle_id' => manifest['bundle_id'],
                    'manifest_sha256' => Digest::SHA256.file(@manifest_path).hexdigest,
                    'started_at' => Time.now.utc.iso8601, 'status' => 'running',
                    'writes_attempted' => [], 'writes_completed' => [], 'binary_upload' => false,
                    'review_submission' => false, 'release' => false }
        begin
          File.write(File.join(output, 'store-manifest.json'), JSON.pretty_generate(manifest) + "\n")
          before = snapshot
          record['before'] = before
          persist
          changes = %w[app_info version_info].to_h do |group|
            [group, manifest[group].reject { |key, value| before[group]['attributes'][key] == value }]
          end
          record['changes'] = changes
          if mode == 'apply'
            # Resolve and validate both localization resources before the first write.
            %w[app_info version_info].each do |group|
              next if changes[group].empty?
              type = group == 'app_info' ? 'appInfoLocalizations' : 'appStoreVersionLocalizations'
              resource = before[group]
              record['writes_attempted'] << group
              persist
              @api.patch(type, resource['id'], changes[group])
              record['writes_completed'] << group
              persist
            end
            after = snapshot
            record['after'] = after
            raise Error, 'remote resources changed during metadata update' unless %w[app_info version_info].all? { |group| before[group]['id'] == after[group]['id'] } && before['version_id'] == after['version_id'] && before['release_type'] == after['release_type']
            differences = %w[app_info version_info].flat_map do |group|
              manifest[group].keys.reject { |key| after[group]['attributes'][key] == manifest[group][key] }.map { |key| "#{group}.#{key}" }
            end
            record['verification'] = { 'passed' => differences.empty?, 'differences' => differences,
                                       'app_info_state' => after['app_info_state'], 'version_state' => after['version_state'] }
            raise Error, 'remote metadata read-back differs from manifest' unless differences.empty?
          end
          record['status'] = mode == 'inspect' ? 'inspected' : 'passed'
          record['finished_at'] = Time.now.utc.iso8601
        rescue StandardError => error
          record['status'] = 'failed'
          record['failure_class'] = error.class.name
          record['finished_at'] = Time.now.utc.iso8601
          raise
        ensure
          persist
          File.open(File.join(@output_root, 'ledger.jsonl'), 'a', 0o600) do |file|
            file.flock(File::LOCK_EX)
            file.puts(JSON.generate(record.merge('result' => File.join(output, 'result.json'))))
            file.flush
            file.fsync
          end
          puts "Result: #{File.join(output, 'result.json')}"
        end
      end
    end

    def snapshot
      app = @api.get("/v1/apps/#{manifest['app_id']}").fetch('data')
      attributes = app.fetch('attributes')
      raise Error, 'remote app identity differs from store manifest' unless app['id'] == manifest['app_id'] && attributes['bundleId'] == manifest['bundle_id'] && attributes['name'] == manifest['expected_name']
      raise Error, 'primary locale differs from manifest' unless attributes['primaryLocale'] == manifest['locale']
      infos = @api.get("/v1/apps/#{manifest['app_id']}/appInfos").fetch('data')
      # This verification lane only accepts a new draft app, with no released or review versions.
      raise Error, 'app info must be a single unsubmitted draft' unless infos.length == 1 && infos[0].dig('attributes', 'state') == STATE
      versions = @api.get("/v1/apps/#{manifest['app_id']}/appStoreVersions").fetch('data')
      raise Error, 'version must be a single unsubmitted iOS draft' unless versions.length == 1
      version = versions.first
      state = version.dig('attributes', 'appVersionState') || version.dig('attributes', 'appStoreState')
      raise Error, 'version/platform/state differs from manifest' unless version.dig('attributes', 'versionString') == manifest['version'] && version.dig('attributes', 'platform') == 'IOS' && state == STATE
      build = @api.get("/v1/appStoreVersions/#{version['id']}/build").fetch('data')
      raise Error, 'verification draft must have no selected build' unless build.nil?
      info = localized(@api.get("/v1/appInfos/#{infos.first['id']}/appInfoLocalizations"))
      localized_version = localized(@api.get("/v1/appStoreVersions/#{version['id']}/appStoreVersionLocalizations"))
      { 'app_info_state' => infos.first.dig('attributes', 'state'), 'version_state' => state,
        'release_type' => version.dig('attributes', 'releaseType'),
        'version_id' => version['id'], 'build' => nil,
        'app_info' => info, 'version_info' => localized_version }
    end

    def localized(response)
      values = response.fetch('data').select { |row| row.dig('attributes', 'locale') == manifest['locale'] }
      raise Error, 'expected exactly one existing metadata locale' unless values.length == 1
      { 'id' => values.first.fetch('id'), 'attributes' => values.first.fetch('attributes') }
    end

    def persist
      file = File.join(output, 'result.json')
      File.write(file + '.tmp', JSON.pretty_generate(record) + "\n")
      File.rename(file + '.tmp', file)
    end
  end

  # Only GET plus the two explicit metadata PATCH routes are available to the lane.
  class StoreMetadataAPI
    def initialize(credentials)
      require 'spaceship'
      path = File.realpath(credentials)
      raise Error, 'API credentials must be outside repository' if path.start_with?(REPO + '/')
      values = JSON.parse(File.read(path))
      raise Error, 'invalid credential configuration' unless values.keys.sort == %w[issuer_id key_id key_filepath].sort
      key = File.realpath(File.expand_path(values.fetch('key_filepath')))
      raise Error, 'API private key must be outside repository' if key.start_with?(REPO + '/')
      @token = Spaceship::ConnectAPI::Token.create(key_id: values.fetch('key_id'), issuer_id: values.fetch('issuer_id'), filepath: key)
    end

    def get(path)
      allowed = %r{\A/v1/(?:apps/\d+(?:/(?:appInfos|appStoreVersions))?|appInfos/[a-f0-9-]+/appInfoLocalizations|appStoreVersions/[a-f0-9-]+/(?:build|appStoreVersionLocalizations))\z}
      raise Error, 'unsupported metadata GET path' unless path.match?(allowed)
      request(Net::HTTP::Get, path)
    end

    def patch(type, id, attributes)
      allowed = { 'appInfoLocalizations' => StoreMetadata::INFO_FIELDS,
                  'appStoreVersionLocalizations' => StoreMetadata::VERSION_FIELDS }
      raise Error, 'unsupported metadata PATCH type/fields' unless allowed.key?(type) && id.match?(/\A[a-f0-9-]+\z/) && (attributes.keys - allowed[type].keys).empty?
      request(Net::HTTP::Patch, "/v1/#{type}/#{id}", { 'data' => { 'type' => type, 'id' => id, 'attributes' => attributes } })
    end

    def request(method, path, body = nil)
      uri = URI("https://api.appstoreconnect.apple.com#{path}")
      @token.refresh! if @token.expired?
      req = method.new(uri)
      req['Authorization'] = "Bearer #{@token.text}"
      req['Content-Type'] = 'application/json'
      req.body = JSON.generate(body) if body
      response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, open_timeout: 20, read_timeout: 60) { |http| http.request(req) }
      unless response.is_a?(Net::HTTPSuccess)
        codes = JSON.parse(response.body).fetch('errors', []).map { |item| item['code'] }.join(',') rescue 'UNKNOWN'
        raise Error, "App Store Connect HTTP #{response.code} (#{codes}); no request headers or credentials logged"
      end
      JSON.parse(response.body)
    end
    private :request
  end
end
