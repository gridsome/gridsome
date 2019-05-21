exports.createFile = function (options) {
  const file = {
    contents: options.contents
  }

  if (options.path) file.path = options.path
  if (options.data) file.data = options.data

  return file
}

exports.normalizeLayout = function (layout) {
  const defaultLayout = require.resolve('../src/VueRemarkLayout.js')

  if (typeof layout === 'string') {
    return { component: layout, props: {}}
  } else if (typeof layout === 'object') {
    return {
      component: layout.component || defaultLayout,
      props: layout.props || {}
    }
  }

  return { component: defaultLayout, props: {}}
}
