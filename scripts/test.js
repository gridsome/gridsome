const execa = require('execa')
const args = ['--env', 'node', '--watchAll']

execa('jest', args, {
  stdio: 'inherit'
})
