const runCLI = require('./utils/helpers')

test('warns if unkown option name', async () => {
  const { stdout } = await runCLI(['config', '--set', 'asdf'], { cwd: __dirname })

  expect(stdout).toBe('Unknown option: asdf')
})

test('warns if unkown package manager', async () => {
  const { stdout } = await runCLI(['config', '--set', 'packageManager', 'asdf'], { cwd: __dirname })

  expect(stdout).toMatch('Unsupported package manager: asdf')
  expect(stdout).toMatch('gridsome config --set packageManager none')
})
