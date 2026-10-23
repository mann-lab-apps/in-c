require_relative 'ios_release_api'

module Deployment
  class IOSRelease
    MAP_INFO = { 'name' => 'name', 'subtitle' => 'subtitle', 'privacy_url' => 'privacyPolicyUrl', 'privacy_choices_url' => 'privacyChoicesUrl' }.freeze
    MAP_VERSION = { 'description' => 'description', 'keywords' => 'keywords', 'promotional_text' => 'promotionalText', 'support_url' => 'supportUrl', 'marketing_url' => 'marketingUrl', 'release_notes' => 'whatsNew' }.freeze
    attr_reader :package, :record, :output

    def initialize(package, api: nil, output_root: File.join(ROOT, 'output'))
      @package, @api, @output_root = package, api, output_root
    end

    def run(mode, sections: IOSPackage::GROUPS)
      raise Error, 'mode must be plan, validate, inspect, sync or verify' unless %w[plan validate inspect sync verify].include?(mode)
      raise Error, 'invalid release sections' unless sections.is_a?(Array) && !sections.empty? && (sections - IOSPackage::GROUPS).empty?
      sections = sections - ['testflight_app'] if sections.include?('testflight')
      @output = File.join(@output_root, package.data['app'], "#{Time.now.utc.strftime('%Y%m%dT%H%M%S')}-#{SecureRandom.hex(4)}")
      FileUtils.mkdir_p(output)
      key = package.data['app_id'] || package.data['app']
      File.open(File.join(@output_root, "store-#{key}.lock"), 'w') do |lock|
        raise Error, 'another store operation is using this app' unless lock.flock(File::LOCK_EX | File::LOCK_NB)
        @record = { 'action' => 'ios_release', 'app' => package.data['app'], 'mode' => mode, 'sections' => sections,
                    'started_at' => Time.now.utc.iso8601, 'status' => 'running', 'readiness' => package.report,
                    'operations' => [], 'binary_upload' => false, 'review_submission' => false, 'release' => false }
        record['source_commit'] = package.data['source_commit']
        record['pipeline_sha256'] = Digest::SHA256.hexdigest(%w[ios_release.rb ios_release_api.rb ios_package.rb ios_assets.rb].map { |name| Digest::SHA256.file(File.join(__dir__, name)).hexdigest }.join)
        record['test_only'] = package.data['test_only'] == true
        record['assets'] = package.prepared['assets'].map { |asset| asset.slice('kind', 'scene', 'locale', 'display_type', 'position', 'sha256', 'md5', 'bytes', 'width', 'height', 'duration', 'authentic', 'source_commit', 'provenance') }
        begin
          persist
          if mode == 'validate'
            raise Error, 'release information has blockers; see readiness report' unless package.report['information_complete']
          elsif %w[inspect sync verify].include?(mode)
            raise Error, 'remote API credentials required' unless @api
            context = resolve
            record['target'] = context.slice('app_id', 'info_id', 'version_id', 'version_state', 'release_type')
            if %w[sync verify].include?(mode)
              blocked = sections.flat_map { |section| package.blockers[section] }
              raise Error, 'selected sections have blockers; see readiness report' unless blocked.empty?
            end
            if mode == 'sync'
              # Resolve all selected resources and snapshot prior values before making changes.
              before = inventory(context, sections)
              preflight_remote(before, sections)
              record['before'] = sanitize(before)
              persist
              sections.each do |section|
                # Recheck draft identity/state immediately before each section.
                current = resolve
                raise Error, 'draft changed before update' unless current == context
                send("sync_#{section}", context, before)
              end
            end
            if %w[sync verify].include?(mode)
              after_context = resolve
              raise Error, 'draft identity/state/release settings changed' unless after_context == context
              after = inventory(context, sections)
              record['after'] = sanitize(after)
              record['verification'] = verify(after, sections)
              raise Error, 'release read-back differs or asset processing is incomplete' unless record['verification']['passed']
            else
              record['remote'] = sanitize(inventory(context, sections))
            end
          end
          record['status'] = %w[plan inspect].include?(mode) ? mode : 'passed'
        rescue StandardError => error
          record['status'] = 'failed'
          record['failure_class'] = error.class.name
          raise
        ensure
          record['finished_at'] = Time.now.utc.iso8601
          persist
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

    def resolve
      config = package.data
      app = @api.get("/v1/apps/#{config['app_id']}").fetch('data')
      expected_names = [config['expected_name']] + package.prepared['metadata'].values.filter_map { |l| l['name'] }
      raise Error, 'release app identity mismatch' unless app['id'] == config['app_id'] && app.dig('attributes', 'bundleId') == config['bundle_id'] && expected_names.include?(app.dig('attributes', 'name'))
      infos = @api.get("/v1/apps/#{app['id']}/appInfos").fetch('data').select { |row| row.dig('attributes', 'state') == 'PREPARE_FOR_SUBMISSION' }
      versions = @api.get("/v1/apps/#{app['id']}/appStoreVersions").fetch('data').select do |row|
        row.dig('attributes', 'platform') == 'IOS' && row.dig('attributes', 'versionString') == config['version'] &&
          (row.dig('attributes', 'appVersionState') || row.dig('attributes', 'appStoreState')) == 'PREPARE_FOR_SUBMISSION'
      end
      raise Error, 'one matching unsubmitted draft required' unless infos.length == 1 && versions.length == 1
      { 'app_id' => app['id'], 'info_id' => infos.first['id'], 'version_id' => versions.first['id'],
        'version_state' => 'PREPARE_FOR_SUBMISSION', 'release_type' => versions.first.dig('attributes', 'releaseType') }
    end

    def list(path) = @api.get(path).fetch('data')

    def inventory(context, sections)
      result = {}
      if sections.include?('metadata') || sections.include?('media')
        result['info_locales'] = list("/v1/appInfos/#{context['info_id']}/appInfoLocalizations")
        result['version_locales'] = list("/v1/appStoreVersions/#{context['version_id']}/appStoreVersionLocalizations")
        result['version'] = @api.get("/v1/appStoreVersions/#{context['version_id']}").fetch('data') if sections.include?('metadata')
      end
      if sections.include?('declarations')
        result['age_rating'] = @api.optional("/v1/appInfos/#{context['info_id']}/ageRatingDeclaration")
        result['app'] = @api.get("/v1/apps/#{context['app_id']}").fetch('data')
        result['info'] = list("/v1/apps/#{context['app_id']}/appInfos").find { |i| i['id'] == context['info_id'] }
      end
      if sections.include?('review') || sections.include?('media')
        result['review'] = @api.optional("/v1/appStoreVersions/#{context['version_id']}/appStoreReviewDetail")
      end
      if (sections & %w[testflight_app testflight]).any?
        result['beta_locales'] = list("/v1/apps/#{context['app_id']}/betaAppLocalizations")
        result['beta_review'] = @api.optional("/v1/apps/#{context['app_id']}/betaAppReviewDetail")
        build_id = package.prepared['testflight']['build_id']
        if sections.include?('testflight') && build_id
          owner = @api.get("/v1/builds/#{build_id}/app").fetch('data')
          raise Error, 'TestFlight build belongs to another app' unless owner['id'] == context['app_id']
          result['beta_build_locales'] = list("/v1/builds/#{build_id}/betaBuildLocalizations")
        end
      end
      if sections.include?('media')
        result['media'] = package.prepared['assets'].map do |asset|
          parent, type = asset_parent(asset, result)
          children = parent ? asset_children(type, parent) : []
          { 'scene' => asset['scene'], 'kind' => asset['kind'], 'locale' => asset['locale'], 'display_type' => asset['display_type'], 'parent' => parent, 'type' => type, 'children' => children }
        end
      end
      result
    end

    def desired(values, mapping) = mapping.to_h { |source, target| [target, values[source]] }.compact

    def preflight_remote(remote, sections)
      raise Error, 'age rating resource missing' if sections.include?('declarations') && !remote['age_rating']
      raise Error, 'TestFlight review resource missing; initialize in console' if (sections & %w[testflight_app testflight]).any? && !remote['beta_review']
      return unless sections.include?('media')
      package.prepared['assets'].each do |asset|
        if asset['kind'] == 'review_attachment' && !remote['review'] && !sections.include?('review')
          raise Error, 'review details must exist before attachment upload'
        end
        unless localization(remote['version_locales'], asset['locale']) || sections.include?('metadata')
          raise Error, 'metadata locale must exist before media upload'
        end
        item = remote['media'].find { |row| row.values_at('scene', 'kind', 'locale', 'display_type') == asset.values_at('scene', 'kind', 'locale', 'display_type') }
        next if asset['kind'] == 'review_attachment' || !item || item['children'].empty?
        existing = item['children'][asset['position'] - 1]
        if existing && existing.dig('attributes', 'sourceFileChecksum') != asset['md5']
          raise Error, 'remote media differs at a managed position; explicit reconciliation required'
        end
      end
    end

    def update(type, resource, attributes)
      delta = attributes.reject { |key, value| resource.fetch('attributes', {})[key] == value }
      return if delta.empty?
      operation(type, resource['id']) { @api.patch(type, resource['id'], delta) }
    end

    def operation(type, id)
      row = { 'type' => type, 'id' => id, 'status' => 'attempted' }
      record['operations'] << row
      persist
      result = yield
      row['status'] = 'completed'
      row['id'] ||= result['id'] if result.is_a?(Hash)
      persist
      result
    end

    def localization(rows, locale) = rows.find { |row| row.dig('attributes', 'locale') == locale }

    def sync_metadata(context, before)
      update('appStoreVersions', before['version'], { 'copyright' => package.prepared.fetch('copyright') })
      package.prepared['metadata'].each do |locale, values|
        [['appInfoLocalizations', 'info_locales', MAP_INFO, context['info_id']],
         ['appStoreVersionLocalizations', 'version_locales', MAP_VERSION, context['version_id']]].each do |type, key, mapping, parent|
          attributes = desired(values, mapping)
          existing = localization(before[key], locale)
          if existing
            update(type, existing, attributes)
          else
            operation(type, nil) { @api.create(type, parent, attributes.merge('locale' => locale)) }
          end
        end
      end
    end

    def sync_declarations(context, before)
      value = package.prepared['declarations']
      raise Error, 'age rating resource missing' unless before['age_rating']
      update('apps', before['app'], { 'contentRightsDeclaration' => value['content_rights'] })
      relationships = before['info'].fetch('relationships', {})
      if relationships.dig('primaryCategory', 'data', 'id') != value['primary_category'] || (value['secondary_category'] && relationships.dig('secondaryCategory', 'data', 'id') != value['secondary_category'])
        operation('appInfos.categories', context['info_id']) { @api.categories(context['info_id'], value['primary_category'], value['secondary_category']) }
      end
      update('ageRatingDeclarations', before['age_rating'], value['age_rating'])
    end

    def sync_review(context, before)
      values = package.prepared['review']
      if before['review']
        update('appStoreReviewDetails', before['review'], values)
      else
        operation('appStoreReviewDetails', nil) { @api.create('appStoreReviewDetails', context['version_id'], values) }
      end
    end

    def sync_testflight_app(context, before)
      raise Error, 'TestFlight review resource missing; initialize in console' unless before['beta_review']
      values = package.prepared['testflight']
      package.data['locales'].each do |locale|
        attrs = { 'description' => values['description_file'], 'feedbackEmail' => values['feedback_email'] }
        existing = localization(before['beta_locales'], locale)
        if existing
          update('betaAppLocalizations', existing, attrs)
        else
          operation('betaAppLocalizations', nil) { @api.create('betaAppLocalizations', context['app_id'], attrs.merge('locale' => locale)) }
        end
      end
      review = package.prepared['review'].merge('notes' => beta_review_notes)
      update('betaAppReviewDetails', before['beta_review'], review)
    end

    def sync_testflight(context, before)
      sync_testflight_app(context, before)
      values = package.prepared['testflight']
      package.data['locales'].each do |locale|
        attrs = { 'whatsNew' => values['test_notes_file'] }
        existing = localization(before['beta_build_locales'], locale)
        if existing
          update('betaBuildLocalizations', existing, attrs)
        else
          operation('betaBuildLocalizations', nil) { @api.create('betaBuildLocalizations', values['build_id'], attrs.merge('locale' => locale)) }
        end
      end
    end

    def asset_parent(asset, inventory)
      return [inventory['review']&.fetch('id'), 'appStoreReviewAttachments'] if asset['kind'] == 'review_attachment'
      locale = localization(inventory['version_locales'], asset['locale'])
      return [nil, nil] unless locale
      set_type = asset['kind'] == 'screenshot' ? 'appScreenshotSets' : 'appPreviewSets'
      field = asset['kind'] == 'screenshot' ? 'screenshotDisplayType' : 'previewType'
      sets = list("/v1/appStoreVersionLocalizations/#{locale['id']}/#{set_type}")
      set = sets.find { |row| row.dig('attributes', field) == asset['display_type'] }
      [set&.fetch('id'), asset['kind'] == 'screenshot' ? 'appScreenshots' : 'appPreviews']
    end

    def asset_children(type, parent)
      container = { 'appScreenshots' => 'appScreenshotSets', 'appPreviews' => 'appPreviewSets', 'appStoreReviewAttachments' => 'appStoreReviewDetails' }.fetch(type)
      list("/v1/#{container}/#{parent}/#{type}")
    end

    def sync_media(context, _before)
      current = inventory(context, %w[media])
      package.prepared['assets'].sort_by { |asset| [asset['kind'], asset['locale'], asset['display_type'].to_s, asset['position']] }.each do |asset|
        # Recheck bytes immediately before reservation, never trust a stale validation hash.
        raise Error, 'asset changed after preparation' unless Digest::SHA256.file(asset['absolute_path']).hexdigest == asset['sha256']
        parent, type = asset_parent(asset, current)
        unless parent
          raise Error, 'review detail/locale missing for attachment' if asset['kind'] == 'review_attachment'
          locale = localization(current['version_locales'], asset['locale'])
          raise Error, 'metadata locale must exist before media upload' unless locale
          set_type = asset['kind'] == 'screenshot' ? 'appScreenshotSets' : 'appPreviewSets'
          field = asset['kind'] == 'screenshot' ? 'screenshotDisplayType' : 'previewType'
          set = operation(set_type, nil) { @api.create(set_type, locale['id'], { field => asset['display_type'] }) }
          parent = set['id']
        end
        existing = asset_children(type, parent)
        match = existing.find { |row| row.dig('attributes', 'sourceFileChecksum') == asset['md5'] }
        next if match
        # Never delete or reorder unrelated remote assets. A conflict requires a reviewed migration.
        if asset['kind'] != 'review_attachment' && existing.length != asset['position'] - 1
          raise Error, 'remote media order differs; explicit reconciliation required'
        end
        attrs = { 'fileSize' => asset['bytes'], 'fileName' => File.basename(asset['absolute_path']) }
        reserved = operation(type, nil) { @api.create(type, parent, attrs) }
        @api.upload_operations(reserved.fetch('attributes').fetch('uploadOperations'), asset['absolute_path'])
        operation("#{type}.commit", reserved['id']) { @api.patch(type, reserved['id'], { 'uploaded' => true, 'sourceFileChecksum' => asset['md5'] }) }
      end
    end

    def verify(remote, sections)
      differences = []
      if sections.include?('metadata')
        differences << 'copyright' unless remote['version'].dig('attributes', 'copyright') == package.prepared['copyright']
        package.prepared['metadata'].each do |locale, values|
          [['info_locales', MAP_INFO], ['version_locales', MAP_VERSION]].each do |key, mapping|
            actual = localization(remote[key], locale)
            desired(values, mapping).each { |field, value| differences << "#{locale}.#{field}" unless actual&.dig('attributes', field) == value }
          end
        end
      end
      if sections.include?('declarations')
        values = package.prepared['declarations']
        differences << 'content_rights' unless remote['app'].dig('attributes', 'contentRightsDeclaration') == values['content_rights']
        differences << 'primary_category' unless remote['info'].dig('relationships', 'primaryCategory', 'data', 'id') == values['primary_category']
        differences << 'secondary_category' if values['secondary_category'] && remote['info'].dig('relationships', 'secondaryCategory', 'data', 'id') != values['secondary_category']
        values['age_rating'].each { |key, value| differences << "age_rating.#{key}" unless remote['age_rating']&.dig('attributes', key) == value }
      end
      if sections.include?('review')
        package.prepared['review'].each { |key, value| differences << "review.#{key}" unless remote['review']&.dig('attributes', key) == value }
      end
      if (sections & %w[testflight_app testflight]).any?
        values = package.prepared['testflight']
        package.data['locales'].each do |locale|
          actual = localization(remote['beta_locales'], locale)
          differences << "#{locale}.beta_description" unless actual&.dig('attributes', 'description') == values['description_file']
          differences << "#{locale}.feedbackEmail" unless actual&.dig('attributes', 'feedbackEmail') == values['feedback_email']
          if sections.include?('testflight')
            notes = localization(remote['beta_build_locales'], locale)
            differences << "#{locale}.what_to_test" unless notes&.dig('attributes', 'whatsNew') == values['test_notes_file']
          end
        end
        expected = package.prepared['review'].merge('notes' => beta_review_notes)
        expected.each { |key, value| differences << "beta_review.#{key}" unless remote['beta_review']&.dig('attributes', key) == value }
      end
      if sections.include?('media')
        package.prepared['assets'].each do |asset|
          item = remote['media'].find { |row| row.values_at('scene', 'kind', 'locale', 'display_type') == asset.values_at('scene', 'kind', 'locale', 'display_type') }
          children = item&.fetch('children', []) || []
          uploaded = if asset['kind'] == 'review_attachment'
                       children.find { |row| row.dig('attributes', 'sourceFileChecksum') == asset['md5'] }
                     else
                       children[asset['position'] - 1]
                     end
          differences << "asset.#{asset['scene']}.order_or_checksum" unless uploaded&.dig('attributes', 'sourceFileChecksum') == asset['md5']
          differences << "asset.#{asset['scene']}.missing_or_processing" unless uploaded&.dig('attributes', 'assetDeliveryState', 'state') == 'COMPLETE'
        end
      end
      { 'passed' => differences.empty?, 'differences' => differences }
    end

    def sanitize(value)
      case value
      when Hash
        value.to_h { |key, item| [key, %w[demoAccountPassword demoAccountName contactEmail contactPhone contactFirstName contactLastName uploadOperations].include?(key) ? '[redacted]' : sanitize(item)] }
      when Array then value.map { |item| sanitize(item) }
      else value
      end
    end

    def beta_review_notes
      values = package.prepared['testflight']
      [package.prepared['review']['notes'], values['test_notes_file'],
       values['review_video_url'] ? "Review demo video: #{values['review_video_url']}" : nil].compact.join("\n\n")
    end

    def persist
      file = File.join(output, 'result.json')
      File.write(file + '.tmp', JSON.pretty_generate(record) + "\n")
      File.rename(file + '.tmp', file)
    end
  end
end
