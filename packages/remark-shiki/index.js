const shiki = require('shiki')
const languages = require('shiki-languages')
const visit = require('unist-util-visit')

module.exports = (options) => {
  const theme = options.theme ? options.theme : 'nord'

  return async tree => {
    const highlighter = await shiki.getHighlighter({ theme })

    visit(tree, 'code', node => {
      node.type = 'html'
      node.value = highlight(node, highlighter)
    })

    visit(tree, 'inlineCode', node => {
      node.type = 'html'
      node.value = highlight(node, highlighter)
    })
  }
}

function highlight ({ value, lang }, highlighter) {
  const index = languages.languages.findIndex((x) => x.id === lang || x.aliases.includes(lang))
  const theme = shiki.getTheme('nord')

  if (index >= 0) {
    return highlighter.codeToHtml(value, lang)
  }

  // Fallback for unknown languages.
  return `<pre class="shiki" style="background: ${theme.bg}; color: ${theme.colors['terminal.foreground']}">${value}</pre>`
}
