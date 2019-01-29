let main

try {
  main = require('~/main').default
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    main = function () {}
  } else {
    throw err
  }
}

export default main
