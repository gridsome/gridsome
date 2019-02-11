import caniuse from '../utils/caniuse'
import { createObserver } from '../utils/intersectionObserver'

const observer = caniuse.IntersectionObserver
  ? createObserver(intersectionHandler)
  : null

export default {
  inserted (el) {
    observe(el)
  },
  update (el) {
    observe(el)
  },
  unbind (el) {
    unobserve(el)
  }
}

function intersectionHandler ({ intersectionRatio, target }) {
  if (intersectionRatio > 0 && target.dataset.src) {
    observer.unobserve(target)
    loadImage(target)
  }
}

function observe (el) {
  if (el.tagName !== 'IMG') {
    observeHtml(el)
  } else {
    if (!observer) loadImage(el)
    else observer.observe(el)
  }
}

function unobserve (el) {
  if (el.tagName !== 'IMG') {
    unobserveHtml(el)
  } else {
    observer && observer.unobserve(el)
  }
}

function observeHtml (context = document) {
  const images = context.querySelectorAll('[data-src]')

  if (observer) {
    images.forEach(el => !el.__vue__ && observer.observe(el))
  } else {
    Array.from(images).forEach(el => !el.__vue__ && loadImage(el))
  }
}

function unobserveHtml (context = document) {
  if (observer) {
    context.querySelectorAll('[data-src]').forEach(el => {
      if (!el.__vue__) observer.unobserve(el)
    })
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
