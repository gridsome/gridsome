const faker = require('faker')

module.exports = function (api, options) {
  api.loadSource(({ addContentType, slugify }) => {
    const contentType = addContentType({
      typeName: options.typeName,
      route: options.route
    })

    for (let i = 0; i < options.numNodes; i++) {
      const random = faker.random.number({ min: 3, max: 6 })
      const title = faker.lorem.sentence(random).slice(0, -1)

      contentType.addNode({
        title,
        id: faker.random.uuid(),
        slug: slugify(title),
        date: faker.date.past(10),
        excerpt: faker.lorem.sentences(2),
        content: faker.lorem.paragraphs(10),
        author: faker.name.findName(),
        thumbnail: faker.image.people(),
        email: faker.internet.exampleEmail(),
        avatar: faker.image.avatar()
      })
    }
  })
}

module.exports.defaultOptions = () => ({
  numNodes: 500,
  typeName: 'Faker',
  route: '/:year/:month/:day/:slug'
})
