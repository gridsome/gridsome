const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const execa = require('execa')
const axios = require('axios')
const jsYaml = require('js-yaml')
const inquirer = require('inquirer')
const Tasks = require('@hjvedvik/tasks')
const sortPackageJson = require('sort-package-json')
const autocompletePrompt = require('inquirer-autocomplete-prompt')
const { config, hasYarn, hasPnpm, installDependencies } = require('../utils')

inquirer.registerPrompt('autocomplete', autocompletePrompt)

module.exports = async (name, starter = '') => {
  const dir = absolutePath(name)
  const projectName = path.basename(dir)
  const commandName = {
    develop: 'gridsome develop',
    build: 'gridsome build'
  }

  if (fs.existsSync(dir) && fs.readdirSync(dir).length) {
    process.exitCode = 1
    return console.error(
      chalk.red(
        `Could not create project in ${chalk.bold(projectName)} because the directory is not empty.`
      )
    )
  }

  let packageManager = config.get('packageManager')

  const withYarn = await hasYarn()
  const withPnpm = await hasPnpm()
  const starters = await fetchStarters()

  const answers = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'starter',
      message: 'Pick a starter template',
      pageSize: 12,
      prefix: ' ',
      when: () => !starter && starters.length,
      async source (answers, input) {
        const choices = starters.map((starter) => {
          const preview = starter.preview ? chalk.dim(`\n  - ${starter.preview}`) : ''
          const platforms = starter.platforms ? ` (${starter.platforms})` : ''
          const title = `${starter.title} by ${starter.author}`
          return {
            name: `${title}${platforms}${preview}`,
            value: starter.repo,
            short: title
          }
        })

        if (input) {
          return choices.filter((choice) => {
            return choice.name.toLowerCase().search(input) >= 0
          })
        }

        return choices
      }
    },
    {
      type: 'list',
      name: 'packageManager',
      default: 'npm',
      message: 'Pick a package manager that will install dependencies',
      when: () => !packageManager,
      prefix: ' ',
      choices: [
        'npm',
        {
          name: 'Yarn',
          value: 'yarn',
          disabled: () => withYarn ? false : 'not available…'
        },
        {
          name: 'pnpm',
          disabled: () => withPnpm ? false : 'not available…'
        },
        {
          name: 'None, install them manually later',
          short: 'None',
          value: 'none'
        }
      ]
    },
    {
      type: 'confirm',
      name: 'preservePackageManager',
      default: false,
      when: (answers) => answers.packageManager,
      message: (answers) => answers.packageManager !== 'none'
        ? `Do you want to use ${answers.packageManager} for all future Gridsome projects?`
        : 'Do you always want to install dependencies manually?',
      prefix: ' '
    }
  ])

  if (answers.starter) {
    starter = answers.starter
  }

  if (starter) {
    const officialTemplates = starters
      // Official starter kit entries
      .filter(({ author }) => author === 'gridsome')
      // Extract the starter kit name
      .map(({ repo }) => repo.split('-').pop())

    if (/^([a-z0-9_-]+)\//i.test(starter)) {
      starter = `https://github.com/${starter}.git`
    } else if (officialTemplates.includes(starter)) {
      starter = `https://github.com/gridsome/gridsome-starter-${starter}.git`
    }
  } else {
    starter = 'https://github.com/gridsome/gridsome-starter-default'
  }

  if (answers.packageManager) {
    console.log('')
    packageManager = answers.packageManager
    if (answers.preservePackageManager) {
      config.set('packageManager', answers.packageManager)
      console.log('')
      console.log(
        `  - Run ${chalk.green(chalk.bold('gridsome config --set packageManager yarn'))} to install\n` +
        `    with Yarn or other supported package managers by default.\n` +
        `  - Run ${chalk.green(chalk.bold('gridsome config --delete packageManager'))} to clear\n` +
        `    the preferred package manager.\n`
      )
    }
  }

  const tasks = new Tasks([
    {
      title: `Clone ${starter}`,
      task: async (context, task) => {
        await execa('git', ['clone', starter, dir, '--single-branch'], {
          cwd: process.cwd(),
          stdio: 'ignore'
        })

        await fs.remove(path.join(dir, '.git'))

        try {
          await updatePkg(path.join(dir, 'package.json'), {
            name: projectName,
            version: '1.0.0',
            private: true
          })
        } catch (err) {
          task.skip('Failed to update package.json')
        }
      }
    },
    packageManager !== 'none' && {
      title: `Install dependencies with ${packageManager}`,
      task: async (context, task) => {
        try {
          task.setStatus('Installing dependencies...')
          await installDependencies(packageManager || 'npm', dir, task)
          context.didInstall = true
        } catch (err) {
          throw new Error(`\n\n${err.message}`)
        }
      }
    }
  ].filter(Boolean))

  const context = await tasks.run({ didInstall: false })

  console.log()
  console.log('A new Gridsome project was created successfully!')
  console.log('Follow these steps to get started:')
  console.log()
  if (process.cwd() !== dir) {
    console.log(`  - Enter the directory by running ${chalk.green.bold(`cd ${name}`)}`)
  }
  if (!context.didInstall) {
    console.log(`  - Install dependencies with your preferred package manager`)
  }
  console.log(`  - Run ${chalk.green.bold(commandName.develop)} to start local development`)
  console.log(`  - Run ${chalk.green.bold(commandName.build)} to build for production`)
  console.log()
}

async function fetchStarters () {
  try {
    const res = await axios('https://raw.githubusercontent.com/gridsome/gridsome.org/master/starters/starters.yaml')
    return jsYaml.load(res.data)
  } catch (err) {
    return []
  }
}

async function updatePkg (pkgPath, obj) {
  const content = await fs.readFile(pkgPath, 'utf-8')
  const pkg = JSON.parse(content)
  const newPkg = sortPackageJson(Object.assign(pkg, obj))

  await fs.outputFile(pkgPath, JSON.stringify(newPkg, null, 2))
}

function absolutePath (string) {
  if (path.isAbsolute(string)) return string
  return path.join(process.cwd(), string)
}
