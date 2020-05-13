const path = require('path')
const execa = require('execa')
const cli = require.resolve('../bin/gridsome')

test('show @gridsome/cli version', async () => {
  const { stdout } = await execa(cli, ['-v'])

  expect(stdout).toMatch(/@gridsome\/cli v(\d+\.?){3}/)
})

test('show local gridsome version', async () => {
  const { stdout } = await execa(cli, ['-v'], {
    cwd: path.join(__dirname, '__fixtures__', 'project')
  })

  expect(stdout).toMatch(/gridsome v(\d+\.?){3}/)
})

test('warn about unknown command', async () => {
  const { stdout } = await execa(cli, ['asdf'])

  expect(stdout).toMatch('Unknown command asdf')
})

test('suggest matching command', async () => {
  const { stdout } = await execa(cli, ['creaet'])

  expect(stdout).toContain('Did you mean create?')
})
