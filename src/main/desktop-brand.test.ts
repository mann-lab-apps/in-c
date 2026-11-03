import { describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { configureDesktopBrand } from './desktop-brand'

describe('desktop brand storage compatibility', () => {
  it.each([undefined, '/isolated/profile'])('pins userData and Chromium session before renaming (%s)', isolated => {
    const paths: Record<string, string> = { appData: '/isolated/Application Support' }
    const steps: string[] = []
    const app = {
      getPath: vi.fn((key: string) => paths[key]),
      setPath: vi.fn((key: string, value: string) => { paths[key] = value; steps.push(key) }),
      setName: vi.fn(() => steps.push('name')),
      setAboutPanelOptions: vi.fn()
    }
    configureDesktopBrand(app, isolated)
    const expected = isolated ?? join(paths.appData, 'in-C')
    expect(paths.userData).toBe(expected)
    expect(paths.sessionData).toBe(expected)
    expect(steps).toEqual(['userData', 'sessionData', 'name'])
    expect(app.setName).toHaveBeenCalledWith('띠로리 Studio')
    expect(app.setAboutPanelOptions).toHaveBeenCalledWith({ applicationName: '띠로리 Studio' })
  })
})
