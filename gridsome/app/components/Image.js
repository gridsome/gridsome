import { h, withDirectives, resolveDirective } from 'vue'
import { stringifyClass } from '../utils/class'

const Image = (props, { attrs }) => {
  const imageAttrs = { ...attrs }
  const className = [attrs.class, 'g-image']
  const noscriptClassNames = [attrs.staticClass, className.slice()]
  const isImmediate = props.immediate || props.immediate !== undefined
  const dirs = attrs.directives || []
  const res = []

  switch (typeof props.src) {
    case 'object': {
      const { src, srcset, size, dataUri } = props.src

      const isLazy = !isImmediate && dataUri
      const sizes = imageAttrs.sizes || props.src.sizes

      imageAttrs.src = isLazy ? dataUri : src
      imageAttrs.width = size.width

      if (isLazy) imageAttrs['data-src'] = src
      if (srcset.length) imageAttrs[`${isLazy ? 'data-' : ''}srcset`] = Array.isArray(srcset) ? srcset.join(', ') : srcset
      if (sizes) imageAttrs[`${isLazy ? 'data-' : ''}sizes`] = sizes

      if (isLazy) {
        dirs.push({ name: 'g-image' })
      }

      break
    }
  }

  const onVnodeUpdated = (oldVnode, vnode) => {
    const { props: oldProps = {}} = oldVnode
    const { props = {}} = vnode

    if (props['data-src'] && props.src !== oldProps.src) {
      // clear srcset and sizes to show the dataUri image
      vnode.el.srcset = ''
      vnode.el.sizes = ''
    }
  }

  const imageDirective = resolveDirective('g-image')

  if (attrs['data-src']) {
    className.push('g-image--lazy')
    className.push('g-image--loading')
  }

  res.push(
    withDirectives(
      h('img', {
        ...imageAttrs,
        class: className,
        onVnodeUpdated
      }),
      [
        [imageDirective]
      ]
    )
  )

  if (attrs['data-src']) {
    noscriptClassNames.push('g-image--loaded')

    // must render as innerHTML to make hydration work

    res.push(
      h('noscript', {
        innerHTML: `` +
          `<img src="${attrs['data-src']}" class="${stringifyClass(noscriptClassNames)}"` +
          (attrs.width ? ` width="${attrs.width}"`: '') +
          (attrs.alt ? ` alt="${attrs.alt}"` : '') +
          `>`
      })
    )
  }

  return res
}

Image.props = {
  src: { type: [Object, String], required: true },
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  quality: { type: String, default: '' },
  fit: { type: String, default: '' },
  position: { type: String, default: '' },
  background: { type: String, default: '' },
  blur: { type: String, default: '' },
  immediate: { type: true, default: undefined },
  imageWidths: { type: String, default: undefined }
}

export default Image
