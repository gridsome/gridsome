const execa = require('execa')
const args = ['--env', 'node', '--coverage']

execa('jest', args, {
  stdio: 'inherit'
})
