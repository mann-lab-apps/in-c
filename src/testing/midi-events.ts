import assert from 'node:assert/strict'

// Test-only reader for emitted SMF1 events, not a general MIDI validator.
// Inspect real MIDI events, so a coincidental byte sequence inside a track name
// cannot satisfy a program-change assertion.
export function readTestMidiEvents(bytes: Uint8Array) {
 const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
 let offset = 14
 const events: { track: number; tick: number; status: number; data: number[] }[] = []
 const vlq = () => {
  let value = 0
  for (let count = 0; count < 4; count++) {
   const next = bytes[offset++]
   value = (value << 7) | (next & 127)
   if (!(next & 128)) return value
  }
  throw new Error('Invalid MIDI variable-length quantity')
 }
 for (let track = 0; track < view.getUint16(10); track++) {
  assert.equal(String.fromCharCode(...bytes.slice(offset, offset + 4)), 'MTrk')
  const end = offset + 8 + view.getUint32(offset + 4)
  offset += 8
  let tick = 0, running = 0
  while (offset < end) {
   tick += vlq()
   let status = bytes[offset]
   if (status >= 128) offset++
   else status = running
   if (status === 255) {
    const kind = bytes[offset++], length = vlq(), data = Array.from(bytes.slice(offset, offset + length))
    offset += length
    // Track-name text varies with the deliberately changed part label.
    if (kind !== 3) events.push({ track, tick, status, data: [kind, ...data] })
   } else {
    assert(status >= 128)
    assert(status < 240)
    running = status
    const length = [12, 13].includes(status >> 4) ? 1 : 2
    events.push({ track, tick, status, data: Array.from(bytes.slice(offset, offset + length)) })
    offset += length
   }
  }
  assert.equal(offset, end)
 }
 assert.equal(offset, bytes.length)
 return events
}
