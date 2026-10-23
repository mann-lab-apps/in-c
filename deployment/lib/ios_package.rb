require_relative 'ios_assets'
require 'uri'

module Deployment
  class IOSPackage
    GROUPS = %w[metadata declarations review testflight_app testflight media].freeze
    TEXT = {
      'name' => 30, 'subtitle' => 30, 'privacy_url' => 2048, 'privacy_choices_url' => 2048,
      'description' => 4000, 'keywords' => 100, 'promotional_text' => 170,
      'support_url' => 2048, 'marketing_url' => 2048, 'release_notes' => 4000
    }.freeze
    REQUIRED_TEXT = %w[name description keywords support_url privacy_url].freeze
    MANUAL = %w[privacy_labels export_compliance content_licenses accessibility pricing_availability agreements_tax_banking trader_status review_device_qa build_selection purchases_eula_app_clips].freeze
    attr_reader :data, :directory, :blockers, :prepared

    def initialize(path)
      @path = File.expand_path(path, ROOT)
      @directory = File.dirname(@path)
      @data = JSON.parse(File.read(@path))
      fields = %w[schema_version app app_id bundle_id expected_name version source_commit first_release devices locales metadata_dir declarations review testflight assets shot_plan manual]
      raise Error, 'invalid iOS package fields' unless (data.keys - %w[test_only content_reviewed]).sort == fields.sort && data['schema_version'] == 1
      raise Error, 'content_reviewed must be boolean' if data.key?('content_reviewed') && ![true, false].include?(data['content_reviewed'])
      raise Error, 'test_only must be boolean' if data.key?('test_only') && ![true, false].include?(data['test_only'])
      raise Error, 'invalid app slug' unless data['app'].is_a?(String) && data['app'].match?(/\A[a-z][a-z0-9_-]*\z/)
      raise Error, 'invalid app ID' unless data['app_id'].nil? || data['app_id'].match?(/\A\d+\z/)
      raise Error, 'invalid version/source' unless data['version'].match?(/\A\d+(?:\.\d+){1,2}\z/) && data['source_commit'].match?(/\A[0-9a-f]{40}\z/)
      raise Error, 'first_release must be boolean' unless [true, false].include?(data['first_release'])
      raise Error, 'invalid devices' unless data['devices'].is_a?(Array) && !data['devices'].empty? && (data['devices'] - %w[iphone ipad]).empty?
      raise Error, 'invalid locales' unless data['locales'].is_a?(Array) && !data['locales'].empty? && data['locales'].uniq == data['locales'] && data['locales'].all? { |v| v.match?(/\A[a-z]{2}(?:-[A-Za-z0-9]+)*\z/) }
      raise Error, 'invalid assets/manual' unless data['assets'].is_a?(Array) && data['manual'].is_a?(Hash) && data['manual'].keys.sort == MANUAL.sort
      @blockers = GROUPS.to_h { |group| [group, []] }.merge('manual' => [])
      @prepared = { 'metadata' => {}, 'assets' => [], 'declarations' => {}, 'review' => {}, 'testflight' => {} }
    end

    def path(relative) = Deployment.contained(directory, relative)
    def digest = Digest::SHA256.file(@path).hexdigest
    def block(group, reason) = blockers.fetch(group).push(reason)

    def prepare(private_details: nil, asset_probe: nil)
      block('metadata', 'metadata content requires review') if data['content_reviewed'] == false
      GROUPS.each { |group| block(group, 'App Store Connect app_id not configured') unless data['app_id'] }
      data['locales'].each do |locale|
        values = {}
        TEXT.each do |field, limit|
          file = File.join(path(data['metadata_dir']), locale, "#{field}.txt")
          next unless File.file?(file)
          value = File.read(file).strip
          block('metadata', "#{locale}.#{field}: empty/too long") if value.empty? || value.length > limit
          block('metadata', "#{locale}.#{field}: draft text") if value.match?(/\bDRAFT\b|초안|검수 필요|<[^>]+>/i)
          if field.end_with?('_url')
            uri = URI.parse(value) rescue nil
            block('metadata', "#{locale}.#{field}: valid HTTPS URL required") unless uri&.scheme == 'https' && uri.host && !uri.userinfo
          end
          values[field] = value
        end
        REQUIRED_TEXT.each { |field| block('metadata', "#{locale}.#{field}: missing") unless values[field] }
        block('metadata', "#{locale}.release_notes: missing for update") if !data['first_release'] && !values['release_notes']
        block('metadata', "#{locale}.release_notes: not accepted on first release") if data['first_release'] && values['release_notes']
        prepared['metadata'][locale] = values
      end
      copyright = File.join(path(data['metadata_dir']), 'copyright.txt')
      if File.file?(copyright) && !File.read(copyright).strip.empty?
        prepared['copyright'] = File.read(copyright).strip
      else
        block('metadata', 'copyright.txt required (actual rights owner)')
      end
      prepare_declarations
      prepare_private(private_details)
      prepare_assets(asset_probe)
      data['manual'].each do |item, value|
        raise Error, "invalid manual check: #{item}" unless value.is_a?(Hash) && value.keys.sort == %w[evidence status].sort
        block('manual', "#{item}: human confirmation/evidence required") unless %w[verified not_applicable].include?(value['status']) && value['evidence'].is_a?(String) && !value['evidence'].strip.empty?
      end
      self
    end

    def prepare_declarations
      value = data['declarations']
      raise Error, 'invalid declarations fields' unless value.is_a?(Hash) && value.keys.sort == %w[reviewed primary_category secondary_category content_rights age_rating].sort
      block('declarations', 'declarations require reviewed factual answers') unless value['reviewed'] == true
      block('declarations', 'primary_category required') unless value['primary_category'].is_a?(String) && !value['primary_category'].empty?
      block('declarations', 'content_rights required') unless %w[DOES_NOT_USE_THIRD_PARTY_CONTENT USES_THIRD_PARTY_CONTENT].include?(value['content_rights'])
      if value['age_rating'].is_a?(String)
        file = path(value['age_rating'])
        if File.file?(file)
          answers = JSON.parse(File.read(file))
          block('declarations', 'age-rating answers must be a nonempty object') unless answers.is_a?(Hash) && !answers.empty?
          if answers.is_a?(Hash)
            require_relative 'ios_release_api' unless defined?(IOSReleaseAPI)
            block('declarations', 'age-rating answers contain unsupported fields') unless (answers.keys - IOSReleaseAPI::AGE).empty?
            block('declarations', 'age-rating answers cannot contain null placeholders') if answers.values.any?(&:nil?)
          end
          prepared['declarations']['age_rating'] = answers
        else
          block('declarations', 'reviewed age-rating answers file missing')
        end
      else
        block('declarations', 'reviewed age-rating answers file required')
      end
      prepared['declarations'].merge!(value.reject { |k, _| %w[age_rating reviewed].include?(k) })
    end

    def prepare_private(file)
      private_values = {}
      if file
        real = File.realpath(file)
        raise Error, 'review contacts/demo credentials must be outside repository' if real.start_with?(REPO + '/')
        private_values = JSON.parse(File.read(real))
        raise Error, 'private details must be a JSON object' unless private_values.is_a?(Hash)
      end
      review = data['review']
      raise Error, 'invalid review fields' unless review.keys.sort == %w[demo_account_required notes_file reviewed].sort && [true, false].include?(review['demo_account_required'])
      block('review', 'review instructions require verification') unless review['reviewed'] == true
      fields = %w[contactFirstName contactLastName contactPhone contactEmail]
      fields += %w[demoAccountName demoAccountPassword] if review['demo_account_required']
      fields.each { |field| block('review', "private #{field} missing") if private_values[field].to_s.strip.empty? }
      notes = path(review['notes_file'])
      block('review', 'review notes missing') unless File.file?(notes)
      prepared['review'] = private_values.slice(*fields).merge('demoAccountRequired' => review['demo_account_required'])
      prepared['review']['notes'] = File.read(notes).strip if File.file?(notes)
      block('review', 'review notes must be nonempty and <=4000 characters') unless prepared['review']['notes'].is_a?(String) && prepared['review']['notes'].length.between?(1, 4000)
      block('review', 'review contact email invalid') unless prepared['review']['contactEmail'].to_s.match?(/\A[^\s@]+@[^\s@]+\.[^\s@]+\z/)
      tf = data['testflight']
      raise Error, 'invalid TestFlight fields' unless tf.keys.sort == %w[build_id description_file feedback_email reviewed test_notes_file].sort
      block('testflight', 'explicit TestFlight build_id required for What to Test') unless tf['build_id'].is_a?(String) && tf['build_id'].match?(/\A[a-f0-9-]+\z/)
      block('testflight_app', 'TestFlight information requires verification') unless tf['reviewed'] == true
      block('testflight_app', 'TestFlight feedback email missing') unless tf['feedback_email'].is_a?(String) && tf['feedback_email'].match?(/\A[^\s@]+@[^\s@]+\.[^\s@]+\z/)
      %w[description_file test_notes_file].each do |key|
        file = path(tf[key])
        group = key == 'description_file' ? 'testflight_app' : 'testflight'
        block(group, "TestFlight #{key} missing") unless File.file?(file) && !File.read(file).strip.empty?
        prepared['testflight'][key] = File.read(file).strip if File.file?(file)
      end
      prepared['testflight']['feedback_email'] = tf['feedback_email']
      prepared['testflight']['build_id'] = tf['build_id']
      video_url = private_values['testflightVideoURL']
      if video_url
        uri = URI.parse(video_url) rescue nil
        block('testflight_app', 'review video URL must be HTTPS with no embedded credentials') unless uri&.scheme == 'https' && uri.host && !uri.userinfo
        prepared['testflight']['review_video_url'] = video_url
      end
      blockers['testflight_app'].concat(blockers['review'].map { |s| "TestFlight review: #{s}" })
      blockers['testflight'].concat(blockers['testflight_app'])
    end

    def prepare_assets(probe)
      shots = JSON.parse(File.read(path(data['shot_plan'])))
      raise Error, 'shot plan must contain scenes' unless shots['scenes'].is_a?(Array)
      known = shots['scenes'].to_h { |scene| [scene.fetch('id'), scene] }
      if shots.dig('review_video', 'required') == true && !data['assets'].any? { |asset| asset['kind'] == 'review_attachment' && asset['scene'] == shots.dig('review_video', 'scene') }
        block('media', 'required reviewer demo video is missing from asset manifest')
      end
      if shots.dig('review_video', 'required') == true && !prepared['testflight']['review_video_url']
        block('testflight', 'required beta review video needs an accessible testflightVideoURL in private details; App Review attachments are a separate destination')
        block('testflight_app', 'required beta review video needs an accessible testflightVideoURL in private details; App Review attachments are a separate destination')
      end
      groups = data['assets'].group_by { |a| [a['kind'], a['locale'], a['display_type']] }
      groups.each do |(kind, _locale, _display), assets|
        limit = kind == 'screenshot' ? 10 : kind == 'preview' ? 3 : 99
        block('media', "#{kind}: asset count exceeds #{limit}") if assets.length > limit
        positions = assets.map { |a| a['position'] }
        block('media', "#{kind}: positions must be unique, contiguous, and start at 1") unless positions.all? { |n| n.is_a?(Integer) } && positions.sort == (1..assets.length).to_a
      end
      data['assets'].each do |asset|
        keys = %w[kind locale device display_type path position scene sha256 reviewed authentic source_commit]
        raise Error, 'invalid asset fields' unless (asset.keys - ['provenance']).sort == keys.sort && %w[screenshot preview review_attachment].include?(asset['kind'])
        raise Error, 'invalid asset locale/device' unless data['locales'].include?(asset['locale']) && data['devices'].include?(asset['device'])
        scene = known[asset['scene']]
        block('media', "#{asset['scene']}: scene is unknown or unverified") unless scene && scene['verified'] == true
        if asset.key?('provenance')
          origin = asset['provenance']
          valid_origin = origin.is_a?(Hash) && origin.keys.sort == %w[app_id asset_id type version].sort &&
            origin['type'] == 'app_store_connect_asset' && origin['app_id'].is_a?(String) && origin['app_id'].match?(/\A\d+\z/) &&
            origin['asset_id'].is_a?(String) && origin['asset_id'].match?(/\A[a-f0-9-]+\z/) &&
            origin['version'].is_a?(String) && origin['version'].match?(/\A\d+(?:\.\d+){1,2}\z/)
          block('media', "#{asset['scene']}: imported store screenshots are limited to test-only packages with explicit provenance") unless data['test_only'] == true && asset['kind'] == 'screenshot' && valid_origin
          block('media', "#{asset['scene']}: imported screenshot needs visual review and must not claim a verified capture commit") unless asset['reviewed'] == true && asset['authentic'] == false && asset['source_commit'].nil?
        else
          block('media', "#{asset['scene']}: authentic capture and visual review required") unless asset['reviewed'] == true && asset['authentic'] == true
          block('media', "#{asset['scene']}: capture source differs from release") unless asset['source_commit'] == data['source_commit']
        end
        file = path(asset['path'])
        unless File.file?(file)
          block('media', "#{asset['scene']}: media file missing (#{asset['path']})")
          next
        end
        begin
          metadata = IOSAssets.inspect_file(file, asset['kind'], asset['display_type'], probe: probe)
          block('media', "#{asset['scene']}: expected SHA256 missing/mismatched") unless metadata['sha256'] == asset['sha256']
          prepared['assets'] << asset.merge(metadata).merge('absolute_path' => file)
        rescue Error => error
          block('media', "#{asset['scene']}: #{error.message}")
        end
      end
      data['devices'].product(data['locales']).each do |device, locale|
        block('media', "#{locale}/#{device}: screenshots required") unless data['assets'].any? { |a| a['kind'] == 'screenshot' && a['device'] == device && a['locale'] == locale }
      end
    end

    def report
      { 'app' => data['app'], 'app_id' => data['app_id'], 'version' => data['version'],
        'test_only' => data['test_only'] == true,
        'manifest_sha256' => digest, 'information_complete' => blockers.values.all?(&:empty?),
        'blockers' => blockers, 'asset_count' => prepared['assets'].length,
        'submission_implemented' => false, 'release_implemented' => false }
    end
  end
end
