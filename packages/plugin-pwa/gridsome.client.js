import { register } from 'register-service-worker'

export default function (Vue, options, { head, isClient }) {
  if (isClient && process.env.NODE_ENV === 'production') {
    register(options.serviceWorkerPath, {
      ready () {
        console.log('Service worker is active.')
      },
      registered (registration) {
        console.log('Service worker has been registered.')
      },
      cached (registration) {
        console.log('Content has been cached for offline use.')
      },
      updatefound (registration) {
        console.log('New content is downloading.')
      },
      updated (registration) {
        console.log('New content is available; please refresh.')
      },
      offline () {
        console.log('No internet connection found. App is running in offline mode.')
      },
      error (error) {
        console.error('Error during service worker registration:', error)
      }
    })
  }

  head.link.push({
    rel: 'manifest',
    href: options.manifestPath
  })

  head.meta.push({
    name: 'theme-color',
    content: options.themeColor
  })

  head.meta.push({
    name: 'apple-mobile-web-app-capable',
    content: 'yes'
  })

  head.meta.push({
    name: 'apple-mobile-web-app-status-bar-style',
    content: options.statusBarStyle
  })

  head.meta.push({
    name: 'apple-mobile-web-app-title',
    content: options.title
  })

  head.meta.push({
    name: 'msapplication-TileImage',
    content: options.msTileImage
  })

  head.meta.push({
    name: 'msapplication-TileColor',
    content: options.msTileColor
  })
}
