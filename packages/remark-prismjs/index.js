const h = require('hastscript')
const Prism = require('prismjs')
const u = require('unist-builder')
const escapeHtml = require('escape-html')
const visit = require('unist-util-visit')
const toHTML = require('hast-util-to-html')

const parseOptions = require('./parse-options')

// load all prismjs languages
require('prismjs/components/index')()

module.exports = (
  {
    transformInlineCode = false,
    showLineNumbers: showLineNumbersGlobal = false
  } = {}
) => tree => {
  visit(tree, 'code', (node, index, parent) => {
    parent.children.splice(index, 1, createCode(node, showLineNumbersGlobal))
  })

  if (transformInlineCode) {
    visit(tree, 'inlineCode', (node, index, parent) => {
      parent.children.splice(index, 1, createInlineCode(node))
    })
  }
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

function createLineNumberWrapper (code) {
  const numberOfLines = code.length !== 0
    ? code.split('\n').length
    : 0
  const generateRows = numberOfLines => {
    const row = []
    for (let i = 0; i < numberOfLines; i++) {
      row.push(h('span'))
    }

    return row
  }
  const wrapper = h(
    'span',
    {
      className: 'line-numbers-rows',
      'aria-hidden': 'true'
    },
    generateRows(numberOfLines)
  )

  return wrapper
}

function createCode (node, showLineNumbersGlobal) {
  const { lang, code } = highlight(node)

  const {
    showLineNumbersLocal,
    lineNumbersStartAt
  } = parseOptions(node.meta || '')

  const data = node.data || {}
  const props = data.hProperties || {}
  const className = `language-${lang}`
  const showLineNumbers = showLineNumbersLocal || showLineNumbersGlobal

  const codeNode = showLineNumbers
    ? h(
      'code',
      { className },
      [
        u('raw', code),
        createLineNumberWrapper(code)
      ]
    )
    : h('code', { className }, [u('raw', code)])

  const preNode = showLineNumbers
    ? h(
      'pre',
      {
        className: [className, 'line-numbers'],
        style: lineNumbersStartAt - 1
          ? {
            'counter-reset': `linenumber ${lineNumbersStartAt - 1}`
          }
          : null,
        ...props
      },
      [codeNode]
    )
    : h('pre', { className, ...props }, [codeNode])

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
