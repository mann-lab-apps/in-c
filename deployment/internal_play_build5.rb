require 'spaceship'
require 'json'
require 'digest'
require 'tmpdir'
require 'fileutils'
require 'open3'
require 'net/http'

root='/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031/deployment'
source='/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-release-candidate-20261116'
manifest=File.join(root,'output/classical-local-library/release-inputs-20261116-build5/release.json')
ipa=File.join(root,'output/classical-local-library/20261116T051926-1d48bcd0/app.ipa')
approval='/Users/jaemankim/.local/share/ddirori-play-release/build5-internal-upload-approval.json'
report={'operation'=>'Upload exact Play1.0.0(5) and connect existing internal group','appId'=>'6828809673','sourceCommit'=>'2814dbd30aa5764ec70544772d6fcd418260367f','ipaSha256'=>'d44f262a017c7060a057b8c93593daef44b0dcfbe637bcb1a03eeaf5cb962c36','publicMetadataWritten'=>false,'reviewSubmitted'=>false,'released'=>false}
begin
  raise 'Manifest mismatch' unless Digest::SHA256.file(manifest).hexdigest=='87fc5b8e2da8803eb29ee5034665e2b23b1775ba7060dfdf16ee2483bf3e8694'
  raise 'IPA mismatch' unless Digest::SHA256.file(ipa).hexdigest==report['ipaSha256']
  exported=JSON.parse(File.read(File.join(File.dirname(ipa),'result.json')))
  pipeline_files=%w[lib/release.rb lib/artifact.py fastlane/Fastfile Gemfile.lock]
  pipeline_sha=Digest::SHA256.hexdigest(pipeline_files.map{|p|Digest::SHA256.file(File.join(root,p)).hexdigest}.join)
  raise 'Pipeline changed' unless pipeline_sha==exported['pipeline_sha256']
  key_file=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  key_id=File.basename(key_file)[/AuthKey_(.+)\.p8/,1]
  key=File.read(key_file)
  log='/Users/jaemankim/.local/share/ddirori-play-release/build5-upload-local.log'
  Dir.mktmpdir('play-upload-','/Users/jaemankim/.local/share/ddirori-play-release') do |directory|
    api=File.join(directory,'api.json')
    File.open(api,'w',0600){|f|f.write(JSON.generate({'key_id'=>key_id,'issuer_id'=>ENV.fetch('APPLE_API_ISSUER_ID'),'key'=>key,'in_house'=>false}))}
    File.open(log,'w',0600) do |file|
      success=system({'ASC_API_KEY_JSON'=>api,'PATH'=>"/opt/homebrew/bin:/usr/bin:/bin:#{ENV['PATH']}"},'/opt/homebrew/bin/bundle','exec','fastlane','testflight','platform:ios',"manifest:#{manifest}","source_root:#{source}","artifact:#{ipa}","approval:#{approval}",chdir:root,out:file,err:file)
      raise 'Internal upload failed; inspect private local log' unless success
    end
  end
  report['uploadCommandPassed']=true
  token=Spaceship::ConnectAPI::Token.create(key_id:key_id,issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:key,in_house:false)
  request=lambda do |path,body=nil|
    uri=URI('https://api.appstoreconnect.apple.com'+path)
    req=body ? Net::HTTP::Post.new(uri) : Net::HTTP::Get.new(uri)
    req['Authorization']="Bearer #{token.text}"
    if body;req['Content-Type']='application/json';req.body=JSON.generate(body);end
    response=Net::HTTP.start(uri.hostname,uri.port,use_ssl:true,open_timeout:15,read_timeout:40){|http|http.request(req)}
    unless response.is_a?(Net::HTTPSuccess)
      report['failedRequest']={'resource'=>path,'httpStatus'=>response.code.to_i}
      raise 'Apple request rejected'
    end
    response.body.to_s.empty? ? {} : JSON.parse(response.body)
  end
  build=nil
  40.times do
    builds=request.call('/v1/apps/6828809673/builds?limit=100').fetch('data')
    build=builds.find{|b|b.dig('attributes','version')=='5'}
    if build
      report['appleBuildId']=build['id'];report['processingState']=build.dig('attributes','processingState')
      raise 'Build processing failed' if %w[FAILED INVALID].include?(report['processingState'])
      break if report['processingState']=='VALID'
    end
    sleep 15
  end
  raise 'Apple processing pending' unless build && report['processingState']=='VALID'
  owner=request.call("/v1/builds/#{build['id']}/app").fetch('data')
  raise 'Build owner mismatch' unless owner['id']=='6828809673'
  prerelease=request.call("/v1/builds/#{build['id']}/preReleaseVersion").fetch('data')
  raise 'Build version mismatch' unless prerelease.dig('attributes','version')=='1.0.0'
  group_id='61f6e80b-f830-4c8d-9086-cca142e61f91'
  groups=request.call('/v1/apps/6828809673/betaGroups?limit=200').fetch('data')
  group=groups.find{|g|g['id']==group_id && g.dig('attributes','isInternalGroup')==true}
  raise 'Existing internal group not found' unless group
  request.call("/v1/builds/#{build['id']}/relationships/betaGroups",{'data'=>[{'type'=>'betaGroups','id'=>group_id}]})
  linked=request.call("/v1/betaGroups/#{group_id}/builds?limit=200").fetch('data')
  report['groupLinked']=linked.any?{|b|b['id']==build['id']}
  testers=request.call("/v1/betaGroups/#{group_id}/betaTesters?limit=200")
  report['testerCount']=testers.dig('meta','paging','total') || testers.fetch('data').length
  report['buildBetaDetail']=request.call("/v1/builds/#{build['id']}/buildBetaDetail").fetch('data').fetch('attributes').slice('internalBuildState','externalBuildState','autoNotifyEnabled')
  report['buildAudienceType']=build.dig('attributes','buildAudienceType')
  report['usesNonExemptEncryption']=build.dig('attributes','usesNonExemptEncryption')
  report['internalGroupId']=group_id
  report['physicalInstallationVerified']=false
  report['passed']=report['groupLinked'] && report['testerCount'].positive?
rescue StandardError=>error
  report['passed']=false;report['failureClass']=error.class.name
ensure
  File.write('play-internal-build5-result.json',JSON.pretty_generate(report)+"\n")
  puts JSON.generate(report)
end
exit(report['passed'] ? 0 : 1)
