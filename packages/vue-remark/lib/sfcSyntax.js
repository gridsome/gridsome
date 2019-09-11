const isImport = value => /^import/.test(value)
const isStyle = value => /^<style/.test(value)
const isScript = value => /^<script/.test(value)
const isTag = value => /^<\/?[A-Za-z][^>]*>/.test(value)
const isSelfClosingTag = value => /\/>$/.test(value)
const isQuery = value => /^<(page|static)-query/.test(value)

module.exports = function sfcSyntax () {
  const Parser = this.Parser
  const tokenizers = Parser.prototype.blockTokenizers
  const methods = Parser.prototype.blockMethods

  tokenizers.sfcBlocks = tokenizeSFCBlocks
  tokenizers.vueComponents = tokenizeVueComponents
  tokenizers.importSyntax = tokenizeImportSyntax

  methods.splice(methods.indexOf('html'), 0, 'sfcBlocks', 'vueComponents')
  methods.splice(methods.indexOf('paragraph'), 0, 'importSyntax')
}

function getValue (value) {
  const index = value.indexOf('\n\n')
  return index !== -1 ? value.slice(0, index) : value
}

function getTag (value) {
  const [tag, name] = value.match(/^<([a-zA-Z0-9_-]+)[^>]*>/)

  if (isSelfClosingTag(tag)) {
    return tag
  }

  const re = new RegExp(`^<${name}[^>]*>(.|\\n|\\t)*?<\\/${name}>`)
  const matches = value.match(re)

  return matches ? matches[0] : ''
}

function tokenizeImportSyntax (eat, value) {
  if (isImport(value)) {
    const lines = getValue(value).split('\n')
    const statements = lines.filter(line => line.startsWith('import'))
    const portion = statements.join('\n')

    return eat(portion)({ type: 'vue-remark:import', value: portion })
  }
}

function tokenizeSFCBlocks (eat, value) {
  if (isQuery(value) || isScript(value) || isStyle(value)) {
    const portion = getTag(value)
    return eat(portion)({ type: 'vue-remark:block', value: portion })
  }
}

function tokenizeVueComponents (eat, value) {
  if (isTag(value)) {
    const portion = getTag(value)
    return eat(portion)({ type: 'html', value: portion })
  }
}
