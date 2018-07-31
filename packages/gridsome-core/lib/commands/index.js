module.exports = api => {
  require('./develop')(api)
  require('./generate')(api)
  require('./explore')(api)
}
