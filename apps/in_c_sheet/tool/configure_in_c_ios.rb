#!/usr/bin/env ruby
require 'xcodeproj'
require 'fileutils'

root = File.expand_path('..', __dir__)
path = File.join(root, 'ios/Runner.xcodeproj')
project = Xcodeproj::Project.open(path)
original = project.build_configurations + project.targets.flat_map(&:build_configurations)
original = original.reject { |config| config.name.end_with?('-inc') }
snapshots = original.to_h { |config| [config.uuid, Marshal.dump(config.to_hash)] }

([project] + project.targets).each do |owner|
  %w[Debug Profile Release].each do |mode|
    source = owner.build_configurations.find { |config| config.name == mode }
    raise "Missing #{mode} configuration" unless source
    target = owner.add_build_configuration("#{mode}-inc", mode == 'Debug' ? :debug : :release)
    target.build_settings = Marshal.load(Marshal.dump(source.build_settings))
    target.base_configuration_reference = source.base_configuration_reference
    next if owner == project

    settings = target.build_settings
    settings['PRODUCT_BUNDLE_IDENTIFIER'] = owner.name == 'Runner' ? 'com.mannlab.inc' : 'com.mannlab.inc.RunnerTests'
    settings['CODE_SIGN_STYLE'] = 'Automatic'
    settings['CODE_SIGN_IDENTITY'] = 'Apple Development'
    settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Development'
    settings['DEVELOPMENT_TEAM'] = 'ZRA4DHHKQ4'
    settings['DEVELOPMENT_TEAM[sdk=iphoneos*]'] = 'ZRA4DHHKQ4'
    settings['PROVISIONING_PROFILE_SPECIFIER'] = ''
    settings['PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]'] = ''
    settings['INFOPLIST_FILE'] = 'Runner/InC-Info.plist' if owner.name == 'Runner'
    settings['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'InCAppIcon' if owner.name == 'Runner'
  end
end

original.each do |config|
  raise "Changed Clef configuration #{config.name}" unless snapshots[config.uuid] == Marshal.dump(config.to_hash)
end
project.save

scheme = Xcodeproj::XCScheme.new(File.join(path, 'xcshareddata/xcschemes/Runner.xcscheme'))
scheme.test_action.build_configuration = 'Debug-inc'
scheme.launch_action.build_configuration = 'Debug-inc'
scheme.analyze_action.build_configuration = 'Debug-inc'
scheme.profile_action.build_configuration = 'Profile-inc'
scheme.archive_action.build_configuration = 'Release-inc'
scheme.save_as(path, 'inc', true)

info = Xcodeproj::Plist.read_from_path(File.join(root, 'ios/Runner/Info.plist'))
info['CFBundleDisplayName'] = 'in C'
info['CFBundleName'] = 'in C'
info.delete('CFBundleDocumentTypes')
Xcodeproj::Plist.write_to_path(info, File.join(root, 'ios/Runner/InC-Info.plist'))
FileUtils.cp(
  File.join(root, 'assets/brand/in-c-soft-launch-icon.png'),
  File.join(root, 'ios/Runner/Assets.xcassets/InCAppIcon.appiconset/in-c-icon.png')
)
puts 'inc flavor configured; original Clef build settings preserved'
