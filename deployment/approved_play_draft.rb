require 'spaceship'
require 'net/http'
require 'json'
require 'digest'

path='/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031/deployment/output/classical-local-library/candidate-build5/store-draft-plan.json'
result={'operation'=>'User-approved four Play unreleased draft patches','appId'=>'6828809673','planSha256'=>'df22262e8897300fc79d14c2fe3e92be1843e8a8cf41ec19041d75d97ba4b093','writes'=>[],'submission'=>false,'release'=>false,'pricingOrTerritoryWritten'=>false,'surveyAnswersWritten'=>false}
begin
  raise 'Approved plan changed' unless Digest::SHA256.file(path).hexdigest==result['planSha256']
  plan=JSON.parse(File.read(path))
  raise 'Wrong app plan' unless plan.values_at('appId','bundleId','sourceCommit')==['6828809673','com.mannlab.ddirori.play','2814dbd30aa5764ec70544772d6fcd418260367f']
  operations=plan.fetch('operations')
  allowed=['/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567','/v1/appInfoLocalizations/8d41fb16-8122-4be8-b4e4-79c354dbd501','/v1/appStoreVersionLocalizations/23e24ace-28ca-482d-a87b-8909d8744960','/v1/appInfos/c41cc51c-2a81-4560-96c2-0539371940c8']
  raise 'Wrong operations' unless operations.length==4 && operations.map{|op|op['path']}==allowed && operations.all?{|op|op['method']=='PATCH'}
  key_file=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  token=Spaceship::ConnectAPI::Token.create(key_id:File.basename(key_file)[/AuthKey_(.+)\.p8/,1],issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:File.read(key_file),in_house:false)
  request=lambda do |target,body=nil|
    raise 'Unapproved mutation route' if body && !allowed.include?(target)
    uri=URI('https://api.appstoreconnect.apple.com'+target)
    req=body ? Net::HTTP::Patch.new(uri) : Net::HTTP::Get.new(uri)
    req['Authorization']="Bearer #{token.text}"
    if body;req['Content-Type']='application/json';req.body=JSON.generate(body);end
    response=Net::HTTP.start(uri.hostname,uri.port,use_ssl:true,open_timeout:15,read_timeout:45){|http|http.request(req)}
    unless response.is_a?(Net::HTTPSuccess)
      result['failedRequest']={'path'=>target,'status'=>response.code.to_i}
      begin;result['failedRequest']['codes']=JSON.parse(response.body).fetch('errors',[]).map{|e|e['code']};rescue JSON::ParserError;end
      raise 'Apple rejected request'
    end
    JSON.parse(response.body)
  end
  app=request.call('/v1/apps/6828809673').fetch('data')
  raise 'Wrong app' unless app.dig('attributes','bundleId')=='com.mannlab.ddirori.play' && app.dig('attributes','name')=='띠로리 플레이'
  versions=request.call('/v1/apps/6828809673/appStoreVersions').fetch('data')
  version=versions.find{|v|v['id']=='423cf385-e335-43a4-9429-1759b9cee567'}
  raise 'Draft changed' unless version && version.dig('attributes','appStoreState')=='PREPARE_FOR_SUBMISSION' && %w[1.0 1.0.0].include?(version.dig('attributes','versionString'))
  infos=request.call('/v1/apps/6828809673/appInfos').fetch('data')
  raise 'App info changed' unless infos.any?{|v|v['id']=='c41cc51c-2a81-4560-96c2-0539371940c8' && v.dig('attributes','appStoreState')=='PREPARE_FOR_SUBMISSION'}
  il=request.call('/v1/appInfos/c41cc51c-2a81-4560-96c2-0539371940c8/appInfoLocalizations').fetch('data')
  vl=request.call('/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567/appStoreVersionLocalizations').fetch('data')
  raise 'Locale ownership changed' unless il.any?{|v|v['id']=='8d41fb16-8122-4be8-b4e4-79c354dbd501' && v.dig('attributes','locale')=='ko'} && vl.any?{|v|v['id']=='23e24ace-28ca-482d-a87b-8909d8744960' && v.dig('attributes','locale')=='ko'}
  operations.each do |operation|
    fresh=request.call(allowed[0]).fetch('data')
    raise 'No longer an unsubmitted draft' unless fresh.dig('attributes','appStoreState')=='PREPARE_FOR_SUBMISSION'
    desired=operation.fetch('body').fetch('data')
    row={'path'=>operation['path'],'fields'=>desired.fetch('attributes',desired.fetch('relationships',{})).keys,'attempted'=>true}
    result['writes'] << row
    response=request.call(operation['path'],operation['body']).fetch('data')
    if desired['attributes']
      actual=request.call(operation['path']).fetch('data')
      raise 'Read-back mismatch' unless desired['attributes'].all?{|k,v|actual.dig('attributes',k)==v}
    else
      actual=request.call('/v1/apps/6828809673/appInfos?include=primaryCategory,secondaryCategory').fetch('data').find{|v|v['id']==desired['id']}
      raise 'Category read-back mismatch' unless actual.dig('relationships','primaryCategory','data','id')=='MUSIC'
    end
    row['verified']=true
  end
  result['passed']=true
  result['versionString']='1.0.0';result['releaseType']='MANUAL';result['appStoreState']='PREPARE_FOR_SUBMISSION'
rescue StandardError=>error
  result['passed']=false;result['failureClass']=error.class.name
ensure
  File.write('play-approved-draft-result.json',JSON.pretty_generate(result)+"\n");puts JSON.generate(result)
end
exit(result['passed'] ? 0 : 1)
