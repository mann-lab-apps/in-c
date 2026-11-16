require 'spaceship'
require 'json'
require 'digest'
require 'net/http'
require 'bigdecimal'
require 'time'

plan_path='/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031/deployment/output/classical-local-library/candidate-build5/remaining-draft-plan.json'
approved_sha='6bb375fce5ccc3a1f7d6754fdd595685462547985c127d7e9c8b21ef53ee7ce1'
app_id='6828809673';version_id='423cf385-e335-43a4-9429-1759b9cee567';build_id='21fe8804-716b-4e6f-bba0-62ff7ed6b99e'
apply=ARGV==['--apply']
report={'operation'=>'Play four remaining launch settings','observedAtUtc'=>Time.now.utc.iso8601,'appId'=>app_id,'planSha256'=>approved_sha,'mode'=>apply ? 'apply' : 'dry-run','mutations'=>false,'operations'=>[],'reviewSubmitted'=>false,'released'=>false}
begin
  raise 'Use explicit mode' unless apply || ARGV==['--dry-run']
  raise 'Approved plan changed' unless Digest::SHA256.file(plan_path).hexdigest==approved_sha
  raise 'Explicit authorization required' if apply && ENV['PLAY_APPROVED_LAUNCH_PLAN_SHA256']!=approved_sha
  plan=JSON.parse(File.read(plan_path))
  expected=[['PATCH',"/v1/appStoreVersions/#{version_id}"],['PATCH',"/v1/appStoreVersions/#{version_id}/relationships/build"],['POST','/v1/appPriceSchedules'],['POST','/v2/appAvailabilities']]
  raise 'Unapproved routes' unless plan.fetch('operations').map{|o|o.values_at('method','path')}==expected
  key_file=Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.fetch(0)
  token=Spaceship::ConnectAPI::Token.create(key_id:File.basename(key_file)[/AuthKey_(.+)\.p8/,1],issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:File.read(key_file),in_house:false)
  request=lambda do |method,path,body=nil|
    if method!='GET'
      raise 'Unapproved mutation' unless apply && expected.include?([method,path]) && body==plan['operations'].find{|o|o.values_at('method','path')==[method,path]}['body']
      report['mutations']=true
    end
    uri=path.start_with?('https://') ? URI(path) : URI('https://api.appstoreconnect.apple.com'+path)
    raise 'Unexpected API origin' unless uri.scheme=='https' && uri.host=='api.appstoreconnect.apple.com' && !uri.userinfo
    klass={'GET'=>Net::HTTP::Get,'PATCH'=>Net::HTTP::Patch,'POST'=>Net::HTTP::Post}.fetch(method)
    req=klass.new(uri);req['Authorization']="Bearer #{token.text}"
    if body;req['Content-Type']='application/json';req.body=JSON.generate(body);end
    response=Net::HTTP.start(uri.host,uri.port,use_ssl:true,open_timeout:15,read_timeout:45){|h|h.request(req)}
    parsed=response.body.to_s.empty? ? {} : JSON.parse(response.body)
    if response.code=='404' && method=='GET';nil
    elsif response.is_a?(Net::HTTPSuccess);parsed
    else
      report['failedRequest']={'method'=>method,'path'=>uri.request_uri,'httpStatus'=>response.code.to_i,'codes'=>parsed.fetch('errors',[]).map{|e|e['code']}}
      raise 'Apple rejected scoped request'
    end
  end
  get=->(path){request.call('GET',path)}
  draft=-> {
    version_list=get.call("/v1/apps/#{app_id}/appStoreVersions?limit=200")
    raise 'Another version appeared' unless version_list && version_list['data'].length==1 && version_list['data'][0]['id']==version_id && !version_list.dig('links','next')
    value=get.call("/v1/appStoreVersions/#{version_id}")&.fetch('data')
    raise 'Draft changed' unless value && value.dig('attributes','versionString')=='1.0.0' && value.dig('attributes','appStoreState')=='PREPARE_FOR_SUBMISSION' && value.dig('attributes','releaseType')=='MANUAL'
    value
  }
  app=get.call("/v1/apps/#{app_id}")&.fetch('data')
  raise 'App identity mismatch' unless app && app.dig('attributes','bundleId')=='com.mannlab.ddirori.play'
  versions=get.call("/v1/apps/#{app_id}/appStoreVersions?limit=200")
  raise 'Unexpected other version or pagination' unless versions && versions['data'].length==1 && versions['data'][0]['id']==version_id && !versions.dig('links','next')
  current=draft.call
  raise 'Competing copyright' unless [nil,'2026 MannLab'].include?(current.dig('attributes','copyright'))
  selected=get.call("/v1/appStoreVersions/#{version_id}/build")&.fetch('data')
  raise 'Competing candidate' if selected && selected['id']!=build_id
  build=get.call("/v1/builds/#{build_id}")&.fetch('data')
  owner=get.call("/v1/builds/#{build_id}/app")&.fetch('data')
  prerelease=get.call("/v1/builds/#{build_id}/preReleaseVersion")&.fetch('data')
  raise 'Candidate changed' unless build && build.dig('attributes','version')=='5' && build.dig('attributes','processingState')=='VALID' && build.dig('attributes','buildAudienceType')=='APP_STORE_ELIGIBLE' && build.dig('attributes','expired')==false && owner && owner['id']==app_id && prerelease&.dig('attributes','version')=='1.0.0'
  point_id=plan['operations'][2]['body']['included'][0]['relationships']['appPricePoint']['data']['id']
  point=get.call("/v3/appPricePoints/#{point_id}?include=app,territory")&.fetch('data')
  raise 'Not the verified free Korean point' unless point && point['id']==point_id && BigDecimal(point.dig('attributes','customerPrice'))==0 && point.dig('relationships','territory','data','id')=='KOR' && point.dig('relationships','app','data','id')==app_id
  price_state=-> {
    schedule=get.call("/v1/apps/#{app_id}/appPriceSchedule")&.fetch('data')
    raise 'Price schedule unavailable' unless schedule
    manual_url=schedule.dig('relationships','manualPrices','links','related')
    automatic_url=schedule.dig('relationships','automaticPrices','links','related')
    raise 'Price links unavailable' unless manual_url && automatic_url
    manual_uri=URI(manual_url)
    manual_uri.query=URI.encode_www_form({'include'=>'appPricePoint,territory','limit'=>'200'})
    manual=get.call(manual_uri.to_s);automatic=get.call(automatic_url)
    if manual.nil? && automatic.nil?
      {'configured'=>false}
    else
      base=get.call("/v1/appPriceSchedules/#{schedule['id']}/baseTerritory")&.fetch('data')
      rows=manual && manual['data'] || []
      raise 'Competing or paginated price schedule' unless base && base['id']=='KOR' && rows.length==1 && !manual.dig('links','next') && rows[0].dig('relationships','appPricePoint','data','id')==point_id && rows[0].dig('attributes','startDate').nil? && rows[0].dig('attributes','endDate').nil?
      {'configured'=>true,'baseTerritory'=>'KOR','customerPrice'=>'0'}
    end
  }
  availability_state=-> {
    resource=get.call("/v1/apps/#{app_id}/appAvailabilityV2")&.fetch('data')
    if resource.nil?
      {'configured'=>false}
    else
      raise 'New-territory policy differs' unless resource.dig('attributes','availableInNewTerritories')==false
      rows=[];path="/v2/appAvailabilities/#{resource['id']}/territoryAvailabilities?include=territory&limit=200"
      10.times do
        page=get.call(path);raise 'Availability page unavailable' unless page
        rows.concat(page.fetch('data'));path=page.dig('links','next');break unless path
      end
      raise 'Incomplete territory pagination' if path
      enabled=rows.select{|r|r.dig('attributes','available')==true}
      raise 'Competing territory policy' unless enabled.length==1 && enabled[0].dig('relationships','territory','data','id')=='KOR' && enabled[0].dig('attributes','preOrderEnabled')!=true && enabled[0].dig('attributes','releaseDate').nil?
      {'configured'=>true,'availableTerritories'=>['KOR'],'availableInNewTerritories'=>false,'preOrderEnabled'=>false}
    end
  }
  before_price=price_state.call;before_availability=availability_state.call
  report['preconditionsPassed']=true
  report['before']={'copyright'=>current.dig('attributes','copyright'),'selectedBuildId'=>selected && selected['id'],'price'=>before_price,'availability'=>before_availability}
  if apply
    plan['operations'].each_with_index do |op,index|
      now=draft.call
      already=case index
      when 0
        raise 'Copyright changed concurrently' unless [nil,'2026 MannLab'].include?(now.dig('attributes','copyright'))
        now.dig('attributes','copyright')=='2026 MannLab'
      when 1
        row=get.call("/v1/appStoreVersions/#{version_id}/build")&.fetch('data')
        raise 'Candidate changed concurrently' if row && row['id']!=build_id
        !row.nil?
      when 2 then price_state.call['configured']
      when 3 then availability_state.call['configured']
      end
      row={'method'=>op['method'],'path'=>op['path'],'alreadyMatched'=>already}
      report['operations'] << row
      request.call(op['method'],op['path'],op['body']) unless already
      row['requestCompleted']=true
    end
    last=draft.call
    final_selected=get.call("/v1/appStoreVersions/#{version_id}/build")&.fetch('data')
    raise 'Copyright/build read-back mismatch' unless last.dig('attributes','copyright')=='2026 MannLab' && final_selected && final_selected['id']==build_id
    final_price=price_state.call;final_availability=availability_state.call
    raise 'Price/territory read-back mismatch' unless final_price['configured'] && final_availability['configured']
    report['after']={'copyright'=>'2026 MannLab','selectedBuildId'=>build_id,'price'=>final_price,'availability'=>final_availability,'versionState'=>'PREPARE_FOR_SUBMISSION','releaseType'=>'MANUAL'}
    report['readBackPassed']=true
  end
  report['passed']=true
rescue StandardError=>error
  report['passed']=false;report['failureClass']=error.class.name
ensure
  File.write('play-launch-settings-result.json',JSON.pretty_generate(report)+"\n");puts JSON.generate(report)
end
exit(report['passed'] ? 0 : 1)
