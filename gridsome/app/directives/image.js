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
  if (intersectionRatio > 0) {
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
  } else if (observer) {
    observer.unobserve(el)
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
  const sizes = el.getAttribute('data-sizes')
  const srcset = el.getAttribute('data-srcset')

  if (!src || el.src.endsWith(src)) {
    return // src is already switched
  }

  const image = new Image()

  image.onload = function () {
    el.classList.remove('g-image--loading')
    el.classList.add('g-image--loaded')
    
    el.src = src
    el.sizes = sizes
    el.srcset = srcset
  }

  image.src = src

  el.classList.add('g-image--loading')
  el.classList.remove('g-image--loaded')
}
