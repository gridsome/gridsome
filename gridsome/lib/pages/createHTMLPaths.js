const path = require('path')

function generateHTMLPaths (renderQueue, { config: { outDir }}) {
  return renderQueue.map(entry => {
    const fileSegments = entry.pathSegments.map(segment => decodeURIComponent(segment))
    const fileName = entry.isIndex ? 'index.html' : `${fileSegments.pop()}.html`

    return {
      ...entry,
      htmlOutput: path.join(outDir, ...fileSegments, fileName)
    }
  })
}

module.exports = generateHTMLPaths
