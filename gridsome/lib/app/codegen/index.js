const path = require('path')
const fs = require('fs-extra')
const genIcons = require('./icons')
const genConfig = require('./config')
const genRoutes = require('./routes')
const genPlugins = require('./plugins')

// TODO: let plugins add generated files

class Codegen {
  constructor (app) {
    this.app = app

    this.files = {
      'icons.js': () => genIcons(app),
      'config.js': () => genConfig(app),
      'routes.js': () => genRoutes(app),
      'plugins-server.js': () => genPlugins(app, true),
      'plugins-client.js': () => genPlugins(app, false),
      'now.js': () => `export default ${app.store.lastUpdate}`
    }
  }

  async generate (filename = null) {
    const outDir = this.app.config.tmpDir

    const outputFile = async filename => {
      const content = await this.files[filename]()
      const filepath = path.join(outDir, filename)
      await fs.outputFile(filepath, content)
    }

    if (filename) {
      await outputFile(filename)
    } else {
      await fs.remove(outDir)

      for (const filename in this.files) {
        await outputFile(filename)
      }
    }
  }
}

module.exports = Codegen
