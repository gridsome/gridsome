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

  let page, html, state
  const length = pages.length

  for (let i = 0; i < length; i++) {
    page = pages[i]
    state = page.dataOutput
      ? await fs.readJson(page.dataOutput)
      : undefined

    try {
      html = await render(page.path, state)
    } catch (err) {
      throw err
    }

    await fs.outputFile(page.htmlOutput, html)
  }
}
