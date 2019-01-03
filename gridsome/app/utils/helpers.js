const publicPath = process.env.PUBLIC_PATH

export function unslash (string) {
  return string.replace(/^\/+|\/+$/g, '')
}

export function url (string) {
  return `${publicPath}${string}`.replace(/\/+/g, '/')
}

const re = new RegExp(`^${publicPath}`)
const replacement = publicPath !== '/' ? '' : '/'
export function stripPathPrefix (string) {
  return string.replace(re, replacement)
}
