import fetch from './fetch'
import router from './router'
import SockJS from 'sockjs-client'
import { formatError, setResults } from './graphql/shared'

const sock = new SockJS(process.env.SOCKJS_ENDPOINT)

sock.onmessage = message => {
  const data = JSON.parse(message.data)

  switch (data.type) {
    case 'fetch':
      fetch(router.currentRoute)
        .then(res => {
          if (res.errors) formatError(res.errors[0], router.currentRoute)
          else setResults(router.currentRoute.path, res)
        })
        .catch(err => formatError(err, router.currentRoute))

      break
  }
}
