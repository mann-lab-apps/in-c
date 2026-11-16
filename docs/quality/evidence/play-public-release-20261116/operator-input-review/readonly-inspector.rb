require 'spaceship'
require 'json'
require 'net/http'
require 'time'

report={'operation'=>'Read-only Play operator inputs and copy guard','observedAtUtc'=>Time.now.utc.iso8601,'mutations'=>false,'reviewSubmitted'=>false,'released'=>false,'requests'=>[]}
begin
  key_file=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  token=Spaceship::ConnectAPI::Token.create(key_id:File.basename(key_file)[/AuthKey_(.+)\.p8/,1],issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:File.read(key_file),in_house:false)
  get=lambda do |path|
    uri=URI('https://api.appstoreconnect.apple.com'+path)
    request=Net::HTTP::Get.new(uri);request['Authorization']="Bearer #{token.text}"
    response=Net::HTTP.start(uri.host,uri.port,use_ssl:true,open_timeout:15,read_timeout:45){|http|http.request(request)}
    report['requests'] << {'path'=>path,'httpStatus'=>response.code.to_i}
    raise "Read failed HTTP#{response.code}" unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body).fetch('data')
  end
  app=get.call('/v1/apps/6828809673')
  raise 'App identity mismatch' unless app.dig('attributes','bundleId')=='com.mannlab.ddirori.play'
  version=get.call('/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567')
  raise 'Unexpected version/state' unless version.dig('attributes','versionString')=='1.0.0' && version.dig('attributes','appStoreState')=='PREPARE_FOR_SUBMISSION' && version.dig('attributes','releaseType')=='MANUAL'
  locale=get.call('/v1/appStoreVersionLocalizations/23e24ace-28ca-482d-a87b-8909d8744960')
  owned_locales=get.call('/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567/appStoreVersionLocalizations?limit=200')
  raise 'Locale ownership mismatch' unless locale.dig('attributes','locale')=='ko' && owned_locales.any?{|row|row['id']==locale['id']}
  public_review=get.call('/v1/appStoreVersions/423cf385-e335-43a4-9429-1759b9cee567/appStoreReviewDetail')
  beta=get.call('/v1/apps/6828809673/betaAppReviewDetail')
  age=get.call('/v1/appInfos/c41cc51c-2a81-4560-96c2-0539371940c8/ageRatingDeclaration')
  fields=%w[contactFirstName contactLastName contactPhone contactEmail]
  presence=->(data){fields.to_h{|field|[field,!data&.dig('attributes',field).to_s.strip.empty?]}}
  report['version']=version['attributes'].slice('versionString','appStoreState','releaseType','copyright')
  report['contentRightsDeclaration']=app.dig('attributes','contentRightsDeclaration')
  report['publicReviewContactPresence']=presence.call(public_review)
  report['betaReviewContactPresence']=presence.call(beta)
  report['ageRatingAttributes']=age && age['attributes']
  report['publicCopy']=locale['attributes'].slice('locale','description','keywords')
  local='/Users/jaemankim/.local/share/ddirori-play-release/review-details-20261116.json'
  values=File.file?(local) ? JSON.parse(File.read(local)) : {}
  report['localContactFieldsPresent']=fields.to_h{|field|[field,!values[field].to_s.strip.empty?]}
  report['passed']=true
rescue StandardError=>error
  report['passed']=false;report['failureClass']=error.class.name
ensure
  File.write('play-operator-inputs-readonly.json',JSON.pretty_generate(report)+"\n")
  puts JSON.generate(report)
end
exit(report['passed'] ? 0 : 1)
