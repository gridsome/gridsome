const Prism = require('prismjs')
const escapeHtml = require('escape-html')
const visit = require('unist-util-visit')

// load all prismjs languages
require('prismjs/components/index')()

// highlight page-query and static-query in html
Prism.languages.html.graphql = {
  pattern: /(<(page|static)-query[\s\S]*?>)[\s\S]*?(?=<\/(page|static)-query>)/i,
  inside: Prism.languages.graphql,
  lookbehind: true,
  greedy: true
}

module.exports = () => tree => {
  visit(tree, 'code', node => {
    node.type = 'html'
    node.value = highlight(node, 'pre')
  })

  visit(tree, 'inlineCode', node => {
    node.type = 'html'
    node.value = highlight(node, 'code')
  })
}

function highlight ({ value, lang }, tag = 'pre') {
  let code = Prism.languages.hasOwnProperty(lang)
    ? Prism.highlight(value, Prism.languages[lang], lang)
    : value

  if (!lang) {
    lang = 'text'
    code = escapeHtml(code)
  }

  return `<${tag} class="language-${lang}">${code}</${tag}>`
}
