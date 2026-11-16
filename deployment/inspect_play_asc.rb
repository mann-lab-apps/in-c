require 'spaceship'
require 'json'
require 'net/http'
require 'time'
require 'bigdecimal'

report={'operation'=>'Read-only remaining Play launch inputs','observedAtUtc'=>Time.now.utc.iso8601,'appId'=>'6828809673','mutations'=>false,'requests'=>[]}
begin
  key_file=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  token=Spaceship::ConnectAPI::Token.create(key_id:File.basename(key_file)[/AuthKey_(.+)\.p8/,1],issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:File.read(key_file),in_house:false)
  get=lambda do |path|
    uri=path.start_with?('https://') ? URI(path) : URI('https://api.appstoreconnect.apple.com'+path)
    raise 'Unexpected origin' unless uri.scheme=='https' && uri.host=='api.appstoreconnect.apple.com' && !uri.userinfo
    req=Net::HTTP::Get.new(uri);req['Authorization']="Bearer #{token.text}"
    res=Net::HTTP.start(uri.host,uri.port,use_ssl:true,open_timeout:15,read_timeout:40){|h|h.request(req)}
    observation={'path'=>uri.request_uri,'httpStatus'=>res.code.to_i}
    report['requests'] << observation
    data=JSON.parse(res.body)
    unless res.is_a?(Net::HTTPSuccess)
      observation['errors']=data.fetch('errors',[]).map{|e|e.slice('code','title','detail')}
      return_value=nil
    else
      return_value=data
    end
    return_value
  end
  app=get.call('/v1/apps/6828809673')&.fetch('data')
  raise 'App identity unavailable' unless app && app.dig('attributes','bundleId')=='com.mannlab.ddirori.play'
  report['app']=app.fetch('attributes').slice('name','bundleId','primaryLocale','contentRightsDeclaration','isOrEverWasMadeForKids')
  relation=lambda do |name,fallback|
    target=app.dig('relationships',name,'links','related') || fallback
    get.call(target)
  end
  version=get.call('/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567')&.fetch('data')
  report['version']=version&.fetch('attributes')&.slice('versionString','appStoreState','appVersionState','releaseType','copyright')
  report['selectedBuild']=get.call('/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567/build')&.fetch('data')&.slice('id','attributes')
  schedule=relation.call('appPriceSchedule','/v1/apps/6828809673/appPriceSchedule')
  report['schedule']=schedule
  if schedule && schedule['data']
    resource=schedule['data']
    %w[baseTerritory manualPrices automaticPrices].each do |name|
      url=resource.dig('relationships',name,'links','related')
      next unless url
      report[name]=get.call(url)
    end
  end
  points=get.call('/v1/apps/6828809673/appPricePoints?filter%5Bterritory%5D=KOR&include=territory&limit=200')
  report['freeKoreanPricePoints']=(points && points['data'] || []).select{|p|BigDecimal(p.dig('attributes','customerPrice').to_s)==0}.map{|p|p.slice('id','type','attributes','relationships')}
  report['pricePointsHasNextPage']=!!points&.dig('links','next')
  availability=relation.call('appAvailabilityV2','/v1/apps/6828809673/appAvailabilityV2')
  report['availability']=availability
  if availability && availability['data']
    url=availability.dig('data','relationships','territoryAvailabilities','links','related')
    report['territoryAvailabilities']=get.call(url) if url
  end
  %w[appClips inAppPurchasesV2 subscriptionGroups].each do |name|
    url=app.dig('relationships',name,'links','related')
    value=url && get.call(url)
    report[name]={'configured'=>!value.nil?,'count'=>value && value.fetch('data').length,'hasNextPage'=>!!value&.dig('links','next')}
  end
  url=app.dig('relationships','endUserLicenseAgreement','links','related')
  eula=url && get.call(url)
  report['customEulaConfigured']=eula ? !eula['data'].nil? : nil
  contact=get.call('/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567/appStoreReviewDetail')&.fetch('data')
  report['remoteReviewContactPresence']=%w[contactFirstName contactLastName contactPhone contactEmail].to_h{|k|[k,!contact&.dig('attributes',k).to_s.strip.empty?]}
  file='/Users/jaemankim/.local/share/ddirori-play-release/review-details-20261116.json'
  local=File.file?(file) ? JSON.parse(File.read(file)) : {}
  report['externalContactFieldsPresent']=%w[contactFirstName contactLastName contactPhone contactEmail].to_h{|k|[k,!local[k].to_s.strip.empty?]}
  report['passed']=true
rescue StandardError=>error
  report['passed']=false;report['failureClass']=error.class.name
ensure
  File.write('play-remaining-readonly.json',JSON.pretty_generate(report)+"\n")
  puts JSON.generate({'passed'=>report['passed'],'requests'=>report['requests'].map{|r|r.slice('path','httpStatus')},'freeKoreanPricePointCount'=>report['freeKoreanPricePoints']&.length,'mutations'=>false})
end
exit(report['passed'] ? 0 : 1)
