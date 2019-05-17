import fetch from './fetch'
import router from './router'
import SockJS from 'sockjs-client'
import { formatError, clearAllResults, setResults } from './graphql/shared'

const sock = new SockJS(process.env.SOCKJS_ENDPOINT)

sock.onmessage = message => {
  const data = JSON.parse(message.data)

  switch (data.type) {
    case 'fetch':
      fetch(router.currentRoute, { force: true })
        .then(res => {
          if (res.errors) {
            formatError(res.errors[0], router.currentRoute)
          } else {
            clearAllResults(router.currentRoute.path)
            setResults(router.currentRoute.path, res)
          }
        })
        .catch(err => formatError(err, router.currentRoute))

      break
  }
}
