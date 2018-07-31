const { graphql } = require('../graphql')
const validateQuery = require('./validate-query')
const { error } = require('@vue/cli-shared-utils')

module.exports = (file, schema, query) => {
  const errors = validateQuery(schema, query)

  if (errors && errors.length) {
    errors.forEach(err => error(
      `GraphQL error in: ${file}. ${err.message}`
    ))

    return null
  }

  try {
    const { data } = graphql(schema, query)

    return data
  } catch (err) {
    error(`GraphQL error in: ${file}. ${err.message}`)
  }

  return null
}
