#!/usr/bin/env ruby
require_relative 'lib/ios_metadata'
require 'optparse'

options = {}
parser = OptionParser.new do |p|
  p.on('--manifest PATH') { |v| options[:manifest] = v }
  p.on('--check') { options[:check] = true }
  p.on('--capture-verification PATH') { |v| options[:capture_verification] = v }
end
begin
  parser.parse!
  raise Deployment::Error, '--manifest is required' unless options[:manifest]
  metadata = Deployment::IOSMetadata.new(options[:manifest])
  result = options[:check] ? { 'status' => 'valid', 'app' => metadata.data['app'], 'source_state' => metadata.data['source']['state'] } : metadata.compile(capture_verification: options[:capture_verification])
  puts JSON.generate(result)
rescue StandardError => error
  warn "Metadata failed: #{error.message}"
  exit 1
end
