export function isDef (v) {
  return v !== undefined && v !== null
}

export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}
