const cpu = require('./cpu')
const Worker = require('jest-worker').default

module.exports = config => {
  const workerPath = require.resolve('./worker')

  return new Worker(workerPath, {
    numWorkers: cpu.logical
    // forkOptions: {
    //   stdio: 'inherit'
    // }
  })
}
