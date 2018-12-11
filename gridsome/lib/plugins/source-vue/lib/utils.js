const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const { log } = require('../../../utils/log')
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
  const block = customBlocks.filter(block => {
    // TODO: remove deprecation warning before v1.0
    if (block.type === 'graphql') {
      log(chalk.yellow(
        `${filename}.vue: The <graphql> block is deprecated. Use <page-query> instead.`
      ))
    }

    return /^(graphql|page-query)$/.test(block.type)
  }).shift()

  const res = {
    pageQuery: { content: null, options: {}}
  }

  if (block) {
    res.pageQuery = {
      content: block.content,
      options: block.attrs
    }
  }

  return res
}
