const visit = require('unist-util-visit')

module.exports = () => tree => {
  visit(tree, 'code', node => {
    const data = node.data = (node.data || {})
    const props = data.hProperties = (data.hProperties || {})
    const lang = getLanguage(node)

    // the language-* class name disappears
    // somehow when adding the v-pre prop
    if (lang) props.className = ['language-' + lang]

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
