#!/usr/bin/env ruby
require_relative 'lib/release'

begin
  action = ARGV.shift || 'plan'
  options = ARGV.to_h do |arg|
    key, value = arg.split('=', 2)
    raise Deployment::Error, 'arguments use key=value' unless value
    [key, value]
  end
  Deployment::Pipeline.new(options).run(action)
rescue Deployment::Error, KeyError, ArgumentError, Errno::ENOENT => e
  warn "Release blocked: #{e.message}"
  exit 1
end
