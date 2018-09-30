export function createObserver (handler) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(handler)
  }, {
    rootMargin: '20px',
    threshold: 0.1
  })

  return observer
}
