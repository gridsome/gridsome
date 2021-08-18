import caniuse from '../utils/caniuse'
import { addClass, removeClass } from '../utils/class'
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
  if (!el.classList.contains('g-image')) {
    observeHtml(el)
  } else {
    if (!observer) loadImage(el)
    else observer.observe(el)
  }
}

function unobserve (el) {
  if (!el.classList.contains('g-image')) {
    unobserveHtml(el)
  } else if (observer) {
    observer.unobserve(el)
  }
}

function observeHtml (context = document) {
  const images = context.querySelectorAll('.g-image')

  if (observer) {
    images.forEach(el => !el.__vue__ && observer.observe(el))
  } else {
    Array.from(images).forEach(el => !el.__vue__ && loadImage(el))
  }
}

function unobserveHtml (context = document) {
  if (observer) {
    context.querySelectorAll('.g-image').forEach(el => {
      if (!el.__vue__) observer.unobserve(el)
    })
  }
}

function loadImage (el) {
  const img = el.querySelector('[data-src]')
  const sources = el.querySelectorAll('[data-srcset]')

  sources.forEach((el) => {
    el.srcset = el.getAttribute('data-srcset')
  })

  if (!img) {
    return // src is already switched
  }

  const dataUri = img.getAttribute('src')

  img.onload = () => {
    removeClass(el, 'g-image--loading')
    addClass(el, 'g-image--loaded')
  }

  img.onerror = () => {
    el.srcset = ''
    el.sizes = ''
    el.src = dataUri
    removeClass(el, 'g-image--loading')
    addClass(el, 'g-image--error')
  }

  img.src = img.getAttribute('data-src')
}
