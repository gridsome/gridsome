const fs = require('fs-extra')
const createRenderFn = require('../server/createRenderFn')

exports.render = async function ({
  pages,
  htmlTemplate,
  clientManifestPath,
  serverBundlePath
}) {
  const render = createRenderFn({
    htmlTemplate,
    clientManifestPath,
    serverBundlePath
  })

  let page, html
  const length = pages.length

  for (let i = 0; i < length; i++) {
    page = pages[i]

    try {
      html = await render(page)
    } catch (err) {
      throw err
    }

    await fs.outputFile(page.htmlOutput, html)
  }
}
