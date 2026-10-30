require 'ipaddr'
require 'json'
require 'open3'
require 'time'
require 'uri'
require_relative 'ios_metadata'

module Deployment
  class IOSReleasePreflight
    STATUSES = %w[pass warning blocked fail].freeze
    FEEDBACK_FIELDS = %w[
      schemaVersion appVersion buildNumber platform deviceClass osMajor provider
      fixture format voiceOver dynamicType importOutcome playbackOutcome
      relaunchOutcome routes interruptionOutcome listening reproducibility severity
    ].freeze
    FEEDBACK_VALUES = {
      'platform' => %w[ios android],
      'deviceClass' => %w[phone tablet],
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
    REVIEW_CONTACT_FIELDS = %w[
      contactFirstName contactLastName contactPhone contactEmail
    ].freeze
    MANUAL_LABELS = {
      'privacy_labels' => '개인정보 설문',
      'export_compliance' => '수출 규정',
      'content_licenses' => '콘텐츠 권리',
      'accessibility' => '접근성',
      'pricing_availability' => '가격·배포 지역',
      'agreements_tax_banking' => '계약·세금·금융',
      'trader_status' => 'trader status',
      'review_device_qa' => '실기기 QA',
      'build_selection' => 'build 선택',
      'purchases_eula_app_clips' => '구매·EULA·App Clips'
    }.freeze

    attr_reader :data, :issues

    def initialize(manifest:, artifact: nil, feedback: [], review_details: nil)
      @metadata = IOSMetadata.new(manifest)
      @data = @metadata.data
      @app = Deployment.contained(REPO, data.dig('source', 'path'))
      @artifact = artifact && File.expand_path(artifact, ROOT)
      @feedback = Array(feedback).map { |path| File.expand_path(path, ROOT) }
      details_reference = review_details || ENV[data.dig('secrets', 'review_details_env')]
      @review_details = details_reference && File.expand_path(details_reference, ROOT)
      @issues = []
    end

    def run
      check_source_contract
      check_public_urls
      check_icons
      check_privacy_and_capabilities
      check_sensitive_source
      check_release_inputs
      check_review_contact
      check_feedback
      check_artifact
      counts = STATUSES.to_h { |status| [status, issues.count { |issue| issue['status'] == status }] }
      {
        'schema_version' => 1,
        'app' => data['app'],
        'version' => "#{data.dig('source', 'version')}+#{data.dig('source', 'build_number')}",
        'generated_at' => Time.now.utc.iso8601,
        'counts' => counts,
        'internal_beta_ready' => counts['fail'].zero?,
        'testflight_ready' => counts['fail'].zero? && counts['blocked'].zero?,
        'app_store_ready' => counts['fail'].zero? && counts['blocked'].zero? && counts['warning'].zero?,
        'issues' => issues
      }
    end

    def self.public_https_url?(value)
      return false unless value.is_a?(String) && !value.strip.empty?
      uri = URI.parse(value.strip)
      return false unless uri.scheme == 'https' && uri.host && !uri.userinfo
      host = uri.host.downcase
      return false if host == 'localhost' || host.end_with?('.local', '.invalid', '.test', '.example')
      begin
        address = IPAddr.new(host)
        return false if address.loopback? || address.private? || address.link_local?
      rescue IPAddr::InvalidAddressError
        nil
      end
      true
    rescue URI::InvalidURIError
      false
    end

    def self.text(report)
      labels = { 'pass' => 'PASS', 'warning' => 'WARNING', 'blocked' => 'BLOCKED', 'fail' => 'FAIL' }
      lines = ["#{report['app']} #{report['version']} 출시 사전 점검"]
      report['issues'].each do |issue|
        lines << "[#{labels.fetch(issue['status'])}] #{issue['message']}"
      end
      counts = report['counts']
      lines << "요약: PASS #{counts['pass']}, WARNING #{counts['warning']}, BLOCKED #{counts['blocked']}, FAIL #{counts['fail']}"
      lines << "내부 베타: #{report['internal_beta_ready'] ? '가능' : '불가'}"
      lines << "TestFlight: #{report['testflight_ready'] ? '준비됨' : '준비되지 않음'}"
      lines << "App Store: #{report['app_store_ready'] ? '준비됨' : '준비되지 않음'}"
      lines.join("\n") + "\n"
    end

    private

    def add(status, code, message, details = nil)
      raise Error, 'invalid preflight status' unless STATUSES.include?(status)
      issue = { 'status' => status, 'code' => code, 'message' => message }
      issue['details'] = details if details
      issues << issue
    end

    def app_file(relative)
      Deployment.contained(@app, relative)
    end

    def read(relative)
      File.read(app_file(relative))
    end

    def plist(relative)
      stdout, _stderr, status = Open3.capture3('plutil', '-convert', 'json', '-o', '-', app_file(relative))
      raise Error, "#{relative} plist를 읽을 수 없습니다" unless status.success?
      JSON.parse(stdout)
    end

    def check_source_contract
      source = data['source']
      expected_version = "#{source['version']}+#{source['build_number']}"
      pubspec = read('pubspec.yaml')
      if pubspec.match?(/^version:\s*#{Regexp.escape(expected_version)}\s*$/)
        add('pass', 'source.version', 'pubspec과 배포 metadata의 버전·빌드가 일치합니다.')
      else
        add('fail', 'source.version', 'pubspec과 배포 metadata의 버전·빌드가 다릅니다.')
      end
      defines = source['dart_defines']
      if defines['ENABLE_DEMO_LIBRARY'] == 'false'
        add('pass', 'source.demo', 'production 기본 실행에서 데모 라이브러리가 비활성입니다.')
      else
        add('fail', 'source.demo', 'ENABLE_DEMO_LIBRARY는 production에서 false여야 합니다.')
      end
      expected_label = "#{source['version']} (#{source['build_number']})"
      if defines['APP_VERSION_LABEL'] == expected_label
        add('pass', 'source.label', '앱 버전 표시와 배포 버전이 일치합니다.')
      else
        add('fail', 'source.label', 'APP_VERSION_LABEL과 배포 버전이 다릅니다.')
      end
      project = read('ios/Runner.xcodeproj/project.pbxproj')
      if project.include?("PRODUCT_BUNDLE_IDENTIFIER = #{source['bundle_id']};") &&
         data.dig('store', 'bundle_id') == source['bundle_id']
        add('pass', 'identity.bundle', 'iOS bundle ID가 source·store·Xcode에서 일치합니다.')
      else
        add('fail', 'identity.bundle', 'iOS bundle ID가 source·store·Xcode에서 일치하지 않습니다.')
      end
      info = plist('ios/Runner/Info.plist')
      expected_name = data.dig('store', 'expected_name')
      if [info['CFBundleDisplayName'], info['CFBundleName'], data.dig('content', 'locales', 'ko', 'name')].all? { |name| name == expected_name }
        add('pass', 'identity.name', '앱 표시명이 띠로리 플레이로 일치합니다.')
      else
        add('fail', 'identity.name', '앱 표시명이 native 설정과 metadata에서 다릅니다.')
      end
    end

    def check_public_urls
      data.dig('content', 'locales').each do |locale, values|
        %w[privacy_url support_url].each do |field|
          value = values[field]
          if value.nil? || value.to_s.strip.empty?
            add('blocked', "url.#{locale}.#{field}", "#{locale} #{field} 공개 HTTPS 주소가 필요합니다.")
          elsif self.class.public_https_url?(value)
            add('pass', "url.#{locale}.#{field}", "#{locale} #{field}가 공개 HTTPS 주소입니다.")
          else
            add('fail', "url.#{locale}.#{field}", "#{locale} #{field}가 안전한 공개 HTTPS 주소가 아닙니다.")
          end
        end
      end
    end

    def check_icons
      directory = app_file('ios/Runner/Assets.xcassets/AppIcon.appiconset')
      contents = JSON.parse(File.read(File.join(directory, 'Contents.json')))
      missing = contents.fetch('images').filter_map do |image|
        filename = image['filename']
        filename unless filename && File.file?(File.join(directory, filename))
      end
      if missing.empty? && contents['images'].all? { |image| image['filename'] }
        add('pass', 'icon.slots', 'AppIcon의 선언된 iPhone·iPad·marketing 슬롯 파일이 모두 존재합니다.')
      else
        add('fail', 'icon.slots', 'AppIcon 슬롯 파일이 누락되었습니다.', { 'count' => missing.length })
      end
      marketing = contents['images'].find { |image| image['idiom'] == 'ios-marketing' }
      file = marketing && File.join(directory, marketing['filename'].to_s)
      if file && File.file?(file)
        stdout, _stderr, status = Open3.capture3('sips', '-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', file)
        valid = status.success? && stdout.include?('pixelWidth: 1024') && stdout.include?('pixelHeight: 1024') && stdout.include?('hasAlpha: no')
        add(valid ? 'pass' : 'fail', 'icon.marketing', valid ? '1024px App Store 아이콘은 불투명합니다.' : '1024px App Store 아이콘의 크기 또는 alpha를 수정해야 합니다.')
      else
        add('fail', 'icon.marketing', '1024px App Store 아이콘이 없습니다.')
      end
      readme = read('README.md')
      if readme.match?(/사용자가.{0,100}아이콘.{0,100}최종 아이콘으로 승인했다/)
        add('pass', 'icon.approval', '현재 Play 아이콘의 사용자 승인 기록이 제품 문서에 있습니다. 실기기·스토어 자산 검수는 별도입니다.')
      elsif readme.match?(/아이콘.*(?:임시|최종.*승인)|(?:임시|미승인).*아이콘/)
        add('blocked', 'icon.approval', '현재 아이콘은 기술 규격을 통과했지만 최종 디자인 승인이 필요합니다.')
      else
        add('warning', 'icon.approval', '최종 아이콘 승인 근거를 배포 기록에서 확인해야 합니다.')
      end
    end

    def check_privacy_and_capabilities
      privacy_path = app_file('ios/Runner/PrivacyInfo.xcprivacy')
      project = read('ios/Runner.xcodeproj/project.pbxproj')
      if File.file?(privacy_path) && project.scan('PrivacyInfo.xcprivacy').length >= 3
        privacy = plist('ios/Runner/PrivacyInfo.xcprivacy')
        types = Array(privacy['NSPrivacyAccessedAPITypes'])
        reasons = types.filter_map do |entry|
          next unless entry['NSPrivacyAccessedAPIType'] == 'NSPrivacyAccessedAPICategoryFileTimestamp'
          entry['NSPrivacyAccessedAPITypeReasons']
        end.flatten
        valid = privacy['NSPrivacyTracking'] == false && Array(privacy['NSPrivacyCollectedDataTypes']).empty? && %w[C617.1 3B52.1].all? { |reason| reasons.include?(reason) }
        add(valid ? 'pass' : 'fail', 'privacy.manifest', valid ? '앱 privacy manifest가 tracking·수집 없음과 FileTimestamp 이유를 선언합니다.' : '앱 privacy manifest 선언이 현재 개인정보 계약과 다릅니다.')
      else
        add('fail', 'privacy.manifest', 'PrivacyInfo.xcprivacy가 Runner resource에 포함되지 않았습니다.')
      end
      info = plist('ios/Runner/Info.plist')
      forbidden = info.keys.grep(/UsageDescription$/)
      expected_modes = data['app'] == 'classical-local-library' ? ['audio'] : []
      background_valid = info.fetch('UIBackgroundModes', []) == expected_modes
      ats = info.dig('NSAppTransportSecurity', 'NSAllowsArbitraryLoads') == true
      if forbidden.empty? && background_valid && !ats
        add('pass', 'privacy.permissions', 'iOS 권한·background mode가 앱 계약과 일치하며 ATS 전면 허용이 없습니다.')
      else
        add('fail', 'privacy.permissions', '불필요하거나 전면 허용된 iOS capability를 검토해야 합니다.')
      end
      entitlements = Dir.glob(File.join(@app, 'ios/**/*.entitlements'))
      add(entitlements.empty? ? 'pass' : 'warning', 'privacy.entitlements', entitlements.empty? ? '앱 전용 entitlement 파일이 없습니다.' : '앱 entitlement를 수동 검토해야 합니다.')
      android = read('android/app/src/main/AndroidManifest.xml')
      if !android.include?('usesCleartextTraffic="true"') && !android.include?('android.permission.RECORD_AUDIO')
        add('pass', 'privacy.android', 'Android cleartext 전면 허용과 사용하지 않는 마이크 권한이 없습니다.')
      else
        add('fail', 'privacy.android', 'Android 네트워크 또는 민감 권한 설정을 검토해야 합니다.')
      end
    end

    def check_sensitive_source
      text_extensions = %w[.dart .swift .m .mm .h .plist .xcprivacy .pbxproj .xml .gradle .kts .properties]
      files = Dir.glob(File.join(@app, '{lib,ios,android}/**/*')).select do |file|
        File.file?(file) && text_extensions.include?(File.extname(file)) && File.size(file) < 2_000_000
      end
      source = files.filter_map do |file|
        File.read(file, mode: 'rb').encode('UTF-8', invalid: :replace, undef: :replace)
      rescue StandardError
        nil
      end.join("\n")
      secrets = source.match?(/-----BEGIN .*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z_-]{20,}/)
      paths = source.match?(%r{/Users/[A-Za-z0-9._-]+/|/home/[A-Za-z0-9._-]+/})
      add(secrets ? 'fail' : 'pass', 'source.secrets', secrets ? '제품 소스에서 비밀값 형태가 발견되었습니다.' : '제품 소스에서 알려진 API key·private key 형태가 발견되지 않았습니다.')
      add(paths ? 'fail' : 'pass', 'source.paths', paths ? '제품 소스에 개발자 절대 경로가 포함되어 있습니다.' : '제품 소스에 개발자 절대 경로가 포함되어 있지 않습니다.')
    end

    def check_release_inputs
      source = data['source']
      add(source['state'] == 'pinned' ? 'pass' : 'blocked', 'checkpoint.source', source['state'] == 'pinned' ? '제품 source checkpoint가 고정되었습니다.' : '커밋된 제품 source checkpoint를 확정해야 합니다.')
      add(data.dig('content', 'reviewed') ? 'pass' : 'blocked', 'review.content', data.dig('content', 'reviewed') ? '스토어 문구 검수가 완료되었습니다.' : '스토어 문구 검수가 필요합니다.')
      add(data.dig('store', 'app_id') ? 'pass' : 'blocked', 'store.app_id', data.dig('store', 'app_id') ? 'App Store Connect app ID가 설정되었습니다.' : 'App Store Connect app ID가 필요합니다.')
      declarations = data['declarations']
      add(declarations['reviewed'] && declarations['content_rights'] && declarations['age_rating'] ? 'pass' : 'blocked', 'store.declarations', declarations['reviewed'] && declarations['content_rights'] && declarations['age_rating'] ? '콘텐츠 권리와 연령 등급 선언이 검토되었습니다.' : '콘텐츠 권리와 연령 등급 답변을 운영자가 확정해야 합니다.')
      testflight = data['testflight']
      add(testflight['reviewed'] && testflight['feedback_email'] && testflight['build_id'] ? 'pass' : 'blocked', 'testflight.inputs', testflight['reviewed'] && testflight['feedback_email'] && testflight['build_id'] ? 'TestFlight 연락처와 build가 확정되었습니다.' : 'TestFlight 피드백 이메일·build 선택·검토가 필요합니다.')
      pending = data['manual'].select { |_key, value| value['status'] == 'pending' }.keys
      pending_labels = pending.map { |key| MANUAL_LABELS.fetch(key, key) }
      add(pending.empty? ? 'pass' : 'blocked', 'store.manual', pending.empty? ? '수동 App Store 확인 항목이 모두 완료되었습니다.' : "수동 확인 대기: #{pending_labels.join('·')}", { 'items' => pending })
      capture = data.dig('artifacts', 'capture_verification')
      add(capture ? 'pass' : 'blocked', 'screenshots.capture', capture ? '검수된 screenshot capture가 연결되었습니다.' : '고정된 checkpoint에서 screenshot 촬영과 시각 검수가 필요합니다.')
      team = read('ios/Runner.xcodeproj/project.pbxproj')[/DEVELOPMENT_TEAM = ([A-Z0-9]+);/, 1]
      add('blocked', 'signing.verification', team ? 'Xcode Team 설정은 있으나 배포 인증서·profile과 계정 권한을 확인해야 합니다.' : 'Apple Developer Team과 배포 서명이 필요합니다.')
    end

    def check_review_contact
      unless @review_details
        add('blocked', 'review.contact', '운영 문의 연락처 외부 JSON이 필요합니다.')
        return
      end
      begin
        real = File.realpath(@review_details)
        raise Error, 'inside repository' if real.start_with?(REPO + '/')
        values = JSON.parse(File.read(real))
        raise Error, 'invalid object' unless values.is_a?(Hash)
        raise Error, 'missing field' unless REVIEW_CONTACT_FIELDS.all? { |field| !values[field].to_s.strip.empty? }
        raise Error, 'invalid email' unless values['contactEmail'].match?(/\A[^\s@]+@[^\s@]+\.[^\s@]+\z/)
        add('pass', 'review.contact', '저장소 밖 운영 문의 연락처 입력을 확인했습니다.')
      rescue StandardError
        add('fail', 'review.contact', '운영 문의 연락처 JSON이 외부 입력 계약과 일치하지 않습니다.')
      end
    end

    def check_feedback
      if @feedback.empty?
        add('blocked', 'feedback.missing', '물리 기기 후보 피드백과 P0/P1 확인이 필요합니다.')
        return
      end
      blocking = 0
      incomplete = 0
      device_classes = []
      @feedback.each do |path|
        begin
          raw = File.read(path)
          raise Error, 'private data pattern' if raw.match?(%r{file:/{2}|/(?:Users|home|storage)/|\\|deviceId|fileName|trackTitle|-----BEGIN}i)
          report = JSON.parse(raw)
          raise Error, 'invalid fields' unless report.is_a?(Hash) && report.keys.sort == FEEDBACK_FIELDS.sort
          raise Error, 'invalid schema/version' unless report['schemaVersion'] == 1 && report['appVersion'] == data.dig('source', 'version') && report['buildNumber'] == data.dig('source', 'build_number')
          FEEDBACK_VALUES.each { |field, allowed| raise Error, "invalid #{field}" unless allowed.include?(report[field]) }
          raise Error, 'invalid os major' unless report['osMajor'].is_a?(Integer) && report['osMajor'].between?(1, 99)
          routes = report['routes']
          raise Error, 'invalid routes' unless routes.is_a?(Array) && !routes.empty? && routes.uniq == routes && (routes - %w[speaker wired bluetooth notChecked]).empty? && !(routes.include?('notChecked') && routes.length > 1)
          outcomes = %w[voiceOver dynamicType importOutcome playbackOutcome relaunchOutcome interruptionOutcome].map { |field| report[field] }
          raise Error, 'issue requires severity' if outcomes.include?('issue') && report['severity'] == 'none'
          blocking += 1 if %w[p0 p1].include?(report['severity'])
          incomplete += 1 if outcomes.include?('notChecked') || report['provider'] == 'notChecked' || report['fixture'] == 'notChecked' || report['listening'] == 'notChecked' || routes == ['notChecked']
          device_classes << report['deviceClass'] if report['platform'] == 'ios'
        rescue StandardError
          add('fail', 'feedback.invalid', '실기기 피드백 파일이 개인정보 최소화 계약과 일치하지 않습니다.')
          return
        end
      end
      if blocking.positive?
        add('blocked', 'feedback.p0_p1', '해결되지 않은 P0/P1 실기기 피드백이 있습니다.', { 'count' => blocking })
      elsif incomplete.positive? || !%w[phone tablet].all? { |kind| device_classes.include?(kind) }
        add('blocked', 'feedback.incomplete', 'iPhone·iPad 물리 기기 피드백 또는 필수 확인 항목이 아직 완전하지 않습니다.', { 'incomplete_reports' => incomplete })
      else
        add('pass', 'feedback.p0_p1', '제공된 실기기 피드백에 P0/P1이 없습니다.', { 'reports' => @feedback.length })
      end
    end

    def check_artifact
      unless @artifact
        add('warning', 'artifact.missing', 'unsigned 또는 signed release artifact를 지정하면 bundle 내부까지 검사할 수 있습니다.')
        return
      end
      unless File.directory?(@artifact) && File.file?(File.join(@artifact, 'Info.plist'))
        add('fail', 'artifact.invalid', 'release artifact는 Info.plist가 있는 .app 디렉터리여야 합니다.')
        return
      end
      stdout, _stderr, status = Open3.capture3('plutil', '-convert', 'json', '-o', '-', File.join(@artifact, 'Info.plist'))
      info = status.success? ? JSON.parse(stdout) : {}
      expected = [data.dig('source', 'bundle_id'), data.dig('source', 'version'), data.dig('source', 'build_number').to_s, data.dig('store', 'expected_name')]
      actual = [info['CFBundleIdentifier'], info['CFBundleShortVersionString'], info['CFBundleVersion'], info['CFBundleDisplayName']]
      add(actual == expected ? 'pass' : 'fail', 'artifact.identity', actual == expected ? 'release artifact의 ID·버전·build·표시명이 일치합니다.' : 'release artifact identity가 metadata와 다릅니다.')
      manifests = Dir.glob(File.join(@artifact, '**/PrivacyInfo.xcprivacy'))
      add(manifests.empty? ? 'fail' : 'pass', 'artifact.privacy', manifests.empty? ? 'release artifact에 privacy manifest가 없습니다.' : 'release artifact에 privacy manifest가 포함되어 있습니다.', { 'count' => manifests.length })
      executable = info['CFBundleExecutable'] && File.join(@artifact, info['CFBundleExecutable'])
      if executable && File.file?(executable)
        strings, = Open3.capture3('strings', executable)
        credential = strings.match?(/-----BEGIN .*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z_-]{20,}/)
        compile_path = strings.match?(%r{/Users/[A-Za-z0-9._-]+/|/home/[A-Za-z0-9._-]+/})
        add(credential ? 'fail' : 'pass', 'artifact.secrets', credential ? 'release binary에서 비밀값 형태가 발견되었습니다.' : 'release binary에서 알려진 credential 형태가 발견되지 않았습니다.')
        add(compile_path ? 'warning' : 'pass', 'artifact.paths', compile_path ? 'release binary에 개발 checkout compile URI가 남아 있어 중립 CI 경로 빌드를 권장합니다.' : 'release binary에서 개발자 절대 경로가 발견되지 않았습니다.')
      else
        add('fail', 'artifact.binary', 'release artifact 실행 파일을 찾을 수 없습니다.')
      end
    end
  end
end
