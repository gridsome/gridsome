export const isDef = v => v !== undefined && v !== null
export const isNil = v => v === undefined || v === null
export const isFunc = v => typeof v === 'function'

export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}
