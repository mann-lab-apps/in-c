#!/usr/bin/env ruby
require 'json'
require 'optparse'
require_relative 'lib/ios_release_preflight'

options = { feedback: [], format: 'text', require_ready: false }
OptionParser.new do |parser|
  parser.on('--manifest PATH') { |value| options[:manifest] = value }
  parser.on('--artifact PATH') { |value| options[:artifact] = value }
  parser.on('--feedback PATH') { |value| options[:feedback] << value }
  parser.on('--review-details PATH') { |value| options[:review_details] = value }
  parser.on('--format FORMAT') { |value| options[:format] = value }
  parser.on('--output PATH') { |value| options[:output] = value }
  parser.on('--require-ready') { options[:require_ready] = true }
end.parse!

raise OptionParser::MissingArgument, '--manifest' unless options[:manifest]
raise OptionParser::InvalidArgument, '--format must be text or json' unless %w[text json].include?(options[:format])

report = Deployment::IOSReleasePreflight.new(
  manifest: options[:manifest],
  artifact: options[:artifact],
  feedback: options[:feedback],
  review_details: options[:review_details],
).run
rendered = options[:format] == 'json' ? JSON.pretty_generate(report) + "\n" : Deployment::IOSReleasePreflight.text(report)
File.write(options[:output], rendered) if options[:output]
puts rendered

exit 1 if report.dig('counts', 'fail').positive?
exit 2 if options[:require_ready] && report.dig('counts', 'blocked').positive?
