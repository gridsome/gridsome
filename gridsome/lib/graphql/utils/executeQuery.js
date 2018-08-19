const { graphql } = require('../graphql')
const validateQuery = require('./validate-query')

module.exports = (file, schema, query) => {
  const errors = validateQuery(schema, query)

  if (errors && errors.length) {
    errors.forEach(err => console.error(
      `GraphQL error in: ${file}. ${err.message}`
    ))

    return null
  }

  try {
    const { data } = graphql(schema, query)

    return data
  } catch (err) {
    console.error(`GraphQL error in: ${file}. ${err.message}`)
  }

  return null
}
