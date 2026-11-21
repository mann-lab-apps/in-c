import { useRef, useState } from 'react'

// Device workspace preferences only. Never part of a score/project envelope.
export const dockLayoutProfilesKey = 'studio.dock-layout-profiles.v1'
export type DockLayout = {
  widths: { palette: number; properties: number }
  visibility: { palette: boolean; properties: boolean }
  activeDock: 'palette' | 'properties'
}
export type DockLayoutProfile = { id: string; name: string; layout: DockLayout }
export const dockProfileLimits = { count: 20, name: 40 } as const
export const normalizeDockProfileName = (name: string) => name.normalize('NFC').trim().replace(/\s+/gu, ' ')
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
export function isDockLayout(value: unknown): value is DockLayout {
  if (!isRecord(value) || !isRecord(value.widths) || !isRecord(value.visibility)) return false
  const widths=value.widths, visibility=value.visibility
  return ['palette', 'properties'].every(key => typeof widths[key] === 'number' &&
    Number.isFinite(widths[key]) && Number(widths[key]) >= 200 && Number(widths[key]) <= 360 &&
    typeof visibility[key] === 'boolean') && (value.activeDock === 'palette' || value.activeDock === 'properties')
}
export function decodeDockLayoutProfiles(raw: string | null): DockLayoutProfile[] {
  if (raw === null) return []
  const value: unknown = JSON.parse(raw)
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.profiles) || value.profiles.length > dockProfileLimits.count) throw Error('invalid profiles')
  const ids = new Set<string>(), names = new Set<string>()
  return value.profiles.map((profile: unknown) => {
    if (!isRecord(profile) || typeof profile.id !== 'string' || !profile.id || ids.has(profile.id) ||
      typeof profile.name !== 'string' || normalizeDockProfileName(profile.name) !== profile.name || !profile.name ||
      [...profile.name].length > dockProfileLimits.name || names.has(profile.name) || !isDockLayout(profile.layout)) throw Error('invalid profile')
    ids.add(profile.id); names.add(profile.name)
    return { id: profile.id, name: profile.name, layout: cloneLayout(profile.layout) }
  })
}
export function cloneLayout(layout: DockLayout): DockLayout {
  return { widths: { ...layout.widths }, visibility: { ...layout.visibility }, activeDock: layout.activeDock }
}
export function useDockLayoutProfiles() {
  const [initial] = useState(() => {
    try { return { profiles: decodeDockLayoutProfiles(localStorage.getItem(dockLayoutProfilesKey)), issue: undefined as string | undefined } }
    catch { return { profiles: [], issue: '기존 도크 배치 목록을 읽지 못했습니다. 새 배치를 저장하면 이 기기의 목록을 새로 저장합니다.' } }
  })
  const [profiles, setProfiles] = useState(initial.profiles), current = useRef(profiles)
  const [storageIssue, setStorageIssue] = useState(initial.issue)
  const commit = (next: DockLayoutProfile[]) => {
    current.current = next; setProfiles(next)
    try { localStorage.setItem(dockLayoutProfilesKey, JSON.stringify({ version: 1, profiles: next })); setStorageIssue(undefined) }
    catch { setStorageIssue('기기에 저장하지 못했습니다. 이 창을 종료하기 전까지 현재 세션에서만 사용할 수 있습니다.') }
  }
  return {
    profiles, storageIssue,
    add(rawName: string, layout: DockLayout): { id?: string; error?: string } {
      const name = normalizeDockProfileName(rawName)
      if (!name || [...name].length > dockProfileLimits.name) return { error: `이름을 1–${dockProfileLimits.name}자로 입력하세요. 입력값은 자동으로 줄이지 않습니다.` }
      if (current.current.some(profile => profile.name === name)) return { error: '같은 이름의 배치가 있습니다. 다른 이름을 쓰거나 선택 배치를 갱신하세요.' }
      if (current.current.length >= dockProfileLimits.count) return { error: `배치는 ${dockProfileLimits.count}개까지 저장할 수 있습니다. 사용하지 않는 배치를 먼저 삭제하세요.` }
      if (!isDockLayout(layout)) return { error: '현재 도크 배치를 저장할 수 없습니다.' }
      const id = crypto.randomUUID()
      commit([...current.current, { id, name, layout: cloneLayout(layout) }]); return { id }
    },
    update(id: string, layout: DockLayout) {
      if (!isDockLayout(layout) || !current.current.some(profile => profile.id === id)) return false
      commit(current.current.map(profile => profile.id === id ? { ...profile, layout: cloneLayout(layout) } : profile)); return true
    },
    remove(id: string) {
      if (!current.current.some(profile => profile.id === id)) return false
      commit(current.current.filter(profile => profile.id !== id)); return true
    }
  }
}
