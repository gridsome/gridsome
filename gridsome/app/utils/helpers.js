import config from '~/.temp/config.js'

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

export function parsePath (path) {
  let pathname = path || '/'
  let query = ''
  let hash = ''

  ;[pathname, hash = ''] = path.split('#')
  ;[pathname, query = ''] = pathname.split('?')

  return {
    pathname,
    query: query ? `?${query}` : '',
    hash: hash ? `#${hash}` : ''
  }
}

export function normalizePath (path) {
  const { pathname, query, hash } = parsePath(path)
  const trailingSlash = config.trailingSlash === 'always'
  const unslashed = unslashStart(pathname).replace(/\/+/g, '/')

  if (/\.\w+$/.test(pathname)) {
    return path
  } else if (/\/$/.test(unslashed)) {
    return `/${unslashed + query + hash}`
  }

  const normalized = unslashed ? `/${unslashed}` : '/'
  const trailingValue = unslashed && trailingSlash ? '/' : ''

  return normalized + trailingValue + query + hash
}
