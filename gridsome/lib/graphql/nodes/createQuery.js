module.exports = function createQuery ({ typeName }) {
  return {
    type: typeName,
    args: {
      id: 'ID',
      path: 'String',
      nullable: {
        type: 'Boolean',
        defaultValue: false,
        description: 'Will return an error if not nullable.',
        deprecationReason: 'Will always return null if not found.'
      }
    },
    resolve (_, { id, path }, { store }, { returnType }) {
      const { collection } = store.getContentType(returnType)
      let node = null

      if (id) {
        node = collection.by('id', id)
      } else if (path) {
        // must use collection.findOne() here because
        // collection.by() doesn't update after changes
        node = collection.findOne({ path })
      }

      return node || null
    }
  }
}
