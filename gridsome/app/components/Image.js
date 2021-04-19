import { stringifyClass } from '../utils/class'

import './Image.css'

// @vue/component
export default {
  functional: true,

  props: {
    src: { type: [Object, String], required: true },
    alt: { type: String, required: true },
    sizes: { type: String, default: undefined },
    width: { type: String, default: '' },
    height: { type: String, default: '' },
    quality: { type: String, default: '' },
    fit: { type: String, default: '' },
    position: { type: String, default: '' },
    background: { type: String, default: '' },
    blur: { type: String, default: '' },
    immediate: { type: Boolean, default: false },
    imageWidths: { type: String, default: undefined },
    placeholderClass: { type: String, default: '' },
    pictureClass: { type: String, default: '' },
    imageClass: { type: String, default: '' }
  },

  render: (h, { data, props }) => {
    const { on, ...wrapperData } = data
    const classNames = [data.class, 'g-image']
    const noscriptClassNames = [data.staticClass, classNames.slice()]
    const isImmediate = props.immediate
    const directives = data.directives || []
    const attrs = data.attrs || {}
    const hook = data.hook || {}
    let sources = []

    const placeholderAttrs = {
      src: props.src,
      width: props.width,
      height: props.height,
      'aria-hidden': true,
      alt: ''
    }

    const imgAttrs = {
      src: props.src,
      width: props.width,
      height: props.height,
      sizes: props.sizes,
      alt: props.alt
    }

    switch (typeof props.src) {
      case 'string':
        attrs.src = props.src

        break

      case 'object': {
        const { src, srcset, size, dataUri, blankUri, mimeType } = props.src

        const isLazy = !isImmediate && dataUri

        imgAttrs.src = src
        imgAttrs.width = size.width
        imgAttrs.height = size.height

        if (srcset.length) {
          const srcsetStr = Array.isArray(srcset) ? srcset.join(', ') : srcset
          sources = [
            h('source', {
              attrs: {
                type: mimeType,
                sizes: props.sizes,
                srcset: isLazy ? undefined : srcsetStr,
                ['data-srcset']: isLazy ? srcsetStr: undefined }
              }
            )
          ]
        }

        if (isLazy) {
          imgAttrs['data-src'] = imgAttrs.src
          imgAttrs.src = blankUri
          placeholderAttrs.src = dataUri
          placeholderAttrs.width = size.width
          placeholderAttrs.height = size.height
          classNames.push('g-image--lazy')
          classNames.push('g-image--loading')
          directives.push({ name: 'g-image' })
        }

        break
      }
    }

    hook.update = (oldVnode, vnode) => {
      const { attrs: oldAttrs = {}} = oldVnode.data
      const { attrs = {}} = vnode.data

      if (imgAttrs['data-src'] && attrs.src !== oldAttrs.src) {
        // clear srcset and sizes to show the dataUri image
        vnode.elm.srcset = ''
        vnode.elm.sizes = ''
      }
    }

    return [
      h(
        'div',
        {
          ...wrapperData,
          class: classNames,
          directives,
          props,
          attrs
        },
        [
          h(
            'div',
            {
              style: {
                width: '100%',
                paddingBottom: `${imgAttrs.height / imgAttrs.width * 100}%`
              }
            }
          ),
          h(
            'img',
            {
              class: ['g-image__placeholder', props.placeholderClass],
              attrs: placeholderAttrs
            }
          ),
          h(
            'picture',
            {
              class: ['g-image__picture', props.pictureClass]
            },
            [
              ...sources,
              h(
                'img',
                {
                  class: ['g-image__image', props.imageClass],
                  attrs: imgAttrs,
                  hook,
                  on
                }
              )
            ]
          )
        ]
      ),
      imgAttrs['data-src'] && h('noscript', {
        domProps: {
          // Must render as innerHTML to make hydration work
          innerHTML: `` +
            `<div class="${stringifyClass([noscriptClassNames, 'g-image--loaded'])}">` +
            `<picture class="${stringifyClass(['g-image__picture', props.pictureClass])}">` +
            sources
              .map((vnode) => {
                const { type, sizes } = vnode.data.attrs
                const typeStr = type ? `type="${type}" ` : ''
                const sizesStr = sizes ? `sizes="${sizes}" ` : ''
                return `<source ${typeStr}${sizesStr}srcset="${vnode.data.attrs['data-srcset']}">`
              })
              .join('') +
            `<img src="${props.src.src}" class="${stringifyClass(['g-image__image', props.imageClass])}"` +
            (imgAttrs.width ? ` width="${imgAttrs.width}"`: '') +
            (imgAttrs.height ? ` height="${imgAttrs.height}"`: '') +
            (imgAttrs.alt ? ` alt="${imgAttrs.alt}"` : '') +
            `>` +
            `</picture>` +
            `</div>`
        }
      })
    ].filter(Boolean)
  }
}
