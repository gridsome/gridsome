const fs = require('fs-extra')
const createRenderFn = require('../server/createRenderFn')

exports.render = async function ({
  hash,
  pages,
  htmlTemplate,
  clientManifestPath,
  serverBundlePath,
  prefetch,
  preload
}) {
  const regexpPrefetch = (prefetch && (typeof(prefetch.mask) === 'string')) ? new RegExp(prefetch.mask) : null
  const regexpPreload = (preload && (typeof(preload.mask) === 'string')) ? new RegExp(preload.mask) : null
  const render = createRenderFn({
    htmlTemplate,
    clientManifestPath,
    serverBundlePath,
    shouldPrefetch: regexpPrefetch ? file => regexpPrefetch.test(file) : null,
    shouldPreload: regexpPreload ? file => regexpPreload.test(file) : null
  })

  const length = pages.length

  for (let i = 0; i < length; i++) {
    const page = pages[i]
    let state = undefined
    let stateSize = undefined

    if (page.dataOutput) {
      const content = await fs.readFile(page.dataOutput, 'utf8')

      stateSize = content.length
      state = JSON.parse(content)
    }

    const html = await render(page, state, stateSize, hash)

    await fs.outputFile(page.htmlOutput, html)
  }
}
