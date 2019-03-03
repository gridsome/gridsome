const isSupported = (
  'document' in global &&
  (() => {
    const link = document.createElement('link')
    return link.relList && link.relList.supports && link.relList.supports('prefetch')
  })()
)

export default function prefetch (url) {
  return new Promise((resolve, reject) => {
    if (isSupported) {
      const link = document.createElement('link')
      const removeLink = () => document.head.removeChild(link)
      
      link.onerror = err => {
        removeLink()
        reject(err)
      }

      link.onload = () => {
        removeLink()
        resolve()
      }
      
      link.setAttribute('rel', 'prefetch')
      link.setAttribute('href', url)

      document.head.appendChild(link)
    } else {
      const req = new XMLHttpRequest()
      req.onload = () => req.status === 200 ? resolve() : reject()
      req.withCredentials = true
      req.open('GET', url, true)
    }
  })
}
