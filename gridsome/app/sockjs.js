import fetch from './fetch'
import SockJS from 'sockjs-client'
import { formatError, clearAllResults, setResults } from './graphql/shared'

export function createSockJSClient({ router }) {
  const sock = new SockJS(process.env.SOCKJS_ENDPOINT)

  sock.onmessage = message => {
    const data = JSON.parse(message.data)

    switch (data.type) {
      case 'fetch':
        fetch(router.currentRoute.value, { force: true })
          .then(res => {
            if (res.errors) {
              formatError(res.errors[0], router.currentRoute.value)
            } else {
              clearAllResults(router.currentRoute.value)
              setResults(router.currentRoute.value, res)
            }
          })
          .catch(err => formatError(err, router.currentRoute.value))

        break
    }
  }
}
