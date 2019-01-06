import Vue from 'vue'
import caniuse from '../utils/caniuse'
import { stringifyClass } from '../utils/class'
import { createObserver } from '../utils/intersectionObserver'

const observer = caniuse.IntersectionObserver
  ? createObserver(intersectionHandler)
  : null

export default {
  functional: true,

  props: {
    src: { type: [Object, String], required: true },
    width: { type: String },
    height: { type: String },
    fit: { type: String },
    position: { type: String },
    background: { type: String },
    immediate: { type: true },
    quality: { type: String },
    blur: { type: String }
  },

  render: (h, { data, props, parent }) => {
    const isLazy = typeof props.immediate === 'undefined'
    const classNames = [data.class, 'g-image']
    const isImmediate = props.immediate || props.immediate !== undefined
    const noscriptClassNames = classNames.slice()
    const ref = data.ref || data.key
    const attrs = data.attrs
    const res = []

    switch (typeof props.src) {
      case 'string':
        attrs.src = props.src
        attrs.width = props.width
        
        break

      case 'object':
        const { src, srcset, sizes, size, dataUri } = props.src
        const isLazy = !isImmediate && dataUri
        
        attrs.src = isLazy ? dataUri : src
        attrs.width = size.width

        if (isLazy) attrs['data-src'] = src
        if (srcset.length) attrs[`${isLazy ? 'data-' : ''}srcset`] = srcset.join(', ')
        if (sizes) attrs[`${isLazy ? 'data-' : ''}sizes`] = sizes
        if (size) attrs[`${isLazy ? 'data-' : ''}size`] = size

        break
    }

    res.push(h('img', {
      ...data,
      class: classNames,
      attrs,
      ref
    }))

    if (attrs['data-src']) {
      const onMount = el => {
        if (!el) return
        else if (!observer) loadImage(el)
        else observer.observe(el)
      }

      const onDestroy = el => {
        if (el && observer) observer.unobserve(el)
      }

      classNames.push('g-image--lazy')
      classNames.push('g-image--loading')
      noscriptClassNames.push('g-image--loaded')

      parent.$once('hook:mounted', () => onMount(parent.$refs[ref]))
      parent.$once('hook:updated', () => onMount(parent.$refs[ref]))
      parent.$once('hook:beforeDestroy', () => onDestroy(parent.$refs[ref]))

      // must render as innerHTML to make hydration work
      res.push(h('noscript', {
        domProps: {
          innerHTML: `` + 
            `<img src="${attrs.src}" class="${stringifyClass(noscriptClassNames)}"` +
            (attrs.width ? ` width="${attrs.width}"`: '') +
            (props.alt ? ` alt="${props.alt}"` : '') +
            `>`
        }
      }))
    }

    return res
  }
}

export function observe (selector = '[data-src]', context = document) {
  const images = context.querySelectorAll(selector)

  if (observer) {
    images.forEach(el => !el.__vue__ && observer.observe(el))
  } else {
    Array.from(images).forEach(el => !el.__vue__ && loadImage(el))
  }
}

export function unobserve (selector = '[data-src]', context = document) {
  if (observer) {
    context.querySelectorAll(selector).forEach(el => {
      if (!el.__vue__) observer.unobserve(el)
    })
  }
}

function intersectionHandler ({ intersectionRatio, target }) {
  if (intersectionRatio > 0 && target.dataset.src) {
    observer.unobserve(target)
    loadImage(target)
  }
}

function loadImage (el) {
  const src = el.getAttribute('data-src')
  const srcset = el.getAttribute('data-srcset')
  const sizes = el.getAttribute('data-sizes')

  if (!src) return

  el.onload = function () {
    el.removeAttribute('data-src')
    el.removeAttribute('data-srcset')
    el.removeAttribute('data-sizes')

    el.classList.remove('g-image--loading')
    el.classList.add('g-image--loaded')
    
    delete el.onload
  }

  el.src = src
  el.srcset = srcset
  el.sizes = sizes
}
