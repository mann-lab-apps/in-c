require 'spaceship'
require 'net/http'
require 'json'
require 'base64'

result = { 'operation' => 'read-only Play App Store Connect inspection', 'appId' => '6828809673', 'storeWrites' => false }
begin
  key = ENV.fetch('APPLE_API_KEY')
  key = Base64.strict_decode64(key.gsub(/\s+/, '')) unless key.include?('-----BEGIN')
  token = Spaceship::ConnectAPI::Token.create(key_id: ENV.fetch('APPLE_API_KEY_ID'), issuer_id: ENV.fetch('APPLE_API_ISSUER_ID'), key: key, in_house: false)
  get = lambda do |path|
    uri = URI('https://api.appstoreconnect.apple.com' + path)
    request = Net::HTTP::Get.new(uri)
    request['Authorization'] = "Bearer #{token.text}"
    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, open_timeout: 15, read_timeout: 30) { |http| http.request(request) }
    raise 'Read-only API request rejected' unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)
  end
  app = get.call('/v1/apps/6828809673').fetch('data')
  raise 'Unexpected app identity' unless app['id'] == '6828809673' && app.dig('attributes', 'bundleId') == 'com.mannlab.ddirori.play'
  result['bundleId'] = app.dig('attributes', 'bundleId')
  result['appName'] = app.dig('attributes', 'name')
  result['resources'] = {}
  {
    'versions' => '/v1/apps/6828809673/appStoreVersions?limit=50',
    'builds' => '/v1/builds?filter[app]=6828809673&limit=100',
    'uploads' => '/v1/buildUploads?filter[app]=6828809673&limit=100'
  }.each do |name, path|
    data = get.call(path)
    result['resources'][name] = data.fetch('data').map do |row|
      { 'id' => row['id'], 'attributes' => row.fetch('attributes').select { |k, _| %w[version versionString platform appVersionState appStoreState processingState uploadedDate expired usesNonExemptEncryption buildAudienceType state].include?(k) } }
    end
    result['resources'][name + 'HasNextPage'] = !!data.dig('links', 'next')
  end
  result['passed'] = true
rescue StandardError => error
  result['passed'] = false
  result['failureClass'] = error.class.name
ensure
  File.write('play-asc-inspection.json', JSON.pretty_generate(result) + "\n")
  puts JSON.generate(result)
end
exit(result['passed'] ? 0 : 1)
