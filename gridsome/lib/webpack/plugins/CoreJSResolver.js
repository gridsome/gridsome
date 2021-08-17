const path = require('path')

class CoreJSResolver {
  constructor(options = {}) {
    this.options = options
  }

  apply(resolver) {
    const target = resolver.ensureHook('resolve')
    const { includePaths = [] } = this.options

    const resolve = (req, resolveContext, callback) => {
      const request = req.request || req.path

      if (request.startsWith('core-js/')) {
        const issuer = req.context.issuer || ''
        const context = path.dirname(issuer)

        if (
          includePaths.some((path) => issuer.startsWith(path)) ||
          !this.doesResolve(context, request)
        ) {
          return resolver.doResolve(
            target,
            { ...req, request: require.resolve(request) },
            `resolve gridsome's core-js package`,
            resolveContext,
            callback
          )
        }
      }

      return callback()
    }

    resolver.getHook('describedResolve').tapAsync('CoreJSResolver', resolve)
    resolver.getHook('file').tapAsync('CoreJSResolver', resolve)
  }

  doesResolve(context, request) {
    try {
      return Boolean(require.resolve(request, { paths: [context] }))
    } catch (err) {
      return false
    }
  }
}

module.exports = CoreJSResolver
