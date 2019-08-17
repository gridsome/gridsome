const url = require('url')
const chalk = require('chalk')
// const address = require('address')

const isUnspecifiedHost = host => host === '0.0.0.0' || host === '::'

const formatUrl = (hostname, port, pathname = '/') => {
  if (isUnspecifiedHost(hostname)) hostname = 'localhost'

  return url.format({
    protocol: 'http',
    hostname,
    port,
    pathname
  })
}

const formatPrettyUrl = (hostname, port, pathname = '/') => {
  if (isUnspecifiedHost(hostname)) hostname = 'localhost'

  return url.format({
    protocol: 'http',
    hostname,
    port: chalk.bold(port),
    pathname
  })
}

const prepareUrls = (hostname, port) => {
  const lan = { ip: undefined, pretty: undefined }

  // if (isUnspecifiedHost(hostname)) {
  //   lan.ip = address.ip() || ''
  //   // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
  //   if (/^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(lan.ip)) {
  //     lan.pretty = formatPrettyUrl(lan.ip, port)
  //   }
  // }

  const local = {
    url: formatUrl(hostname, port),
    pretty: formatPrettyUrl(hostname, port)
  }

  const explore = {
    endpoint: '/___explore',
    url: formatUrl(hostname, port, '/___explore'),
    pretty: formatPrettyUrl(hostname, port, '/___explore')
  }

  const graphql = {
    endpoint: '/___graphql',
    url: formatUrl(hostname, port, '/___graphql'),
    pretty: formatPrettyUrl(hostname, port, '/___graphql')
  }

  const sockjs = {
    endpoint: '/___echo',
    url: formatUrl(hostname, port, '/___echo'),
    pretty: formatPrettyUrl(hostname, port, '/___echo')
  }

  if (process.env.GRAPHQL_ENDPOINT) {
    const { host, port, pathname } = url.parse(process.env.GRAPHQL_ENDPOINT)
    graphql.pretty = formatPrettyUrl(host, port, pathname)
    graphql.url = process.env.GRAPHQL_ENDPOINT
    graphql.endpoint = pathname
  }

  if (process.env.SOCKJS_ENDPOINT) {
    const { host, port, pathname } = url.parse(process.env.SOCKJS_ENDPOINT)
    graphql.pretty = formatPrettyUrl(host, port, pathname)
    sockjs.url = process.env.SOCKJS_ENDPOINT
    sockjs.endpoint = pathname
  }

  return {
    lan,
    local,
    graphql,
    explore,
    sockjs
  }
}

module.exports = {
  formatUrl,
  formatPrettyUrl,
  prepareUrls
}
