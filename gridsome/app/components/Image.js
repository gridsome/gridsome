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
    immediate: { type: true, default: undefined }
  },

  render: (h, { data, props }) => {
    const classNames = [data.class, 'g-image']
    const isImmediate = props.immediate || props.immediate !== undefined
    const noscriptClassNames = classNames.slice()
    const directives = data.directives || []
    const attrs = data.attrs || {}
    const res = []

    switch (typeof props.src) {
      case 'string':
        attrs.src = props.src
        
        break

      case 'object': {
        const { src, srcset, sizes, size, dataUri } = props.src
        const isLazy = !isImmediate && dataUri
        
        attrs.src = isLazy ? dataUri : src
        attrs.width = size.width

        if (isLazy) attrs['data-src'] = src
        if (srcset.length) attrs[`${isLazy ? 'data-' : ''}srcset`] = srcset.join(', ')
        if (sizes) attrs[`${isLazy ? 'data-' : ''}sizes`] = sizes

        directives.push({ name: 'g-image' })

        break
      }
    }
    
    res.push(h('img', {
      ...data,
      class: classNames,
      directives,
      props,
      attrs
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
            (props.alt ? ` alt="${props.alt}"` : '') +
            `>`
        }
      }))
    }

    return res
  }
}
