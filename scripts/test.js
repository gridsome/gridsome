const execa = require('execa')

execa('jest', ['--config', 'jest.config.js', '--watchAll'], {
  stdio: 'inherit',
  env: {
    WITH_BUILD: process.argv.some(v => v === '--build')
  }
})
