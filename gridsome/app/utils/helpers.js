import config from '~/.temp/config.js'

export function unslash (string) {
  return string.replace(/^\/+|\/+$/g, '')
}

export function url (string) {
  return `${config.pathPrefix}${string}`.replace(/\/+/g, '/')
}

const re = new RegExp(`^${config.pathPrefix}`)
const replacement = config.pathPrefix !== '/' ? '' : '/'
export function stripPathPrefix (string) {
  return string.replace(re, replacement)
}
