/**
 * @link https://github.com/vuejs/vue/blob/dev/src/platforms/web/util/class.js
 */

import { isDef, isObject } from './lang'

export function stringifyClass (value) {
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (isObject(value)) {
    return stringifyObject(value)
  }
  if (typeof value === 'string') {
    return value
  }

  return ''
}

function stringifyArray (value) {
  let res = ''
  let stringified
  for (let i = 0, l = value.length; i < l; i++) {
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) res += ' '
      res += stringified
    }
  }
  return res
}

function stringifyObject (value) {
  let res = ''
  for (const key in value) {
    if (value[key]) {
      if (res) res += ' '
      res += key
    }
  }
  return res
}

/**
 * @link https://github.com/vuejs/vue/blob/dev/src/platforms/web/runtime/class-util.js
 */

const whitespaceRE = /\s+/

export function addClass (el, cls) {
  if (!cls || !(cls = cls.trim())) {
    return
  }

  if (el.classList) {
    if (cls.indexOf(' ') > -1) {
      cls.split(whitespaceRE).forEach(c => el.classList.add(c))
    } else {
      el.classList.add(cls)
    }
  } else {
    const cur = ` ${el.getAttribute('class') || ''} `
    if (cur.indexOf(' ' + cls + ' ') < 0) {
      el.setAttribute('class', (cur + cls).trim())
    }
  }
}

export function removeClass (el, cls) {
  if (!cls || !(cls = cls.trim())) {
    return
  }

  if (el.classList) {
    if (cls.indexOf(' ') > -1) {
      cls.split(whitespaceRE).forEach(c => el.classList.remove(c))
    } else {
      el.classList.remove(cls)
    }
    if (!el.classList.length) {
      el.removeAttribute('class')
    }
  } else {
    let cur = ` ${el.getAttribute('class') || ''} `
    const tar = ' ' + cls + ' '
    while (cur.indexOf(tar) >= 0) {
      cur = cur.replace(tar, ' ')
    }
    cur = cur.trim()
    if (cur) {
      el.setAttribute('class', cur)
    } else {
      el.removeAttribute('class')
    }
  }
}
