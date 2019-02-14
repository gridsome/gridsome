const testPathIgnorePatterns = [
  '/__fixtures__/',
  '/projects/',
  '/scripts/'
]

const testMatch = []

if (process.argv.some(v => v === '--build')) {
  testMatch.push('**/__tests__/**/build.spec.js')
} else {
  testMatch.push('**/__tests__/**/!(build).spec.js')
}

module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns,
  testMatch,
  setupFiles: [
    '<rootDir>/scripts/testSetup.js'
  ],
  collectCoverageFrom: [
    'gridsome/lib/**/*.js'
  ],
  watchPathIgnorePatterns: [
    '/__fixtures__/',
    '/projects/'
  ]
}
