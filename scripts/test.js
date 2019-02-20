const minimist = require('minimist')
const argv = minimist(process.argv.slice(2))
const options = []

options.push('--config', 'jest.config.js')
options.push('--runInBand')

if (argv.watch) options.push('--watchAll')
if (argv.regex) options.push('--testPathPattern', argv.regex)

require('jest').run(options)
