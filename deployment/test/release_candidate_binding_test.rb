require 'minitest/autorun'
require_relative '../lib/release_candidate_binding'

class ReleaseCandidateBindingTest < Minitest::Test
  def manifest
    {
      'format' => 'ddirori-play-release-candidate', 'schemaVersion' => 1,
      'sourceCommit' => 'a' * 40, 'sourceFingerprintVersion' => 2,
      'sourceSha256' => 'b' * 64, 'ipaSha256' => 'c' * 64,
      'bundleId' => 'com.mannlab.ddirori.play', 'appVersion' => '1.0.0',
      'buildNumber' => 5, 'builtAtUtc' => '2026-11-16T01:00:00Z',
      'distribution' => 'app-store', 'feedback' => [{
        'reportSha256' => 'd' * 64, 'sourceSha256' => 'b' * 64,
        'ipaSha256' => 'c' * 64, 'observedAtUtc' => '2026-11-16T02:00:00Z'
      }]
    }
  end

  def verify(value, **args)
    candidate = Deployment::ReleaseCandidateBinding.decode(JSON.generate(value))
    Deployment::ReleaseCandidateBinding.verify!(candidate,
      source: {'commit' => 'a' * 40, 'bundle_id' => 'com.mannlab.ddirori.play', 'version' => '1.0.0', 'build_number' => 5},
      ipa_sha256: 'c' * 64, feedback_sha256: ['d' * 64], now: Time.iso8601('2026-11-16T03:00:00Z'), **args)
  end

  def test_exact_candidate_receipt_accepts_but_never_claims_audibility
    assert verify(manifest)
  end

  def test_same_version_does_not_accept_other_source_ipa_or_old_observation
    [
      ->(m) { m['sourceCommit'] = 'e' * 40 },
      ->(m) { m['ipaSha256'] = 'e' * 64 },
      ->(m) { m['feedback'][0]['sourceSha256'] = 'e' * 64 },
      ->(m) { m['feedback'][0]['observedAtUtc'] = '2026-11-15T02:00:00Z' },
      ->(m) { m['feedback'][0]['observedAtUtc'] = '2026-11-17T02:00:00Z' },
      ->(m) { m['feedback'] = [] },
      ->(m) { m['feedback'][0]['reportSha256'] = 'e' * 64 },
      ->(m) { m['builtAtUtc'] = '2026-11-17T01:00:00Z' }
    ].each do |mutate|
      value = manifest; mutate.call(value)
      assert_raises(ArgumentError) { verify(value) }
    end
  end

  def test_rejects_unknown_fields_placeholder_hashes_and_malformed_receipts
    [
      ->(m) { m['privatePath'] = '/Users/synthetic' },
      ->(m) { m['sourceSha256'] = '0' * 64 },
      ->(m) { m['sourceFingerprintVersion'] = 2.0 },
      ->(m) { m['feedback'][0]['deviceId'] = 'synthetic' },
      ->(m) { m['feedback'] << m['feedback'][0].dup },
      ->(m) { m['builtAtUtc'] = 'not-a-date' }
    ].each do |mutate|
      value = manifest; mutate.call(value)
      assert_raises(ArgumentError) { verify(value) }
    end
  end
end
