module.exports = (api) => {
  api.client(false)

  api.addTransformer('text/json', {
    parse: (string) => JSON.parse(string),
    stringify: (data) => data ? JSON.stringify(data) : ''
  })
}
