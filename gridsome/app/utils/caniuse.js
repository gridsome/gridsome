const IntersectionObserver = (
  'document' in global &&
  'IntersectionObserver' in global &&
  'IntersectionObserverEntry' in global &&
  'intersectionRatio' in global.IntersectionObserverEntry.prototype
)

const prefetch = (
  'document' in global &&
  (() => {
    const $el = document.createElement('link')

    try {
      return $el.relList.supports('prefetch')
    } catch (err) {
      return false
    }
  })()
)

export default {
  IntersectionObserver,
  prefetch
}
