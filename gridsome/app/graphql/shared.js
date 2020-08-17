import { reactive } from 'vue'

const cache = reactive({})

function getMatchedRoute(route) {
  return route.matched[0]
}

export function getResults(route) {
  const match = getMatchedRoute(route)

  if (!cache[match.path]) {
    cache[match.path] = {
      dirty: true,
      context: {},
      data: {}
    }
  }

  return cache[match.path]
}

/**
 * Copies properties from b to a and deletes
 * properties on a that doesn't exist on b.
 */
function assignProps(a, b) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  const diff = aKeys.filter(k => !bKeys.includes(k))

  for (const key of bKeys) a[key] = b[key]
  for (const key of diff) delete a[key]
}

export function setResults (route, newValue) {
  const value = getResults(route)

  // Merge values to keep the reactive instance that
  // is returned by `usePageQuery` and `usePageContext`.
  // Or else they they won't trigger an update.
  assignProps(value.data, newValue.data || {})
  assignProps(value.context, newValue.context || {})

  value.dirty = false

  return value
}

export function hasResults(route) {
  const match = getMatchedRoute(route)
  const value = cache[match.path]
  return value && !value.dirty
}

export function clearAllResults(route) {
  const match = getMatchedRoute(route)

  for (const path in cache) {
    if (path !== match.path) {
      cache[path].dirty = true
    }
  }
}

export function formatError(err, route) {
  const matched = route.matched[0]
  const options = matched ? matched.components.default : {}

  if (err.stringified && options.__file) {
    console.error(
      `An error occurred while executing ` +
      `query for ${options.__file}\n\n` +
      `Error: ${err.stringified}`
    )
  }
}
