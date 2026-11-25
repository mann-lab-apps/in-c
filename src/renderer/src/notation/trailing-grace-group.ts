import {
  Dot, Formatter, Fraction, GraceNoteGroup, Modifier, Stave, StaveNote,
  type GraceNote, type ModifierContext, type Note, type Voice
} from 'vexflow'
import { readScoreVoiceNumber } from '../../../score-core/voice-order'

export class StaffGraceNoteGroup extends GraceNoteGroup {
  private layoutAnchor?: StaveNote
  private precedingWidth = 0
  private closingWidth = 0
  private leadingReserve = 0

  constructor(graceNotes: GraceNote[], readonly voiceId: string, private readonly hasTrailingGroup: boolean) {
    super(graceNotes)
  }

  placeAt(anchor?: StaveNote, precedingWidth = 0, closingWidth = 0): void {
    this.layoutAnchor = anchor
    this.precedingWidth = precedingWidth
    this.closingWidth = closingWidth
  }

  override getWidth(): number {
    return super.getWidth() + this.precedingWidth + this.leadingReserve
  }

  reserveLeadingWidth(width: number): void {
    this.leadingReserve = width
  }

  override alignSubNotesWithNote(
    subNotes: Note[],
    note: Note,
    position = Modifier.Position.LEFT
  ): void {
    const anchor = this.layoutAnchor ?? note
    const stave = note.getStave()
    if (stave && !anchor.getStave()) anchor.setStave(stave)
    super.alignSubNotesWithNote(subNotes, anchor, position)
    if (!(note instanceof StaveNote)) return

    // VexFlow's left alignment also subtracts space reserved for right modifiers.
    let offset = this.hasTrailingGroup ? note.getTickContext().getMetrics().modRightPx : 0
    if (position === Modifier.Position.RIGHT) {
      const left = Math.min(...subNotes.map(grace =>
        grace.getAbsoluteX() - grace.getTickContext().getMetrics().totalLeftPx
      ))
      const notes = this.layoutAnchor
        ? this.layoutAnchor.getModifierContext()!.getMembers(StaveNote.CATEGORY).filter(isVisibleNote)
        : [note]
      const start = Math.max(...notes.map(principal => {
        if (stave && !principal.getStave()) principal.setStave(stave)
        const right = principal.getModifierStartXY(position, 0, { forceFlagRight: true }).x +
          principal.getRightDisplacedHeadPx()
        const dots = principal.getModifiers().filter(mark => mark instanceof Dot)
        return right + Math.max(0, ...dots.map(dot => dot.getXShift() + dot.getWidth()))
      }))
      const closingStart = stave && this.closingWidth
        ? stave.getNoteEndX() - Stave.defaultPadding - this.closingWidth
        : start
      const desiredLeft = Math.max(start, closingStart) + this.precedingWidth
      offset = this.layoutAnchor ? desiredLeft - left : Math.max(0, desiredLeft - left)
    }
    for (const grace of subNotes) {
      const tick = grace.getTickContext()
      tick.setXOffset(tick.getXOffset() + offset)
    }
  }
}

function isVisibleNote(note: unknown): note is StaveNote {
  return note instanceof StaveNote && note.renderOptions.draw !== false
}

function isTrailingGroup(modifier: unknown): modifier is StaffGraceNoteGroup {
  return modifier instanceof StaffGraceNoteGroup && modifier.getPosition() === Modifier.Position.RIGHT
}

export function placeLeadingGraceGroups(context: ModifierContext): void {
  const groups = context.getMembers(GraceNoteGroup.CATEGORY)
    .filter(group => group instanceof StaffGraceNoteGroup)
    .filter(group => group.getPosition() === Modifier.Position.LEFT)
  if (groups.length < 2) return

  const entries = groups.flatMap(group => {
    group.reserveLeadingWidth(0)
    // The groups align at the host, so their final notes share the column.
    const grace = group.getGraceNotes().at(-1)
    if (!(grace instanceof StaveNote)) return []
    const keys = grace.getKeys()
    return [{ group, heads: grace.getKeyProps().map(({ line }, index) => ({ line, key: keys[index] })) }]
  }).sort((a, b) =>
    readScoreVoiceNumber(a.group.voiceId) - readScoreVoiceNumber(b.group.voiceId) ||
    a.group.voiceId.localeCompare(b.group.voiceId)
  )
  // VexFlow reserves the widest group in a shared column. Include the width
  // of a conflicting group to put the preceding grace on its left.
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    let reserve = 0
    for (const later of entries.slice(index + 1)) {
      const conflict = entry.heads.some(head => later.heads.some(other => head.line === other.line && head.key !== other.key))
      if (!conflict) continue
      later.group.preFormat()
      reserve = Math.max(reserve, later.group.getWidth() + 4)
    }
    entry.group.reserveLeadingWidth(reserve)
  }
}

/** Share spacing with the last column before each trailing group's written time.
 * Keep the modifier on its principal for drawing, selection and SVG ownership. */
export function placeTrailingGraceGroups(voices: Voice[]): void {
  if (!voices.some(voice => voice.getTickables().some(note => note.getModifiers().some(isTrailingGroup)))) return

  const resolution = Formatter.getResolutionMultiplier(voices)
  const notes = voices.flatMap(voice => {
    const position = new Fraction(0, resolution)
    return voice.getTickables().flatMap(note => {
      const start = position.numerator
      position.add(note.getTicks())
      return isVisibleNote(note) ? [{ note, start, end: position.numerator }] : []
    })
  }).sort((first, second) => second.start - first.start)
  const affected = new Map<ModifierContext, StaveNote>()

  for (const { note, start, end } of notes) {
    const group = note.getModifiers().find(isTrailingGroup)
    if (!group) continue
    group.placeAt()
    const shifted = notes.find(other => other.start > start && other.start < end)
    if (!shifted) continue
    const source = note.getModifierContext()!
    const destination = shifted.note.getModifierContext()!
    // joinVoices has built the columns but their widths have not been measured.
    const members = source.getMembers(GraceNoteGroup.CATEGORY)
    members.splice(members.indexOf(group), 1)
    destination.addMember(group)
    affected.set(destination, shifted.note)
  }

  const closingColumn = notes[0]?.note.getModifierContext()
  for (const [context, anchor] of affected) {
    const groups = context.getMembers(GraceNoteGroup.CATEGORY).filter(isTrailingGroup)
    const widths = groups.map(group => {
      group.preFormat()
      return group.getWidth() + 4
    })
    const closingWidth = context === closingColumn ? widths.reduce((sum, width) => sum + width, 0) : 0
    let precedingWidth = 0
    groups.forEach((group, index) => {
      group.placeAt(anchor, precedingWidth, closingWidth)
      precedingWidth += widths[index]
    })
  }
}
