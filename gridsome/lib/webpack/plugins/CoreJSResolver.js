class CoreJSResolver {
  constructor(options = {}) {
    this.options = options
  }

  apply(resolver) {
    const target = resolver.ensureHook('resolve')
    const { includePaths = [] } = this.options

    /**
     * Resolve relative core-js imports for modules in the given
     * paths to the version that is shipped with Gridsome.
     */
    function resolve(req, resolveContext, callback) {
      const request = req.request || req.path

      if (request.startsWith('core-js/')) {
        const issuer = req.context.issuer || ''

        if (includePaths.some((path) => issuer.startsWith(path))) {
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
}

module.exports = CoreJSResolver
