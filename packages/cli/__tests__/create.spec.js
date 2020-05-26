const fs = require('fs')

const runCLI = require('./utils/helpers')

const genPath = `${__dirname}/my-project`

beforeEach(() => {
  fs.mkdirSync(genPath)
  fs.writeFileSync(`${genPath}/index.js`, '// Test')
})

afterEach(() => {
  fs.rmdirSync(genPath, { recursive: true })
})

test('warns if a directory with the same name exists in path', async () => {
  const { stdout } = await runCLI(['create', 'my-project'], __dirname)

  expect(stdout).toBe(`Can't create my-project because there's already a non-empty directory my-project existing in path.`)
})
