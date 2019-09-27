const envinfo = require('envinfo')

module.exports = async () => {
  const data = await envinfo
    .run({
      System: ['OS', 'CPU'],
      Binaries: ['Node', 'Yarn', 'npm'],
      Browsers: ['Chrome', 'Edge', 'Firefox', 'Safari'],
      npmPackages: '?(@)gridsome{-*,/*,}',
      npmGlobalPackages: ['@gridsome/cli']
    })
  console.log(data)
}
