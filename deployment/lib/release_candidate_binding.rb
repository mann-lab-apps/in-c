require 'json'
require 'time'

module Deployment
  # Operator receipts associate an observation with one exact candidate. They are
  # attestations, not an automatic substitute for installing/hearing the build.
  class ReleaseCandidateBinding
    FIELDS = %w[format schemaVersion sourceCommit sourceFingerprintVersion sourceSha256 ipaSha256 bundleId appVersion buildNumber builtAtUtc distribution feedback].freeze
    RECEIPT_FIELDS = %w[reportSha256 sourceSha256 ipaSha256 observedAtUtc].freeze
    SHA = /\A[0-9a-f]{64}\z/

    def self.decode(raw)
      raise ArgumentError, 'candidate size' if raw.bytesize > 262_144
      value = JSON.parse(raw)
      raise ArgumentError, 'candidate fields' unless value.is_a?(Hash) && value.keys.sort == FIELDS.sort
      raise ArgumentError, 'candidate format' unless value['format'] == 'ddirori-play-release-candidate' && value['schemaVersion'].is_a?(Integer) && value['schemaVersion'] == 1
      raise ArgumentError, 'candidate fingerprint' unless value['sourceFingerprintVersion'].is_a?(Integer) && value['sourceFingerprintVersion'] == 2
      raise ArgumentError, 'candidate commit' unless value['sourceCommit'].is_a?(String) && value['sourceCommit'].match?(/\A[0-9a-f]{40}\z/)
      %w[sourceSha256 ipaSha256].each { |key| valid_sha!(value[key]) }
      raise ArgumentError, 'candidate identity' unless value['bundleId'] == 'com.mannlab.ddirori.play' && value['appVersion'].is_a?(String) && value['appVersion'].match?(/\A\d+\.\d+\.\d+\z/) && value['buildNumber'].is_a?(Integer) && value['buildNumber'].between?(1, 2_100_000_000)
      raise ArgumentError, 'candidate distribution' unless %w[app-store internal-testflight].include?(value['distribution'])
      built = timestamp!(value['builtAtUtc'])
      receipts = value['feedback']
      raise ArgumentError, 'candidate receipts' unless receipts.is_a?(Array) && receipts.length <= 100
      seen = []
      receipts.each do |receipt|
        raise ArgumentError, 'receipt fields' unless receipt.is_a?(Hash) && receipt.keys.sort == RECEIPT_FIELDS.sort
        %w[reportSha256 sourceSha256 ipaSha256].each { |key| valid_sha!(receipt[key]) }
        raise ArgumentError, 'receipt candidate' unless receipt['sourceSha256'] == value['sourceSha256'] && receipt['ipaSha256'] == value['ipaSha256']
        raise ArgumentError, 'receipt predates candidate' if timestamp!(receipt['observedAtUtc']) < built
        raise ArgumentError, 'duplicate receipt' if seen.include?(receipt['reportSha256'])
        seen << receipt['reportSha256']
      end
      value
    end

    def self.verify!(candidate, source:, ipa_sha256:, feedback_sha256:, now: Time.now.utc)
      raise ArgumentError, 'candidate identity mismatch' unless candidate.values_at('sourceCommit', 'bundleId', 'appVersion', 'buildNumber') == source.values_at('commit', 'bundle_id', 'version', 'build_number')
      raise ArgumentError, 'candidate IPA mismatch' unless candidate['ipaSha256'] == ipa_sha256
      raise ArgumentError, 'future candidate' if timestamp!(candidate['builtAtUtc']) > now
      supplied = candidate['feedback'].to_h { |receipt| [receipt['reportSha256'], receipt] }
      feedback_sha256.each do |digest|
        receipt = supplied.fetch(digest) { raise ArgumentError, 'missing candidate observation receipt' }
        raise ArgumentError, 'future observation' if timestamp!(receipt['observedAtUtc']) > now
      end
      true
    end

    def self.valid_sha!(value)
      raise ArgumentError, 'candidate hash' unless value.is_a?(String) && value.match?(SHA) && value != '0' * 64
    end

    def self.timestamp!(value)
      raise ArgumentError, 'candidate timestamp' unless value.is_a?(String) && value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\z/)
      Time.iso8601(value)
    end
  end
end
