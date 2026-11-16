require 'json'

module Deployment
  # Mirrors the app's public codec. This parses observations, never creates them.
  class ReleaseCandidateFeedback
    FIELDS = %w[
      schemaVersion appVersion buildNumber platform deviceClass osMajor provider
      fixture format voiceOver dynamicType importOutcome playbackOutcome
      relaunchOutcome routes interruptionOutcome listening reproducibility severity
    ].freeze
    VALUES = {
      'platform' => %w[ios android], 'deviceClass' => %w[phone tablet],
      'provider' => %w[onDevice cloudDrive thirdParty notChecked],
      'fixture' => %w[movement1Wav movement1Aac movement1Alac userApproved notChecked],
      'format' => %w[wav aac alac mp3 flac ogg opus other],
      'voiceOver' => %w[passed issue notChecked],
      'dynamicType' => %w[passed issue notChecked],
      'importOutcome' => %w[passed issue notChecked],
      'playbackOutcome' => %w[passed issue notChecked],
      'relaunchOutcome' => %w[passed issue notChecked],
      'interruptionOutcome' => %w[passed issue notChecked],
      'listening' => %w[heard silentOrAbnormal notChecked],
      'reproducibility' => %w[always intermittent notReproduced notChecked],
      'severity' => %w[none p0 p1 p2 p3]
    }.freeze
    MUSIC = %w[queueReservation queueEditing queueModes queueRestoration favorites imslpPageReturn imslpImport imslpSourceConfirmation].freeze
    AUTOMATIC = %w[semantics decoderSignal nativeTransport simulatorLifecycle].freeze
    OUTCOMES = %w[passed issue notChecked].freeze
    PHYSICAL = %w[voiceOver dynamicType importOutcome playbackOutcome relaunchOutcome interruptionOutcome].freeze
    PRIVATE = %r{file:/{2}|/(?:Users|home|storage)/|/(?:private/)?var/(?:mobile|folders)/|\\|-----BEGIN|api[_-]?key|password|deviceId|fileName|trackTitle}i

    def self.decode(raw)
      raise ArgumentError, 'feedback size' if raw.bytesize > 16_384
      raise ArgumentError, 'private data' if raw.match?(PRIVATE)
      report = JSON.parse(raw)
      raise ArgumentError, 'feedback object' unless report.is_a?(Hash)
      version = report['schemaVersion']
      raise ArgumentError, 'feedback version' unless version.is_a?(Integer) && [1, 2].include?(version)
      fields = FIELDS + (version == 2 ? %w[musicActions automaticChecks] : [])
      raise ArgumentError, 'feedback fields' unless report.keys.sort == fields.sort
      raise ArgumentError, 'private data' if JSON.generate(report).match?(PRIVATE)
      raise ArgumentError, 'app version' unless report['appVersion'].is_a?(String) && report['appVersion'].match?(/\A\d+\.\d+\.\d+\z/)
      raise ArgumentError, 'build number' unless report['buildNumber'].is_a?(Integer) && report['buildNumber'].between?(1, 2_100_000_000)
      raise ArgumentError, 'os major' unless report['osMajor'].is_a?(Integer) && report['osMajor'].between?(1, 99)
      VALUES.each { |field, allowed| raise ArgumentError, 'feedback enum' unless allowed.include?(report[field]) }
      routes = report['routes']
      raise ArgumentError, 'feedback routes' unless routes.is_a?(Array) && !routes.empty? && routes.uniq == routes && (routes - %w[speaker wired bluetooth notChecked]).empty? && !(routes.include?('notChecked') && routes.length > 1)
      if version == 2
        { 'musicActions' => MUSIC, 'automaticChecks' => AUTOMATIC }.each do |field, keys|
          map = report[field]
          raise ArgumentError, 'feedback observations' unless map.is_a?(Hash) && map.keys.sort == keys.sort && map.values.all? { |value| OUTCOMES.include?(value) }
        end
      end
      report
    end

    def self.unverified?(report)
      PHYSICAL.any? { |field| report[field] == 'notChecked' } ||
        %w[provider fixture listening reproducibility].any? { |field| report[field] == 'notChecked' } ||
        report['routes'] == ['notChecked'] || report['schemaVersion'] == 1 ||
        report['musicActions'].values.include?('notChecked')
    end

    def self.user_issue?(report)
      PHYSICAL.any? { |field| report[field] == 'issue' } ||
        report['listening'] == 'silentOrAbnormal' ||
        (report['musicActions'] || {}).values.include?('issue')
    end
  end
end
