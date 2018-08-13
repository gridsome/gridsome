const isSource = id => /^(?:@[\w-]+\/|gridsome-)source-([\w-]+)/.test(id)

function resolveModuleType (id) {
  return isSource(id) ? 'source' : 'plugin'
}

module.exports = {
  isSource,
  resolveModuleType
}
