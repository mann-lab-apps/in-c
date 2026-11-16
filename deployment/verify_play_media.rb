require 'json'
require 'digest'
require 'tmpdir'
require '/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031/deployment/lib/ios_release'
class ReadOnlyPlayMediaAPI < Deployment::IOSReleaseAPI
  def patch(*) = raise(Deployment::Error, 'Read-only verifier')
  def create(*) = raise(Deployment::Error, 'Read-only verifier')
  def categories(*) = raise(Deployment::Error, 'Read-only verifier')
  def upload_operations(*) = raise(Deployment::Error, 'Read-only verifier')
end
root=Deployment::ROOT
manifest=File.join(root,'output/classical-local-library/metadata-20261116T060432-d25e6d90/ios-release.json')
result={'operation'=>'Read-only processing verification of14 approved Play images','appId'=>'6828809673','mutations'=>false,'checks'=>[],'passed'=>false}
begin
  raise 'Package changed' unless Digest::SHA256.file(manifest).hexdigest=='f52ce73ed04137ca85e5599437d213edf93f917f71c0ee26287ae166d05321c8'
  package=Deployment::IOSPackage.new(manifest).prepare
  key=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  Dir.mktmpdir('play-media-read-','/Users/jaemankim/.local/share/ddirori-play-release') do |dir|
    credentials=File.join(dir,'api.json')
    File.open(credentials,'w',0600){|f|f.write(JSON.generate({'issuer_id'=>ENV.fetch('APPLE_API_ISSUER_ID'),'key_id'=>File.basename(key)[/AuthKey_(.+)\.p8/,1],'key_filepath'=>key}))}
    api=ReadOnlyPlayMediaAPI.new(credentials)
    30.times do
      row=api.get('/v1/appScreenshots/1d000019-7075-8dc9-8034-04677e0c1385').fetch('data')
      state=row.dig('attributes','assetDeliveryState','state')
      result['checks'] << {'state'=>state,'checksumPresent'=>!row.dig('attributes','sourceFileChecksum').to_s.empty?}
      raise 'Apple image processing failed' if state=='FAILED'
      break if state=='COMPLETE'
      sleep 15
    end
    verifier=Deployment::IOSRelease.new(package,api:api)
    begin
      verifier.run('verify',sections:['media'])
    ensure
      result['resultFile']=File.join(verifier.output,'result.json')
      result['verification']=verifier.record['verification']
      result['target']=verifier.record['target']
      result['verifiedImages']=verifier.record['assets'].map{|a|a.slice('scene','locale','display_type','position','sha256','md5')}
    end
    result['passed']=verifier.record['status']=='passed' && result['verifiedImages'].length==14
  end
rescue StandardError=>error
  result['failureClass']=error.class.name
ensure
  File.write('play-verified-media-result.json',JSON.pretty_generate(result)+"\n");puts JSON.generate(result)
end
exit(result['passed'] ? 0 : 1)
