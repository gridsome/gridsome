const { template } = require('lodash')
const { CLIENT_APP_ID } = require('../utils/constants')

function createHTMLRenderer (htmlTemplate) {
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
