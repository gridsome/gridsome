const axios = require('axios')
const { pascalCase } = require('change-case')
const query = require('./helpers/query')

module.exports = function (api, options) {
  const coreProperties = [
    'title',
    'id',
    'slug',
    'path',
    'date',
    'content',
    'excerpt'
  ]

  api.loadSource(async ({ addContentType, slugify }) => {
    const { apiURL, queryLimit, contentTypes, loginData } = options
    let jwtToken = null

    // Check if loginData is set.
    if (
      loginData.hasOwnProperty('identifier') &&
      loginData.identifier.length !== 0 &&
      loginData.hasOwnProperty('password') &&
      loginData.password.length !== 0
    ) {
      console.time('Authenticate Strapi user')
      console.log('Authenticate Strapi user')

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

      console.timeEnd('Authenticate Strapi user')
    }

    return Promise.all(contentTypes.map(resourceName => {
      const typeName = pascalCase(resourceName)
      var contentType = addContentType({ typeName: `Strapi${typeName}` })
      return query({ apiURL, contentType: typeName, jwtToken, queryLimit })
        .then(docs => docs.map(doc => {
          const content = {}
          const fields = {}
          Object.entries(doc).map(([name, val]) => {
            if (val instanceof Object) {
              val = JSON.stringify(val) // TODO: Look into making this easier to access
            }
            if (coreProperties.includes(name)) {
              content[name] = val
            } else {
              fields[name] = val
            }
          })
          content.fields = fields

          contentType.addNode(content)
        }))
    }))
  })
}

module.exports.defaultOptions = () => ({
  apiURL: 'http://localhost:1337',
  contentTypes: [],
  loginData: {},
  queryLimit: 100
})
