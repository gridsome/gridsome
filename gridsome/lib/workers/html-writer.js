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

  let page, html, state, stateSize
  const length = pages.length

  for (let i = 0; i < length; i++) {
    page = pages[i]
    state = undefined
    stateSize = undefined

    if (page.dataOutput) {
      const content = await fs.readFile(page.dataOutput, 'utf8')

      stateSize = content.length
      state = JSON.parse(content)
    }

    html = await render(page.path, state, stateSize)

    await fs.outputFile(page.htmlOutput, html)
  }
}
