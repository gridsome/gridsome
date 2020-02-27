const htmlTags = require('html-tags')

const isImport = value => /^import\s+/.test(value)
const isStyle = value => /^<style/.test(value)
const isScript = value => /^<script/.test(value)
const isStartTag = value => /^<\/?[\w-]+/.test(value)
const isEndTag = value => /<\/?[\w-]+>$/.test(value)
const isQuery = value => /^<(page|static)-query/.test(value)

const getValue = value => {
  const index = value.indexOf('\n\n')
  return index !== -1 ? value.slice(0, index) : value
}

function tokenizeImportSyntax (eat, value) {
  value = getValue(value)

  if (isImport(value)) {
    const lines = getValue(value).split('\n')
    const statements = lines.filter(line => line.startsWith('import'))
    const portion = statements.join('\n')

    return eat(portion)({ type: 'vue-remark:import', value: portion })
  }
}

function tokenizeSFCBlocks (eat, value) {
  value = getValue(value)

  if (isQuery(value) || isScript(value) || isStyle(value)) {
    const [, name] = value.match(/^<([a-zA-Z0-9_-]+)[^>]*>/)
    const re = new RegExp(`^<${name}[^>]*>(.|\\n|\\t)*?<\\/${name}>`)
    const matches = value.match(re)
    const portion = matches ? matches[0] : ''

    return eat(portion)({ type: 'vue-remark:block', value: portion })
  }
}

function tokenizeVueComponents (eat, value) {
  value = getValue(value)

  if (isStartTag(value)) {
    const [, name] = value.match(/^<\/?([\w-]+)[>\s]/) || []

    if (name && !htmlTags.includes(name)) {
      return eat(value)({ type: 'html', value })
    }
  } else if (isEndTag(value)) {
    const [, name] = value.match(/<\/?([\w-]+)[>\s]$/) || []

    if (name && !htmlTags.includes(name)) {
      const portion = value.substr(0, value.length - name.length - 3)
      return eat(portion)({ type: 'html', value: portion })
    }
  }
}

module.exports = function sfcSyntax () {
  const { blockTokenizers, blockMethods } = this.Parser.prototype

  blockTokenizers.sfcBlocks = tokenizeSFCBlocks
  blockTokenizers.vueComponents = tokenizeVueComponents
  blockTokenizers.importSyntax = tokenizeImportSyntax

  blockMethods.splice(blockMethods.indexOf('html'), 0, 'importSyntax', 'sfcBlocks')
  blockMethods.splice(blockMethods.indexOf('paragraph'), 0, 'vueComponents')
}
