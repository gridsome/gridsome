const fs = require('fs-extra')
const htmlParser = require('parse5')
const getStream = require('get-stream')
const detectIndent = require('detect-indent')
const indentString = require('indent-string')
const replaceStream = require('replacestream')

exports.inlineCriticalCSS = function (filePath, css) {
  const html = fs.readFileSync(filePath, 'utf8')
  const indents = detectIndent(html).amount || 2
  const inlineString = `<style id="___critical-css" type="text/css">${css}</style>`

  let isInlined = false
  let stream = fs.createReadStream(filePath, { encoding: 'utf8' })

  stream = stream.pipe(replaceStream(/<link[^>]+>/g, match => {
    if (/as="style"/.test(match)) {
      match = '<!-- removed stylesheet -->'
    }

    if (/rel="stylesheet"/.test(match)) {
      const fragment = htmlParser.parseFragment(match)
      const node = fragment.childNodes[0]
      const onload = `this.onload=null;this.rel='stylesheet'`

      node.attrs.forEach(attr => {
        if (attr.name === 'rel') attr.value = 'preload'
      })

      node.attrs.push({ name: 'as', value: 'style' })
      node.attrs.push({ name: 'onload', value: onload })
      fragment.childNodes.push(createNoScriptNode(node))

      match = htmlParser.serialize(fragment)
    }

    if (!isInlined) {
      match = `${inlineString}\n` + indentString(match, indents * 2)
      isInlined = true
    }

    return match
  }))

  return getStream(stream)
}

function createNoScriptNode (node) {
  return {
    tagName: 'noscript',
    attrs: [],
    childNodes: [
      {
        tagName: 'link',
        attrs: [
          { name: 'rel', value: 'stylesheet' },
          ...node.attrs.filter(({ name }) => {
            return name === 'href'
          })
        ]
      }
    ]
  }
}
