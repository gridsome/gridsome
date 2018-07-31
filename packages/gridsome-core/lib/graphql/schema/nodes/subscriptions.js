const { pubsub } = require('../../graphql')

module.exports = (type, { nodeType }) => {
  const subscriptionName = `${type}${nodeType.name}`

  return {
    type: nodeType,
    resolve: (payload) => payload[subscriptionName],
    subscribe () {
      return pubsub.asyncIterator(subscriptionName)
    }
  }
}
