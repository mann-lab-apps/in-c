import { useRef, useState } from 'react'
import type { ScorePageSetup } from '../../score-core'

// Local named page settings, never project data or a complete score style.
export type PrintSetup = Required<ScorePageSetup>
export interface PrintPageProfile { id: string; name: string; setup: PrintSetup }
export const printPageProfilesKey = 'studio.print-page-profiles.v1'
const normalizeName = (name: string) => name.normalize('NFC').trim().replace(/\s+/gu, ' ')
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const validName = (name: string) => Boolean(name && [...name].length <= 40 && !/[\u0000-\u001f\u007f]/u.test(name))
function validSetup(value: unknown): value is PrintSetup {
  if (!record(value) || (value.pageSize !== 'a4' && value.pageSize !== 'letter') || (value.orientation !== 'portrait' && value.orientation !== 'landscape')) return false
  return ([['pageMarginMm', 3, 30], ['staffSizePercent', 75, 125], ['systemSpacingPercent', 80, 140]] as const)
    .every(([key, min, max]) => typeof value[key] === 'number' && Number.isFinite(value[key]) && Number(value[key]) >= min && Number(value[key]) <= max)
}
const clone = (setup: PrintSetup): PrintSetup => ({ pageSize: setup.pageSize, orientation: setup.orientation,
  pageMarginMm: setup.pageMarginMm, staffSizePercent: setup.staffSizePercent, systemSpacingPercent: setup.systemSpacingPercent })
export function decodePrintPageProfiles(raw: string | null): PrintPageProfile[] {
  if (raw === null) return []
  const value: unknown = JSON.parse(raw)
  if (!record(value) || value.version !== 1 || !Array.isArray(value.profiles) || value.profiles.length > 20) throw Error('invalid profiles')
  const ids = new Set<string>(), names = new Set<string>()
  return value.profiles.map((entry: unknown) => {
    if (!record(entry) || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || typeof entry.name !== 'string' ||
      !validName(entry.name) || normalizeName(entry.name) !== entry.name || names.has(entry.name) || !validSetup(entry.setup)) throw Error('invalid profile')
    ids.add(entry.id); names.add(entry.name)
    return { id: entry.id, name: entry.name, setup: clone(entry.setup) }
  })
}
export function usePrintPageProfiles() {
  const [initial] = useState(() => {
    try { return { profiles: decodePrintPageProfiles(localStorage.getItem(printPageProfilesKey)), issue: undefined as string | undefined } }
    catch { return { profiles: [], issue: '출력 설정 목록을 읽지 못했습니다. 새 프리셋을 저장하면 이 기기의 목록을 새로 저장합니다.' } }
  })
  const [profiles, setProfiles] = useState(initial.profiles), current = useRef(profiles)
  const [storageIssue, setStorageIssue] = useState(initial.issue)
  const commit = (next: PrintPageProfile[]) => {
    current.current = next; setProfiles(next)
    try { localStorage.setItem(printPageProfilesKey, JSON.stringify({ version: 1, profiles: next })); setStorageIssue(undefined) }
    catch { setStorageIssue('기기에 저장하지 못했습니다. 이 창을 종료하기 전까지 현재 세션에서만 사용할 수 있습니다.') }
  }
  return { profiles, storageIssue,
    add(rawName: string, setup: PrintSetup): { id?: string; error?: string } {
      const name = normalizeName(rawName)
      if (!validName(name)) return { error: '이름을 1–40자로 입력하세요. 제어 문자는 사용할 수 없습니다.' }
      if (current.current.some(profile => profile.name === name)) return { error: '같은 이름의 프리셋이 있습니다. 다른 이름을 쓰거나 선택 프리셋을 갱신하세요.' }
      if (current.current.length >= 20) return { error: '프리셋은 20개까지 저장할 수 있습니다. 사용하지 않는 항목을 먼저 삭제하세요.' }
      if (!validSetup(setup)) return { error: '현재 출력 설정을 저장할 수 없습니다.' }
      const id = crypto.randomUUID()
      commit([...current.current, { id, name, setup: clone(setup) }]); return { id }
    },
    update(id: string, setup: PrintSetup) {
      if (!validSetup(setup) || !current.current.some(profile => profile.id === id)) return false
      commit(current.current.map(profile => profile.id === id ? { ...profile, setup: clone(setup) } : profile)); return true
    },
    remove(id: string) {
      if (!current.current.some(profile => profile.id === id)) return false
      commit(current.current.filter(profile => profile.id !== id)); return true
    }
  }
}
