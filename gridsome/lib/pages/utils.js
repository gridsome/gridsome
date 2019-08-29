const { snakeCase } = require('lodash')
const slugify = require('@sindresorhus/slugify')

exports.normalizePath = value => {
  return '/' + value.split('/').filter(Boolean).join('/')
}

exports.createPagesAPI = function (api, { digest }) {
  const { graphql, store, pages } = api._app
  const internals = { digest, isManaged: false }

  return {
    graphql,
    getContentTypes () {
      return store.collections
    },
    getContentType (typeName) {
      return store.getContentType(typeName)
    },
    createPage (options) {
      pages.createPage(options, internals)
    },
    createRoute (options) {
      return pages.createRoute(options, internals)
    }
  }
}

exports.createManagedPagesAPI = function (api, { digest }) {
  const basePagesAPI = exports.createPagesAPI(api, { digest })
  const internals = { digest, isManaged: true }
  const { pages } = api._app

  return {
    ...basePagesAPI,
    createPage (options) {
      pages.createPage(options, internals)
    },
    updatePage (options) {
      pages.updatePage(options, internals)
    },
    removePage (page) {
      pages.removePage(page)
    },
    removePageByPath (path) {
      pages.removePageByPath(path)
    },
    removePagesByComponent (component) {
      pages.removePagesByComponent(component)
    },
    findAndRemovePages (query) {
      pages.findAndRemovePages(query)
    },
    createRoute (options) {
      return pages.createRoute(options, internals)
    },
    removeRoute (id) {
      pages.removeRoute(id)
    }
  }
}

const hasDynamicParam = value => /:|\(/.test(value)

const processRexExp = value => {
  const re = new RegExp(value)
  const str = re.toString()
  return '_' + slugify(str.substr(2, str.length - 4))
}

const replacements = [
  [':', '_'],
  ['.', '_dot_'],
  ['*', '_star_'],
  ['?', '_qn_'],
  ['+', '_plus_'],
  ['^', '_caret_'],
  ['|', '_pipe_'],
  [/\([^)]+\)/, processRexExp]
]

const processPathSegment = segment => {
  if (!hasDynamicParam(segment)) return segment

  for (const [regexp, handler] of replacements) {
    segment = segment.replace(regexp, handler)
  }

  return `_${snakeCase(segment)}`
}

function generateDynamicPath (segments) {
  const processedSegments = segments
    .map(segment => processPathSegment(segment))
    .map(segment => decodeURIComponent(segment))

  const filename = processedSegments.pop() + '.html'

  return `/${processedSegments.concat(filename).join('/')}`
}

function generateStaticPath (segments) {
  const processedSegments = segments
    .map(segment => decodeURIComponent(segment))

  return `/${processedSegments.concat('index.html').join('/')}`
}

exports.pathToFilePath = value => {
  const segments = value.split('/').filter(Boolean)

  return hasDynamicParam(value)
    ? generateDynamicPath(segments)
    : generateStaticPath(segments)
}
