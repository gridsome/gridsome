const IntersectionObserver = (
  typeof global.IntersectionObserver !== 'undefined'
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
