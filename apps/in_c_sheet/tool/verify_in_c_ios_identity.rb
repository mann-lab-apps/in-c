#!/usr/bin/env ruby
require 'xcodeproj'
require 'json'
require 'digest'

root = File.expand_path('..', __dir__)
project = Xcodeproj::Project.open(File.join(root, 'ios/Runner.xcodeproj'))
runner = project.targets.find { |target| target.name == 'Runner' }
%w[Debug Profile Release].each do |mode|
  inc = runner.build_configurations.find { |config| config.name == "#{mode}-inc" }
  clef = runner.build_configurations.find { |config| config.name == mode }
  raise "Missing #{mode} configurations" unless inc && clef
  raise "Wrong in C identity in #{mode}" unless inc.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] == 'com.mannlab.inc'
  raise "Shared icon in #{mode}" unless inc.build_settings['ASSETCATALOG_COMPILER_APPICON_NAME'] == 'InCAppIcon'
  raise "Changed Clef icon in #{mode}" unless clef.build_settings['ASSETCATALOG_COMPILER_APPICON_NAME'] == 'AppIcon'
  raise "Shared product identity in #{mode}" if clef.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] == 'com.mannlab.inc'
end

assets = File.join(root, 'ios/Runner/Assets.xcassets')
contents = JSON.parse(File.read(File.join(assets, 'InCAppIcon.appiconset/Contents.json')))
contents.fetch('images').each do |entry|
  image = File.join(assets, 'InCAppIcon.appiconset', entry.fetch('filename'))
  source = File.join(root, 'assets/brand/in-c-soft-launch-icon.png')
  raise 'in C artwork does not match the brand source' unless Digest::SHA256.file(image) == Digest::SHA256.file(source)
  clef = File.join(assets, 'AppIcon.appiconset/Icon-App-1024x1024@1x.png')
  raise 'in C still shares the Clef artwork' if Digest::SHA256.file(image) == Digest::SHA256.file(clef)
end
puts 'PASS: all three in C configurations use distinct, source-matched artwork; Clef icon preserved'
