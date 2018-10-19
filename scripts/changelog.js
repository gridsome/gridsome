const execa = require('execa')
const lerna = require.resolve('lerna/cli')

function changelog () {
  const args = [
    'exec',
    '--concurrency', 1,
    '--no-sort',
    '--stream',
    '--',
    'conventional-changelog',
    '--preset', 'angular',
    '--infile', 'CHANGELOG.md',
    '--same-file',
    // '--release-count', 0,
    '--lerna-package', '$LERNA_PACKAGE_NAME',
    '--commit-path', '$PWD'
  ]

  return execa(lerna, args, { stdio: 'inherit' })
}

changelog().catch(err => {
  console.error(err)
  process.exit(1)
})
