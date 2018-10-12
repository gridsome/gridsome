const path = require('path')
const fs = require('fs-extra')
const htmlParser = require('parse5')
const getStream = require('get-stream')
const replaceStream = require('replacestream')

exports.createPolyfillScript = function () {
  const filePath = path.resolve(__dirname, 'polyfill.txt')
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const code = fileContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim()

  return `<script>${code}</script>`
}

exports.inlineCriticalCSS = function (filePath, { css, polyfill }) {
  const inlineString = `<style id="___critical-css">${css}</style>`

  let isInlined = false
  let stream = fs.createReadStream(filePath, { encoding: 'utf8' })

  stream = stream.pipe(replaceStream(/<link[^>]+>/g, match => {
    if (/as="style"/.test(match)) {
      match = ''
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
      match = `${inlineString}` + match
      isInlined = true
    }

    return match
  }))

  if (polyfill) {
    stream = stream.pipe(replaceStream(/<\/body>/g, match => {
      return polyfill + match
    }))
  }

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
