import type { NativeProject } from '../../../project/schema'

/** Storage compatibility is not an implemented entry method. Keep the enum
 * untouched and explain the current behavior at each owned native open. */
export function withNativeInputModeNotice(message: string, project?: Pick<NativeProject, 'settings'>): string {
  if (project?.settings.inputMode !== 'pitch-first') return message
  return `${message} 음높이를 먼저 선택하는 입력 방식은 아직 지원하지 않습니다. 음가를 고른 뒤 음을 입력해 주세요. 파일의 입력 설정은 저장할 때 그대로 보존합니다.`
}
