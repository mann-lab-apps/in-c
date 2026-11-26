require 'spaceship'
require 'json'
require 'net/http'
require 'time'
report={'observedAtUtc'=>Time.now.utc.iso8601,'appId'=>'6828809673','mutations'=>false,'requests'=>[]}
begin
  key_file=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  token=Spaceship::ConnectAPI::Token.create(key_id:File.basename(key_file)[/AuthKey_(.+)\.p8/,1],issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:File.read(key_file),in_house:false)
  get=->(path){
    uri=URI('https://api.appstoreconnect.apple.com'+path);req=Net::HTTP::Get.new(uri);req['Authorization']="Bearer #{token.text}"
    response=Net::HTTP.start(uri.host,uri.port,use_ssl:true,open_timeout:15,read_timeout:45){|h|h.request(req)}
    report['requests'] << {'path'=>path,'status'=>response.code.to_i}
    raise 'Read failed' unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)
  }
  app=get.call('/v1/apps/6828809673').fetch('data')
  raise 'Wrong app' unless app.dig('attributes','bundleId')=='com.mannlab.ddirori.play'
  report['app']=app['attributes'].slice('name','bundleId','primaryLocale','contentRightsDeclaration')
  versions=get.call('/v1/apps/6828809673/appStoreVersions?limit=200')
  raise 'Paginated versions' if versions.dig('links','next')
  report['versions']=versions['data'].map{|v|{'id'=>v['id'],'attributes'=>v['attributes'].slice('versionString','platform','appStoreState','appVersionState','releaseType','copyright')}}
  draft=versions['data'].find{|v|v.dig('attributes','platform')=='IOS' && v.dig('attributes','versionString')=='1.0.0'}
  raise 'Expected version absent' unless draft
  vid=draft['id'];locales=get.call("/v1/appStoreVersions/#{vid}/appStoreVersionLocalizations?limit=200")
  report['versionLocales']=locales['data'].map{|v|v.slice('id','type','attributes')}
  infos=get.call('/v1/apps/6828809673/appInfos?include=primaryCategory,secondaryCategory&limit=200')
  report['appInfos']=infos['data'];report['categories']=infos['included']
  report['infoLocales']=infos['data'].flat_map{|v|get.call("/v1/appInfos/#{v['id']}/appInfoLocalizations?limit=200")['data'].map{|l|l.slice('id','type','attributes').merge('appInfoId'=>v['id'])}}
  review=get.call("/v1/appStoreVersions/#{vid}/appStoreReviewDetail")['data']
  report['reviewPresence']=%w[contactFirstName contactLastName contactPhone contactEmail notes].to_h{|k|[k,!review&.dig('attributes',k).to_s.strip.empty?]}
  report['reviewNotesSha256']=nil
  if review
    require 'digest';report['reviewNotesSha256']=Digest::SHA256.hexdigest(review.dig('attributes','notes').to_s);report['reviewDetailId']=review['id']
  end
  report['betaLocales']=get.call('/v1/apps/6828809673/betaAppLocalizations?limit=200')['data'].map{|v|v.slice('id','type','attributes')}
  report['selectedBuild']=get.call("/v1/appStoreVersions/#{vid}/build")['data']&.then{|v|{'id'=>v['id'],'attributes'=>v['attributes'].slice('version','processingState','buildAudienceType','expired')}}
  report['passed']=true
rescue StandardError=>e
  report['passed']=false;report['failureClass']=e.class.name
ensure
  File.write('play-store-info-readonly.json',JSON.pretty_generate(report)+"\n")
  puts JSON.generate(report)
end
exit(report['passed'] ? 0 : 1)
