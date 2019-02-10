const execa = require('execa')
const cli = require.resolve('../bin/gridsome')

test('show @gridsome/cli version', async () => {
  const { stdout } = await execa(cli, ['-v'])
  const version = require('../package.json').version

  expect(stdout).toEqual(`@gridsome/cli v${version}`)
})

test('Warn about unknown command', async () => {
  const { stdout } = await execa(cli, ['asdf'])

  expect(stdout).toMatch('Unknown command asdf')
})
