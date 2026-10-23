require_relative 'store_metadata'
require_relative 'ios_package'

module Deployment
  class IOSReleaseAPI < StoreMetadataAPI
    REVIEW = %w[contactFirstName contactLastName contactPhone contactEmail demoAccountRequired demoAccountName demoAccountPassword notes].freeze
    INFO = %w[name subtitle privacyPolicyUrl privacyChoicesUrl].freeze
    VERSION = %w[description keywords promotionalText supportUrl marketingUrl whatsNew].freeze
    AGE = %w[advertising ageAssurance ageRatingOverrideV2 alcoholTobaccoOrDrugUseOrReferences contests developerAgeRatingInfoUrl gambling gamblingSimulated gunsOrOtherWeapons healthOrWellnessTopics horrorOrFearThemes kidsAgeBand koreaAgeRatingOverride lootBox matureOrSuggestiveThemes medicalOrTreatmentInformation messagingAndChat parentalControls profanityOrCrudeHumor sexualContentGraphicAndNudity sexualContentOrNudity socialMedia socialMediaAgeRestricted unrestrictedWebAccess userGeneratedContent violenceCartoonOrFantasy violenceRealisticProlongedGraphicOrSadistic violenceRealistic].freeze
    PATCH = {
      'appInfoLocalizations' => INFO, 'appStoreVersionLocalizations' => VERSION,
      'appStoreVersions' => %w[copyright],
      'apps' => %w[contentRightsDeclaration], 'ageRatingDeclarations' => AGE,
      'appStoreReviewDetails' => REVIEW, 'betaAppReviewDetails' => REVIEW,
      'betaAppLocalizations' => %w[description feedbackEmail marketingUrl privacyPolicyUrl],
      'betaBuildLocalizations' => %w[whatsNew],
      'appScreenshots' => %w[uploaded sourceFileChecksum],
      'appPreviews' => %w[uploaded sourceFileChecksum],
      'appStoreReviewAttachments' => %w[uploaded sourceFileChecksum]
    }.freeze
    PARENTS = {
      'appInfoLocalizations' => ['appInfo', 'appInfos'],
      'appStoreVersionLocalizations' => ['appStoreVersion', 'appStoreVersions'],
      'appStoreReviewDetails' => ['appStoreVersion', 'appStoreVersions'],
      'betaAppLocalizations' => ['app', 'apps'], 'betaBuildLocalizations' => ['build', 'builds'],
      'appScreenshotSets' => ['appStoreVersionLocalization', 'appStoreVersionLocalizations'],
      'appPreviewSets' => ['appStoreVersionLocalization', 'appStoreVersionLocalizations'],
      'appScreenshots' => ['appScreenshotSet', 'appScreenshotSets'],
      'appPreviews' => ['appPreviewSet', 'appPreviewSets'],
      'appStoreReviewAttachments' => ['appStoreReviewDetail', 'appStoreReviewDetails']
    }.freeze

    def get(path)
      # Resource allowlist: no submissions, release requests, pricing or territory mutation routes.
      allowed = %r{\A/v1/(?:apps/\d+(?:/(?:appInfos|appStoreVersions|betaAppLocalizations|betaAppReviewDetail))?|appInfos/[a-f0-9-]+/(?:appInfoLocalizations|ageRatingDeclaration)|appStoreVersions/[a-f0-9-]+(?:/(?:appStoreVersionLocalizations|appStoreReviewDetail|build))?|appStoreVersionLocalizations/[a-f0-9-]+/(?:appScreenshotSets|appPreviewSets)|appScreenshotSets/[a-f0-9-]+/appScreenshots|appPreviewSets/[a-f0-9-]+/appPreviews|appStoreReviewDetails/[a-f0-9-]+/appStoreReviewAttachments|(?:appScreenshots|appPreviews|appStoreReviewAttachments)/[a-f0-9-]+|builds/[a-f0-9-]+/(?:app|betaBuildLocalizations))\z}
      raise Error, 'unsupported iOS release GET path' unless path.match?(allowed)
      # Apple omits category relationship data unless explicitly included. Keep the
      # caller path allowlist strict and request only the two managed relationships.
      path += '?include=primaryCategory,secondaryCategory' if path.match?(%r{\A/v1/apps/\d+/appInfos\z})
      request(Net::HTTP::Get, path)
    end

    def optional(path)
      get(path).fetch('data')
    rescue Error => error
      raise unless error.message.start_with?('App Store Connect HTTP 404 ')
      nil
    end

    def patch(type, id, attributes)
      raise Error, 'unsupported iOS release PATCH fields' unless PATCH.key?(type) && (attributes.keys - PATCH[type]).empty? && id.match?(/\A[a-f0-9-]+\z/)
      request(Net::HTTP::Patch, "/v1/#{type}/#{id}", { 'data' => { 'type' => type, 'id' => id, 'attributes' => attributes } }).fetch('data')
    end

    def create(type, parent_id, attributes)
      relationship, parent_type = PARENTS.fetch(type) { raise Error, 'unsupported iOS release create type' }
      fields = PATCH[type] || { 'appScreenshotSets' => %w[screenshotDisplayType], 'appPreviewSets' => %w[previewType] }[type]
      fields = fields + ['locale'] if type.end_with?('Localizations')
      fields = %w[fileSize fileName] if %w[appScreenshots appPreviews appStoreReviewAttachments].include?(type)
      raise Error, 'unsupported create attributes' unless (attributes.keys - fields).empty? && parent_id.match?(/\A[a-f0-9-]+\z/)
      body = { 'data' => { 'type' => type, 'attributes' => attributes,
                          'relationships' => { relationship => { 'data' => { 'type' => parent_type, 'id' => parent_id } } } } }
      request(Net::HTTP::Post, "/v1/#{type}", body).fetch('data')
    end

    def categories(info_id, primary, secondary)
      relations = { 'primaryCategory' => { 'data' => { 'type' => 'appCategories', 'id' => primary } } }
      relations['secondaryCategory'] = { 'data' => { 'type' => 'appCategories', 'id' => secondary } } if secondary
      request(Net::HTTP::Patch, "/v1/appInfos/#{info_id}", { 'data' => { 'type' => 'appInfos', 'id' => info_id, 'relationships' => relations } }).fetch('data')
    end

    def upload_operations(operations, path)
      File.open(path, 'rb') do |file|
        operations.each do |op|
          uri = URI(op.fetch('url'))
          allowed_host = %w[apple.com mzstatic.com icloud.com amazonaws.com].any? { |host| uri.host == host || uri.host&.end_with?(".#{host}") }
          raise Error, 'unsupported delegated asset upload URL/method' unless uri.scheme == 'https' && allowed_host && !uri.userinfo && op['method'] == 'PUT'
          offset, length = op.values_at('offset', 'length')
          raise Error, 'invalid asset upload range' unless offset.is_a?(Integer) && length.is_a?(Integer) && offset >= 0 && length.positive? && offset + length <= file.size
          file.seek(offset)
          req = Net::HTTP::Put.new(uri)
          op.fetch('requestHeaders').each { |header| req[header.fetch('name')] = header.fetch('value') }
          # App Store Connect's JWT is never forwarded to the delegated storage host.
          req.body = file.read(length)
          response = upload_request(uri, req)
          raise Error, "asset upload HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)
        end
      end
    end

    def upload_request(uri, req)
      Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, open_timeout: 20, read_timeout: 60) { |http| http.request(req) }
    end
    private :upload_request
  end
end
