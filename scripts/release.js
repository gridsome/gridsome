const execa = require('execa')
const semver = require('semver')
const inquirer = require('inquirer')

const curVersion = require('../lerna.json').version
const releaseTypes = ['patch', 'minor', 'major', 'prerelease']

async function release () {
  const { version } = await inquirer.prompt([
    {
      name: 'version',
      message: 'Select release type',
      type: 'list',
      choices: releaseTypes.map(type => {
        const value = semver.inc(curVersion, type)
        return { name: `${type} (${value})`, value }
      })
    }
  ])

  const { confirmed } = await inquirer.prompt([{
    name: 'confirmed',
    message: `Confirm releasing v${version}?`,
    type: 'confirm',
    default: false
  }])

  if (!confirmed) {
    return
  }

  // await execa('git', ['add', '-A'], { stdio: 'inherit' })
  // await execa('git', ['commit', '-m', 'chore: pre release sync'], { stdio: 'inherit' })

  await execa(require.resolve('lerna/cli'), [
    'version',
    version
  ], { stdio: 'inherit' })
}

release().catch(err => {
  console.error(err)
  process.exit(1)
})

