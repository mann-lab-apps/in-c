require_relative 'release'
require 'digest/md5'

module Deployment
  # Deliberately a reviewed subset of Apple's slots, checked 2026-10-21.
  # Add a new slot explicitly when another supported device is onboarded.
  class IOSAssets
    SCREENSHOTS = {
      'APP_IPHONE_67' => [[1260, 2736], [1290, 2796], [1320, 2868]],
      'APP_IPHONE_65' => [[1242, 2688], [1284, 2778]],
      'APP_IPAD_PRO_3GEN_129' => [[2048, 2732], [2064, 2752]]
    }.freeze
    PREVIEWS = { 'IPHONE_67' => [[886, 1920]], 'IPHONE_65' => [[886, 1920]],
                 'IPAD_PRO_3GEN_129' => [[1200, 1600], [1600, 1200]] }.freeze

    def self.inspect_file(path, kind, display_type, probe: nil)
      raise Error, 'empty media asset' unless File.size(path).positive?
      details = if kind == 'screenshot'
                  raise Error, 'screenshot must be PNG or JPEG' unless %w[.png .jpg .jpeg].include?(File.extname(path).downcase)
                  result, _, status = Open3.capture3('sips', '-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', path)
                  raise Error, 'cannot inspect screenshot' unless status.success?
                  raise Error, 'screenshots cannot contain alpha channels' if result.match?(/hasAlpha:\s*yes/)
                  { 'width' => result[/pixelWidth:\s*(\d+)/, 1].to_i, 'height' => result[/pixelHeight:\s*(\d+)/, 1].to_i }
                else
                  raise Error, 'video must be MOV, MP4 or M4V' unless %w[.mov .mp4 .m4v].include?(File.extname(path).downcase)
                  if probe
                    probe.call(path)
                  else
                    output, _, status = Open3.capture3('ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path)
                    raise Error, 'cannot inspect video' unless status.success?
                    data = JSON.parse(output)
                    video = data.fetch('streams').find { |s| s['codec_type'] == 'video' }
                    raise Error, 'video stream missing' unless video
                    numerator, denominator = video.fetch('avg_frame_rate').split('/').map(&:to_f)
                    { 'width' => video['width'], 'height' => video['height'], 'codec' => video['codec_name'],
                      'duration' => data.fetch('format').fetch('duration').to_f, 'fps' => numerator / denominator }
                  end
                end
      if kind == 'screenshot' || kind == 'preview'
        slots = kind == 'screenshot' ? SCREENSHOTS : PREVIEWS
        sizes = slots.fetch(display_type) { raise Error, 'unsupported media display type' }
        dimensions = [details['width'], details['height']]
        raise Error, 'media dimensions differ from display type' unless sizes.include?(dimensions) || sizes.include?(dimensions.reverse)
      end
      if kind == 'preview'
        raise Error, 'App Preview must be 15–30 seconds, <=500 MB, H.264, <=30 fps' unless details['duration'].between?(15, 30) && File.size(path) <= 500_000_000 && details['codec'] == 'h264' && details['fps'].positive? && details['fps'] <= 30.01
      end
      details.merge('bytes' => File.size(path), 'sha256' => Digest::SHA256.file(path).hexdigest,
                    'md5' => Digest::MD5.file(path).hexdigest)
    rescue Errno::ENOENT
      raise Error, 'media inspection tool missing (sips for images, ffprobe for video)'
    end
  end
end
