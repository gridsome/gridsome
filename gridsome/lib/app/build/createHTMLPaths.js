const path = require('path')

function generateHTMLPaths (renderQueue, { config: { outDir }}) {
  return renderQueue.map(entry => {
    const { pathSegments } = entry.internal
    const fileSegments = pathSegments.map(segment => decodeURIComponent(segment))

    return {
      ...entry,
      htmlOutput: path.join(outDir, ...fileSegments, 'index.html')
    }
  })
}

module.exports = generateHTMLPaths
