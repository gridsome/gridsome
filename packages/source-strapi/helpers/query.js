const axios = require('axios')
const pluralize = require('pluralize')

module.exports = async ({ apiURL, resourceName, jwtToken, queryLimit, isSingleType }) => {
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
    .catch(err => {
      console.error(`Unable to get content type (${resource}). Did you enable permissions in the Strapi admin for this?`)
      throw err
    })
}
