const axios = require('axios')
const Queue = require('better-queue')
const querystring = require('querystring')

module.exports = (api, {
  baseUrl,
  perPage = 100,
  concurrent = 10,
  namespace = 'WordPress',
  routes = {}
}) => {
  const { info } = api.service

  api.client(false)

  api.initSource = async ({
    setNamespace,
    addType,
    addNode,
    makeUid,
    makeTypeName,
    graphql
  }) => {
    setNamespace(namespace)

    const { GraphQLString } = graphql
    const restUrl = `${baseUrl}/wp-json/wp/v2`
    const restBases = { posts: {}, taxonomies: {}}

    routes = {
      post: '/:year/:month/:day/:slug',
      post_tag: '/tag/:slug',
      ...routes
    }

    // add prefix to post and term id's since
    // they will share the same node store
    const makePostId = id => makeUid(`post-${id}`)
    const makeTermId = id => makeUid(`term-${id}`)

    const { data: types } = await axios.get(`${restUrl}/types`)
    info(`Post types (${Object.keys(types).length})`, namespace)

    const { data: taxonomies } = await axios.get(`${restUrl}/taxonomies`)
    info(`Taxonomy types (${Object.keys(taxonomies).length})`, namespace)

    for (const typeName in types) {
      const options = types[typeName]

      if (typeName === 'attachment') continue

      restBases.posts[typeName] = options.rest_base

      await addType({
        type: typeName,
        name: options.name,
        route: routes[typeName],
        fields: () => ({
          content: { type: GraphQLString, description: 'Content' },
          excerpt: { type: GraphQLString, description: 'Excerpt' },
          link: { type: GraphQLString, description: 'Link' }
        }),
        refs: ({ addReference, nodeTypes }) => options.taxonomies.forEach(tax => {
          addReference({
            name: tax,
            type: nodeTypes[makeTypeName(tax)]
          })
        })
      })
    }

    for (const typeName in taxonomies) {
      const options = taxonomies[typeName]
      restBases.taxonomies[typeName] = options.rest_base

      await addType({
        type: typeName,
        name: options.name,
        route: routes[typeName],
        fields: () => ({
          count: { type: GraphQLString, description: 'Count' }
        }),
        belongsTo: ({ nodeTypes }) => ({
          key: options.slug,
          types: options.types.map(type => nodeTypes[makeTypeName(type)])
        })
      })
    }

    for (const typeName in restBases.posts) {
      const restBase = restBases.posts[typeName]
      const endpoint = `${baseUrl}/wp-json/wp/v2/${restBase}`
      const posts = await fetchPaged(endpoint, { perPage, concurrent })

      info(`Post type ${types[typeName].name} (${posts.length})`, namespace)

      for (const post of posts) {
        const refs = {}

        // add references if post has any
        // taxonomy rest bases as properties
        for (const typeName in restBases.taxonomies) {
          const propName = restBases.taxonomies[typeName]
          if (post.hasOwnProperty(propName)) {
            refs[typeName] = post[propName].map(id => {
              return makeTermId(id)
            })
          }
        }

        await addNode({
          _id: makePostId(post.id),
          type: post.type,
          title: post.title ? post.title.rendered : '',
          created: new Date(post.date),
          updated: new Date(post.modified),
          slug: post.slug,
          fields: {
            content: post.content ? post.content.rendered : '',
            excerpt: post.excerpt ? post.excerpt.rendered : ''
          },
          refs
        })
      }
    }

    for (const typeName in restBases.taxonomies) {
      const restBase = restBases.taxonomies[typeName]
      const endpoint = `${baseUrl}/wp-json/wp/v2/${restBase}`
      const terms = await fetchPaged(endpoint, { perPage, concurrent })

      info(`Taxonomy type ${taxonomies[typeName].name} (${terms.length})`, namespace)

      for (const term of terms) {
        await addNode({
          _id: makeTermId(term.id),
          type: term.taxonomy,
          slug: term.slug,
          title: term.name,
          fields: {
            count: term.count
          }
        })
      }
    }
  }
}

async function taskHandler (task, cb) {
  try {
    const response = await axios.get(task.id)
    cb(null, response)
  } catch (err) {
    cb(err)
  }
}

function fetchPaged (url, options = {}) {
  return new Promise(async (resolve, reject) => {
    const query = querystring.stringify({ per_page: options.perPage })
    const { data, headers } = await axios.get(`${url}?${query}`)
    const totalItems = parseInt(headers['x-wp-total'], 10)
    const totalPages = parseInt(headers['x-wp-totalpages'], 10)

    if (!totalItems || totalPages <= 1) {
      return resolve(data)
    }

    const queue = new Queue(taskHandler, {
      concurrent: options.concurrent
    })

    for (let page = 2; page <= totalPages; page++) {
      const query = querystring.stringify({ per_page: options.perPage, page })
      queue.push({ id: `${url}?${query}` })
    }

    queue.on('task_failed', (id, err) => {
      reject(`${id} failed with error: ${err}`)
      queue.destroy()
    })

    queue.on('task_finish', (id, response) => {
      data.push(...response.data)
    })

    queue.on('drain', () => {
      resolve(data)
    })
  })
}
