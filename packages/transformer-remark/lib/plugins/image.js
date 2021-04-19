const h = require('hastscript')
const u = require('unist-builder')
const toHTML = require('hast-util-to-html')
const visit = require('unist-util-visit-parents')

function createImageElement (node, asset, isLazy = true) {
  return u('element', {
    tagName: 'div',
    properties: {
      class: isLazy
        ? 'g-image g-image--lazy g-image--loading'
        : 'g-image g-image--loaded'
    },
    children: [
      h('div', {
        style: `width:100%;padding-bottom:${asset.size.height / asset.size.width * 100}%;`
      }),
      isLazy && h('img', {
        src: asset.dataUri,
        class: 'g-image__placeholder',
        'aria-hidden': true,
        width: asset.size.width,
        height: asset.size.height,
        alt: ''
      }),
      h(
        'picture',
        { class: 'g-image__picture' },
        [
          h('source', {
            type: asset.mimeType,
            srcset: isLazy ? undefined : asset.srcset.join(', '),
            dataSrcset: isLazy ? asset.srcset.join(', ') : undefined
          }),
          h('img', {
            src: isLazy ? asset.blankUri : asset.src,
            dataSrc: isLazy ? asset.src : undefined,
            class: 'g-image__image',
            width: asset.size.width,
            height: asset.size.height,
            alt: node.alt
          })
        ]
      )
    ].filter(Boolean)
  })
}

function getUpmostNode (ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (i && ancestors[i].type === 'paragraph') {
      return [
        ancestors[i - 1],
        ancestors[i - 1].children.indexOf(ancestors[i])
      ]
    }
  }
  return [null, -1]
}

/**
 * This transformation must match the markup in `g-image`.
 *
 * @link file://./../../../../gridsome/app/components/Image.js
 */
module.exports = function attacher (options = {}) {
  const transformer = this.data('transformer')

  return async function transform (tree, file, callback) {
    if (!transformer) return callback()
    if (!file.path) return callback()

    const images = []

    visit(tree, 'image', (node, ancestors) => {
      images.push([node, ancestors])
    })

    for (const [node, ancestors] of images) {
      const data = node.data || {}
      const props = data.hProperties || {}
      const classNames = props.class || []
      const [parent, index] = getUpmostNode(ancestors)

      if (!parent) continue

      const path = file.data.node
        ? transformer.resolveNodeFilePath(file.data.node, node.url)
        : node.url

      try {
        const asset = await transformer.assets.add(path, {
          alt: props.alt || node.alt,
          width: props.width,
          height: props.height,
          classNames,
          ...options
        })

        const element = {
          type: 'root',
          children: [
            createImageElement(node, asset, !!asset.dataUri),
            asset.dataUri && h('noscript', {}, [createImageElement(node, asset, false)])
          ].filter(Boolean)
        }

        parent.children.splice(
          index,
          1,
          u('html', toHTML(element, { allowDangerousHTML: true }))
        )
      } catch (err) {
        callback(err)
        return
      }
    }

    callback()
  }
}
