const { snakeCase } = require('lodash')
const slugify = require('@sindresorhus/slugify')

exports.normalizePath = value => {
  return '/' + value.split('/').filter(Boolean).join('/')
}

const hasDynamicParam = value => /:|\(/.test(value)

const processRexExp = value => {
  const re = new RegExp(value)
  const str = re.toString()
  return '_' + slugify(str.substr(2, str.length - 4))
}

const replacements = [
  [':', '_'],
  ['.', '_dot_'],
  ['*', '_star_'],
  ['?', '_qn_'],
  ['+', '_plus_'],
  ['^', '_caret_'],
  ['|', '_pipe_'],
  [/\([^)]+\)/, processRexExp]
]

const processPathSegment = segment => {
  if (!hasDynamicParam(segment)) return segment

  for (const [regexp, handler] of replacements) {
    segment = segment.replace(regexp, handler)
  }

  return `_${snakeCase(segment)}`
}

function generateDynamicPath(segments, ext) {
  const processedSegments = segments
    .map(segment => processPathSegment(segment))
    .map(segment => decodeURIComponent(segment))

  const filename = processedSegments.pop() + `.${ext}`

  return `/${processedSegments.concat(filename).join('/')}`
}

function generateStaticPath (segments, ext) {
  const processedSegments = segments
    .map(segment => decodeURIComponent(segment))

  return `/${processedSegments.concat(`index.${ext}`).join('/')}`
}

exports.pathToFilePath = (value, ext = 'html') => {
  const segments = value.split('/').filter(Boolean)

  return hasDynamicParam(value)
    ? generateDynamicPath(segments, ext)
    : generateStaticPath(segments, ext)
}
