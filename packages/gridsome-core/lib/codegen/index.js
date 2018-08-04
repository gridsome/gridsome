const fs = require('fs-extra')
const genRoutes = require('./genRoutes')

module.exports = async ({ config, routerData }) => {
  const { tmpDir } = config

  const files = [
    {
      path: `${tmpDir}/routes.js`,
      content: await genRoutes(routerData)
    }
  ]

  for (const { path, content } of files) {
    await fs.outputFile(path, content)
  }

  return files
}
