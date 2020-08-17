const DIRECTIVE = 7

function hasHtmlDirective(node) {
  return (node.props || []).find(prop => {
    return prop.type === DIRECTIVE && prop.name === 'html'
  })
}

module.exports = node => {
  if (hasHtmlDirective(node)) {
    // observe images inserted by v-html
    node.props.push({
      type: DIRECTIVE,
      name: 'g-image',
      modifiers: []
    })
  }
}
