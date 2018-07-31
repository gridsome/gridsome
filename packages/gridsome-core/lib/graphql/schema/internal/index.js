const createSlugify = require('./slugify')

module.exports = () => {
  const slugify = createSlugify()

  return {
    queries: {
      ...slugify.queries,
    }
  }
}
