require 'json'
require 'minitest/autorun'
require 'tempfile'
require_relative '../lib/ios_release_preflight'

class IOSReleasePreflightTest < Minitest::Test
  MANIFEST = File.join(Deployment::ROOT, 'apps/classical-local-library/ios-metadata.yaml')

  def report(feedback: [], review_details: nil)
    Deployment::IOSReleasePreflight.new(
      manifest: MANIFEST,
      feedback: feedback,
      review_details: review_details,
    ).run
  end

  def test_current_source_passes_implementation_checks_and_reports_external_blocks
    result = report
    assert_equal 0, result.dig('counts', 'fail')
    assert result['internal_beta_ready']
    refute result['testflight_ready']
    codes = result['issues'].to_h { |issue| [issue['code'], issue['status']] }
    assert_equal 'pass', codes['source.demo']
    assert_equal 'pass', codes['privacy.manifest']
    assert_equal 'pass', codes['icon.marketing']
    assert_equal 'pass', codes['icon.approval']
    assert_equal 'blocked', codes['url.ko.privacy_url']
    assert_equal 'pass', codes['checkpoint.source']
    assert_equal 'blocked', codes['screenshots.capture']
  end

  def test_public_https_url_rejects_placeholders_private_hosts_and_credentials
    valid = Deployment::IOSReleasePreflight.method(:public_https_url?)
    assert valid.call('https://support.example.org/play')
    refute valid.call('http://support.example.org/play')
    refute valid.call('https://example.invalid/privacy')
    refute valid.call('https://user:secret@example.org/privacy')
    refute valid.call('https://127.0.0.1/privacy')
  end

  def test_p0_feedback_blocks_release_without_echoing_private_values
    Tempfile.create(['release-feedback-', '.json']) do |file|
      file.write(JSON.generate(feedback('p0')))
      file.flush
      result = report(feedback: [file.path])
      issue = result['issues'].find { |row| row['code'] == 'feedback.p0_p1' }
      assert_equal 'blocked', issue['status']
      refute_includes JSON.generate(result), file.path
      refute_includes Deployment::IOSReleasePreflight.text(result), '/Users/'
    end
  end

  def test_invalid_feedback_is_a_preflight_failure
    Tempfile.create(['release-feedback-', '.json']) do |file|
      invalid = feedback('none').merge('fileName' => '/Users/person/private.m4a')
      file.write(JSON.generate(invalid))
      file.flush
      result = report(feedback: [file.path])
      assert result['issues'].any? { |row| row.values_at('code', 'status') == ['feedback.invalid', 'fail'] }
    end
  end

  def test_phone_only_feedback_remains_blocked_until_ipad_is_checked
    Tempfile.create(['release-feedback-', '.json']) do |file|
      file.write(JSON.generate(feedback('none')))
      file.flush
      result = report(feedback: [file.path])
      assert result['issues'].any? { |row| row.values_at('code', 'status') == ['feedback.incomplete', 'blocked'] }
    end
  end

  def test_phone_and_tablet_feedback_clear_device_coverage_block
    Tempfile.create(['release-phone-feedback-', '.json']) do |phone|
      Tempfile.create(['release-tablet-feedback-', '.json']) do |tablet|
        phone.write(JSON.generate(feedback('none')))
        tablet.write(JSON.generate(feedback('none').merge('deviceClass' => 'tablet')))
        phone.flush
        tablet.flush

        result = report(feedback: [phone.path, tablet.path])

        refute result['issues'].any? { |row| row['code'] == 'feedback.incomplete' }
        assert result['issues'].any? { |row| row.values_at('code', 'status') == ['feedback.p0_p1', 'pass'] }
      end
    end
  end

  def test_external_review_contact_is_validated_without_exposing_values
    Tempfile.create(['review-contacts-', '.json']) do |file|
      file.write(JSON.generate({
        'contactFirstName' => 'Private',
        'contactLastName' => 'Reviewer',
        'contactPhone' => '+821012345678',
        'contactEmail' => 'private@example.org'
      }))
      file.flush

      result = report(review_details: file.path)

      assert result['issues'].any? { |row| row.values_at('code', 'status') == ['review.contact', 'pass'] }
      refute_includes JSON.generate(result), 'private@example.org'
      refute_includes JSON.generate(result), file.path
    end
  end

  private

  def feedback(severity)
    {
      'schemaVersion' => 1,
      'appVersion' => '0.1.0',
      'buildNumber' => 1,
      'platform' => 'ios',
      'deviceClass' => 'phone',
      'osMajor' => 26,
      'provider' => 'cloudDrive',
      'fixture' => 'movement1Aac',
      'format' => 'aac',
      'voiceOver' => 'passed',
      'dynamicType' => 'passed',
      'importOutcome' => 'passed',
      'playbackOutcome' => 'passed',
      'relaunchOutcome' => 'passed',
      'routes' => ['speaker'],
      'interruptionOutcome' => 'passed',
      'listening' => 'heard',
      'reproducibility' => 'notReproduced',
      'severity' => severity
    }
  end
end
