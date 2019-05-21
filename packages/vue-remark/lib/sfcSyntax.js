const isImport = value => /^import/.test(value)
const isStyle = value => /^<style/.test(value)
const isScript = value => /^<script/.test(value)
const isTag = value => /^<\/?[A-Za-z][^>]*>/.test(value)
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

function tokenizeImportSyntax (eat, value) {
  const subValue = getValue(value)

  if (isImport(value)) {
    const lines = subValue.split('\n').filter(line => line.startsWith('import'))
    return eat(subValue)({ type: 'vue-remark:import', value: lines.join('\n') })
  }
}

function tokenizeSFCBlocks (eat, value) {
  const subValue = getValue(value)

  if (isQuery(value) || isScript(value) || isStyle(value)) {
    return eat(subValue)({ type: 'vue-remark:block', value: subValue })
  }
}

function tokenizeVueComponents (eat, value) {
  const subValue = getValue(value)

  if (isTag(value)) {
    return eat(subValue)({ type: 'html', value: subValue })
  }
}
