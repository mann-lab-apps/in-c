const createDisabledTooltip = ({
  buttonClass = 'button button--secondary',
  label,
  tooltip
}) => {
  const wrapper = document.createElement('span')
  wrapper.className = 'disabled-tooltip'
  wrapper.dataset.tooltip = tooltip
  wrapper.tabIndex = 0
  wrapper.setAttribute('aria-label', `${label}. ${tooltip}`)

  const button = document.createElement('span')
  button.className = buttonClass
  button.setAttribute('aria-disabled', 'true')
  button.textContent = label

  wrapper.append(button)
  return wrapper
}

const initDisabledTooltips = (root = document) => {
  for (const wrapper of root.querySelectorAll('.disabled-tooltip[data-tooltip]')) {
    if (!wrapper.hasAttribute('tabindex')) {
      wrapper.tabIndex = 0
    }

    if (wrapper.hasAttribute('aria-label')) {
      continue
    }

    const label = wrapper.textContent.trim()
    const tooltip = wrapper.dataset.tooltip

    if (label && tooltip) {
      wrapper.setAttribute('aria-label', `${label}. ${tooltip}`)
    }
  }
}

export {
  createDisabledTooltip,
  initDisabledTooltips
}
