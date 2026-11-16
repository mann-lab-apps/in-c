require 'minitest/autorun'
require_relative '../lib/release_candidate_feedback'

class ReleaseCandidateFeedbackTest < Minitest::Test
  FIXTURE = File.expand_path('../../apps/classical_local_library/test/fixtures/release_candidate_feedback_contract.json', __dir__)

  def test_shared_app_contract_accepts_versions_and_preserves_unknowns
    fixture = JSON.parse(File.read(FIXTURE))
    assert fixture['syntheticOnly']
    base = fixture['baseReport']
    v2 = base.merge('schemaVersion' => 2, 'musicActions' => fixture['musicActions'], 'automaticChecks' => fixture['automaticChecks'])
    [base, v2].each do |report|
      parsed = Deployment::ReleaseCandidateFeedback.decode(JSON.generate(report))
      assert_equal report, parsed
      assert Deployment::ReleaseCandidateFeedback.unverified?(parsed)
    end
    fixture['invalidMutations'].each do |mutation|
      assert_raises(ArgumentError, mutation.inspect) { Deployment::ReleaseCandidateFeedback.decode(JSON.generate(v2.merge(mutation))) }
    end
    assert_raises(ArgumentError) { Deployment::ReleaseCandidateFeedback.decode(' ' * 16_385) }
  end

  def test_nested_unknowns_issues_and_automation_are_not_physical_passes
    fixture = JSON.parse(File.read(FIXTURE))
    report = fixture['baseReport'].merge('schemaVersion' => 2, 'musicActions' => fixture['musicActions'], 'automaticChecks' => fixture['automaticChecks'].transform_values { 'passed' })
    assert Deployment::ReleaseCandidateFeedback.unverified?(Deployment::ReleaseCandidateFeedback.decode(JSON.generate(report)))
    report['musicActions']['queueEditing'] = 'issue'
    assert Deployment::ReleaseCandidateFeedback.user_issue?(report)
    report['musicActions']['queueEditing'] = 'invalid'
    assert_raises(ArgumentError) { Deployment::ReleaseCandidateFeedback.decode(JSON.generate(report)) }
  end
end
