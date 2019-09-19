const isImport = value => /^import/.test(value)
const isStyle = value => /^<style/.test(value)
const isScript = value => /^<script/.test(value)
const isTag = value => /^<\/?[a-zA-Z0-9_-][^>]*>/.test(value)
const isQuery = value => /^<(page|static)-query/.test(value)

const getValue = value => {
  const index = value.indexOf('\n\n')
  return index !== -1 ? value.slice(0, index) : value
}

const getTag = value => {
  const matches = value.match(/^<\/?([a-zA-Z0-9_-]+)[^>]*>/)
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

module.exports = function sfcSyntax () {
  const { blockTokenizers, blockMethods } = this.Parser.prototype

  blockTokenizers.sfcBlocks = tokenizeSFCBlocks
  blockTokenizers.vueComponents = tokenizeVueComponents
  blockTokenizers.importSyntax = tokenizeImportSyntax

  blockMethods.splice(blockMethods.indexOf('html'), 0, 'importSyntax', 'sfcBlocks')
  blockMethods.splice(blockMethods.indexOf('paragraph'), 0, 'vueComponents')
}
