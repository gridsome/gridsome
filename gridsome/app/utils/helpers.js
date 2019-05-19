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
  const { path, params: { page }} = route
  const normalizedPath = unslashEnd(path)

  return page && /^\d+$/.test(page) && /\/\d+$/.test(normalizedPath)
    ? normalizedPath.split('/').slice(0, -1).join('/') || '/'
    : normalizedPath || '/'
}

const re = new RegExp(`^${publicPath}`)
const replacement = publicPath !== '/' ? '' : '/'
export function stripPathPrefix (string) {
  return string.replace(re, replacement)
}
