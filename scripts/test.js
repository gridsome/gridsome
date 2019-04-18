const minimist = require('minimist')
const argv = minimist(process.argv.slice(2))
const options = []

options.push('--config', 'jest.config.js')
options.push('--runInBand')

if (argv.path) options.push('--testPathPattern', argv.path)
if (argv.name) options.push('--testNamePattern', argv.name)
if (argv.watch) options.push('--watchAll')

require('jest').run(options)
