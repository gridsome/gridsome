const publicPath = process.env.PUBLIC_PATH

export function unslash (string) {
  return string.replace(/^\/+|\/+$/g, '')
}

export function unslashStart (string) {
  return string.replace(/^\/+/g, '')
}

export function unslashEnd (string) {
  return string.replace(/\/+$/g, '')
}

export function url (string) {
  return `${publicPath}${string}`.replace(/\/+/g, '/')
}

export function stripPageParam (route) {
  return route.params.page && /^\d+$/.test(route.params.page)
    ? route.path.split('/').slice(0, -1).join('/') || '/'
    : unslashEnd(route.path) || '/'
}

const re = new RegExp(`^${publicPath}`)
const replacement = publicPath !== '/' ? '' : '/'
export function stripPathPrefix (string) {
  return string.replace(re, replacement)
}
