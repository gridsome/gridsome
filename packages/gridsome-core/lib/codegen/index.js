const fs = require('fs-extra')
const genRoutes = require('./genRoutes')

module.exports = async (service, filename = null) => {
  const files = {
    'routes.js': () => genRoutes(service.routerData)
  }

  const outputFile = async (filename) => {
    const content = await files[filename](service)
    await fs.outputFile(`${service.config.tmpDir}/${filename}`, content)
  }

  if (filename) {
    await outputFile(filename)
  } else {
    for (const filename in files) {
      await outputFile(filename)
    }
  }
}
