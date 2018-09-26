const Worker = require('jest-worker').default

module.exports = (config, numWorkers) => {
  const workerPath = require.resolve('./worker')

  return new Worker(workerPath, {
    numWorkers,
    forkOptions: {
      stdio: ['pipe', 'pipe', process.stderr, 'ipc']
    }
  })
}
