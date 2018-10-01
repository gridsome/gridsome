const path = require('path')
const fs = require('fs-extra')
const express = require('express')
const { mapValues } = require('lodash')
const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')

const endpoints = {
  graphql: '/___graphql',
  explore: '/___explore'
}

module.exports = ({ context, schema, store, config, queue }, worker) => {
  const app = express()

  app.use(
    endpoints.graphql,
    bodyParser.json(),
    graphqlHTTP({ schema, context: { store }})
  )

  const assetsDir = path.relative(config.targetDir, config.assetsDir)
  app.get(path.join(config.pathPrefix, assetsDir, 'static', '*'), async (req, res, next) => {
    const options = mapValues(req.query, value => {
      return decodeURIComponent(value)
    })

    const filePath = path.resolve(context, req.params[0])

    if (!fs.existsSync(filePath)) {
      return res.sendStatus(404)
    }

    const minWidth = config.minProcessImageWidth
    const { ext } = path.parse(filePath)
    const { cacheKey, size } = await queue.preProcess(filePath, options)
    const destPath = path.resolve(config.cacheDir, assetsDir, cacheKey + ext)
    const args = { filePath, destPath, minWidth, options, size }

    const serveFile = file => {
      const buffer = fs.readFileSync(file)

      res.contentType(ext)
      res.end(buffer, 'binary')
    }

    if (fs.existsSync(destPath)) {
      return serveFile(destPath)
    }

    try {
      await worker.processImage(args)
      serveFile(destPath)
    } catch (err) {
      next(err)
    }
  })

  return app
}

module.exports.endpoints = endpoints
