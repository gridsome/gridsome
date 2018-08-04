const execa = require('execa')
const args = ['--env', 'node']

execa('jest', args, {
  stdio: 'inherit'
})
