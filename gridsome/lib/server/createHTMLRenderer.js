const CSSselect = require('css-select')
const { parseDocument } = require('htmlparser2')
const serialize = require('dom-serializer').default
const { template, isPlainObject, isEmpty } = require('lodash')
const { CLIENT_APP_ID } = require('../utils/constants')

function parseHTML (html) {
  return parseDocument(html, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false
  })
}

function createHTMLRenderer (htmlTemplate, insertions) {
  if (isPlainObject(insertions) && !isEmpty(insertions)) {
    const doc = parseHTML(htmlTemplate)

    for (const selector in insertions) {
      const target = CSSselect.selectOne(selector, doc)

      if (target && target.childNodes) {
        const node = parseHTML(insertions[selector])
        target.childNodes.push(...node.children)
      } else {
        throw new Error(`Failed to locate target with selector "${selector}".`)
      }
    }

    htmlTemplate = serialize(doc.children)
  }

  const render = template(htmlTemplate)

  return function renderHTML(variables = {}) {
    const app = `<div id="${CLIENT_APP_ID}">${variables.app || ''}</div>`

    return render(Object.assign({
      htmlAttrs: '',
      headAttrs: '',
      bodyAttrs: '',
      head: '',
      title: '',
      base: '',
      hash: '',
      vueMetaTags: '',
      vueMetaLinks: '',
      resourceHints: '',
      styles: '',
      vueMetaStyles: '',
      vueMetaScripts: '',
      noscript: '',
      app: '',
      scripts: ''
    }, { ...variables, app }))
  }
}

module.exports = createHTMLRenderer
