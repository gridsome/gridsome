const chalk = require('chalk')
const resolveCwd = require('resolve-cwd')

module.exports = function resolveVersions (pkgPath) {
  const cliVersion = require('../../package.json').version
  const versions = [`@gridsome/cli v${cliVersion}`]

  if (pkgPath) {
    try {
      versions.push(...resolveProjectVersions(pkgPath))
    } catch (err) {
      versions.push('\nFailed to read installed gridsome version:')
      versions.push(chalk.red(err.message))
    }
  }

  return versions.join('\n')
}

function resolveProjectVersions (pkgPath) {
  const versions = []

  const projectPkgJson = require(pkgPath)
  const { devDependencies = {}, dependencies = {}} = projectPkgJson
  const packages = { ...devDependencies, ...dependencies }

  if (packages.gridsome) {
    const version = resolvePackageVersion('gridsome')
    if (version) versions.push(`gridsome v${version}`)
  }

  // for (const name in packages) {
  //   if (/^@?gridsome[-|\/]/.test(name)) {
  //     const version = resolvePackageVersion(name)
  //     if (version) versions.push(`- ${name} v${version}`)
  //   }
  // }

  // if (versions.length) {
  //   versions.unshift(chalk.grey('\nProject dependencies:'))
  // }

  return versions
}

function resolvePackageVersion (name) {
  const pkgPath = resolveCwd.silent(`${name}/package.json`)
  const pkgJson = pkgPath ? require(pkgPath) : null

  return pkgJson ? pkgJson.version : null
}
