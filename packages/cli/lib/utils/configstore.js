const chalk = require('chalk')
const Configstore = require('configstore')

const config = new Configstore('gridsome', {}, {
  globalConfigPath: true
})

exports.all = config.all || {}
exports.path = config.path

/**
 * @param {string} key
 * @param {any} value
 */
exports.set = (key, value) => {
  switch (key) {
    case 'packageManager': return setPackageManager(value)
  }

  console.log(`Unknown option: ${chalk.bold(key)}`)
}

/**
 * @param {string} key
 */
exports.has = (key) => {
  return config.has(key)
}

/**
 * @param {string} key
 */
exports.get = (key) => {
  return config.get(key)
}

/**
 * @param {string} key
 */
exports.delete = (key) => {
  return config.delete(key)
}

/**
 * @param {string} packageManager
 */
function setPackageManager (packageManager) {
  const available = ['npm', 'yarn', 'pnpm']

  if (packageManager !== 'none' && !available.includes(packageManager)) {
    return (
      console.log(chalk.red(`Unsupported package manager: ${chalk.bold(packageManager)}`)),
      console.log(),
      console.log(`  Supported package managers are: ${available.map(value => chalk.bold(value)).join(', ')}`),
      console.log(),
      console.log(`  Disable auto-installing by running:`),
      console.log(`  $ ${chalk.green.bold('gridsome config --set packageManager none')}`),
      console.log()
    )
  }

  config.set('packageManager', packageManager)

  if (packageManager !== 'none') {
    console.log(`From now on, ${chalk.bold(packageManager)} will install dependencies automatically.`)
  } else {
    console.log(`Gridsome will not install dependencies automatically.`)
  }
}
