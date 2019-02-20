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

    const { data } = page.dataOutput
      ? await fs.readJson(page.dataOutput)
      : {}

    try {
      html = await render(page.path, data)
    } catch (err) {
      throw err
    }

    await fs.outputFile(page.htmlOutput, html)
  }
}
