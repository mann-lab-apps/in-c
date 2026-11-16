require 'json'
require 'digest'
require 'tmpdir'
require '/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031/deployment/lib/ios_release'

root=Deployment::ROOT
manifest=File.join(root,'output/classical-local-library/metadata-20261116T060432-d25e6d90/ios-release.json')
result={'operation'=>'User-approved14 Play screenshots to unreleased1.0.0 only','appId'=>'6828809673','version'=>'1.0.0','imageCount'=>14,'sections'=>['media'],'reviewSubmitted'=>false,'released'=>false,'otherMetadataWritten'=>false,'runs'=>[]}
begin
  raise 'Frozen package changed' unless Digest::SHA256.file(manifest).hexdigest=='f52ce73ed04137ca85e5599437d213edf93f917f71c0ee26287ae166d05321c8'
  package=Deployment::IOSPackage.new(manifest).prepare
  raise 'Unexpected package' unless package.data.values_at('app_id','version','source_commit')==['6828809673','1.0.0','2814dbd30aa5764ec70544772d6fcd418260367f']
  proof=JSON.parse(File.read(File.join(root,'output/classical-local-library/screenshots-20261116T055425-0f66ab1b/visual-verification.json')))
  raise 'Wrong approved images' unless package.prepared['assets'].length==14 && package.prepared['assets'].all?{|a|a['kind']=='screenshot'} && package.prepared['assets'].map{|a|a['sha256']}.sort==proof.fetch('assets').map{|a|a['sha256']}.sort
  key=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  Dir.mktmpdir('play-media-','/Users/jaemankim/.local/share/ddirori-play-release') do |directory|
    credentials=File.join(directory,'api.json')
    File.open(credentials,'w',0600){|f|f.write(JSON.generate({'issuer_id'=>ENV.fetch('APPLE_API_ISSUER_ID'),'key_id'=>File.basename(key)[/AuthKey_(.+)\.p8/,1],'key_filepath'=>key}))}
    api=Deployment::IOSReleaseAPI.new(credentials)
    attempt=Deployment::IOSRelease.new(package,api:api)
    begin
      attempt.run('sync',sections:['media'])
    rescue Deployment::Error
      result['initialSyncFailureClass']='Deployment::Error'
    ensure
      result['runs'] << {'mode'=>'sync','result'=>File.join(attempt.output,'result.json'),'status'=>attempt.record['status']}
    end
    if attempt.record['status']=='passed'
      result['passed']=true
    else
      # Apple may still be processing committed images. Poll read-only, never
      # reserve/delete/reorder additional assets during these retries.
      12.times do
        sleep 10
        verification=Deployment::IOSRelease.new(package,api:api)
        begin
          verification.run('verify',sections:['media'])
          result['passed']=true
        rescue Deployment::Error
          result['verificationPending']=true
        ensure
          result['runs'] << {'mode'=>'verify','result'=>File.join(verification.output,'result.json'),'status'=>verification.record['status']}
        end
        break if result['passed']
      end
    end
    final=result['runs'].last
    verified=JSON.parse(File.read(final['result']))
    result['readBackPassed']=verified.dig('verification','passed')==true
    result['target']=verified['target']
    result['verifiedImages']=verified['assets'].map{|a|a.slice('scene','locale','display_type','position','sha256','md5')}
    result['passed']=result['passed']==true && result['readBackPassed'] && result['verifiedImages'].length==14
  end
rescue StandardError=>error
  result['passed']=false;result['failureClass']=error.class.name
ensure
  File.write('play-approved-media-result.json',JSON.pretty_generate(result)+"\n");puts JSON.generate(result)
end
exit(result['passed'] ? 0 : 1)
