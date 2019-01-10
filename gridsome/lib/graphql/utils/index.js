exports.getRootNodeFields = function (node) {
  return {
    ...node.fields,
    id: node.id,
    title: node.title,
    date: node.date,
    slug: node.slug,
    path: node.path,
    content: node.content,
    excerpt: node.excerpt
  }
}
