const path = require('path')

const runCLI = require('./utils/helpers')

test('show @gridsome/cli version', async () => {
  const { stdout } = await runCLI(['-v'])

  expect(stdout).toMatch(/@gridsome\/cli v(\d+\.?){3}/)
})

test('show local gridsome version', async () => {
  const testPath = path.join(__dirname, '__fixtures__', 'project')
  const { stdout } = await runCLI(['-v'], { cwd: testPath })

  expect(stdout).toMatch(/gridsome v(\d+\.?){3}/)
})

test('warn about unknown command', async () => {
  const { stdout } = await runCLI(['asdf'])

  expect(stdout).toMatch('Unknown command asdf')
})

test('suggest matching command', async () => {
  const { stdout } = await runCLI(['creaet'])

  expect(stdout).toContain('Did you mean create?')
})
