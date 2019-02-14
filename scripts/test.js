const args = ['--config', 'jest.config.js']

if (process.argv.some(v => v === '--watch')) {
  args.push('--watchAll')
}

require('jest').run(args)
