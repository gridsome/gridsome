const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const chalk = require('chalk')
const semver = require('semver')
const Tasks = require('@hjvedvik/tasks')
const sortPackageJson = require('sort-package-json')

module.exports = async (name, starter = 'default') => {
  const dir = aboslutePath(name)
  const projectName = path.basename(dir)
  const starters = ['default', 'wordpress']
  const hasYarn = await useYarn()

  try {
    const files = fs.readdirSync(dir)
    if (files.length > 1) {
      return console.log(chalk.red(`Directory «${projectName}» is not empty.`))
    }
  } catch (err) {
    throw new Error(err.message)
  }

  if (starters.includes(starter)) {
    starter = `https://github.com/gridsome/gridsome-starter-${starter}.git`
  }

  const developCommand = 'gridsome develop'
  const buildCommand = 'gridsome build'

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
        const command = hasYarn ? 'yarn' : 'npm'
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

            if (str && command === 'yarn' && str.indexOf('"type":') !== -1) {
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
                  `Then run ${chalk.cyan(developCommand)} to start ` +
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

  try {
    await tasks.run()
  } catch (err) {
    throw err
  }

  console.log()
  console.log(`  - Enter directory ${chalk.green(`cd ${name}`)}`)
  console.log(`  - Run ${chalk.green(developCommand)} to start local development`)
  console.log(`  - Run ${chalk.green(buildCommand)} to build for production`)
  console.log()
}

async function useYarn () {
  try {
    const { stdout: version } = await execa('yarn', ['--version'])
    return semver.satisfies(version, '>= 1.4.0')
  } catch (err) {}
  return false
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

function aboslutePath (string) {
  if (path.isAbsolute(string)) return string
  return path.join(process.cwd(), string)
}
