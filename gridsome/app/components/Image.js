import Vue from 'vue'

const supportsIntersectionObserver = (
  'document' in global &&
  'IntersectionObserver' in global &&
  'IntersectionObserverEntry' in global &&
  'intersectionRatio' in global.IntersectionObserverEntry.prototype
)

const observer = supportsIntersectionObserver
  ? createObserver()
  : null

let uid = 0

export default {
  functional: true,

  props: {
    src: { type: Object },
    width: { type: String },
    alt: { type: String },
    immediate: { type: true },
    blur: { type: String }

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
    const isDev = process.env.NODE_ENV === 'development'
    const { src, srcset, sizes, size, dataUri } = props.src
    const isLazy = typeof props.immediate === 'undefined'
    const classNames = (data.class || []).concat(['g-image'])
    const noscriptClass = classNames.slice()
    const res = []

    const ref = data.ref || `__image_${uid++}`
    const key = data.key || isDev ? ref : undefined

    // we set a key to force update image after hot-reload because
    // the html attributes doesn't re-render after deletion

    res.push(h('img', {
      ...data,
      ref,
      key,
      class: classNames,
      attrs: {
        src: dataUri,
        alt: props.alt,
        width: size.width,
        [`${isLazy ? 'data-' : ''}srcset`]: srcset.join(', '),
        [`${isLazy ? 'data-' : ''}sizes`]: sizes,
        [`${isLazy ? 'data-' : ''}src`]: src
      }
    }))

    if (isLazy) {
      const onMount = el => {
        if (!el) return
        else if (!observer) loadImage(el)
        else observer.observe(el)
      }

      const onDestroy = el => {
        if (el && observer) observer.unobserve(el)
      }

      classNames.push('g-image--lazy')
      noscriptClass.push('g-image--loaded')

      parent.$once('hook:mounted', () => onMount(parent.$refs[ref]))
      parent.$once('hook:updated', () => onMount(parent.$refs[ref]))
      parent.$once('hook:beforeDestroy', () => onDestroy(parent.$refs[ref]))

      res.push(h('noscript', null, [
        h('img', {
          class: noscriptClass,
          attrs: {
            src,
            alt: props.alt,
            width: size.width
          }
        })
      ]))
    }

    return res
  }
}

export function initIntersectionObserver (router) {
  if (observer) {
    router.beforeEach((to, from, next) => {
      unobserve()
      next()
    })
  }

  router.afterEach((to, from) => {
    Vue.nextTick(() => observe())
  })
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
