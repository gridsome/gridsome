import Vue from 'vue'

const cache = Vue.observable({})

export function setResults (path, res) {
  return Vue.set(cache, path, res)
}

export function getResults (path) {
  return cache[path]
}

export function formatError (err, route) {
  const matched = route.matched[0]
  const options = matched ? matched.components.default : {}
  
  if (err.stringified && options.__file) {
    return console.error( // eslint-disable-line
      `An error occurred while executing ` +
      `page-query for ${options.__file}\n\n` +
      `Error: ${err.stringified}`
    )
  }

  console.error(err.message) // eslint-disable-line
}
