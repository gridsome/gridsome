const path = require('path')

class GridsomeResolverPlugin {
  constructor ({ fallbackDir, optionalDir, resolve }) {
    this.fallbackDir = fallbackDir
    this.optionalDir = optionalDir

    this.resolveMap = resolve.reduce((acc, file) => {
      acc[path.join(optionalDir, file)] = path.join(fallbackDir, file)
      return acc
    }, {})
  }

  apply (resolver) {
    const { relative, describedRelative } = resolver.hooks

    relative.tapAsync('GridsomeResolverPlugin', (req, stack, callback) => {
      if (this.resolveMap[req.path]) {
        const message = `resolve optional ${req.path}`
        const context = {}
        const request = {
          relativePath: req.relativePath,
          request: req.path,
          path: req.path,
          query: req.query,
          directory: req.directory
        }

        const onResolve = (err, resolved) => {
          if (resolved) {
            callback(null, resolved)
          } else {
            const fallbackMessage = `resolve fallback for ${req.path} in ${this.fallbackDir}`
            const fallbackContext = {}
            const fallbackRequest = {
              relativePath: path.relative(this.fallbackDir, req.path),
              request: this.resolveMap[req.path],
              path: this.resolveMap[req.path],
              query: req.query,
              directory: req.directory
            }

            resolver.doResolve(
              describedRelative,
              fallbackRequest,
              fallbackMessage,
              fallbackContext,
              callback
            )
          }
        }

        resolver.doResolve(
          describedRelative,
          request,
          message,
          context,
          onResolve
        )
      } else {
        callback()
      }
    })
  }
}

module.exports = GridsomeResolverPlugin
