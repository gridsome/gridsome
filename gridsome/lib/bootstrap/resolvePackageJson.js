const path = require('path')
const fs = require('fs-extra')

module.exports = (context, pkg = {}) => {
  const pkgPath = path.resolve(context, 'package.json')

  try {
    const content = fs.readFileSync(pkgPath, 'utf-8')
    pkg = JSON.parse(content)
  } catch (err) {}

  return pkg
}
