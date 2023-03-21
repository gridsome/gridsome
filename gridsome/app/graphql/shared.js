import Vue from 'vue'
import { unslash } from '../utils/helpers'

const cache = Vue.observable({})
const normalize = path => unslash(path) || '/'

export function setResults (path, res) {
  return Vue.set(cache, normalize(path), res)
}

export function getResults (path) {
  return cache[normalize(path)]
}

export function clearAllResults (currentPath) {
  currentPath = normalize(currentPath)

  for (const path in cache) {
    if (path !== currentPath) {
      Vue.delete(cache, path)
    }
  }
}

export function formatError (err, route) {
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
