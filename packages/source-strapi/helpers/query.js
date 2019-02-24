const clean = require('./clean')
const fetch = require('node-fetch')
const pluralize = require('pluralize')

module.exports = async ({ apiURL, contentType, jwtToken, queryLimit }) => {
  console.time('Fetch Strapi data')
  console.log(`Starting to fetch data from Strapi (${pluralize(contentType)})`)

  // Define API endpoint.
  const apiEndpoint = `${apiURL}/${pluralize(contentType)}?_limit=${queryLimit}`

  // Set authorization token
  const fetchRequestConfig = {}
  if (jwtToken !== null) {
    fetchRequestConfig.headers = {
      Authorization: `Bearer ${jwtToken}`
    }
  }

  // Make API request.
  return fetch(apiEndpoint, fetchRequestConfig)
    .then(res => res.json())
    .then(data => data.map(item => clean(item)))
    .then(docs => {
      console.timeEnd('Fetch Strapi data')
      return docs
    })
    .catch(e => {
      throw new Error(`Unable to get content type (${contentType}). Did you enable permissions in the Strapi admin for this?`)
    })
}
