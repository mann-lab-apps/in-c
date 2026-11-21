import type {Measure,Score,ScoreCommand,StaffAddress} from '../../../score-core'

// Existing-bar content edits must keep authored numbers and their aliases.
// Structural insertion/removal still uses measure-management's numbering policy.
// This private adapter uses the existing command and its exact inverse; it does
// not extend the engine/schema or normalize an imported score a second time.
export function buildStaffContentCommand(parts:Score['parts'],target:StaffAddress,measures:Measure[]):ScoreCommand {
  return {
    type:'score-parts.replace',
    parts:parts.map(part=>part.id!==target.partId?part:{
      ...part,
      staves:part.staves.map(staff=>staff.id!==target.staffId?staff:{...staff,measures})
    })
  }
}
