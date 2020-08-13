const axios = require('axios')
const pluralize = require('pluralize')
const execSync = require('child_process').execSync
const path = require('path')
const fs = require('fs')

function downloadMedia (image, apiUrl) {
  const { url, sha256, ext } = image
  const imageUrl = `${sha256}${ext}`

  const remoteUrl = `${apiUrl}${url}`
  return axios.get(remoteUrl, {
    method: 'GET',
    responseType: 'stream'
  })
    .then(response => [response.data, imageUrl])
    .catch(e => {
      console.error(remoteUrl, e)
      throw Error(e)
    })
}

function saveImage (data, imageUrl, mediaFolder) {
  return new Promise((resolve, reject) => {
    const mediaPath = path.resolve(mediaFolder, imageUrl)
    const writer = fs.createWriteStream(mediaPath)

    data.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

function downloadAllMedia (data, apiURL, params, mediaFolder) {
  params.map(p => {
    if (data[p]) {
      const mediaArray = Array.isArray(data[p]) ? data[p] : [data[p]]
      mediaArray.map(media => {
        downloadMedia(media, apiURL)
          .then(([mediaData, name]) => saveImage(mediaData, name, mediaFolder))
          .catch(e => console.error(e))
      })
    }
  })
}

module.exports = async ({ apiURL, resourceName, jwtToken, queryLimit, isSingleType, mediaDownloadFolder, mediaDownloadParameters }) => {
  let resource
  if (isSingleType) {
    resource = resourceName
  } else {
    resource = pluralize(resourceName)
  }

  // Define API endpoint.
  const apiEndpoint = `${apiURL}/${resource}?_limit=${queryLimit}`

  // Set authorization token
  const fetchRequestConfig = {}
  if (jwtToken !== null) {
    fetchRequestConfig.headers = {
      Authorization: `Bearer ${jwtToken}`
    }
  }

  // Make API request.
  return axios(apiEndpoint, fetchRequestConfig)
    .then(res => res.data)
    .then(async data => {
      if (mediaDownloadFolder) {
        await execSync(`mkdir -p ${mediaDownloadFolder}`)
        data.map(dataItem => {
          downloadAllMedia(dataItem, apiURL, mediaDownloadParameters, mediaDownloadFolder)
        })
      }
      return data
    })
    .catch(err => {
      console.error(`Unable to get content type (${resource}). Did you enable permissions in the Strapi admin for this?`)
      throw err
    })
}
