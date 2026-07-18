const signingVariables = ['CSC_LINK', 'CSC_KEY_PASSWORD']

const notarizationProfiles = [
  {
    name: 'App Store Connect API key',
    variables: ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']
  },
  {
    name: 'Apple ID app-specific password',
    variables: ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
  },
  {
    name: 'Keychain notarization profile',
    variables: ['APPLE_KEYCHAIN', 'APPLE_KEYCHAIN_PROFILE']
  }
]

function isPresent(name) {
  return Boolean(process.env[name] && process.env[name].trim())
}

function missingVariables(variables) {
  return variables.filter((name) => !isPresent(name))
}

const missingSigningVariables = missingVariables(signingVariables)
const completeNotarizationProfile = notarizationProfiles.find((profile) =>
  profile.variables.every(isPresent)
)

if (missingSigningVariables.length > 0 || !completeNotarizationProfile) {
  const failures = []

  if (missingSigningVariables.length > 0) {
    failures.push(
      `missing Developer ID signing secrets: ${missingSigningVariables.join(
        ', '
      )}`
    )
  }

  if (!completeNotarizationProfile) {
    failures.push(
      'missing notarization credentials; provide one complete set: ' +
        notarizationProfiles
          .map((profile) => `${profile.name} (${profile.variables.join(', ')})`)
          .join('; ')
    )
  }

  console.error(
    `macOS signing environment is incomplete: ${failures.join('. ')}`
  )
  process.exit(1)
}

console.log(
  `macOS signing environment is ready using ${completeNotarizationProfile.name}.`
)
