import Vue from 'vue'

export default {
  functional: true,

  props: {
    src: { type: Object },
    width: { type: String },
    alt: { type: String },
    immediate: { type: true }

    // responsive: true
    // grayscale: false
    // duotone: false
    // quality: 80
    // focus: center
    // rotate: 0
    // transition-name?
    // transition-duration?
  },

  render: (h, { data, props, parent }) => {
    const { src, srcset, sizes, size, dataUri } = props.src
    const isLazy = typeof props.immediate === 'undefined'
    const classNames = (data.class || []).concat(['g-image'])
    const nodescriptClassNames = classNames.slice()
    const vnodes = []

    vnodes.push(h('img', {
      ...data,
      class: classNames,
      attrs: {
        'src': dataUri,
        'alt': props.alt,
        'width': size.width,
        [`${isLazy ? 'data-' : ''}srcset`]: srcset.join(', '),
        [`${isLazy ? 'data-' : ''}sizes`]: sizes,
        [`${isLazy ? 'data-' : ''}src`]: src
      }
    }))

    if (isLazy) {
      classNames.push('g-image--lazy')
      nodescriptClassNames.push('g-image--loaded')

      vnodes.push(h('noscript', null, [
        h('img', {
          staticClass: data.staticClass,
          class: nodescriptClassNames,
          attrs: { src }
        })
      ]))
    }

    return vnodes
  }
}

const supportsIntersectionObserver = (
  'IntersectionObserver' in global &&
  'IntersectionObserverEntry' in global &&
  'intersectionRatio' in global.IntersectionObserverEntry.prototype
)

export function initIntersectionObserver (router) {
  const observer = supportsIntersectionObserver
    ? createObserver()
    : null

  const selector = '[data-src]'

  if (observer) {
    router.beforeEach((to, from, next) => {
      document.querySelectorAll(selector).forEach(el => {
        observer.unobserve(el)
      })
      next()
    })
  }

  router.afterEach((to, from) => {
    Vue.nextTick(() => {
      const images = document.querySelectorAll(selector)

      if (observer) {
        images.forEach(el => observer.observe(el))
      } else {
        Array.from(images).forEach(el => loadImage(el))
      }
    })
  })
}

function createObserver () {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ intersectionRatio, target }) => {
      if (intersectionRatio > 0 && target.dataset.src) {
        observer.unobserve(target)
        loadImage(target)
      }
    })
  }, {
    rootMargin: '20px',
    threshold: 0.1
  })

  return observer
}

function loadImage (el) {
  el.onload = function () {
    delete el.dataset.src
    delete el.dataset.srcset
    delete el.dataset.sizes
    delete el.onload

    el.classList.add('g-image--loaded')
  }

  el.src = el.dataset.src
  el.srcset = el.dataset.srcset
  el.sizes = el.dataset.sizes
}
