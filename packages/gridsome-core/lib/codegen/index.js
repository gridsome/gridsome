const fs = require('fs-extra')
const genRoutes = require('./generate-routes')

module.exports = async service => {
  const files = [
    { name: 'hot.js', content: '' },
    { name: 'routes.js', content: await genRoutes(service) }
  ]

  // TODO: let plugins generate files

  const { tmpDir } = service.config

  // write out temporary modules
  for (const { name, content } of files) {
    await fs.outputFile(`${tmpDir}/${name}`, content)
  }

  // add webpack aliases for temporary modules
  service.api.chainWebpack((config) => {
    files.forEach(({ name }) => {
      config.resolve.alias.set(`@temp/${name}$`, `${tmpDir}/${name}`)
    })
  })
}
