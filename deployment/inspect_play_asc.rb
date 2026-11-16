require 'spaceship'
require 'net/http'
require 'json'
require 'base64'

result = {'operation'=>'read-only Play inspection','appId'=>'6828809673','storeWrites'=>false,'attempts'=>[]}
refs = [{'reference'=>'repository-secret','key_id'=>ENV.fetch('APPLE_API_KEY_ID'),'key'=>ENV.fetch('APPLE_API_KEY')}]
Dir.glob('/Users/jaemankim/Desktop/appstoreconnect/AuthKey_*.p8').sort.each_with_index do |file,index|
  refs << {'reference'=>"user-provided-desktop-#{index}",'key_id'=>File.basename(file)[/AuthKey_(.+)\.p8/,1],'key'=>File.read(file)}
end
refs.each do |ref|
  attempt={'keyReference'=>ref['reference']}
  begin
    key=ref['key'];key=Base64.strict_decode64(key.gsub(/\s+/,'')) unless key.include?('-----BEGIN')
    token=Spaceship::ConnectAPI::Token.create(key_id:ref['key_id'],issuer_id:ENV.fetch('APPLE_API_ISSUER_ID'),key:key,in_house:false)
    get=lambda do |path|
      uri=URI('https://api.appstoreconnect.apple.com'+path);req=Net::HTTP::Get.new(uri);req['Authorization']="Bearer #{token.text}"
      response=Net::HTTP.start(uri.hostname,uri.port,use_ssl:true,open_timeout:15,read_timeout:30){|http|http.request(req)}
      unless response.is_a?(Net::HTTPSuccess)
        attempt['failedRead']={'resource'=>path.split('?').first,'httpStatus'=>response.code.to_i}
        begin;attempt['failedRead']['codes']=JSON.parse(response.body).fetch('errors',[]).map{|e|e['code']};rescue JSON::ParserError;end
        raise 'Read-only request rejected'
      end
      JSON.parse(response.body)
    end
    app=get.call('/v1/apps/6828809673').fetch('data')
    raise 'Unexpected app' unless app['id']=='6828809673' && app.dig('attributes','bundleId')=='com.mannlab.ddirori.play'
    resources={}
    {'versions'=>'/v1/apps/6828809673/appStoreVersions?limit=50','builds'=>'/v1/apps/6828809673/builds?limit=100','uploads'=>'/v1/apps/6828809673/buildUploads?limit=100'}.each do |name,path|
      data=get.call(path)
      resources[name]=data.fetch('data').map{|r|{'id'=>r['id'],'attributes'=>r.fetch('attributes').select{|k,_|%w[version versionString cfBundleShortVersionString cfBundleVersion platform appVersionState appStoreState releaseType processingState uploadedDate expired usesNonExemptEncryption buildAudienceType state].include?(k)}}}
      resources[name+'HasNextPage']=!!data.dig('links','next')
      result['resources']=resources
    end
    attempt['passed']=true;result['passed']=true;result['selectedKeyReference']=ref['reference']
  rescue StandardError=>e
    attempt['passed']=false;attempt['failureClass']=e.class.name
  ensure
    result['attempts'] << attempt
  end
  break if result['passed']
end
result['passed']=false unless result.key?('passed')
File.write('play-asc-inspection.json',JSON.pretty_generate(result)+"\n");puts JSON.generate(result)
exit(result['passed'] ? 0 : 1)
