const path = require('path')

const indexRE = /^[iI]ndex$/
const dynamicValuesRE = /\[([^\]]+)\]/g
const dynamicSplitRE = /(?=:)/g
const dynamicParamRE = /^:/

exports.dynamicPathRE = dynamicValuesRE

exports.createPagePath = function (filePath, slugify = false) {
  const { dir, name } = path.parse(filePath)
  const segments = dir.split('/')

  if (!indexRE.test(name)) {
    segments.push(name)
  }

  return '/' + segments
    .filter(Boolean)
    .map(s => processSegment(s, slugify))
    .join('/')
}

function processSegment (value, slugify) {
  if (dynamicParamRE.test(value)) return value
  if (!value) return value

  if (dynamicValuesRE.test(value)) {
    return processDynamicSegment(value)
  }

  return typeof slugify === 'function'
    ? slugify(value)
    : value
}

function processDynamicSegment (value) {
  return value
    .replace(dynamicValuesRE, ':$1')
    .split(dynamicSplitRE)
    .join('')
}
