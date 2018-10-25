exports.normalizePlugins = function (arr = []) {
  const normalize = entry => {
    return typeof entry === 'string'
      ? require(entry)
      : entry
  }

  return arr.map(entry => {
    return Array.isArray(entry)
      ? [normalize(entry[0]), entry[1] || {}]
      : [normalize(entry), {}]
  })
}
