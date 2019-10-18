const isUrl = require('is-url')
const isRelative = require('is-relative')
const { isMailtoLink, isTelLink } = require('../../utils')
const { trimStart } = require('lodash')

const configAttrs = ['directory', 'extensions', 'deep']

const isStatic = value => /^"([^"]+)?"$/.test(value)

const isValidValue = value => (
  !isUrl(value) &&
  !isMailtoLink(value) &&
  !isTelLink(value) &&
  isRelative(value)
)

const extractValue = value => value.substr(1, value.length - 2)

const getAttr = (node, name) =>
  node.attrs.find(attr => attr.name === name)

const getAttrValue = (node, name) => {
  const attr = getAttr(node, name)
  return attr ? extractValue(attr.value) : null
}

const createOptionsQuery = attrs => attrs
  .filter(attr => attr.name !== 'src')
  .filter(attr => !configAttrs.includes(attr.name))
  .filter(attr => isStatic(attr.value))
  .map(attr => ({ name: attr.name, value: extractValue(attr.value) }))
  .map(attr => `${attr.name}=${encodeURIComponent(attr.value)}`)
  .join('&')

function genRequireContext (node, attr, defaultExtensions = []) {
  const customExtensions = getAttrValue(node, 'extensions') || ''
  const ext = customExtensions.split(',').filter(Boolean)
  const dir = getAttrValue(node, 'directory')
  const value = attr.value
  let result = attr.value

  if (!ext.length) {
    ext.push(...defaultExtensions)
  }

  const extNames = ext.map(v => trimStart(v, '.'))

  if (!isStatic(value)) {
    const query = createOptionsQuery(node.attrs)
    const dirArg = `!!assets-loader?${query}!${dir}`
    const subdirsArg = getAttr(node, 'deep') ? 'true' : 'false'
    const valueArg = `"./" + (${value} || "").replace(${/^.\//}, "")`
    const filterArg = ext.length ? new RegExp(`\\.(${extNames.join('|')})$`) : 'undefined'
    result = `require.context("${dirArg}", ${subdirsArg}, ${filterArg})(${valueArg})`
  }

  return result
}

function genRequire (node, attr) {
  const value = extractValue(attr.value)
  let result = attr.value

  if (isValidValue(value)) {
    const query = createOptionsQuery(node.attrs)
    result = `require("!!assets-loader?${query}!${value}")`
  }

  return result
}

function transformNodeAttr (node, attrName, defaultExtensions = []) {
  if (!Array.isArray(node.attrs)) return

  for (const attr of node.attrs) {
    if (attr.name === attrName) {
      if (isStatic(attr.value)) {
        attr.value = genRequire(node, attr)
        break
      } else {
        const directory = getAttr(node, 'directory')

        if (directory) {
          configAttrs.forEach(name => {
            const attr = getAttr(node, name)
            if (attr && !isStatic(attr.value)) {
              throw new Error(`The ${name} attribute cannot be a JavaScript variable.`)
            }
          })

          attr.value = genRequireContext(node, attr, defaultExtensions)
          break
        }
      }
    }
  }
}

module.exports = ({ defaultImageExtensions }) => ({
  postTransformNode (node) {
    if (node.tag === 'g-link') {
      transformNodeAttr(node, 'to')
    }

    if (node.tag === 'g-image') {
      transformNodeAttr(node, 'src', defaultImageExtensions)
    }
  }
})

