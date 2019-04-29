const slugify = require('@sindresorhus/slugify')

exports.createPagePath = function (filePath) {
  const path = filePath
    .split('/')
    .filter(s => !/^[iI]ndex\.vue$/.test(s))
    .map(s => s.replace(/\.vue$/, ''))
    .map(s => slugify(s))
    .join('/')

  return `/${path}`
}
