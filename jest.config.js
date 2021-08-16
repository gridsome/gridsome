const { GRIDSOME_TEST = 'unit' } = process.env

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    `**/__tests__/**/*.${GRIDSOME_TEST === 'e2e' ? 'e2e' : 'spec'}.js`
  ],
  collectCoverageFrom: [
    'gridsome/lib/**/*.js'
  ],
  testPathIgnorePatterns: [
    '/__fixtures__/',
    '/projects/',
    '/scripts/'
  ],
  watchPathIgnorePatterns: [
    '/__fixtures__/',
    '/node_modules/',
    '/projects/',
    '/.git/'
  ]
}
