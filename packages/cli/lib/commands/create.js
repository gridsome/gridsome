const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const chalk = require('chalk')
const Tasks = require('@hjvedvik/tasks')
const sortPackageJson = require('sort-package-json')
const { hasYarn } = require('../utils')

module.exports = async (name, starter = 'default') => {
  const dir = absolutePath(name)
  const projectName = path.basename(dir)
  const starters = ['default', 'wordpress']
  const useYarn = await hasYarn()
  const commandName = {
    develop: 'gridsome develop',
    build: 'gridsome build'
  }

  try {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : []
    if (files.length) {
      return console.log(chalk.red(`Can't create ${projectName} because there's already a non-empty directory ${projectName} existing in path.`))
    }
  } catch (err) {
    throw new Error(err.message)
  }

  if (/^([a-z0-9_-]+)\//i.test(starter)) {
    starter = `https://github.com/${starter}.git`
  } else if (starters.includes(starter)) {
    starter = `https://github.com/gridsome/gridsome-starter-${starter}.git`
  }

  const tasks = new Tasks([
    {
      title: `Clone ${starter}`,
      task: async () => {
        try {
          await exec('git', ['clone', starter, dir, '--single-branch'])
          await fs.remove(path.join(dir, '.git'))
        } catch (err) {
          throw new Error(err.message)
        }
      }
    },
    {
      title: 'Update project package.json',
      task: async (_, task) => {
        try {
          await updatePkg(`${dir}/package.json`, {
            name: projectName,
            private: true
          })
        } catch (err) {
          task.skip('Failed to update package.json')
        }
      }
    },
    {
      title: `Install dependencies`,
      task: (_, task) => {
        let command = 'npm'
        if (!fs.existsSync(path.join(dir, 'package-lock.json'))) {
          command = useYarn ? 'yarn' : 'npm'
        }
        const stdio = ['ignore', 'pipe', 'ignore']
        const options = { cwd: dir, stdio }
        const args = []

        if (command === 'npm') {
          task.setStatus('Installing dependencies with npm...')
          args.push('install', '--loglevel', 'error')
        } else if (command === 'yarn') {
          args.push('--json')
        }

        return new Promise((resolve, reject) => {
          const child = exec(command, args, options, dir)

          child.stdout.on('data', buffer => {
            let str = buffer.toString().trim()

            if (str && command === 'yarn' && str.includes('"type":')) {
              const newLineIndex = str.lastIndexOf('\n')

              if (newLineIndex !== -1) {
                str = str.substr(newLineIndex)
              }

              try {
                const { type, data } = JSON.parse(str)

                if (type === 'step') {
                  const { message, current, total } = data
                  task.setStatus(`${message} (${current} of ${total})`)
                }
              } catch (e) {}
            } else {
              task.setStatus(`Installing dependencies with ${command}...`)
            }
          })

          child.on('close', code => {
            if (code !== 0) {
              return reject(
                new Error(
                  `Failed to install dependencies with ${command}. ` +
                  `Please enter ${chalk.cyan(name)} directory and ` +
                  `install dependencies with yarn or npm manually. ` +
                  `Then run ${chalk.cyan(commandName.develop)} to start ` +
                  `local development.\n\n    Exit code ${code}`
                )
              )
            }

            resolve()
          })
        })
      }
    }
  ])

  await tasks.run()

  console.log()
  if (process.cwd() !== dir) {
    console.log(`  - Enter directory ${chalk.green(`cd ${name}`)}`)
  }
  console.log(`  - Run ${chalk.green(commandName.develop)} to start local development`)
  console.log(`  - Run ${chalk.green(commandName.build)} to build for production`)
  console.log()
}

async function updatePkg (pkgPath, obj) {
  const content = await fs.readFile(pkgPath, 'utf-8')
  const pkg = JSON.parse(content)
  const newPkg = sortPackageJson(Object.assign(pkg, obj))

  await fs.outputFile(pkgPath, JSON.stringify(newPkg, null, 2))
}

function exec (cmd, args = [], options = {}, context = process.cwd()) {
  return execa(cmd, args, {
    stdio: options.stdio || 'ignore',
    cwd: context
  })
}

function absolutePath (string) {
  if (path.isAbsolute(string)) return string
  return path.join(process.cwd(), string)
}
