const faker = require('faker')

module.exports = api => {
  api.client(false)

  api.initSource = ({ setNamespace, addType, addNode, graphql }) => {
    const { GraphQLString } = graphql

    setNamespace('Faker')

    addType({
      type: 'node',
      name: 'Node',
      fields: () => ({
        author: { type: GraphQLString },
        published: { type: GraphQLString },
        thumbnail: { type: GraphQLString },
        email: { type: GraphQLString },
        avatar: { type: GraphQLString },
        excerpt: { type: GraphQLString },
        content: { type: GraphQLString },
      })
    })

    for (let i = 0; i < 100; i++) {
      addNode({
        type: 'node',
        id: faker.random.uuid(),
        title: faker.lorem.sentence().slice(0, -1),
        slug: faker.lorem.slug(),
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
