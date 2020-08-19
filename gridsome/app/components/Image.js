import { stringifyClass } from '../utils/class'

// @vue/component
export default {
  functional: true,

  props: {
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
  },

  render: (h, { data, props }) => {
    const classNames = [data.class, 'g-image']
    const noscriptClassNames = [data.staticClass, classNames.slice()]
    const isImmediate = props.immediate || props.immediate !== undefined
    const directives = data.directives || []
    const attrs = data.attrs || {}
    const hook = data.hook || {}
    const res = []

    switch (typeof props.src) {
      case 'string':
        attrs.src = props.src

        break

      case 'object': {
        const { src, srcset, size, dataUri } = props.src

        const isLazy = !isImmediate && dataUri
        const sizes = attrs.sizes || props.src.sizes

        attrs.src = isLazy ? dataUri : src
        attrs.width = size.width

        if (isLazy) attrs['data-src'] = src
        if (srcset.length) attrs[`${isLazy ? 'data-' : ''}srcset`] = Array.isArray(srcset) ? srcset.join(', ') : srcset
        if (sizes) attrs[`${isLazy ? 'data-' : ''}sizes`] = sizes

        if (isLazy) {
          directives.push({ name: 'g-image' })
        }

        break
      }
    }

    hook.update = (oldVnode, vnode) => {
      const { attrs: oldAttrs = {}} = oldVnode.data
      const { attrs = {}} = vnode.data

      if (attrs['data-src'] && attrs.src !== oldAttrs.src) {
        // clear srcset and sizes to show the dataUri image
        vnode.elm.srcset = ''
        vnode.elm.sizes = ''
      }
    }

    res.push(h('img', {
      ...data,
      class: classNames,
      directives,
      props,
      attrs,
      hook
    }))

    if (attrs['data-src']) {
      classNames.push('g-image--lazy')
      classNames.push('g-image--loading')
      noscriptClassNames.push('g-image--loaded')

      // must render as innerHTML to make hydration work

      res.push(h('noscript', {
        domProps: {
          innerHTML: `` +
            `<img src="${props.src.src}" class="${stringifyClass(noscriptClassNames)}"` +
            (attrs.width ? ` width="${attrs.width}"`: '') +
            (attrs.alt ? ` alt="${attrs.alt}"` : '') +
            `>`
        }
      }))
    }

    return res
  }
}
