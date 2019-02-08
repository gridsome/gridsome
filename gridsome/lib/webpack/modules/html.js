module.exports = () => ({
  transformNode (node) {
    if (node.attrsMap['v-html']) {
      // observe images inserted by v-html
      node.attrsList.push({ name: 'v-g-image' })
      node.attrsMap['v-g-image'] = true
    }
  }
})
