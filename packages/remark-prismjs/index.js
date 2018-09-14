const prism = require('prismjs')
const escapeHtml = require('escape-html')
const visit = require('unist-util-visit')

module.exports = options => {
  return tree => {
    visit(tree, 'code', node => {
      const { value, lang } = node
      const code = highlight(value, lang)

      node.type = 'html'
      node.value = `<pre class="language-${lang}"><code>${code}</code></pre>`
    })

    visit(tree, 'inlineCode', node => {
      const { value, lang } = node
      const code = highlight(value, lang)

      node.type = 'html'
      node.value = `<code class="language-${lang}">${code}</code>`
    })
  }
}

function highlight (value, lang) {
  let code = prism.languages[lang]
    ? prism.highlight(value, prism.languages[lang], lang)
    : value

  if (!lang) code = escapeHtml(code)

  return code
}
