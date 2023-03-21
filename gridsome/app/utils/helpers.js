import config from '~/.temp/config'

const re = new RegExp(`^${config.pathPrefix}/?`)

export function unslash (string) {
  return string.replace(/^\/+|\/+$/g, '')
}

export function unslashStart (string) {
  return string.replace(/^\/+/g, '')
}

export function unslashEnd (string) {
  return string.replace(/\/+$/g, '')
}

export function url (string = '/') {
  return normalizePath(`${config.pathPrefix}/${string}`)
}

export function stripPageParam (route) {
  const { path, params: { page }} = route
  const normalizedPath = unslashEnd(path)
  const suffix = /\/$/.test(path) ? '/' : ''

  return page && /^\d+$/.test(page) && /\/\d+$/.test(normalizedPath)
    ? `${normalizedPath.split('/').slice(0, -1).join('/')}${suffix}` || '/'
    : `${normalizedPath}${suffix}` || '/'
}

export function stripPathPrefix (string) {
  return '/' + unslashStart(string.replace(re, ''))
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

export function normalizePath (path = '/') {
  return `/${path}`.replace(/\/+/g, '/')
}

export const isMailtoLink = string => String(string).startsWith('mailto:')

export const isTelLink = string => String(string).startsWith('tel:')