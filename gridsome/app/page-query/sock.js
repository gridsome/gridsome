/* global SOCKJS_ENDPOINT */

import SockJS from 'sockjs-client'

const sock = new SockJS(process.env.SOCKJS_ENDPOINT)

export default sock
