const { template } = require('lodash')

function createHTMLRenderer (htmlTemplate) {
  const render = template(htmlTemplate)

  return variables => {
    return render(Object.assign({
      htmlAttrs: '',
      bodyAttrs: '',
      scripts: '',
      head: '',
      app: ''
    }, variables))
  }
}

module.exports = createHTMLRenderer
