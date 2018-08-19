const Remark = require('remark')
const html = require('remark-html')
const parse = require('gray-matter')
const { mapValues, isDate } = require('lodash')

const { Transformer } = require('gridsome')

class RemarkTransformer extends Transformer {
  static mimeTypes () {
    return ['text/markdown', 'text/x-markdown']
  }

  parse (source) {
    const file = parse(source, this.options.frontmatter || {})
    const plugins = [html, ...this.options.use || []]

    let remark = new Remark().data('settings', {
      commonmark: true,
      footnotes: true,
      pedantic: true
    })

    for (const plugin of plugins) {
      remark = remark.use(plugin)
    }

    const content = remark.processSync(file.content)
    const excerpt = remark.processSync(file.excerpt)

    // const ast = remark.parse(file.content)
    file.data = mapValues(file.data, value => {
      return isDate(value) ? value.toJSON() : value
    })

    return {
      title: file.data.title,
      content: content.contents,
      excerpt: excerpt.contents,
      fields: file.data
    }
  }
}

module.exports = RemarkTransformer
