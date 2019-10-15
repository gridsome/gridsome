const visit = require('unist-util-visit')

module.exports = () => tree => {
  visit(tree, 'code', node => {
    const data = node.data = (node.data || {})
    const props = data.hProperties = (data.hProperties || {})
    props['v-pre'] = true
  })

  visit(tree, 'inlineCode', node => {
    const data = node.data = (node.data || {})
    const props = data.hProperties = (data.hProperties || {})
    props['v-pre'] = true
  })

  // already transformed to HTML
  visit(tree, 'html', node => {
    if (getLanguage(node)) {
      node.value = `<template v-pre>\n${node.value}\n</template>`
    }
  })
}

function getLanguage (node) {
  return node.lang && node.lang.match(/^[^ \t]+(?=[ \t]|$)/)
}
