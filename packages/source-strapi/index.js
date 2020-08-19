const axios = require('axios')
const query = require('./helpers/query')
const { trimEnd, upperFirst, camelCase } = require('lodash')

module.exports = function (api, options) {
  api.loadSource(async ({ addCollection }) => {
    const { queryLimit, contentTypes, singleTypes, loginData } = options
    const apiURL = trimEnd(options.apiURL, '/')
    let jwtToken = null

    console.log(`Fetching data from Strapi (${apiURL})`)

    // Check if loginData is set.
    if (
      loginData.hasOwnProperty('identifier') &&
      loginData.identifier.length !== 0 &&
      loginData.hasOwnProperty('password') &&
      loginData.password.length !== 0
    ) {
      // Define API endpoint.
      const loginEndpoint = `${apiURL}/auth/local`

      // Make API request.
      try {
        const loginResponse = await axios.post(loginEndpoint, loginData)

        if (loginResponse.hasOwnProperty('data')) {
          jwtToken = loginResponse.data.jwt
        }
      } catch (e) {
        console.error('Strapi authentication error: ' + e)
      }
    }
    return Promise.all([
      Promise.all(contentTypes.map(resourceName => {
        const typeName = upperFirst(camelCase(`${options.typeName} ${resourceName}`))
        const collection = addCollection({ typeName, dateField: 'created_at' })
        const isSingleType = false
        return query({ apiURL, resourceName, jwtToken, queryLimit, isSingleType })
          .then(docs => docs.forEach(doc => {
            collection.addNode(doc)
          })
          )
      })),
      Promise.all(singleTypes.map(resourceName => {
        const typeName = upperFirst(camelCase(`${options.typeName} ${resourceName}`))
        const collection = addCollection({ typeName, dateField: 'created_at' })
        const isSingleType = true
        return query({ apiURL, resourceName, jwtToken, queryLimit, isSingleType })
          .then(data => collection.addNode(data))
      }))]
    )
  })
}

module.exports.defaultOptions = () => ({
  apiURL: 'http://localhost:1337',
  contentTypes: [],
  singleTypes: [],
  loginData: {},
  queryLimit: 100,
  typeName: 'Strapi'
})
