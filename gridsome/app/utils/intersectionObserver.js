export function createObserver (handler, options = {}) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(handler)
  }, {
    rootMargin: '20px',
    threshold: 0.1,
    ...options
  })

  return observer
}
