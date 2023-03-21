const e2e = process.argv.some(v => v === '--e2e')

const testPathIgnorePatterns = [
  '/__fixtures__/',
  '/projects/',
  '/scripts/'
]

module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns,
  testMatch: [
    `**/__tests__/**/*.${e2e ? 'e2e' : 'spec'}.js`
  ],
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
