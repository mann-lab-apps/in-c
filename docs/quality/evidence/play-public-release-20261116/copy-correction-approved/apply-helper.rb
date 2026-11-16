require 'spaceship'
require 'json'
require 'digest'
require 'net/http'
require 'time'

plan_path='/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031/deployment/output/classical-local-library/candidate-build5/copy-correction-plan.json'
approved_sha='82aab8ead247d274a42d9f0f0aa9db365fb39ef7259b462d81e5a74852732fd2'
app_id='6828809673';version_id='423cf385-e335-43a4-9429-1759b9cee567';build_id='21fe8804-716b-4e6f-bba0-62ff7ed6b99e';locale_id='23e24ace-28ca-482d-a87b-8909d8744960'
target="/v1/appStoreVersionLocalizations/#{locale_id}"
report={'operation'=>'Approved Play description/keyword correction only','observedAtUtc'=>Time.now.utc.iso8601,'approvedPlanSha256'=>approved_sha,'mutations'=>false,'requests'=>[],'reviewSubmitted'=>false,'released'=>false}
begin
  raise 'Explicit approval missing' unless ENV['PLAY_APPROVED_COPY_PLAN_SHA256']==approved_sha
  raise 'Approved plan changed' unless Digest::SHA256.file(plan_path).hexdigest==approved_sha
  plan=JSON.parse(File.read(plan_path));operations=plan.fetch('operations')
  raise 'Unapproved operations' unless operations.length==1 && operations[0].values_at('method','path')==['PATCH',target]
  body=operations[0].fetch('body');desired=body.dig('data','attributes');fields=%w[description keywords]
  raise 'Unapproved fields/identity' unless desired.keys.sort==fields && body.dig('data','type')=='appStoreVersionLocalizations' && body.dig('data','id')==locale_id && body.keys==['data'] && body['data'].keys.sort==%w[attributes id type]
  raise 'Unexpected text change' unless plan.dig('before','description').sub("• MusicBrainz 후보를 확인하고 선택한 정보만 반영\n",'')==desired['description'] && plan.dig('before','keywords').sub(',MusicBrainz','')==desired['keywords']
  key_file=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  token=Spaceship::ConnectAPI::Token.create(key_id:File.basename(key_file)[/AuthKey_(.+)\.p8/,1],issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:File.read(key_file),in_house:false)
  request=lambda do |method,path,payload=nil|
    raise 'Unapproved mutation' unless method=='GET' || (method=='PATCH' && path==target && payload==body)
    uri=URI('https://api.appstoreconnect.apple.com'+path)
    raise 'Unexpected API origin' unless uri.host=='api.appstoreconnect.apple.com' && uri.scheme=='https' && !uri.userinfo
    req=(method=='GET' ? Net::HTTP::Get : Net::HTTP::Patch).new(uri);req['Authorization']="Bearer #{token.text}"
    if payload;req['Content-Type']='application/json';req.body=JSON.generate(payload);report['mutations']=true;end
    response=Net::HTTP.start(uri.host,uri.port,use_ssl:true,open_timeout:15,read_timeout:45){|http|http.request(req)}
    report['requests'] << {'method'=>method,'path'=>path,'httpStatus'=>response.code.to_i}
    raise 'Apple rejected scoped request' unless response.is_a?(Net::HTTPSuccess)
    response.body.to_s.empty? ? {} : JSON.parse(response.body)
  end
  get=->(path){request.call('GET',path)}
  app=get.call("/v1/apps/#{app_id}").fetch('data')
  raise 'Wrong app' unless app.dig('attributes','bundleId')=='com.mannlab.ddirori.play'
  version_guard=-> {
    versions=get.call("/v1/apps/#{app_id}/appStoreVersions?limit=200")
    raise 'Unexpected version list' unless !versions.dig('links','next') && versions.fetch('data').any?{|v|v['id']==version_id}
    version=get.call("/v1/appStoreVersions/#{version_id}").fetch('data')
    raise 'Draft state changed' unless version.dig('attributes','versionString')=='1.0.0' && version.dig('attributes','appStoreState')=='PREPARE_FOR_SUBMISSION' && version.dig('attributes','releaseType')=='MANUAL'
    selected=get.call("/v1/appStoreVersions/#{version_id}/build").fetch('data')
    raise 'Selected candidate changed' unless selected && selected['id']==build_id && selected.dig('attributes','version')=='5' && selected.dig('attributes','processingState')=='VALID' && selected.dig('attributes','buildAudienceType')=='APP_STORE_ELIGIBLE' && selected.dig('attributes','expired')==false
    {'version'=>version['attributes'].slice('versionString','appStoreState','releaseType','copyright'),'selectedBuildId'=>selected['id']}
  }
  before_version=version_guard.call
  owned=get.call("/v1/appStoreVersions/#{version_id}/appStoreVersionLocalizations?limit=200")
  raise 'Locale not owned' unless !owned.dig('links','next') && owned.fetch('data').any?{|v|v['id']==locale_id}
  before=get.call(target).fetch('data').fetch('attributes')
  raise 'Wrong locale' unless before['locale']=='ko'
  current=before.slice(*fields)
  raise 'Competing copy edit' unless current==plan.fetch('before') || current==desired
  report['before']=current;report['alreadyMatched']=current==desired
  request.call('PATCH',target,body) unless report['alreadyMatched']
  after=get.call(target).fetch('data').fetch('attributes')
  raise 'Correction read-back mismatch' unless after.slice(*fields)==desired
  raise 'Other locale fields changed' unless before.reject{|k,_|fields.include?(k)}==after.reject{|k,_|fields.include?(k)}
  after_version=version_guard.call
  raise 'Version/build state changed' unless before_version==after_version
  report['after']=after.slice(*fields);report['otherLocaleFieldsUnchanged']=true;report['versionAndBuildUnchanged']=true;report['state']=after_version;report['readBackPassed']=true;report['passed']=true
rescue StandardError=>error
  report['passed']=false;report['failureClass']=error.class.name
ensure
  File.write('play-copy-correction-result.json',JSON.pretty_generate(report)+"\n");puts JSON.generate(report)
end
exit(report['passed'] ? 0 : 1)
