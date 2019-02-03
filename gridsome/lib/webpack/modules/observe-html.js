module.exports = () => ({
  transformNode (node) {
    if (node.attrsMap['v-html']) {
      // observe images inserted by v-html
      node.attrsList.push({ name: 'v-observe-html' })
      node.attrsMap['v-observe-html'] = true
    }
  }
})
