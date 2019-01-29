let main

try {
  main = require('~/main').default
} catch (err) {
  main = function () {}
}

export default main
