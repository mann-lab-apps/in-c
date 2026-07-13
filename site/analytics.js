const analyticsConfigUrl = new URL('./analytics-config.json', import.meta.url)
const pendingEvents = []
const maxPendingEvents = 25
let analyticsState = 'pending'

const allowedEventParams = new Set([
  'answer',
  'app_name',
  'category',
  'content_slug',
  'content_title',
  'content_type',
  'difficulty',
  'file_name',
  'key',
  'link_text',
  'link_url',
  'location',
  'meter',
  'platform',
  'reading_minutes'
])

const isGa4MeasurementId = (measurementId) =>
  /^G-[A-Z0-9]+$/.test(measurementId)

const disableAnalytics = () => {
  analyticsState = 'disabled'
  pendingEvents.length = 0
}

const sanitizeParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) =>
        allowedEventParams.has(key) &&
        value !== undefined &&
        value !== null &&
        value !== ''
    )
  )

const appendScript = (src) =>
  new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = src
    script.addEventListener('load', resolve, { once: true })
    script.addEventListener('error', reject, { once: true })
    document.head.append(script)
  })

export const configureAnalytics = async () => {
  try {
    const response = await fetch(analyticsConfigUrl)
    if (!response.ok) {
      return
    }

    const config = await response.json()
    const measurementId = String(config.measurementId ?? '').trim()

    if (
      config.provider !== 'ga4' ||
      config.enabled !== true ||
      !isGa4MeasurementId(measurementId)
    ) {
      disableAnalytics()
      return
    }

    analyticsState = 'ready'
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', measurementId, {
      send_page_view: true
    })

    while (pendingEvents.length > 0) {
      const [name, params] = pendingEvents.shift()
      trackEvent(name, params)
    }

    await appendScript(
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    )
  } catch {
    disableAnalytics()
    // Analytics must never block page rendering or navigation.
  }
}

export const trackEvent = (name, params = {}) => {
  if (analyticsState === 'disabled') {
    return
  }

  if (typeof window.gtag !== 'function') {
    if (pendingEvents.length < maxPendingEvents) {
      pendingEvents.push([name, sanitizeParams(params)])
    }
    return
  }

  window.gtag('event', name, {
    ...sanitizeParams(params),
    app_name: 'in-C'
  })
}

export const bindTrackedLinks = () => {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const link = event.target.closest('a[data-track-event]')

    if (!link) {
      return
    }

    trackEvent(link.dataset.trackEvent, {
      link_url: link.href,
      link_text: link.textContent?.trim(),
      location: link.dataset.trackLocation,
      platform: link.dataset.trackPlatform,
      file_name: link.dataset.trackFile,
      content_type: link.dataset.trackContentType,
      content_slug: link.dataset.trackContentSlug
    })
  })
}

export const createReadCompletionTracker = () => {
  const completedKeys = new Set()

  return (key, element, eventName, params = {}) => {
    if (!element || completedKeys.has(key)) {
      return
    }

    const listener = () => {
      if (completedKeys.has(key)) {
        window.removeEventListener('scroll', listener)
        window.removeEventListener('resize', listener)
        return
      }

      const rect = element.getBoundingClientRect()
      const hasReachedEnd = rect.bottom <= window.innerHeight + 80

      if (!hasReachedEnd) {
        return
      }

      completedKeys.add(key)
      window.removeEventListener('scroll', listener)
      window.removeEventListener('resize', listener)
      trackEvent(eventName, params)
    }

    window.addEventListener('scroll', listener, { passive: true })
    window.addEventListener('resize', listener)
    window.requestAnimationFrame(listener)
  }
}
