export function detectDesktopPlatform({ platform, userAgent, userAgentData, maxTouchPoints }) {
  const signals = [userAgentData?.platform, platform, userAgent].filter(Boolean).join(' ')
  const mac = /\b(?:Macintosh|MacIntel|MacPPC|Mac68K|macOS|Mac)\b/i.test(signals)

  // iPadOS can advertise a desktop Mac user agent.
  if (userAgentData?.mobile || /\b(?:Android|iPad|iPhone|iPod|Mobile|CrOS)\b/i.test(signals) ||
    (mac && maxTouchPoints > 1)) {
    return null
  }

  if (mac) return 'macos'
  if (/\b(?:Windows|Win32|Win64)\b/i.test(signals)) return 'windows'
  if (/\b(?:Linux|X11)\b/i.test(signals)) return 'linux'
  return null
}
