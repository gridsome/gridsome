const path = require('path')
const fs = require('fs-extra')

// from vuepress/core/lib/build.js
// webpack fails silently in some cases, appends styles.js to app.js to fix it
// https://github.com/webpack-contrib/mini-css-extract-plugin/issues/85
exports.removeStylesJsChunk = async function (stats, outputDir) {
  const { children: [clientStats] } = stats
  const styleChunk = clientStats.assets.find(a => /styles(\.\w{8})?\.js$/.test(a.name))
  const appChunk = clientStats.assets.find(a => /app(\.\w{8})?\.js$/.test(a.name))

  if (!styleChunk) return

  const styleChunkPath = path.join(outputDir, styleChunk.name)
  const styleChunkContent = await fs.readFile(styleChunkPath, 'utf-8')
  const appChunkPath = path.join(outputDir, appChunk.name)
  const appChunkContent = await fs.readFile(appChunkPath, 'utf-8')

  await fs.remove(styleChunkPath)
  await fs.writeFile(appChunkPath, styleChunkContent + appChunkContent)
}
