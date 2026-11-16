#!/usr/bin/env ruby
require 'optparse'
require 'pathname'
require_relative 'lib/ios_metadata'

options = {}
OptionParser.new do |p|
  p.on('--manifest PATH') { |v| options[:manifest] = v }
  p.on('--baseline PATH') { |v| options[:baseline] = v }
  p.on('--output PATH') { |v| options[:output] = v }
end.parse!
%i[manifest baseline output].each { |key| raise OptionParser::MissingArgument, key.to_s unless options[key] }
metadata = Deployment::IOSMetadata.new(options[:manifest])
data = metadata.data
raise Deployment::Error, 'Play configuration only' unless data['app'] == 'classical-local-library'
raise Deployment::Error, 'Pin the actual product checkpoint first' unless data.dig('source', 'state') == 'pinned'
output = File.expand_path(options[:output], Deployment::ROOT)
raise Deployment::Error, 'Use a fresh deployment/output directory' unless output.start_with?(File.join(Deployment::ROOT, 'output') + '/') && !File.exist?(output)
baseline = File.realpath(options[:baseline])
raw, _err, status = Open3.capture3('python3', File.join(Deployment::ROOT, 'lib/artifact.py'), 'ios', baseline)
raise Deployment::Error, 'Baseline signature verification failed' unless status.success?
inspected = JSON.parse(raw)
raise Deployment::Error, 'Unexpected Play baseline' unless inspected.values_at('identifier', 'team_id', 'profile') == ['com.mannlab.ddirori.play', 'ZRA4DHHKQ4', '띠로리 플레이']
compiled = metadata.compile
snapshot = File.dirname(compiled.fetch('ios_release'))
FileUtils.mkdir_p(output)
FileUtils.cp_r(File.join(snapshot, 'metadata'), File.join(output, 'metadata'))
FileUtils.cp(File.join(snapshot, 'testflight-test-notes.txt'), File.join(output, 'notes.txt'))
FileUtils.cp(File.join(Deployment::ROOT, 'apps/classical-local-library/ExportOptions-AppStore.plist'), File.join(output, 'ExportOptions.plist'))
FileUtils.cp(baseline, File.join(output, 'baseline.ipa'))
raise Deployment::Error, 'Baseline changed while copying' unless Digest::SHA256.file(File.join(output, 'baseline.ipa')).hexdigest == inspected['sha256']
source = data['source']
manifest = {
  'schema_version' => 1, 'app' => data['app'], 'display_name' => data.dig('store', 'expected_name'),
  'source_path' => source['path'], 'source_commit' => source['commit'],
  'version' => source['version'], 'build_number' => source['build_number'],
  'entrypoint' => 'lib/main.dart', 'version_constant' => nil, 'dart_defines' => source['dart_defines'],
  'ios' => {
    'bundle_id' => source['bundle_id'], 'scheme' => 'Runner', 'configuration' => 'Release',
    'team_id' => 'ZRA4DHHKQ4', 'profile' => '띠로리 플레이', 'export_options' => 'ExportOptions.plist',
    'baseline' => Pathname.new(File.join(output, 'baseline.ipa')).relative_path_from(Pathname.new(Deployment::REPO)).to_s,
    'baseline_sha256' => inspected['sha256']
  },
  'android' => nil, 'metadata' => 'metadata/ios', 'release_notes' => 'notes.txt'
}
path = File.join(output, 'release.json')
File.write(path, JSON.pretty_generate(manifest) + "\n")
Deployment::Manifest.new(path)
File.write(File.join(output, 'preparation.json'), JSON.pretty_generate({
  'sourceCommit' => source['commit'], 'version' => "#{source['version']}+#{source['build_number']}",
  'metadataYamlSha256' => Digest::SHA256.file(metadata.path).hexdigest,
  'manifestSha256' => Digest::SHA256.file(path).hexdigest,
  'baselineVersion' => "#{inspected['version']}+#{inspected['build_number']}",
  'baselineSha256' => inspected['sha256'], 'binaryBuilt' => false, 'storeWritten' => false
}) + "\n")
puts JSON.generate({'releaseManifest' => path, 'sourceCommit' => source['commit'], 'binaryBuilt' => false})
