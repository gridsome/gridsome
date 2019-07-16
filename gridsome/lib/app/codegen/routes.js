const path = require('path')
const { uniqBy, isPlainObject } = require('lodash')
const { NOT_FOUND_NAME } = require('../../utils/constants')
const { slugify } = require('../../utils')

function genRoutes (app, routeMeta = {}) {
  let res = ''

  const pages = uniqBy(app.pages.data(), page => page.route)
  const notFound = app.pages.findPage({ name: NOT_FOUND_NAME })

  // use the /404 page as fallback route
  pages.push({
    ...notFound,
    dataInfo: routeMeta[notFound.route],
    name: '*',
    route: '*'
  })

  res += `export default [${pages.map(page => {
    const component = JSON.stringify(page.component)
    const chunkName = JSON.stringify(page.chunkName || genChunkName(page.component, app.context))
    const dataInfo = page.dataInfo || routeMeta[page.route]
    const hasContext = Object.keys(page.context).length > 0
    const props = []
    const metas = []

    props.push(`    path: ${JSON.stringify(page.route)}`)
    props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

    if (typeof dataInfo === 'string') {
      metas.push(`data: () => import(/* webpackChunkName: ${chunkName} */ ${JSON.stringify(dataInfo)})`)
    } else if (Array.isArray(dataInfo)) {
      metas.push(`data: ${JSON.stringify(dataInfo)}`)
    } else if (process.env.GRIDSOME_MODE !== 'static' && (page.query.document || hasContext)) {
      metas.push(`data: true`)
    }

    for (const key in page.internal.meta) {
      const value = page.internal.meta[key]

      if (isPlainObject(value)) {
        switch (value.type) {
          case 'import': {
            const path = JSON.stringify(value.path)
            const chunkName = JSON.stringify(value.chunkName || page.chunkName)
            const importCode = `import(/* webpackChunkName: ${chunkName} */ ${path})`

            metas.push(`${key}: () => ${importCode}`)

            break
          }
          case 'code': {
            metas.push(`${key}: ${value.code}`)

            break
          }
        }
      } else {
        metas.push(`${key}: ${JSON.stringify(value)}`)
      }
    }

    if (metas.length) {
      props.push(`    meta: {\n      ${metas.join(',\n      ')}\n    }`)
    }

    if (page.name) {
      props.unshift(`    name: ${JSON.stringify(page.name)}`)
    }

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  return res
}

function genChunkName (component, context) {
  const chunkName = path.relative(context, component)
    .split('/')
    .filter(s => s !== '..')
    .map(s => slugify(s))
    .join('--')

  return `page--${chunkName}`
}

module.exports = genRoutes
