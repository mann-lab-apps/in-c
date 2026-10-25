const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const device = JSON.parse(fs.readFileSync(path.join(__dirname, 'score-device.json')))
assert.match(device.name, /^DDIRORI-Studio-R3-Score-20261026-\d+$/)
const args = process.argv.slice(2)
const [command, xText, yText, labelText] = args
const label = command === 'capture' ? xText : command === 'drag' ? args[5] : labelText
assert.match(label || '', /^[a-zA-Z0-9_-]+$/)
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const out = path.join(root, 'out/ddirori/studio-r3-score-transfer')
const script = lines => execFileSync('osascript', lines.flatMap(line => ['-e', line]), { encoding: 'utf8' }).trim()
let point
if (command === 'tap' || command === 'hold' || command === 'drag') {
  const x = Number(xText), y = Number(yText)
  const endX = command === 'drag' ? Number(args[3]) : x
  const endY = command === 'drag' ? Number(args[4]) : y
  assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1)
  assert.ok(endX >= 0 && endX <= 1 && endY >= 0 && endY <= 1)
  const gate = ['tell application "System Events" to tell process "Simulator"',
    `set w to first window whose name starts with "${device.name}"`,
    'perform action "AXRaise" of w', 'set frontmost to true',
    `if name of first window does not start with "${device.name}" then error "Wrong simulator window"`,
    'set p to position of group 1 of w', 'set s to size of group 1 of w']
  const result = script([...gate,
    `set px to round ((item 1 of p) + ${x} * (item 1 of s))`,
    `set py to round ((item 2 of p) + ${y} * (item 2 of s))`,
    `set ex to round ((item 1 of p) + ${endX} * (item 1 of s))`,
    `set ey to round ((item 2 of p) + ${endY} * (item 2 of s))`,
    'return "[" & px & "," & py & "," & ex & "," & ey & "]"', 'end tell'])
  point = JSON.parse(result)
  execFileSync('swift', ['-e', `import CoreGraphics
import Foundation
guard CGPreflightPostEventAccess() else { fatalError("Mouse event access is not available") }
let point = CGPoint(x: ${point[0]}, y: ${point[1]})
CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
usleep(16000)
CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
usleep(${command === 'hold' ? 1000000 : 80000})
let end = CGPoint(x: ${point[2]}, y: ${point[3]})
${command === 'drag' ? `for step in 1...16 {
  let t = Double(step) / 16
  let location = CGPoint(x: point.x + (end.x - point.x) * t, y: point.y + (end.y - point.y) * t)
  CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: location, mouseButton: .left)?.post(tap: .cghidEventTap)
  usleep(16000)
}` : ''}
CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: end, mouseButton: .left)?.post(tap: .cghidEventTap)`], { stdio: 'pipe' })
} else assert.equal(command, 'capture')
// Observation delay for native sheet animation; not a product timing assertion.
script(['delay 0.6'])
const file = path.join(out, `${label}.png`)
execFileSync('xcrun', ['simctl', 'io', device.id, 'screenshot', file], { stdio: 'pipe' })
const tracePath = path.join(__dirname, 'score-ui-trace.json')
const trace = fs.existsSync(tracePath) ? JSON.parse(fs.readFileSync(tracePath)) : []
trace.push({ at: new Date().toISOString(), command, normalized: point ? [Number(xText), Number(yText)] : undefined,
  normalizedEnd: command === 'drag' ? [Number(args[3]), Number(args[4])] : undefined,
  desktopPoint: point, driver: point ? 'CGEvent with existing post-event access and own-window gate' : 'simctl capture', device: device.id, screenshot: path.relative(root, file) })
fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2) + '\n')
console.log(JSON.stringify(trace.at(-1)))
