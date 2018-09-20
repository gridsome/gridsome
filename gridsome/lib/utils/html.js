const { template } = require('lodash')

exports.createHTMLRenderer = function (htmlTemplate) {
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
