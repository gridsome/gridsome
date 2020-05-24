const path = require('path')
const fs = require('fs-extra')
const axios = require('axios')
const ProgressBar = require('progress')

async function downloadFile (url, dest) {
  await fs.outputFile(path.join(dest), '')
  const { data, headers } = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })
  const totalLength = headers['content-length'] || 100

  const progressBar = new ProgressBar(`-> ${url} [:bar] :percent :etas`, {
    width: 40,
    complete: '=',
    incomplete: ' ',
    renderThrottle: 1,
    total: parseInt(totalLength)
  })

  const writer = fs.createWriteStream(path.join(dest))

  data.on('data', (chunk) => progressBar.tick(chunk.length))
  data.pipe(writer)
}

module.exports = function (api, options) {
  const { files } = options

  api.loadSource(async () => {
    if (!files || !files.length) {
      throw new Error(`Download plugin contains no files`)
    }

    console.log('Downloading files …')

    const queue = files.map(({ url, dest }) => downloadFile(url, dest).catch(() => {
      throw new Error(`Failed to download ${url}`)
    }))

    return await Promise.all(queue)

  })
}

module.exports.defaultOptions = () => ({
  files: []
})
