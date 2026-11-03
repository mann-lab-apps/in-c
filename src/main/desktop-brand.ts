import { join } from 'node:path'
import type { App } from 'electron'
import { legacyUserDataName, studioDisplayName } from '../desktop-identity'

type BrandApp = Pick<App, 'getPath' | 'setPath' | 'setName' | 'setAboutPanelOptions'>
export function configureDesktopBrand(app: BrandApp, isolatedProfile?: string): void {
  // productName changes Electron's default profile directory. Keep existing
  // recovery, recent files, preferences AND Chromium localStorage/session data.
  // This must run synchronously before ready / creating any BrowserWindow.
  const profile = isolatedProfile ?? join(app.getPath('appData'), legacyUserDataName)
  app.setPath('userData', profile)
  app.setPath('sessionData', profile)
  app.setName(studioDisplayName)
  app.setAboutPanelOptions({ applicationName: studioDisplayName })
}
