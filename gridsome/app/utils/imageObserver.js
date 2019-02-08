import caniuse from './caniuse'
import { createObserver } from './intersectionObserver'

export const observer = caniuse.IntersectionObserver
  ? createObserver(({ intersectionRatio, target }) => {
    if (intersectionRatio > 0 && target.dataset.src) {
      observer.unobserve(target)
      loadImage(target)
    }
  })
  : null

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

export function loadImage (el) {
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
