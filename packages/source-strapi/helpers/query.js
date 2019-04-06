const axios = require('axios')
const pluralize = require('pluralize')
const clean = require('./clean')

module.exports = async ({ apiURL, resourceName, jwtToken, queryLimit }) => {
  console.time('Fetch Strapi data')
  const resource = pluralize(resourceName).toLowerCase()
  console.log(`Starting to fetch data from Strapi (${resource})`)

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
    .then(data => data.map(item => clean(item)))
    .then(docs => {
      console.timeEnd('Fetch Strapi data')
      return docs
    })
    .catch(err => {
      console.error(`Unable to get content type (${resource}). Did you enable permissions in the Strapi admin for this?`)
      throw err
    })
}
