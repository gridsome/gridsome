const fs = require('fs-extra')
const createRenderFn = require('../server/createRenderFn')

exports.render = async function ({
  hash,
  pages,
  htmlTemplate,
  ampTemplate,
  clientManifestPath,
  serverBundlePath
}) {
  const render = createRenderFn({
    htmlTemplate,
    clientManifestPath,
    serverBundlePath
  })
  
  htmlTemplate = ampTemplate
  const ampRender = createRenderFn({
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

    html = page.publicPath.includes('/amp/') ? await ampRender(page, state, stateSize, hash) : await render(page, state, stateSize, hash)

    await fs.outputFile(page.htmlOutput, html)
  }
}
