module.exports = function (api) {
  api.loadSource(store => {
    const posts = store.addCollection('Post')
    const tags = store.addCollection('Tag')
    const categories = store.addCollection('Category')
    const other = store.addCollection('Other')

    categories.addNode({
      id: '1',
      title: 'First category',
      path: '/category/first',
      showType: 'Post'
    })

    categories.addNode({
      id: '2',
      title: 'Second category',
      path: '/category/second'
    })

    tags.addNode({ id: '1', title: 'First tag', perPage: 2, skip: 0, limit: 10 })
    tags.addNode({ id: '2', title: 'Second tag', perPage: 2, skip: 0, limit: 10 })
    tags.addNode({ id: '3', title: 'Third tag', perPage: 2, skip: 0, limit: 10 })
    tags.addNode({ id: '4', title: 'Fourth tag', perPage: 2, skip: 1, limit: 3 })

    posts.addNode({
      title: 'Skip me',
      date: '2019-05-01',
      tags: [
        store.createReference('Tag', '4')
      ]
    })

    posts.addNode({
      id: '1',
      title: 'First post',
      date: '2017-05-23',
      dateFormat: 'YYYY',
      tags: [
        store.createReference('Tag', '2'),
        store.createReference('Tag', '3'),
        store.createReference('Tag', '4')
      ],
      category: store.createReference('Category', '1')
    })

    posts.addNode({
      id: '2',
      title: 'Second post',
      date: '2018-03-18',
      dateFormat: 'YYYY-MM',
      tags: [
        store.createReference('Tag', '1'),
        store.createReference('Tag', '2'),
        store.createReference('Tag', '4')
      ],
      category: store.createReference('Category', '1')
    })

    posts.addNode({
      id: '3',
      title: 'Third post',
      date: '2018-11-12',
      dateFormat: 'YYYY-MM-DD',
      tags: [
        store.createReference('Tag', '1'),
        store.createReference('Tag', '3'),
        store.createReference('Tag', '4')
      ],
      category: store.createReference('Category', '1')
    })

    posts.addNode({
      id: '4',
      title: 'Fourth post',
      date: '2018-12-04',
      dateFormat: 'YYYY-MM-DD'
    })

    for (let i = 4; i < 14; i++) {
      posts.addNode({ title: `Post ${i}`, excluded: true })
    }

    posts.addNode({
      title: 'Exclude me',
      date: '2017-03-14',
      tags: [
        store.createReference('Tag', '4')
      ]
    })

    for (let i = 1; i <= 10; i++) {
      other.addNode({
        id: String(i),
        title: `Other ${i}`,
        category: store.createReference('Category', '1')
      })
    }
  })

  api.createPages(({ getCollection, createPage }) => {
    const tags = getCollection('Tag')

    tags.collection.find().forEach(node => {
      createPage({
        path: `/tag/${node.id}/extra`,
        component: './src/templates/Tag.vue',
        queryVariables: node
      })
    })
  })
}
