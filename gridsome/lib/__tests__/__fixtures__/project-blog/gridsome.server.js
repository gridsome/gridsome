module.exports = function (api) {
  api.loadSource(store => {
    const posts = store.addContentType({
      typeName: 'Post',
      route: '/:slug'
    })

    const tags = store.addContentType({
      typeName: 'Tag',
      route: '/tag/:slug'
    })

    const categories = store.addContentType({
      typeName: 'Category'
    })

    const other = store.addContentType({
      typeName: 'Other'
    })

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

    tags.addNode({ id: '1', title: 'First tag', perPage: 2 })
    tags.addNode({ id: '2', title: 'Second tag', perPage: 2 })
    tags.addNode({ id: '3', title: 'Third tag', perPage: 2 })
    tags.addNode({ id: '4', title: 'Fourth tag', perPage: 2 })

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

    for (let i = 4; i < 14; i++) {
      posts.addNode({
        title: `Post ${i}`,
        excluded: true
      })
    }

    for (let i = 1; i <= 10; i++) {
      other.addNode({
        id: String(i),
        title: `Other ${i}`,
        category: store.createReference('Category', '1')
      })
    }
  })
}
