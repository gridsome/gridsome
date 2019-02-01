const glob = require('globby')

run()

async function run () {
  const payload = process.env.GITHUB_EVENT_PATH
    ? require(process.env.GITHUB_EVENT_PATH)
    : {}

  const isReleasing = payload.commits.some(commit => {
    return commit.message === 'chore(release): publish'
  })

  if (!isReleasing) {
    console.log('Nothing to release')
  }

  const changelogs = await glob('**/*/CHANGELOG.md', {
    cwd: process.env.GITHUB_WORKSPACE,
    absolute: true
  })

  console.log(changelogs)
}
