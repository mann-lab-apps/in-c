function parseNotationSnapshotOptions(args) {
  const seen = new Set()
  for (const arg of args) {
    const option = arg.startsWith('--profile=') ? '--profile' : arg
    if (!['--profile', '--update', '--fixed-canvas', '--capture-profile'].includes(option)) {
      throw new Error(`Unsupported snapshot argument: ${arg}`)
    }
    if (seen.has(option)) throw new Error(`Duplicate snapshot option: ${option}`)
    seen.add(option)
    if (arg === '--profile') throw new Error('Profile argument requires --profile=studio-r3')
  }
  const profileArgument = args.find(arg => arg.startsWith('--profile='))
  const options = {
    shouldUpdate: args.includes('--update'), fixedCanvas: args.includes('--fixed-canvas'),
    profileArgument, studioProfile: profileArgument === '--profile=studio-r3',
    captureProfile: args.includes('--capture-profile')
  }
  if (profileArgument && !options.studioProfile) throw new Error(`Unsupported notation profile: ${profileArgument}`)
  if (options.captureProfile && !options.studioProfile) throw new Error('Profile capture requires --profile=studio-r3')
  if (options.studioProfile && (options.fixedCanvas || options.shouldUpdate)) throw new Error('Studio profile cannot mix with historical fixed-canvas or baseline update')
  if (options.fixedCanvas && options.shouldUpdate) throw new Error('Fixed-canvas verification cannot update baselines')
  return options
}
module.exports = { parseNotationSnapshotOptions }
