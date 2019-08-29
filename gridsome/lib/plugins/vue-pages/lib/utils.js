const path = require('path')
const slugify = require('@sindresorhus/slugify')

const indexRE = /^[iI]ndex$/
const dynamicValuesRE = /\[([^\]]+)\]/g
const dynamicSplitRE = /(?=:)/g
const dynamicParamRE = /^:/

exports.dynamicPathRE = dynamicValuesRE

exports.createPagePath = function (filePath) {
  const { dir, name } = path.parse(filePath)
  const segments = dir.split('/')

  if (!indexRE.test(name)) {
    segments.push(name)
  }

  return '/' + segments
    .filter(Boolean)
    .map(processSegment)
    .join('/')
}

function processSegment (value) {
  if (dynamicParamRE.test(value)) return value
  if (!value) return value

  if (dynamicValuesRE.test(value)) {
    return processDynamicSegment(value)
  }

  return slugify(value)
}

function processDynamicSegment (value) {
  return value
    .replace(dynamicValuesRE, ':$1')
    .split(dynamicSplitRE)
    .join('')
}
