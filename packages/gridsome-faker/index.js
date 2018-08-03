const faker = require('faker')

module.exports = (api, {
  numNodes = 500,
  namespace = 'Faker'
}) => {
  api.client(false)

  api.initSource = ({ setNamespace, addType, addNode, graphql, slugify }) => {
    const { GraphQLString } = graphql

    setNamespace(namespace)

    addType({
      type: 'node',
      name: 'Node',
      route: '/:year/:month/:day/:slug',
      fields: () => ({
        author: { type: GraphQLString },
        published: { type: GraphQLString },
        thumbnail: { type: GraphQLString },
        email: { type: GraphQLString },
        avatar: { type: GraphQLString },
        excerpt: { type: GraphQLString },
        content: { type: GraphQLString }
      })
    })

    for (let i = 0; i < numNodes; i++) {
      const random = faker.random.number({ min: 3, max: 6 })
      const title = faker.lorem.sentence(random).slice(0, -1)

      addNode({
        title,
        type: 'node',
        id: faker.random.uuid(),
        slug: slugify(title),
        created: faker.date.recent(100),
        updated: faker.date.recent(10),
        fields: {
          author: faker.name.findName(),
          published: faker.date.recent(),
          thumbnail: faker.image.people(),
          email: faker.internet.exampleEmail(),
          avatar: faker.image.avatar(),
          excerpt: faker.lorem.sentences(2),
          content: faker.lorem.paragraphs(10)
        }
      })
    }
  }
}
