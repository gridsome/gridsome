const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const express = require('express')
const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')
const { default: playground } = require('graphql-playground-middleware-express')

const endpoints = {
  graphql: '/___graphql',
  explore: '/___explore'
}

module.exports = ({ schema, store, config, worker }) => {
  const app = express()

  app.use(
    endpoints.graphql,
    bodyParser.json(),
    graphqlHTTP({ schema, context: { store }})
  )

  app.get(endpoints.explore, playground({
    endpoint: endpoints.graphql
  }))

  app.get('/___asset', async (req, res, next) => {
    const filePath = decodeURIComponent(req.query.path)
    const hash = crypto.createHash('md5').update(filePath).digest('hex')
    const { ext } = path.parse(filePath)
    const destPath = path.resolve(config.cacheDir, hash + ext)
    const minWidth = config.minProcessImageWidth

    const serveFile = file => {
      const buffer = fs.readFileSync(file)

      res.contentType(ext)
      res.end(buffer, 'binary')
    }

    if (fs.existsSync(destPath)) {
      return serveFile(destPath)
    }

    try {
      await worker.processImage({ filePath, destPath, minWidth })
      serveFile(destPath)
    } catch (err) {
      next(err)
    }
  })

  return app
}

module.exports.endpoints = endpoints
