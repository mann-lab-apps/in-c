import iconUrl from './assets/icon.svg'

const CONTACT_EMAIL = 'daga4242@gmail.com'

const normalizeRoot = (root) => {
  if (typeof root !== 'string' || root.trim() === '') {
    return './'
  }

  return root.endsWith('/') ? root : `${root}/`
}

const renderHeader = (root) => `
  <header class="site-header site-shell-header">
    <a class="brand" href="${root}index.html" aria-label="in C 홈">
      <img src="${iconUrl}" width="36" height="36" alt="" />
      <span>in C</span>
    </a>
  </header>
`

const renderFooter = (root) => `
  <footer class="site-footer site-shell-footer">
    <p>© 2026 mann-lab-apps.</p>
    <div>
      <span class="site-shell-contact">
        <span class="site-shell-contact__icon" aria-hidden="true">✉</span>
        <span data-site-contact-email>${CONTACT_EMAIL}</span>
        <button class="site-shell-copy" data-copy-contact type="button">복사</button>
        <span class="site-shell-copy__status" data-copy-contact-status hidden role="status"></span>
      </span>
      <a href="${root}privacy.html">개인정보 처리방침</a>
    </div>
  </footer>
`

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const field = document.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  document.execCommand('copy')
  field.remove()
}

const bindContactCopy = () => {
  for (const button of document.querySelectorAll('[data-copy-contact]')) {
    button.addEventListener('click', async () => {
      const status = button.parentElement?.querySelector('[data-copy-contact-status]')

      try {
        await copyText(CONTACT_EMAIL)
        if (status) {
          status.hidden = false
          status.textContent = '복사됨'
        }
      } catch {
        if (status) {
          status.hidden = false
          status.textContent = '복사 실패'
        }
      }

      window.setTimeout(() => {
        if (status) {
          status.hidden = true
          status.textContent = ''
        }
      }, 1800)
    })
  }
}

export const initSiteShell = () => {
  for (const target of document.querySelectorAll('[data-site-header]')) {
    const root = normalizeRoot(target.dataset.siteRoot)
    target.outerHTML = renderHeader(root)
  }

  for (const target of document.querySelectorAll('[data-site-footer]')) {
    const root = normalizeRoot(target.dataset.siteRoot)
    target.outerHTML = renderFooter(root)
  }

  bindContactCopy()
}
