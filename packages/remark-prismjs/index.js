const h = require('hastscript')
const Prism = require('prismjs')
const u = require('unist-builder')
const escapeHtml = require('escape-html')
const visit = require('unist-util-visit')
const toHTML = require('hast-util-to-html')

// load all prismjs languages
require('prismjs/components/index')()

module.exports = () => tree => {
  visit(tree, 'code', (node, index, parent) => {
    parent.children.splice(index, 1, createCode(node))
  })

  visit(tree, 'inlineCode', (node, index, parent) => {
    parent.children.splice(index, 1, createInlineCode(node))
  })
}

function highlight (node) {
  let lang = node.lang
  let code = Prism.languages.hasOwnProperty(lang)
    ? Prism.highlight(node.value, Prism.languages[lang], lang)
    : node.value

  if (!lang) {
    lang = 'text'
    code = escapeHtml(code)
  }

  return { lang, code }
}

function createCode (node) {
  const { lang, code } = highlight(node)

  const data = node.data || {}
  const props = data.hProperties || {}
  const className = `language-${lang}`
  const codeNode = h('code', { className }, u('raw', code))
  const preNode = h('pre', { className, ...props }, [codeNode])

  return u('html', toHTML(preNode, {
    allowDangerousHTML: true
  }))
}

function createInlineCode (node) {
  const { lang, code } = highlight(node)

  const data = node.data || {}
  const props = data.hProperties || {}
  const className = `language-${lang}`
  const codeNode = h('code', { className, ...props }, u('raw', code))

  return u('html', toHTML(codeNode, {
    allowDangerousHTML: true
  }))
}
