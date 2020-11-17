const { parse } = require('node-html-parser')
const { template, isPlainObject, isEmpty } = require('lodash')
const { CLIENT_APP_ID } = require('../utils/constants')

function createHTMLRenderer (htmlTemplate, insertions) {
  if (isPlainObject(insertions) && !isEmpty(insertions)) {
    const root = parse(htmlTemplate)

    for (const selector in insertions) {
      const target = root.querySelector(selector)
      const value = insertions[selector]

      if (target && target.childNodes) {
        target.childNodes.push(value)
      } else {
        throw new Error(`Failed to locate target with selector "${selector}".`)
      }
    }

    htmlTemplate = root.toString()
  }

  const render = template(htmlTemplate)

  return function renderHTML(variables = {}) {
    const app = `<div id="${CLIENT_APP_ID}">${variables.app || ''}</div>`

    return render(Object.assign({
      htmlAttrs: '',
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
