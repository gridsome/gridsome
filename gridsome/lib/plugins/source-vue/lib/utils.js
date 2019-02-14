const path = require('path')
const fs = require('fs-extra')
const slugify = require('@sindresorhus/slugify')
const compiler = require('vue-template-compiler')
const { parse } = require('@vue/component-compiler-utils')

exports.createPagePath = function (filePath) {
  const path = filePath
    .split('/')
    .slice(2)
    .filter(s => !/^[iI]ndex\.vue$/.test(s))
    .map(s => s.replace(/\.vue$/, ''))
    .map(s => slugify(s))
    .join('/')

  return `/${path}`
}

exports.parseComponent = function (file) {
  const filename = path.parse(file).name
  const source = fs.readFileSync(file, 'utf-8')
  const { customBlocks } = parse({ filename, source, compiler })
  const pageQuery = customBlocks.find(block => /^page-query$/.test(block.type))

  return {
    pageQuery: pageQuery ? pageQuery.content : null
  }
}
